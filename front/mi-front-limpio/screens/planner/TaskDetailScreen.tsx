/**
 * Planner V1 — Task Detail Screen (E1.1 Final)
 *
 * Operational surface for Task:
 * - Shows hierarchical info: title, status/action, date/deadline, ownership, description, checklist, evidence, plan relation, duration, history
 * - Primary action depends on state: Completar / Me encargo / Revisar / Reenviar
 * - Secondary menu: Editar, Reabrir, Archivar, Papelera
 * - Uses shared design language (semantic tokens, AppText, AppButton, Sheet, etc.)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, TouchableOpacity, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import type { PlannerTask } from '../../services/plannerTasks';
import { getTaskById } from '../../services/plannerTasks';
import { getPlannerTaskFulfillmentV1, completePlannerTaskFulfillmentV1, verifyPlannerTaskFulfillmentV1, requestPlannerTaskCorrectionV1, resubmitPlannerTaskFulfillmentV1, revertPlannerTaskFulfillmentV1, reopenPlannerTaskFulfillmentV1, claimPlannerTaskV1, releasePlannerTaskV1, archivePlannerTaskV1, unarchivePlannerTaskV1, submitTaskEvidence, getTaskAuditHistory } from '../../services/plannerTasks';
import { updatePlannerTask } from '../../services/plannerTasks';
import { enqueuePlannerTaskTrash, enqueuePlannerTaskRestore, enqueuePlannerTaskReactivate, enqueuePlannerTaskCancel } from '../../services/planner/reliability';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { AppText, ErrorState, AppButton, ActionSheet } from '../../components/ui';
import { colors, spacing, radius, shadows } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import {
  parsePlannerEntityDetailParams,
  stripEphemeralParams,
  type PlannerEntityDetailParams,
} from '../../navigation/plannerNavigationContract';
import {
  resolvePlannerBackBehavior,
} from '../../navigation/plannerNavigationHelpers';
import { type PlannerTabKey } from '../../navigation/plannerNavigationContract';
import { plannerStyles as S } from './plannerShared';
import { formatDate, formatTime, getTypeDotColor, getTypeLabel, statusLabels, priorityLabels, dateToYMD } from './plannerShared';
import { createIdempotencyKey } from '../../services/idempotency';
import { getTaskEvidenceHistory } from '../../services/plannerTasks';
import { EvidencePhotoPicker } from '../../components/planner/EvidencePhotoPicker';
import { taskToPresetPayload } from '../../services/planner/plannerPresetTaskDomain';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  editBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  overflowBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  content: {
    flex: 1,
    gap: spacing[4],
  },
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  typeDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeDotIcon: {
    fontSize: 20,
    color: colors.text.inverse,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  priorityBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaGrid: {
    gap: spacing[3],
    marginTop: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaIcon: {
    color: colors.text.tertiary,
  },
  metaLabel: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing[2],
  },
  checklistContainer: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  checkboxChecked: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  checkboxText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: '900',
  },
  checklistItemText: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  checklistItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  evidenceSection: {
    gap: spacing[3],
  },
  evidenceAttempt: {
    backgroundColor: colors.surface.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[3],
  },
  evidenceAttemptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  evidenceAttemptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  evidenceAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.terracotta[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceAvatarText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '800',
  },
  evidenceAttemptInfo: {
    gap: 2,
  },
  evidenceAttemptName: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  evidenceAttemptTime: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  evidenceResultBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  evidenceResultText: {
    fontSize: 10,
    fontWeight: '800',
  },
  evidencePhoto: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    marginTop: spacing[2],
  },
  evidenceComment: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing[2],
  },
  correctionComment: {
    color: colors.warning.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.warning.soft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  historySection: {
    gap: spacing[2],
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
    gap: 1,
  },
  historyTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  historyMeta: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  primaryActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[4],
    paddingBottom: spacing[5],
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: 'row',
    gap: spacing[2],
    ...shadows.sheet,
  },
  primaryActionBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  primaryActionBtnSecondary: {
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
  },
  primaryActionText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: '900',
  },
  primaryActionTextSecondary: {
    color: colors.terracotta[600],
    fontSize: 15,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  emptyStateText: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
  },
  actionRow: {
    minHeight: 56,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  evidenceModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  evidenceModalContent: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
    ...shadows.sheet,
    maxHeight: '85%',
  },
});

const priorityColors: Record<string, string> = {
  high: colors.danger.base,
  normal: colors.terracotta[500],
  low: colors.sage[400],
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: colors.sand[50], text: colors.text.secondary },
  completed: { bg: colors.success.soft, text: colors.success.strong },
  awaiting_verification: { bg: colors.sage[50], text: colors.sage[700] },
  verified: { bg: colors.success.soft, text: colors.success.strong },
  cancelled: { bg: colors.surface.soft, text: colors.text.tertiary },
  correction_requested: { bg: colors.warning.soft, text: colors.warning.text },
};

export function TaskDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, authMe } = useAuth();
  const { members, currentHousehold } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const householdId = currentHousehold?.id ?? '';

  const params = useMemo(() => {
    try {
      return parsePlannerEntityDetailParams(route.params);
    } catch {
      return { entityId: '' } as PlannerEntityDetailParams;
    }
  }, [route.params]);

  const entityId = params.entityId;

  const [task, setTask] = useState<PlannerTask | null>(null);
  const [fulfillment, setFulfillment] = useState<any>(null);
  const [evidenceHistory, setEvidenceHistory] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditErrorCode, setAuditErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [pendingFulfillmentId, setPendingFulfillmentId] = useState<string | null>(null);

  const isFocused = useIsFocused();

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !entityId) return;
    if (!silent) setLoading(true);
    setError(null);
    setErrorCode(null);
    setAuditError(null);
    setAuditErrorCode(null);
    // P2.1R: el núcleo (Task) es lo único que puede voltear la pantalla.
    // Las secundarias (fulfillment/evidence/audit) degradan por separado:
    // un 500 de audit no debe destruir el detalle ya cargado.
    try {
      const taskRes = await getTaskById(accessToken, entityId);
      setTask(taskRes.task);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError('No pudimos cargar la tarea.');
      }
      if (!silent) setLoading(false);
      return;
    }
    const [fulfillmentSettled, evidenceSettled, auditSettled] = await Promise.allSettled([
      getPlannerTaskFulfillmentV1(accessToken, entityId),
      getTaskEvidenceHistory(accessToken, entityId),
      getTaskAuditHistory(accessToken, entityId),
    ]);
    if (fulfillmentSettled.status === 'fulfilled') {
      setFulfillment(fulfillmentSettled.value.task);
    }
    if (evidenceSettled.status === 'fulfilled') {
      setEvidenceHistory(evidenceSettled.value.evidence ?? []);
    }
    if (auditSettled.status === 'fulfilled') {
      setAuditHistory(auditSettled.value.audit ?? []);
      setAuditError(null);
      setAuditErrorCode(null);
    } else {
      setAuditHistory([]);
      const reason = auditSettled.reason;
      setAuditError(reason instanceof ApiError ? reason.message : 'No pudimos cargar el historial.');
      setAuditErrorCode(reason instanceof ApiError ? reason.code : null);
    }
    if (!silent) setLoading(false);
  }, [accessToken, entityId]);

  useEffect(() => {
    if (isFocused) {
      void load();
    }
  }, [isFocused, load]);

  useEffect(() => {
    if (!loading && plannerChangedAt > 0) {
      void load(true);
    }
  }, [plannerChangedAt]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleBack = useCallback(() => {
    const action = resolvePlannerBackBehavior({
      returnTo: params.returnTo,
      hasHistory: navigation.canGoBack(),
      fallbackTab: 'tasks' as PlannerTabKey,
    });

    if (action.kind === 'goBack') {
      navigation.goBack();
    } else {
      navigation.navigate('PlannerTab', {
        screen: 'PlannerHome',
        params: action.params,
      });
    }
  }, [navigation, params.returnTo]);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditTask', { taskId: entityId });
  }, [navigation, entityId]);

  useEffect(() => {
    if (params.justCreated) {
      const cleaned = stripEphemeralParams(params);
      navigation.setParams(cleaned);
    }
  }, [params.justCreated, navigation, params]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ padding: spacing[5], alignItems: 'center', paddingTop: spacing[8] }}>
          <ActivityIndicator size="large" color={colors.terracotta[500]} />
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
            Cargando tarea...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !task) {
    const isForbidden = errorCode === 'rls_violation' || errorCode === 'planner_forbidden' || error?.includes('permiso');
    const isNotFound = errorCode === 'task_not_found';
    const title = isForbidden ? 'Sin permiso' : isNotFound ? 'Tarea no encontrada' : 'Error';
    const message = isForbidden
      ? 'No tenes acceso a esta tarea.'
      : isNotFound
      ? 'Esta tarea ya no esta disponible.'
      : error ?? 'No pudimos cargar la tarea.';
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ padding: spacing[5] }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <ErrorState
            description={message}
            onRetry={() => void load()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // P2.1R2: derivado plano, NO hook. Los useMemo debajo de los early
  // returns de loading/error cambiaban el orden de hooks entre renders
  // (crash "Rendered more hooks than during the previous render").
  const activeHouseholdId = authMe?.active_household?.id;
  const myMembershipId = authMe?.memberships.find(
    (membership: any) => membership.household_id === activeHouseholdId && membership.status === 'active',
  )?.id ?? '';

  // P2.1R2: derivado plano por la misma razón (era useMemo post-return).
  const memberMap = new Map<string, { display_name: string; avatar_url?: string | null }>();
  members.forEach((m) => memberMap.set(m.id, { display_name: m.user?.nombre || 'Miembro', avatar_url: m.user?.avatar_url ?? null }));

  // Determine task state from fulfillment aggregate
  const aggregateState = fulfillment?.aggregate?.state ?? task.status;
  const currentFulfillment = fulfillment?.fulfillments?.find((f: any) => !f.retired_at && !f.inactive_at);
  const isClaimable = fulfillment?.availableActions?.some((a: any) => a.action === 'claim') ?? false;
  const isAwaitingVerification = aggregateState === 'awaiting_verification' || task.status === 'awaiting_verification';
  const isCorrectionRequested = aggregateState === 'correction_requested';
  const isVerified = aggregateState === 'verified' || task.status === 'verified';
  const isCompleted = aggregateState === 'completed' || task.status === 'completed';
  const isPending = task.status === 'pending';
  const isCancelled = task.status === 'cancelled';
  const isTrashed = Boolean(task.trashed_at);
  const isArchived = Boolean(task.archived_at);

  // Check if current user holds a claim on a claimable task (assignment_kind = 'members' with single assignee = me)
  const isClaimedByMe = fulfillment?.assignment?.kind === 'members'
    && fulfillment.assignment.assignees?.length === 1
    && fulfillment.assignment.assignees[0]?.id === myMembershipId
    && currentFulfillment?.scope === 'shared'
    && currentFulfillment?.status === 'pending';

  const getMemberName = (memberId: string | null | undefined) => {
    if (!memberId) return null;
    return memberMap.get(memberId)?.display_name || 'Miembro';
  };

  const getMemberInitials = (memberId: string | null | undefined) => {
    const name = getMemberName(memberId);
    return name?.slice(0, 2).toUpperCase() || '--';
  };

  const getMemberAvatar = (memberId: string | null | undefined) => {
    if (!memberId) return null;
    return memberMap.get(memberId)?.avatar_url || null;
  };

  // Primary action based on state
  const getPrimaryAction = () => {
    if (isCancelled) return null;
    if (isTrashed) return null;

    // Release (Devolver) - only when claimed by me and still pending
    if (isClaimedByMe) {
      return { label: 'Devolver', onPress: handleRelease, variant: 'primary', color: colors.terracotta[500] };
    }

    if (isClaimable) {
      return { label: 'Me encargo', onPress: handleClaim, variant: 'primary', color: colors.terracotta[500] };
    }
    if (isPending && currentFulfillment?.status === 'pending') {
      return { label: task.requires_verification ? 'Enviar a revisión' : 'Completar', onPress: handleComplete, variant: 'primary', color: colors.terracotta[500] };
    }
    if (isAwaitingVerification && currentFulfillment?.status === 'awaiting_verification') {
      const canVerify = currentFulfillment.completedBy?.id !== myMembershipId;
      if (canVerify) {
        return { label: 'Verificar', onPress: handleVerify, variant: 'primary', color: colors.terracotta[500] };
      }
    }
    if (isCorrectionRequested && currentFulfillment?.status === 'correction_requested') {
      const isAssignee = currentFulfillment.responsibleMember?.id === myMembershipId;
      if (isAssignee) {
        return { label: 'Reenviar', onPress: handleResubmit, variant: 'primary', color: colors.terracotta[500] };
      }
    }
    if (isCompleted || isVerified) {
      return null; // No primary completion action
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  // P2.1R2: secondaryActions se construye como valor plano DESPUÉS de los
  // handlers (ver abajo, antes del return). Era un useMemo aquí debajo de
  // los early returns → tercer hook condicional. No se memoiza: es barato.

  // Action handlers
  const handleClaim = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;
    setSavingAction('claim');
    try {
      const sharedFulfillment = fulfillment.fulfillments.find((f: any) => f.scope === 'shared' && f.status === 'pending');
      if (!sharedFulfillment) throw new Error('No hay cumplimiento compartido pendiente');
      await claimPlannerTaskV1(accessToken, entityId, fulfillment.assignment.version, { idempotencyKey: createIdempotencyKey('planner.tasks.claim') });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No pudimos tomar la tarea.';
      if (err instanceof ApiError && err.code === 'already_claimed') {
        Alert.alert('Otra persona la tomó', 'La tarea ya fue tomada por alguien más. Se actualizó automáticamente.');
        await load(true);
      } else {
        Alert.alert('Planner', message);
      }
    } finally {
      setSavingAction(null);
    }
  };

  const handleComplete = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;

    const sharedFulfillment = fulfillment.fulfillments.find((f: any) => f.scope === 'shared' && f.status === 'pending');
    if (!sharedFulfillment) {
      Alert.alert('Planner', 'No hay cumplimiento pendiente.');
      return;
    }

    // Check for unchecked checklist items
    const uncheckedCount = task.checklist?.filter((item: any) => !item.checked).length ?? 0;
    const proceedWithCompletion = async () => {
      if (savingAction) return;
      // If verification is required, show evidence picker first
      if (task.requires_verification) {
        setPendingFulfillmentId(sharedFulfillment.id);
        setShowEvidencePicker(true);
        return;
      }

      // Otherwise, complete directly
      setSavingAction('complete');
      try {
        await completePlannerTaskFulfillmentV1(accessToken, entityId, sharedFulfillment.id, sharedFulfillment.version, { idempotencyKey: createIdempotencyKey('planner.tasks.fulfillment.complete') });
        markPlannerChanged();
        await load(true);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'No pudimos completar la tarea.';
        Alert.alert('Planner', message);
      } finally {
        setSavingAction(null);
      }
    };

    if (uncheckedCount > 0) {
      Alert.alert(
        'Quedan elementos sin marcar',
        `Hay ${uncheckedCount} elemento${uncheckedCount > 1 ? 's' : ''} del checklist sin marcar.`,
        [
          { text: 'Volver', style: 'cancel' },
          { text: 'Completar igualmente', onPress: proceedWithCompletion },
        ]
      );
      return;
    }

    await proceedWithCompletion();
  };

  const handleEvidenceSubmit = async (photoUrl: string, comment?: string) => {
    if (savingAction) return;
    if (!accessToken || !pendingFulfillmentId) return;
    setSavingAction('evidence');
    try {
      await submitTaskEvidence(accessToken, entityId, pendingFulfillmentId, { photo_reference: photoUrl, comment });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No pudimos enviar la evidencia.';
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
      setShowEvidencePicker(false);
      setPendingFulfillmentId(null);
    }
  };

  const handleEvidenceCancel = () => {
    setShowEvidencePicker(false);
    setPendingFulfillmentId(null);
  };

  const handleVerify = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;
    setSavingAction('verify');
    try {
      const awaitingFulfillment = fulfillment.fulfillments.find((f: any) => f.status === 'awaiting_verification');
      if (!awaitingFulfillment) throw new Error('No hay cumplimiento por verificar');
      await verifyPlannerTaskFulfillmentV1(accessToken, entityId, awaitingFulfillment.id, awaitingFulfillment.version, { idempotencyKey: createIdempotencyKey('planner.tasks.fulfillment.verify') });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No pudimos verificar la tarea.';
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
    }
  };

  const handleResubmit = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;
    setSavingAction('resubmit');
    try {
      const correctionFulfillment = fulfillment.fulfillments.find((f: any) => f.status === 'correction_requested');
      if (!correctionFulfillment) throw new Error('No hay cumplimiento con corrección pedida');
      await resubmitPlannerTaskFulfillmentV1(accessToken, entityId, correctionFulfillment.id, correctionFulfillment.version, undefined, { idempotencyKey: createIdempotencyKey('planner.tasks.fulfillment.resubmit') });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No pudimos reenviar la tarea.';
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
    }
  };

  const handleTrash = async () => {
    if (savingAction) return;
    if (!accessToken) return;
    Alert.alert(
      '¿Mover a la papelera?',
      'La tarea dejará de aparecer en Planner. Podrás restaurarla desde Papelera.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover a la papelera',
          style: 'destructive',
          onPress: async () => {
            if (savingAction) return;
            setSavingAction('trash');
            try {
              await enqueuePlannerTaskTrash(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.trash') });
              markPlannerChanged();
              await load(true);
              handleBack();
            } catch (err) {
              const message = err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.';
              Alert.alert('Planner', message);
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleRestore = async () => {
    if (savingAction) return;
    if (!accessToken) return;
    setSavingAction('restore');
    try {
      await enqueuePlannerTaskRestore(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.restore') });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo restaurar.';
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
    }
  };

  const handleReactivate = async () => {
    if (savingAction) return;
    if (!accessToken) return;
    Alert.alert(
      '¿Reactivar esta tarea?',
      'La tarea volverá a aparecer en tus tareas activas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar',
          onPress: async () => {
            if (savingAction) return;
            setSavingAction('reactivate');
            try {
              await enqueuePlannerTaskReactivate(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.reactivate') });
              markPlannerChanged();
              await load(true);
            } catch (err) {
              const message = err instanceof ApiError ? err.message : 'No pudimos reactivar la tarea.';
              Alert.alert('Planner', message);
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleRelease = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;
    Alert.alert(
      '¿Devolver la tarea?',
      'La tarea volverá a estar disponible para que cualquiera la tome.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Devolver',
          onPress: async () => {
            if (savingAction) return;
            setSavingAction('release');
            try {
              await releasePlannerTaskV1(accessToken, entityId, fulfillment.assignment.version, { idempotencyKey: createIdempotencyKey('planner.tasks.release') });
              markPlannerChanged();
              await load(true);
            } catch (err) {
              const message = err instanceof ApiError ? err.message : 'No pudimos devolver la tarea.';
              Alert.alert('Planner', message);
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleArchive = async () => {
    if (savingAction) return;
    if (!accessToken) return;
    Alert.alert(
      '¿Archivar la tarea?',
      'La tarea se ocultará de las vistas activas pero se conservará su historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: async () => {
            if (savingAction) return;
            setSavingAction('archive');
            try {
              await archivePlannerTaskV1(accessToken, entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.archive') });
              markPlannerChanged();
              await load(true);
            } catch (err) {
              const message = err instanceof ApiError ? err.message : 'No se pudo archivar la tarea.';
              Alert.alert('Planner', message);
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleUnarchive = async () => {
    if (savingAction) return;
    if (!accessToken) return;
    setSavingAction('unarchive');
    try {
      await unarchivePlannerTaskV1(accessToken, entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.unarchive') });
      markPlannerChanged();
      await load(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo desarchivar la tarea.';
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
    }
  };

  const handleChecklistToggle = async (index: number, checked: boolean) => {
    if (!accessToken || !task.checklist) return;
    const newChecklist = [...task.checklist];
    newChecklist[index] = { ...newChecklist[index], checked };
    setTask((prev) => prev ? { ...prev, checklist: newChecklist } : null);
    try {
      await updatePlannerTask(accessToken, entityId, { checklist: newChecklist, expected_version: task.version });
      markPlannerChanged();
    } catch (err) {
      // Revert on error
      setTask((prev) => prev ? { ...prev, checklist: task.checklist } : null);
      const message = err instanceof ApiError ? err.message : 'No se pudo actualizar el checklist.';
      Alert.alert('Planner', message);
    }
  };

  const openActionMenu = () => {
    setActionSheetVisible(true);
  };

  // P2.2A (contract §17): guardar una Task como preset del hogar. Se abre el
  // editor canónico pre-cargado con la configuración estable de la Task; los
  // campos contextuales (assignee, fecha, hora, Plan, fulfillment, estado)
  // quedan fuera por construcción (`taskToPresetPayload`).
  const handleSaveAsPreset = () => {
    if (!task) return;
    const presetPrefill = taskToPresetPayload(task);
    navigation.navigate('PlannerPresetCreate', { presetPrefill });
  };

  // Secondary actions for menu (valor plano post-handlers; ver nota en primaryAction).
  const secondaryActions: Array<{ label: string; onPress: () => void; icon: HomePlusIconName; destructive?: boolean }> = [];
  if (!isCancelled && !isTrashed) {
    secondaryActions.push({ label: 'Editar', onPress: handleEdit, icon: 'create' });
  }
  if (!isTrashed) {
    secondaryActions.push({ label: 'Guardar como preset', onPress: handleSaveAsPreset, icon: 'bookmark' });
  }
  if ((isCompleted || isVerified) && !isTrashed) {
    if (isArchived) {
      secondaryActions.push({ label: 'Desarchivar', onPress: handleUnarchive, icon: 'archive' });
    } else {
      secondaryActions.push({ label: 'Archivar', onPress: handleArchive, icon: 'archive' });
    }
  }
  if (isCancelled && !isTrashed) {
    secondaryActions.push({ label: 'Reactivar', onPress: handleReactivate, icon: 'refresh' });
  }
  if (!isTrashed) {
    secondaryActions.push({ label: 'Mover a la papelera', onPress: handleTrash, icon: 'trash', destructive: true });
  } else {
    secondaryActions.push({ label: 'Restaurar', onPress: handleRestore, icon: 'arrow-undo' });
  }

  const renderHistory = () => {
    // P2.1R: un fallo solo de audit degrada esta sección con retry,
    // sin voltear el Task Detail ya renderizado.
    // 403/rls_violation es esperada (audit_events no accesible a usuarios), ocultar silenciosamente.
    if (auditError) {
      const isPermissionError = auditErrorCode === 'rls_violation' || auditErrorCode === 'planner_forbidden' || auditErrorCode === '403';
      if (isPermissionError) {
        return null; // Silently omit history section for expected permission errors
      }
      return (
        <View style={styles.historySection}>
          <ErrorState
            title="Historial no disponible"
            description={auditError}
            retryLabel="Reintentar"
            onRetry={() => void load(true)}
          />
        </View>
      );
    }
    if (auditHistory.length === 0) return null;

    const actionLabels: Record<string, string> = {
      'task.created': 'Tarea creada',
      'task.updated': 'Tarea actualizada',
      'task.completed': 'Tarea completada',
      'task.verified': 'Tarea verificada',
      'task.cancelled': 'Tarea cancelada',
      'task.reactivated': 'Tarea reactivada',
      'task.trashed': 'Tarea movida a papelera',
      'task.restored': 'Tarea restaurada',
      'task.claimed': 'Tarea tomada',
      'task.released': 'Tarea devuelta',
      'task.archived': 'Tarea archivada',
      'task.unarchived': 'Tarea desarchivada',
      'task.fulfillment.completed': 'Cumplimiento completado',
      'task.fulfillment.verified': 'Cumplimiento verificado',
      'task.fulfillment.correction_requested': 'Corrección solicitada',
      'task.fulfillment.resubmitted': 'Cumplimiento reenviado',
      'task.fulfillment.reverted': 'Cumplimiento revertido',
      'task.fulfillment.reopened': 'Cumplimiento reabierto',
    };

    const actionIcons: Record<string, HomePlusIconName> = {
      'task.created': 'add-circle',
      'task.updated': 'create-outline',
      'task.completed': 'checkmark-circle',
      'task.verified': 'shield-checkmark',
      'task.cancelled': 'close-circle',
      'task.reactivated': 'refresh',
      'task.trashed': 'trash',
      'task.restored': 'arrow-undo-outline',
      'task.claimed': 'person-add',
      'task.released': 'person-remove',
      'task.archived': 'archive',
      'task.unarchived': 'archive-outline',
      'task.fulfillment.completed': 'checkmark-circle',
      'task.fulfillment.verified': 'shield-checkmark',
      'task.fulfillment.correction_requested': 'alert-circle',
      'task.fulfillment.resubmitted': 'send',
      'task.fulfillment.reverted': 'refresh',
      'task.fulfillment.reopened': 'refresh',
    };

    const actionColors: Record<string, string> = {
      'task.created': colors.terracotta[500],
      'task.updated': colors.sage[500],
      'task.completed': colors.success.base,
      'task.verified': colors.success.base,
      'task.cancelled': colors.text.tertiary,
      'task.reactivated': colors.terracotta[500],
      'task.trashed': colors.danger.base,
      'task.restored': colors.success.base,
      'task.claimed': colors.sage[500],
      'task.released': colors.warning.base,
      'task.archived': colors.text.secondary,
      'task.unarchived': colors.sage[500],
      'task.fulfillment.completed': colors.success.base,
      'task.fulfillment.verified': colors.success.base,
      'task.fulfillment.correction_requested': colors.warning.base,
      'task.fulfillment.resubmitted': colors.terracotta[500],
      'task.fulfillment.reverted': colors.warning.base,
      'task.fulfillment.reopened': colors.terracotta[500],
    };

    return (
      <View style={styles.historySection}>
        {auditHistory.map((entry: any, index: number) => {
          const action = entry.action;
          const label = actionLabels[action] || action;
          const icon = actionIcons[action] || 'help-circle';
          const iconColor = actionColors[action] || colors.text.tertiary;
          const actorName = entry.actor_membership?.people?.display_name || 'Alguien';
          const actorInitials = actorName.slice(0, 2).toUpperCase();
          const meta = `${formatDate(entry.occurred_at ?? entry.created_at)} por ${actorName}`;

          return (
            <View key={index} style={styles.historyItem}>
              <View style={[styles.historyIcon, { backgroundColor: iconColor + '22' }]}>
                <HomePlusIcon name={icon} size={14} color={iconColor} />
              </View>
              <View style={styles.historyContent}>
                <AppText variant="bodySmall" weight="700" style={styles.historyTitle}>{label}</AppText>
                <AppText variant="caption" tone="tertiary" style={styles.historyMeta}>{meta}</AppText>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const typeLabel = getTypeLabel(task.template_key, task.category);
  const typeDotColor = getTypeDotColor(task.template_key);
  const typeIcon = task.template_key === 'cleaning' ? 'sparkles' : task.template_key === 'shopping' ? 'cart' : task.template_key === 'pets' ? 'paw' : task.template_key === 'medication' ? 'medical' : task.template_key === 'studies' ? 'school' : task.template_key === 'payments' ? 'card' : 'checkmark-circle';

  const statusColor = statusColors[task.status] ?? statusColors.pending;
  const priorityColor = priorityColors[task.priority] ?? colors.terracotta[500];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel="Editar tarea"
          >
            <HomePlusIcon name="create" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.overflowBtn}
            onPress={openActionMenu}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Title + Type + Status */}
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <View style={[styles.typeDot, { backgroundColor: typeDotColor }]}>
                <AppText variant="title3" style={styles.typeDotIcon}>{typeIcon === 'sparkles' ? '✨' : typeIcon === 'cart' ? '🛒' : typeIcon === 'paw' ? '🐾' : typeIcon === 'medical' ? '💊' : typeIcon === 'school' ? '📚' : typeIcon === 'card' ? '💳' : '📝'}</AppText>
              </View>
              <AppText variant="title2" weight="800" style={styles.title}>{task.title}</AppText>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <AppText variant="micro" weight="800" style={[styles.statusBadgeText, { color: statusColor.text }]}>
                  {statusLabels[task.status] ?? task.status}
                </AppText>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
                <HomePlusIcon name={task.priority === 'high' ? 'flag' : 'ellipse'} size={12} color={priorityColor} />
                <AppText variant="micro" weight="800" style={[styles.priorityBadgeText, { color: priorityColor }]}>
                  {priorityLabels[task.priority]}
                </AppText>
              </View>
              {task.category && (
                <View style={styles.statusBadge}>
                  <AppText variant="micro" weight="700" tone="secondary">{task.category}</AppText>
                </View>
              )}
            </View>
          </View>

          {/* Meta info */}
          <View style={styles.section}>
            <AppText variant="caption" weight="800" style={styles.sectionTitle}>Detalles</AppText>
            <View style={styles.metaGrid}>
              {task.due_date && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="calendar" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Vence</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>
                    {formatDate(task.due_date)}
                    {task.due_time ? ` · ${formatTime(task.due_time)}` : ''}
                    {task.due_date === dateToYMD(new Date()) ? ' (Hoy)' : ''}
                    {task.status === 'pending' && Boolean(task.due_date) && task.due_date! < dateToYMD(new Date()) ? ' · Vencida' : ''}
                  </AppText>
                </View>
              )}
              {task.estimated_duration_minutes && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="timer" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Duración estimada</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>
                    {task.estimated_duration_minutes < 60
                      ? `${task.estimated_duration_minutes} min`
                      : `${Math.floor(task.estimated_duration_minutes / 60)}h ${task.estimated_duration_minutes % 60 ? task.estimated_duration_minutes % 60 + 'min' : ''}`}
                  </AppText>
                </View>
              )}
              {task.requires_verification && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="shield" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Revisión</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>
                    Requiere verificación
                  </AppText>
                </View>
              )}
              {task.goal_id && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="flag" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Plan vinculado</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>Vinculada a plan</AppText>
                </View>
              )}
              {task.responsibility_id && (
                <TouchableOpacity style={styles.metaRow} onPress={() => navigation.navigate('ResponsibilityDetail', { responsibilityId: task.responsibility_id })} accessibilityRole="button" accessibilityLabel="Abrir responsabilidad de origen">
                  <HomePlusIcon name="repeat" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Responsabilidad</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>{task.title} ›</AppText>
                </TouchableOpacity>
              )}
            </View>

            {task.description && (
              <AppText variant="body" tone="secondary" style={styles.description}>{task.description}</AppText>
            )}
          </View>

          {/* Ownership */}
          <View style={styles.section}>
            <AppText variant="caption" weight="800" style={styles.sectionTitle}>Asignación</AppText>
            <View style={styles.metaGrid}>
              {fulfillment?.assignment?.assignees && fulfillment.assignment.assignees.length > 0 ? (
                fulfillment.assignment.assignees.map((assignee: any, index: number) => (
                  <View key={assignee.id ?? index} style={styles.metaRow}>
                    <HomePlusIcon name="person" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                    <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>
                      {index === 0 ? 'Responsable' : ''}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {getMemberAvatar(assignee.id) ? (
                        <Image source={{ uri: getMemberAvatar(assignee.id)! }} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.terracotta[400], alignItems: 'center', justifyContent: 'center' }}>
                          <AppText variant="caption" weight="800" tone="inverse">{getMemberInitials(assignee.id)}</AppText>
                        </View>
                      )}
                      <AppText variant="caption" weight="700" style={styles.metaValue}>{getMemberName(assignee.id)}</AppText>
                    </View>
                  </View>
                ))
              ) : fulfillment?.assignment?.kind === 'anyone' ? (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="person" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Responsable</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>Disponible para tomar (cualquiera)</AppText>
                </View>
              ) : (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="person-outline" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Responsable</AppText>
                  <AppText variant="caption" weight="500" style={styles.metaValue}>Sin asignar</AppText>
                </View>
              )}
              {fulfillment?.assignment?.kind === 'members' && fulfillment.assignment.mode === 'shared_once' && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="people" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Modalidad</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>Compartida (uno completa)</AppText>
                </View>
              )}
              {fulfillment?.assignment?.kind === 'members' && fulfillment.assignment.mode === 'each_person' && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="people" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Modalidad</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>Individual (cada uno completa)</AppText>
                </View>
              )}
              {currentFulfillment && currentFulfillment.scope === 'shared' && fulfillment.assignment.kind === 'members' && currentFulfillment.responsibleMember && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="checkmark-circle" size={16} color={colors.terracotta[500]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Ejecutando</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {getMemberAvatar(currentFulfillment.responsibleMember.id) ? (
                      <Image source={{ uri: getMemberAvatar(currentFulfillment.responsibleMember.id)! }} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.terracotta[400], alignItems: 'center', justifyContent: 'center' }}>
                        <AppText variant="caption" weight="800" tone="inverse">{getMemberInitials(currentFulfillment.responsibleMember.id)}</AppText>
                      </View>
                    )}
                    <AppText variant="caption" weight="700" style={styles.metaValue}>{getMemberName(currentFulfillment.responsibleMember.id)}</AppText>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <View style={styles.section}>
              <AppText variant="caption" weight="800" style={styles.sectionTitle}>Checklist</AppText>
              <View style={styles.checklistContainer}>
                {task.checklist.map((item: { text: string; checked: boolean }, index: number) => (
                  <TouchableOpacity key={index} style={styles.checklistItem} onPress={() => handleChecklistToggle(index, !item.checked)} activeOpacity={0.8}>
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <HomePlusIcon name="checkmark" size={14} color={colors.text.inverse} />}
                    </View>
                    <AppText variant="body" style={[styles.checklistItemText, item.checked && styles.checklistItemTextCompleted]}>{item.text}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Evidence history */}
          {evidenceHistory.length > 0 && (
            <View style={styles.section}>
              <AppText variant="caption" weight="800" style={styles.sectionTitle}>Evidencia y revisiones</AppText>
              <View style={styles.evidenceSection}>
                {evidenceHistory.map((attempt: any, index: number) => (
                  <View key={index} style={styles.evidenceAttempt}>
                    <View style={styles.evidenceAttemptHeader}>
                      <View style={styles.evidenceAttemptMeta}>
                        <View style={[styles.evidenceAvatar, { backgroundColor: colors.terracotta[400] }]}>
                          <AppText variant="caption" weight="800" style={styles.evidenceAvatarText}>
                            {attempt.submitted_member?.people?.display_name?.slice(0, 2).toUpperCase() || '??'}
                          </AppText>
                        </View>
                        <View style={styles.evidenceAttemptInfo}>
                          <AppText variant="bodySmall" weight="700" style={styles.evidenceAttemptName}>
                            {attempt.submitted_member?.people?.display_name || 'Miembro'}
                          </AppText>
                          <AppText variant="caption" tone="tertiary" style={styles.evidenceAttemptTime}>
                            {formatDate(attempt.submitted_at)} {formatTime(attempt.submitted_at)}
                          </AppText>
                        </View>
                      </View>
                      {attempt.review_result && (
                        <View style={[styles.evidenceResultBadge, { backgroundColor: attempt.review_result === 'verified' ? colors.success.soft : colors.warning.soft }]}>
                          <AppText variant="micro" weight="800" style={[styles.evidenceResultText, { color: attempt.review_result === 'verified' ? colors.success.strong : colors.warning.text }]}>
                            {attempt.review_result === 'verified' ? 'Verificada' : 'Corrección pedida'}
                          </AppText>
                        </View>
                      )}
                    </View>
                    {attempt.photo_reference && (
                      <Image source={{ uri: attempt.photo_reference }} style={styles.evidencePhoto} resizeMode="cover" />
                    )}
                    {attempt.comment && (
                      <AppText variant="bodySmall" tone="secondary" style={styles.evidenceComment}>{attempt.comment}</AppText>
                    )}
                    {attempt.review_comment && (
                      <AppText variant="bodySmall" style={styles.correctionComment}>{attempt.review_comment}</AppText>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* History */}
          {renderHistory()}
        </View>
      </ScrollView>

      {/* Primary Action Bar */}
      {primaryAction && (
        <View style={styles.primaryActionBar}>
          <AppButton
            style={[styles.primaryActionBtn, primaryAction.variant === 'secondary' && styles.primaryActionBtnSecondary]}
            onPress={primaryAction.onPress}
            disabled={savingAction !== null}
            loading={savingAction === primaryAction.label}
          >
            <AppText variant="body" weight="900" style={primaryAction.variant === 'primary' ? styles.primaryActionText : styles.primaryActionTextSecondary}>
              {primaryAction.label}
            </AppText>
          </AppButton>
        </View>
      )}

      {/* Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onRequestClose={() => setActionSheetVisible(false)}
        title="Opciones de tarea"
        subtitle={task.title}
        footer={
          <AppButton variant="secondary" onPress={() => setActionSheetVisible(false)}>
            <AppText variant="body" weight="700">Cerrar</AppText>
          </AppButton>
        }
      >
        {secondaryActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionRow}
            onPress={() => { setActionSheetVisible(false); action.onPress(); }}
            accessibilityRole="button"
          >
            <HomePlusIcon name={action.icon} size={20} color={action.destructive ? colors.danger.base : colors.text.primary} style={{ marginRight: spacing[3] }} />
            <AppText variant="body" weight="600" style={{ flex: 1, color: action.destructive ? colors.danger.base : colors.text.primary }}>{action.label}</AppText>
          </TouchableOpacity>
        ))}
      </ActionSheet>

      {/* Evidence Photo Picker Modal */}
      {showEvidencePicker && householdId && pendingFulfillmentId && task && accessToken && (
        <View style={styles.evidenceModalOverlay}>
          <View style={styles.evidenceModalContent}>
            <EvidencePhotoPicker
              accessToken={accessToken}
              householdId={householdId}
              taskId={entityId}
              requiresVerification={task.requires_verification}
              onSubmit={handleEvidenceSubmit}
              onCancel={handleEvidenceCancel}
            />
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}
