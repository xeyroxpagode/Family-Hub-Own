import React, { useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useNavigation } from '@react-navigation/native';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, shadows, typography } from '../../constants/theme';
import { setActiveHousehold, getUserHouseholds, type UserHousehold } from '../../services/api';
import { normalizeUserHouseholds, getHouseholdCountByStatus } from '../../utils/householdUtils';
import { runHouseholdSwitch } from '../../services/core/lifecycle';

export type HouseholdSwitcherSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  accessToken: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  coordinator: 'Coordinador',
  adult: 'Adulto',
  adolescent: 'Adolescente',
  senior: 'Adulto mayor',
  child: 'Niño',
  guest: 'Invitado',
};

function getRoleDisplay(role: string): { label: string; color: string; bg: string } {
  const roleLower = role.toLowerCase();
  const mapping: Record<string, { label: string; color: string; bg: string }> = {
    coordinator: { label: 'Coordinador', color: colors.terracotta[600], bg: colors.terracotta[50] },
    adult: { label: 'Adulto', color: colors.sage[600], bg: colors.sage[50] },
    adolescent: { label: 'Adolescente', color: colors.info.text, bg: colors.info.soft },
    senior: { label: 'Adulto mayor', color: colors.sand[600], bg: colors.sand[50] },
    child: { label: 'Niño', color: colors.sage[600], bg: colors.sage[50] },
    guest: { label: 'Invitado', color: colors.text.tertiary, bg: colors.surface.soft },
  };
  return mapping[roleLower] ?? { label: role, color: colors.text.tertiary, bg: colors.surface.soft };
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  finalized: 'Finalizado',
  suspended: 'Suspendido',
};

export function HouseholdSwitcherSheet({ visible, onRequestClose, accessToken }: HouseholdSwitcherSheetProps) {
  const { refetchMe, authMe } = useAuth();
  const { currentHousehold } = useHousehold();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [households, setHouseholds] = useState<UserHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  React.useEffect(() => {
    if (visible) {
      void loadHouseholds();
    }
  }, [visible]);

  const loadHouseholds = useCallback(async () => {
    console.log('[H042.3I][Switcher] visible', visible)
    console.log('[H042.3I][Switcher] accessToken?', Boolean(accessToken))
    console.log('[H042.3I][Switcher] authMe active_household_id', authMe?.person?.active_household_id)
    
    if (!accessToken) {
      Alert.alert('Sesion', 'No pudimos preparar tu sesion. Volvé a intentar.');
      return;
    }

    setLoading(true);
    setUsingFallback(false);

    try {
      const response = await getUserHouseholds(accessToken);
      const rawHouseholds = response.households ?? [];
      console.log('[H042.3I][Switcher] getUserHouseholds raw', rawHouseholds)
      const normalized = normalizeUserHouseholds(rawHouseholds, currentHousehold?.id);
      console.log('[H042.3I][Switcher] normalized', normalized)
      setHouseholds(normalized);

      if (normalized.length === 0 && authMe?.memberships && authMe.memberships.length > 0) {
        console.warn('[HouseholdSwitcherSheet] getUserHouseholds devolvió vacío, usando fallback de authMe');
        const fallbackHouseholds: UserHousehold[] = authMe.memberships.map(m => ({
          household_id: m.household_id,
          household_name: authMe.active_household?.name || 'Hogar',
          role: m.role || 'adult',
          status: m.status || 'active',
        }));
        const normalizedFallback = normalizeUserHouseholds(fallbackHouseholds, currentHousehold?.id);
        setHouseholds(normalizedFallback);
        setUsingFallback(true);
      }
    } catch (error) {
      console.error('[HouseholdSwitcherSheet] Error cargando hogares:', error);
      if (authMe?.memberships && authMe.memberships.length > 0) {
        console.warn('[HouseholdSwitcherSheet] Usando fallback de authMe después de error');
        const fallbackHouseholds: UserHousehold[] = authMe.memberships.map(m => ({
          household_id: m.household_id,
          household_name: authMe.active_household?.name || 'Hogar',
          role: m.role || 'adult',
          status: m.status || 'active',
        }));
        const normalizedFallback = normalizeUserHouseholds(fallbackHouseholds, currentHousehold?.id);
        setHouseholds(normalizedFallback);
        setUsingFallback(true);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentHousehold?.id, authMe]);

  const handleSwitchHousehold = useCallback(async (householdId: string) => {
    if (!accessToken || !currentHousehold) return;

    const currentId = currentHousehold.id;
    if (householdId === currentId) {
      onRequestClose();
      return;
    }

    setLoading(true);
    try {
      await runHouseholdSwitch({
        fromHouseholdId: currentId,
        toHouseholdId: householdId,
        activate: async () => {
          const result = await setActiveHousehold(accessToken, householdId);
          await refetchMe();
          return result;
        },
      });
      onRequestClose();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No pudimos cambiar de hogar. Intentá de nuevo.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentHousehold, refetchMe, onRequestClose]);

  const handlePendingHousehold = useCallback((householdId: string, status: string) => {
    if (status === 'pending') {
      Alert.alert(
        'Solicitud pendiente',
        'Tu solicitud para unirte a este hogar está esperando aprobación. El coordinador debe aprobarla primero.',
        [{ text: 'Entendido' }]
      );
    }
  }, []);

  const handleCreateHousehold = useCallback(() => {
    onRequestClose();
    navigation.navigate('P02CrearGrupo');
  }, [navigation, onRequestClose]);

  const activeHouseholdId = currentHousehold?.id;
  const counts = getHouseholdCountByStatus(households);
  const totalMemberships = counts.total;
  const canCreateMore = totalMemberships < 5;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <AppText variant="title3" weight="800">
              Cambiar hogar
            </AppText>
            <AppButton
              variant="ghost"
              size="sm"
              onPress={onRequestClose}
              title="Cerrar"
            />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing[4] }]}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.emptyState}>
                <AppText variant="bodySmall" tone="tertiary" align="center" style={{ marginTop: spacing[2] }}>
                  Cargando hogares...
                </AppText>
              </View>
            ) : households.length === 0 ? (
              <AppCard variant="quiet" padding="generous">
                <View style={styles.emptyState}>
                  <HomePlusIcon name="home-outline" size={32} color={colors.text.tertiary} />
                  <AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[2] }}>
                    {usingFallback && authMe?.active_household
                      ? 'Mostrando tu hogar actual'
                      : 'No hay hogares disponibles.'}
                  </AppText>
                  {usingFallback && authMe?.active_household && (
                    <AppText variant="micro" tone="tertiary" align="center" style={{ marginTop: spacing[1] }}>
                      {authMe.active_household.name}
                    </AppText>
                  )}
                </View>
              </AppCard>
            ) : (
              <View style={styles.householdList}>
                {households.map((household) => {
                  const isActive = household.household_id === activeHouseholdId;
                  const roleInfo = getRoleDisplay(household.role);
                  const isPending = household.status === 'pending';

                  return (
                    <Pressable
                      key={household.household_id}
                      onPress={() => {
                        if (isPending) {
                          handlePendingHousehold(household.household_id, household.status);
                        } else {
                          void handleSwitchHousehold(household.household_id);
                        }
                      }}
                      disabled={isActive || loading || isPending}
                      style={({ pressed }) => [
                        styles.householdCard,
                        { opacity: isActive || loading || isPending ? 0.7 : pressed ? 0.9 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${household.household_name}, ${roleInfo.label}${isActive ? ' (Actual)' : ''}`}
                    >
                      <View style={styles.householdRow}>
                        <View
                          style={[
                            styles.householdAvatar,
                            { backgroundColor: isActive ? colors.terracotta[50] : colors.surface.soft },
                          ]}
                        >
                          <HomePlusIcon
                            name="home-outline"
                            size={24}
                            color={isActive ? colors.terracotta[600] : colors.text.tertiary}
                          />
                        </View>

                        <View style={styles.householdInfo}>
                          <View style={styles.householdNameRow}>
                            <AppText variant="body" weight="700">
                              {household.household_name}
                            </AppText>
                            {isActive && (
                              <View style={styles.activeBadge}>
                                <AppText variant="micro" tone="success" weight="700">
                                  Actual
                                </AppText>
                              </View>
                            )}
                          </View>

<View style={styles.roleRow}>
                            <View
                              style={[
                                styles.roleChip,
                                { backgroundColor: roleInfo.bg, borderColor: roleInfo.bg },
                              ]}
                            >
                              <HomePlusIcon name="ribbon-outline" size={12} color={roleInfo.color} />
                              <AppText
                                variant="micro"
                                tone="secondary"
                                weight="700"
                                style={{ color: roleInfo.color, marginLeft: spacing[1] }}
                              >
                                {roleInfo.label}
                              </AppText>
                            </View>
                            {isPending && (
                              <View style={styles.pendingBadge}>
                                <AppText variant="micro" tone="warning" weight="700">
                                  Pendiente
                                </AppText>
                              </View>
                            )}
                          </View>
                        </View>

                        {!isActive && !isPending && (
                          <HomePlusIcon
                            name="chevron-forward-outline"
                            size={20}
                            color={colors.text.tertiary}
                            style={styles.chevron}
                          />
                        )}
                      </View>
                    </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Acción Crear otro hogar */}
                <View style={{ marginTop: spacing[4], paddingBottom: spacing[2] }}>
                  <Pressable
                    onPress={handleCreateHousehold}
                    disabled={!canCreateMore}
                    style={({ pressed }) => [
                      styles.createHouseholdButton,
                      { opacity: canCreateMore ? (pressed ? 0.86 : 1) : 0.5 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={canCreateMore ? 'Crear otro hogar' : 'Límite de hogares alcanzado'}
                  >
                    <HomePlusIcon
                      name={canCreateMore ? 'add-circle-outline' : 'lock-closed'}
                      size={20}
                      color={canCreateMore ? colors.terracotta[600] : colors.text.tertiary}
                    />
                    <AppText
                      variant="bodySmall"
                      weight="700"
                      style={{ color: canCreateMore ? colors.terracotta[600] : colors.text.tertiary, marginLeft: spacing[2] }}
                    >
                      {canCreateMore ? 'Crear otro hogar' : 'Límite de hogares alcanzado'}
                    </AppText>
                  </Pressable>
                </View>
              </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 32, 26, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    minHeight: 280,
    maxHeight: '85%',
    ...shadows.sheet,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  content: {
    maxHeight: 500,
  },
  contentContainer: {
    padding: spacing[4],
    gap: spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  householdList: {
    gap: spacing[2],
  },
  householdCard: {
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  householdAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdInfo: {
    flex: 1,
    gap: spacing[1],
  },
  householdNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing[1],
  },
  activeBadge: {
    backgroundColor: colors.success.soft,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  pendingBadge: {
    backgroundColor: colors.warning.soft,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  chevron: {
    opacity: 0.6,
  },
  createHouseholdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing[2],
  },
});
