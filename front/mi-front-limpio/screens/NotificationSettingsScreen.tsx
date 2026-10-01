import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Switch, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { updateNotificationPreferences, type NotificationPreferences } from '../services/api';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppScreen } from '../components/ui/AppScreen';
import { AppText } from '../components/ui/AppText';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { buildSettingsReturnParams, normalizeSettingsOrigin } from '../navigation/settingsNavigation';
import { registerCurrentPushDevice } from '../services/pushNotifications';

type PermissionState = 'loading' | 'granted' | 'denied' | 'undetermined';

const preferenceRows: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
  { key: 'general', title: 'General', description: 'Avisos generales de HomePlus.' },
  { key: 'tareas', title: 'Planner', description: 'Tareas y recordatorios del hogar.' },
  { key: 'familia', title: 'Familia', description: 'Novedades importantes de tu hogar.' },
  { key: 'gps', title: 'Ubicación', description: 'Cambios relevantes al compartir ubicación.' },
];

function readPreferences(metadata: unknown): NotificationPreferences {
  const raw = (metadata as { notification_prefs?: unknown } | undefined)?.notification_prefs;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as NotificationPreferences : {};
}

export function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => readPreferences(user?.user_metadata));
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => {
    const result = await Notifications.getPermissionsAsync();
    setPermission(result.granted ? 'granted' : result.status === 'undetermined' ? 'undetermined' : 'denied');
    setCanAskAgain(result.canAskAgain);
  }, []);

  useEffect(() => { void refreshPermission(); }, [refreshPermission]);

  const requestPermission = useCallback(async () => {
    setRequesting(true);
    setError(null);
    try {
      const result = await Notifications.requestPermissionsAsync();
      setPermission(result.granted ? 'granted' : result.status === 'undetermined' ? 'undetermined' : 'denied');
      setCanAskAgain(result.canAskAgain);
      if (result.granted && session?.access_token) await registerCurrentPushDevice(session.access_token);
    } catch {
      setError('No pudimos consultar el permiso del dispositivo. Intentá nuevamente.');
    } finally {
      setRequesting(false);
    }
  }, [session?.access_token]);

  const changePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!session?.access_token) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingKey(key);
    setError(null);
    try {
      await updateNotificationPreferences(session.access_token, next);
    } catch (cause) {
      setPreferences(previous);
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar esta preferencia.');
    } finally {
      setSavingKey(null);
    }
  }, [preferences, session?.access_token]);

  const status = useMemo(() => {
    if (permission === 'granted') return { title: 'Notificaciones activadas', copy: 'HomePlus tiene permiso para enviarte avisos.', tone: 'success' as const };
    if (permission === 'undetermined') return { title: 'Activá las notificaciones', copy: 'Elegí qué avisos querés recibir y autorizalos desde el dispositivo.', tone: 'secondary' as const };
    return { title: 'Notificaciones desactivadas en el dispositivo', copy: 'Podés volver a activarlas desde Configuración.', tone: 'danger' as const };
  }, [permission]);

  const handleBack = useCallback(() => {
    navigation.navigate('ExperienceShell', buildSettingsReturnParams(normalizeSettingsOrigin(route.params?.originTab)));
  }, [navigation, route.params?.originTab]);

  return (
    <AppScreen scroll padded background="base" bottomInset="none">
      <View style={styles.header}>
        <AppButton variant="icon" size="sm" onPress={handleBack} accessibilityLabel="Volver">
          <HomePlusIcon name="arrow-back" size={20} color={colors.text.primary} />
        </AppButton>
        <AppText variant="title3" weight="800">Notificaciones</AppText>
      </View>

      <AppCard variant="default" padding="default" style={styles.card}>
        <AppText variant="body" weight="800" tone={status.tone}>{status.title}</AppText>
        <AppText variant="bodySmall" tone="secondary" style={styles.copy}>{status.copy}</AppText>
        {permission === 'loading' ? <ActivityIndicator color={colors.brand} /> : null}
        {permission === 'undetermined' ? <AppButton title="Activar notificaciones" loading={requesting} onPress={() => void requestPermission()} style={styles.action} /> : null}
        {permission === 'denied' && !canAskAgain ? <AppButton title="Abrir configuración" variant="secondary" onPress={() => void Linking.openSettings()} style={styles.action} /> : null}
        {permission === 'denied' && canAskAgain ? <AppButton title="Volver a solicitar permiso" variant="secondary" loading={requesting} onPress={() => void requestPermission()} style={styles.action} /> : null}
      </AppCard>

      <AppText variant="caption" weight="700" tone="secondary" style={styles.sectionTitle}>PREFERENCIAS DE HOMEPLUS</AppText>
      <AppCard variant="default" padding="default">
        {preferenceRows.map((row, index) => (
          <View key={row.key} style={[styles.row, index > 0 ? styles.divider : null]}>
            <View style={styles.rowCopy}>
              <AppText variant="bodySmall" weight="700">{row.title}</AppText>
              <AppText variant="caption" tone="secondary">{row.description}</AppText>
            </View>
            <Switch
              value={preferences[row.key] !== false}
              disabled={savingKey !== null}
              onValueChange={(value) => void changePreference(row.key, value)}
              trackColor={{ false: colors.border.default, true: colors.terracotta[400] }}
              thumbColor={colors.background.base}
              accessibilityLabel={`${row.title}: ${preferences[row.key] !== false ? 'activadas' : 'desactivadas'}`}
              accessibilityState={{ checked: preferences[row.key] !== false, disabled: savingKey !== null }}
            />
          </View>
        ))}
      </AppCard>
      {error ? <AppText variant="bodySmall" tone="danger" style={styles.error}>{error}</AppText> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] },
  card: { marginBottom: spacing[5] },
  copy: { marginTop: spacing[1] },
  action: { alignSelf: 'flex-start', marginTop: spacing[4] },
  sectionTitle: { marginBottom: spacing[2], letterSpacing: 0.5 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border.subtle },
  rowCopy: { flex: 1, gap: spacing[1] },
  error: { marginTop: spacing[3], padding: spacing[3], backgroundColor: colors.danger.soft, borderRadius: radius.md },
});
