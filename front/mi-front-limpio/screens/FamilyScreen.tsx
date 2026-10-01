import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppScreen } from '../components/ui';
import { spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import {
  FamilyMembersCard,
  FamilyViewSegmentedControl,
  FamilyPendingSheet,
  MemberActionsSheet,
  InviteLinkSheet,
  FamilySnackbar,
  type FamilySnackbarType,
  type FamilyLottieSlot,
  getRoleLabel,
} from '../components/family';
import { buildInviteDeepLink, isInviteLinkActive, normalizeInviteLink } from '../components/family/inviteLinkUtils';
import {
  type FamilyData,
  type FamilyMember,
  type PendingRole,
  type Role,
  getHouseholdFamily,
  finalizeMember,
  updateMemberRole,
  requestRoleChange,
  approveRoleChange,
  rejectRoleChange,
  cancelMyRoleRequest,
} from '../services/family';
import { createInvitation, revokeInvitation, type Invitation } from '../services/invitations';
import { FamilyMapPanel } from './presence/PresenceScreen';
import { upsertById } from '../services/core/collectionState';

const reactiveLog = (event: string, details: Record<string, unknown>) => {
  if (__DEV__) console.log(`[ReactiveQA] ${event}`, details);
};

export const FamilyScreen = () => {
  const { session, authMe, authMeLoading, replaceMembershipProjection } = useAuth();
  const { currentHousehold, members: householdMembers } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const authMeActiveHouseholdId = authMe?.active_household?.id ?? authMe?.person?.active_household_id ?? null;
  const householdId = currentHousehold?.id ?? authMeActiveHouseholdId ?? null;

  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingSheetVisible, setPendingSheetVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [inviteLinkVisible, setInviteLinkVisible] = useState(false);
  const [localInviteLink, setLocalInviteLink] = useState<Invitation | null>(null);
  const [activeTab, setActiveTab] = useState<'people' | 'map'>('people');
  const [feedback, setFeedback] = useState<{
    type: FamilySnackbarType;
    message: string;
    detail?: string;
    lottieSlot?: FamilyLottieSlot;
  } | null>(null);

  const showFeedback = useCallback((nextFeedback: {
    type: FamilySnackbarType;
    message: string;
    detail?: string;
    lottieSlot?: FamilyLottieSlot;
  }) => {
    setFeedback(nextFeedback);
  }, []);

  const showErrorFeedback = useCallback((message: string) => {
    showFeedback({
      type: 'error',
      message,
    });
  }, [showFeedback]);

  const updateFamilyData = useCallback((update: (current: FamilyData) => FamilyData) => {
    setFamilyData((current) => (current ? update(current) : current));
  }, []);

  const liveFamilyData = React.useMemo(() => {
    if (!familyData) return null;
    const roleByMembershipId = new Map(householdMembers.map((member) => [member.id, member.rol]));
    const toFamilyRole = (role: typeof householdMembers[number]['rol']): Role | null => {
      if (role === 'coordinador') return 'coordinator';
      if (role === 'adulto') return 'adult';
      if (role === 'adolescente') return 'adolescent';
      if (role === 'adulto_mayor') return 'senior';
      return null;
    };
    return {
      ...familyData,
      members: familyData.members.map((member) => {
        const role = roleByMembershipId.get(member.membership_id);
        return role ? { ...member, role: toFamilyRole(role) ?? member.role } : member;
      }),
    };
  }, [familyData, householdMembers]);

  const loadFamily = useCallback(async () => {
    if (!householdId) {
      setFamilyData(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setFamilyData(null);
      setError('Tu sesión expiró. Inicia sesión nuevamente.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getHouseholdFamily(accessToken, householdId);

    if (fetchError) {
      setError(fetchError);
      setFamilyData(null);
    } else if (data) {
      setFamilyData(data);
    } else {
      setFamilyData(null);
    }

    setLoading(false);
  }, [accessToken, householdId]);

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  const handleRetry = () => {
    void loadFamily();
  };

  const handleMemberAction = useCallback((member: FamilyMember) => {
    setSelectedMember(member);
  }, []);

  const handleMemberSheetClose = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handlePendingPress = useCallback(() => {
    setPendingSheetVisible(true);
  }, []);

  const handleInvitePress = useCallback(async () => {
    setInviteLinkVisible(true);
  }, []);

  const handleCreateInviteFromSheet = useCallback(async (): Promise<Invitation | string | null> => {
    if (!householdId) return 'No pudimos encontrar el hogar activo.';

    try {
      const { invitation, error: inviteError } = await createInvitation(householdId);

      if (inviteError) {
        return inviteError;
      } else if (invitation) {
        reactiveLog('api.success', { module: 'family', action: 'create-invite', id: invitation.id });
        setLocalInviteLink(invitation);
        updateFamilyData((current) => ({
          ...current,
          invite_links: upsertById(current.invite_links, invitation),
        }));
        return invitation;
      }
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos crear la invitación.';
      return msg;
    }
  }, [householdId, updateFamilyData]);

  const handleCopyInviteLink = useCallback(async () => {
    if (!familyData?.invite_links) return;

    const activeLink = familyData.invite_links.find(isInviteLinkActive);

    if (activeLink) {
      const normalized = normalizeInviteLink(activeLink);
      const inviteUrl = normalized.displayValue ?? (normalized.token ? buildInviteDeepLink(normalized.token) : null);

      if (inviteUrl) Alert.alert('Link de invitación', inviteUrl);
    }
  }, [familyData?.invite_links]);

  const handleRevokeInviteLink = useCallback(async () => {
    if (!householdId || !familyData?.invite_links) return 'No pudimos encontrar el hogar activo.';

    const activeLink = familyData.invite_links.find(isInviteLinkActive);

    if (activeLink) {
      try {
        const { invitation, error } = await revokeInvitation(householdId, activeLink.id);
        if (error) return error;
        if (invitation) {
          reactiveLog('api.success', { module: 'family', action: 'revoke-invite', id: invitation.id });
          updateFamilyData((current) => ({
            ...current,
            invite_links: upsertById(current.invite_links, invitation),
          }));
        }
        showFeedback({
          type: 'success',
          message: 'Link desactivado',
          detail: 'El link dejó de dar acceso al hogar.',
          lottieSlot: 'link_revoked',
        });
        setLocalInviteLink(null);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'No pudimos revocar el link.';
      }
    }

    return 'No encontramos un link activo para desactivar.';
  }, [householdId, familyData?.invite_links, showFeedback, updateFamilyData]);

  const handleApproveJoin = useCallback(async (membershipId: string, role: PendingRole) => {
    if (!householdId) return;

    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { approveJoinRequest } = await import('../services/api');
      const response = await approveJoinRequest(accessToken, householdId, membershipId, role);
      reactiveLog('api.success', { module: 'family', action: 'approve-join', id: membershipId });
      updateFamilyData((current) => {
        const request = current.join_requests.find((entry) => entry.membership_id === membershipId);
        const member = request ? {
          membership_id: response.membership.id,
          person_id: response.membership.person_id,
          display_name: request.display_name,
          first_name: null,
          last_name: null,
          avatar_url: request.avatar_url,
          phone: null,
          date_of_birth: null,
          role: (response.membership.role ?? role) as Role,
          status: response.membership.status as FamilyMember['status'],
          joined_at: response.membership.joined_at,
          created_at: response.membership.created_at,
        } satisfies FamilyMember : null;
        return {
          ...current,
          join_requests: current.join_requests.filter((entry) => entry.membership_id !== membershipId),
          members: member
            ? current.members.some((entry) => entry.membership_id === member.membership_id)
              ? current.members.map((entry) => entry.membership_id === member.membership_id ? member : entry)
              : [...current.members, member]
            : current.members,
        };
      });
      showFeedback({
        type: 'success',
        message: 'Solicitud aprobada',
        detail: 'La persona ya puede participar del hogar.',
        lottieSlot: 'request_approved',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos aprobar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, showFeedback, showErrorFeedback, updateFamilyData]);

  const handleRejectJoin = useCallback(async (membershipId: string) => {
    if (!householdId) return;

    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { rejectJoinRequest } = await import('../services/api');
      await rejectJoinRequest(accessToken, householdId, membershipId);
      reactiveLog('api.success', { module: 'family', action: 'reject-join', id: membershipId });
      updateFamilyData((current) => ({
        ...current,
        join_requests: current.join_requests.filter((entry) => entry.membership_id !== membershipId),
      }));
      showFeedback({
        type: 'info',
        message: 'Solicitud rechazada',
        detail: 'La solicitud quedó cerrada.',
        lottieSlot: 'request_rejected',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos rechazar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, showFeedback, showErrorFeedback, updateFamilyData]);

  const handleApproveRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { data: roleRequest, error: actionError } = await approveRoleChange(accessToken, householdId, requestId);
      if (actionError) {
        showErrorFeedback(actionError);
        return;
      }
      showFeedback({
        type: 'success',
        message: 'Cambio aprobado',
        detail: 'El rol fue actualizado en el hogar.',
        lottieSlot: 'role_updated',
      });
      if (roleRequest) {
        reactiveLog('api.success', { module: 'family', action: 'approve-role', id: roleRequest.id });
        updateFamilyData((current) => ({
          ...current,
          role_requests: upsertById(current.role_requests, roleRequest),
          members: current.members.map((member) => member.membership_id === roleRequest.membership_id
            ? { ...member, role: roleRequest.requested_role }
            : member),
        }));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos aprobar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, showFeedback, showErrorFeedback, updateFamilyData]);

  const handleRejectRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { data: roleRequest, error: actionError } = await rejectRoleChange(accessToken, householdId, requestId);
      if (actionError) {
        showErrorFeedback(actionError);
        return;
      }
      showFeedback({
        type: 'info',
        message: 'Cambio rechazado',
        detail: 'La solicitud de rol quedó cerrada.',
        lottieSlot: 'role_rejected',
      });
      if (roleRequest) {
        reactiveLog('api.success', { module: 'family', action: 'reject-role', id: roleRequest.id });
        updateFamilyData((current) => ({ ...current, role_requests: upsertById(current.role_requests, roleRequest) }));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos rechazar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, showFeedback, showErrorFeedback, updateFamilyData]);

  const handleCancelRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { data: roleRequest, error: actionError } = await cancelMyRoleRequest(accessToken, householdId, requestId);
      if (actionError) {
        showErrorFeedback(actionError);
        return;
      }
      showFeedback({
        type: 'info',
        message: 'Solicitud cancelada',
        detail: 'El pedido de cambio ya no está pendiente.',
        lottieSlot: 'role_request_cancelled',
      });
      if (roleRequest) {
        reactiveLog('api.success', { module: 'family', action: 'cancel-role', id: roleRequest.id });
        updateFamilyData((current) => ({ ...current, role_requests: upsertById(current.role_requests, roleRequest) }));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos cancelar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, showFeedback, showErrorFeedback, updateFamilyData]);

  const handleRemoveMember = useCallback(async () => {
    if (!householdId || !selectedMember) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { data: finalizedMember, error: actionError } = await finalizeMember(accessToken, householdId, selectedMember.membership_id);
      if (actionError) return actionError;

      showFeedback({
        type: 'success',
        message: 'Miembro quitado del hogar',
        detail: `${selectedMember.display_name} ya no tiene acceso a este hogar.`,
        lottieSlot: 'member_removed',
      });
      if (finalizedMember) {
        reactiveLog('api.success', { module: 'family', action: 'finalize-member', id: finalizedMember.id });
        updateFamilyData((current) => ({
          ...current,
          members: current.members.filter((member) => member.membership_id !== finalizedMember.id),
        }));
        setSelectedMember(null);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos quitar el miembro.';
    }
  }, [accessToken, householdId, selectedMember, showFeedback, updateFamilyData]);

  const handleChangeMemberRole = useCallback(async (newRole: string) => {
    if (!householdId || !selectedMember) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { data: updatedMember, error: actionError } = await updateMemberRole(
        accessToken,
        householdId,
        selectedMember.membership_id,
        newRole as 'coordinator' | 'adult' | 'adolescent' | 'child' | 'senior' | 'guest',
      );
      if (actionError) {
        return actionError;
      }
      const roleLabel = getRoleLabel(newRole as Role);
      showFeedback({
        type: 'success',
        message: 'Rol actualizado',
        detail: `${selectedMember.display_name} ahora es ${roleLabel}.`,
        lottieSlot: 'role_updated',
      });
      if (updatedMember) {
        reactiveLog('api.success', { module: 'family', action: 'update-role', id: updatedMember.id });
        updateFamilyData((current) => ({
          ...current,
          members: current.members.map((member) => member.membership_id === updatedMember.id
            ? { ...member, role: (updatedMember.role ?? newRole) as Role, status: updatedMember.status as FamilyMember['status'] }
            : member),
        }));
        setSelectedMember((current) => current?.membership_id === updatedMember.id
          ? { ...current, role: (updatedMember.role ?? newRole) as Role, status: updatedMember.status as FamilyMember['status'] }
          : current);
        if (updatedMember.id === authMe?.memberships.find((membership) => membership.household_id === householdId)?.id) {
          replaceMembershipProjection(updatedMember);
        }
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos actualizar el rol.';
    }
  }, [accessToken, authMe?.memberships, householdId, replaceMembershipProjection, selectedMember, showFeedback, updateFamilyData]);

  const handleRequestRoleChange = useCallback(async (newRole: string) => {
    if (!householdId) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { data: roleRequest, error: actionError } = await requestRoleChange(
        accessToken,
        householdId,
        newRole as 'coordinator' | 'adult' | 'adolescent' | 'child' | 'senior' | 'guest',
      );
      if (actionError) {
        return actionError;
      }
      showFeedback({
        type: 'success',
        message: 'Solicitud enviada',
        detail: 'El pedido de cambio de rol quedó pendiente.',
        lottieSlot: 'role_updated',
      });
      if (roleRequest) {
        reactiveLog('api.success', { module: 'family', action: 'request-role', id: roleRequest.id });
        updateFamilyData((current) => ({ ...current, role_requests: upsertById(current.role_requests, roleRequest) }));
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos enviar la solicitud.';
    }
  }, [accessToken, householdId, showFeedback, updateFamilyData]);

  const currentMember = familyData?.current_member;
  const hasPermissions = currentMember?.can_manage_members || currentMember?.can_change_roles;

  const activeInviteLink = familyData?.invite_links?.find(isInviteLinkActive) ?? null;
  const effectiveInviteLink = activeInviteLink ?? localInviteLink;
  const normalizedInvite = normalizeInviteLink(effectiveInviteLink);
  const inviteUrl = normalizedInvite.url ?? null;
  const isMapActive = activeTab === 'map';

  return (
    <AppScreen
      scroll={false}
      padded={false}
      bottomInset="none"
      background="base"
      safeAreaEdges={['left', 'right']}
      contentContainerStyle={styles.sectionContent}
    >
      <View style={styles.sectionRoot}>
        {isMapActive ? (
          <FamilyMapPanel embedded />
        ) : (
          <ScrollView
            style={styles.peopleScroll}
            contentContainerStyle={styles.peopleContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FamilyMembersCard
              familyData={liveFamilyData}
              loading={loading || authMeLoading}
              error={error}
              onRetry={handleRetry}
              onMemberAction={handleMemberAction}
              onPendingPress={handlePendingPress}
              onInvitePress={handleInvitePress}
            />
          </ScrollView>
        )}

        <View pointerEvents="box-none" style={styles.familyViewSelectorRail}>
          <View pointerEvents="auto">
            <FamilyViewSegmentedControl activeTab={activeTab} onChange={setActiveTab} />
          </View>
        </View>
      </View>

      {liveFamilyData ? (
          <>
            <FamilyPendingSheet
              visible={pendingSheetVisible}
              onClose={() => setPendingSheetVisible(false)}
              joinRequests={liveFamilyData.join_requests ?? []}
              roleRequests={liveFamilyData.role_requests ?? []}
              inviteLinks={liveFamilyData.invite_links ?? []}
              canReviewJoinRequests={currentMember?.can_review_join_requests ?? false}
              canChangeRoles={currentMember?.can_change_roles ?? false}
              canManageMembers={currentMember?.can_manage_members ?? false}
              canInvite={currentMember?.can_invite ?? false}
              currentPersonId={currentMember?.person_id ?? ''}
              onApproveJoin={handleApproveJoin}
              onRejectJoin={handleRejectJoin}
              onApproveRoleRequest={handleApproveRoleRequest}
              onRejectRoleRequest={handleRejectRoleRequest}
              onCancelRoleRequest={handleCancelRoleRequest}
              onCopyInviteLink={handleCopyInviteLink}
              onRevokeInviteLink={hasPermissions ? async () => { await handleRevokeInviteLink(); } : undefined}
              onCreateInviteLink={handleInvitePress}
            />
            <InviteLinkSheet
              visible={inviteLinkVisible}
              onClose={() => setInviteLinkVisible(false)}
              inviteUrl={inviteUrl}
              inviteToken={normalizedInvite.token ?? null}
              inviteLink={effectiveInviteLink}
              hasActiveLink={Boolean(effectiveInviteLink)}
              onCreateInvite={handleCreateInviteFromSheet}
              onRevokeInviteLink={hasPermissions ? handleRevokeInviteLink : undefined}
              canRevoke={hasPermissions}
            />
          </>
      ) : null}

      <MemberActionsSheet
        visible={Boolean(selectedMember)}
        onClose={handleMemberSheetClose}
        memberName={selectedMember?.display_name ?? ''}
        memberRole={selectedMember?.role ?? ''}
        memberPersonId={selectedMember?.person_id}
        currentPersonId={currentMember?.person_id}
        canChangeRoles={currentMember?.can_change_roles ?? false}
        canManageMembers={currentMember?.can_manage_members ?? false}
        currentRole={currentMember?.role ?? ''}
        onRemove={handleRemoveMember}
        onChangeRole={handleChangeMemberRole}
        onRequestRoleChange={handleRequestRoleChange}
      />

      <FamilySnackbar
        visible={Boolean(feedback)}
        type={feedback?.type ?? 'success'}
        message={feedback?.message ?? ''}
        detail={feedback?.detail}
        lottieSlot={feedback?.lottieSlot}
        onDismiss={() => setFeedback(null)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionContent: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionRoot: {
    flex: 1,
    position: 'relative',
  },
  peopleScroll: {
    flex: 1,
  },
  peopleContent: {
    paddingTop: 68,
    paddingHorizontal: spacing[5],
    paddingBottom: 112,
  },
  familyViewSelectorRail: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    right: spacing[2],
    alignItems: 'center',
    zIndex: 5,
    elevation: 5,
  },
});
