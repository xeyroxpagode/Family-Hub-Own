import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';

import { AppText, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { parsePlannerEntityDetailParams, type PlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';
import {
  createPlanStructureWriteIntent,
  getCanonicalPlanGraph,
} from '../../services/planner/plannerPlans';
import type { PlanClassification } from '../../types/PlannerPlan';
import type { PlannerMutationIntent } from '../../services/planner/plannerMutationIntent';
import { enqueuePlannerPlanStructureChangeset } from '../../services/planner/reliability';
import { tracePlanWrite } from '../../services/planner/planWriteTrace';
import { createPlanWriteSingleFlightGate } from '../../services/planner/planWriteSingleFlight';
import {
  buildMilestoneEditorDraft,
  addMilestoneToDraft,
  updateMilestoneInDraft,
  removeMilestoneFromDraft,
  moveMilestoneUp,
  moveMilestoneDown,
  buildMilestoneChangeset,
  resetLocalIdSeq,
  type MilestoneEditorDraft,
  type MilestoneEditorDraftEntry,
} from '../../services/planner/planMilestoneEditor';
import { PlannerMilestoneEditorSurface } from './PlannerPlansSurfaces';
import { plannerStyles as S } from './plannerShared';
import { colors, spacing } from '../../constants/theme';

export function PlannerPlanStructureEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const params = useMemo(() => {
    try {
      return parsePlannerEntityDetailParams(route.params);
    } catch {
      return { entityId: route.params?.goalId ?? '' } as PlannerEntityDetailParams;
    }
  }, [route.params]);

  const [editorDraft, setEditorDraft] = useState<MilestoneEditorDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PlannerMutationIntent | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitGateRef = useRef(createPlanWriteSingleFlightGate());
  const pendingIntentRef = useRef<PlannerMutationIntent | null>(null);
  const instanceTagRef = useRef(`structure:${Math.random().toString(36).slice(2, 8)}`);

  const load = useCallback(async () => {
    if (!accessToken || !params.entityId) return;
    setLoading(true);
    setError(null);
    try {
      resetLocalIdSeq(0);
      const graph = await getCanonicalPlanGraph({ accessToken }, params.entityId);
      setEditorDraft(buildMilestoneEditorDraft(graph));
      setPendingIntent(null);
      pendingIntentRef.current = null;
      submitGateRef.current.clear();
      setSyncMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos preparar la estructura.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.entityId]);

  useEffect(() => {
    if (isFocused) void load();
  }, [isFocused, load]);

  const handleSave = useCallback(async () => {
    tracePlanWrite({
      operation: 'structure',
      stage: 'ui_handler_invocation',
      surface: 'PlannerPlanStructureEditScreen',
      instanceTag: instanceTagRef.current,
      planId: editorDraft?.planId,
    });
    if (!accessToken || !editorDraft) return;

    const changeset = buildMilestoneChangeset(editorDraft);
    if (!changeset) {
      setSyncMessage('Estructura sin cambios.');
      navigation.goBack();
      return;
    }

    const operationKey = `${editorDraft.planId}:${editorDraft.baseVersion}`;
    if (!submitGateRef.current.acquire(operationKey)) {
      tracePlanWrite({
        operation: 'structure',
        stage: 'submit_blocked_inflight',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: pendingIntentRef.current?.mutationId,
        idempotencyKey: pendingIntentRef.current?.idempotencyKey,
        planId: editorDraft?.planId,
      });
      return;
    }

    const remoteRequest = {
      planId: changeset.planId,
      expectedPlanVersion: changeset.expectedPlanVersion,
      operations: changeset.operations.map((op) => ({
        localId: op.localId,
        entityType: op.entityType,
        action: op.operation === 'add' ? 'create' as const
          : op.operation === 'trash' ? 'trash' as const
          : 'update' as const,
        entityId: op.entityId ?? null,
        expectedVersion: op.expectedVersion ?? null,
        classification: (op.payload.classification as PlanClassification | undefined) ?? undefined,
        sortOrder: op.payload.sort_order !== undefined
          ? Number(op.payload.sort_order)
          : op.payload.sortOrder !== undefined
          ? Number(op.payload.sortOrder)
          : undefined,
        payload: op.payload,
      })),
    };

    const intent = (pendingIntentRef.current
      ?? pendingIntent
      ?? createPlanStructureWriteIntent({ expectedPlanVersion: editorDraft.baseVersion }));

    if (!pendingIntentRef.current) {
      tracePlanWrite({
        operation: 'structure',
        stage: 'intent_created',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: editorDraft.planId,
      });
    }
    pendingIntentRef.current = intent;
    setPendingIntent(intent);
    setSubmitting(true);
    setSyncMessage('Guardando estructura...');

    try {
      tracePlanWrite({
        operation: 'structure',
        stage: 'enqueue_call',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: editorDraft.planId,
      });
      const result = await enqueuePlannerPlanStructureChangeset<{
        data: { plan: { id: string; version: number } };
        noop?: boolean;
      }>(remoteRequest, intent);

      submitGateRef.current.release(operationKey);
      setPendingIntent(null);
      pendingIntentRef.current = null;
      setSyncMessage('Estructura actualizada.');

      tracePlanWrite({
        operation: 'structure',
        stage: 'terminal_callback',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: editorDraft.planId,
        status: 'confirmed',
      });

      navigation.goBack();
    } catch (err) {
      const isConflict = err instanceof Error && (err as any).code === 'version_conflict';
      setSyncMessage(isConflict
        ? 'Otra persona edito la estructura. Recarga para continuar.'
        : 'No pudimos confirmar el guardado. Tus cambios siguen en pantalla.');

      tracePlanWrite({
        operation: 'structure',
        stage: 'terminal_callback',
        surface: 'PlannerPlanStructureEditScreen',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
        planId: editorDraft.planId,
        status: err instanceof Error ? err.name : 'error',
      });

      Alert.alert('Planner', err instanceof Error ? err.message : 'No pudimos guardar la estructura.');
    } finally {
      submitGateRef.current.release(operationKey);
      setSubmitting(false);
    }
  }, [accessToken, editorDraft, pendingIntent, navigation]);

  const handleAddMilestone = useCallback((entry: Omit<MilestoneEditorDraftEntry, 'localId' | 'sortOrder'>) => {
    setEditorDraft((draft) => (draft ? addMilestoneToDraft(draft, entry) : draft));
  }, []);

  const handleEditMilestone = useCallback((localId: string, patch: Partial<Pick<MilestoneEditorDraftEntry, 'title' | 'completionMode'>>) => {
    setEditorDraft((draft) => (draft ? updateMilestoneInDraft(draft, localId, patch) : draft));
  }, []);

  const handleRemoveMilestone = useCallback((localId: string) => {
    setEditorDraft((draft) => (draft ? removeMilestoneFromDraft(draft, localId) : draft));
  }, []);

  const handleMoveMilestoneUp = useCallback((localId: string) => {
    setEditorDraft((draft) => (draft ? moveMilestoneUp(draft, localId) : draft));
  }, []);

  const handleMoveMilestoneDown = useCallback((localId: string) => {
    setEditorDraft((draft) => (draft ? moveMilestoneDown(draft, localId) : draft));
  }, []);

  if (loading) {
    return (
      <View style={[S.safe, { alignItems: 'center', justifyContent: 'center', padding: spacing[5] }]}>
        <ActivityIndicator color={colors.terracotta[500]} />
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: spacing[3] }}>
          Preparando estructura...
        </AppText>
      </View>
    );
  }

  if (error || !editorDraft) {
    return (
      <View style={[S.safe, { padding: spacing[5] }]}>
        <ErrorState
          title="No pudimos abrir la estructura"
          description={error ?? 'Estructura no disponible.'}
          retryLabel="Reintentar"
          onRetry={() => void load()}
        />
      </View>
    );
  }

  return (
    <PlannerMilestoneEditorSurface
      editorDraft={editorDraft}
      submitting={submitting}
      syncMessage={syncMessage}
      onAddMilestone={handleAddMilestone}
      onEditMilestone={handleEditMilestone}
      onRemoveMilestone={handleRemoveMilestone}
      onMoveMilestoneUp={handleMoveMilestoneUp}
      onMoveMilestoneDown={handleMoveMilestoneDown}
      onSave={() => void handleSave()}
      onCancel={() => navigation.goBack()}
    />
  );
}