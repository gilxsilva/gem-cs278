/**
 * Login.js — gem welcome / sign-in screen
 *
 * Design language: Apple-inspired — clarity, restraint, premium spacing, flat depth.
 *
 * Structure (top → bottom):
 *   BrandBlock          logo · wordmark · tagline
 *   HeroSection         bold headline · rotating animated subtitle (300 ms, 3.2 s cycle)
 *   SocialProofBand     overlapping avatar initials · join line
 *   MiniFeedPreview     vertical social feed preview — 3 cards styled like the actual app
 *   LoginCTA (footer)   pinned · pill CTA · trust note
 *
 * Auth flow: Google OAuth via Supabase implicit flow — UNCHANGED.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

// ─── Design tokens ───────────────────────────────────────────────────────────
const NAVY   = '#0D1F3C';
const CREAM  = '#FAF7F2';
const L1     = NAVY;
const L2     = 'rgba(13,31,60,0.42)';
const L3     = 'rgba(13,31,60,0.26)';
const BORDER = 'rgba(13,31,60,0.08)';

// ─── Rotating subtitles ──────────────────────────────────────────────────────
const SUBLINES = [
  'not ratings. just real recommendations.',
  'places people would actually tell a friend about.',
  'the spots worth going back to.',
];

// ─── Social proof avatars ────────────────────────────────────────────────────
const SOCIAL_AVATARS = [
  { initial: 'E', color: '#7A9FC2' },
  { initial: 'M', color: '#B8956A' },
  { initial: 'K', color: '#A98BBE' },
  { initial: 'J', color: '#C4828A' },
  { initial: 'S', color: '#8A9BBE' },
];

// ─── Preview feed data ────────────────────────────────────────────────────────
// Each card models the actual app's feed style: named person + found + place.
// No emojis. Specific, human, believable.
const PREVIEW_GEMS = [
  {
    id:          '1',
    authorName:  'Maya',
    initial:     'M',
    avatarColor: '#B8956A',
    place:       'Coupa back patio after 2pm',
    note:        'Sunny, quieter than CoHo, and way better if you actually need to focus.',
    category:    'Coffee',
    catColor:    '#B8956A',
    saves:       14,
  },
  {
    id:          '2',
    authorName:  'James',
    initial:     'J',
    avatarColor: '#7A9FC2',
    place:       'The Yerba Buena waterfall',
    note:        'Tucked behind the main path — peaceful if you need ten quiet minutes downtown.',
    category:    'Hidden',
    catColor:    '#C4828A',
    saves:       22,
  },
  {
    id:          '3',
    authorName:  'Priya',
    initial:     'P',
    avatarColor: '#A98BBE',
    place:       'Late-night tacos on Folsom',
    note:        'Cheap, fast, and exactly what you want after a long day. Cash only.',
    category:    'Food',
    catColor:    '#C4A882',
    saves:       38,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BrandBlock
// ─────────────────────────────────────────────────────────────────────────────
function BrandBlock() {
  return (
    <View style={bs.wrap}>
      <Image source={require('../assets/logo.png')} style={bs.logo} />
      <Text style={bs.wordmark}>gem</Text>
      <Text style={bs.tagline}>places worth remembering</Text>
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 15,
    marginBottom: 12,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: L1,
    letterSpacing: -1.4,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '400',
    color: L2,
    letterSpacing: 0.2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HeroSection
// Larger, bolder headline. Same rotating subtitle animation.
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIdx(i => (i + 1) % SUBLINES.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3200);
    return () => clearInterval(cycle);
  }, [opacity]);

  return (
    <View style={hs.wrap}>
      <Text style={hs.headline}>
        discover places{'\n'}your friends actually love
      </Text>
      <Animated.Text style={[hs.subline, { opacity }]}>
        {SUBLINES[idx]}
      </Animated.Text>
    </View>
  );
}

const hs = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 24,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: L1,
    textAlign: 'center',
    lineHeight: 39,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  subline: {
    fontSize: 15,
    fontWeight: '400',
    color: L2,
    textAlign: 'center',
    lineHeight: 22,
    minHeight: 22,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SocialProofBand
// Five overlapping colored avatar circles + a join line.
// Signals community before users even see the feed preview.
// ─────────────────────────────────────────────────────────────────────────────
function SocialProofBand() {
  return (
    <View style={sp.wrap}>
      <View style={sp.avatarRow}>
        {SOCIAL_AVATARS.map((a, i) => (
          <View
            key={i}
            style={[
              sp.avatar,
              { backgroundColor: a.color, marginLeft: i > 0 ? -10 : 0 },
            ]}
          >
            <Text style={sp.initial}>{a.initial}</Text>
          </View>
        ))}
      </View>
      <Text style={sp.text}>
        Join people saving places worth remembering
      </Text>
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 14,
    marginBottom: 22,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CREAM,
  },
  initial: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: L2,
    lineHeight: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// FeedPreviewCard
// Styled identically to the actual app feed: avatar initial · narrative ·
// note · category pill · saves count. No emojis.
// ─────────────────────────────────────────────────────────────────────────────
function FeedPreviewCard({ item }) {
  return (
    <View style={fp.card}>
      {/* Header: avatar + narrative + category pill */}
      <View style={fp.header}>
        <View style={[fp.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={fp.avatarInitial}>{item.initial}</Text>
        </View>
        <Text style={fp.narrative} numberOfLines={1}>
          <Text style={fp.bold}>{item.authorName}</Text>
          {' found '}
          <Text style={fp.bold}>{item.place}</Text>
        </Text>
        <View style={[fp.catPill, { backgroundColor: item.catColor + '1A' }]}>
          <Text style={[fp.catText, { color: item.catColor }]}>{item.category}</Text>
        </View>
      </View>

      {/* Note */}
      <Text style={fp.note}>{item.note}</Text>

      {/* Saves count */}
      <View style={fp.footer}>
        <Ionicons name="bookmark-outline" size={12} color={L3} />
        <Text style={fp.saves}>{item.saves} saved this</Text>
      </View>
    </View>
  );
}

const fp = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  narrative: {
    flex: 1,
    fontSize: 13,
    color: L2,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: L1,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    flexShrink: 0,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  note: {
    fontSize: 13,
    color: L1,
    lineHeight: 19,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  saves: {
    fontSize: 11,
    color: L3,
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MiniFeedPreview
// Replaces the horizontal emoji carousel entirely.
// A white rounded card holding the 3 preview gems, vertically stacked.
// Looks and feels like the actual Gem feed so users immediately understand
// what they're joining.
// ─────────────────────────────────────────────────────────────────────────────
function MiniFeedPreview() {
  return (
    <View style={mf.container}>
      <View style={mf.labelRow}>
        <Text style={mf.label}>Gems from the community</Text>
        <Text style={mf.labelRight}>✦ a few of many</Text>
      </View>
      <View style={mf.feed}>
        {PREVIEW_GEMS.map((item, i) => (
          <React.Fragment key={item.id}>
            {i > 0 && <View style={mf.divider} />}
            <FeedPreviewCard item={item} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const mf = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: L3,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  labelRight: {
    fontSize: 11,
    color: L3,
    fontWeight: '400',
  },
  feed: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginHorizontal: 16,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// LoginCTA  (pinned footer)
// Auth behavior: UNCHANGED.
// ─────────────────────────────────────────────────────────────────────────────
function LoginCTA({ onPress, loading }) {
  return (
    <View style={cs.footer}>
      <TouchableOpacity
        style={[cs.btn, loading && cs.btnLoading]}
        onPress={onPress}
        activeOpacity={0.84}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <View style={cs.gBadge}>
              <Text style={cs.gGlyph}>G</Text>
            </View>
            <Text style={cs.btnLabel}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={cs.note}>
        New here? Your profile is created automatically.
      </Text>
    </View>
  );
}

const cs = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 6,
    alignItems: 'center',
    gap: 12,
    backgroundColor: CREAM,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: NAVY,
    borderRadius: 100,
    paddingVertical: 18,
    width: '100%',
  },
  btnLoading: { opacity: 0.55 },
  gBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gGlyph: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4285F4',
    letterSpacing: -0.2,
  },
  btnLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  note: {
    fontSize: 13,
    fontWeight: '400',
    color: L2,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Login  (root)
// Screen fades in on mount — Apple's graceful appearance pattern.
// Auth flow: Google OAuth via Supabase implicit flow — UNCHANGED.
// ─────────────────────────────────────────────────────────────────────────────
export default function Login() {
  const [loading, setLoading]   = useState(false);
  const screenOpacity           = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [screenOpacity]);

  // ── Auth — UNCHANGED ─────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (Platform.OS === 'ios') WebBrowser.dismissAuthSession();

      const redirectTo = 'gem://';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data?.url) {
        Alert.alert('Sign-in error', error?.message ?? 'Could not start sign-in');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        // Implicit flow: tokens arrive in the URL hash fragment
        const hash   = result.url.split('#')[1] ?? '';
        const params = Object.fromEntries(
          hash.split('&').filter(Boolean).map(p => p.split('=').map(decodeURIComponent))
        );
        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token:  params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) Alert.alert('Sign-in error', sessionError.message);
          // onAuthStateChange in App.js handles navigation
        } else {
          Alert.alert('Sign-in error', 'No tokens received. Please try again.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={root.safe}>
      <Animated.View style={[root.body, { opacity: screenOpacity }]}>

        {/* Scrollable content — brand, hero, social proof, feed preview */}
        <ScrollView
          style={root.scroll}
          contentContainerStyle={root.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <BrandBlock />
          <HeroSection />
          <SocialProofBand />
          <MiniFeedPreview />
        </ScrollView>

        {/* Pinned footer — always in view */}
        <LoginCTA onPress={handleGoogleLogin} loading={loading} />

      </Animated.View>
    </SafeAreaView>
  );
}

const root = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CREAM,
  },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 24,
  },
});
