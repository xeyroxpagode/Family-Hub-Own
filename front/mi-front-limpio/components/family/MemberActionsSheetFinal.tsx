import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import type { Role } from '../../services/family';
import { ActionSheet, AppAvatar, AppButton, AppText } from '../ui';
import { getRoleCapability, getRoleDescription, getRoleIcon, getRoleLabel, RoleBadge } from './RoleBadge';

type MemberActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  memberName: string;
  memberRole: string;
  memberPersonId?: string;
  currentPersonId?: string;
  canChangeRoles: boolean;
  canManageMembers: boolean;
  currentRole: string;
  onRemove: () => void | string | null | Promise<void | string | null>;
  onChangeRole?: (newRole: string) => void | string | null | Promise<void | string | null>;
  onRequestRoleChange?: (newRole: string) => void | string | null | Promise<void | string | null>;
};

const AVAILABLE_ROLES: Role[] = ['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest'];

const friendlyRoleError = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('coordinator') || normalized.includes('coordinador')) {
    return 'El hogar necesita al menos un coordinador.';
  }
  return message;
};

export const MemberActionsSheet: React.FC<MemberActionsSheetProps> = ({
  visible,
  onClose,
  memberName,
  memberRole,
  memberPersonId,
  currentPersonId,
  canChangeRoles,
  canManageMembers,
  onRemove,
  onChangeRole,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = React.useState<string>(memberRole);
  const [savingRole, setSavingRole] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setSelectedRole(memberRole);
      setInlineError(null);
      setSavingRole(false);
      setRemoving(false);
    }
  }, [memberRole, visible]);

  if (!visible) return null;

  const isSelf = Boolean(memberPersonId && currentPersonId && memberPersonId === currentPersonId);
  const hasRoleChanged = selectedRole !== memberRole;
  const canSaveRole = canChangeRoles && Boolean(onChangeRole);
  const canRemove = canManageMembers && !isSelf;
  const closeDisabled = savingRole || removing;
  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  const runRoleChange = async () => {
    if (!onChangeRole || !hasRoleChanged) return;

    setSavingRole(true);
    setInlineError(null);

    try {
      const errorMessage = await onChangeRole(selectedRole);
      if (typeof errorMessage === 'string' && errorMessage.length > 0) {
        setInlineError(friendlyRoleError(errorMessage));
      } else {
        onClose();
      }
    } catch {
      setInlineError('No pudimos cambiar el rol. Intentá de nuevo.');
    } finally {
      setSavingRole(false);
    }
  };

  const handleSaveRole = () => {
    if (selectedRole === 'coordinator' && selectedRole !== memberRole) {
      Alert.alert(
        'Cambiar a Coordinador',
        'Esta persona podrá invitar miembros, cambiar roles y quitar personas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: () => void runRoleChange() },
        ],
      );
      return;
    }

    void runRoleChange();
  };

  const handleRemove = () => {
    Alert.alert(
      'Quitar del hogar',
      `${memberName} dejará de ver la información compartida de este hogar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            setInlineError(null);
            try {
              const errorMessage = await onRemove();
              if (typeof errorMessage === 'string' && errorMessage.length > 0) {
                setInlineError(friendlyRoleError(errorMessage));
              } else {
                onClose();
              }
            } catch {
              setInlineError('No pudimos quitar a esta persona. Intentá de nuevo.');
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ActionSheet
      visible={visible}
      title="Integrante"
      onRequestClose={requestClose}
      closeDisabled={closeDisabled}
      size="content"
    >
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing[5] }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.memberHeader}>
              <AppAvatar name={memberName} size="md" />
              <View style={styles.memberText}>
                <View style={styles.nameRow}>
                  <AppText variant="title3" numberOfLines={1} style={styles.memberName}>
                    {memberName}
                  </AppText>
                  {isSelf ? <View style={styles.selfPill}><AppText variant="micro" tone="success" weight="700">Vos</AppText></View> : null}
                </View>
                <RoleBadge role={memberRole} size="regular" />
              </View>
            </View>

            <View style={styles.section}>
              <AppText variant="body" weight="700">Rol en el hogar</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleOptions}>
                {AVAILABLE_ROLES.map((role) => {
                  const selected = selectedRole === role;
                  return (
                    <Pressable
                      key={role}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: savingRole || !canSaveRole }}
                      disabled={savingRole || !canSaveRole}
                      onPress={() => setSelectedRole(role)}
                      style={({ pressed }) => [
                        styles.roleOption,
                        selected && styles.roleOptionSelected,
                        pressed && !savingRole ? styles.roleOptionPressed : null,
                        !canSaveRole ? styles.roleOptionDisabled : null,
                      ]}
                    >
                      <HomePlusIcon
                        name={getRoleIcon(role)}
                        size={17}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="caption" weight="700" numberOfLines={1}>
                        {getRoleLabel(role)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.roleDetail}>
                <AppText variant="bodySmall" weight="700">{getRoleDescription(selectedRole)}</AppText>
                <AppText variant="bodySmall" tone="secondary">{getRoleCapability(selectedRole)}</AppText>
              </View>

              {inlineError ? (
                <AppText variant="bodySmall" tone="danger" style={styles.inlineError}>
                  {inlineError}
                </AppText>
              ) : null}

              {canSaveRole ? (
                <AppButton
                  title="Guardar cambio"
                  variant={hasRoleChanged ? 'primary' : 'secondary'}
                  size="md"
                  loading={savingRole}
                  disabled={!hasRoleChanged || savingRole}
                  onPress={handleSaveRole}
                  style={styles.saveButton}
                />
              ) : null}
            </View>

            {canRemove ? (
              <View style={styles.accessSection}>
                <View style={styles.accessCopy}>
                  <AppText variant="body" weight="700">Acceso al hogar</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    Esta acción quita el acceso a la información compartida.
                  </AppText>
                </View>
                <AppButton
                  title="Quitar del hogar"
                  variant="ghost"
                  size="sm"
                  loading={removing}
                  disabled={removing}
                  onPress={handleRemove}
                  textStyle={styles.removeText}
                  style={styles.removeButton}
                />
              </View>
            ) : null}
          </ScrollView>
    </ActionSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: '100%',
  },
  contentContainer: {
    padding: spacing[5],
    gap: spacing[5],
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  memberText: {
    flex: 1,
    gap: spacing[2],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  memberName: {
    flexShrink: 1,
  },
  selfPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.success.soft,
  },
  section: {
    gap: spacing[3],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[5],
  },
  roleOption: {
    minHeight: 44,
    minWidth: 116,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
  },
  roleOptionSelected: {
    borderColor: colors.terracotta[300],
    backgroundColor: colors.terracotta[50],
  },
  roleOptionPressed: {
    opacity: 0.86,
  },
  roleOptionDisabled: {
    opacity: 0.72,
  },
  roleDetail: {
    gap: spacing[1],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  inlineError: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.danger.soft,
  },
  saveButton: {
    alignSelf: 'stretch',
  },
  accessSection: {
    gap: spacing[3],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accessCopy: {
    gap: spacing[1],
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  removeText: {
    color: colors.danger.text,
  },
});
