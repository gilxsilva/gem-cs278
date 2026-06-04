/**
 * AddPin.js — "leave a gem" compose screen
 *
 * Major changes from previous version:
 *   1. Place selection: live Supabase search + manual-entry fallback
 *      — no more hardcoded NEARBY_PLACES list
 *   2. Location field moved to the top (it anchors the gem)
 *   3. Apple-inspired design: white surface, warm-fill inputs, hairline
 *      borders, flat navy CTA, clean typography
 *   4. KeyboardAvoidingView keeps the submit footer accessible
 *   5. PlacePicker extracted as a named sub-component for clarity
 *
 * Submit logic: UNCHANGED — existing "find or create place" path works
 *   for both DB search results and manually entered places.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { CATEGORIES } from '../constants';
import { searchPlaces, geocodeAddress, fmtDisplayName } from '../services/places';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0D1F3C';
const WHITE  = '#FFFFFF';
const L1     = NAVY;
const L2     = 'rgba(13,31,60,0.42)';
const L3     = 'rgba(13,31,60,0.26)';
const FILL   = '#F4F2EE';
const BORDER = 'rgba(13,31,60,0.08)';
const STANFORD = { latitude: 37.4275, longitude: -122.1697 };

// ─────────────────────────────────────────────────────────────────────────────
// PlacePicker — bottom-sheet modal (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────
function PlacePicker({ visible, onSelect, onClose }) {
  const [query,      setQuery]      = useState('');
  const [dbResults,  setDbResults]  = useState([]);
  const [extResults, setExtResults] = useState([]);
  const [dbBusy,     setDbBusy]     = useState(false);
  const [extBusy,    setExtBusy]    = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddr, setManualAddr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const dbTimer  = useRef(null);
  const extTimer = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery(''); setDbResults([]); setExtResults([]);
      setDbBusy(false); setExtBusy(false);
      setShowManual(false); setManualName(''); setManualAddr('');
      setConfirming(false);
    }
  }, [visible]);

  useEffect(() => {
    clearTimeout(dbTimer.current);
    const q = query.trim();
    if (q.length < 2) { setDbResults([]); setDbBusy(false); return; }
    setDbBusy(true);
    dbTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('places')
        .select('id, name, address, city, latitude, longitude')
        .ilike('name', `%${q}%`)
        .limit(5);
      setDbBusy(false);
      setDbResults(data ?? []);
    }, 250);
    return () => clearTimeout(dbTimer.current);
  }, [query]);

  useEffect(() => {
    clearTimeout(extTimer.current);
    const q = query.trim();
    if (q.length < 2) { setExtResults([]); setExtBusy(false); return; }
    setExtBusy(true);
    extTimer.current = setTimeout(async () => {
      const places = await searchPlaces(q);
      setExtBusy(false);
      const dbNames = new Set(dbResults.map(r => r.name.toLowerCase()));
      setExtResults(places.filter(p => !dbNames.has(p.name.toLowerCase())));
    }, 400);
    return () => clearTimeout(extTimer.current);
  }, [query, dbResults]);

  const busy = dbBusy || extBusy;
  const hasQuery = query.trim().length >= 2;
  const hasAnyResults = dbResults.length > 0 || extResults.length > 0;
  const showEmpty = hasQuery && !busy && !hasAnyResults && !showManual;

  const openManual = () => {
    setManualName(query.trim());
    setManualAddr('');
    setShowManual(true);
  };

  const confirmManual = async () => {
    const name = manualName.trim();
    const addr = manualAddr.trim();
    if (!name || !addr) return;
    setConfirming(true);
    try {
      const coords = await geocodeAddress(addr);
      onSelect({
        name,
        address:   addr,
        city:      null,
        latitude:  coords?.latitude  ?? STANFORD.latitude,
        longitude: coords?.longitude ?? STANFORD.longitude,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={pp.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={pp.sheet}>
          <View style={pp.handle} />

          <View style={pp.sheetHeader}>
            <Text style={pp.sheetTitle}>where is it?</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={pp.doneBtn}
            >
              <Text style={pp.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={pp.searchBar}>
            <Ionicons name="search-outline" size={15} color={L3} />
            <TextInput
              style={pp.searchInput}
              placeholder="search any place in the world…"
              placeholderTextColor={L3}
              value={query}
              onChangeText={t => { setQuery(t); setShowManual(false); }}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {busy && <ActivityIndicator size="small" color={L3} />}
          </View>

          <ScrollView
            style={pp.resultScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {dbResults.length > 0 && (
              <>
                <Text style={pp.sectionLabel}>IN GEM</Text>
                {dbResults.map((place, i) => (
                  <React.Fragment key={place.id}>
                    {i > 0 && <View style={pp.divider} />}
                    <TouchableOpacity
                      style={pp.resultRow}
                      onPress={() => onSelect({ ...place, latitude: place.latitude, longitude: place.longitude })}
                      activeOpacity={0.7}
                    >
                      <View style={[pp.resultIcon, pp.resultIconGem]}>
                        <Text style={pp.gemGlyph}>✦</Text>
                      </View>
                      <View style={pp.resultMeta}>
                        <Text style={pp.resultName}>{place.name}</Text>
                        {place.address
                          ? <Text style={pp.resultAddr} numberOfLines={1}>{place.address}</Text>
                          : null}
                      </View>
                      <Ionicons name="chevron-forward" size={13} color={L3} />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </>
            )}

            {extResults.length > 0 && (
              <>
                <Text style={[pp.sectionLabel, dbResults.length > 0 && { marginTop: 16 }]}>
                  PLACES
                </Text>
                {extResults.map((place, i) => (
                  <React.Fragment key={place.externalId ?? i}>
                    {i > 0 && <View style={pp.divider} />}
                    <TouchableOpacity
                      style={pp.resultRow}
                      onPress={() => onSelect(place)}
                      activeOpacity={0.7}
                    >
                      <View style={pp.resultIcon}>
                        <Ionicons name="location-outline" size={15} color={NAVY} />
                      </View>
                      <View style={pp.resultMeta}>
                        <Text style={pp.resultName}>{place.name}</Text>
                        {place.address
                          ? <Text style={pp.resultAddr} numberOfLines={1}>{place.address}</Text>
                          : null}
                      </View>
                      <Ionicons name="chevron-forward" size={13} color={L3} />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </>
            )}

            {showEmpty && (
              <Text style={pp.emptyMsg}>No results for "{query.trim()}"</Text>
            )}

            {hasAnyResults && !showManual && (
              <View style={[pp.divider, { marginVertical: 8, marginLeft: 0 }]} />
            )}

            {!showManual ? (
              <TouchableOpacity style={pp.addRow} onPress={openManual} activeOpacity={0.72}>
                <View style={[pp.resultIcon, pp.addIcon]}>
                  <Ionicons name="add" size={16} color={NAVY} />
                </View>
                <Text style={pp.addText}>
                  {showEmpty
                    ? `Add "${query.trim()}" manually`
                    : "Can't find it? Add manually"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={pp.manualWrap}>
                <Text style={pp.manualLabel}>PLACE NAME</Text>
                <TextInput
                  style={pp.manualInput}
                  placeholder={query.trim() || 'e.g. The garden behind Frost'}
                  placeholderTextColor={L3}
                  value={manualName}
                  onChangeText={setManualName}
                  returnKeyType="next"
                  autoFocus
                />

                <Text style={[pp.manualLabel, { marginTop: 14 }]}>ADDRESS</Text>
                <TextInput
                  style={pp.manualInput}
                  placeholder="e.g. 450 Serra Mall, Stanford, CA"
                  placeholderTextColor={L3}
                  value={manualAddr}
                  onChangeText={setManualAddr}
                  returnKeyType="done"
                  onSubmitEditing={confirmManual}
                />
                <Text style={pp.manualHint}>
                  We'll use the address to place your pin on the map.
                </Text>

                <View style={pp.manualActions}>
                  <TouchableOpacity style={pp.cancelBtn} onPress={() => setShowManual(false)}>
                    <Text style={pp.cancelText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      pp.confirmBtn,
                      (!manualName.trim() || !manualAddr.trim() || confirming) && { opacity: 0.38 },
                    ]}
                    onPress={confirmManual}
                    disabled={!manualName.trim() || !manualAddr.trim() || confirming}
                  >
                    {confirming
                      ? <ActivityIndicator size="small" color={WHITE} />
                      : <Text style={pp.confirmText}>Add this place</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '82%',
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(13,31,60,0.12)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: L1,
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: FILL,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: L1,
    paddingVertical: 0,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: L3,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  resultScroll: { maxHeight: 420 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  resultIcon: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: FILL,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultIconGem: { backgroundColor: 'rgba(13,31,60,0.06)' },
  gemGlyph: { fontSize: 13, color: NAVY },
  resultMeta: { flex: 1 },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: L1,
    letterSpacing: -0.2,
  },
  resultAddr: { fontSize: 12, color: L3, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: 44,
  },
  emptyMsg: {
    fontSize: 13,
    color: L3,
    textAlign: 'center',
    paddingVertical: 18,
  },
  doneBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: WHITE },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  addIcon: { backgroundColor: 'rgba(13,31,60,0.06)' },
  addText: { fontSize: 14, fontWeight: '500', color: NAVY, flex: 1 },
  manualWrap: { paddingTop: 8 },
  manualLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: L3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: FILL,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: L1,
  },
  manualHint: { fontSize: 11.5, color: L3, marginTop: 6, lineHeight: 16 },
  manualActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { fontSize: 14, color: L2 },
  confirmBtn: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: WHITE },
});

// ─────────────────────────────────────────────────────────────────────────────
// AddPin — main compose screen
// ─────────────────────────────────────────────────────────────────────────────

// Inline hint text rendered below each section label
function FieldHint({ text }) {
  return <Text style={s.fieldHint}>{text}</Text>;
}

export default function AddPin({ navigation, user }) {
  const [location,   setLocation]   = useState(null);
  const [title,      setTitle]      = useState('');
  const [category,   setCategory]   = useState('');
  const [note,       setNote]       = useState('');
  const [photo,      setPhoto]      = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [focused,    setFocused]    = useState(null); // 'title' | 'note'

  const canSubmit = !loading && !!title.trim() && !!category && !!location;

  // Collect missing required fields for the footer hint
  const missing = [];
  if (!location)     missing.push('a place');
  if (!title.trim()) missing.push('a name');
  if (!category)     missing.push('a type');

  // ── Info button handlers ─────────────────────────────────────────────────
  const showTitleTips = () => Alert.alert(
    'What makes a good name?',
    'Be specific and memorable — name the moment, not just the place.\n\nGood examples:\n"Coupa back patio on a Tuesday"\n"The quiet corner by the windows"\n\nLess useful:\n"Nice café"',
    [{ text: 'Got it' }]
  );

  const showNotesTips = () => Alert.alert(
    'What to write here',
    'Tell a friend why this place matters. Think: what would make someone actually go?\n\nGood example:\n"Quiet in the mornings, lots of outlets, and the back patio gets great sunlight."\n\nLess useful:\n"Great vibes."',
    [{ text: 'Got it' }]
  );

  const showCategoryTips = () => Alert.alert(
    'Picking the right type',
    'Choose the category that fits how you use the place, not just what kind of place it is.\n\nA coffee shop you go to study is a Study Gem. A restaurant you return to for the atmosphere is a Food Spot.',
    [{ text: 'Got it' }]
  );

  // ── Photo picker (UNCHANGED) ─────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  // ── Submit (UNCHANGED) ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim() || !category || !location) {
      Alert.alert('Almost there', 'Add a name, type, and location for your gem.');
      return;
    }
    if (user?.uid === 'guest') {
      Alert.alert(
        'Sign in to leave a gem',
        'Create an account to share your finds.',
        [{ text: 'Cancel', style: 'cancel' },
         { text: 'Sign in', onPress: () => supabase.auth.signOut() }],
      );
      return;
    }
    setLoading(true);
    try {
      let placeId;
      const { data: existing } = await supabase
        .from('places').select('id').eq('name', location.name).maybeSingle();
      if (existing) {
        placeId = existing.id;
      } else {
        const { data: newPlace, error: placeErr } = await supabase
          .from('places')
          .insert({
            name:      location.name,
            address:   location.address ?? null,
            city:      location.city    ?? null,
            latitude:  location.latitude  ?? STANFORD.latitude,
            longitude: location.longitude ?? STANFORD.longitude,
            created_by: user.uid,
          })
          .select('id').single();
        if (placeErr) throw placeErr;
        placeId = newPlace.id;
      }

      const { data: gem, error: gemErr } = await supabase
        .from('gems')
        .insert({
          author_id: user.uid,
          place_id:  placeId,
          title:     title.trim(),
          caption:   note.trim() || null,
          category,
          visibility: 'public',
        })
        .select('id').single();
      if (gemErr) throw gemErr;

      if (photo) {
        const arrayBuffer = await fetch(photo.uri).then(r => r.arrayBuffer());
        const storagePath = `gems/${user.uid}/${gem.id}/001.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('gem-images')
          .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) {
          Alert.alert('Photo upload failed', uploadErr.message);
        } else {
          await supabase.from('gem_images')
            .insert({ gem_id: gem.id, storage_path: storagePath, order_index: 0 });
        }
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert('Something went wrong', e.message ?? 'Try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={L1} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>leave a gem</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Invite line — sets the tone without adding friction */}
          <Text style={s.inviteLine}>
            Share a real place you'd recommend to a friend.
          </Text>

          {/* ── WHERE IS IT? ────────────────────────────────────────── */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>WHERE IS IT?</Text>
            </View>
            <FieldHint text="Search by name, address, or neighborhood." />
            <TouchableOpacity
              style={[s.locationRow, location && s.locationRowSelected]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.75}
            >
              <View style={[s.locationIconWrap, location && s.locationIconWrapFilled]}>
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={16}
                  color={location ? NAVY : L3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.locationName, !location && { color: L3 }]}>
                  {location ? location.name : 'search for a place…'}
                </Text>
                {location?.address
                  ? <Text style={s.locationAddr} numberOfLines={1}>{location.address}</Text>
                  : null}
              </View>
              <Ionicons name="chevron-forward" size={13} color={L3} />
            </TouchableOpacity>
          </View>

          {/* ── NAME YOUR GEM ───────────────────────────────────────── */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>NAME YOUR GEM</Text>
              <TouchableOpacity
                onPress={showTitleTips}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={17} color={L3} />
              </TouchableOpacity>
            </View>
            <FieldHint text="Make it specific and memorable." />
            <TextInput
              style={[s.input, focused === 'title' && s.inputFocused]}
              placeholder="e.g. Coupa back patio on a Tuesday"
              placeholderTextColor={L3}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocused('title')}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
            />
          </View>

          {/* ── TYPE OF GEM ─────────────────────────────────────────── */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>TYPE OF GEM</Text>
              <TouchableOpacity
                onPress={showCategoryTips}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={17} color={L3} />
              </TouchableOpacity>
            </View>
            <FieldHint text="Pick the one that best fits how you use this place." />
            <View style={s.catGrid}>
              {CATEGORIES.map(c => {
                const active = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.catChip,
                      active
                        ? { backgroundColor: c.color + '16', borderColor: c.color + '55' }
                        : { backgroundColor: FILL, borderColor: BORDER },
                    ]}
                    onPress={() => setCategory(active ? '' : c.id)}
                    activeOpacity={0.72}
                  >
                    <View style={[
                      s.catIconWrap,
                      active ? { backgroundColor: c.color + '22' } : { backgroundColor: 'rgba(13,31,60,0.06)' },
                    ]}>
                      <Ionicons name={c.icon} size={15} color={active ? c.color : L3} />
                    </View>
                    <Text style={[s.catLabel, active && { color: c.color, fontWeight: '600' }]}>
                      {c.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={16} color={c.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── WHAT MADE IT SPECIAL? ───────────────────────────────── */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>WHAT MADE IT SPECIAL?</Text>
              <TouchableOpacity
                onPress={showNotesTips}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={17} color={L3} />
              </TouchableOpacity>
            </View>
            <FieldHint text="What would you tell a friend about this place?" />
            <TextInput
              style={[s.input, s.textarea, focused === 'note' && s.inputFocused]}
              placeholder={'Quiet in the mornings, lots of outlets, and the\nback patio gets great sunlight.'}
              placeholderTextColor={L3}
              value={note}
              onChangeText={setNote}
              onFocus={() => setFocused('note')}
              onBlur={() => setFocused(null)}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ── ADD A PHOTO ─────────────────────────────────────────── */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>ADD A PHOTO</Text>
              <Text style={s.optionalBadge}>optional</Text>
            </View>
            <FieldHint text="A real photo helps others trust and recognize the place." />
            {photo ? (
              <View style={s.photoPreview}>
                <Image source={{ uri: photo.uri }} style={s.photoImg} />
                <TouchableOpacity
                  style={s.photoRemove}
                  onPress={() => setPhoto(null)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={13} color={WHITE} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={s.photoUpload}
                onPress={pickPhoto}
                activeOpacity={0.75}
              >
                <View style={s.photoIconWrap}>
                  <Ionicons name="camera-outline" size={22} color={L2} />
                </View>
                <Text style={s.photoUploadText}>Add a photo</Text>
                <Text style={s.photoHint}>tap to choose from your library</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>

        {/* ── Footer CTA ───────────────────────────────────────────────── */}
        <View style={s.footer}>
          {!canSubmit && missing.length > 0 && (
            <Text style={s.footerHint}>
              Still needed: {missing.join(', ')}
            </Text>
          )}
          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnOff]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.84}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.submitText}>leave this gem  ✦</Text>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Place picker modal — lives outside KAV */}
      <PlacePicker
        visible={showPicker}
        onSelect={place => { setLocation(place); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: L1,
    letterSpacing: -0.3,
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 26,
  },

  // ── Invite line ───────────────────────────────────────────────────────────
  inviteLine: {
    fontSize: 14,
    color: L2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 2,
  },

  // ── Field group ───────────────────────────────────────────────────────────
  field: { gap: 8 },

  // ── Label row (label + optional info button) ──────────────────────────────
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: L2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: L3,
    letterSpacing: 0.2,
  },

  // ── Field hint (quiet helper below the label) ─────────────────────────────
  fieldHint: {
    fontSize: 12,
    color: L3,
    lineHeight: 17,
    marginTop: -2,
  },

  // ── Text inputs ───────────────────────────────────────────────────────────
  // borderWidth set to 1.5/transparent so focused state doesn't cause layout shift
  input: {
    backgroundColor: FILL,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: L1,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    backgroundColor: WHITE,
    borderColor: 'rgba(13,31,60,0.18)',
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },

  // ── Location row ──────────────────────────────────────────────────────────
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FILL,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  locationRowSelected: {
    backgroundColor: WHITE,
    borderColor: 'rgba(13,31,60,0.18)',
  },
  locationIconWrap: {
    width: 32, height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationIconWrapFilled: {
    backgroundColor: 'rgba(13,31,60,0.10)',
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: L1,
    letterSpacing: -0.2,
  },
  locationAddr: {
    fontSize: 12,
    color: L3,
    marginTop: 2,
  },

  // ── Category grid ─────────────────────────────────────────────────────────
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
  },
  catIconWrap: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: L3,
    flex: 1,
  },

  // ── Photo upload ──────────────────────────────────────────────────────────
  photoUpload: {
    backgroundColor: FILL,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 30,
    alignItems: 'center',
    gap: 6,
  },
  photoIconWrap: {
    width: 48, height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  photoUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: L2,
  },
  photoHint: {
    fontSize: 12,
    color: L3,
  },
  photoPreview: {
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 10, right: 10,
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Footer CTA ────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    gap: 8,
  },
  footerHint: {
    fontSize: 12,
    color: L3,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnOff: {
    opacity: 0.36,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHITE,
    letterSpacing: -0.1,
  },
});
