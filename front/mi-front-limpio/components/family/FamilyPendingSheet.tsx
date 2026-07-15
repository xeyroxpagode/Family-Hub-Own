import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { AppText, AppCard, AppButton, ActionPill, Skeleton, EmptyState } from '../ui';
import { colors, radius, spacing, shadows } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { RoleRequest, Role, ROLE_LABELS, JoinRequestData, PendingRole } from '../../services/family';
import { isInviteLinkActive } from './inviteLinkUtils';

type FamilyPendingSheetProps = {
  visible: boolean;
  onClose: () => void;
  joinRequests: JoinRequestData[];
  roleRequests: RoleRequest[];
  inviteLinks: Array<{ id: string; token: string; revoked_at?: string | null; expires_at?: string | null }>;
  canReviewJoinRequests: boolean;
  canChangeRoles: boolean;
  canManageMembers: boolean;
  canInvite: boolean;
  currentPersonId: string;
  onApproveJoin: (membershipId: string, role: PendingRole) => Promise<void>;
  onRejectJoin: (membershipId: string) => Promise<void>;
  onApproveRoleRequest: (requestId: string) => Promise<void>;
  onRejectRoleRequest: (requestId: string) => Promise<void>;
  onCancelRoleRequest: (requestId: string) => Promise<void>;
  onCopyInviteLink: () => Promise<void>;
  onRevokeInviteLink?: () => Promise<void>;
  onCreateInviteLink?: () => Promise<void>;
};

type PendingRoleSelection = 'adult' | 'adolescent' | 'child' | 'senior' | 'guest';

const APPROVAL_ROLES: { id: PendingRoleSelection; label: string }[] = [
  { id: 'adult', label: 'Adulto' },
  { id: 'adolescent', label: 'Adolescente' },
  { id: 'child', label: 'Niño' },
  { id: 'senior', label: 'Adulto mayor' },
  { id: 'guest', label: 'Invitado' },
];

export const FamilyPendingSheet: React.FC<FamilyPendingSheetProps> = ({
  visible,
  onClose,
  joinRequests,
  roleRequests,
  inviteLinks,
  canReviewJoinRequests,
  canChangeRoles,
  canManageMembers,
  canInvite,
  currentPersonId,
  onApproveJoin,
  onRejectJoin,
  onApproveRoleRequest,
  onRejectRoleRequest,
  onCancelRoleRequest,
  onCopyInviteLink,
  onRevokeInviteLink,
  onCreateInviteLink,
}) => {
  const [roleByRequest, setRoleByRequest] = useState<Record<string, PendingRoleSelection>>({});
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);

  const pendingJoinRequests = joinRequests.filter((r) => r.status === 'pending');
  const pendingRoleRequests = roleRequests.filter((r) => r.status === 'pending');
  const hasActiveInviteLink = inviteLinks.some(isInviteLinkActive);

  const handleApproveJoin = async (request: JoinRequestData) => {
    const role = roleByRequest[request.membership_id] ?? 'adult';
    setActingRequestId(request.membership_id);
    await onApproveJoin(request.membership_id, role);
    setActingRequestId(null);
  };

  const handleRejectJoin = async (request: JoinRequestData) => {
    setActingRequestId(request.membership_id);
    await onRejectJoin(request.membership_id);
    setActingRequestId(null);
  };

  const handleApproveRoleRequest = async (request: RoleRequest) => {
    setActingRequestId(request.id);
    await onApproveRoleRequest(request.id);
    setActingRequestId(null);
  };

  const handleRejectRoleRequest = async (request: RoleRequest) => {
    setActingRequestId(request.id);
    await onRejectRoleRequest(request.id);
    setActingRequestId(null);
  };

  const handleCancelRoleRequest = async (request: RoleRequest) => {
    Alert.alert(
      'Cancelar solicitud',
      '¿Seguro que querés cancelar esta solicitud de cambio de rol?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: async () => {
            setActingRequestId(request.id);
            await onCancelRoleRequest(request.id);
            setActingRequestId(null);
          },
        },
      ],
    );
  };

  const handleCopyInvite = async () => {
    setInviteActionLoading(true);
    await onCopyInviteLink();
    setInviteActionLoading(false);
  };

  const handleRevokeInvite = async () => {
    Alert.alert(
      'Revocar invitación',
      '¿Seguro que querés revocar este link de invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            setInviteActionLoading(true);
            if (onRevokeInviteLink) {
              await onRevokeInviteLink();
            }
            setInviteActionLoading(false);
          },
        },
      ],
    );
  };

  const handleCreateInvite = async () => {
    setInviteActionLoading(true);
    if (onCreateInviteLink) {
      await onCreateInviteLink();
    }
    setInviteActionLoading(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <AppText variant="title2">Pendientes</AppText>
        <AppButton title="Cerrar" variant="ghost" size="sm" onPress={onClose} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {canReviewJoinRequests && pendingJoinRequests.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <HomePlusIcon name="person-add" size={18} color={colors.terracotta[600]} />
              <AppText variant="title3">Solicitudes de ingreso</AppText>
            </View>

            {pendingJoinRequests.map((request) => {
              const selectedRole = roleByRequest[request.membership_id] ?? 'adult';
              const acting = actingRequestId === request.membership_id;

              return (
                <AppCard key={request.membership_id} variant="warning" padding="default" style={styles.item}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <AppText variant="body" weight="600">
                        {request.display_name}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        Solicitó unirse
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.rolePills}>
                    {APPROVAL_ROLES.map((role) => (
                      <ActionPill
                        key={role.id}
                        label={role.label}
                        selected={selectedRole === role.id}
                        disabled={acting}
                        onPress={() =>
                          setRoleByRequest((current) => ({ ...current, [request.membership_id]: role.id }))
                        }
                      />
                    ))}
                  </View>

                  <View style={styles.actionsRow}>
                    <AppButton
                      title="Aprobar"
                      variant="primary"
                      size="sm"
                      loading={acting}
                      onPress={() => handleApproveJoin(request)}
                      style={styles.actionButton}
                    />
                    <AppButton
                      title="Rechazar"
                      variant="danger"
                      size="sm"
                      disabled={acting}
                      onPress={() => handleRejectJoin(request)}
                      style={styles.actionButton}
                    />
                  </View>
                </AppCard>
              );
            })}
          </View>
        ) : null}

        {canChangeRoles && pendingRoleRequests.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <HomePlusIcon name="ribbon" size={18} color={colors.sage[600]} />
              <AppText variant="title3">Cambios de rol</AppText>
            </View>

            {pendingRoleRequests.map((request) => {
              const isOwnRequest = request.person_id === currentPersonId;
              const acting = actingRequestId === request.id;

              return (
                <AppCard key={request.id} variant="quiet" padding="default" style={styles.item}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <AppText variant="body" weight="600">
                        {request.display_name}
                      </AppText>
                      <View style={styles.roleChangeRow}>
                        <AppText variant="bodySmall" tone="secondary">
                          {ROLE_LABELS[request.current_role]}
                        </AppText>
                        <AppText variant="bodySmall" tone="secondary">→</AppText>
                        <AppText variant="bodySmall" weight="600" tone="primary">
                          {ROLE_LABELS[request.requested_role]}
                        </AppText>
                      </View>
                      {request.reason ? (
                        <AppText variant="caption" tone="tertiary" style={styles.reason}>
                          {`“${request.reason}”`}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.roleActionsRow}>
                    {isOwnRequest ? (
                      <AppButton
                        title="Cancelar"
                        variant="ghost"
                        size="sm"
                        loading={acting}
                        onPress={() => handleCancelRoleRequest(request)}
                      />
                    ) : (
                      <>
                        <AppButton
                          title="Aprobar"
                          variant="primary"
                          size="sm"
                          loading={acting}
                          onPress={() => handleApproveRoleRequest(request)}
                          style={styles.actionButton}
                        />
                        <AppButton
                          title="Rechazar"
                          variant="danger"
                          size="sm"
                          disabled={acting}
                          onPress={() => handleRejectRoleRequest(request)}
                          style={styles.actionButton}
                        />
                      </>
                    )}
                  </View>
                </AppCard>
              );
            })}
          </View>
        ) : null}

        {canInvite ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <HomePlusIcon name="person-add" size={18} color={colors.terracotta[600]} />
              <AppText variant="title3">Invitación</AppText>
            </View>

            <AppCard variant="quiet" padding="default" style={styles.item}>
              {hasActiveInviteLink ? (
                <>
                  <AppText variant="bodySmall" tone="secondary" style={styles.inviteDescription}>
                    Compartí el link de invitación para que personas se sumen al hogar.
                  </AppText>
                  <View style={styles.inviteActions}>
                    <AppButton
                      title="Copiar link"
                      variant="primary"
                      size="sm"
                      loading={inviteActionLoading}
                      onPress={handleCopyInvite}
                    />
                    {canManageMembers ? (
                      <AppButton
                        title="Revocar"
                        variant="ghost"
                        size="sm"
                        loading={inviteActionLoading}
                        onPress={handleRevokeInvite}
                      />
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <AppText variant="bodySmall" tone="secondary" style={styles.inviteDescription}>
                    No hay un link de invitación activo. Creá uno para compartir.
                  </AppText>
                  <AppButton
                    title="Invitar miembro"
                    variant="primary"
                    size="sm"
                    loading={inviteActionLoading}
                    onPress={handleCreateInvite}
                  />
                </>
              )}
            </AppCard>
          </View>
        ) : null}

        {pendingJoinRequests.length === 0 && pendingRoleRequests.length === 0 ? (
          <AppCard variant="quiet" padding="generous">
            <EmptyState
              title="No hay solicitudes pendientes."
              description="Cuando alguien solicite ingreso o un cambio de rol, aparecerá acá."
            />
          </AppCard>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    ...shadows.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  content: {
    maxHeight: '100%',
  },
  section: {
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  item: {
    gap: spacing[3],
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  requestInfo: {
    flex: 1,
    gap: spacing[1],
  },
  roleChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  reason: {
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  rolePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  roleActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionButton: {
    flex: 1,
  },
  inviteDescription: {
    marginBottom: spacing[3],
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
