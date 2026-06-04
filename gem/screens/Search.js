import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { getCat, THEMES } from '../constants';

const HEADER_BG = '#E4EBF5';


function SectionLabel({ label, t }) {
  return <Text style={[styles.sectionLabel, { color: t.muted }]}>{label}</Text>;
}

function Divider({ t }) {
  return <View style={[styles.divider, { backgroundColor: t.border }]} />;
}

function PersonRow({ user, onPress, t }) {
  const handle = '@' + (user.displayName?.toLowerCase().replace(/\s/g, '') ?? 'user');
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.72}>
      {user.photoURL
        ? <Image source={{ uri: user.photoURL }} style={styles.personAvatar} />
        : <View style={[styles.personAvatarFallback, { backgroundColor: t.surface2 }]}>
            <Ionicons name="person" size={16} color={t.muted} />
          </View>
      }
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: t.text }]}>{user.displayName}</Text>
        <Text style={[styles.rowSub, { color: t.muted }]}>{handle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.muted} />
    </TouchableOpacity>
  );
}

function PlaceRow({ pin, onPress, t }) {
  const cat = getCat(pin.category);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.placeIcon, { backgroundColor: cat.color + '18' }]}>
        <Ionicons name={cat.icon} size={16} color={cat.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: t.text }]} numberOfLines={1}>{pin.title}</Text>
        {pin.locationName
          ? <Text style={[styles.rowSub, { color: t.muted }]} numberOfLines={1}>{pin.locationName}</Text>
          : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.muted} />
    </TouchableOpacity>
  );
}

export default function Search({ navigation, theme, user }) {
  const t = THEMES[theme ?? 'light'];
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [topSpots, setTopSpots] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [matchedPins, setMatchedPins] = useState([]);
  const [matchedPeople, setMatchedPeople] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    supabase
      .from('gems')
      .select('id, title, category, places(name, city)')
      .order('save_count', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTopSpots((data ?? []).map(g => ({
          id: g.id,
          title: g.title,
          category: g.category,
          locationName: [g.places?.name, g.places?.city].filter(Boolean).join(', '),
        })));
      });

    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .neq('id', user?.uid ?? '')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setSuggestedPeople((data ?? []).map(p => ({
          uid: p.id,
          displayName: p.display_name,
          photoURL: p.avatar_url,
        })));
      });
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q) { setMatchedPins([]); setMatchedPeople([]); return; }
    setSearching(true);
    const term = `%${q}%`;
    const [gemsRes, peopleRes] = await Promise.all([
      supabase
        .from('gems')
        .select('id, title, category, places(name, city)')
        .or(`title.ilike.${term},category.ilike.${term}`)
        .limit(20),
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', term)
        .limit(10),
    ]);
    setMatchedPins((gemsRes.data ?? []).map(g => ({
      id: g.id,
      title: g.title,
      category: g.category,
      locationName: [g.places?.name, g.places?.city].filter(Boolean).join(', '),
    })));
    setMatchedPeople((peopleRes.data ?? []).map(p => ({
      uid: p.id,
      displayName: p.display_name,
      photoURL: p.avatar_url,
    })));
    setSearching(false);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const timer = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const q = query.trim();
  const hasResults = matchedPeople.length > 0 || matchedPins.length > 0;

  const openPerson = (u) => navigation.navigate('Profile', { user: u, isOwnProfile: u.uid === user?.uid });
  const openPin = (pin) => navigation.navigate('PinDetail', { pinId: pin.id, userId: user?.uid });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: HEADER_BG }}>
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.wordmark} />
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="close" size={20} color="#0D1F3C" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="rgba(28,23,20,0.38)" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="search a friend, location, etc."
              placeholderTextColor="rgba(28,23,20,0.38)"
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.6}>
                <Ionicons name="close-circle" size={16} color="rgba(28,23,20,0.38)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {searching ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={t.accent} />
        ) : !q ? (
          <View style={[styles.panel, { backgroundColor: t.surface }]}>
            {suggestedPeople.length > 0 && (
              <>
                <SectionLabel label="People" t={t} />
                {suggestedPeople.map((u, i) => (
                  <React.Fragment key={u.uid}>
                    {i > 0 && <Divider t={t} />}
                    <PersonRow user={u} onPress={() => openPerson(u)} t={t} />
                  </React.Fragment>
                ))}
                <Divider t={t} />
              </>
            )}
            {topSpots.length > 0 && (
              <>
                <SectionLabel label="Top spots" t={t} />
                {topSpots.map((pin, i) => (
                  <React.Fragment key={pin.id}>
                    {i > 0 && <Divider t={t} />}
                    <PlaceRow pin={pin} onPress={() => openPin(pin)} t={t} />
                  </React.Fragment>
                ))}
              </>
            )}
          </View>
        ) : hasResults ? (
          <View style={[styles.panel, { backgroundColor: t.surface }]}>
            {matchedPeople.length > 0 && (
              <>
                <SectionLabel label="People" t={t} />
                {matchedPeople.map((u, i) => (
                  <React.Fragment key={u.uid}>
                    {i > 0 && <Divider t={t} />}
                    <PersonRow user={u} onPress={() => openPerson(u)} t={t} />
                  </React.Fragment>
                ))}
              </>
            )}
            {matchedPeople.length > 0 && matchedPins.length > 0 && <Divider t={t} />}
            {matchedPins.length > 0 && (
              <>
                <SectionLabel label="Places" t={t} />
                {matchedPins.map((pin, i) => (
                  <React.Fragment key={pin.id}>
                    {i > 0 && <Divider t={t} />}
                    <PlaceRow pin={pin} onPress={() => openPin(pin)} t={t} />
                  </React.Fragment>
                ))}
              </>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGem}>✦</Text>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No results for "{q}"</Text>
            <Text style={[styles.emptySub, { color: t.muted }]}>Try a name, place, or category</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
  },
  wordmark: { width: 36, height: 36, borderRadius: 9 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(45,63,92,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1C1714' },
  body: { padding: 16, paddingBottom: 40 },
  panel: { borderRadius: 20, overflow: 'hidden' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  divider: { height: 1, marginHorizontal: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  personAvatar: { width: 36, height: 36, borderRadius: 18 },
  personAvatarFallback: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  placeIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyGem: { fontSize: 32, color: '#C4A882', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },
});
