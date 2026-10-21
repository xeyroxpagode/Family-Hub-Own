/**
 * Planner V1 — Task Detail Screen (E1.1 Final)
 *
 * Operational surface for Task:
 * - Shows hierarchical info: title, status/action, date/deadline, ownership, description, checklist, evidence, plan relation, duration, history
 * - Primary action depends on state: Completar / Me encargo / Revisar / Reenviar
 * - Secondary menu: Editar, Reabrir, Archivar, Papelera
 * - Uses shared design language (semantic tokens, AppText, AppButton, Sheet, etc.)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, ScrollView, TextInput, TouchableOpacity, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import type { PlannerTask } from '../../services/plannerTasks';
import { getTaskById } from '../../services/plannerTasks';
import { getPlannerTaskFulfillmentV1, completePlannerTaskFulfillmentV1, revertPlannerTaskFulfillmentV1, reopenPlannerTaskFulfillmentV1, claimPlannerTaskV1, releasePlannerTaskV1, getTaskAuditHistory, updatePlannerTaskAssignmentV1, type PlannerTaskPriority } from '../../services/plannerTasks';
import { enqueuePlannerTaskUpdate, enqueuePlannerTaskTrash, enqueuePlannerTaskRestore, enqueuePlannerTaskReactivate, enqueuePlannerTaskCancel } from '../../services/planner/reliability';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { AppText, ErrorState, AppButton, ActionSheet, AppInput, DatePickerSheet, FilterChip, FormActionRow, TimePickerSheet, Toggle, formatHumanDate } from '../../components/ui';
import { PlannerAnchoredMenu, type PlannerAnchoredMenuItem } from '../../components/planner/PlannerAnchoredMenu';
import { PlannerChecklistEditor, makePlannerChecklistDraft, type PlannerChecklistDraftItem } from '../../components/planner/PlannerChecklistEditor';
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
import { formatDate, formatTime, statusLabels, priorityLabels, dateToYMD } from './plannerShared';
import { createIdempotencyKey } from '../../services/idempotency';
import { getTaskEvidenceHistory } from '../../services/plannerTasks';
import { getEvidenceMediaAccess, getEvidenceSubmissions, reviewEvidenceVersion, type EvidenceSubmission } from '../../services/plannerEvidenceV2';
import { PlannerEvidenceViewer } from '../../components/planner/PlannerEvidenceViewer';
import { taskToPresetPayload } from '../../services/planner/plannerPresetTaskDomain';
import { listPlansV1 } from '../../services/plannerPlansV1Frontend';
import { getResponsibility } from '../../services/plannerResponsibilities';
import { classifyPlannerError, toPlannerSafeErrorBehavior } from '../../services/planner/plannerErrorAdapter';
import { PlannerTaskChecklistMutationQueue } from '../../services/planner/plannerTaskChecklistMutationQueue';

type TaskEditDraft = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: PlannerTaskPriority;
  requiresVerification: boolean;
  checklist: PlannerChecklistDraftItem[];
  assignmentKind: 'anyone' | 'members';
  memberIds: string[];
  goalId: string | null;
};

function EvidenceRemoteThumb({ accessToken, taskId, artifact }: { accessToken: string; taskId: string; artifact: { id: string; mime_type: string; state: string; display_name: string } }) {
  const [uri, setUri] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  useEffect(() => {
    let active = true;
    if (artifact.state === 'purged') return;
    void getEvidenceMediaAccess(accessToken, taskId, artifact.id).then((value) => { if (active) setUri(value.signedUrl); }).catch(() => {});
    return () => { active = false; };
  }, [accessToken, artifact.id, artifact.state, taskId]);
  if (artifact.state === 'purged') return <View style={styles.expiredMedia}><AppText variant="micro" tone="secondary">Archivo expirado</AppText></View>;
  return <><TouchableOpacity style={styles.remoteThumb} onPress={() => uri && setViewer(true)}>{artifact.mime_type.startsWith('image/') && uri ? <Image source={{ uri }} style={styles.remoteThumbImage} /> : <><HomePlusIcon name="play-circle" size={28} color={colors.text.secondary} /><AppText variant="micro" numberOfLines={1}>{artifact.display_name}</AppText></>}</TouchableOpacity>{uri ? <PlannerEvidenceViewer visible={viewer} items={[{ id: artifact.id, uri, mimeType: artifact.mime_type }]} onClose={() => setViewer(false)} /> : null}</>;
}

const safePlannerMessage = (error: unknown) => toPlannerSafeErrorBehavior(classifyPlannerError(error)).message;

const taskEditDraftFrom = (task: PlannerTask, fulfillment: any): TaskEditDraft => ({
  title: task.title,
  description: task.description ?? '',
  dueDate: task.due_date ?? '',
  dueTime: task.due_time?.slice(0, 5) ?? '',
  priority: task.priority,
  requiresVerification: task.requires_verification,
  checklist: makePlannerChecklistDraft(task.checklist),
  assignmentKind: fulfillment?.assignment?.kind === 'anyone' ? 'anyone' : 'members',
  memberIds: (fulfillment?.assignment?.assignees ?? []).map((member: any) => member.id),
  goalId: task.goal_id ?? null,
});

const sameTaskEditDraft = (left: TaskEditDraft, right: TaskEditDraft) => JSON.stringify({ ...left, memberIds: [...left.memberIds].sort() }) === JSON.stringify({ ...right, memberIds: [...right.memberIds].sort() });

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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  editBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  overflowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  content: {
    flex: 1,
    gap: 24,
  },
  section: {
    backgroundColor: colors.background.base,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
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
  inlineTitleInput: { minHeight: 44, paddingVertical: 4, color: colors.text.primary, fontSize: 22, lineHeight: 28, fontWeight: '800', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.default },
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
    marginTop: 0,
  },
  metaRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  metaIcon: {
    color: colors.text.tertiary,
  },
  metaLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
    width: 96,
  },
  metaValue: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
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
  correctionCallout: {
    gap: spacing[2],
    marginTop: spacing[4],
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
    borderRadius: radius.md,
  },
  correctionCalloutTitle: {
    color: colors.warning.text,
    letterSpacing: 0.5,
  },
  checklistExpandButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
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
    left: 20,
    right: 20,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: 'row',
    gap: spacing[2],
    ...shadows.sheet,
  },
  primaryActionBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  inlineToggleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  editSheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  evidenceMediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  remoteThumb: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface.soft, alignItems: 'center', justifyContent: 'center', padding: spacing[1] },
  remoteThumbImage: { width: '100%', height: '100%' },
  expiredMedia: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center', padding: spacing[1] },
  correctionSheet: { gap: spacing[4] },
});

export function TaskDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, authMe } = useAuth();
  const { members, currentHousehold } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const householdId = currentHousehold?.id ?? '';
  const sheet = usePlannerSheet();
  const insets = useSafeAreaInsets();

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
  const [evidenceSubmissions, setEvidenceSubmissions] = useState<EvidenceSubmission[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditErrorCode, setAuditErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const actionMenuAnchorRef = useRef<View>(null);
  const [correctionSheetOpen, setCorrectionSheetOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [editingInline, setEditingInline] = useState(Boolean(params.editMode));
  const [editDraft, setEditDraft] = useState<TaskEditDraft | null>(null);
  const [openingEditDraft, setOpeningEditDraft] = useState<TaskEditDraft | null>(null);
  const [editPicker, setEditPicker] = useState<'date' | 'time' | 'members' | 'priority' | 'plan' | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; title: string }>>([]);
  const [responsibilityTitle, setResponsibilityTitle] = useState<string | null>(null);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [checklistDragging, setChecklistDragging] = useState(false);
  const checklistQueueRef = useRef<PlannerTaskChecklistMutationQueue<PlannerTask> | null>(null);

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
      let shouldApplyLoadedTask = true;
      if (!checklistQueueRef.current || checklistQueueRef.current.taskId !== entityId) {
        checklistQueueRef.current = new PlannerTaskChecklistMutationQueue<PlannerTask>({
          taskId: entityId,
          initialTask: taskRes.task,
          mutate: async (checklist, expectedVersion) => {
            const result = await enqueuePlannerTaskUpdate(entityId, { checklist, expected_version: expectedVersion });
            if (!result.task) throw new Error('La actualización del checklist no devolvió la tarea.');
            markPlannerChanged();
            return result.task;
          },
          refresh: async () => (await getTaskById(accessToken, entityId)).task,
          onState: ({ authoritative, desiredChecklist }) => {
            setTask({ ...authoritative, checklist: desiredChecklist });
          },
          onRecoverableError: (queueError) => {
            const conflict = queueError instanceof ApiError && (queueError.code === 'version_conflict' || queueError.code === 'version_conflict_v2');
            Alert.alert(conflict ? 'Conflicto' : 'No pudimos guardar', conflict
              ? 'La tarea volvió a cambiar. Recargamos el checklist para que puedas intentarlo otra vez.'
              : 'Recargamos el último checklist confirmado. Revisá la conexión e intentá de nuevo.');
          },
        });
      } else {
        shouldApplyLoadedTask = checklistQueueRef.current.syncAuthoritative(taskRes.task);
      }
      if (shouldApplyLoadedTask) setTask(taskRes.task);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(safePlannerMessage(err));
        setErrorCode(err.code);
      } else {
        setError('No pudimos cargar la tarea.');
      }
      if (!silent) setLoading(false);
      return;
    }
    const [fulfillmentSettled, evidenceSettled, evidenceV2Settled, auditSettled] = await Promise.allSettled([
      getPlannerTaskFulfillmentV1(accessToken, entityId),
      getTaskEvidenceHistory(accessToken, entityId),
      getEvidenceSubmissions(accessToken, entityId),
      getTaskAuditHistory(accessToken, entityId),
    ]);
    if (fulfillmentSettled.status === 'fulfilled') {
      setFulfillment(fulfillmentSettled.value.task);
    }
    if (evidenceSettled.status === 'fulfilled') {
      setEvidenceHistory(evidenceSettled.value.evidence ?? []);
    }
    if (evidenceV2Settled.status === 'fulfilled') setEvidenceSubmissions(evidenceV2Settled.value.submissions ?? []);
    if (auditSettled.status === 'fulfilled') {
      setAuditHistory(auditSettled.value.audit ?? []);
      setAuditError(null);
      setAuditErrorCode(null);
    } else {
      setAuditHistory([]);
      const reason = auditSettled.reason;
      setAuditError(safePlannerMessage(reason));
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
    if (!accessToken) return;
    void listPlansV1(accessToken, { limit: 100 }).then(({ plans: next }) => setPlans((next ?? []).map((plan) => ({ id: plan.id, title: plan.title })))).catch(() => setPlans([]));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !task?.responsibility_id) { setResponsibilityTitle(null); return; }
    void getResponsibility(accessToken, task.responsibility_id).then(({ responsibility }) => setResponsibilityTitle(responsibility.title)).catch(() => setResponsibilityTitle(null));
  }, [accessToken, task?.responsibility_id]);

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

  const editDirty = Boolean(editDraft && openingEditDraft && !sameTaskEditDraft(editDraft, openingEditDraft));
  const closeInlineEdit = useCallback(() => {
    const close = () => {
      setEditingInline(false);
      setEditPicker(null);
      if (task) {
        const next = taskEditDraftFrom(task, fulfillment);
        setEditDraft(next);
        setOpeningEditDraft(next);
      }
    };
    if (!editDirty) { close(); return; }
    Alert.alert('¿Descartar cambios?', 'Los cambios que hiciste no se guardarán.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: close },
    ]);
  }, [editDirty, fulfillment, task]);

  const handleBack = useCallback(() => {
    if (editingInline) { closeInlineEdit(); return; }
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
  }, [closeInlineEdit, editingInline, navigation, params.returnTo]);

  const handleEdit = useCallback(() => {
    if (!task) return;
    const next = taskEditDraftFrom(task, fulfillment);
    setEditDraft(next);
    setOpeningEditDraft(next);
    setEditingInline(true);
    setActionSheetVisible(false);
    navigation.setParams({ ...params, editMode: false });
  }, [fulfillment, navigation, params, task]);

  useEffect(() => {
    if (task && editingInline && !editDraft) {
      const next = taskEditDraftFrom(task, fulfillment);
      setEditDraft(next);
      setOpeningEditDraft(next);
    }
  }, [editDraft, editingInline, fulfillment, task]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!editingInline) return false;
      closeInlineEdit();
      return true;
    });
    return () => { subscription.remove(); setActionSheetVisible(false); };
  }, [closeInlineEdit, editingInline]));

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
  const correctionAttempt = isCorrectionRequested
    ? evidenceSubmissions.find((attempt) => attempt.is_current && attempt.status === 'correction_requested')
      ?? evidenceHistory.find((attempt) => attempt.review_result === 'correction_requested' || attempt.review_comment)
    : null;
  const isVerified = aggregateState === 'verified' || task.status === 'verified';
  const isCompleted = aggregateState === 'completed' || task.status === 'completed';
  const isPending = task.status === 'pending';
  const isCancelled = task.status === 'cancelled';
  const isTrashed = Boolean(task.trashed_at);

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
      return { label: 'Completar', onPress: handleComplete, variant: 'primary', color: colors.terracotta[500] };
    }
    if (isAwaitingVerification && currentFulfillment?.status === 'awaiting_verification') {
      // SERVER AUTHORITY: `verify` is offered only when the canonical
      // `availableActions` includes it (it already folds in `task.verify` plus
      // self-verification). The local rule below is a secondary guard, never the
      // decision — a locally-derived rule showed the action to roles that would
      // always be denied.
      const serverAllowsVerify = fulfillment?.availableActions?.some((a: any) => a.action === 'verify') ?? false;
      const notSelfVerified = currentFulfillment.completedBy?.id !== myMembershipId;
      if (serverAllowsVerify && notSelfVerified) {
        return { label: 'Aprobar', onPress: handleVerify, variant: 'primary', color: colors.terracotta[500] };
      }
    }
    if (isCorrectionRequested && currentFulfillment?.status === 'correction_requested') {
      const isAssignee = currentFulfillment.responsibleMember?.id === myMembershipId;
      if (isAssignee) {
        return { label: 'Volver a enviar', onPress: handleResubmit, variant: 'primary', color: colors.terracotta[500] };
      }
    }
    if (isCompleted || isVerified) {
      return null; // No primary completion action
    }
    return null;
  };

  const primaryAction = getPrimaryAction();
  const canRequestCorrection = isAwaitingVerification && (fulfillment?.availableActions?.some((a: any) => a.action === 'request_correction') ?? false);

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
      const message = safePlannerMessage(err);
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
    if (!accessToken || !fulfillment || !task) return;

    let completionTask = task;
    try {
      completionTask = await (checklistQueueRef.current?.flush() ?? Promise.resolve(task));
    } catch {
      return;
    }

    const sharedFulfillment = fulfillment.fulfillments.find((f: any) => f.scope === 'shared' && f.status === 'pending');
    if (!sharedFulfillment) {
      sheet.openConfirm({
        data: {
          title: 'Sin cumplimiento pendiente',
          body: 'No hay cumplimiento pendiente para completar.',
          safeLabel: 'Entendido',
          destructiveLabel: '',
          onConfirm: () => {},
          onCancel: () => {},
        },
      });
      return;
    }

    // Check for unchecked checklist items
    const uncheckedCount = completionTask.checklist?.filter((item: any) => !item.checked).length ?? 0;
    const proceedWithCompletion = async () => {
      if (savingAction) return;
      try {
        completionTask = await (checklistQueueRef.current?.flush() ?? Promise.resolve(completionTask));
      } catch {
        return;
      }
      // If verification is required, show evidence picker first
      if (completionTask.requires_verification) {
        navigation.navigate('EvidenceComposer', { taskId: entityId, taskTitle: completionTask.title, fulfillmentId: sharedFulfillment.id, fulfillmentVersion: sharedFulfillment.version, source: 'detail' });
        return;
      }

      // Otherwise, complete directly
      setSavingAction('complete');
      try {
        await completePlannerTaskFulfillmentV1(accessToken, entityId, sharedFulfillment.id, sharedFulfillment.version, { idempotencyKey: createIdempotencyKey('planner.tasks.fulfillment.complete') });
        markPlannerChanged();
        await load(true);
        // Completion has no authorized inverse mutation, so it reports success
        // WITHOUT offering Undo.
        sheet.pushToast({
          id: `task-complete-${entityId}-${Date.now()}`,
          message: completionTask.requires_verification ? 'Tarea enviada a revisión' : 'Tarea completada',
          kind: 'success',
        });
      } catch (err) {
        const message = safePlannerMessage(err);
        sheet.openConfirm({
          data: {
            title: 'Error',
            body: message,
            safeLabel: 'Entendido',
            destructiveLabel: '',
            onConfirm: () => {},
            onCancel: () => {},
          },
        });
      } finally {
        setSavingAction(null);
      }
    };

    if (uncheckedCount > 0) {
      sheet.openConfirm({
        data: {
          title: 'Quedan elementos sin marcar',
          body: `Hay ${uncheckedCount} elemento${uncheckedCount > 1 ? 's' : ''} del checklist sin marcar.`,
          safeLabel: 'Volver',
          destructiveLabel: 'Completar igualmente',
          destructiveTone: true,
          onConfirm: proceedWithCompletion,
          onCancel: () => {},
        },
      });
      return;
    }

    await proceedWithCompletion();
  };

  const handleVerify = async () => {
    if (savingAction) return;
    if (!accessToken || !fulfillment) return;
    setSavingAction('verify');
    try {
      const awaitingFulfillment = fulfillment.fulfillments.find((f: any) => f.status === 'awaiting_verification');
      if (!awaitingFulfillment) throw new Error('No hay cumplimiento por verificar');
      const currentSubmission = evidenceSubmissions.find((submission) => submission.is_current && submission.status === 'awaiting_verification');
      if (!currentSubmission) throw new Error('No hay evidencia vigente para revisar');
      await reviewEvidenceVersion(accessToken, entityId, awaitingFulfillment.id, currentSubmission.id, currentSubmission.version, 'approve');
      markPlannerChanged();
      await load(true);
      // Verification is terminal: success only, no Undo.
      sheet.pushToast({
        id: `task-verify-${entityId}-${Date.now()}`,
        message: 'Tarea verificada',
        kind: 'success',
      });
    } catch (err) {
      const message = safePlannerMessage(err);
      Alert.alert('Planner', message);
    } finally {
      setSavingAction(null);
    }
  };

  const handleResubmit = async () => {
    if (!task || !fulfillment) return;
    const correctionFulfillment = fulfillment.fulfillments.find((f: any) => f.status === 'correction_requested');
    if (!correctionFulfillment) return;
    navigation.navigate('EvidenceComposer', { taskId: entityId, taskTitle: task.title, fulfillmentId: correctionFulfillment.id, fulfillmentVersion: correctionFulfillment.version, source: 'correction' });
  };

  const handleRequestCorrection = async () => {
    if (!accessToken || !fulfillment || !correctionReason.trim() || savingAction) return;
    const awaitingFulfillment = fulfillment.fulfillments.find((f: any) => f.status === 'awaiting_verification');
    const currentSubmission = evidenceSubmissions.find((submission) => submission.is_current && submission.status === 'awaiting_verification');
    if (!awaitingFulfillment || !currentSubmission) return;
    setSavingAction('request-correction');
    try {
      await reviewEvidenceVersion(accessToken, entityId, awaitingFulfillment.id, currentSubmission.id, currentSubmission.version, 'request_correction', correctionReason.trim());
      setCorrectionSheetOpen(false); setCorrectionReason(''); markPlannerChanged(); await load(true);
    } catch (err) { Alert.alert('Planner', safePlannerMessage(err)); }
    finally { setSavingAction(null); }
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
              // Feedback BEFORE navigating back: `handleBack` unmounts this
              // screen, and ToastHost lives above the Planner stack, so a toast
              // dispatched after the unmount would have no chance to render.
              sheet.pushToast({
                id: `task-trash-${entityId}-${Date.now()}`,
                message: 'Tarea movida a la papelera',
                kind: 'warning',
                undoLabel: 'Deshacer',
                // Real inverse mutation: restore is the authorized undo for a
                // trash, and it carries its own idempotency key so a repeated
                // tap cannot write twice.
                onUndo: async () => {
                  try {
                    await enqueuePlannerTaskRestore(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.restore.undo') });
                    markPlannerChanged();
                  } catch (undoErr) {
                    Alert.alert('Planner', safePlannerMessage(undoErr));
                  }
                },
              });
              handleBack();
            } catch (err) {
              const message = safePlannerMessage(err);
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
      // Restoring is reversible: undo re-trashes with a fresh idempotency key.
      sheet.pushToast({
        id: `task-restore-${entityId}-${Date.now()}`,
        message: 'Tarea restaurada',
        kind: 'success',
        undoLabel: 'Deshacer',
        onUndo: async () => {
          try {
            await enqueuePlannerTaskTrash(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.trash.undo') });
            markPlannerChanged();
          } catch (undoErr) {
            Alert.alert('Planner', safePlannerMessage(undoErr));
          }
        },
      });
    } catch (err) {
      const message = safePlannerMessage(err);
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
              sheet.pushToast({
                id: `task-reactivate-${entityId}-${Date.now()}`,
                message: 'Tarea reactivada',
                kind: 'success',
                undoLabel: 'Deshacer',
                onUndo: async () => {
                  try {
                    await enqueuePlannerTaskCancel(entityId, task.version, { idempotencyKey: createIdempotencyKey('planner.tasks.cancel.undo') });
                    markPlannerChanged();
                  } catch (undoErr) {
                    Alert.alert('Planner', safePlannerMessage(undoErr));
                  }
                },
              });
            } catch (err) {
              const message = safePlannerMessage(err);
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
              const message = safePlannerMessage(err);
              Alert.alert('Planner', message);
            } finally {
              setSavingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleChecklistToggle = (index: number, checked: boolean) => {
    if (!accessToken || !task.checklist || !checklistQueueRef.current) return;
    const newChecklist = [...task.checklist];
    newChecklist[index] = { ...newChecklist[index], checked };
    checklistQueueRef.current.setDesired(newChecklist);
  };

  const saveInlineEdit = async () => {
    if (!accessToken || !task || !editDraft || !openingEditDraft || savingAction) return;
    if (!editDraft.title.trim()) { Alert.alert('Falta el título', 'Escribí qué hay que hacer.'); return; }
    if (!editDirty) { setEditingInline(false); return; }
    setSavingAction('save-edit');
    try {
      const structuralLocked = task.status === 'awaiting_verification';
      let updatedTask = task;
      const taskFieldsChanged = structuralLocked
        ? editDraft.description !== openingEditDraft.description
        : JSON.stringify({ ...editDraft, assignmentKind: undefined, memberIds: undefined }) !== JSON.stringify({ ...openingEditDraft, assignmentKind: undefined, memberIds: undefined });
      if (taskFieldsChanged) {
        const result = await enqueuePlannerTaskUpdate(entityId, structuralLocked ? {
          description: editDraft.description.trim(),
          expected_version: task.version,
        } : {
          title: editDraft.title.trim(),
          description: editDraft.description.trim(),
          due_date: editDraft.dueDate || null,
          due_time: editDraft.dueTime || null,
          priority: editDraft.priority,
          requires_verification: editDraft.requiresVerification,
          checklist: editDraft.checklist.filter((item) => item.text.trim()).map((item) => ({ text: item.text.trim(), checked: item.checked })),
          goal_id: editDraft.goalId,
          expected_version: task.version,
        } as any, { idempotencyKey: createIdempotencyKey('planner.tasks.detail.inline-edit') });
        if (result.task) updatedTask = result.task;
      }
      const assignmentChanged = !structuralLocked && (editDraft.assignmentKind !== openingEditDraft.assignmentKind || JSON.stringify([...editDraft.memberIds].sort()) !== JSON.stringify([...openingEditDraft.memberIds].sort()));
      if (assignmentChanged && fulfillment?.assignment?.version) {
        await updatePlannerTaskAssignmentV1(accessToken, entityId, fulfillment.assignment.version, {
          assignmentKind: editDraft.assignmentKind,
          fulfillmentMode: 'shared_once',
          memberIds: editDraft.assignmentKind === 'members' ? editDraft.memberIds : [],
        }, { idempotencyKey: createIdempotencyKey('planner.tasks.detail.assignment') });
      }
      setTask(updatedTask);
      markPlannerChanged();
      await load(true);
      setEditingInline(false);
      setEditPicker(null);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'version_conflict' || err.code === 'version_conflict_v2')) {
        Alert.alert('La tarea cambió', 'Conservamos tu borrador. Actualizá la tarea antes de volver a guardar.');
      } else {
        Alert.alert('No pudimos guardar', 'Conservamos tus cambios. Revisá la conexión e intentá de nuevo.');
      }
    } finally {
      setSavingAction(null);
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
  if (isCancelled && !isTrashed) {
    secondaryActions.push({ label: 'Reactivar', onPress: handleReactivate, icon: 'refresh' });
  }
  if (!isTrashed) {
    secondaryActions.push({ label: 'Mover a la papelera', onPress: handleTrash, icon: 'trash', destructive: true });
  } else {
    secondaryActions.push({ label: 'Restaurar', onPress: handleRestore, icon: 'arrow-undo' });
  }
  const detailMenuItems: PlannerAnchoredMenuItem[] = secondaryActions.map((action, index) => ({
    label: action.label,
    icon: action.icon,
    danger: action.destructive,
    separatorBefore: Boolean(action.destructive && index > 0),
    onPress: action.onPress,
  }));

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.container}
        scrollEnabled={!checklistDragging}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 152 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
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
            onPress={editingInline ? closeInlineEdit : handleEdit}
            accessibilityRole="button"
            accessibilityLabel={editingInline ? 'Cancelar edición' : 'Editar tarea'}
          >
            <HomePlusIcon name={editingInline ? 'close' : 'create'} size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          {!editingInline ? <TouchableOpacity
            ref={actionMenuAnchorRef}
            style={styles.overflowBtn}
            onPress={openActionMenu}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary} />
          </TouchableOpacity> : null}
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* The same title node changes between read and edit; the route and rail stay mounted. */}
          <View style={styles.section}>
            {editingInline && editDraft ? <TextInput style={styles.inlineTitleInput} value={editDraft.title} onChangeText={(title) => setEditDraft((current) => current && ({ ...current, title }))} placeholder="Título de la tarea" placeholderTextColor={colors.text.muted} multiline maxLength={180} accessibilityLabel="Título" /> : <AppText variant="title2" weight="800" numberOfLines={3} style={styles.title}>{task.title}</AppText>}
            <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>{statusLabels[task.status] ?? task.status}{task.category ? ` · ${task.category}` : ''}</AppText>
          </View>

          {/* Meta info */}
          <View style={styles.section}>
            <AppText variant="caption" weight="800" style={styles.sectionTitle}>Detalles</AppText>
            <View style={styles.metaGrid}>
              {editingInline && editDraft ? <>
                <FormActionRow label="Fecha" value={editDraft.dueDate ? formatHumanDate(editDraft.dueDate) : 'Sin fecha'} onPress={() => setEditPicker('date')} disabled={isAwaitingVerification} />
                <FormActionRow label="Hora" value={editDraft.dueTime || 'Sin hora'} onPress={() => setEditPicker('time')} disabled={isAwaitingVerification} />
                <FormActionRow label="Prioridad" value={priorityLabels[editDraft.priority]} onPress={() => setEditPicker('priority')} disabled={isAwaitingVerification} />
                <FormActionRow label="Plan" value={plans.find((plan) => plan.id === editDraft.goalId)?.title ?? 'Sin plan'} onPress={() => setEditPicker('plan')} disabled={isAwaitingVerification} />
                <View style={styles.inlineToggleRow}><View style={{ flex: 1 }}><AppText variant="caption" tone="secondary" weight="500">Revisión</AppText><AppText weight="500">Requiere revisión</AppText></View><Toggle value={editDraft.requiresVerification} onValueChange={(requiresVerification) => setEditDraft((current) => current && ({ ...current, requiresVerification }))} disabled={isAwaitingVerification} accessibilityLabel="Requiere revisión" /></View>
              </> : task.due_date && (
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
              {task.requires_verification && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="shield" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Revisión</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>
                    Requiere verificación
                  </AppText>
                </View>
              )}
              {task.goal_id && !editingInline && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="flag" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Plan vinculado</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>{plans.find((plan) => plan.id === task.goal_id)?.title ?? 'Plan'}</AppText>
                </View>
              )}
              {task.responsibility_id && !editingInline && (
                <TouchableOpacity style={styles.metaRow} onPress={() => navigation.navigate('ResponsibilityDetail', { responsibilityId: task.responsibility_id })} accessibilityRole="button" accessibilityLabel="Abrir responsabilidad de origen">
                  <HomePlusIcon name="repeat" size={16} color={colors.text.tertiary} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Responsabilidad</AppText>
                  <AppText variant="caption" weight="700" style={styles.metaValue}>{responsibilityTitle ?? 'Responsabilidad'} ›</AppText>
                </TouchableOpacity>
              )}
            </View>

            {editingInline && editDraft ? <AppInput label="Nota" value={editDraft.description} onChangeText={(description) => setEditDraft((current) => current && ({ ...current, description }))} variant="multiline" /> : task.description ? <AppText variant="body" tone="secondary" style={styles.description}>{task.description}</AppText> : null}
            {(correctionAttempt?.correction_reason || correctionAttempt?.review_comment) ? (
              <View style={styles.correctionCallout}>
                <AppText variant="caption" weight="800" style={styles.correctionCalloutTitle}>QUÉ HAY QUE CAMBIAR</AppText>
                <AppText variant="bodySmall" style={styles.correctionComment}>{correctionAttempt.correction_reason || correctionAttempt.review_comment}</AppText>
                <AppText variant="caption" tone="secondary">
                  Pedido {correctionAttempt.reviewed_at ? formatDate(correctionAttempt.reviewed_at) : 'recientemente'}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Ownership */}
          <View style={styles.section}>
            <AppText variant="caption" weight="800" style={styles.sectionTitle}>Asignación</AppText>
            <View style={styles.metaGrid}>
              {editingInline && editDraft ? (
                <FormActionRow
                  label="Responsables"
                  value={editDraft.assignmentKind === 'anyone' ? 'Cualquiera puede encargarse' : editDraft.memberIds.length ? editDraft.memberIds.map((memberId) => getMemberName(memberId)).join(', ') : 'Elegir personas'}
                  onPress={() => setEditPicker('members')}
                  disabled={isAwaitingVerification}
                />
              ) : fulfillment?.assignment?.assignees && fulfillment.assignment.assignees.length > 0 ? (
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
              {!editingInline && fulfillment?.assignment?.kind === 'members' && fulfillment.assignment.mode === 'shared_once' && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="people" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Modalidad</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>Compartida (uno completa)</AppText>
                </View>
              )}
              {!editingInline && fulfillment?.assignment?.kind === 'members' && fulfillment.assignment.mode === 'each_person' && (
                <View style={styles.metaRow}>
                  <HomePlusIcon name="people" size={16} color={colors.sage[600]} style={styles.metaIcon} />
                  <AppText variant="caption" tone="tertiary" style={styles.metaLabel}>Modalidad</AppText>
                  <AppText variant="caption" weight="700" style={[styles.metaValue, { color: colors.sage[600] }]}>Individual (cada uno completa)</AppText>
                </View>
              )}
              {!editingInline && currentFulfillment && currentFulfillment.scope === 'shared' && fulfillment.assignment.kind === 'members' && currentFulfillment.responsibleMember && (
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
          {(editingInline || (task.checklist && task.checklist.length > 0)) && (
            <View style={styles.section}>
              <AppText variant="caption" weight="800" style={styles.sectionTitle}>Checklist{!editingInline && task.checklist ? ` · ${task.checklist.filter((item) => item.checked).length}/${task.checklist.length}` : ''}</AppText>
              {editingInline && editDraft ? <PlannerChecklistEditor items={editDraft.checklist} onChange={(checklist) => setEditDraft((current) => current && ({ ...current, checklist }))} disabled={isAwaitingVerification} onDragStateChange={setChecklistDragging} /> : <View style={styles.checklistContainer}>
                {(checklistExpanded ? task.checklist! : task.checklist!.slice(0, 10)).map((item: { text: string; checked: boolean }, index: number) => (
                  <TouchableOpacity key={index} style={styles.checklistItem} onPress={() => handleChecklistToggle(index, !item.checked)} activeOpacity={0.8}>
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <HomePlusIcon name="checkmark" size={14} color={colors.text.inverse} />}
                    </View>
                    <AppText variant="body" style={[styles.checklistItemText, item.checked && styles.checklistItemTextCompleted]}>{item.text}</AppText>
                  </TouchableOpacity>
                ))}
                {task.checklist!.length > 10 ? (
                  <TouchableOpacity
                    style={styles.checklistExpandButton}
                    onPress={() => setChecklistExpanded((expanded) => !expanded)}
                    accessibilityRole="button"
                    accessibilityLabel={checklistExpanded ? 'Plegar checklist' : `Mostrar ${task.checklist!.length - 10} pasos más`}
                  >
                    <AppText variant="bodySmall" weight="700" tone="brand">{checklistExpanded ? 'Plegar' : `Ver ${task.checklist!.length - 10} más`}</AppText>
                  </TouchableOpacity>
                ) : null}
              </View>}
            </View>
          )}

          {evidenceSubmissions.length > 0 ? <View style={styles.section}><AppText variant="caption" weight="800" style={styles.sectionTitle}>Evidencia y revisiones</AppText><View style={styles.evidenceSection}>{evidenceSubmissions.map((submission) => <View key={submission.id} style={styles.evidenceAttempt}><View style={styles.evidenceAttemptHeader}><View><AppText weight="800">Versión {submission.version}</AppText><AppText variant="caption" tone="secondary">{submission.submitter?.people?.display_name || 'Miembro'} · {formatDate(submission.submitted_at)}</AppText>{submission.reviewer ? <AppText variant="caption" tone="secondary">Revisó {submission.reviewer.people?.display_name || 'Miembro'}{submission.reviewed_at ? ` · ${formatDate(submission.reviewed_at)}` : ''}</AppText> : null}</View><AppText variant="caption" weight="700">{submission.status === 'approved' ? 'Aprobada' : submission.status === 'correction_requested' ? 'Corrección pedida' : submission.status === 'awaiting_verification' ? 'Esperando revisión' : 'Anterior'}</AppText></View>{submission.correction_reason ? <AppText variant="bodySmall" style={styles.correctionComment}>{submission.correction_reason}</AppText> : null}<View style={styles.evidenceMediaGrid}>{submission.media.map((entry) => <EvidenceRemoteThumb key={entry.id} accessToken={accessToken!} taskId={entityId} artifact={entry.artifact} />)}</View>{submission.media_purged_at ? <AppText variant="caption" tone="secondary">Los archivos expiraron; el historial se conserva.</AppText> : submission.retain_until ? <AppText variant="caption" tone="secondary">Archivos disponibles temporalmente.</AppText> : null}</View>)}</View></View> : null}

          {/* Legacy Evidence history (read compatibility) */}
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
      {editingInline ? (
        <View style={[styles.primaryActionBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          <AppButton style={styles.primaryActionBtn} title="Guardar cambios" onPress={() => void saveInlineEdit()} loading={savingAction === 'save-edit'} disabled={!editDirty || savingAction !== null} />
        </View>
      ) : primaryAction ? (
        <View style={[styles.primaryActionBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          {canRequestCorrection ? <AppButton variant="secondary" title="Pedir un cambio" onPress={() => setCorrectionSheetOpen(true)} disabled={savingAction !== null} /> : null}
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
      ) : null}

      <PlannerAnchoredMenu visible={actionSheetVisible} anchorRef={actionMenuAnchorRef} items={detailMenuItems} onRequestClose={() => setActionSheetVisible(false)} preferredSide="left" />
      <ActionSheet visible={correctionSheetOpen} title="Pedir un cambio" onRequestClose={() => setCorrectionSheetOpen(false)} size="content"><View style={styles.correctionSheet}><AppInput label="¿Qué habría que cambiar?" value={correctionReason} onChangeText={setCorrectionReason} variant="multiline" /><AppButton title="Pedir un cambio" onPress={() => void handleRequestCorrection()} disabled={!correctionReason.trim() || savingAction !== null} loading={savingAction === 'request-correction'} /></View></ActionSheet>
      {editDraft ? <>
        <DatePickerSheet visible={editPicker === 'date'} value={editDraft.dueDate} onClose={() => setEditPicker(null)} onConfirm={(dueDate) => { setEditDraft((current) => current && ({ ...current, dueDate })); setEditPicker(null); }} onClear={() => { setEditDraft((current) => current && ({ ...current, dueDate: '' })); setEditPicker(null); }} />
        <TimePickerSheet visible={editPicker === 'time'} value={editDraft.dueTime || '09:00'} onClose={() => setEditPicker(null)} onConfirm={(dueTime) => { setEditDraft((current) => current && ({ ...current, dueTime })); setEditPicker(null); }} />
        <ActionSheet visible={editPicker === 'priority'} title="Prioridad" onRequestClose={() => setEditPicker(null)} size="content"><View style={styles.editSheetChips}>{(['high', 'normal', 'low'] as PlannerTaskPriority[]).map((priority) => <FilterChip key={priority} label={priorityLabels[priority]} selected={editDraft.priority === priority} onPress={() => { setEditDraft((current) => current && ({ ...current, priority })); setEditPicker(null); }} />)}</View></ActionSheet>
        <ActionSheet visible={editPicker === 'members'} title="Responsables" onRequestClose={() => setEditPicker(null)} size="content"><View style={styles.editSheetChips}><FilterChip label="Cualquiera puede encargarse" selected={editDraft.assignmentKind === 'anyone'} onPress={() => setEditDraft((current) => current && ({ ...current, assignmentKind: 'anyone', memberIds: [] }))} />{members.map((member) => <FilterChip key={member.id} label={member.user?.nombre || 'Miembro'} selected={editDraft.assignmentKind === 'members' && editDraft.memberIds.includes(member.id)} onPress={() => setEditDraft((current) => current && ({ ...current, assignmentKind: 'members', memberIds: current.memberIds.includes(member.id) ? current.memberIds.filter((id) => id !== member.id) : [...current.memberIds, member.id] }))} />)}<AppButton title="Listo" onPress={() => setEditPicker(null)} /></View></ActionSheet>
        <ActionSheet visible={editPicker === 'plan'} title="Plan" onRequestClose={() => setEditPicker(null)} size="content"><View style={styles.editSheetChips}><FilterChip label="Sin plan" selected={!editDraft.goalId} onPress={() => { setEditDraft((current) => current && ({ ...current, goalId: null })); setEditPicker(null); }} />{plans.map((plan) => <FilterChip key={plan.id} label={plan.title} selected={editDraft.goalId === plan.id} onPress={() => { setEditDraft((current) => current && ({ ...current, goalId: plan.id })); setEditPicker(null); }} />)}</View></ActionSheet>
      </> : null}

    </SafeAreaView>
  );
}
