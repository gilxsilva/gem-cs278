import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, Animated, TouchableOpacity, Pressable,
  TextInput, ScrollView, StyleSheet, Dimensions, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

const { width: SW } = Dimensions.get('window');
const GRID_PAD = 16;
const CARD_GAP  = 10;
const CARD_W    = (SW - GRID_PAD * 2 - CARD_GAP) / 2;
const CARD_H    = 112;
const NAVY      = '#0D1F3C';
const MUTED     = 'rgba(28,23,20,0.38)';
const BORDER    = 'rgba(28,23,20,0.09)';

function Toast({ message }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Ionicons name="checkmark-circle" size={14} color="#3A7D44" />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

function NewCollectionCard({ onPress }) {
  return (
    <TouchableOpacity style={styles.newCard} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.newCardPlus}>
        <Ionicons name="add" size={22} color={NAVY} />
      </View>
      <Text style={styles.newCardLabel}>New collection</Text>
    </TouchableOpacity>
  );
}

function CollectionCard({ item, selected, onPress }) {
  const isShared = item.visibility === 'shared';
  return (
    <TouchableOpacity
      style={[styles.collCard, selected && styles.collCardSelected]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={11} color="#fff" />
        </View>
      )}
      <Text style={[styles.collName, selected && styles.collNameSelected]} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={styles.collMeta}>
        <Text style={[styles.collCount, selected && { color: 'rgba(255,255,255,0.6)' }]}>
          {item.count} gems
        </Text>
        <View style={[
          styles.visPill,
          isShared && styles.visPillShared,
          selected && styles.visPillSelected,
        ]}>
          <Ionicons
            name={isShared ? 'people-outline' : 'lock-closed-outline'}
            size={9}
            color={selected ? 'rgba(255,255,255,0.75)' : (isShared ? NAVY : MUTED)}
          />
          <Text style={[styles.visText, selected && { color: 'rgba(255,255,255,0.75)' }, isShared && !selected && { color: NAVY }]}>
            {item.visibility}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CreateCollectionForm({ onCancel, onCreate, saving }) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const canCreate = name.trim().length > 0;
  const visibility = isPublic ? 'public' : 'private';

  return (
    <View style={styles.createForm}>
      <View style={styles.createSection}>
        <Text style={styles.createSectionLabel}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter collection name"
          placeholderTextColor={MUTED}
          style={styles.createInput}
          returnKeyType="done"
          onSubmitEditing={() => canCreate && !saving && onCreate(name.trim(), visibility)}
          autoFocus
        />
      </View>

      <View style={styles.createSection}>
        <View style={styles.optionRow}>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Make public</Text>
            <Text style={styles.optionSub}>The collection will be shown on your profile.</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: 'rgba(28,23,20,0.12)', true: NAVY }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, (!canCreate || saving) && { opacity: 0.38 }]}
        onPress={() => canCreate && !saving && onCreate(name.trim(), visibility)}
        activeOpacity={0.82}
        disabled={!canCreate || saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.saveBtnText}>Create</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelLink} onPress={onCancel} activeOpacity={0.75}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SaveToCollectionModal({ visible, pin, userId, onClose, onSave, onCollectionCreated }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const isGuest = !userId || userId === 'guest';

  const [collections, setCollections] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!visible) return;
    setIsCreating(false);
    slideAnim.setValue(600);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, bounciness: 2, speed: 16,
    }).start();

    if (isGuest) {
      setCollections([]);
      return;
    }
    setLoading(true);
    supabase
      .from('collections')
      .select('id, name, visibility, item_count')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Collections fetch error:', error.message);
        setCollections((data ?? []).map(c => ({
          id:         c.id,
          name:       c.name,
          visibility: c.visibility,
          count:      c.item_count ?? 0,
        })));
        setLoading(false);
      });
  }, [visible, userId]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 620, duration: 210, useNativeDriver: true,
    }).start(() => onClose());
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const toggleCollection = async (coll) => {
    const isAdding = !savedIds.has(coll.id);

    // Optimistic UI
    setSavedIds(prev => {
      const next = new Set(prev);
      isAdding ? next.add(coll.id) : next.delete(coll.id);
      onSave?.(pin?.id, [...next]);
      return next;
    });
    setCollections(prev => prev.map(c =>
      c.id === coll.id
        ? { ...c, count: Math.max(0, c.count + (isAdding ? 1 : -1)) }
        : c
    ));
    if (isAdding) showToast(`Saved to ${coll.name}`);

    if (!isGuest && pin?.id) {
      if (isAdding) {
        const { error } = await supabase
          .from('collection_gems')
          .upsert({ collection_id: coll.id, gem_id: pin.id });
        if (error) console.error('Save to collection error:', error.message);
        else await supabase.from('collections')
          .update({ item_count: coll.count + 1 }).eq('id', coll.id);
      } else {
        const { error } = await supabase
          .from('collection_gems')
          .delete()
          .eq('collection_id', coll.id)
          .eq('gem_id', pin.id);
        if (error) console.error('Remove from collection error:', error.message);
        else await supabase.from('collections')
          .update({ item_count: Math.max(0, coll.count - 1) }).eq('id', coll.id);
      }
    }
  };

  const handleCreate = async (name, visibility) => {
    if (isGuest) {
      const newColl = { id: `coll_${Date.now()}`, name, count: 0, visibility };
      setCollections(prev => [...prev, newColl]);
      setSavedIds(prev => { const next = new Set(prev); next.add(newColl.id); onSave?.(pin?.id, [...next]); return next; });
      showToast(`Saved to ${name}`);
      setIsCreating(false);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('collections')
      .insert({ owner_id: userId, name, visibility })
      .select('id, name, visibility, item_count')
      .single();
    setSaving(false);

    if (error) {
      console.error('Create collection error:', error.message);
      showToast('Could not create collection');
      return;
    }

    const newColl = { id: data.id, name: data.name, visibility: data.visibility, count: data.item_count ?? 0 };
    setCollections(prev => [newColl, ...prev]);
    setSavedIds(prev => { const next = new Set(prev); next.add(newColl.id); onSave?.(pin?.id, [...next]); return next; });
    onCollectionCreated?.(newColl);
    showToast(`Saved to ${name}`);
    setIsCreating(false);
  };

  const cards = [{ __isNew: true }, ...collections];
  const rows  = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <Animated.View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) },
          { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Save to collection</Text>
            <Text style={styles.sheetSub}>Choose where this gem should live</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.75}>
            <Ionicons name="close" size={18} color={NAVY} />
          </TouchableOpacity>
        </View>

        <Toast message={toast} />

        {isCreating ? (
          <CreateCollectionForm
            onCancel={() => setIsCreating(false)}
            onCreate={handleCreate}
            saving={saving}
          />
        ) : loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={NAVY} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map(item =>
                  item.__isNew
                    ? <NewCollectionCard key="new" onPress={() => setIsCreating(true)} />
                    : <CollectionCard
                        key={item.id}
                        item={item}
                        selected={savedIds.has(item.id)}
                        onPress={() => toggleCollection(item)}
                      />
                )}
                {row.length === 1 && <View style={{ width: CARD_W }} />}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: '82%',
    paddingHorizontal: GRID_PAD,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(28,23,20,0.14)',
    alignSelf: 'center', marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18, fontWeight: '800', color: NAVY,
    letterSpacing: -0.4, marginBottom: 3,
  },
  sheetSub: { fontSize: 12, color: MUTED },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(28,23,20,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#EEF7EE',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 14,
  },
  toastText: { fontSize: 13, fontWeight: '600', color: '#2D6035' },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  grid: { gap: CARD_GAP, paddingBottom: 8 },
  gridRow: { flexDirection: 'row', gap: CARD_GAP },
  newCard: {
    width: CARD_W, height: CARD_H,
    borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(45,63,92,0.20)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(45,63,92,0.03)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  newCardPlus: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(45,63,92,0.09)',
    alignItems: 'center', justifyContent: 'center',
  },
  newCardLabel: {
    fontSize: 13, fontWeight: '600', color: NAVY, textAlign: 'center',
  },
  collCard: {
    width: CARD_W, height: CARD_H,
    borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#F7F4F0',
    alignItems: 'center', justifyContent: 'center',
    padding: 12, gap: 6,
  },
  collCardSelected: { backgroundColor: NAVY, borderColor: NAVY },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  collName: {
    fontSize: 15, fontWeight: '700', color: NAVY,
    textAlign: 'center', letterSpacing: -0.3,
  },
  collNameSelected: { color: '#FFFFFF' },
  collMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  collCount: { fontSize: 11, color: MUTED },
  visPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: 'rgba(28,23,20,0.04)',
  },
  visPillShared: {
    borderColor: 'rgba(45,63,92,0.18)',
    backgroundColor: 'rgba(45,63,92,0.06)',
  },
  visPillSelected: {
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  visText: { fontSize: 9, fontWeight: '600', color: MUTED, letterSpacing: 0.2 },
  createForm: { paddingVertical: 8, gap: 12 },
  createSection: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16 },
  createSectionLabel: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 10 },
  createInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(28,23,20,0.10)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1C1714',
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#1C1714', marginBottom: 2 },
  optionSub: { fontSize: 12, color: MUTED, lineHeight: 16 },
  saveBtn: {
    backgroundColor: NAVY,
    borderRadius: 100, paddingVertical: 15, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cancelLink: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { fontSize: 14, fontWeight: '600', color: MUTED },
});
