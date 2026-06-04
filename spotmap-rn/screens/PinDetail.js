import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Modal, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { getCat } from '../constants';
import ReportModal from '../components/ReportModal';

function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from('gem-images').getPublicUrl(path).data.publicUrl;
}

const T = {
  bg:       '#FFFFFF',
  surface:  '#F5F5F5',
  surface2: '#EBEBEB',
  border:   'rgba(0,0,0,0.07)',
  text:     '#1C1714',
  muted:    'rgba(28,23,20,0.38)',
  accent:   '#0D1F3C',
};

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}


export default function PinDetail({ navigation, route, user }) {
  const { pinId, focusComment } = route.params ?? {};
  const isGuest = user?.uid === 'guest';
  const userId = user?.uid;
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const commentInputRef = useRef(null);
  const scrollRef = useRef(null);
  const t = T;

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: gem, error } = await supabase
        .from('gems')
        .select(`
          id, title, caption, category, save_count, created_at,
          author:profiles!gems_author_id_fkey(id, display_name, avatar_url),
          place:places!gems_place_id_fkey(name, city, latitude, longitude),
          images:gem_images(storage_path, order_index)
        `)
        .eq('id', pinId)
        .single();

      if (error || !gem) {
        console.error('PinDetail gem fetch error:', error?.message, '| pinId:', pinId);
        setLoading(false);
        return;
      }

      const firstImage = (gem.images ?? []).sort((a, b) => a.order_index - b.order_index)[0];
      setPin({
        id:           gem.id,
        title:        gem.title,
        note:         gem.caption,
        category:     gem.category,
        photoURL:     resolveImageUrl(firstImage?.storage_path),
        locationName: [gem.place?.name, gem.place?.city].filter(Boolean).join(', '),
        lat:          gem.place?.latitude,
        lng:          gem.place?.longitude,
        authorId:     gem.author?.id,
        authorName:   gem.author?.display_name,
        authorPhoto:  gem.author?.avatar_url,
        createdAt:    gem.created_at,
        saveCount:    gem.save_count,
        savedBy:      [],
      });
      setSaveCount(gem.save_count ?? 0);

      const { data: saveRow } = await supabase
        .from('saves')
        .select('gem_id')
        .eq('gem_id', pinId)
        .eq('user_id', userId)
        .maybeSingle();
      setIsSaved(!!saveRow);

      await loadComments();

      setLoading(false);
    })();
  }, [pinId, userId]);

  useEffect(() => {
    if (isGuest) return;
    supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [userId]);

  useEffect(() => {
    if (focusComment && commentInputRef.current) {
      setTimeout(() => commentInputRef.current?.focus(), 400);
    }
  }, [focusComment, loading]);

  const loadComments = async () => {
    const { data: rows, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author:profiles!comments_author_id_fkey(id, display_name, avatar_url)')
      .eq('gem_id', pinId)
      .order('created_at', { ascending: true });
    if (error) console.error('PinDetail loadComments error:', error.message);
    setComments((rows ?? []).map(c => ({
      id:          c.id,
      text:        c.body,
      authorId:    c.author?.id,
      authorName:  c.author?.display_name,
      authorPhoto: c.author?.avatar_url,
      createdAt:   c.created_at,
    })));
  };

  const toggleSave = async () => {
    const next = !isSaved;
    setIsSaved(next);
    setSaveCount(c => c + (next ? 1 : -1));
    if (!isGuest) {
      if (next) {
        await supabase.from('saves').upsert({ gem_id: pinId, user_id: userId });
      } else {
        await supabase.from('saves').delete().eq('gem_id', pinId).eq('user_id', userId);
      }
    }
  };

  const deletePost = () => {
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
              .eq('id', pinId)
              .eq('author_id', userId);
            if (error) { Alert.alert('Could not delete', error.message); return; }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const reportPost = () => setReportVisible(true);

  const deleteComment = (commentId) => {
    Alert.alert('Delete comment', 'Remove this thought?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('author_id', userId);
          if (error) { Alert.alert('Could not delete', error.message); return; }
          setComments(prev => prev.filter(c => c.id !== commentId));
        },
      },
    ]);
  };

  const submitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    const text = commentText.trim();
    setCommentText('');
    if (isGuest) {
      setCommentText(text);
      setSubmitting(false);
      Alert.alert(
        'Sign in to comment',
        'Create an account or sign in to leave your thoughts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => supabase.auth.signOut() },
        ]
      );
      return;
    }

    const optimistic = {
      id:          `local_${Date.now()}`,
      text,
      authorId:    userId,
      authorName:  myProfile?.display_name ?? user?.displayName ?? 'You',
      authorPhoto: myProfile?.avatar_url ?? user?.photoURL ?? null,
      createdAt:   new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);

    const { error } = await supabase.from('comments').insert({ gem_id: pinId, author_id: userId, body: text });
    if (error) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      setCommentText(text);
      Alert.alert('Could not post', error.message);
      setSubmitting(false);
      return;
    }
    await loadComments();
    setSubmitting(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  if (!pin) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: t.bg }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: t.surface }]} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={t.text} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.emptyGem}>✦</Text>
          <Text style={[{ color: t.muted, fontSize: 14 }]}>Gem not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cat = getCat(pin.category);
  const createdAtDate = pin.createdAt?.toDate ? pin.createdAt.toDate() : (pin.createdAt ? new Date(pin.createdAt) : null);
  const date = createdAtDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <KeyboardAvoidingView
      style={[styles.page, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.heroWrap}>
          {pin.photoURL
            ? <Image source={{ uri: pin.photoURL }} style={styles.heroImg} />
            : <View style={[styles.heroPlaceholder, { backgroundColor: t.surface2 }]}>
                <Ionicons name={cat.icon} size={56} color={cat.color} />
              </View>
          }
          <TouchableOpacity style={styles.backBtnOverlay} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          {!isGuest && pin.authorId === userId && (
            <TouchableOpacity style={styles.deleteBtnOverlay} onPress={deletePost}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {!isGuest && pin.authorId !== userId && (
            <TouchableOpacity style={styles.deleteBtnOverlay} onPress={reportPost}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={[styles.catPill, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon} size={12} color={cat.color} />
              <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={toggleSave} activeOpacity={0.75}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isSaved ? t.accent : t.muted}
              />
              <Text style={[styles.saveBtnText, { color: isSaved ? t.accent : t.muted }]}>
                {saveCount > 0 ? saveCount : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: t.text }]}>{pin.title}</Text>

          {pin.note
            ? <View style={[styles.noteWrap, { borderLeftColor: t.accent }]}>
                <Text style={[styles.note, { color: t.muted }]}>{pin.note}</Text>
              </View>
            : null
          }

          <TouchableOpacity
            style={[styles.authorCard, { backgroundColor: t.surface }]}
            onPress={() => navigation.navigate('Profile', {
              user: { uid: pin.authorId, displayName: pin.authorName, photoURL: pin.authorPhoto },
              isOwnProfile: pin.authorId === userId,
            })}
            activeOpacity={0.8}
          >
            <Pressable onPress={() => pin.authorPhoto && setProfilePhoto(pin.authorPhoto)}>
              {pin.authorPhoto
                ? <Image source={{ uri: pin.authorPhoto }} style={styles.authorAvatar} />
                : <View style={[styles.authorAvatarFallback, { backgroundColor: t.surface2 }]}>
                    <Ionicons name="person" size={16} color={t.muted} />
                  </View>
              }
            </Pressable>
            <View>
              <Text style={[styles.authorName, { color: t.text }]}>{pin.authorName}</Text>
              <Text style={[styles.authorDate, { color: t.muted }]}>
                left this gem{date ? ` · ${date}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          {pin.locationName
            ? <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={t.accent} />
                <Text style={[styles.locationText, { color: t.muted }]}>{pin.locationName}</Text>
              </View>
            : null
          }


          <View style={styles.thoughtsSection}>
            <Text style={[styles.thoughtsTitle, { color: t.text }]}>
              {comments.length > 0
                ? `${comments.length} thought${comments.length !== 1 ? 's' : ''}`
                : 'Thoughts'}
            </Text>

            {comments.length === 0 && (
              <Text style={[styles.noThoughts, { color: t.muted }]}>
                Be the first to share a thought
              </Text>
            )}

            {comments.map(c => (
              <View key={c.id} style={styles.thought}>
                <Pressable onPress={() => c.authorPhoto && setProfilePhoto(c.authorPhoto)}>
                  {c.authorPhoto
                    ? <Image source={{ uri: c.authorPhoto }} style={styles.thoughtAvatar} />
                    : <View style={[styles.thoughtAvatarFallback, { backgroundColor: t.surface2 }]}>
                        <Ionicons name="person" size={12} color={t.muted} />
                      </View>
                  }
                </Pressable>
                <View style={[styles.thoughtBubble, { backgroundColor: t.surface }]}>
                  <View style={styles.thoughtHeader}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Profile', {
                        user: { uid: c.authorId, displayName: c.authorName, photoURL: c.authorPhoto },
                        isOwnProfile: c.authorId === userId,
                      })}
                      activeOpacity={0.6}
                      style={{ flex: 1, alignSelf: 'flex-start' }}
                    >
                      <Text style={[styles.thoughtAuthor, { color: t.text }]}>
                        {c.authorName?.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.thoughtTime, { color: t.muted }]}>{timeAgo(c.createdAt)}</Text>
                    {c.authorId === userId && !isGuest && (
                      <TouchableOpacity
                        onPress={() => deleteComment(c.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={13} color={t.muted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.thoughtText, { color: t.text }]}>{c.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!profilePhoto} transparent animationType="fade" onRequestClose={() => setProfilePhoto(null)}>
        <Pressable style={styles.photoModalBackdrop} onPress={() => setProfilePhoto(null)}>
          {profilePhoto && <Image source={{ uri: profilePhoto }} style={styles.photoModalImage} />}
        </Pressable>
      </Modal>

      <View style={[styles.inputBar, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <TextInput
          ref={commentInputRef}
          style={[styles.thoughtInput, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
          placeholder="share a thought…"
          placeholderTextColor={t.muted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={280}
          returnKeyType="send"
          onSubmitEditing={submitComment}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: commentText.trim() ? t.accent : t.surface2 }]}
          onPress={submitComment}
          disabled={!commentText.trim() || submitting}
        >
          <Ionicons name="arrow-up" size={18} color={commentText.trim() ? '#FAF7F2' : t.muted} />
        </TouchableOpacity>
      </View>
      <ReportModal
        visible={reportVisible}
        gemId={pinId}
        userId={userId}
        onClose={() => setReportVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyGem: { fontSize: 40, color: '#C4A882' },

  heroWrap: { position: 'relative' },
  heroImg: { width: '100%', aspectRatio: 4 / 3 },
  heroPlaceholder: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  backBtnOverlay: {
    position: 'absolute', top: 52, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnOverlay: {
    position: 'absolute', top: 52, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: {
    margin: 16, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { padding: 20, gap: 16, paddingBottom: 8 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  catPillText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },

  title: { fontSize: 30, fontWeight: '800', letterSpacing: -1, lineHeight: 34 },
  noteWrap: { borderLeftWidth: 2, paddingLeft: 14 },
  note: { fontSize: 16, fontStyle: 'italic', lineHeight: 24 },

  authorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16,
  },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorAvatarFallback: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  authorName: { fontSize: 14, fontWeight: '600' },
  authorDate: { fontSize: 12, marginTop: 2 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 14 },

  savedByRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12,
  },
  savedByAvatars: { flexDirection: 'row' },
  savedByAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#FAF7F2' },
  savedByText: { fontSize: 13 },

  thoughtsSection: { gap: 12, paddingBottom: 16 },
  thoughtsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  noThoughts: { fontSize: 14, fontStyle: 'italic' },
  thought: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  thoughtAvatar: { width: 30, height: 30, borderRadius: 15, marginTop: 2 },
  thoughtAvatarFallback: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  thoughtBubble: { flex: 1, borderRadius: 14, padding: 10, gap: 3 },
  thoughtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thoughtAuthor: { fontSize: 13, fontWeight: '600' },
  thoughtTime: { fontSize: 11 },
  thoughtText: { fontSize: 14, lineHeight: 20 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  thoughtInput: {
    flex: 1, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },

  photoModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoModalImage: { width: 240, height: 240, borderRadius: 120 },
});
