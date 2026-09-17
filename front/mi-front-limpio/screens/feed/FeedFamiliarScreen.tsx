import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Reaction = { emoji: string; count: number };

type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  timeAgo: string;
  text: string;
  illustration?: string; // big emoji for illustration
  reactions: Reaction[];
  commentsCount: number;
};

type Hito = {
  id: string;
  emoji: string;
  title: string;
  date: string;
  color: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_HITOS: Hito[] = [
  { id: '1', emoji: '🔥', title: 'Primer día de escuela', date: 'Hoy 2024', color: '#FF6B35' },
  { id: '2', emoji: '🦷', title: 'Primer diente',         date: '13 Ene 2024', color: '#6B4FE8' },
  { id: '3', emoji: '👶', title: 'Primeros pasos',        date: '3 Feb 2024',  color: '#7C9E7A' },
  { id: '4', emoji: '🏆', title: 'Torneo de ajedrez',     date: '20 Abr 2024', color: '#D4975A' },
];

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    authorName: 'Valeria',
    authorInitials: 'V',
    authorColor: '#E7643F',
    timeAgo: 'hace 3 horas',
    text: 'Juan terminó el año escolar con diez calificaciones hoy 🎉',
    illustration: '📚',
    reactions: [{ emoji: '❤️', count: 4 }],
    commentsCount: 1,
  },
  {
    id: '2',
    authorName: 'Mamá',
    authorInitials: 'M',
    authorColor: '#7C9E7A',
    timeAgo: 'hace 1 hora',
    text: 'Almuerzo familiar de domingo 💕',
    illustration: '🍽️',
    reactions: [{ emoji: '❤️', count: 6 }],
    commentsCount: 2,
  },
  {
    id: '3',
    authorName: 'Papá',
    authorInitials: 'P',
    authorColor: '#6B4FE8',
    timeAgo: 'El trimestre pasado',
    text: 'Afalú dio sus primeros pasos 👶',
    illustration: '👣',
    reactions: [{ emoji: '❤️', count: 21 }, { emoji: '🎉', count: 8 }],
    commentsCount: 3,
  },
  {
    id: '4',
    authorName: 'Juan',
    authorInitials: 'J',
    authorColor: '#D4975A',
    timeAgo: 'hace 5 horas',
    text: 'Gané el torneo de ajedrez del club 🏆',
    illustration: '♟️',
    reactions: [{ emoji: '❤️', count: 12 }],
    commentsCount: 0,
  },
];

const AUTHOR_COLORS = ['#E7643F', '#6B4FE8', '#7C9E7A', '#D4975A', '#E57373', '#64B5F6'];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const FeedFamiliarScreen = () => {
  const { user } = useAuth();
  const { members } = useHousehold();

  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newPostModal, setNewPostModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostIllustration, setNewPostIllustration] = useState('');

  const myName = user?.user_metadata?.nombre ?? 'Yo';
  const myInitials = getInitials(myName);
  const myColor = getColorForName(myName);

  const publishPost = () => {
    if (!newPostText.trim()) return;
    const post: Post = {
      id: Date.now().toString(),
      authorName: myName,
      authorInitials: myInitials,
      authorColor: myColor,
      timeAgo: 'ahora',
      text: newPostText.trim(),
      illustration: newPostIllustration.trim() || undefined,
      reactions: [],
      commentsCount: 0,
    };
    setPosts(prev => [post, ...prev]);
    setNewPostText('');
    setNewPostIllustration('');
    setNewPostModal(false);
  };

  const toggleReaction = (postId: string, emoji: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const existing = p.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return { ...p, reactions: p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r) };
      }
      return { ...p, reactions: [...p.reactions, { emoji, count: 1 }] };
    }));
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>Feed Familiar</Text>
          <Text style={S.headerSub}>Momentos compartidos</Text>
        </View>
        <TouchableOpacity style={S.addBtn} onPress={() => setNewPostModal(true)}>
          <Text style={S.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Hitos recientes ───────────────────────────────────────────── */}
        <Text style={S.sectionLabel}>Hitos recientes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hitosScroll} contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}>
          {MOCK_HITOS.map(h => (
            <View key={h.id} style={[S.hitoCard, { borderColor: h.color + '40', backgroundColor: h.color + '12' }]}>
              <View style={[S.hitoIconBg, { backgroundColor: h.color + '22' }]}>
                <Text style={S.hitoEmoji}>{h.emoji}</Text>
              </View>
              <Text style={S.hitoTitle} numberOfLines={2}>{h.title}</Text>
              <Text style={S.hitoDate}>{h.date}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Posts ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          {posts.map(post => (
            <View key={post.id} style={S.postCard}>
              {/* Post header */}
              <View style={S.postHeader}>
                <View style={[S.avatarCircle, { backgroundColor: post.authorColor }]}>
                  <Text style={S.avatarText}>{post.authorInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.postAuthor}>{post.authorName}</Text>
                  <Text style={S.postTime}>{post.timeAgo}</Text>
                </View>
              </View>

              {/* Illustration */}
              {post.illustration && (
                <View style={S.illustrationBox}>
                  <Text style={S.illustrationEmoji}>{post.illustration}</Text>
                </View>
              )}

              {/* Post text */}
              <Text style={S.postText}>{post.text}</Text>

              {/* Reactions */}
              <View style={S.reactionsRow}>
                <View style={S.reactionsLeft}>
                  <TouchableOpacity style={S.reactionBtn} onPress={() => toggleReaction(post.id, '❤️')}>
                    <Text style={S.reactionEmoji}>❤️</Text>
                    <Text style={S.reactionCount}>
                      {post.reactions.find(r => r.emoji === '❤️')?.count ?? 0}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.reactionBtn}>
                    <Text style={S.reactionEmoji}>💬</Text>
                    <Text style={S.reactionCount}>{post.commentsCount}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity>
                  <Text style={{ fontSize: 20, color: '#AAAAAA' }}>↗</Text>
                </TouchableOpacity>
              </View>

              {/* Comment hint */}
              <View style={S.commentHint}>
                <View style={[S.avatarSmall, { backgroundColor: myColor }]}>
                  <Text style={S.avatarSmallText}>{myInitials}</Text>
                </View>
                <Text style={S.commentHintText}>¿Qué opinas?</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── New post modal ──────────────────────────────────────────────────── */}
      <Modal visible={newPostModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Nuevo momento</Text>
            <Text style={S.modalLabel}>Ilustración (emoji opcional)</Text>
            <TextInput
              style={S.modalInput}
              placeholder="Ej. 🏆 🎉 📚"
              placeholderTextColor="#AAAAAA"
              value={newPostIllustration}
              onChangeText={setNewPostIllustration}
            />
            <Text style={S.modalLabel}>¿Qué quieres compartir?</Text>
            <TextInput
              style={[S.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Cuéntale a tu familia…"
              placeholderTextColor="#AAAAAA"
              value={newPostText}
              onChangeText={setNewPostText}
              multiline
            />
            <View style={S.modalActions}>
              <TouchableOpacity
                style={S.cancelBtn}
                onPress={() => { setNewPostModal(false); setNewPostText(''); setNewPostIllustration(''); }}
              >
                <Text style={S.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.saveBtn} onPress={publishPost}>
                <Text style={S.saveBtnText}>Publicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1C' },
  headerSub: { fontSize: 13, color: '#888888', marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E7643F',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', lineHeight: 28 },

  scroll: { flex: 1 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888888',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginBottom: 12,
  },

  hitosScroll: { marginBottom: 24 },
  hitoCard: {
    width: 100, marginRight: 10,
    borderRadius: 16, borderWidth: 1.5,
    padding: 12, alignItems: 'center',
  },
  hitoIconBg: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  hitoEmoji: { fontSize: 22 },
  hitoTitle: { fontSize: 11, fontWeight: '700', color: '#1C1C1C', textAlign: 'center', marginBottom: 4 },
  hitoDate: { fontSize: 10, color: '#888888', textAlign: 'center' },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2DFD6',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  postTime: { fontSize: 12, color: '#888888', marginTop: 1 },

  illustrationBox: {
    backgroundColor: '#F3F2EE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  illustrationEmoji: { fontSize: 56 },

  postText: { fontSize: 15, color: '#1C1C1C', lineHeight: 22, marginBottom: 14 },

  reactionsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0EDE8',
    marginBottom: 10,
  },
  reactionsLeft: { flexDirection: 'row', gap: 12 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionEmoji: { fontSize: 18 },
  reactionCount: { fontSize: 13, color: '#888888', fontWeight: '600' },

  commentHint: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  commentHintText: { fontSize: 13, color: '#AAAAAA' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1C', marginBottom: 16 },
  modalLabel: { fontSize: 12, color: '#888888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: {
    backgroundColor: '#F3F2EE', borderRadius: 10,
    padding: 12, color: '#1C1C1C', fontSize: 15,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2DFD6',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2DFD6',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#888888', fontWeight: '600' },
  saveBtn: {
    flex: 2, backgroundColor: '#E7643F',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
