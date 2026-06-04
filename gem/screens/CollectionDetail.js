import { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { getCat, THEMES } from '../constants';

function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl;
}

export default function CollectionDetail({ navigation, route, theme }) {
  const { collection, userId } = route.params;
  const t = THEMES[theme ?? 'light'];

  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('collection_gems')
      .select(`
        gem:gems(
          id, title, caption, category, created_at,
          author:profiles!gems_author_id_fkey(display_name, avatar_url),
          place:places!gems_place_id_fkey(name, city),
          images:gem_images(storage_path, order_index)
        )
      `)
      .eq('collection_id', collection.id)
      .then(({ data, error }) => {
        if (error) console.error('CollectionDetail fetch error:', error.message);
        const mapped = (data ?? [])
          .map(r => r.gem)
          .filter(Boolean)
          .map(g => {
            const sorted = (g.images ?? []).sort((a, b) => a.order_index - b.order_index);
            return {
              id:           g.id,
              title:        g.title,
              note:         g.caption,
              category:     g.category,
              locationName: [g.place?.name, g.place?.city].filter(Boolean).join(', '),
              photoURL:     resolveImageUrl(sorted[0]?.storage_path),
              authorName:   g.author?.display_name,
              authorPhoto:  g.author?.avatar_url,
            };
          });
        setGems(mapped);
        setLoading(false);
      });
  }, [collection.id]);

  const renderGem = ({ item: pin }) => {
    const cat = getCat(pin.category);
    return (
      <TouchableOpacity
        style={[styles.pinCard, { backgroundColor: t.surface }]}
        onPress={() => navigation.navigate('PinDetail', { pinId: pin.id, userId })}
        activeOpacity={0.85}
      >
        {pin.photoURL
          ? <Image source={{ uri: pin.photoURL }} style={styles.pinPhoto} resizeMode="cover" />
          : <View style={[styles.pinPhotoPlaceholder, { backgroundColor: t.surface2 }]}>
              <Ionicons name={cat.icon} size={24} color={cat.color} />
            </View>
        }
        <View style={styles.pinInfo}>
          <View style={[styles.catPill, { backgroundColor: cat.color + '18' }]}>
            <Ionicons name={cat.icon} size={10} color={cat.color} />
            <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <Text style={[styles.pinTitle, { color: t.text }]} numberOfLines={1}>{pin.title}</Text>
          {pin.note
            ? <Text style={[styles.pinNote, { color: t.muted }]} numberOfLines={1}>"{pin.note}"</Text>
            : null}
          {pin.locationName
            ? <View style={styles.locRow}>
                <Ionicons name="location-outline" size={11} color={t.muted} />
                <Text style={[styles.locText, { color: t.muted }]} numberOfLines={1}>{pin.locationName}</Text>
              </View>
            : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: t.bg }}>
        <View style={[styles.headerBar, { borderBottomColor: t.border }]}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: t.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={18} color={t.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
              {collection.name}
            </Text>
            <Text style={[styles.headerSub, { color: t.muted }]}>
              {gems.length} gem{gems.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ width: 34 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={gems}
          keyExtractor={item => item.id}
          renderItem={renderGem}
          contentContainerStyle={[styles.list, gems.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyGem}>✦</Text>
              <Text style={[styles.emptyText, { color: t.muted }]}>No gems in this collection yet</Text>
              <Text style={[styles.emptySub, { color: t.muted }]}>Save gems from the feed to add them here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },

  list: { padding: 16, gap: 10 },
  listEmpty: { flex: 1 },

  pinCard: {
    flexDirection: 'row', borderRadius: 14,
    overflow: 'hidden', gap: 12,
  },
  pinPhoto: { width: 80, height: 80 },
  pinPhotoPlaceholder: {
    width: 80, height: 80, alignItems: 'center', justifyContent: 'center',
  },
  pinInfo: { flex: 1, paddingVertical: 10, paddingRight: 12, gap: 4, justifyContent: 'center' },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  catPillText: { fontSize: 10, fontWeight: '600' },
  pinTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  pinNote: { fontSize: 12, fontStyle: 'italic' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locText: { fontSize: 11, flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyGem: { fontSize: 36, color: '#C4A882', marginBottom: 4 },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
