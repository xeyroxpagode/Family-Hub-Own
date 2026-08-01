/**
 * Planner V1 M11 Integration-owned Presets/Drafts route containers.
 *
 * The lane screens stay callback-driven. This file is the bridge that registers
 * them in the existing Planner stack and delegates create/recovery gestures to
 * PlannerSheetHost via PlannerSheetContext.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../../context/AuthContext';
import { usePlannerSheet } from '../../../context/PlannerSheetContext';
import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import type { PlannerDraft, PlannerPreset } from '../../../types/plannerPresetsDrafts';
import {
  createPlannerPresetIdentity,
  getPlannerPreset,
  preparePlannerPresetApplication,
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
  PlannerPresetFormScreen,
  type PresetCommitInput,
} from './PlannerPresetFormScreen';
import { PlannerPresetDraftsTrashScreen } from './PlannerPresetDraftsTrashScreen';
import { PlannerPresetLibraryScreen } from './PlannerPresetLibraryScreen';
import type { PresetDetailAction } from './plannerPresetDetailViewState';

const EMPTY_RESOLVED = {};
const PRESET_CAPABILITIES = { use: true, manage: true };

type Navigation = {
  navigate: (routeName: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
};

export function PlannerPresetLibraryRoute() {
  const navigation = useNavigation<Navigation>();

  return (
    <PlannerPresetLibraryScreen
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

  const loadPreset = useCallback(async () => {
    if (!session?.access_token || !presetId) {
      setSafeError('No pudimos abrir este preset.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setSafeError(null);
    try {
      const response = await getPlannerPreset(session.access_token, presetId);
      setPreset(response.preset);
    } catch {
      setSafeError('No pudimos abrir este preset.');
    } finally {
      setLoading(false);
    }
  }, [presetId, session?.access_token]);

  useEffect(() => {
    void loadPreset();
  }, [loadPreset]);

  const handleAction = useCallback(
    async (action: PresetDetailAction, targetPreset: PlannerPreset) => {
      const token = session?.access_token;
      if (!token) return;

      if (action === 'use') {
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
  const { session } = useAuth();
  const [initialPreset, setInitialPreset] = useState<PlannerPreset | undefined>(undefined);
  const [safeError, setSafeError] = useState<string | null>(null);

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

  const commit = useCallback(
    async (input: PresetCommitInput) => {
      const token = session?.access_token;
      if (!token) return;
      const identity = createPlannerPresetIdentity('planner.presets.create');
      try {
        await enqueuePlannerPresetCreate({
          name: input.name,
          entity_type: input.entity_type,
          source: input.source,
          adapter_key: input.adapter_key,
          payload: input.payload,
        }, {
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        navigation.goBack();
      } catch {
        setSafeError('No pudimos guardar el preset.');
      }
    },
    [navigation, session?.access_token],
  );

  return (
    <View style={{ flex: 1 }}>
      {safeError ? <InlineWarning message={safeError} /> : null}
      <PlannerPresetFormScreen
        mode="create"
        initialPreset={initialPreset}
        capabilities={PRESET_CAPABILITIES}
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

  const loadPreset = useCallback(async () => {
    if (!session?.access_token || !presetId) return;
    try {
      const response = await getPlannerPreset(session.access_token, presetId);
      setPreset(response.preset);
    } catch {
      setSafeError('No pudimos abrir este preset.');
    }
  }, [presetId, session?.access_token]);

  useEffect(() => {
    void loadPreset();
  }, [loadPreset]);

  const commit = useCallback(
    async (input: PresetCommitInput) => {
      const token = session?.access_token;
      if (!token || !preset) return;
      const identity = createPlannerPresetIdentity('planner.presets.update');
      try {
        await enqueuePlannerPresetUpdate(preset.id, input.name, {
          expectedVersion: preset.version,
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        navigation.goBack();
      } catch {
        setSafeError('No pudimos guardar los cambios.');
      }
    },
    [navigation, preset, session?.access_token],
  );

  const startRevision = useCallback(
    async (targetPresetId: string) => {
      const token = session?.access_token;
      if (!token) return;
      const identity = createPlannerPresetIdentity('planner.presets.revisions.start');
      try {
        await enqueuePlannerPresetStartRevision(targetPresetId, {
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        await loadPreset();
      } catch {
        setSafeError('No pudimos iniciar la revision.');
      }
    },
    [loadPreset, session?.access_token],
  );

  const publishRevision = useCallback(
    async (revisionId: string) => {
      const token = session?.access_token;
      const version = preset?.planner_preset_revisions?.find((revision) => revision.id === revisionId)?.version;
      if (!token || version === undefined) return;
      const identity = createPlannerPresetIdentity('planner.presets.revisions.publish');
      try {
        await enqueuePlannerPresetPublishRevision(revisionId, {
          expectedVersion: version,
          mutationId: identity.mutationId,
          idempotencyKey: identity.idempotencyKey,
        });
        await loadPreset();
      } catch {
        setSafeError('No pudimos publicar la revision.');
      }
    },
    [loadPreset, preset?.planner_preset_revisions, session?.access_token],
  );

  if (!preset) return <LoadingState label="Cargando preset..." />;

  return (
    <View style={{ flex: 1 }}>
      {safeError ? <InlineWarning message={safeError} /> : null}
      <PlannerPresetFormScreen
        mode="edit"
        initialPreset={preset}
        capabilities={PRESET_CAPABILITIES}
        onCommit={(input) => void commit(input)}
        onStartRevision={(targetPresetId) => void startRevision(targetPresetId)}
        onPublishRevision={(revisionId) => void publishRevision(revisionId)}
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
      onOpenTrash={() => navigation.navigate(ROUTE_NAMES.PresetDraftsTrash)}
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
        openDraftInSheet(sheet, response.draft, authMe.person?.id ?? '');
        navigation.goBack();
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
) {
  const application = applyPlannerDraft(draft, currentOwnerId, EMPTY_RESOLVED);
  if (!application.applicable) return;
  openPresetDraftForm(
    sheet,
    draftApplicationToFormOpenRequest(application, draft.source_preset_id, draft.source_preset_revision_id, {
      laneCorrelationId: createLaneCorrelationId('draft_resume'),
      preserveSourceReference: true,
    }),
  );
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
