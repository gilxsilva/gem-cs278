import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ScrollView, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { getCat, CATEGORIES, THEMES } from '../constants';
import SaveToCollectionModal from '../components/SaveToCollectionModal';
import ReportModal from '../components/ReportModal';
import { shareGem } from '../services/share';

// Supports both Supabase storage paths and full external URLs (used in seed data)
function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl;
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


export default function FeedView({ navigation, user, theme }) {
  const [pins, setPins] = useState([]);
  const [saves, setSaves] = useState({});
  const [saveCounts, setSaveCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [feedMode, setFeedMode] = useState('discover'); // 'discover' | 'circle'
  const [followingIds, setFollowingIds] = useState(new Set());
  const [collectionModal, setCollectionModal] = useState({ visible: false, pin: null });
  const [reportModal, setReportModal] = useState({ visible: false, gemId: null });
  const [bookmarked, setBookmarked] = useState({});
  const flatListRef = useRef(null);
  const t = THEMES[theme];
  const isGuest = user.uid === 'guest';

  const scrollToTop = () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

  useEffect(() => {
    if (isGuest) return;
    loadFeed();
  }, [user.uid]);

  const loadFeed = useCallback(async () => {
    const [feedRes, followsRes] = await Promise.all([
      supabase.rpc('get_feed', { p_limit: 50, p_offset: 0 }),
      supabase.from('follows').select('following_id').eq('follower_id', user.uid),
    ]);
    const { data, error } = feedRes;
    if (error) { console.error('Feed error:', error.message, error.details, error.hint); return; }

    // Build the set of followed user IDs for circle filtering and social proof labels
    setFollowingIds(new Set((followsRes.data ?? []).map(r => r.following_id)));

    const mapped = (data ?? []).map(row => ({
      id:           row.gem_id,
      title:        row.title,
      note:         row.caption,
      category:     row.category,
      photoURL:     resolveImageUrl(row.images?.[0]?.storage_path),
      locationName: [row.place_name, row.place_city].filter(Boolean).join(', '),
      lat:          row.place_lat,
      lng:          row.place_lng,
      authorId:     row.author_id,
      authorName:   row.author_name,
      authorPhoto:  row.author_avatar,
      createdAt:    row.created_at,
      saveCount:    row.save_count,
      savedBy:      [],
    }));

    setPins(mapped);

    const newSaves  = {};
    const newCounts = {};
    (data ?? []).forEach(row => {
      newSaves[row.gem_id]  = row.is_saved;
      newCounts[row.gem_id] = row.save_count;
    });
    setSaves(newSaves);
    setSaveCounts(newCounts);

    await refreshCommentCounts(mapped.map(p => p.id));
  }, [refreshCommentCounts]);

  const refreshCommentCounts = useCallback(async (gemIds) => {
    if (!gemIds.length) return;
    const { data: commentRows } = await supabase
      .from('comments')
      .select('gem_id')
      .in('gem_id', gemIds);
    const counts = {};
    (commentRows ?? []).forEach(r => {
      counts[r.gem_id] = (counts[r.gem_id] ?? 0) + 1;
    });
    setCommentCounts(counts);
  }, []);

useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      loadFeed();
    }, [isGuest, loadFeed])
  );

  const toggleSave = async (pin) => {
    const isSaved = saves[pin.id];
    setSaves(prev => ({ ...prev, [pin.id]: !isSaved }));
    setSaveCounts(prev => ({ ...prev, [pin.id]: (prev[pin.id] ?? 0) + (isSaved ? -1 : 1) }));

    if (!isGuest) {
      if (isSaved) {
        await supabase.from('saves').delete().eq('user_id', user.uid).eq('gem_id', pin.id);
      } else {
        await supabase.from('saves').upsert({ user_id: user.uid, gem_id: pin.id });
      }
    }
  };

  const deletePin = (pin) => {
    Alert.alert(
      'Delete gem',
      'This will permanently remove your gem. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('gems')
              .delete()
              .eq('id', pin.id)
              .eq('author_id', user.uid);
            if (error) { Alert.alert('Could not delete', error.message); return; }
            setPins(prev => prev.filter(p => p.id !== pin.id));
          },
        },
      ]
    );
  };

  const reportPin = (pin) => {
    setReportModal({ visible: true, gemId: pin.id });
  };

  const sharePin = (pin) => shareGem(pin);

  // Circle mode: only show gems from followed users
  const feedPins = feedMode === 'circle'
    ? pins.filter(p => followingIds.has(p.authorId))
    : pins;

  const filteredPins = activeFilter === 'all'
    ? feedPins
    : feedPins.filter(p => p.category === activeFilter);

  const trendingGems = [...pins]
    .sort((a, b) => (saveCounts[b.id] ?? 0) - (saveCounts[a.id] ?? 0))
    .slice(0, 5)
    .filter(p => (saveCounts[p.id] ?? 0) > 0);


  const renderTrendingGem = (pin) => {
    const cat = getCat(pin.category);
    return (
      <TouchableOpacity
        key={pin.id}
        style={[styles.trendCard, { backgroundColor: t.surface }]}
        onPress={() => navigation.navigate('PinDetail', { pinId: pin.id, userId: user.uid })}
        activeOpacity={0.85}
      >
        {pin.photoURL
          ? <Image source={{ uri: pin.photoURL }} style={styles.trendCardPhoto} />
          : <View style={[styles.trendCardPhotoPlaceholder, { backgroundColor: t.surface2 }]}>
              <Ionicons name={cat.icon} size={22} color={cat.color} />
            </View>
        }
        <View style={styles.trendCatBadgeWrap}>
          <View style={[styles.trendCatBadge, { backgroundColor: cat.color + 'CC' }]}>
            <Ionicons name={cat.icon} size={9} color="#fff" />
          </View>
        </View>
        <View style={styles.trendCardBody}>
          <Text style={[styles.trendCardTitle, { color: t.text }]} numberOfLines={1}>{pin.title}</Text>
          <View style={styles.trendCardFooter}>
            <Text style={[styles.trendCardCount, { color: t.muted }]}>
              {saveCounts[pin.id]} saved
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPin = ({ item: pin }) => {
    const cat = getCat(pin.category);
    const isSaved = saves[pin.id] ?? false;
    const count = saveCounts[pin.id] ?? 0;
    const firstName = pin.authorName?.split(' ')[0] ?? 'Someone';

    return (
      <View style={[styles.card, { backgroundColor: t.bg, borderBottomColor: t.border }]}>

        {/* Header: avatar · narrative · category sticker */}
        <View style={styles.cardHeader}>
          <Pressable onPress={() => navigation.navigate('Profile', {
            user: { uid: pin.authorId, displayName: pin.authorName, photoURL: pin.authorPhoto },
            isOwnProfile: pin.authorId === user.uid,
          })}>
            {pin.authorPhoto
              ? <Image source={{ uri: pin.authorPhoto }} style={styles.authorAvatar} />
              : <View style={[styles.authorAvatarFallback, { backgroundColor: t.surface }]}>
                  <Ionicons name="person" size={18} color={t.muted} />
                </View>
            }
          </Pressable>

          <View style={styles.narrativeWrap}>
            <Text style={[styles.narrativeLine, { color: t.text }]}>
              <Text
                style={styles.narrativeBold}
                onPress={() => navigation.navigate('Profile', {
                  user: { uid: pin.authorId, displayName: pin.authorName, photoURL: pin.authorPhoto },
                  isOwnProfile: pin.authorId === user.uid,
                })}
              >{firstName} </Text>
              {'found '}
              <Text
                style={styles.narrativeBold}
                onPress={() => navigation.navigate('PinDetail', { pinId: pin.id, userId: user.uid })}
              >{pin.title}</Text>
            </Text>
            <View style={styles.timestampRow}>
              <Text style={[styles.cardTimestamp, { color: t.muted }]}>{timeAgo(pin.createdAt)}</Text>
              {feedMode === 'discover' && !isGuest && followingIds.has(pin.authorId) && (
                <View style={[styles.circleBadge, { backgroundColor: t.accent + '18' }]}>
                  <Ionicons name="people-outline" size={9} color={t.accent} />
                  <Text style={[styles.circleBadgeText, { color: t.accent }]}>circle</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            <TouchableOpacity
              style={[styles.catSticker, { backgroundColor: cat.color + '20' }]}
              onPress={() => navigation.navigate('Profile', {
                user: { uid: pin.authorId, displayName: pin.authorName, photoURL: pin.authorPhoto },
                isOwnProfile: pin.authorId === user.uid,
              })}
              activeOpacity={0.75}
            >
              <Ionicons name={cat.icon} size={16} color={cat.color} />
            </TouchableOpacity>
            {!isGuest && pin.authorId === user.uid && (
              <TouchableOpacity onPress={() => deletePin(pin)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color={t.muted} />
              </TouchableOpacity>
            )}
            {!isGuest && pin.authorId !== user.uid && (
              <TouchableOpacity onPress={() => reportPin(pin)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color={t.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Photo (left) + Location (right) */}
        {(pin.photoURL || pin.locationName) ? (
          <View style={styles.mediaRow}>
            {pin.photoURL && (
              <TouchableOpacity
                onPress={() => navigation.navigate('PinDetail', { pinId: pin.id, userId: user.uid })}
                activeOpacity={0.88}
              >
                <Image source={{ uri: pin.photoURL }} style={styles.thumbnail} />
              </TouchableOpacity>
            )}
            {pin.locationName && (
              <View style={[styles.locationBlock, !pin.photoURL && { paddingLeft: 0 }]}>
                <Ionicons name="location-outline" size={18} color={t.muted} style={{ marginTop: 1 }} />
                <Text style={[styles.locationText, { color: t.text }]}>{pin.locationName}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Note */}
        {pin.note ? (
          <Text style={[styles.noteText, { color: t.text }]}>
            <Text style={{ color: t.muted }}>Notes: </Text>
            {pin.note}
          </Text>
        ) : null}

        {/* Action bar */}
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity style={styles.actionIcon} onPress={() => toggleSave(pin)} activeOpacity={0.7}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={23} color={isSaved ? '#C0505A' : t.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionIcon, styles.actionWithCount]}
              onPress={() => navigation.navigate('PostComments', { pin, userId: user.uid })}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={22} color={t.muted} />
              {(commentCounts[pin.id] ?? 0) > 0 && (
                <Text style={[styles.actionCountText, { color: t.muted }]}>
                  {commentCounts[pin.id]}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7} onPress={() => sharePin(pin)}>
              <Ionicons name="arrow-redo-outline" size={22} color={t.muted} />
            </TouchableOpacity>
          </View>
          <View style={styles.actionsRight}>
            {count > 0 && (
              <TouchableOpacity
                style={[styles.countPill, { backgroundColor: t.accent }]}
                onPress={() => toggleSave(pin)}
                activeOpacity={0.8}
              >
                <Text style={styles.countPillText}>+{count}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setCollectionModal({ visible: true, pin })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={bookmarked[pin.id] ? 'bookmark' : 'bookmark-outline'}
                size={23}
                color={bookmarked[pin.id] ? t.accent : t.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    trendingGems.length > 0 && feedMode === 'discover' ? (
      <View style={styles.trendSection}>
        <View style={styles.trendSectionHeader}>
          <Text style={styles.trendStar}>✦</Text>
          <Text style={[styles.trendSectionTitle, { color: t.text }]}>Trending gems</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendScroll}
        >
          {trendingGems.map(renderTrendingGem)}
        </ScrollView>
        <View style={[styles.divider, { backgroundColor: t.border }]} />
      </View>
    ) : null
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: t.bg }}>
        <View style={styles.header}>
          {/* Logo — tap scrolls feed to top */}
          <TouchableOpacity onPress={scrollToTop} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
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
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: t.accent }]}
              onPress={() => navigation.navigate('AddPin')}
            >
              <Ionicons name="add" size={20} color="#FAF7F2" />
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

        {/* Single unified filter row: mode chips → divider → category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Source mode: Discover */}
          <TouchableOpacity
            style={[styles.filterChip, feedMode === 'discover' && { backgroundColor: t.accent }]}
            onPress={() => setFeedMode('discover')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, { color: feedMode === 'discover' ? '#FAF7F2' : t.muted }]}>
              Discover
            </Text>
          </TouchableOpacity>

          {/* Source mode: Your circle */}
          <TouchableOpacity
            style={[styles.filterChip, feedMode === 'circle' && { backgroundColor: t.accent }]}
            onPress={() => setFeedMode('circle')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={12} color={feedMode === 'circle' ? '#FAF7F2' : t.muted} />
            <Text style={[styles.filterChipText, { color: feedMode === 'circle' ? '#FAF7F2' : t.muted }]}>
              Circle
            </Text>
          </TouchableOpacity>

          {/* Divider separating source from category */}
          <View style={[styles.filterDivider, { backgroundColor: t.border }]} />

          {/* Category: All */}
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && { backgroundColor: t.accent }]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, { color: activeFilter === 'all' ? '#FAF7F2' : t.muted }]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.filterChip, activeFilter === c.id && { backgroundColor: t.accent }]}
              onPress={() => setActiveFilter(c.id)}
            >
              <Ionicons
                name={c.icon}
                size={12}
                color={activeFilter === c.id ? '#FAF7F2' : c.color}
              />
              <Text style={[styles.filterChipText, { color: activeFilter === c.id ? '#FAF7F2' : t.muted }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={filteredPins}
        keyExtractor={item => item.id}
        renderItem={renderPin}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.list, filteredPins.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); }}
            tintColor={t.muted}
          />
        }
        ListEmptyComponent={
          feedMode === 'circle' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGem}>✦</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                {followingIds.size === 0
                  ? 'Follow people to see their gems here'
                  : 'Your circle hasn\'t shared any gems yet'}
              </Text>
              <Text style={[styles.emptySub, { color: t.muted }]}>
                {followingIds.size === 0
                  ? 'Find people whose taste you trust and follow them'
                  : 'Check back soon, or explore Discover'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGem}>✦</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>No gems here yet</Text>
              <Text style={[styles.emptySub, { color: t.muted }]}>Be the first to leave one</Text>
            </View>
          )
        }
      />

      <SaveToCollectionModal
        visible={collectionModal.visible}
        pin={collectionModal.pin}
        userId={user.uid}
        onClose={() => setCollectionModal(prev => ({ ...prev, visible: false }))}
        onSave={(pinId, ids) => setBookmarked(prev => ({ ...prev, [pinId]: ids.length > 0 }))}
      />

      <ReportModal
        visible={reportModal.visible}
        gemId={reportModal.gemId}
        userId={user.uid}
        onClose={() => setReportModal({ visible: false, gemId: null })}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    gap: 10,
  },
  wordmark: { width: 32, height: 32, borderRadius: 8 },
  // Search pill — the primary discovery affordance
  searchPill: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchPillText: {
    fontSize: 13, fontWeight: '400', flex: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 36, height: 36 },

  // Inline timestamp + circle badge row
  timestampRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3,
  },
  circleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100,
  },
  circleBadgeText: { fontSize: 10, fontWeight: '700' },

  // Divider between mode chips and category chips
  filterDivider: { width: 1, height: 20, alignSelf: 'center', marginHorizontal: 2 },

  filterScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, backgroundColor: 'rgba(28,23,20,0.06)',
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  list: { paddingTop: 4, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  trendSection: { paddingBottom: 16, paddingHorizontal: 16 },
  trendSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  trendStar: { fontSize: 14, color: '#C4A882' },
  trendSectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  trendScroll: { gap: 12, paddingRight: 2 },
  trendCard: {
    width: 160, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#1C1714', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  trendCardPhoto: { width: '100%', height: 110 },
  trendCardPhotoPlaceholder: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
  trendCatBadgeWrap: { position: 'absolute', top: 8, right: 8 },
  trendCatBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trendCardBody: { padding: 10, gap: 6 },
  trendCardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  trendCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendCardCount: { fontSize: 11 },
  saverAvatars: { flexDirection: 'row' },
  saverAvatar: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#FAF7F2' },

  divider: { height: 1, marginTop: 4 },

  card: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12,
  },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22 },
  authorAvatarFallback: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  narrativeWrap: { flex: 1 },
  narrativeLine: { fontSize: 14, lineHeight: 20 },
  narrativeBold: { fontWeight: '700' },
  narrativeMuted: { fontWeight: '400' },
  cardTimestamp: { fontSize: 12, marginTop: 3 },
  catSticker: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },

  mediaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  thumbnail: { width: 130, height: 110, borderRadius: 10 },
  locationBlock: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 2,
  },
  locationText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  noteText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },

  actionsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { padding: 6 },
  actionWithCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionCountText: { fontSize: 13, fontWeight: '600' },
  countPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  countPillText: { fontSize: 13, fontWeight: '700', color: '#FAF7F2' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyGem: { fontSize: 40, color: '#C4A882', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
