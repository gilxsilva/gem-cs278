import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, Animated, TouchableOpacity, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const NAVY   = '#0D1F3C';
const CREAM  = '#FAF7F2';
const MUTED  = 'rgba(28,23,20,0.38)';
const BORDER = 'rgba(28,23,20,0.09)';
const GREEN  = '#3A7D44';

const REASONS = [
  {
    id:    'spam',
    label: 'Spam',
    sub:   'Promotional, repetitive, or off-topic',
    icon:  'ban-outline',
  },
  {
    id:    'inappropriate',
    label: 'Inappropriate content',
    sub:   'Offensive or harmful material',
    icon:  'warning-outline',
  },
  {
    id:    'misinformation',
    label: 'Misinformation',
    sub:   'Inaccurate or misleading information',
    icon:  'alert-circle-outline',
  },
  {
    id:    'not_real_place',
    label: 'Not a real place',
    sub:   'This location doesn\'t seem to exist',
    icon:  'map-outline',
  },
  {
    id:    'other',
    label: 'Other',
    sub:   'Something else is wrong with this gem',
    icon:  'ellipsis-horizontal-circle-outline',
  },
];

export default function ReportModal({ visible, gemId, userId, onClose }) {
  const insets     = useSafeAreaInsets();
  const slideAnim  = useRef(new Animated.Value(600)).current;
  const [phase, setPhase]         = useState('select'); // 'select' | 'done'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPhase('select');
    setSubmitting(false);
    slideAnim.setValue(600);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, bounciness: 2, speed: 16,
    }).start();
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 620, duration: 210, useNativeDriver: true,
    }).start(() => onClose());
  };

  const submit = async (reasonId) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: userId, gem_id: gemId, reason: reasonId });
      if (error) throw error;
      setPhase('done');
    } catch (err) {
      // Show error inline instead of a jarring alert
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Dark overlay — tap to dismiss */}
      <Pressable style={styles.overlay} onPress={phase === 'select' ? handleClose : undefined} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 12 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handle} />

        {phase === 'select' && (
          <SelectPhase
            onSelect={submit}
            onCancel={handleClose}
            submitting={submitting}
          />
        )}

        {phase === 'done' && (
          <DonePhase onClose={handleClose} />
        )}

        {phase === 'error' && (
          <ErrorPhase onClose={handleClose} />
        )}
      </Animated.View>
    </Modal>
  );
}

function SelectPhase({ onSelect, onCancel, submitting }) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Report this gem</Text>
        <Text style={styles.subtitle}>
          Help us keep Gem safe, useful, and welcoming.
        </Text>
      </View>

      <View style={styles.reasonList}>
        {REASONS.map((r, i) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.reasonRow, i > 0 && styles.reasonRowBorder]}
            onPress={() => onSelect(r.id)}
            activeOpacity={0.72}
            disabled={submitting}
          >
            <View style={styles.reasonIconWrap}>
              <Ionicons name={r.icon} size={18} color={NAVY} />
            </View>
            <View style={styles.reasonText}>
              <Text style={styles.reasonLabel}>{r.label}</Text>
              <Text style={styles.reasonSub}>{r.sub}</Text>
            </View>
            {submitting
              ? <ActivityIndicator size="small" color={MUTED} />
              : <Ionicons name="chevron-forward" size={16} color={MUTED} />
            }
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.75}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );
}

function DonePhase({ onClose }) {
  return (
    <View style={styles.doneWrap}>
      <View style={styles.doneIconWrap}>
        <Ionicons name="checkmark-circle" size={40} color={GREEN} />
      </View>
      <Text style={styles.doneTitle}>Thanks for helping keep Gem thoughtful.</Text>
      <Text style={styles.doneBody}>
        Eva, Yujen, and Gil will review this report and take action if the gem goes against our community guidelines.
      </Text>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorPhase({ onClose }) {
  return (
    <View style={styles.doneWrap}>
      <View style={[styles.doneIconWrap, { backgroundColor: 'rgba(192,57,43,0.08)' }]}>
        <Ionicons name="alert-circle-outline" size={40} color="rgba(192,57,43,0.75)" />
      </View>
      <Text style={styles.doneTitle}>Something went wrong.</Text>
      <Text style={styles.doneBody}>
        We couldn't submit your report right now. Please try again in a moment.
      </Text>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.doneBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingTop:      10,
    shadowColor:     '#000',
    shadowOpacity:   0.14,
    shadowRadius:    24,
    shadowOffset:    { width: 0, height: -4 },
    elevation:       12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 18,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: NAVY,
    letterSpacing: -0.4, marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: MUTED, lineHeight: 20,
  },

  // ── Reason list ──────────────────────────────────────────────────────────
  reasonList: {
    marginHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  reasonRowBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  reasonIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  reasonText: { flex: 1 },
  reasonLabel: {
    fontSize: 14, fontWeight: '600', color: NAVY,
    letterSpacing: -0.1, marginBottom: 1,
  },
  reasonSub: {
    fontSize: 12, color: MUTED, lineHeight: 16,
  },

  // ── Cancel ───────────────────────────────────────────────────────────────
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 15, fontWeight: '500', color: MUTED,
  },

  // ── Done / Error ─────────────────────────────────────────────────────────
  doneWrap: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  doneIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(58,125,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  doneTitle: {
    fontSize: 17, fontWeight: '700', color: NAVY,
    textAlign: 'center', letterSpacing: -0.3,
    marginBottom: 10, lineHeight: 24,
  },
  doneBody: {
    fontSize: 14, color: MUTED, textAlign: 'center',
    lineHeight: 21, marginBottom: 28,
  },
  doneBtn: {
    backgroundColor: NAVY, borderRadius: 100,
    paddingVertical: 14, width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16, fontWeight: '700',
    color: CREAM, letterSpacing: -0.2,
  },
});
