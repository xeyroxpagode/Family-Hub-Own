import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppInput } from '../components/ui/AppInput';
import { AppScreen } from '../components/ui/AppScreen';
import { AppText } from '../components/ui/AppText';
import { Row } from '../components/ui/Row';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { buildSettingsReturnParams, normalizeSettingsOrigin } from '../navigation/settingsNavigation';

type TotpFactor = { id: string; status?: string };
type Enrollment = { id: string; uri: string; secret: string };

function friendlyError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message.toLowerCase() : '';
  if (message.includes('invalid') || message.includes('code')) return 'El código no es válido. Revisalo e intentá nuevamente.';
  if (message.includes('aal2') || message.includes('assurance')) return 'Para continuar, verificá nuevamente tu sesión con la autenticación en dos pasos.';
  return fallback;
}

export function SecuritySettingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateEmail, updatePassword, refreshSession } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState<'email' | 'password' | 'totp' | 'disable' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totpFactor, setTotpFactor] = useState<TotpFactor | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [openSection, setOpenSection] = useState<'email' | 'password' | 'totp' | null>(null);

  const refreshFactor = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw listError;
    const active = ((data?.totp ?? []) as TotpFactor[]).find((factor) => factor.status === 'verified') ?? null;
    setTotpFactor(active);
  }, []);

  useEffect(() => { void refreshFactor().catch(() => setError('No pudimos consultar el estado de 2FA.')); }, [refreshFactor]);

  const changeEmail = useCallback(async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) { setError('Ingresá un email válido.'); return; }
    setSaving('email'); setError(null); setMessage(null);
    const result = await updateEmail(nextEmail);
    setSaving(null);
    if (result.error) { setError(result.error); return; }
    setMessage('Enviamos una verificación al email nuevo. Tu email actual seguirá vigente hasta confirmarla.');
  }, [email, updateEmail]);

  const changePassword = useCallback(async () => {
    if (newPassword.length < 8) { setError('La contraseña necesita al menos 8 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setSaving('password'); setError(null); setMessage(null);
    const result = await updatePassword(newPassword);
    setSaving(null);
    if (result.error) { setError(result.error); return; }
    setNewPassword(''); setConfirmPassword('');
    setMessage('La contraseña se actualizó correctamente.');
  }, [confirmPassword, newPassword, updatePassword]);

  const startTotpEnrollment = useCallback(async () => {
    setSaving('totp'); setError(null); setMessage(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'HomePlus' });
      if (enrollError || !data?.totp?.uri) throw enrollError ?? new Error('No se pudo iniciar la configuración de 2FA.');
      setEnrollment({ id: data.id, uri: data.totp.uri, secret: data.totp.secret });
    } catch (cause) {
      setError(friendlyError(cause, 'No pudimos iniciar la configuración de 2FA.'));
    } finally { setSaving(null); }
  }, []);

  const verifyTotp = useCallback(async () => {
    if (!enrollment || !/^\d{6}$/.test(verificationCode.trim())) { setError('Ingresá el código de 6 dígitos de tu autenticador.'); return; }
    setSaving('totp'); setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollment.id });
      if (challengeError || !challenge?.id) throw challengeError ?? new Error('No pudimos generar el desafío de 2FA.');
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollment.id, challengeId: challenge.id, code: verificationCode.trim() });
      if (verifyError) throw verifyError;
      await refreshSession();
      await refreshFactor();
      setEnrollment(null); setVerificationCode('');
      setMessage('La autenticación en dos pasos quedó activada.');
    } catch (cause) {
      setError(friendlyError(cause, 'No pudimos verificar el código.'));
    } finally { setSaving(null); }
  }, [enrollment, refreshFactor, refreshSession, verificationCode]);

  const disableTotp = useCallback(async () => {
    if (!totpFactor) return;
    setSaving('disable'); setError(null); setMessage(null);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (unenrollError) throw unenrollError;
      setTotpFactor(null); setConfirmDisable(false);
      setMessage('La autenticación en dos pasos fue desactivada.');
    } catch (cause) {
      setError(friendlyError(cause, 'No pudimos desactivar 2FA. Volvé a verificar tu sesión e intentá nuevamente.'));
    } finally { setSaving(null); }
  }, [totpFactor]);

  const totpStatus = useMemo(() => totpFactor ? 'Activada' : 'Desactivada', [totpFactor]);

  const handleBack = useCallback(() => {
    navigation.navigate('ExperienceShell', buildSettingsReturnParams(normalizeSettingsOrigin(route.params?.originTab)));
  }, [navigation, route.params?.originTab]);

  const sectionChevron = (section: 'email' | 'password' | 'totp') => (
    <HomePlusIcon
      name={openSection === section ? 'chevron-up-outline' : 'chevron-forward-outline'}
      size={20}
      color={colors.text.muted}
    />
  );

  return (
    <AppScreen scroll padded background="base" bottomInset="none">
      <View style={styles.header}>
        <AppButton variant="icon" size="sm" onPress={handleBack} accessibilityLabel="Volver"><HomePlusIcon name="arrow-back" size={20} color={colors.text.primary} /></AppButton>
        <AppText variant="title3" weight="800">Privacidad y seguridad</AppText>
      </View>

      <AppText variant="caption" weight="700" tone="secondary" style={styles.sectionTitle}>CUENTA</AppText>
      <AppCard variant="default" padding="default" style={styles.card}>
        <Row title="Email" subtitle={user?.email ?? 'Sin email'} rightSlot={sectionChevron('email')} onPress={() => setOpenSection((current) => current === 'email' ? null : 'email')} />
        {openSection === 'email' ? <View style={styles.panel}>
          <AppText variant="caption" tone="secondary">El cambio se confirma desde el nuevo email.</AppText>
          <AppInput label="Nuevo email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <AppButton title="Solicitar cambio de email" loading={saving === 'email'} onPress={() => void changeEmail()} style={styles.action} />
        </View> : null}
      </AppCard>

      <AppText variant="caption" weight="700" tone="secondary" style={styles.sectionTitle}>CONTRASEÑA</AppText>
      <AppCard variant="default" padding="default" style={styles.card}>
        <Row title="Cambiar contraseña" subtitle="Actualizá tu acceso de forma segura" rightSlot={sectionChevron('password')} onPress={() => setOpenSection((current) => current === 'password' ? null : 'password')} />
        {openSection === 'password' ? <View style={styles.panel}>
          <AppInput label="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} containerStyle={styles.field} />
          <AppInput label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <AppButton title="Guardar contraseña" loading={saving === 'password'} onPress={() => void changePassword()} style={styles.action} />
        </View> : null}
      </AppCard>

      <AppText variant="caption" weight="700" tone="secondary" style={styles.sectionTitle}>SEGURIDAD</AppText>
      <AppCard variant="default" padding="default" style={styles.card}>
        <Row title="Autenticación en dos pasos" subtitle={totpStatus} rightSlot={sectionChevron('totp')} onPress={() => setOpenSection((current) => current === 'totp' ? null : 'totp')} />
        {openSection === 'totp' ? <View style={styles.panel}>
          {!totpFactor && !enrollment ? <AppButton title="Activar 2FA" loading={saving === 'totp'} onPress={() => void startTotpEnrollment()} style={styles.action} /> : null}
          {enrollment ? (
            <View style={styles.enrollment}>
              <AppText variant="bodySmall" tone="secondary" align="center">Escaneá este código con Google Authenticator, Authy u otra aplicación compatible.</AppText>
              <View style={styles.qr}><QRCode value={enrollment.uri} size={184} /></View>
              <AppText variant="micro" tone="tertiary" align="center" selectable>También podés ingresar esta clave: {enrollment.secret}</AppText>
              <AppInput label="Código de 6 dígitos" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" maxLength={6} />
              <AppButton title="Verificar y activar" loading={saving === 'totp'} onPress={() => void verifyTotp()} style={styles.action} />
            </View>
          ) : null}
          {totpFactor && !confirmDisable ? <AppButton title="Desactivar 2FA" variant="danger" onPress={() => setConfirmDisable(true)} style={styles.action} /> : null}
          {totpFactor && confirmDisable ? <View style={styles.confirm}><AppText variant="bodySmall" weight="700">¿Desactivar la autenticación en dos pasos?</AppText><View style={styles.confirmActions}><AppButton title="Cancelar" variant="ghost" onPress={() => setConfirmDisable(false)} /><AppButton title="Desactivar" variant="danger" loading={saving === 'disable'} onPress={() => void disableTotp()} /></View></View> : null}
        </View> : null}
      </AppCard>
      {message ? <AppText variant="bodySmall" tone="success" style={styles.message}>{message}</AppText> : null}
      {error ? <AppText variant="bodySmall" tone="danger" style={styles.error}>{error}</AppText> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] },
  card: { marginBottom: spacing[4] },
  sectionTitle: { marginBottom: spacing[2], letterSpacing: 0.5 },
  panel: { gap: spacing[3], paddingTop: spacing[3] },
  field: { marginBottom: spacing[2] },
  action: { alignSelf: 'flex-start' },
  enrollment: { alignItems: 'stretch', gap: spacing[3], marginTop: spacing[2] },
  qr: { alignSelf: 'center', backgroundColor: colors.background.base, padding: spacing[3], borderRadius: radius.md },
  confirm: { gap: spacing[3], padding: spacing[3], backgroundColor: colors.danger.soft, borderRadius: radius.md },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  message: { padding: spacing[3], backgroundColor: colors.success.soft, borderRadius: radius.md, marginBottom: spacing[3] },
  error: { padding: spacing[3], backgroundColor: colors.danger.soft, borderRadius: radius.md, marginBottom: spacing[3] },
});
