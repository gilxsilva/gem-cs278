import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { CATEGORIES, getCat, STANFORD, MAP_STYLES_DARK, MAP_STYLES_LIGHT, THEMES } from '../constants';

function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl;
}

const PREVIEW_H = 200;

const PinMarker = React.memo(({ pin, isSelected, onPress }) => {
  const c = getCat(pin.category);
  const [tracksViewChanges, setTracksViewChanges] = useState(false);

  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, [isSelected]);

  return (
    <Marker
      coordinate={{ latitude: pin.lat, longitude: pin.lng }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
    >
      <View pointerEvents="none" style={[styles.pinOuter, { backgroundColor: c.base + '20' }]}>
        <View style={[
          styles.pinInner,
          { backgroundColor: isSelected ? c.base : '#fff', borderColor: c.base + '80' },
        ]}>
          <Ionicons name={c.icon} size={14} color={isSelected ? '#fff' : c.base} />
        </View>
      </View>
    </Marker>
  );
});

export default function MapScreen({ navigation, route, user, theme, toggleTheme }) {
  const [pins, setPins] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [mapMode, setMapMode] = useState('all'); // 'all' | 'circle'
  const [followingIds, setFollowingIds] = useState(new Set());
  const [selectedPin, setSelectedPin] = useState(null);
  const regionRef = useRef({
    ...STANFORD,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(PREVIEW_H)).current;
  const t = THEMES[theme];

  useEffect(() => {
    const isGuest = user?.uid === 'guest';
    if (isGuest) { setPins([]); return; }

    (async () => {
      const [feedRes, followsRes] = await Promise.all([
        supabase.rpc('get_feed', { p_limit: 100, p_offset: 0 }),
        supabase.from('follows').select('following_id').eq('follower_id', user.uid),
      ]);
      if (feedRes.error) { console.error('Map feed error:', feedRes.error); return; }
      setPins((feedRes.data ?? [])
        .filter(row => row.place_lat && row.place_lng)
        .map(row => ({
          id:          row.gem_id,
          title:       row.title,
          note:        row.caption,
          category:    row.category,
          photoURL:    resolveImageUrl(row.images?.[0]?.storage_path),
          locationName:[row.place_name, row.place_city].filter(Boolean).join(', '),
          lat:         row.place_lat,
          lng:         row.place_lng,
          authorId:    row.author_id,
          authorName:  row.author_name,
          authorPhoto: row.author_avatar,
        }))
      );
      setFollowingIds(new Set((followsRes.data ?? []).map(r => r.following_id)));
    })();
  }, [user?.uid]);

  // Tapping the logo resets the map to the default region
  const resetMapView = () => {
    mapRef.current?.animateToRegion(
      { ...STANFORD, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400
    );
  };

  const zoomIn = () => {
    const r = regionRef.current;
    const next = { ...r, latitudeDelta: r.latitudeDelta / 2, longitudeDelta: r.longitudeDelta / 2 };
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, 250);
  };

  const zoomOut = () => {
    const r = regionRef.current;
    const next = { ...r, latitudeDelta: r.latitudeDelta * 2, longitudeDelta: r.longitudeDelta * 2 };
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, 250);
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedPin ? 0 : PREVIEW_H,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [selectedPin]);

  const handleMarkerPress = (pin) => {
    setSelectedPin(pin);
    mapRef.current?.animateToRegion({
      latitude: pin.lat,
      longitude: pin.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  useEffect(() => {
    const pinId = route.params?.pinId;
    if (!pinId || pins.length === 0) return;
    const pin = pins.find(p => p.id === pinId);
    if (pin) handleMarkerPress(pin);
  }, [route.params?.pinId, pins]);

  const mapPins = mapMode === 'circle'
    ? pins.filter(p => followingIds.has(p.authorId))
    : pins;

  const filtered = activeCategory === 'all'
    ? mapPins
    : mapPins.filter(p => p.category === activeCategory);

  const cat = selectedPin ? getCat(selectedPin.category) : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={regionRef.current}
        userInterfaceStyle={theme}
        customMapStyle={theme === 'dark' ? MAP_STYLES_DARK : MAP_STYLES_LIGHT}
        onPress={(e) => { if (e.nativeEvent.action === 'press') setSelectedPin(null); }}
        onRegionChangeComplete={r => { regionRef.current = r; }}
        showsUserLocation
        showsCompass={false}
        toolbarEnabled={false}
      >
        {filtered.map(pin => (
          <PinMarker
            key={pin.id}
            pin={pin}
            isSelected={selectedPin?.id === pin.id}
            onPress={() => handleMarkerPress(pin)}
          />
        ))}
      </MapView>

      {/* Top bar — matches Feed screen structure */}
      <View style={[styles.topBar, { backgroundColor: t.bg }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topRow}>
            {/* Logo — tap resets map to home region */}
            <TouchableOpacity onPress={resetMapView} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Image source={require('../assets/logo.png')} style={styles.wordmark} />
            </TouchableOpacity>

            {/* Search pill — navigates to Search screen */}
            <TouchableOpacity
              style={[styles.searchPill, { backgroundColor: t.surface }]}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.72}
            >
              <Ionicons name="search-outline" size={14} color={t.muted} />
              <Text style={[styles.searchPillText, { color: t.muted }]} numberOfLines={1}>
                search gems and places
              </Text>
            </TouchableOpacity>

            {/* Actions: create + profile */}
            <View style={styles.topRight}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: t.accent }]}
                onPress={() => navigation.navigate('AddPin')}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarBtn, { backgroundColor: t.surface }]}
                onPress={() => navigation.navigate('Profile', { user, isOwnProfile: true })}
              >
                {user.photoURL
                  ? <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
                  : <Ionicons name="person" size={16} color={t.muted} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {/* Circle mode toggle chip */}
            <TouchableOpacity
              style={[styles.chip, mapMode === 'circle' && { backgroundColor: t.accent }]}
              onPress={() => setMapMode(prev => prev === 'circle' ? 'all' : 'circle')}
            >
              <Ionicons name="people-outline" size={12} color={mapMode === 'circle' ? '#FAF7F2' : t.muted} />
              <Text style={[styles.chipText, { color: mapMode === 'circle' ? '#FAF7F2' : t.muted }]}>
                Circle
              </Text>
            </TouchableOpacity>
            <View style={[styles.chipDivider, { backgroundColor: t.border }]} />
            <TouchableOpacity
              style={[styles.chip, activeCategory === 'all' && { backgroundColor: t.accent }]}
              onPress={() => setActiveCategory('all')}
            >
              <Text style={[styles.chipText, { color: activeCategory === 'all' ? '#FAF7F2' : t.muted }]}>
                All
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, activeCategory === c.id && { backgroundColor: t.accent }]}
                onPress={() => setActiveCategory(c.id)}
              >
                <Ionicons name={c.icon} size={12} color={activeCategory === c.id ? '#FAF7F2' : c.color} />
                <Text style={[styles.chipText, { color: activeCategory === c.id ? '#FAF7F2' : t.muted }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Circle mode empty state overlay */}
      {mapMode === 'circle' && filtered.length === 0 && (
        <View style={styles.circleEmptyOverlay} pointerEvents="none">
          <View style={[styles.circleEmptyCard, { backgroundColor: t.surface }]}>
            <Text style={[styles.circleEmptyTitle, { color: t.text }]}>
              {followingIds.size === 0
                ? 'Follow people to see their gems here'
                : 'Your circle hasn\'t placed any gems here'}
            </Text>
            <Text style={[styles.circleEmptySub, { color: t.muted }]}>
              {followingIds.size === 0
                ? 'Find people whose taste you trust'
                : 'Try Discover to find gems from everyone'}
            </Text>
          </View>
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={[styles.zoomBtn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={zoomIn}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={20} color={t.text} />
        </TouchableOpacity>
        <View style={[styles.zoomDivider, { backgroundColor: t.border }]} />
        <TouchableOpacity
          style={[styles.zoomBtn, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={zoomOut}
          activeOpacity={0.75}
        >
          <Ionicons name="remove" size={20} color={t.text} />
        </TouchableOpacity>
      </View>

      {/* Pin preview sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border },
          { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        {selectedPin && cat && (
          <>
            <View style={styles.previewInner}>
              {selectedPin.photoURL
                ? <Image source={{ uri: selectedPin.photoURL }} style={styles.previewPhoto} />
                : <View style={[styles.previewPhotoPlaceholder, { backgroundColor: t.surface2 }]}>
                    <Ionicons name={cat.icon} size={26} color={cat.color} />
                  </View>
              }
              <View style={styles.previewInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Ionicons name={cat.icon} size={11} color={cat.color} />
                  <Text style={[styles.previewCat, { color: cat.color, marginBottom: 0 }]}>
                    {cat.label.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.previewTitle, { color: t.text }]} numberOfLines={1}>
                  {selectedPin.title}
                </Text>
                {selectedPin.note ? (
                  <Text style={[styles.previewNote, { color: t.muted }]} numberOfLines={1}>
                    "{selectedPin.note}"
                  </Text>
                ) : null}
                <View style={styles.previewBy}>
                  {selectedPin.authorPhoto
                    ? <Image source={{ uri: selectedPin.authorPhoto }} style={styles.byAvatar} />
                    : null}
                  <Text style={[styles.byName, { color: t.muted }]}>
                    pinned by {selectedPin.authorName?.split(' ')[0]}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.viewBtn, { backgroundColor: t.accent }]}
              onPress={() => navigation.navigate('PinDetail', { pinId: selectedPin.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.viewBtnText}>see full pin</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  pinOuter: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  },
  pinOuterSelected: {
    width: 46, height: 46, borderRadius: 23,
    shadowOpacity: 0.38, shadowRadius: 12,
  },
  pinInner: {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
  },
  pinInnerSelected: {
    width: 32, height: 32, borderRadius: 16,
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    gap: 10,
  },
  wordmark: { width: 32, height: 32, borderRadius: 8 },
  searchPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchPillText: { fontSize: 13, fontWeight: '400', flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 34, height: 34 },

  zoomControls: {
    position: 'absolute', right: 16, bottom: 120,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  zoomDivider: { height: 1 },

  catScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, backgroundColor: 'rgba(28,23,20,0.06)',
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipDivider: { width: 1, height: 20, alignSelf: 'center' },

  // Circle empty state overlay (centered, non-blocking)
  circleEmptyOverlay: {
    position: 'absolute', bottom: 220, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 32,
  },
  circleEmptyCard: {
    borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  circleEmptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  circleEmptySub: { fontSize: 12, textAlign: 'center', lineHeight: 17 },

  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  previewInner: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  previewPhoto: { width: 64, height: 64, borderRadius: 12 },
  previewPhotoPlaceholder: { width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 26 },
  previewInfo: { flex: 1 },
  previewCat: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  previewTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  previewNote: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  previewBy: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  byAvatar: { width: 20, height: 20, borderRadius: 10 },
  byName: { fontSize: 12 },
  viewBtn: { marginTop: 14, borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
