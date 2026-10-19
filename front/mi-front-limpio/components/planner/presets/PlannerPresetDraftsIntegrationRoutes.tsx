/**
 * Planner V1 M11 Integration-owned Presets/Drafts route containers.
 *
 * The lane screens stay callback-driven. This file is the bridge that registers
 * them in the existing Planner stack and delegates create/recovery gestures to
 * PlannerSheetHost via PlannerSheetContext.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../../context/AuthContext';
import { usePlannerSheet } from '../../../context/PlannerSheetContext';
import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import type { PlannerDraft, PlannerPreset } from '../../../types/plannerPresetsDrafts';
import {
  createPlannerPresetIdentity,
  duplicatePlannerPresetToHousehold,
  getPlannerPreset,
  preparePlannerPresetApplication,
  updatePlannerPresetRevisionDraft,
} from '../../../services/plannerPresets';
import { getPlannerDraft } from '../../../services/plannerDrafts';
import {
  enqueuePlannerPresetCreate,
  enqueuePlannerPresetPublishRevision,
  enqueuePlannerPresetRestore,
  enqueuePlannerPresetStartRevision,
  enqueuePlannerPresetTrash,
  enqueuePlannerPresetUpdate,
} from '../../../services/planner/reliability';
import {
  presetTaskPayloadFromPreset,
  presetTaskPayloadsDiffer,
  type PlannerPresetTaskPayload,
} from '../../../services/planner/plannerPresetTaskDomain';
import { PRESET_ADAPTER_KEYS } from '../../../services/planner/plannerPresetContracts';
import { applyPlannerPreset } from '../../../services/planner/plannerPresetAdapters';
import { applyPlannerDraft } from '../../../services/planner/plannerDraftAdapters';
import type { DraftOpenFormRequest } from '../../../services/planner/plannerDraftEntry';
import {
  createLaneCorrelationId,
  draftApplicationToFormOpenRequest,
  presetApplicationToFormOpenRequest,
  type PresetDraftsFormOpenRequest,
} from '../../../navigation/plannerPresetDraftsRouteDescriptors';
import { ROUTE_NAMES } from '../../../navigation/plannerNavigationContract';
import { PlannerDraftsScreen } from '../drafts/PlannerDraftsScreen';
import { PlannerPresetDetailScreen } from './PlannerPresetDetailScreen';
import {
  PlannerPresetEditorScreen,
  type PlannerPresetEditorCommitInput,
} from './PlannerPresetEditorScreen';
import { PlannerPresetFormScreen } from './PlannerPresetFormScreen';
import { PlannerPresetDraftsTrashScreen } from './PlannerPresetDraftsTrashScreen';
import { PlannerPresetLibraryScreen } from './PlannerPresetLibraryScreen';
import type { PresetDetailAction } from './plannerPresetDetailViewState';

const EMPTY_RESOLVED = {};
const PRESET_CAPABILITIES = { use: true, manage: true };

type Navigation = {
  navigate: (routeName: string, params?: Record<string, unknown>) => void;
  popTo: (routeName: string, params?: Record<string, unknown>, options?: { merge?: boolean }) => void;
  goBack: () => void;
};

export function PlannerPresetLibraryRoute() {
  const navigation = useNavigation<Navigation>();

  return (
    <PlannerPresetLibraryScreen
      onBack={() => navigation.goBack()}
      onOpenPreset={(preset) => navigation.navigate(ROUTE_NAMES.PresetDetail, { presetId: preset.id })}
      onCreatePreset={() => navigation.navigate(ROUTE_NAMES.PresetCreate)}
      onOpenTrash={() => navigation.navigate(ROUTE_NAMES.PresetDraftsTrash)}
    />
  );
}

export function PlannerPresetDetailRoute() {
  const route = useRoute<any>();
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth();
  const sheet = usePlannerSheet();
  const presetId = route.params?.presetId as string | undefined;
  const [preset, setPreset] = useState<PlannerPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [safeError, setSafeError] = useState<string | null>(null);

  // Resolve the token/ids into stable primitives so the memoization the linter
  // must preserve has plain, comparable dependencies.
  const detailToken = session?.access_token ?? null;
  const detailPresetId = presetId ?? null;
  const loadPreset = useCallback(async () => {
    if (!detailToken || !detailPresetId) {
      setSafeError('No pudimos abrir este preset.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setSafeError(null);
    try {
      const response = await getPlannerPreset(detailToken, detailPresetId);
      setPreset(response.preset);
    } catch {
      setSafeError('No pudimos abrir este preset.');
    } finally {
      setLoading(false);
    }
  }, [detailPresetId, detailToken]);

  useEffect(() => {
    void loadPreset();
  }, [loadPreset]);

  // P2.2A-R1 (defecto 2G): al volver con goBack desde Editar, el detalle ya
  // estaba montado y mostraba datos stale. Recarga única al recuperar foco.
  const isDetailFocused = useIsFocused();
  const wasDetailFocusedRef = useRef(isDetailFocused);
  useEffect(() => {
    const wasFocused = wasDetailFocusedRef.current;
    wasDetailFocusedRef.current = isDetailFocused;
    if (isDetailFocused && !wasFocused) {
      void loadPreset();
    }
  }, [isDetailFocused, loadPreset]);

  const handleAction = useCallback(
    async (action: PresetDetailAction, targetPreset: PlannerPreset) => {
      const token = session?.access_token;
      if (!token) return;

      if (action === 'use') {
        // P2.2A: canonical Task presets apply through the pure domain merge
        // into the Task create form; the form keeps authority over submit.
        if (targetPreset.entity_type === 'task') {
          const presetPayload = presetTaskPayloadFromPreset(targetPreset);
          if (!presetPayload || !presetPayload.title) {
            setSafeError('No pudimos usar este preset con la version actual.');
            return;
          }
          navigation.navigate('CreateTask', { presetPayload });
          return;
        }
        if (targetPreset.entity_type === 'plan') {
          // A Plan preset is form prefill only. Always enter the canonical
          // planner_goals create form; never open the retired planner_plans
          // sheet writer.
          navigation.navigate(ROUTE_NAMES.PlanCreate, { sourcePresetId: targetPreset.id });
          return;
        }
        try {
          await preparePlannerPresetApplication(token, targetPreset.id, targetPreset.active_revision_id ?? undefined);
          const revision = targetPreset.planner_preset_revisions?.find((item) => item.id === targetPreset.active_revision_id)
            ?? targetPreset.planner_preset_revisions?.find((item) => item.revision_state === 'published')
            ?? targetPreset.planner_preset_revisions?.[0];
          const applied = applyPlannerPreset({ kind: 'preset', preset: targetPreset, revision }, EMPTY_RESOLVED);
          if (!applied.applicable) {
            setSafeError('No pudimos usar este preset con la version actual.');
            return;
          }
          openPresetDraftForm(
            sheet,
            presetApplicationToFormOpenRequest(applied, targetPreset, {
              laneCorrelationId: createLaneCorrelationId('preset_apply'),
              preserveSourceReference: true,
            }),
          );
          navigation.goBack();
        } catch {
          setSafeError('No pudimos usar este preset con la version actual.');
        }
        return;
      }

      if (action === 'edit') {
        navigation.navigate(ROUTE_NAMES.PresetEdit, { presetId: targetPreset.id });
        return;
      }

      if (action === 'duplicate') {
        navigation.navigate(ROUTE_NAMES.PresetCreate, { duplicateFromPresetId: targetPreset.id });
        return;
      }

      if (action === 'trash' && targetPreset.version) {
        const identity = createPlannerPresetIdentity('planner.presets.trash');
        await enqueuePlannerPresetTrash(targetPreset.id, {
          expectedVersion: targetPreset.version,
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        await loadPreset();
        return;
      }

      if (action === 'restore' && targetPreset.version) {
        const identity = createPlannerPresetIdentity('planner.presets.restore');
        await enqueuePlannerPresetRestore(targetPreset.id, {
          expectedVersion: targetPreset.version,
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        await loadPreset();
      }
    },
    [loadPreset, navigation, session?.access_token, sheet],
  );

  if (loading) return <LoadingState label="Cargando preset..." />;
  if (!preset) return <SafeErrorState message={safeError ?? 'No pudimos abrir este preset.'} onRetry={loadPreset} />;

  return (
    <View style={{ flex: 1 }}>
      {safeError ? <InlineWarning message={safeError} /> : null}
      <PlannerPresetDetailScreen
        preset={preset}
        capabilities={PRESET_CAPABILITIES}
        onAction={(action, targetPreset) => void handleAction(action, targetPreset)}
      />
    </View>
  );
}

export function PlannerPresetCreateRoute() {
  const route = useRoute<any>();
  const navigation = useNavigation<Navigation>();
  const duplicateFromPresetId = route.params?.duplicateFromPresetId as string | undefined;
  const presetPrefill = route.params?.presetPrefill as PlannerPresetTaskPayload | undefined;
  const returnToTaskDraft = Boolean(route.params?.returnToTaskDraft);
  const returnRouteName = route.params?.returnRouteName as string | undefined;
  const { session } = useAuth();
  const [initialPreset, setInitialPreset] = useState<PlannerPreset | undefined>(undefined);
  const [safeError, setSafeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!duplicateFromPresetId || !session?.access_token) return;
    let disposed = false;
    void getPlannerPreset(session.access_token, duplicateFromPresetId)
      .then((response) => {
        if (!disposed) setInitialPreset(response.preset);
      })
      .catch(() => {
        if (!disposed) setSafeError('No pudimos preparar la copia.');
      });
    return () => { disposed = true; };
  }, [duplicateFromPresetId, session?.access_token]);

  const initialPayload: PlannerPresetTaskPayload | null = initialPreset
    ? presetTaskPayloadFromPreset(initialPreset)
    : presetPrefill ?? presetTaskPayloadFromPreset(null);

  const commit = useCallback(
    async (input: PlannerPresetEditorCommitInput) => {
      const token = session?.access_token;
      if (!token || submitting) return;
      setSubmitting(true);
      setSafeError(null);
      try {
        if (initialPreset && initialPreset.source === 'homeplus') {
          // P2.2A (contract §14): duplicating a HomePlus preset goes through
          // the server-side copy route — a NEW editable household row, no
          // live sync with the original.
          const identity = createPlannerPresetIdentity('planner.presets.duplicate');
          await duplicatePlannerPresetToHousehold(
            token,
            initialPreset.id,
            { name: input.name, payload: input.payload as unknown as Record<string, unknown> },
            { mutationId: identity.mutationId, idempotencyKey: identity.idempotencyKey },
          );
        } else {
          // Canonical create scope is ALWAYS household; canonical kind is task.
          const identity = createPlannerPresetIdentity('planner.presets.create');
          await enqueuePlannerPresetCreate({
            name: input.name,
            entity_type: 'task',
            source: 'household',
            adapter_key: PRESET_ADAPTER_KEYS.task,
            payload: input.payload as unknown as Record<string, unknown>,
          }, {
            mutationId: identity.mutationId,
            idempotencyKey: identity.idempotencyKey,
          });
        }
        if (returnToTaskDraft && returnRouteName) {
          navigation.popTo(returnRouteName, {
            presetPayload: input.payload,
            presetApplicationKey: Date.now(),
          }, { merge: true });
        } else {
          navigation.goBack();
        }
      } catch {
        setSafeError('No pudimos guardar el preset.');
      } finally {
        setSubmitting(false);
      }
    },
    [initialPreset, navigation, returnRouteName, returnToTaskDraft, session?.access_token, submitting],
  );

  // P2.2A-R1 (defecto 6): el editor inicializa su estado UNA vez al montar
  // (useState). Antes se renderizaba inmediatamente con payload null y la
  // carga async del original llegaba tarde sin actualizar el form: duplicar
  // mostraba un form vacío. Se espera a tener el original antes de montar.
  if (duplicateFromPresetId && initialPreset === undefined && !safeError) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState label="Preparando copia..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {safeError ? <InlineWarning message={safeError} /> : null}
      <PlannerPresetEditorScreen
        mode="create"
        initialPayload={initialPayload}
        submitting={submitting}
        onCommit={(input) => void commit(input)}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
}

export function PlannerPresetEditRoute() {
  const route = useRoute<any>();
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth();
  const presetId = route.params?.presetId as string | undefined;
  const [preset, setPreset] = useState<PlannerPreset | null>(null);
  const [safeError, setSafeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editToken = session?.access_token ?? null;
  const editPresetId = presetId ?? null;
  const loadPreset = useCallback(async () => {
    if (!editToken || !editPresetId) return;
    try {
      const response = await getPlannerPreset(editToken, editPresetId);
      setPreset(response.preset);
    } catch {
      setSafeError('No pudimos abrir este preset.');
    }
  }, [editPresetId, editToken]);

  useEffect(() => {
    void loadPreset();
  }, [loadPreset]);

  const commit = useCallback(
    async (input: PlannerPresetEditorCommitInput) => {
      const token = session?.access_token;
      if (!token || !preset || submitting) return;
      setSubmitting(true);
      setSafeError(null);
      try {
        const nameChanged = input.name.trim() !== preset.name.trim();
        const payloadChanged = presetTaskPayloadsDiffer(presetTaskPayloadFromPreset(preset), input.payload);

        if (nameChanged) {
          // Productive Preset mutation goes through the reliability enqueue
          // layer (the raw service is not a UI entry point).
          const identity = createPlannerPresetIdentity('planner.presets.update');
          await enqueuePlannerPresetUpdate(preset.id, input.name.trim(), {
            expectedVersion: preset.version,
            mutationId: identity.mutationId,
            idempotencyKey: identity.idempotencyKey,
          });
        }

        if (payloadChanged) {
          // Canonical revision cycle: start draft → update payload → publish.
          const startIdentity = createPlannerPresetIdentity('planner.presets.revisions.start');
          const started = await enqueuePlannerPresetStartRevision(preset.id, {
            mutationId: startIdentity.mutationId,
            idempotencyKey: startIdentity.idempotencyKey,
          });
          const draftRevision = started.preset;
          const updateIdentity = createPlannerPresetIdentity('planner.presets.revisions.update');
          const updated = await updatePlannerPresetRevisionDraft(
            token,
            draftRevision.id,
            {
              adapter_key: PRESET_ADAPTER_KEYS.task,
              entity_type: 'task',
              payload: input.payload as unknown as Record<string, unknown>,
            },
            {
              expectedVersion: draftRevision.version,
              mutationId: updateIdentity.mutationId,
              idempotencyKey: updateIdentity.idempotencyKey,
            },
          );
          const publishIdentity = createPlannerPresetIdentity('planner.presets.revisions.publish');
          await enqueuePlannerPresetPublishRevision(draftRevision.id, {
            expectedVersion: updated.data.version,
            mutationId: publishIdentity.mutationId,
            idempotencyKey: publishIdentity.idempotencyKey,
          });
        }

        navigation.goBack();
      } catch {
        setSafeError('No pudimos guardar los cambios.');
      } finally {
        setSubmitting(false);
      }
    },
    [navigation, preset, session?.access_token, submitting],
  );

  if (!preset) return <LoadingState label="Cargando preset..." />;

  // Non-task presets keep the legacy lane form (compatibility-only surface:
  // P2.2A canonical UX is task-only; event/plan rows are preserved, not
  // promoted).
  if (preset.entity_type !== 'task') {
    return (
      <View style={{ flex: 1 }}>
        {safeError ? <InlineWarning message={safeError} /> : null}
        <PlannerPresetFormScreen
          mode="edit"
          initialPreset={preset}
          capabilities={PRESET_CAPABILITIES}
          onCommit={() => navigation.goBack()}
          onCancel={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {safeError ? <InlineWarning message={safeError} /> : null}
      <PlannerPresetEditorScreen
        mode="edit"
        initialPayload={presetTaskPayloadFromPreset(preset)}
        submitting={submitting}
        onCommit={(commitInput) => void commit(commitInput)}
        onCancel={() => navigation.goBack()}
      />
    </View>
  );
}

export function PlannerDraftRecoveryRoute() {
  const navigation = useNavigation<Navigation>();
  const { authMe } = useAuth();

  return (
    <PlannerDraftsScreen
      currentUserPersonIdOverride={authMe?.person?.id ?? ''}
      onContinueDraft={(draft) => navigation.navigate(ROUTE_NAMES.DraftResume, { draftId: draft.id })}
    />
  );
}

export function PlannerDraftResumeRoute() {
  const route = useRoute<any>();
  const navigation = useNavigation<Navigation>();
  const { session, authMe } = useAuth();
  const sheet = usePlannerSheet();
  const draftId = route.params?.draftId as string | undefined;
  const [safeError, setSafeError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || !authMe?.person?.id || !draftId) {
      setSafeError('No pudimos abrir este borrador.');
      return;
    }
    let disposed = false;
    void getPlannerDraft(session.access_token, draftId)
      .then((response) => {
        if (disposed) return;
        const openedCanonicalRoute = openDraftInSheet(sheet, response.draft, authMe.person?.id ?? '', navigation);
        if (!openedCanonicalRoute) navigation.goBack();
      })
      .catch(() => {
        if (!disposed) setSafeError('No pudimos abrir este borrador.');
      });
    return () => { disposed = true; };
  }, [authMe?.person?.id, draftId, navigation, session?.access_token, sheet]);

  return safeError ? <SafeErrorState message={safeError} onRetry={() => navigation.goBack()} /> : <LoadingState label="Abriendo borrador..." />;
}

export function PlannerPresetDraftsTrashRoute() {
  return <PlannerPresetDraftsTrashScreen />;
}

function openDraftInSheet(
  sheet: ReturnType<typeof usePlannerSheet>,
  draft: PlannerDraft,
  currentOwnerId: string,
  navigation: Navigation,
): boolean {
  const application = applyPlannerDraft(draft, currentOwnerId, EMPTY_RESOLVED);
  if (!application.applicable) return false;
  const request = draftApplicationToFormOpenRequest(application, draft.source_preset_id, draft.source_preset_revision_id, {
    laneCorrelationId: createLaneCorrelationId('draft_resume'),
    preserveSourceReference: true,
  });
  if (request.kind === 'plan') {
    navigation.navigate(ROUTE_NAMES.PlanCreate, { sourceDraftId: draft.id });
    return true;
  }
  openPresetDraftForm(sheet, request);
  return false;
}

function openPresetDraftForm(
  sheet: ReturnType<typeof usePlannerSheet>,
  request: PresetDraftsFormOpenRequest | DraftOpenFormRequest,
) {
  const kind = 'kind' in request ? request.kind : request.entityKind;
  if (kind === 'task') {
    sheet.openTaskForm({
      source: 'unknown',
      initialDueDate: 'initialDueDate' in request ? request.initialDueDate : undefined,
    });
    return;
  }
  if (kind === 'event') {
    sheet.openEventForm({
      source: 'unknown',
      initialDate: 'initialDate' in request ? request.initialDate : undefined,
    });
    return;
  }
  sheet.openPlanForm({ source: 'unknown' });
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <ActivityIndicator />
      <AppText variant="bodySmall" tone="tertiary" style={{ marginTop: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

function SafeErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <InlineWarning message={message} />
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="Volver" style={{ marginTop: 12 }}>
          <AppText variant="bodySmall" tone="primary" weight="700">
            Volver
          </AppText>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function InlineWarning({ message }: { message: string }) {
  return (
    <View style={[S.toastBox, { margin: 16, marginBottom: 0 }]}>
      <AppText variant="bodySmall" tone="warning" weight="700" style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}
