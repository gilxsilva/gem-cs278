import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, Share, Modal, TextInput, Switch, Pressable,
  RefreshControl, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { getCat, THEMES } from '../constants';
import SaveToCollectionModal from '../components/SaveToCollectionModal';

function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl;
}

const NAVY    = '#0D1F3C';
const MUTED_C = 'rgba(28,23,20,0.38)';

// Cycling accent palette for taste tag chips — gives each tag a unique personality
const TAG_COLORS = [
  '#7A9FC2', '#B8956A', '#A98BBE', '#C4828A',
  '#8A9BBE', '#3A7D44', '#C4A882', '#8B6E9A',
];

// ─────────────────────────────────────────────────────────────────────────────
// EditCollectionModal — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
function EditCollectionModal({ collection: coll, onSave, onDelete, onClose }) {
  const [name, setName] = useState(coll?.name ?? '');
  const [isPublic, setIsPublic] = useState(coll?.visibility === 'public');
  useEffect(() => {
    if (coll) {
      setName(coll.name);
      setIsPublic(coll.visibility === 'public');
    }
  }, [coll?.id]);

  const visibility = isPublic ? 'public' : 'private';

  const handleDelete = () => {
    Alert.alert(
      'Delete collection',
      `Delete "${coll.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(coll.id) },
      ]
    );
  };

  return (
    <Modal visible={!!coll} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={eStyles.backdrop} onPress={onClose} />
      <View style={eStyles.sheet}>
        <View style={eStyles.handle} />
        <Text style={eStyles.title}>Edit collection</Text>

        <View style={eStyles.section}>
          <Text style={eStyles.sectionLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={eStyles.input}
            placeholderTextColor={MUTED_C}
            returnKeyType="done"
          />
        </View>

        <View style={eStyles.section}>
          <View style={eStyles.divider} />
          <View style={eStyles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={eStyles.optionTitle}>Make public</Text>
              <Text style={eStyles.optionSub}>Show on your profile.</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: 'rgba(28,23,20,0.12)', true: NAVY }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <TouchableOpacity style={eStyles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={15} color="#C0392B" />
          <Text style={eStyles.deleteBtnText}>Delete collection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[eStyles.saveBtn, !name.trim() && { opacity: 0.38 }]}
          onPress={() => name.trim() && onSave({ ...coll, name: name.trim(), visibility })}
          disabled={!name.trim()}
          activeOpacity={0.85}
        >
          <Text style={eStyles.saveBtnText}>Save changes</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditProfileModal — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
function EditProfileModal({ visible, profileData, userId, onSave, onClose }) {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState('');
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [newAvatarUri, setNewAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(profileData.display_name ?? '');
      setHandle(profileData.handle ?? '');
      setHandleError('');
      setBio(profileData.bio ?? '');
      setTagline(profileData.taste_tagline ?? '');
      setTags(profileData.taste_tags ?? []);
      setTagInput('');
      setNewAvatarUri(null);
    }
  }, [visible]);

  const onHandleChange = (text) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setHandle(cleaned);
    setHandleError('');
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setNewAvatarUri(result.assets[0].uri);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    if (handle && handle !== profileData.handle) {
      const { data: taken } = await supabase
        .from('profiles').select('id').eq('handle', handle).neq('id', userId).maybeSingle();
      if (taken) { setHandleError('That username is already taken'); return; }
    }
    setSaving(true);
    try {
      let finalAvatarUrl = profileData.avatar_url;

      if (newAvatarUri) {
        const path = `avatars/${userId}.jpg`;
        const arrayBuffer = await fetch(newAvatarUri).then(r => r.arrayBuffer());
        const { error: uploadError } = await supabase.storage
          .from('gem-images')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) {
          Alert.alert('Photo upload failed', uploadError.message);
        } else {
          finalAvatarUrl = supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl
            + `?t=${Date.now()}`;
        }
      }

      const updates = {
        display_name:   displayName.trim(),
        handle:         handle.trim() || null,
        bio:            bio.trim() || null,
        taste_tagline:  tagline.trim() || null,
        taste_tags:     tags,
        avatar_url:     finalAvatarUrl,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) onSave(data);
    } catch (_) {}
    setSaving(false);
  };

  const avatarSource = newAvatarUri ?? profileData.avatar_url ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={epStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={epStyles.kavWrapper}
      >
        <View style={epStyles.sheet}>
          <View style={epStyles.handle} />
          <Text style={epStyles.title}>Edit profile</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={epStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
              {avatarSource
                ? <Image source={{ uri: avatarSource }} style={epStyles.avatar} />
                : <View style={epStyles.avatarFallback}>
                    <Ionicons name="person" size={30} color={MUTED_C} />
                  </View>
              }
              <View style={epStyles.avatarBadge}>
                <Ionicons name="camera-outline" size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={epStyles.fieldLabel}>Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={epStyles.input}
              placeholderTextColor={MUTED_C}
              placeholder="Your name"
              returnKeyType="next"
            />

            <Text style={epStyles.fieldLabel}>Username</Text>
            <View style={epStyles.handleInputRow}>
              <Text style={epStyles.handleAt}>@</Text>
              <TextInput
                value={handle}
                onChangeText={onHandleChange}
                style={[epStyles.input, { flex: 1, marginBottom: 0 }]}
                placeholderTextColor={MUTED_C}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            {handleError ? <Text style={epStyles.handleError}>{handleError}</Text> : null}
            <View style={{ height: 12 }} />

            <Text style={epStyles.fieldLabel}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[epStyles.input, epStyles.inputMulti]}
              placeholderTextColor={MUTED_C}
              placeholder="What are you into?"
              multiline
              numberOfLines={3}
            />

            <Text style={epStyles.fieldLabel}>Taste tagline</Text>
            <TextInput
              value={tagline}
              onChangeText={setTagline}
              style={epStyles.input}
              placeholderTextColor={MUTED_C}
              placeholder="quiet corners, strong coffee"
              returnKeyType="done"
            />

            <Text style={epStyles.fieldLabel}>Taste tags <Text style={epStyles.fieldHint}>({tags.length}/8)</Text></Text>
            {tags.length > 0 && (
              <View style={epStyles.tagsWrap}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={epStyles.tagChip}
                    onPress={() => setTags(prev => prev.filter(t => t !== tag))}
                    activeOpacity={0.75}
                  >
                    <Text style={epStyles.tagChipText}>{tag}</Text>
                    <Ionicons name="close" size={11} color={NAVY} style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {tags.length < 8 && (
              <View style={epStyles.tagInputRow}>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  style={[epStyles.input, { flex: 1, marginBottom: 0 }]}
                  placeholderTextColor={MUTED_C}
                  placeholder="Add a tag…"
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                <TouchableOpacity style={epStyles.tagAddBtn} onPress={addTag} activeOpacity={0.8}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <TouchableOpacity
            style={[epStyles.saveBtn, (!displayName.trim() || saving) && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={!displayName.trim() || saving}
            activeOpacity={0.85}
          >
            <Text style={epStyles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const EMPTY_PROFILE = {
  display_name: null, handle: null, avatar_url: null,
  bio: null, taste_tags: [], taste_tagline: null,
  follower_count: 0, following_count: 0, gem_count: 0,
};

const isGuest = uid => uid === 'guest';

// ─────────────────────────────────────────────────────────────────────────────
// FollowListModal — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
function FollowListModal({ visible, type, userId, onClose, onNavigate, t }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    setUsers([]);
    (async () => {
      const col = type === 'followers' ? 'follower_id' : 'following_id';
      const filter = type === 'followers' ? 'following_id' : 'follower_id';
      const { data: rows } = await supabase.from('follows').select(col).eq(filter, userId);
      const ids = (rows ?? []).map(r => r[col]);
      if (!ids.length) { setLoading(false); return; }
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name, avatar_url, handle').in('id', ids);
      setUsers(profiles ?? []);
      setLoading(false);
    })();
  }, [visible, userId, type]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={flStyles.backdrop} onPress={onClose} />
      <View style={flStyles.sheet}>
        <View style={flStyles.handle} />
        <View style={flStyles.header}>
          <Text style={flStyles.title}>{type === 'followers' ? 'Followers' : 'Following'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={NAVY} />
        ) : users.length === 0 ? (
          <Text style={flStyles.empty}>No {type} yet</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {users.map(u => (
              <TouchableOpacity
                key={u.id}
                style={flStyles.row}
                onPress={() => { onClose(); onNavigate(u); }}
                activeOpacity={0.75}
              >
                {u.avatar_url
                  ? <Image source={{ uri: u.avatar_url }} style={flStyles.avatar} />
                  : <View style={[flStyles.avatarFallback, { backgroundColor: t.surface }]}>
                      <Ionicons name="person" size={16} color={t.muted} />
                    </View>
                }
                <View style={flStyles.rowBody}>
                  <Text style={[flStyles.name, { color: t.text }]}>{u.display_name}</Text>
                  {u.handle ? <Text style={[flStyles.handleText, { color: t.muted }]}>@{u.handle}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={t.muted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────
export default function Profile({ navigation, route, theme, onProfileUpdate }) {
  const { user, isOwnProfile = false } = route.params;
  const [profileData, setProfileData] = useState(EMPTY_PROFILE);
  const [pins, setPins] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followListModal, setFollowListModal] = useState({ visible: false, type: 'followers' });
  const [viewerId, setViewerId] = useState(null);
  const [userCollections, setUserCollections] = useState([]);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = THEMES[theme];

  const displayName = profileData.display_name ?? user.displayName ?? 'User';
  const firstName   = displayName.split(' ')[0];
  const handle      = profileData.handle ? `@${profileData.handle}` : `@${user.displayName?.toLowerCase().replace(/\s/g, '') ?? 'user'}`;
  const avatarUrl   = profileData.avatar_url ?? user.photoURL ?? null;

  // Derived: top gem categories from existing pins data — no extra API call
  const topCats = useMemo(() => {
    if (pins.length < 3) return [];
    const counts = {};
    pins.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => getCat(id));
  }, [pins]);

  // Derived: join year from profile created_at
  const joinYear = profileData.created_at
    ? new Date(profileData.created_at).getFullYear()
    : null;

  // ── Data loading (UNCHANGED) ─────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (isGuest(user.uid)) {
      setPins([]);
      setUserCollections([]);
      return;
    }

    const [profileRes, gemsRes, collectionsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.uid).single(),
      supabase
        .from('gems')
        .select('*, places(name, city, latitude, longitude), gem_images(storage_path, order_index)')
        .eq('author_id', user.uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('collections')
        .select('*')
        .eq('owner_id', user.uid)
        .order('created_at', { ascending: false }),
    ]);

    if (profileRes.data) setProfileData(profileRes.data);

    if (gemsRes.data) {
      const mapped = gemsRes.data.map(g => {
        const sortedImages = (g.gem_images ?? []).sort((a, b) => a.order_index - b.order_index);
        const firstImage = sortedImages[0]?.storage_path ?? null;
        return {
          id:           g.id,
          title:        g.title,
          note:         g.caption,
          category:     g.category,
          locationName: [g.places?.name, g.places?.city].filter(Boolean).join(', '),
          photoURL:     resolveImageUrl(firstImage),
          authorId:     g.author_id,
          latitude:     g.places?.latitude,
          longitude:    g.places?.longitude,
        };
      });
      setPins(mapped);
    }

    if (collectionsRes.data) {
      const mapped = collectionsRes.data.map(c => ({
        id:         c.id,
        name:       c.name,
        icon:       c.icon ?? 'bookmark-outline',
        color:      c.color ?? NAVY,
        count:      c.item_count ?? 0,
        visibility: c.visibility,
      }));
      setUserCollections(mapped);
    }

    const [followerRes, followingRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.uid),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.uid),
    ]);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);

    if (!isOwnProfile && viewerId && viewerId !== user.uid) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', user.uid)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }
  }, [user.uid, isOwnProfile, viewerId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setViewerId(u?.id ?? null));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Handlers (UNCHANGED) ─────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!viewerId || viewerId === user.uid) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount(prev => Math.max(0, prev + (next ? 1 : -1)));
    let error;
    if (next) {
      ({ error } = await supabase.from('follows').insert({ follower_id: viewerId, following_id: user.uid }));
    } else {
      ({ error } = await supabase.from('follows').delete().eq('follower_id', viewerId).eq('following_id', user.uid));
    }
    if (error) {
      setIsFollowing(!next);
      setFollowerCount(prev => Math.max(0, prev + (next ? -1 : 1)));
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleSaveCollection = (updated) => {
    setUserCollections(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingCollection(null);
  };

  const handleDeleteCollection = (id) => {
    setUserCollections(prev => prev.filter(c => c.id !== id));
    setEditingCollection(null);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${firstName}'s gems on Gem — hidden spots, study places, and memories worth remembering.\n\nGem helps you discover meaningful places saved by real people.`,
      });
    } catch (_) {
      Alert.alert("Couldn't share", "Couldn't open sharing right now. Please try again.");
    }
  };

  // Page and card background derived from theme
  const pageBg = theme === 'dark' ? t.bg      : '#FAF7F2';
  const cardBg = theme === 'dark' ? t.surface : '#FFFFFF';

  // Latest gem = most recent pin — no extra API call
  const featuredPin = pins[0] ?? null;

  // ── List header ──────────────────────────────────────────────────────────
  const ListHeader = () => (
    <>
      {/* ── Hero Card: LEFT-ALIGNED avatar layout ──────────────────── */}
      <View style={[styles.heroCard, { backgroundColor: cardBg }]}>

        {/* Top row: avatar LEFT + identity block RIGHT — key layout departure */}
        <View style={styles.heroTopRow}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.heroAvatar} />
            : <View style={[styles.heroAvatarFallback, { backgroundColor: t.surface2 }]}>
                <Ionicons name="person" size={28} color={t.muted} />
              </View>
          }
          <View style={styles.heroIdentity}>
            <Text style={[styles.heroName, { color: t.text }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.heroHandle, { color: t.muted }]}>{handle}</Text>
            {profileData.taste_tagline ? (
              <View style={[styles.taglineBadge, { backgroundColor: t.surface }]}>
                <Text style={[styles.taglineText, { color: t.muted }]}>✦ {profileData.taste_tagline}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {profileData.bio ? (
          <Text style={[styles.heroBio, { color: t.muted }]}>{profileData.bio}</Text>
        ) : null}

        {/* Stats — inside the card, horizontal dividers */}
        <View style={[styles.heroStats, { borderColor: t.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: t.text }]}>{pins.length}</Text>
            <Text style={[styles.statLabel, { color: t.muted }]}>gems</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.border }]} />
          <TouchableOpacity style={styles.stat} onPress={() => setFollowListModal({ visible: true, type: 'followers' })} activeOpacity={0.7}>
            <Text style={[styles.statNum, { color: t.text }]}>{followerCount}</Text>
            <Text style={[styles.statLabel, { color: t.muted }]}>followers</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: t.border }]} />
          <TouchableOpacity style={styles.stat} onPress={() => setFollowListModal({ visible: true, type: 'following' })} activeOpacity={0.7}>
            <Text style={[styles.statNum, { color: t.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: t.muted }]}>following</Text>
          </TouchableOpacity>
        </View>

        {/* Actions — at the bottom of the hero card */}
        <View style={styles.heroActions}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: t.border }]}
                activeOpacity={0.8}
                onPress={() => setEditProfileOpen(true)}
              >
                <Ionicons name="create-outline" size={14} color={t.text} />
                <Text style={[styles.editBtnText, { color: t.text }]}>Edit profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: t.surface }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={17} color={t.text} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.border }]}
                onPress={toggleFollow}
                activeOpacity={0.82}
              >
                {isFollowing && <Ionicons name="checkmark" size={14} color={NAVY} style={{ marginRight: 5 }} />}
                <Text style={[styles.followBtnText, isFollowing && { color: NAVY }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: t.surface }]} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={17} color={t.text} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Join year — subtle, inside the card at the very bottom */}
        {joinYear ? (
          <Text style={[styles.joinDate, { color: t.muted }]}>on gem since {joinYear}</Text>
        ) : null}
      </View>

      {/* ── Taste Snapshot Card ────────────────────────────────── */}
      {(profileData.taste_tags?.length > 0 || topCats.length > 0) ? (
        <View style={[styles.tasteCard, { backgroundColor: cardBg }]}>
          <View style={styles.tasteTitleRow}>
            <Text style={[styles.tasteCardTitle, { color: t.text }]}>taste snapshot</Text>
            <Text style={[styles.tasteStar, { color: t.muted }]}>✦</Text>
          </View>

          {profileData.taste_tags?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tasteScroll}>
              {profileData.taste_tags.map((tag, i) => {
                const accent = TAG_COLORS[i % TAG_COLORS.length];
                return (
                  <View key={tag} style={[styles.tasteTag, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
                    <Text style={[styles.tasteTagText, { color: accent }]}>{tag}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {topCats.length > 0 && (
            <View style={styles.topCatRow}>
              <Text style={[styles.topCatLabel, { color: t.muted }]}>usually saves</Text>
              <View style={styles.topCatChips}>
                {topCats.map(cat => (
                  <View key={cat.id} style={[styles.topCatChip, { backgroundColor: cat.color + '14' }]}>
                    <Ionicons name={cat.icon} size={11} color={cat.color} />
                    <Text style={[styles.topCatChipText, { color: cat.color }]}>{cat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* ── Latest Gem featured card ───────────────────────────── */}
      {(featuredPin || isOwnProfile) ? (
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionMicrolabel, { color: t.muted }]}>LATEST GEM</Text>
          {featuredPin ? (
            <TouchableOpacity
              style={[styles.featuredCard, { backgroundColor: cardBg }]}
              onPress={() => navigation.navigate('PinDetail', { pinId: featuredPin.id, userId: user.uid })}
              activeOpacity={0.88}
            >
              {featuredPin.photoURL
                ? <Image source={{ uri: featuredPin.photoURL }} style={styles.featuredPhoto} resizeMode="cover" />
                : <View style={[styles.featuredPhotoPlaceholder, { backgroundColor: getCat(featuredPin.category).color + '18' }]}>
                    <Ionicons name={getCat(featuredPin.category).icon} size={44} color={getCat(featuredPin.category).color + '60'} />
                  </View>
              }
              <View style={styles.featuredBody}>
                <View style={[styles.catPill, { backgroundColor: getCat(featuredPin.category).color + '18' }]}>
                  <Ionicons name={getCat(featuredPin.category).icon} size={10} color={getCat(featuredPin.category).color} />
                  <Text style={[styles.catPillText, { color: getCat(featuredPin.category).color }]}>{getCat(featuredPin.category).label}</Text>
                </View>
                <Text style={[styles.featuredTitle, { color: t.text }]} numberOfLines={2}>{featuredPin.title}</Text>
                {featuredPin.note ? (
                  <Text style={[styles.featuredNote, { color: t.muted }]} numberOfLines={2}>"{featuredPin.note}"</Text>
                ) : null}
                {featuredPin.locationName ? (
                  <View style={styles.featuredLoc}>
                    <Ionicons name="location-outline" size={12} color={t.muted} />
                    <Text style={[styles.featuredLocText, { color: t.muted }]} numberOfLines={1}>{featuredPin.locationName}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.emptyGemCard, { borderColor: t.border }]}>
              <Text style={styles.emptyGemGlyph}>✦</Text>
              <Text style={[styles.emptyGemTitle, { color: t.muted }]}>No gems yet</Text>
              {isOwnProfile && <Text style={[styles.emptyGemSub, { color: t.muted }]}>Tap + to leave your first gem</Text>}
            </View>
          )}
        </View>
      ) : null}

      {/* ── Curated Collections ───────────────────────────────── */}
      {(isOwnProfile || userCollections.length > 0) ? (
        <View style={styles.collectionsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionMicrolabel, { color: t.muted }]}>CURATED COLLECTIONS</Text>
            {userCollections.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: t.surface }]}>
                <Text style={[styles.countBadgeText, { color: t.muted }]}>{userCollections.length}</Text>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionsScroll}>
            {userCollections.map(coll => (
              <View key={coll.id} style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={[styles.collCard, { backgroundColor: cardBg }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('CollectionDetail', { collection: coll, userId: user.uid })}
                >
                  <View style={[styles.collIconWrap, { backgroundColor: (coll.color ?? NAVY) + '16' }]}>
                    <Ionicons name={coll.icon ?? 'bookmark-outline'} size={20} color={coll.color ?? NAVY} />
                  </View>
                  <Text style={[styles.collName, { color: t.text }]} numberOfLines={2}>{coll.name}</Text>
                  <View style={styles.collFooter}>
                    <Text style={[styles.collCount, { color: t.muted }]}>{coll.count} {coll.count === 1 ? 'gem' : 'gems'}</Text>
                    {coll.visibility === 'public' && (
                      <View style={styles.visBadge}><Text style={styles.visBadgeText}>public</Text></View>
                    )}
                    {coll.visibility === 'shared' && (
                      <View style={styles.sharedDot}><Ionicons name="people-outline" size={9} color={NAVY} /></View>
                    )}
                  </View>
                </TouchableOpacity>
                {isOwnProfile && (
                  <TouchableOpacity
                    style={styles.collEditIcon}
                    onPress={() => setEditingCollection(coll)}
                    hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  >
                    <Ionicons name="pencil" size={10} color={t.muted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isOwnProfile && (
              <TouchableOpacity
                style={[styles.collCardNew, { borderColor: t.border }]}
                onPress={() => setCollectionModalOpen(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.collNewPlus, { backgroundColor: t.surface2 }]}>
                  <Ionicons name="add" size={20} color={t.muted} />
                </View>
                <Text style={[styles.collNewLabel, { color: t.muted }]}>New</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Places Shared section header ──────────────────────── */}
      {pins.length > 0 && (
        <View style={[styles.gemsSectionHeader, { borderTopColor: t.border }]}>
          <Text style={[styles.gemsSectionTitle, { color: t.text }]}>
            {isOwnProfile ? 'places shared' : `${firstName}'s places`}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: t.surface }]}>
            <Text style={[styles.countBadgeText, { color: t.muted }]}>{pins.length}</Text>
          </View>
        </View>
      )}
    </>
  );

  // ── Empty state (no gems at all) ─────────────────────────────────────────
  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyGemGlyph}>✦</Text>
      <Text style={[styles.emptyText, { color: t.muted }]}>No gems yet</Text>
    </View>
  );

  // ── Pin card ─────────────────────────────────────────────────────────────
  const renderPin = ({ item: pin }) => {
    const cat = getCat(pin.category);
    return (
      <TouchableOpacity
        style={[styles.pinCard, { backgroundColor: cardBg }]}
        onPress={() => navigation.navigate('PinDetail', { pinId: pin.id, userId: user.uid })}
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
          {pin.note ? <Text style={[styles.pinNote, { color: t.muted }]} numberOfLines={1}>"{pin.note}"</Text> : null}
          {pin.locationName ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={11} color={t.muted} />
              <Text style={[styles.locText, { color: t.muted }]} numberOfLines={1}>{pin.locationName}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: pageBg }}>
        {/* Nav: back (left) + settings (right). No centered title — hero card makes context clear. */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: t.surface }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={t.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isOwnProfile
            ? <TouchableOpacity style={[styles.navBtn, { backgroundColor: t.surface }]} onPress={() => navigation.navigate('Settings')}>
                <Ionicons name="settings-outline" size={17} color={t.muted} />
              </TouchableOpacity>
            : <View style={{ width: 34 }} />
          }
        </View>
      </SafeAreaView>

      <FlatList
        data={pins}
        keyExtractor={item => item.id}
        renderItem={renderPin}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.muted} />}
      />

      <SaveToCollectionModal
        visible={collectionModalOpen}
        pin={null}
        onClose={() => setCollectionModalOpen(false)}
        onCollectionCreated={coll => setUserCollections(prev => [...prev, coll])}
      />
      <EditCollectionModal
        collection={editingCollection}
        onSave={handleSaveCollection}
        onDelete={handleDeleteCollection}
        onClose={() => setEditingCollection(null)}
      />
      <EditProfileModal
        visible={editProfileOpen}
        profileData={profileData}
        userId={user.uid}
        onSave={updated => { setProfileData(updated); setEditProfileOpen(false); onProfileUpdate?.(); }}
        onClose={() => setEditProfileOpen(false)}
      />
      <FollowListModal
        visible={followListModal.visible}
        type={followListModal.type}
        userId={user.uid}
        t={t}
        onClose={() => setFollowListModal(prev => ({ ...prev, visible: false }))}
        onNavigate={u => navigation.navigate('Profile', {
          user: { uid: u.id, displayName: u.display_name, photoURL: u.avatar_url },
          isOwnProfile: false,
        })}
      />
    </View>
  );
}

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Nav bar ───────────────────────────────────────────────────────────────
  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // ── Hero Card (white, left-aligned layout) ────────────────────────────────
  heroCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
    borderRadius: 24, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  // Horizontal row: avatar LEFT, identity RIGHT
  heroTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 14, marginBottom: 14,
  },
  heroAvatar: {
    width: 72, height: 72, borderRadius: 20, flexShrink: 0,
  },
  heroAvatarFallback: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroIdentity: { flex: 1, paddingTop: 2 },
  heroName:   { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  heroHandle: { fontSize: 13, marginBottom: 8 },
  taglineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100,
  },
  taglineText: { fontSize: 11, fontStyle: 'italic', fontWeight: '500' },

  heroBio: { fontSize: 13, lineHeight: 19, marginBottom: 14 },

  // Stats: top + bottom border, 3-column
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderBottomWidth: 1,
    paddingVertical: 12, marginBottom: 14,
  },
  stat:       { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:  { fontSize: 11, marginTop: 2, letterSpacing: 0.1 },
  statDivider:{ width: 1, height: 22 },

  heroActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  editBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 100,
    paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  editBtnText:  { fontSize: 14, fontWeight: '600' },
  followBtn: {
    flex: 1, backgroundColor: NAVY, borderRadius: 100, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  followBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  iconBtn: {
    width: 46, height: 46, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  joinDate: { fontSize: 11, textAlign: 'center', letterSpacing: 0.1 },

  // ── Taste Snapshot Card ───────────────────────────────────────────────────
  tasteCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  tasteTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tasteCardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  tasteStar: { fontSize: 16 },
  tasteScroll: { gap: 8, paddingRight: 4 },
  tasteTag: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1,
  },
  tasteTagText: { fontSize: 13, fontWeight: '600' },
  topCatRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
  },
  topCatLabel: { fontSize: 12, fontWeight: '500' },
  topCatChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  topCatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  topCatChipText: { fontSize: 11, fontWeight: '600' },

  // ── Latest Gem / Featured ─────────────────────────────────────────────────
  featuredSection: { marginHorizontal: 16, marginBottom: 12 },
  featuredCard: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  featuredPhoto: { width: '100%', aspectRatio: 16 / 7 },
  featuredPhotoPlaceholder: {
    width: '100%', aspectRatio: 16 / 7,
    alignItems: 'center', justifyContent: 'center',
  },
  featuredBody: { padding: 14, gap: 5 },
  featuredTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  featuredNote: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  featuredLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  featuredLocText: { fontSize: 12 },

  // Empty gem state
  emptyGemCard: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 18,
    paddingVertical: 32, alignItems: 'center', gap: 6,
  },
  emptyGemGlyph: { fontSize: 28, color: '#C4A882' },
  emptyGemTitle: { fontSize: 14, fontWeight: '600' },
  emptyGemSub: { fontSize: 12 },

  // ── Shared section helpers ────────────────────────────────────────────────
  sectionMicrolabel: {
    fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10,
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  countBadgeText: { fontSize: 12, fontWeight: '600' },

  // ── Curated Collections ───────────────────────────────────────────────────
  collectionsSection: { marginBottom: 12 },
  collectionsScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  collCard: {
    width: 155, borderRadius: 18,
    padding: 16, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
    padding: 14, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  collCardNew: {
    width: 155, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed',
    padding: 16, gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', minHeight: 120,
  },
  collNewPlus: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  collNewLabel: { fontSize: 13, fontWeight: '600' },
  collEditIcon: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  collIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  collName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  collFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  collCount: { fontSize: 11 },
  visBadge: {
    backgroundColor: 'rgba(13,31,60,0.07)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100,
  },
  visBadgeText: { fontSize: 10, fontWeight: '600', color: NAVY },
  sharedDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(45,63,92,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Places Shared section header ──────────────────────────────────────────
  gemsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, marginTop: 4,
  },
  gemsSectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },

  list: { paddingBottom: 48 },

  // ── Pin cards ─────────────────────────────────────────────────────────────
  pinCard: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#1C1714', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  pinPhoto: { width: 92, height: 92 },
  pinPhotoPlaceholder: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  pinInfo: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  pinTitle: { fontSize: 15, fontWeight: '700' },
  pinNote: { fontSize: 12, fontStyle: 'italic' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locText: { fontSize: 11 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
    alignSelf: 'flex-start',
  },
  catPillText: { fontSize: 11, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText:  { fontSize: 14, textAlign: 'center' },
});

// ─── EditCollectionModal styles — UNCHANGED ───────────────────────────────────
const eStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: 36, gap: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(28,23,20,0.14)',
    alignSelf: 'center', marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: NAVY, letterSpacing: -0.4, marginBottom: 4 },
  section: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 16, gap: 0 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 10 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(28,23,20,0.10)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1C1714',
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#1C1714', marginBottom: 2 },
  optionSub: { fontSize: 12, color: MUTED_C, lineHeight: 16 },
  divider: { height: 1, backgroundColor: 'rgba(28,23,20,0.07)', marginVertical: 12 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(192,57,43,0.25)', borderRadius: 12,
    paddingVertical: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#C0392B' },
  saveBtn: { backgroundColor: NAVY, borderRadius: 100, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── EditProfileModal styles — UNCHANGED ─────────────────────────────────────
const epStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  kavWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(28,23,20,0.14)',
    alignSelf: 'center', marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: NAVY, letterSpacing: -0.4, marginBottom: 16 },
  avatarWrap: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(13,31,60,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: MUTED_C,
    letterSpacing: 0.5, marginBottom: 6, marginTop: 14,
  },
  fieldHint: { fontWeight: '400' },
  handleInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handleAt: { fontSize: 17, fontWeight: '600', color: MUTED_C, paddingBottom: 2 },
  handleError: { fontSize: 12, color: '#C0505A', marginTop: 4 },
  input: {
    backgroundColor: 'rgba(13,31,60,0.04)',
    borderWidth: 1, borderColor: 'rgba(28,23,20,0.10)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: NAVY, marginBottom: 2,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(13,31,60,0.07)',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
  },
  tagChipText: { fontSize: 13, fontWeight: '600', color: NAVY },
  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: { backgroundColor: NAVY, borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── FollowListModal styles — UNCHANGED ──────────────────────────────────────
const flStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '70%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(13,31,60,0.12)', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: NAVY },
  empty: { textAlign: 'center', color: 'rgba(28,23,20,0.38)', fontSize: 14, marginTop: 32, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  handleText: { fontSize: 12, marginTop: 1 },
});
