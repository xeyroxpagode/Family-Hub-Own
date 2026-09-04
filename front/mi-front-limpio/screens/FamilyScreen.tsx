import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppText, AppScreen, SegmentedControl } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { HomePlusIcon } from '../constants/icons';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import {
  FamilyMembersCard,
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

export const FamilyScreen = () => {
  const navigation = useNavigation<any>();
  const { session, authMe, authMeLoading } = useAuth();
  const { currentHousehold } = useHousehold();
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
        setLocalInviteLink(invitation);
        await loadFamily();
        return invitation;
      }
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos crear la invitación.';
      return msg;
    }
  }, [householdId, loadFamily]);

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
        const { error } = await revokeInvitation(householdId, activeLink.id);
        if (error) return error;
        showFeedback({
          type: 'success',
          message: 'Link desactivado',
          detail: 'El link dejó de dar acceso al hogar.',
          lottieSlot: 'link_revoked',
        });
        await loadFamily();
        setLocalInviteLink(null);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'No pudimos revocar el link.';
      }
    }

    return 'No encontramos un link activo para desactivar.';
  }, [householdId, familyData?.invite_links, loadFamily, showFeedback]);

  const handleApproveJoin = useCallback(async (membershipId: string, role: PendingRole) => {
    if (!householdId) return;

    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { approveJoinRequest } = await import('../services/api');
      await approveJoinRequest(accessToken, householdId, membershipId, role);
      showFeedback({
        type: 'success',
        message: 'Solicitud aprobada',
        detail: 'La persona ya puede participar del hogar.',
        lottieSlot: 'request_approved',
      });
      await loadFamily();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos aprobar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, loadFamily, showFeedback, showErrorFeedback]);

  const handleRejectJoin = useCallback(async (membershipId: string) => {
    if (!householdId) return;

    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { rejectJoinRequest } = await import('../services/api');
      await rejectJoinRequest(accessToken, householdId, membershipId);
      showFeedback({
        type: 'info',
        message: 'Solicitud rechazada',
        detail: 'La solicitud quedó cerrada.',
        lottieSlot: 'request_rejected',
      });
      await loadFamily();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos rechazar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, loadFamily, showFeedback, showErrorFeedback]);

  const handleApproveRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { error: actionError } = await approveRoleChange(accessToken, householdId, requestId);
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
      await loadFamily();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos aprobar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, loadFamily, showFeedback, showErrorFeedback]);

  const handleRejectRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { error: actionError } = await rejectRoleChange(accessToken, householdId, requestId);
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
      await loadFamily();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos rechazar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, loadFamily, showFeedback, showErrorFeedback]);

  const handleCancelRoleRequest = useCallback(async (requestId: string) => {
    if (!householdId) return;
    if (!accessToken) {
      showErrorFeedback('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    try {
      const { error: actionError } = await cancelMyRoleRequest(accessToken, householdId, requestId);
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
      await loadFamily();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No pudimos cancelar la solicitud.';
      showErrorFeedback(msg);
    }
  }, [accessToken, householdId, loadFamily, showFeedback, showErrorFeedback]);

  const handleRemoveMember = useCallback(async () => {
    if (!householdId || !selectedMember) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { error: actionError } = await finalizeMember(accessToken, householdId, selectedMember.membership_id);
      if (actionError) return actionError;

      showFeedback({
        type: 'success',
        message: 'Miembro quitado del hogar',
        detail: `${selectedMember.display_name} ya no tiene acceso a este hogar.`,
        lottieSlot: 'member_removed',
      });
      await loadFamily();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos quitar el miembro.';
    }
  }, [accessToken, householdId, selectedMember, loadFamily, showFeedback]);

  const handleChangeMemberRole = useCallback(async (newRole: string) => {
    if (!householdId || !selectedMember) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { error: actionError } = await updateMemberRole(
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
      await loadFamily();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos actualizar el rol.';
    }
  }, [accessToken, householdId, selectedMember, loadFamily, showFeedback]);

  const handleRequestRoleChange = useCallback(async (newRole: string) => {
    if (!householdId) return 'No pudimos encontrar el hogar activo.';
    if (!accessToken) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    try {
      const { error: actionError } = await requestRoleChange(
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
      await loadFamily();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'No pudimos enviar la solicitud.';
    }
  }, [accessToken, householdId, loadFamily, showFeedback]);

  const currentMember = familyData?.current_member;
  const hasPermissions = currentMember?.can_manage_members || currentMember?.can_change_roles;

  const activeInviteLink = familyData?.invite_links?.find(isInviteLinkActive) ?? null;
  const effectiveInviteLink = activeInviteLink ?? localInviteLink;
  const normalizedInvite = normalizeInviteLink(effectiveInviteLink);
  const inviteUrl = normalizedInvite.url ?? null;

  return (
    <AppScreen scroll bottomInset="tab" background="base" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver a Más"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <AppText variant="title1">Familia</AppText>
           <AppText variant="bodySmall" tone="secondary">
             Integrantes, invitaciones y ubicación compartida.
          </AppText>
        </View>
      </View>

       <SegmentedControl
         value={activeTab}
         onChange={setActiveTab}
         options={[
           { value: 'people', label: 'Personas' },
           { value: 'map', label: 'Mapa' },
         ]}
       />

       {activeTab === 'people' ? (
         <FamilyMembersCard
           familyData={familyData}
           loading={loading || authMeLoading}
           error={error}
           onRetry={handleRetry}
           onMemberAction={handleMemberAction}
           onPendingPress={handlePendingPress}
           onInvitePress={handleInvitePress}
         />
       ) : null}

       {activeTab === 'map' ? (
         <FamilyMapPanel embedded />
       ) : null}

      {familyData ? (
          <>
            <FamilyPendingSheet
              visible={pendingSheetVisible}
              onClose={() => setPendingSheetVisible(false)}
              joinRequests={familyData.join_requests ?? []}
              roleRequests={familyData.role_requests ?? []}
              inviteLinks={familyData.invite_links ?? []}
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
  content: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
});
