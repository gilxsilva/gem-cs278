/**
 * Login.js — gem welcome / sign-in screen
 *
 * Design language: Apple-inspired — clarity, restraint, premium spacing, flat depth.
 *
 * Structure (top → bottom):
 *   BrandBlock          logo · wordmark · tagline
 *   HeroSection         headline · rotating animated subtitle (300 ms, 3.2 s cycle)
 *   GemPreviewCarousel  horizontal-snap cards · white surface · hairline border
 *   LoginCTA (footer)   pinned · flat navy button · Stanford inline note
 *
 * Auth flow: Google OAuth via Supabase implicit flow — unchanged.
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
  Dimensions,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design tokens ───────────────────────────────────────────────────────────
// Three-level text opacity system, matching Apple's semantic text roles.
const NAVY   = '#0D1F3C';
const CREAM  = '#FAF7F2';
const CARD   = '#FFFFFF';
const L1     = NAVY;                       // primary text
const L2     = 'rgba(13,31,60,0.42)';      // secondary text
const L3     = 'rgba(13,31,60,0.28)';      // tertiary / metadata
const BORDER = 'rgba(13,31,60,0.08)';      // hairline surfaces
const RED    = '#8C1515';                  // Stanford

// ─── Rotating copy ───────────────────────────────────────────────────────────
const SUBLINES = [
  'hidden spots your circle actually loves',
  'places tied to real memories',
  'trusted finds — not generic reviews',
];

// ─── Sample gem content ──────────────────────────────────────────────────────
// Shows users what gem looks like before they sign up.
// Each card models the correct norm: specific, moment-driven, from a real person.
const GEMS = [
  {
    id: '1',
    emoji: '☕',
    place: 'Coupa at Tresidder',
    note:  'Best spot to actually focus. Way less crowded than CoHo after 2 pm.',
    author: 'Maya',
  },
  {
    id: '2',
    emoji: '🌿',
    place: 'Garden behind Frost',
    note:  'A hidden courtyard most people walk right past. Perfect quiet afternoon.',
    author: 'James',
  },
  {
    id: '3',
    emoji: '📖',
    place: 'Green Library, 3rd floor',
    note:  'Silent. Great natural light. Almost always empty after 8 pm.',
    author: 'Priya',
  },
  {
    id: '4',
    emoji: '🌅',
    place: 'Lake Lag at sunrise',
    note:  'Worth the early alarm. Bring coffee. Go alone or with one person.',
    author: 'Chris',
  },
];

const CARD_W   = SCREEN_W * 0.72;
const CARD_GAP = 10;

// ─────────────────────────────────────────────────────────────────────────────
// BrandBlock
// Logo → wordmark → tagline, centered, generous below.
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
    marginBottom: 38,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 17,          // ~1/4 of size — Apple's app icon radius proportion
    marginBottom: 14,
  },
  wordmark: {
    fontSize: 27,
    fontWeight: '600',          // semibold, not black — confident without shouting
    color: L1,
    letterSpacing: -1.2,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '400',
    color: L2,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HeroSection
// Bold headline + animated rotating subtitle.
// Timing: 300 ms fade (Apple standard), 3.2 s cycle.
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [idx, setIdx]   = useState(0);
  const opacity         = useRef(new Animated.Value(1)).current;

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
        discover the spots{'\n'}your friends actually love
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
    marginBottom: 40,
    paddingHorizontal: 28,
  },
  headline: {
    fontSize: 27,
    fontWeight: '700',          // display weight — the one place we go full bold
    color: L1,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.9,
    marginBottom: 12,
  },
  subline: {
    fontSize: 15,
    fontWeight: '400',          // regular — supports without competing
    color: L2,
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 21,
    minHeight: 21,              // prevents layout shift during crossfade
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GemCard
// White surface · hairline border · Apple-level shadow (0.04 opacity).
// Three-level type hierarchy inside the card.
// ─────────────────────────────────────────────────────────────────────────────
function GemCard({ item }) {
  return (
    <View style={gc.card}>

      {/* Place header */}
      <View style={gc.header}>
        <View style={gc.emojiWrap}>
          <Text style={gc.emoji}>{item.emoji}</Text>
        </View>
        <View style={gc.titleBlock}>
          <Text style={gc.place} numberOfLines={1}>{item.place}</Text>
          <Text style={gc.gemLabel}>gem</Text>
        </View>
      </View>

      {/* Memory note */}
      <Text style={gc.note} numberOfLines={2}>{item.note}</Text>

      {/* Attribution */}
      <View style={gc.footer}>
        <View style={gc.avatar} />
        <Text style={gc.author}>saved by {item.author}</Text>
      </View>

    </View>
  );
}

const gc = StyleSheet.create({
  card: {
    width: CARD_W,
    marginRight: CARD_GAP,
    backgroundColor: CARD,
    borderRadius: 16,                       // Apple content-card radius
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,  // 0.5 on Retina — Apple-standard
    borderColor: BORDER,
    // Apple-level depth: barely perceptible, lets the surface breathe
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 11,
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: CREAM,                 // cream-on-white = Apple's grouped table feel
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 20 },
  titleBlock: { flex: 1 },
  place: {
    fontSize: 15,
    fontWeight: '600',                      // semibold — consistent with Apple cells
    color: L1,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  gemLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: L3,
    letterSpacing: 0.2,
  },
  note: {
    fontSize: 13,
    fontWeight: '400',
    color: L2,
    lineHeight: 19,
    letterSpacing: -0.1,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: BORDER,
  },
  author: {
    fontSize: 12,
    fontWeight: '400',
    color: L3,
    letterSpacing: 0.1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GemPreviewCarousel
// Horizontal snap scroll. Section label follows Apple's grouped-section style.
// ─────────────────────────────────────────────────────────────────────────────
function GemPreviewCarousel() {
  return (
    <View>
      <Text style={cc.label}>what a gem looks like</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cc.content}
        snapToInterval={CARD_W + CARD_GAP}
        decelerationRate="fast"
        overScrollMode="never"
      >
        {GEMS.map(item => <GemCard key={item.id} item={item} />)}
        <View style={{ width: 28 }} />
      </ScrollView>
    </View>
  );
}

const cc = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: L3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 13,
    paddingHorizontal: 28,
  },
  content: {
    paddingLeft: 28,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// LoginCTA  (pinned footer)
// Flat navy button — color carries the weight, no shadow needed.
// Footer casts a soft upward shadow for separation from scroll content.
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
            <Text style={cs.btnLabel}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={cs.note}>
        Use your{' '}
        <Text style={cs.noteAccent}>@stanford.edu</Text>
        {' '}account to join your campus circle
      </Text>

    </View>
  );
}

const cs = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
    alignItems: 'center',
    gap: 14,
    backgroundColor: CREAM,
    // Soft upward shadow — separates footer from scroll without a hard line
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
    borderRadius: 14,
    paddingVertical: 18,        // taller tap target — Apple minimum is 44pt
    width: '100%',
    // Flat — no shadow. The navy-on-cream contrast is the affordance.
  },
  btnLoading: {
    opacity: 0.55,
  },
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
    fontSize: 17,               // Apple's standard interactive label size
    fontWeight: '600',          // semibold — confident, not heavy
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
  noteAccent: {
    fontWeight: '600',
    color: RED,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Login  (root)
// Screen fades in on mount (500 ms) — Apple's graceful appearance pattern.
// Auth flow: Google OAuth via Supabase, unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export default function Login() {
  const [loading, setLoading]   = useState(false);
  const screenOpacity           = useRef(new Animated.Value(0)).current;

  // Gentle fade-in on first render
  useEffect(() => {
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [screenOpacity]);

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
          // onAuthStateChange in App.js handles the rest
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

        {/* Scrollable content — brand, hero, cards */}
        <ScrollView
          style={root.scroll}
          contentContainerStyle={root.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <BrandBlock />
          <HeroSection />
          <GemPreviewCarousel />
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
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 12,
  },
});
