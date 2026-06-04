import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CREAM  = '#FAF7F2';
const NAVY   = '#0D1F3C';
const BLUE   = '#7A9FC2';
const MUTED  = 'rgba(28,23,20,0.38)';
const BORDER = 'rgba(28,23,20,0.09)';

const EXAMPLES = [
  { type: 'bad',  text: '"Great cafe."' },
  { type: 'bad',  text: '"Nice place."' },
  { type: 'good', text: '"Dead quiet after 9pm. The corner near the windows is weirdly perfect before midterms."' },
  { type: 'good', text: '"Get the cortado and sit outside if it\'s sunny. Feels like a tiny reset."' },
  { type: 'good', text: '"Good first-date-but-not-too-serious energy."' },
  { type: 'good', text: '"Crowded after noon, but elite before morning classes."' },
];

const PRINCIPLES = [
  {
    icon: 'pencil-outline',
    title: 'Share why the place matters',
    body: "Don't just post the place. Add context, a memory, a mood, or useful detail.",
  },
  {
    icon: 'locate-outline',
    title: 'Specific beats generic',
    body: '"Quiet after 9pm near the windows" is better than "nice study spot."',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Keep the feed useful',
    body: 'Avoid repetitive, low-effort posts that crowd out better gems.',
  },
  {
    icon: 'chatbubble-outline',
    title: 'Disagreement is okay; spam is not',
    body: "Say a place is overrated — just add a reason why.",
  },
  {
    icon: 'trending-up-outline',
    title: 'Help shape the map',
    body: 'Saves, comments, and reports help define what the community sees.',
  },
  {
    icon: 'people-outline',
    title: 'Build for friends, not strangers',
    body: 'gem should feel like recommendations from people you actually trust.',
  },
];

function SectionLabel({ children }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export default function CommunityGuide({ navigation }) {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: CREAM }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-back" size={20} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>community guide</Text>
          <View style={{ width: 34 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── What is gem ──────────────────────────────────────── */}
        <SectionLabel>WHAT IS GEM</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.prose}>
            gem is for places worth remembering — the coffee shop before finals, the view a friend showed you once, the quiet corner you keep going back to.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.prose}>
            Not a list of places. A map of moments.
          </Text>
        </View>

        {/* ── Post quality ─────────────────────────────────────── */}
        <SectionLabel>WHAT MAKES A GOOD GEM</SectionLabel>
        <View style={styles.card}>
          {EXAMPLES.map((e, i) => (
            <View key={i} style={[styles.exRow, i > 0 && styles.exBorder]}>
              <Text style={e.type === 'good' ? styles.check : styles.cross}>
                {e.type === 'good' ? '✓' : '✗'}
              </Text>
              <Text style={[styles.exText, e.type === 'bad' && styles.exTextBad]}>
                {e.text}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Collections ──────────────────────────────────────── */}
        <SectionLabel>ORGANIZING YOUR MAP</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.prose}>
            Use collections to build a personal map: Study Gems, Coffee Runs, Hidden Corners, Places to Take Friends.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.prose}>
            Collections can be private, public, or shared with specific friends who can add their own favorites.
          </Text>
        </View>

        {/* ── Principles ───────────────────────────────────────── */}
        <SectionLabel>COMMUNITY PRINCIPLES</SectionLabel>
        <View style={styles.card}>
          {PRINCIPLES.map((p, i) => (
            <View key={i} style={[styles.principleRow, i > 0 && styles.exBorder]}>
              <View style={styles.principleIcon}>
                <Ionicons name={p.icon} size={17} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.principleTitle}>{p.title}</Text>
                <Text style={styles.principleBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Footer ───────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerGlyph}>✦</Text>
          <Text style={styles.footerText}>places worth remembering</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16, fontWeight: '700', color: NAVY, letterSpacing: -0.3,
  },

  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  eyebrow: {
    fontSize: 10, fontWeight: '700', color: MUTED,
    letterSpacing: 0.8, marginBottom: 10, marginTop: 24,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },

  prose: {
    fontSize: 14, color: NAVY, lineHeight: 22,
    padding: 16,
  },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Examples
  exRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, alignItems: 'flex-start',
  },
  exBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  check: { fontSize: 14, fontWeight: '800', color: BLUE, width: 16, marginTop: 1 },
  cross: { fontSize: 14, fontWeight: '800', color: 'rgba(192,57,43,0.55)', width: 16, marginTop: 1 },
  exText: { flex: 1, fontSize: 14, color: NAVY, lineHeight: 21, fontStyle: 'italic' },
  exTextBad: { color: MUTED },

  // Principles
  principleRow: {
    flexDirection: 'row', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16, alignItems: 'flex-start',
  },
  principleIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  principleTitle: {
    fontSize: 14, fontWeight: '700', color: NAVY,
    marginBottom: 3, letterSpacing: -0.1,
  },
  principleBody: {
    fontSize: 13, color: MUTED, lineHeight: 19,
  },

  // Footer
  footer: { alignItems: 'center', paddingTop: 40, gap: 6 },
  footerGlyph: { fontSize: 22, color: NAVY, opacity: 0.35 },
  footerText: { fontSize: 12, color: MUTED, letterSpacing: 0.3 },
});
