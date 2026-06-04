import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { THEMES } from './constants';
import LoginScreen from './screens/Login';
import FeedScreen from './screens/FeedView';
import MapScreen from './screens/MapView';
import AddPinScreen from './screens/AddPin';
import PinDetailScreen from './screens/PinDetail';
import ProfileScreen from './screens/Profile';
import PostCommentsScreen from './screens/PostComments';
import SearchScreen from './screens/Search';
import OnboardingScreen from './screens/OnboardingScreen';
import CommunityGuideScreen from './screens/CommunityGuide';
import SettingsScreen from './screens/Settings';
import CollectionDetailScreen from './screens/CollectionDetail';

const Stack = createNativeStackNavigator();

function normalizeUser(u) {
  if (!u) return null;
  return {
    uid:         u.id,
    displayName: u.user_metadata?.full_name ?? u.email ?? 'User',
    photoURL:    u.user_metadata?.avatar_url ?? null,
    email:       u.email,
  };
}

const Tab = createBottomTabNavigator();

function MainTabs({ user, theme, toggleTheme }) {
  const t = THEMES[theme];
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Discover: focused ? 'compass'    : 'compass-outline',
            Map:      focused ? 'map'         : 'map-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Discover">
        {props => <FeedScreen {...props} user={user} theme={theme} toggleTheme={toggleTheme} />}
      </Tab.Screen>
      <Tab.Screen name="Map">
        {props => <MapScreen {...props} user={user} theme={theme} toggleTheme={toggleTheme} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function SplashView() {
  return (
    <View style={styles.splash}>
      <Image source={require('./assets/logo.png')} style={styles.splashLogo} />
      <Text style={styles.splashSub}>places worth remembering</Text>
    </View>
  );
}

const ONBOARDING_KEY = uid => `gem_onboarding_v1_${uid}`;

export default function App() {
  const [user,           setUser]           = useState(undefined); // undefined = hydrating
  const [theme,          setTheme]          = useState('light');
  const [onboardingDone, setOnboardingDone] = useState(null);      // null = checking storage

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? normalizeUser(session.user) : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? normalizeUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Deep-link listener (Android OAuth fix) ──────────────────────────────────
  // On Android, Chrome Custom Tabs cannot detect custom-scheme redirects, so
  // openAuthSessionAsync returns 'cancel' even when OAuth succeeds. The tokens
  // arrive here via the Linking system instead, so we parse and set the session.
  useEffect(() => {
    const handleUrl = ({ url }) => {
      if (!url) return;
      const hash = url.split('#')[1] ?? '';
      if (!hash) return;
      const params = Object.fromEntries(
        hash.split('&').filter(Boolean).map(p => p.split('=').map(decodeURIComponent))
      );
      if (params.access_token && params.refresh_token) {
        supabase.auth.setSession({
          access_token:  params.access_token,
          refresh_token: params.refresh_token,
        });
      }
    };

    // App was already open when the deep link arrived
    const sub = Linking.addEventListener('url', handleUrl);

    // App was cold-launched by the deep link
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });

    return () => sub.remove();
  }, []);

  // ── Sync displayName from profiles table (overrides auth metadata) ──────────
  useEffect(() => {
    if (!user || user.uid === 'guest') return;
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.uid).single()
      .then(({ data }) => {
        if (data) setUser(prev =>
          prev ? { ...prev, displayName: data.display_name ?? prev.displayName, photoURL: data.avatar_url ?? prev.photoURL } : prev
        );
      });
  }, [user?.uid]);

  const refreshUser = async () => {
    if (!user || user.uid === 'guest') return;
    const { data } = await supabase.from('profiles').select('display_name, avatar_url, handle').eq('id', user.uid).single();
    if (data) setUser(prev => prev ? { ...prev, displayName: data.display_name ?? prev.displayName, photoURL: data.avatar_url ?? prev.photoURL } : prev);
  };

  // ── Onboarding check (runs whenever user identity changes) ─────────────────
  useEffect(() => {
    if (user === undefined) return; // still hydrating
    if (!user || user.uid === 'guest') {
      // Guests and logged-out state skip onboarding
      setOnboardingDone(true);
      return;
    }
    setOnboardingDone(null); // reset while checking
    AsyncStorage.getItem(ONBOARDING_KEY(user.uid))
      .then(val => setOnboardingDone(val === 'done'))
      .catch(() => setOnboardingDone(true));
  }, [user?.uid]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const handleGuestLogin = () => setUser({ uid: 'guest', displayName: 'Demo User', photoURL: null });

  const completeOnboarding = async () => {
    if (user?.uid && user.uid !== 'guest') {
      try { await AsyncStorage.setItem(ONBOARDING_KEY(user.uid), 'done'); } catch {}
    }
    setOnboardingDone(true);
  };

  // ── Loading: hydrating auth or checking storage ─────────────────────────────
  if (user === undefined || (user && onboardingDone === null)) {
    return <SplashView />;
  }

  // ── First-time onboarding (shown before NavigationContainer) ────────────────
  if (user && !onboardingDone) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={completeOnboarding} />
      </SafeAreaProvider>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onGuestLogin={handleGuestLogin} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Main">
                {props => <MainTabs {...props} user={user} theme={theme} toggleTheme={toggleTheme} />}
              </Stack.Screen>
              <Stack.Screen name="AddPin" options={{ animation: 'slide_from_bottom' }}>
                {props => <AddPinScreen {...props} user={user} />}
              </Stack.Screen>
              <Stack.Screen name="PinDetail" options={{ animation: 'slide_from_bottom' }}>
                {props => <PinDetailScreen {...props} user={user} />}
              </Stack.Screen>
              <Stack.Screen name="Profile" options={{ animation: 'slide_from_right' }}>
                {props => <ProfileScreen {...props} theme={theme} onProfileUpdate={refreshUser} />}
              </Stack.Screen>
              <Stack.Screen name="PostComments" options={{ animation: 'slide_from_bottom' }}>
                {props => <PostCommentsScreen {...props} user={user} theme={theme} />}
              </Stack.Screen>
              <Stack.Screen name="Search" options={{ animation: 'slide_from_bottom' }}>
                {props => <SearchScreen {...props} user={user} theme={theme} />}
              </Stack.Screen>
              <Stack.Screen name="CommunityGuide" options={{ animation: 'slide_from_bottom' }}>
                {props => <CommunityGuideScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Settings" options={{ animation: 'slide_from_right' }}>
                {props => <SettingsScreen {...props} user={user} theme={theme} toggleTheme={toggleTheme} />}
              </Stack.Screen>
              <Stack.Screen name="CollectionDetail" options={{ animation: 'slide_from_right' }}>
                {props => <CollectionDetailScreen {...props} theme={theme} />}
              </Stack.Screen>
              <Stack.Screen name="OnboardingReview" options={{ animation: 'slide_from_bottom' }}>
                {props => <OnboardingScreen onComplete={() => props.navigation.goBack()} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  splashLogo: {
    width: 110,
    height: 110,
    borderRadius: 26,
    marginBottom: 20,
  },
  splashSub: {
    fontSize: 14,
    color: 'rgba(28,23,20,0.38)',
    letterSpacing: 0.3,
  },
});
