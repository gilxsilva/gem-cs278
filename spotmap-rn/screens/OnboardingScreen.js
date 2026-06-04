import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CREAM  = '#FAF7F2';
const NAVY   = '#0D1F3C';
const BLUE   = '#7A9FC2';
const MUTED  = 'rgba(28,23,20,0.38)';
const BORDER = 'rgba(28,23,20,0.09)';

// ─── Step 2: bad vs good post examples ───────────────────────────────────────
function ExampleCards() {
  return (
    <View style={ex.wrap}>
      <View style={[ex.card, ex.bad]}>
        <View style={ex.badgeRow}>
          <Text style={ex.badX}>✗</Text>
          <Text style={ex.badLabel}>LESS USEFUL</Text>
        </View>
        <Text style={ex.quote}>"Great cafe."</Text>
      </View>

      <View style={[ex.card, ex.good]}>
        <View style={ex.badgeRow}>
          <Text style={ex.goodCheck}>✓</Text>
          <Text style={ex.goodLabel}>A GEM</Text>
        </View>
        <Text style={ex.quote}>
          "Dead quiet after 9pm. The corner near the windows is weirdly perfect before midterms."
        </Text>
      </View>
    </View>
  );
}

const ex = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  bad:  { borderColor: BORDER, backgroundColor: '#FFFFFF' },
  good: { borderColor: BLUE,   backgroundColor: BLUE + '0B' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  badX:        { fontSize: 14, fontWeight: '800', color: 'rgba(192,57,43,0.55)' },
  badLabel:    { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.6 },
  goodCheck:   { fontSize: 14, fontWeight: '800', color: BLUE },
  goodLabel:   { fontSize: 10, fontWeight: '700', color: BLUE, letterSpacing: 0.6 },
  quote: { fontSize: 15, color: NAVY, lineHeight: 22, fontStyle: 'italic' },
});

// ─── Step 3: interactive choice game ─────────────────────────────────────────
function ChoiceGame() {
  const [picked, setPick] = useState(null);
  const done = picked !== null;

  const pick = (v) => { if (!done) setPick(v); };

  return (
    <View style={cg.wrap}>
      {!done && <Text style={cg.prompt}>Tap the one you'd actually use.</Text>}

      <TouchableOpacity
        style={[
          cg.option,
          done && picked === 'a' && cg.optionWrong,
          done && picked === 'b' && cg.optionFaded,
        ]}
        onPress={() => pick('a')}
        activeOpacity={0.78}
        disabled={done}
      >
        <Text style={cg.optionText}>"Nice spot."</Text>
        {done && picked === 'a' && (
          <Text style={cg.wrongMsg}>A little more detail goes a long way.</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          cg.option,
          done && picked === 'b' && cg.optionRight,
          done && picked === 'a' && cg.optionFaded,
        ]}
        onPress={() => pick('b')}
        activeOpacity={0.78}
        disabled={done}
      >
        <Text style={cg.optionText}>
          "Get the cortado and sit outside if it's sunny. Feels like a tiny reset."
        </Text>
        {done && picked === 'b' && (
          <Text style={cg.rightMsg}>That's a gem. ✓</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const cg = StyleSheet.create({
  wrap:   { gap: 10, marginTop: 4 },
  prompt: { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 2 },
  option: {
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#FFFFFF', padding: 16,
  },
  optionWrong: { borderColor: 'rgba(192,57,43,0.30)', backgroundColor: 'rgba(192,57,43,0.03)' },
  optionRight: { borderColor: BLUE, backgroundColor: BLUE + '0B' },
  optionFaded: { opacity: 0.32 },
  optionText:  { fontSize: 15, color: NAVY, lineHeight: 22, fontStyle: 'italic' },
  wrongMsg:    { fontSize: 12, color: 'rgba(192,57,43,0.70)', marginTop: 8, fontWeight: '500' },
  rightMsg:    { fontSize: 12, color: BLUE, marginTop: 8, fontWeight: '600' },
});

// ─── Step 4: collection cards ─────────────────────────────────────────────────
const DEMO_COLLECTIONS = [
  { name: 'Study Gems',     icon: 'book-outline',    color: '#7A9FC2' },
  { name: 'Coffee Runs',    icon: 'cafe-outline',     color: '#B8956A' },
  { name: 'Hidden Corners', icon: 'diamond-outline',  color: '#C4828A' },
  { name: 'Date Spots',     icon: 'heart-outline',    color: '#A98BBE' },
  { name: 'Late Night',     icon: 'moon-outline',     color: '#8A9BBE' },
];

function CollectionCards() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={cc.scroll}
    >
      {DEMO_COLLECTIONS.map(c => (
        <View key={c.name} style={cc.card}>
          <View style={[cc.icon, { backgroundColor: c.color + '18' }]}>
            <Ionicons name={c.icon} size={17} color={c.color} />
          </View>
          <Text style={cc.name}>{c.name}</Text>
          <Text style={cc.sub}>your places</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const cc = StyleSheet.create({
  scroll: { paddingVertical: 8, gap: 10 },
  card: {
    width: 120, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 14, gap: 4,
    shadowColor: '#1C1714', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  name: { fontSize: 13, fontWeight: '700', color: NAVY, letterSpacing: -0.2 },
  sub:  { fontSize: 11, color: MUTED },
});

// ─── Step 5b: safety card ────────────────────────────────────────────────────
function SafetyCard() {
  return (
    <View style={sf.wrap}>
      <View style={sf.card}>
        <View style={sf.row}>
          <View style={sf.iconWrap}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={17} color={NAVY} />
          </View>
          <View style={sf.textWrap}>
            <Text style={sf.label}>Tap the ··· menu on any gem</Text>
            <Text style={sf.sub}>Then choose "Report gem" and pick a reason.</Text>
          </View>
        </View>

        <View style={[sf.row, sf.rowBorder]}>
          <View style={sf.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={17} color={NAVY} />
          </View>
          <View style={sf.textWrap}>
            <Text style={sf.label}>Reviewed by Eva, Yujen, and Gil</Text>
            <Text style={sf.sub}>Every report goes to the Gem team directly.</Text>
          </View>
        </View>

        <View style={[sf.row, sf.rowBorder]}>
          <View style={sf.iconWrap}>
            <Ionicons name="people-outline" size={17} color={NAVY} />
          </View>
          <View style={sf.textWrap}>
            <Text style={sf.label}>Keep it honest and useful</Text>
            <Text style={sf.sub}>Spam, misinformation, or a place that doesn't exist — all worth flagging.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const sf = StyleSheet.create({
  wrap: { marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: NAVY, marginBottom: 2, lineHeight: 19 },
  sub:   { fontSize: 12, color: MUTED, lineHeight: 17 },
});

// ─── Step 5: principle rows ───────────────────────────────────────────────────
const PRINCIPLES = [
  { icon: 'pencil-outline',            text: 'Share why the place matters' },
  { icon: 'locate-outline',            text: 'Specific details help friends decide' },
  { icon: 'shield-checkmark-outline',  text: 'No filler, no spam — keep it real' },
  { icon: 'trending-up-outline',       text: 'Saves and comments surface good gems' },
];

function PrincipleRows() {
  return (
    <View style={pr.card}>
      {PRINCIPLES.map((p, i) => (
        <View key={i} style={[pr.row, i > 0 && pr.rowBorder]}>
          <View style={pr.iconWrap}>
            <Ionicons name={p.icon} size={17} color={NAVY} />
          </View>
          <Text style={pr.text}>{p.text}</Text>
        </View>
      ))}
    </View>
  );
}

const pr = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginTop: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  text: { flex: 1, fontSize: 14, color: NAVY, lineHeight: 20, fontWeight: '500' },
});

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    key: 'welcome',
    glyph: '✦',
    headline: 'welcome to gem',
    body: 'gem is for places worth remembering — the coffee shop before finals, the view a friend showed you once, the quiet corner you keep coming back to.',
  },
  {
    key: 'moment',
    icon: 'chatbubble-ellipses-outline',
    headline: 'post the moment, not just the place',
    body: 'A good gem explains why a place mattered. See the difference:',
    interactive: 'examples',
  },
  {
    key: 'specific',
    icon: 'sparkles-outline',
    headline: 'specific beats generic',
    body: 'Low-effort posts make the feed noisy. Useful details help friends actually decide.',
    interactive: 'choice',
  },
  {
    key: 'save',
    icon: 'bookmark-outline',
    headline: 'save with intention',
    body: 'Collections turn your saves into a personal map of places that matter.',
    interactive: 'collections',
  },
  {
    key: 'community',
    icon: 'people-outline',
    headline: 'your choices shape the feed',
    body: 'What gets saved and shared defines what gem feels like for everyone.',
    interactive: 'principles',
  },
  {
    key: 'safety',
    icon: 'shield-checkmark-outline',
    headline: 'help keep gem useful',
    body: 'If you ever see spam, misinformation, or something that doesn\'t belong — you can report it. For now, reports go straight to the Gem creators.',
    interactive: 'safety',
  },
  {
    key: 'done',
    icon: 'map-outline',
    headline: "you're ready",
    body: 'Start building your map of places that matter.',
    isLast: true,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const s        = STEPS[step];
  const isFirst  = step === 0;
  const isLast   = step === STEPS.length - 1;

  const advance = () => isLast ? onComplete() : setStep(i => i + 1);
  const retreat = () => setStep(i => i - 1);

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Top bar: back | dots | skip ─────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={retreat}
          style={[styles.topSide, isFirst && styles.hidden]}
          disabled={isFirst}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </TouchableOpacity>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          onPress={onComplete}
          style={styles.topSide}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>{isLast ? 'Done' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ──────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {s.glyph ? (
          <Text style={styles.bigGlyph}>{s.glyph}</Text>
        ) : s.icon ? (
          <View style={styles.iconCircle}>
            <Ionicons name={s.icon} size={28} color={NAVY} />
          </View>
        ) : null}

        <Text style={styles.headline}>{s.headline}</Text>
        <Text style={styles.body}>{s.body}</Text>

        {s.interactive === 'examples'    && <ExampleCards />}
        {s.interactive === 'choice'      && <ChoiceGame />}
        {s.interactive === 'collections' && <CollectionCards />}
        {s.interactive === 'principles'  && <PrincipleRows />}
        {s.interactive === 'safety'      && <SafetyCard />}
      </ScrollView>

      {/* ── Footer CTA ──────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, isLast && styles.btnFinal]}
          onPress={advance}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {isLast ? 'Start exploring' : 'Next'}
          </Text>
          {!isLast && (
            <Ionicons name="arrow-forward" size={16} color="#FAF7F2" style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  topSide: { minWidth: 44, alignItems: 'center' },
  hidden:  { opacity: 0, pointerEvents: 'none' },

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(13,31,60,0.15)',
  },
  dotActive: { width: 20, backgroundColor: NAVY },

  skipText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },

  bigGlyph: {
    fontSize: 54, color: NAVY, textAlign: 'center',
    marginBottom: 28, opacity: 0.85,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(13,31,60,0.07)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 28,
  },
  headline: {
    fontSize: 26, fontWeight: '800', color: NAVY,
    textAlign: 'center', letterSpacing: -0.7, lineHeight: 32,
    marginBottom: 14,
  },
  body: {
    fontSize: 15, color: 'rgba(28,23,20,0.60)', textAlign: 'center',
    lineHeight: 23, marginBottom: 28, paddingHorizontal: 8,
  },

  footer: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 },
  btn: {
    backgroundColor: NAVY, borderRadius: 100,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  btnFinal: { backgroundColor: BLUE },
  btnText: {
    fontSize: 16, fontWeight: '700', color: '#FAF7F2', letterSpacing: -0.2,
  },
});
