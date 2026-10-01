import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, AppCard, AppButton, Skeleton, EmptyState } from '../ui';
import { colors, radius, spacing } from '../../constants/theme';
import { FamilyData, FamilyMember } from '../../services/family';
import { HomePlusIcon } from '../../constants/icons';
import { MemberRow } from './MemberRow';
import { isInviteLinkActive } from './inviteLinkUtils';

type FamilyMembersCardProps = {
  familyData: FamilyData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onMemberAction?: (member: FamilyMember) => void;
  onPendingPress: () => void;
  onInvitePress: () => void;
};

export const FamilyMembersCard: React.FC<FamilyMembersCardProps> = ({
  familyData,
  loading,
  error,
  onRetry,
  onMemberAction,
  onPendingPress,
  onInvitePress,
}) => {
  const current_member = familyData?.current_member ?? null;
  const members = familyData?.members ?? [];
  const join_requests = familyData?.join_requests ?? [];
  const role_requests = familyData?.role_requests ?? [];
  const invite_links = familyData?.invite_links ?? [];
  const activeMembers = members.filter((member) => member.status === 'active');
  const inactiveMembers = members.filter((member) => member.status !== 'active');
  const pendingJoinRequests = join_requests.filter((r) => r.status === 'pending');
  const pendingRoleRequests = role_requests.filter((r) => r.status === 'pending');

  const pendingCount = pendingJoinRequests.length + pendingRoleRequests.length;

  const hasActiveInviteLink = invite_links.some(isInviteLinkActive);

  const handleInvite = () => {
    onInvitePress();
  };

  if (loading) {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.card}>
          <View style={styles.header}>
            <Skeleton variant="line" width={120} height={24} />
            <Skeleton variant="line" width={80} height={20} />
          </View>
          <Skeleton variant="line" width={200} height={16} />
          <View style={styles.membersList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.memberSkeleton}>
                <Skeleton variant="avatar" />
                <View style={{ flex: 1 }}>
                  <Skeleton variant="line" width={150} height={18} />
                  <Skeleton variant="line" width={100} height={14} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.emptyCard}>
          <AppText variant="body" tone="danger">
            {error}
          </AppText>
          <AppButton title="Reintentar" size="sm" onPress={onRetry} />
        </View>
      </AppCard>
    );
  }

  if (!familyData) {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.emptyCard}>
          <EmptyState
            title="No pudimos encontrar el hogar activo."
            description="Reintenta cargar la familia para sincronizar tus datos."
          />
          <AppButton title="Reintentar" size="sm" onPress={onRetry} />
        </View>
      </AppCard>
    );
  }

  if (!current_member) {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.emptyCard}>
          <EmptyState
            title="No pudimos encontrar tu membresía activa."
            description="Reintenta cargar la familia para sincronizar tus permisos."
          />
          <AppButton title="Reintentar" size="sm" onPress={onRetry} />
        </View>
      </AppCard>
    );
  }

  if (current_member.status === 'pending') {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.emptyCard}>
          <EmptyState
            title="Solicitud pendiente"
            description="Tu acceso al hogar todavía está esperando aprobación."
          />
          <AppButton title="Reintentar" size="sm" onPress={onRetry} />
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard variant="quiet" padding="generous">
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="title3">Miembros</AppText>
            <View style={styles.metaRow}>
              <AppText variant="bodySmall" tone="secondary">
                {activeMembers.length} integrante{activeMembers.length !== 1 ? 's' : ''}
              </AppText>
              {pendingCount > 0 ? (
                <>
                  <View style={styles.metaDot} />
                  <AppText variant="bodySmall" tone="secondary">
                    {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
                  </AppText>
                </>
              ) : null}
            </View>
            <View style={styles.inviteStatusRow}>
              <View style={[styles.statusDot, hasActiveInviteLink ? styles.statusDotActive : styles.statusDotMuted]} />
              <AppText variant="caption" tone="tertiary">
                {hasActiveInviteLink ? 'Link activo' : 'Sin invitación activa'}
              </AppText>
            </View>
          </View>
        </View>

        {current_member.can_invite ? (
          <AppButton
            title="Invitar miembro"
            variant="secondary"
            size="sm"
            onPress={handleInvite}
            leftSlot={<HomePlusIcon name="person-add" size={16} color={colors.terracotta[600]} />}
            style={styles.inviteAction}
          />
        ) : null}

        <View style={styles.pendingSummary}>
          <View style={styles.pendingHeader}>
            <View style={styles.pendingTitleRow}>
              <HomePlusIcon name="time-outline" size={16} color={colors.text.tertiary} />
              <AppText variant="bodySmall" weight="700">
                Solicitudes pendientes
              </AppText>
            </View>
            {pendingCount > 0 ? (
              <AppButton title="Revisar" variant="ghost" size="sm" onPress={onPendingPress} style={styles.reviewButton} />
            ) : null}
          </View>
          {pendingCount > 0 ? (
            <View style={styles.pendingPreviewList}>
              {pendingJoinRequests.slice(0, 1).map((request) => (
                <AppText key={request.membership_id} variant="caption" tone="secondary" numberOfLines={1}>
                  Ingreso · {request.display_name}
                </AppText>
              ))}
              {pendingRoleRequests.slice(0, 1).map((request) => (
                <AppText key={request.id} variant="caption" tone="secondary" numberOfLines={1}>
                  Cambio de rol · {request.display_name}
                </AppText>
              ))}
              {pendingCount > 2 ? (
                <AppText variant="caption" tone="tertiary">
                  {pendingCount - 2} más por revisar
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText variant="caption" tone="tertiary">
              Sin solicitudes pendientes
            </AppText>
          )}
        </View>

        <View style={styles.membersList}>
          {activeMembers.length === 0 ? (
            <EmptyState
              title="Aún no hay miembros"
              description="Cuando alguien se sume al hogar, lo vas a ver aquí."
            />
          ) : (
            activeMembers.map((member) => (
              <MemberRow
                key={member.membership_id}
                member={member}
                isSelf={member.person_id === current_member.person_id}
                canManageMembers={current_member.can_manage_members}
                canChangeRoles={current_member.can_change_roles}
                onAction={current_member.can_manage_members || current_member.can_change_roles ? () => onMemberAction?.(member) : undefined}
                showActions={current_member.can_manage_members || current_member.can_change_roles}
              />
            ))
          )}
          {inactiveMembers.length > 0 ? (
            <View style={styles.pendingBlock}>
              <AppText variant="caption" tone="tertiary" weight="700">
                Solicitudes pendientes
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                Revisalas desde el panel de pendientes.
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
    flexWrap: 'wrap',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.muted,
  },
  inviteStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  statusDotActive: {
    backgroundColor: colors.success.base,
  },
  statusDotMuted: {
    backgroundColor: colors.border.strong,
  },
  inviteAction: {
    alignSelf: 'flex-start',
  },
  pendingSummary: {
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  pendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  reviewButton: {
    minHeight: 32,
  },
  pendingPreviewList: {
    gap: spacing[1],
  },
  membersList: {
    gap: spacing[2],
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[2],
  },
  pendingBlock: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing[1],
  },
  memberSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
});
