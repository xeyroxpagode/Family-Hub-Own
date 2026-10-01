import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ExperienceModeSetting } from '../components/experience/ExperienceModeSetting';
import { updatePeopleMe, updatePeopleAvatar, type UpdatePeoplePayload, getUserHouseholds } from '../services/api';
import { normalizeUserHouseholds } from '../utils/householdUtils';
import { AppScreen } from '../components/ui/AppScreen';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppAvatar } from '../components/ui/AppAvatar';
import { HomePlusIcon } from '../constants/icons';
import {
  colors,
  spacing,
  radius,
} from '../constants/theme';
import type { UserHousehold } from '../services/api';

const ROLE_LABELS: Record<string, string> = {
  coordinator: 'Coordinador',
  adult: 'Adulto',
  adolescent: 'Adolescente',
  senior: 'Adulto mayor',
  child: 'Niño',
  guest: 'Invitado',
};

const ROLE_BG: Record<string, { bg: string; text: string }> = {
  coordinator: { bg: colors.terracotta[50], text: colors.terracotta[600] },
  adult: { bg: colors.sage[50], text: colors.sage[600] },
  adolescent: { bg: colors.info.soft, text: colors.info.text },
  senior: { bg: colors.sand[50], text: colors.sand[600] },
  child: { bg: colors.sage[50], text: colors.sage[600] },
  guest: { bg: colors.surface.soft, text: colors.text.tertiary },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  finalized: 'Finalizado',
  suspended: 'Suspendido',
};

function yyyymmddToDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToYyyymmdd(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || d.length !== 2 || m.length !== 2 || y.length !== 4) return null;
  return `${y}-${m}-${d}`;
}

function humanBirthday(iso: string): string {
  if (!iso) return 'Agregar cumpleaños';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

function displayLabel(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) return fallback;
  return value;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, session, signOut, authMe, replacePersonProjection } = useAuth();
  const [households, setHouseholds] = useState<UserHousehold[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDateOfBirthDisplay, setEditDateOfBirthDisplay] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const person = authMe?.person;
  const activeHouseholdId = authMe?.active_household?.id;

  React.useEffect(() => {
    void loadHouseholds();
  }, [authMe]);

  const loadHouseholds = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingHouseholds(true);
    try {
      const response = await getUserHouseholds(session.access_token);
      const rawHouseholds = response.households ?? [];
      const normalized = normalizeUserHouseholds(rawHouseholds, activeHouseholdId);
      setHouseholds(normalized);
    } catch (error) {
      console.error('[ProfileScreen] Error cargando hogares:', error);
    } finally {
      setLoadingHouseholds(false);
    }
  }, [session, activeHouseholdId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const myName = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim()
    || person?.display_name
    || user?.user_metadata?.nombre
    || 'Usuario';
  const myEmail = user?.email ?? '—';
  const myPhone = person?.phone ?? null;
  const myDateOfBirth = person?.date_of_birth ?? null;
  const myFirstName = person?.first_name ?? null;
  const myLastName = person?.last_name ?? null;

  const openEditModal = useCallback(() => {
    setEditFirstName(person?.first_name ?? '');
    setEditLastName(person?.last_name ?? '');
    setEditPhone(person?.phone ?? '');
    setEditDateOfBirthDisplay(person?.date_of_birth ? yyyymmddToDisplay(person.date_of_birth) : '');
    setFieldErrors({});
    setShowEditModal(true);
  }, [person]);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setFieldErrors({});
  }, []);

  const validateFields = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!editFirstName.trim()) {
      errors.first_name = 'El nombre es obligatorio';
    }

    if (!editLastName.trim()) {
      errors.last_name = 'El apellido es obligatorio';
    }

    if (editPhone.trim() && editPhone.trim().length < 7) {
      errors.phone = 'Revisá el número de teléfono';
    }

    if (editDateOfBirthDisplay.trim()) {
      const converted = displayToYyyymmdd(editDateOfBirthDisplay);
      if (!converted) {
        errors.date_of_birth = 'Usá el formato DD/MM/AAAA';
      } else {
        const birthDate = new Date(converted + 'T00:00:00');
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (isNaN(birthDate.getTime()) || age < 0 || age > 120) {
          errors.date_of_birth = 'Usá el formato DD/MM/AAAA';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editFirstName, editLastName, editPhone, editDateOfBirthDisplay]);

  const handleSaveProfile = useCallback(async () => {
    if (!session?.access_token) {
      setFieldErrors({ general: 'No hay sesión activa. Intenta cerrar y volver a iniciar.' });
      return;
    }

    if (!validateFields()) return;

    setEditing(true);

    let finalDateOfBirth: string | null = null;
    if (editDateOfBirthDisplay.trim()) {
      finalDateOfBirth = displayToYyyymmdd(editDateOfBirthDisplay);
    }

    const payload: UpdatePeoplePayload = {
      display_name: `${editFirstName.trim()} ${editLastName.trim()}`.trim(),
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      phone: editPhone.trim() || null,
      date_of_birth: finalDateOfBirth,
    };

    try {
      const response = await updatePeopleMe(session.access_token, payload);
      replacePersonProjection(response.person);
      closeEditModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos guardar tus cambios.';
      setFieldErrors({ general: message });
    } finally {
      setEditing(false);
    }
  }, [session, editFirstName, editLastName, editPhone, editDateOfBirthDisplay, validateFields, replacePersonProjection, closeEditModal]);

  const handleAvatarChange = useCallback(async () => {
    if (!session?.access_token || uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFieldErrors({ general: permission.canAskAgain ? 'Necesitamos acceso a tus fotos para actualizar el avatar.' : 'Activá el acceso a Fotos desde la configuración del dispositivo.' });
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    setUploadingAvatar(true);
    setFieldErrors({});
    try {
      const response = await updatePeopleAvatar(session.access_token, {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      replacePersonProjection(response.person);
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : 'No pudimos actualizar la foto.' });
    } finally {
      setUploadingAvatar(false);
    }
  }, [replacePersonProjection, session?.access_token, uploadingAvatar]);

  const visibleHouseholds = useMemo(() => {
    const current = authMe?.active_household;
    if (!current || households.some((household) => household.household_id === current.id)) return households;
    const membership = authMe?.memberships.find((item) => item.household_id === current.id);
    return [{
      household_id: current.id,
      household_name: current.name,
      role: membership?.role ?? 'adult',
      status: membership?.status ?? 'active',
    }, ...households];
  }, [authMe?.active_household, authMe?.memberships, households]);

  const handleSignOut = useCallback(() => {
    signOut();
  }, [signOut]);

  // ── Helper row component ────────────────────────────────────────────────
  const ProfileRow = ({
    label,
    value,
    placeholder,
  }: {
    label: string;
    value: string;
    placeholder?: string;
  }) => (
    <View style={S.infoRow}>
      <AppText variant="micro" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </AppText>
      <AppText variant="bodySmall" tone={value === placeholder ? 'tertiary' : 'primary'} weight="500">
        {value}
      </AppText>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <AppScreen scroll padded background="base" bottomInset="none">
      {/* Header simple */}
      <View style={S.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={S.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <HomePlusIcon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="title3" weight="800">
          Perfil
        </AppText>
      </View>

      {/* ── Hero Card ──────────────────────────────────────────────────── */}
      <AppCard variant="elevated" padding="generous" style={{ marginBottom: spacing[4] }}>
        <View style={{ alignItems: 'center', gap: spacing[3] }}>
          <AppAvatar imageUrl={person?.avatar_url} name={myName} size="lg" showBorder onPress={() => void handleAvatarChange()} accessibilityLabel="Cambiar foto de perfil" />
          <AppButton title={uploadingAvatar ? 'Actualizando foto...' : 'Cambiar foto'} variant="ghost" size="sm" disabled={uploadingAvatar} onPress={() => void handleAvatarChange()} />

          {/* Name */}
          <AppText variant="title3" weight="800" align="center">
            {myName}
          </AppText>

          {/* Email */}
          <AppText variant="bodySmall" tone="tertiary" align="center">
            {myEmail}
          </AppText>
        </View>
      </AppCard>

      {/* ── Datos personales ────────────────────────────────────────────── */}
      <AppCard variant="default" padding="default" style={{ marginBottom: spacing[4] }}>
        <AppText variant="caption" weight="700" tone="secondary" style={{ marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Datos personales
        </AppText>

        <ProfileRow label="Nombre" value={displayLabel(myFirstName, 'Sin completar')} placeholder="Sin completar" />
        <ProfileRow label="Apellido" value={displayLabel(myLastName, 'Sin completar')} placeholder="Sin completar" />
        <ProfileRow label="Teléfono" value={displayLabel(myPhone, 'Agregar teléfono')} placeholder="Agregar teléfono" />
        <ProfileRow label="Cumpleaños" value={humanBirthday(myDateOfBirth ?? '')} placeholder="Agregar cumpleaños" />

        <AppButton
          title="Editar perfil"
          variant="secondary"
          size="sm"
          onPress={openEditModal}
          style={{ marginTop: spacing[3], alignSelf: 'flex-start' }}
        />
      </AppCard>

      <View style={{ marginBottom: spacing[4] }}>
        <ExperienceModeSetting />
      </View>

      {/* ── Hogares ─────────────────────────────────────────────────────── */}
      <AppCard variant="default" padding="default" style={{ marginBottom: spacing[4] }}>
        <AppText variant="caption" weight="700" tone="secondary" style={{ marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Hogares
        </AppText>

        {loadingHouseholds && visibleHouseholds.length === 0 ? (
          <View style={{ paddingVertical: spacing[4], alignItems: 'center' }}>
            <AppText variant="bodySmall" tone="tertiary">Cargando hogares...</AppText>
          </View>
        ) : visibleHouseholds.length === 0 ? (
          <View style={{ paddingVertical: spacing[4] }}>
            <AppText variant="bodySmall" tone="tertiary">No estás en ningún hogar todavía.</AppText>
          </View>
        ) : (
          <View style={{ gap: spacing[2] }}>
            {visibleHouseholds.slice(0, 3).map((h) => {
              const roleInfo = ROLE_LABELS[h.role] ?? h.role;
              const statusInfo = h.status ? STATUS_LABELS[h.status] : null;
              const isCurrent = h.household_id === activeHouseholdId;
              const roleBg = ROLE_BG[h.role] ?? { bg: colors.surface.soft, text: colors.text.tertiary };

              return (
                <View key={h.household_id} style={S.householdRow}>
                  <View style={S.householdInfo}>
                    <View style={S.householdNameRow}>
                      <AppText variant="bodySmall" weight="700">
                        {h.household_name}
                      </AppText>
                      {isCurrent && (
                        <View style={S.activeBadge}>
                          <AppText variant="micro" tone="success" weight="700">
                            Actual
                          </AppText>
                        </View>
                      )}
                    </View>
                    <View style={S.roleRow}>
                      <View
                        style={[
                          S.roleChip,
                          { backgroundColor: roleBg.bg, borderColor: roleBg.bg },
                        ]}
                      >
                        <AppText variant="micro" style={{ color: roleBg.text, fontWeight: '600' }}>
                          {roleInfo}
                        </AppText>
                      </View>
                      {statusInfo && (
                        <AppText variant="micro" tone="tertiary" style={{ marginLeft: spacing[2] }}>
                          · {statusInfo}
                        </AppText>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            </View>
        )}

        {visibleHouseholds.length > 3 && (
          <AppText variant="micro" tone="tertiary" align="center" style={{ marginTop: spacing[2] }}>
            + {visibleHouseholds.length - 3} hogares más
          </AppText>
        )}
      </AppCard>

      {/* ── Cuenta ──────────────────────────────────────────────────────── */}
      <AppCard variant="default" padding="default" style={{ marginBottom: spacing[4] }}>
        <AppText variant="caption" weight="700" tone="secondary" style={{ marginBottom: spacing[3], textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Cuenta
        </AppText>

        <ProfileRow label="Email" value={myEmail} />

        <AppButton
          title="Cerrar sesión"
          variant="danger"
          size="sm"
          onPress={handleSignOut}
          style={{ marginTop: spacing[4], alignSelf: 'flex-start' }}
        />
      </AppCard>

      {/* ── Edit Profile Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            {/* Header */}
            <View style={S.modalHeader}>
              <View style={S.modalHandle} />
              <AppText variant="title3" weight="800" align="center" style={{ marginBottom: spacing[1] }}>
                Editar perfil
              </AppText>
              <AppText variant="bodySmall" tone="tertiary" align="center">
                Actualizá cómo te ven en tu hogar
              </AppText>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[6] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar preview */}
              <View style={{ alignItems: 'center', marginBottom: spacing[5] }}>
                <AppAvatar imageUrl={person?.avatar_url} name={myName} size="lg" showBorder />
              </View>

              {/* General error */}
              {fieldErrors.general ? (
                <View style={S.errorBox}>
                  <AppText variant="bodySmall" tone="danger">
                    {fieldErrors.general}
                  </AppText>
                </View>
              ) : null}

              <AppInput
                label="Nombre *"
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Tu nombre de pila"
                autoCapitalize="words"
                errorText={fieldErrors.first_name}
                containerStyle={{ marginBottom: spacing[3] }}
              />

              {/* Apellido */}
              <AppInput
                label="Apellido *"
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Tu apellido"
                autoCapitalize="words"
                errorText={fieldErrors.last_name}
                containerStyle={{ marginBottom: spacing[3] }}
              />

              {/* Teléfono */}
              <AppInput
                label="Teléfono"
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+54 11 1234 5678"
                keyboardType="phone-pad"
                errorText={fieldErrors.phone}
                containerStyle={{ marginBottom: spacing[3] }}
              />

              {/* Cumpleaños */}
              <AppInput
                label="Cumpleaños"
                value={editDateOfBirthDisplay}
                onChangeText={setEditDateOfBirthDisplay}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                errorText={fieldErrors.date_of_birth}
                helperText={!fieldErrors.date_of_birth ? 'Formato: día/mes/año' : undefined}
                containerStyle={{ marginBottom: spacing[3] }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Cancelar"
                    variant="ghost"
                    onPress={closeEditModal}
                    disabled={editing}
                    size="md"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Guardar cambios"
                    variant="primary"
                    onPress={handleSaveProfile}
                    loading={editing}
                    disabled={editing}
                    size="md"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

// ─── Styles (solo para lo que tokens no cubren automáticamente) ────────────────

const S = StyleSheet.create({
  infoRow: {
    paddingVertical: spacing[3],
    gap: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  householdRow: {
    paddingVertical: spacing[2],
  },
  householdInfo: {
    flex: 1,
  },
  householdNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  activeBadge: {
    backgroundColor: colors.success.soft,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.surface.overlay,
  },
  modalSheet: {
    flex: 1,
    marginTop: 80,
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
    marginBottom: spacing[4],
  },
  errorBox: {
    backgroundColor: colors.danger.soft,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderLeftWidth: 4,
    borderLeftColor: colors.danger.base,
  },
});
