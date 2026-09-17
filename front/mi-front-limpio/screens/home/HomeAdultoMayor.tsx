import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AppButton, AppCard, AppScreen, AppText } from '../../components/ui';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { HomePlannerSections } from './HomePlannerSections';

type CalendarEvent = any;

const CATEGORY_ICONS: Record<string, string> = {
  salud: '💊', trabajo: '💼', escuela: '📚', familia: '🏠',
  personal: '🎯', deporte: '⚽', otro: '📌',
};

const CATEGORY_LABELS: Record<string, string> = {
  salud: 'Médico / Salud', trabajo: 'Trabajo', escuela: 'Educación',
  familia: 'Familia', personal: 'Personal', deporte: 'Deporte', otro: 'Otro',
};

const MOCK_PHOTOS = [
  { id: '1', emoji: '🤳', from: 'Laura',   desc: 'Cumpleaños de Ana' },
  { id: '2', emoji: '🎂', from: 'Marco',   desc: 'Paseo del domingo' },
  { id: '3', emoji: '🌳', from: 'Familia', desc: 'En el parque' },
];

const MOCK_VOICE = [
  { id: '1', from: 'Laura', emoji: '👩', duration: '0:43', date: 'Ayer' },
  { id: '2', from: 'Marco', emoji: '👨', duration: '1:12', date: 'Hace 2 días' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

export const HomeAdultoMayor = () => {
  const { user } = useAuth();
  const { currentHousehold, members } = useHousehold();

  const [checkedIn, setCheckedIn] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const firstName = user?.user_metadata?.nombre?.split(' ')[0] ?? 'Bienvenida';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !user) return;
    setEventsLoading(true);
    setTodayEvents([]);
    setEventsLoading(false);
  }, [currentHousehold, user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleCheckin = () => {
    setCheckedIn(true);
    Alert.alert('✅ ¡Mensaje enviado!', 'Tu familia recibió una notificación. 💛', [
      { text: 'Gracias', style: 'cancel' },
    ]);
  };

  const sendSOS = () => {
    setSosVisible(false);
    Alert.alert('🚨 Alerta enviada', 'Tu familia fue notificada. Alguien te contactará pronto.');
  };

  // Build contacts list from real household members
  const contacts = members
    .filter(m => m.user_id !== user?.id)
    .slice(0, 4)
    .map(m => ({
      id: m.id,
      emoji: m.rol === 'coordinador' ? '👑' : m.rol === 'adolescente' ? '🧒' : '👤',
      name: m.user?.nombre ?? 'Familiar',
    }));

  return (
    <>
      <AppScreen scroll bottomInset="fab" contentContainerStyle={styles.content}>

        {/* Greeting header */}
        <AppCard variant="quiet" padding="generous" style={styles.greetingCard}>
          <View style={{ flex: 1 }}>
            <AppText variant="title3" tone="secondary">{greeting},</AppText>
            <AppText variant="title1" style={styles.greetingName}>{firstName}</AppText>
            <AppText variant="bodySmall" tone="tertiary">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </AppText>
          </View>
          <View style={styles.avatarLarge}>
            <Text style={{ fontSize: 36 }}>👵</Text>
          </View>
        </AppCard>

        <HomePlannerSections />

        {/* "Estoy bien" button */}
        <AppCard variant="success" padding="generous" style={styles.checkinCard}>
          <AppButton
            title={checkedIn ? 'Ya avise que estoy bien' : 'Estoy bien hoy'}
            variant="primary"
            size="lg"
            onPress={handleCheckin}
            accessibilityLabel="Estoy bien hoy"
          />
          <AppText variant="bodySmall" tone="secondary" align="center" style={styles.checkinSub}>
            La familia recibira una notificacion
          </AppText>
        </AppCard>
        <AppText variant="caption" tone="tertiary" align="center" style={styles.lastCheckin}>
          Ayer a las 8:32 AM
        </AppText>
        {false ? (
          <>
        {/* Appointments / events today */}
        <Text style={styles.sectionTitle}>📋 Hoy</Text>
        {eventsLoading ? (
          <ActivityIndicator color={C.amber} size="large" style={{ marginVertical: 16 }} />
        ) : todayEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>🌞 Hoy no tienes citas.{'\n'}¡Disfruta el día!</Text>
          </View>
        ) : todayEvents.map(ev => (
          <View key={ev.id} style={styles.appointmentCard}>
            <Text style={styles.appointmentTime}>{formatTime(ev.start_at)}</Text>
            <View style={styles.appointmentDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.appointmentCategory}>
                {CATEGORY_ICONS[ev.category] ?? '📌'} {CATEGORY_LABELS[ev.category] ?? ev.category}
              </Text>
              <Text style={styles.appointmentTitle}>{ev.title}</Text>
            </View>
          </View>
        ))}

          </>
        ) : null}

        {/* Family photos */}
        <AppText variant="title2" style={styles.sectionTitle}>Fotos de tu familia</AppText>
        <AppText variant="caption" tone="warning" weight="700" style={styles.photosMeta}>3 fotos nuevas esta semana</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          {MOCK_PHOTOS.map((p, idx) => (
            <AppCard key={p.id} variant={idx === 0 ? 'warning' : 'default'} padding="compact" style={[styles.photoCard, idx === 0 && styles.photoCardFeatured]}>
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: idx === 0 ? 64 : 52 }}>{p.emoji}</Text>
              </View>
              <AppText variant="bodySmall" weight="700" align="center">{p.from}</AppText>
              <AppText variant="caption" tone="secondary" align="center">{p.desc}</AppText>
            </AppCard>
          ))}
        </ScrollView>

        {/* Voice messages */}
        <AppText variant="title2" style={styles.sectionTitle}>Mensajes de voz</AppText>
        {MOCK_VOICE.map(v => (
          <AppCard key={v.id} variant="default" padding="default" style={styles.voiceCard}>
            <Text style={{ fontSize: 42, marginRight: 12 }}>{v.emoji}</Text>
            <View style={{ flex: 1 }}>
              <AppText variant="title3">{v.from}</AppText>
              <AppText variant="bodySmall" tone="tertiary">{v.duration} - {v.date}</AppText>
            </View>
            <TouchableOpacity
              style={[styles.playBtn, playingId === v.id && styles.playBtnActive]}
              onPress={() => setPlayingId(playingId === v.id ? null : v.id)}
              accessibilityRole="button"
              accessibilityLabel={`Reproducir mensaje de ${v.from}`}
            >
              <Text style={styles.playBtnText}>{playingId === v.id ? 'II' : '▶'}</Text>
            </TouchableOpacity>
          </AppCard>
        ))}
        <AppButton title="Grabar respuesta" variant="secondary" size="lg" accessibilityLabel="Grabar respuesta" style={styles.recordBtn} />

        {/* Quick contacts */}
        <AppText variant="title2" style={styles.sectionTitle}>Llamar a la familia</AppText>
        {contacts.length === 0 ? (
          <AppCard variant="quiet" padding="generous" style={styles.emptyCard}>
            <AppText variant="bodyLarge" tone="secondary" align="center">Sin familiares en el hogar aun</AppText>
          </AppCard>
        ) : (
          <View style={styles.contactsGrid}>
            {contacts.map(c => (
              <TouchableOpacity key={c.id} style={styles.contactCard} accessibilityRole="button" accessibilityLabel={`Llamar a ${c.name}`}>
                <Text style={{ fontSize: 40, marginBottom: 6 }}>{c.emoji}</Text>
                <AppText variant="bodySmall" weight="700" align="center" style={styles.contactName}>{c.name}</AppText>
                <AppText variant="caption" tone="success" weight="700">Llamar</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </AppScreen>

      {/* SOS floating button */}
      <TouchableOpacity
        style={styles.sosFloat}
        onPress={() => setSosVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Botón de emergencia SOS"
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      {/* SOS confirmation modal */}
      <Modal visible={sosVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚨 Emergencia</Text>
            <Text style={styles.modalText}>¿Enviar alerta a toda tu familia?</Text>
            <TouchableOpacity style={styles.modalSendBtn} onPress={sendSOS}>
              <Text style={styles.modalSendText}>Sí, enviar alerta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSosVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const C = {
  bg: colors.background.base,
  surface: colors.surface.card,
  border: colors.border.default,
  text: colors.text.primary,
  textMuted: colors.text.tertiary,
  amber: colors.warning.base,
  primary: colors.terracotta[500],
  sage: colors.sage[500],
};

const styles = StyleSheet.create({
  content: { paddingTop: spacing[1] },

  greetingCard: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing[5], marginTop: spacing[1],
  },
  greeting: { fontSize: 22, color: C.text, fontWeight: '500' },
  greetingName: { marginBottom: spacing[1] },
  greetingDate: { fontSize: 16, color: C.textMuted },
  avatarLarge: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.warning.soft, alignItems: 'center', justifyContent: 'center' },

  wellbeingBtn: {
    backgroundColor: C.amber,
    borderRadius: 20, paddingVertical: 22, paddingHorizontal: 20,
    alignItems: 'center', marginBottom: 8,
  },
  wellbeingBtnDone: { backgroundColor: C.sage },
  wellbeingBtnText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  wellbeingBtnSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  checkinCard: { marginBottom: spacing[2] },
  checkinSub: { marginTop: spacing[3] },
  lastCheckin: { marginBottom: spacing[6] },

  sectionTitle: { marginBottom: spacing[3], marginTop: spacing[2] },
  appointmentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 5, borderLeftColor: C.amber,
    minHeight: 80,
  },
  appointmentTime: { fontSize: 22, fontWeight: '800', color: C.amber, marginRight: 12 },
  appointmentDivider: { width: 1, height: 48, backgroundColor: C.border, marginRight: 12 },
  appointmentCategory: { fontSize: 14, color: C.textMuted, fontWeight: '600', marginBottom: 4 },
  appointmentTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  emptyCard: { marginBottom: spacing[4] },
  emptyText: { fontSize: 18, color: C.textMuted, textAlign: 'center', lineHeight: 28 },

  photosMeta: { marginBottom: spacing[3], marginTop: -spacing[2] },
  photosScroll: { marginBottom: spacing[6], marginHorizontal: -spacing[1] },
  photoCard: { marginHorizontal: spacing[1], width: 150, alignItems: 'center' },
  photoCardFeatured: { width: 170 },
  photoPlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: colors.warning.soft, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  photoFrom: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  photoDesc: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  voiceCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3], minHeight: 80 },
  voiceName: { fontSize: 20, fontWeight: '700', color: C.text },
  voiceMeta: { fontSize: 14, color: C.textMuted, marginTop: 2 },
  playBtn: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' },
  playBtnActive: { backgroundColor: C.primary },
  playBtnText: { fontSize: 22, color: '#FFFFFF' },
  recordBtn: { marginBottom: spacing[6] },
  recordBtnText: { fontSize: 18, color: C.amber, fontWeight: '700' },

  contactsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[4] },
  contactCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: C.surface, borderRadius: radius.xl, padding: spacing[4], alignItems: 'center',
    borderWidth: 1, borderColor: C.border, minHeight: 110, justifyContent: 'center', ...shadows.card,
  },
  contactName: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4 },
  callLabel: { fontSize: 14, color: C.sage, fontWeight: '600' },

  sosFloat: {
    position: 'absolute', bottom: 100, right: 20,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.danger.base, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.danger.base, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  sosText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.surface.card, borderRadius: radius.xl, padding: spacing[7], width: '100%', alignItems: 'center', ...shadows.floating },
  modalTitle: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 12 },
  modalText: { fontSize: 20, color: C.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 28 },
  modalSendBtn: { backgroundColor: colors.danger.base, borderRadius: radius.lg, paddingVertical: spacing[4], width: '100%', alignItems: 'center', marginBottom: spacing[3] },
  modalSendText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  modalCancelBtn: { paddingVertical: 14, width: '100%', alignItems: 'center' },
  modalCancelText: { color: C.textMuted, fontSize: 16, fontWeight: '600' },
});
