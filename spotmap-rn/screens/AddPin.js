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
// Matches the Apple-inspired system established in Login.js
const NAVY   = '#0D1F3C';
const WHITE  = '#FFFFFF';
const L1     = NAVY;
const L2     = 'rgba(13,31,60,0.42)';
const L3     = 'rgba(13,31,60,0.26)';
const FILL   = '#F4F2EE';               // warm input fill
const BORDER = 'rgba(13,31,60,0.08)';
const STANFORD = { latitude: 37.4275, longitude: -122.1697 };

// ─────────────────────────────────────────────────────────────────────────────
// PlacePicker — bottom-sheet modal
//
// Dual search on every keystroke (debounced):
//   • Supabase places table  → community places already in gem
//   • services/places.js     → Nominatim real-world geocoding (any place on Earth)
//
// Selecting any result gives a complete { name, address, city, latitude, longitude }.
// Manual entry remains as a last resort; the typed address is auto-geocoded on confirm.
// ─────────────────────────────────────────────────────────────────────────────
function PlacePicker({ visible, onSelect, onClose }) {
  const [query,      setQuery]      = useState('');
  const [dbResults,  setDbResults]  = useState([]);   // Supabase places
  const [extResults, setExtResults] = useState([]);   // Nominatim places
  const [dbBusy,     setDbBusy]     = useState(false);
  const [extBusy,    setExtBusy]    = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddr, setManualAddr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const dbTimer  = useRef(null);
  const extTimer = useRef(null);

  // Reset all state when the modal opens
  useEffect(() => {
    if (visible) {
      setQuery(''); setDbResults([]); setExtResults([]);
      setDbBusy(false); setExtBusy(false);
      setShowManual(false); setManualName(''); setManualAddr('');
      setConfirming(false);
    }
  }, [visible]);

  // ── Supabase search (250 ms debounce) ────────────────────────────────────
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

  // ── Nominatim real-world search (400 ms debounce — respects 1 req/s) ─────
  useEffect(() => {
    clearTimeout(extTimer.current);
    const q = query.trim();
    if (q.length < 2) { setExtResults([]); setExtBusy(false); return; }
    setExtBusy(true);
    extTimer.current = setTimeout(async () => {
      const places = await searchPlaces(q);
      setExtBusy(false);
      // Filter out Nominatim results whose name already appears in DB results
      // (simple dedup by lowercased name)
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

  // For manually-entered places: auto-geocode the address, then confirm.
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={pp.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={pp.sheet}>
          <View style={pp.handle} />

          {/* Header */}
          <View style={pp.sheetHeader}>
            <Text style={pp.sheetTitle}>where is it?</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={20} color={L2} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
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
            {/* ── Community places (already in gem) ──────────── */}
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

            {/* ── Real-world places (Nominatim / Google) ─────── */}
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

            {/* ── Empty state ─────────────────────────────────── */}
            {showEmpty && (
              <Text style={pp.emptyMsg}>No results for "{query.trim()}"</Text>
            )}

            {/* ── Separator before add-manual ─────────────────── */}
            {hasAnyResults && !showManual && (
              <View style={[pp.divider, { marginVertical: 8, marginLeft: 0 }]} />
            )}

            {/* ── Add manually ────────────────────────────────── */}
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
              /* ── Manual entry form ──────────────────────────── */
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

  // Search bar
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

  // Section label
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: L3,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },

  // Results scroll
  resultScroll: { maxHeight: 380 },
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
  resultIconGem: {
    backgroundColor: 'rgba(13,31,60,0.06)',
  },
  gemGlyph: {
    fontSize: 13,
    color: NAVY,
  },
  resultMeta: { flex: 1 },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: L1,
    letterSpacing: -0.2,
  },
  resultAddr: {
    fontSize: 12,
    color: L3,
    marginTop: 2,
  },
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

  // Add manually row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  addIcon: { backgroundColor: 'rgba(13,31,60,0.06)' },
  addText: {
    fontSize: 14,
    fontWeight: '500',
    color: NAVY,
    flex: 1,
  },

  // Manual entry form
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
  manualHint: {
    fontSize: 11.5,
    color: L3,
    marginTop: 6,
    lineHeight: 16,
  },
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
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHITE,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AddPin — main compose screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AddPin({ navigation, user }) {
  const [location, setLocation] = useState(null);
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('');
  const [note,     setNote]     = useState('');
  const [photo,    setPhoto]    = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const canSubmit = !loading && !!title.trim() && !!category && !!location;

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

  // Submit logic is unchanged from the original — find or create place, then gem.
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
      // 1. Find or create the place
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

      // 2. Create the gem
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

      // 3. Upload photo if provided
      if (photo) {
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const ext  = (photo.uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
        const storagePath = `gems/${user.uid}/${gem.id}/001.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('gem-images')
          .upload(storagePath, blob, { contentType: `image/${ext}`, upsert: true });
        if (!uploadErr) {
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

        {/* ── Header ──────────────────────────────────────────── */}
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

        {/* ── Form ────────────────────────────────────────────── */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* WHERE IS IT? — first, because the place anchors the gem */}
          <View style={s.field}>
            <Text style={s.label}>WHERE IS IT?</Text>
            <TouchableOpacity
              style={[s.locationRow, location && s.locationRowSelected]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={location ? 'location' : 'location-outline'}
                size={17}
                color={location ? NAVY : L3}
              />
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

          {/* NAME YOUR GEM */}
          <View style={s.field}>
            <Text style={s.label}>NAME YOUR GEM</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Coupa back patio on a Tuesday"
              placeholderTextColor={L3}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          {/* TYPE OF GEM */}
          <View style={s.field}>
            <Text style={s.label}>TYPE OF GEM</Text>
            <View style={s.catGrid}>
              {CATEGORIES.map(c => {
                const active = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.catChip,
                      active && {
                        backgroundColor: c.color + '16',
                        borderColor:     c.color + '50',
                      },
                    ]}
                    onPress={() => setCategory(active ? '' : c.id)}
                    activeOpacity={0.72}
                  >
                    <Ionicons
                      name={c.icon}
                      size={17}
                      color={active ? c.color : L3}
                    />
                    <Text style={[s.catLabel, active && { color: c.color }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* WHAT MADE IT SPECIAL */}
          <View style={s.field}>
            <Text style={s.label}>WHAT MADE IT SPECIAL?</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="what would you tell a friend?"
              placeholderTextColor={L3}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* ADD A PHOTO */}
          <View style={s.field}>
            <Text style={s.label}>ADD A PHOTO</Text>
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
                <Ionicons name="camera-outline" size={22} color={L3} />
                <Text style={s.photoUploadText}>tap to add a photo</Text>
                <Text style={s.photoOptional}>optional</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>

        {/* ── Submit footer (always visible, KAV-protected) ────── */}
        <View style={s.footer}>
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

      {/* Place picker modal — lives outside KAV; modals render above all */}
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

  // Header
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

  // Scroll form
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 28,
  },

  // Field + label
  field: { gap: 10 },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: L3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Text inputs
  input: {
    backgroundColor: FILL,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: L1,
  },
  textarea: {
    minHeight: 96,
    paddingTop: 14,
  },

  // Location row — two states: empty and selected
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: FILL,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  locationRowSelected: {
    backgroundColor: WHITE,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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

  // Category chips — 2-column, icon left + label
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
    backgroundColor: FILL,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: L3,
    flex: 1,
  },

  // Photo upload
  photoUpload: {
    backgroundColor: FILL,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  photoUploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: L2,
  },
  photoOptional: {
    fontSize: 11.5,
    fontWeight: '400',
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

  // Footer CTA
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
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
