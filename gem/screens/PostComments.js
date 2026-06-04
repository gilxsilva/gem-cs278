import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCat, THEMES } from '../constants';
import { supabase } from '../supabase';
import SaveToCollectionModal from '../components/SaveToCollectionModal';


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

export default function PostComments({ navigation, route, user, theme }) {
  const { pin, userId } = route.params;
  const t = THEMES[theme ?? 'light'];
  const cat = getCat(pin.category);
  const isGuest = userId === 'guest' || !userId;

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [likedComments, setLikedComments] = useState({});
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const flatListRef = useRef(null);

  const firstName = pin.authorName?.split(' ')[0] ?? 'Someone';
  const saverNames = [];
  useEffect(() => {
    if (isGuest) return;
    loadComments();
  }, [pin.id]);

  useEffect(() => {
    if (isGuest) return;
    supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single()
      .then(({ data, error }) => {
        if (error) console.warn('PostComments profile fetch error:', error.message);
        if (data) setMyProfile(data);
      });
  }, [userId]);

  const loadComments = async () => {
    const { data: rows, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author:profiles!comments_author_id_fkey(id, display_name, avatar_url)')
      .eq('gem_id', pin.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('PostComments fetch error:', error.message);
      return;
    }
    setComments((rows ?? []).map(c => ({
      id:          c.id,
      text:        c.body,
      authorId:    c.author?.id,
      authorName:  c.author?.display_name,
      authorPhoto: c.author?.avatar_url,
      createdAt:   c.created_at,
    })));
  };

  const toggleCommentLike = (id) => {
    setLikedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    if (!newComment.trim() || submitting) return;

    if (isGuest) {
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

    setSubmitting(true);
    const text = newComment.trim();
    setNewComment('');

    const optimistic = {
      id:          `local_${Date.now()}`,
      text,
      authorId:    userId,
      authorName:  myProfile?.display_name ?? user?.displayName ?? 'You',
      authorPhoto: myProfile?.avatar_url ?? user?.photoURL ?? null,
      createdAt:   new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);

    const { error } = await supabase
      .from('comments')
      .insert({ gem_id: pin.id, author_id: userId, body: text });

    if (error) {
      console.error('Comment insert error:', error.message);
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      setNewComment(text);
      Alert.alert('Could not post', error.message);
      setSubmitting(false);
      return;
    }

    await loadComments();
    setSubmitting(false);
    setTimeout(() => flatListRef.current?.scrollToEnd?.({ animated: true }), 100);
  };

  const PostHeader = () => (
    <>
      <View style={[styles.postCard, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <View style={styles.cardHeader}>
          {pin.authorPhoto
            ? <Image source={{ uri: pin.authorPhoto }} style={styles.authorAvatar} />
            : <View style={[styles.authorAvatarFallback, { backgroundColor: t.surface }]}>
                <Ionicons name="person" size={18} color={t.muted} />
              </View>
          }
          <View style={styles.narrativeWrap}>
            <Text style={[styles.narrativeLine, { color: t.text }]}>
              <Text style={styles.narrativeBold}>{firstName} </Text>
              {'found '}
              <Text style={styles.narrativeBold}>{pin.title}</Text>
            </Text>
            <Text style={[styles.cardTimestamp, { color: t.muted }]}>{timeAgo(pin.createdAt)}</Text>
          </View>
          <View style={[styles.catSticker, { backgroundColor: cat.color + '20' }]}>
            <Ionicons name={cat.icon} size={16} color={cat.color} />
          </View>
        </View>

        {(pin.photoURL || pin.locationName) ? (
          <View style={styles.mediaRow}>
            {pin.photoURL && (
              <Image source={{ uri: pin.photoURL }} style={styles.thumbnail} />
            )}
            {pin.locationName && (
              <View style={[styles.locationBlock, !pin.photoURL && { paddingLeft: 0 }]}>
                <Ionicons name="location-outline" size={18} color={t.muted} style={{ marginTop: 1 }} />
                <Text style={[styles.locationText, { color: t.text }]}>{pin.locationName}</Text>
              </View>
            )}
          </View>
        ) : null}

        {pin.note ? (
          <Text style={[styles.noteText, { color: t.text }]}>
            <Text style={{ color: t.muted }}>Notes: </Text>
            {pin.note}
          </Text>
        ) : null}
      </View>

      <View style={[styles.commentsSectionHeader, { borderBottomColor: t.border }]}>
        <Text style={[styles.commentsSectionTitle, { color: t.text }]}>
          {comments.length > 0 ? `${comments.length} thought${comments.length !== 1 ? 's' : ''}` : 'Thoughts'}
        </Text>
      </View>
    </>
  );

  const renderComment = ({ item: comment }) => (
    <View style={[styles.commentRow, { borderBottomColor: t.border }]}>
      {comment.authorPhoto
        ? <Image source={{ uri: comment.authorPhoto }} style={styles.commentAvatar} />
        : <View style={[styles.commentAvatarFallback, { backgroundColor: t.surface }]}>
            <Ionicons name="person" size={14} color={t.muted} />
          </View>
      }
      <View style={styles.commentBody}>
        <View style={styles.commentTopRow}>
          <Text style={[styles.commentAuthor, { color: t.text, flex: 1 }]}>
            {comment.authorName?.split(' ')[0]}
          </Text>
          <Text style={[styles.commentTime, { color: t.muted }]}>{timeAgo(comment.createdAt)}</Text>
          {comment.authorId === userId && !isGuest && (
            <TouchableOpacity
              onPress={() => deleteComment(comment.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={13} color={t.muted} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.commentText, { color: t.text }]}>{comment.text}</Text>
        <TouchableOpacity activeOpacity={0.6}>
          <Text style={[styles.replyText, { color: t.muted }]}>reply</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.commentLikeBtn}
        onPress={() => toggleCommentLike(comment.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={likedComments[comment.id] ? 'heart' : 'heart-outline'}
          size={16}
          color={likedComments[comment.id] ? '#C0505A' : t.muted}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: t.bg }}>
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Image source={require('../assets/logo.png')} style={styles.wordmark} />
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: t.surface }]}
              onPress={() => setCollectionModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={bookmarked ? t.accent : t.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: t.surface }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={18} color={t.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        ListHeaderComponent={PostHeader}
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Text style={[styles.emptyText, { color: t.muted }]}>be the first to leave a thought</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <SaveToCollectionModal
        visible={collectionModalVisible}
        pin={pin}
        userId={userId}
        onClose={() => setCollectionModalVisible(false)}
        onSave={(_, ids) => setBookmarked(ids.length > 0)}
      />

      <SafeAreaView edges={['bottom']} style={[styles.inputSafe, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <View style={[styles.inputRow, { backgroundColor: t.surface }]}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="share a thought…"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text }]}
            multiline
            returnKeyType="send"
            onSubmitEditing={submitComment}
          />
          {submitting
            ? <ActivityIndicator size="small" color={t.muted} style={{ paddingHorizontal: 4 }} />
            : <TouchableOpacity
                onPress={submitComment}
                activeOpacity={0.7}
                disabled={!newComment.trim()}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={28}
                  color={newComment.trim() ? t.accent : t.muted}
                />
              </TouchableOpacity>
          }
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  wordmark: { width: 34, height: 34, borderRadius: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingBottom: 16 },

  postCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22 },
  authorAvatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  narrativeWrap: { flex: 1 },
  narrativeLine: { fontSize: 14, lineHeight: 20 },
  narrativeBold: { fontWeight: '700' },
  narrativeMuted: { fontWeight: '400' },
  cardTimestamp: { fontSize: 12, marginTop: 3 },
  catSticker: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  thumbnail: { width: 130, height: 110, borderRadius: 10 },
  locationBlock: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 2 },
  locationText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  noteText: { fontSize: 14, lineHeight: 20 },

  commentsSectionHeader: {
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  commentsSectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },

  commentRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  commentAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarFallback: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  commentBody: { flex: 1 },
  commentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  replyText: { fontSize: 12, fontWeight: '600' },
  commentLikeBtn: { paddingTop: 2 },

  emptyComments: {
    alignItems: 'center', paddingVertical: 40,
  },
  emptyText: { fontSize: 14 },

  inputSafe: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 14, maxHeight: 80 },
});
