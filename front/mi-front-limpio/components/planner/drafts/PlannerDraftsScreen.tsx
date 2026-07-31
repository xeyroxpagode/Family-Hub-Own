/**
 * Planner V1 — M11 Presets/Drafts Frontend — Drafts screen.
 *
 * Lane-owned. Lists the user's OWN drafts (active + trashed partitioned), with
 * recovery actions: continue / start-from-scratch / send-to-trash / restore.
 *
 * Privacy:
 *  - Each draft row is private to the author. We do NOT render drafts owned
 *    by another person. The list hook filters by `owner_person_id === me`.
 *  - intended household is shown ONLY as a label (Vamos a crearlo en el hogar
 *    X) — it does NOT publish to household surfaces.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import { useAuth } from '../../../context/AuthContext';
import {
  getPlannerDraft,
  listPlannerDrafts,
  restorePlannerDraft,
  trashPlannerDraft,
} from '../../../services/plannerDrafts';
import {
  classifyDraftsVisualState,
  draftEntityKindLabel,
  draftLastSavedLabel,
  isOwnedByUser,
  offersPendingRecovery,
  partitionDrafts,
} from './plannerDraftsViewState';
import type { PlannerDraft, PlannerTemplateEntityType } from '../../../types/plannerPresetsDrafts';
import { openDraft, draftRecoverySafeMessage } from '../../../services/planner/plannerDraftEntry';
import type { ResolvedPlaceholders } from '../../../services/planner/plannerPlaceholderResolver';

const EMPTY_RESOLVED: ResolvedPlaceholders = {};

type Props = {
  onContinueDraft?: (draft: PlannerDraft) => void;
  onOpenTrash?: () => void;
  /** Test/Storybook override token. */
  accessTokenOverride?: string;
  /** Test/Storybook override user id. */
  currentUserPersonIdOverride?: string;
};

export function PlannerDraftsScreen({
  onContinueDraft,
  onOpenTrash,
  accessTokenOverride,
  currentUserPersonIdOverride,
}: Props) {
  const { session } = useAuth();
  const accessToken = accessTokenOverride ?? session?.access_token;
  const [drafts, setDrafts] = useState<readonly PlannerDraft[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorKind, setErrorKind] = useState<'none' | 'partial' | 'fatal' | null>('none');
  const [recoverMessage, setRecoverMessage] = useState<string>('');

  const loadFresh = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      setErrorKind('fatal');
      return;
    }
    setIsLoading(true);
    setErrorKind('none');
    try {
      const response = await listPlannerDrafts(accessToken);
      setDrafts(response.drafts);
    } catch {
      setErrorKind('fatal');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFresh();
  }, [loadFresh]);

  // Pending-draft recovery is surfaced by the form host when the user ENTERS a
  // create flow (§14). The Drafts list screen only renders active + trashed
  // drafts; it never issues recovery probes of its own.

  const visualState = useMemo(
    () =>
      classifyDraftsVisualState({
        list: drafts,
        isLoading,
        isRefreshing,
        errorKind,
      }),
    [drafts, isLoading, isRefreshing, errorKind],
  );

  const partitions = useMemo(() => partitionDrafts(drafts ?? []), [drafts]);

  const handleRestore = useCallback(
    async (draft: PlannerDraft) => {
      if (!accessToken || !draft.version) return;
      try {
        await restorePlannerDraft(accessToken, draft.id, {
          expectedVersion: draft.version,
          mutationId: `draft_restore_${draft.id}`,
          idempotencyKey: `draft_restore_${draft.id}_${draft.version}`,
        });
        await loadFresh();
      } catch {
        setErrorKind('partial');
      }
    },
    [accessToken, loadFresh],
  );

  const handleTrash = useCallback(
    async (draft: PlannerDraft) => {
      if (!accessToken || !draft.version) return;
      try {
        await trashPlannerDraft(accessToken, draft.id, {
          expectedVersion: draft.version,
          mutationId: `draft_trash_${draft.id}`,
          idempotencyKey: `draft_trash_${draft.id}_${draft.version}`,
        });
        await loadFresh();
      } catch {
        setErrorKind('partial');
      }
    },
    [accessToken, loadFresh],
  );

  const handleContinue = useCallback(
    async (draftId: string) => {
      if (!accessToken || !currentUserPersonIdOverride) return;
      try {
        const draft = await getPlannerDraft(accessToken, draftId);
        const result = openDraft(draft.draft, { currentOwnerId: currentUserPersonIdOverride }, EMPTY_RESOLVED);
        if (result.kind === 'opened') {
          onContinueDraft?.(draft.draft);
        } else {
          setRecoverMessage(draftRecoverySafeMessage(result));
        }
      } catch {
        setErrorKind('partial');
      }
    },
    [accessToken, currentUserPersonIdOverride, onContinueDraft],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <AppText variant="title2" weight="700">
        Borradores
      </AppText>
      {recoverMessage ? (
        <View style={[S.toastBox, { marginTop: 8 }]}>
          <AppText variant="bodySmall" tone="warning" style={{ flex: 1 }}>
            {recoverMessage}
          </AppText>
        </View>
      ) : null}

      {visualState === 'initial_loading' ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {visualState === 'fatal_safe_error' ? (
        <AppText variant="body" tone="danger" style={{ marginTop: 12 }}>
          No pudimos cargar tus borradores.
        </AppText>
      ) : null}

      {visualState === 'empty' ? (
        <AppText variant="body" tone="tertiary" style={{ marginTop: 16 }}>
          No tenés borradores guardados.
        </AppText>
      ) : null}

      {visualState === 'loaded'
        || visualState === 'refreshing_with_data_preserved'
        || visualState === 'partial_error' ? (
        <View style={{ marginTop: 12 }}>
          {partitions.active.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              currentUserPersonId={currentUserPersonIdOverride ?? ''}
              canRecover={offersPendingRecovery(draft)}
              onContinue={() => void handleContinue(draft.id)}
              onTrash={() => void handleTrash(draft)}
              onRestore={undefined}
            />
          ))}
          {partitions.trashed.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <AppText variant="bodySmall" weight="700" style={{ marginBottom: 4 }}>
                Papelera
              </AppText>
              {partitions.trashed.map((draft) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  currentUserPersonId={currentUserPersonIdOverride ?? ''}
                  canRecover={false}
                  onContinue={() => void handleContinue(draft.id)}
                  onTrash={undefined}
                  onRestore={() => void handleRestore(draft)}
                />
              ))}
              {onOpenTrash ? (
                <TouchableOpacity
                  onPress={onOpenTrash}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir papelera de borradores"
                >
                  <AppText variant="bodySmall" tone="tertiary" style={{ marginTop: 8 }}>
                    Ver papelera
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {recoverMessage ? null : null}
    </ScrollView>
  );
}

function DraftRow({
  draft,
  currentUserPersonId,
  canRecover,
  onContinue,
  onTrash,
  onRestore,
}: {
  draft: PlannerDraft;
  currentUserPersonId: string;
  canRecover: boolean;
  onContinue?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
}) {
  const mine = isOwnedByUser(draft, currentUserPersonId);
  if (!mine) return null;
  return (
    <View style={[S.row, { marginTop: 12, alignItems: 'flex-start' }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600">
          {draftEntityKindLabel(draft)}
        </AppText>
        <AppText variant="micro" tone="tertiary">
          Guardado: {draftLastSavedLabel(draft)}
          {draft.intended_scope === 'household' ? ' · Para el hogar' : ''}
        </AppText>
      </View>
      {canRecover && onContinue ? (
        <TouchableOpacity
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continuar borrador"
          style={actionBlue}
        >
          <AppText variant="bodySmall" tone="inverse" weight="700">
            Continuar
          </AppText>
        </TouchableOpacity>
      ) : null}
      {onTrash ? (
        <TouchableOpacity
          onPress={onTrash}
          accessibilityRole="button"
          accessibilityLabel="Enviar borrador a papelera"
          style={actionGhost}
        >
          <AppText variant="bodySmall" tone="tertiary" weight="700">
            Papelera
          </AppText>
        </TouchableOpacity>
      ) : null}
      {onRestore ? (
        <TouchableOpacity
          onPress={onRestore}
          accessibilityRole="button"
          accessibilityLabel="Restaurar borrador"
          style={actionBlue}
        >
          <AppText variant="bodySmall" tone="inverse" weight="700">
            Restaurar
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const actionBlue = {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: '#2B6CB0',
  marginLeft: 8,
};
const actionGhost = {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  marginLeft: 8,
  borderWidth: 1,
  borderColor: '#CBD5E1',
};
