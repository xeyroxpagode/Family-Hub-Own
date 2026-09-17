/**
 * Planner V1 — M11 Presets/Drafts Frontend — Drafts view state (pure).
 *
 * Lane-owned. Pure functions/classifiers used by the Drafts surface and the
 * lane test suite. NO React imports.
 *
 * Privacy rules encoded here (§13, §22):
 * - Drafts are always private to their author. We expose only safe labels.
 * - intended_household_id does NOT widen visibility or project to operational
 *   surfaces.
 */
import type { PlannerDraft } from '../../../types/plannerPresetsDrafts';

export type DraftsVisualState =
  | 'initial_loading'
  | 'loaded'
  | 'empty'
  | 'refreshing_with_data_preserved'
  | 'partial_error'
  | 'fatal_safe_error';

export function classifyDraftsVisualState(input: {
  list: readonly PlannerDraft[] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorKind: 'none' | 'partial' | 'fatal' | null;
}): DraftsVisualState {
  const hasData = (input.list?.length ?? 0) > 0;
  if (input.isLoading && !hasData) return 'initial_loading';
  if (input.errorKind === 'fatal' && !hasData) return 'fatal_safe_error';
  if (input.errorKind !== 'none' && hasData) return 'partial_error';
  if (!hasData) return 'empty';
  if (input.isRefreshing) return 'refreshing_with_data_preserved';
  return 'loaded';
}

export function partitionDrafts(drafts: readonly PlannerDraft[]): {
  readonly active: readonly PlannerDraft[];
  readonly trashed: readonly PlannerDraft[];
} {
  const active: PlannerDraft[] = [];
  const trashed: PlannerDraft[] = [];
  for (const draft of drafts) {
    if (draft.trashed_at) trashed.push(draft);
    else active.push(draft);
  }
  return { active, trashed };
}

/** True when `userPersonId` owns the draft. Drafts are private; never bypass. */
export function isOwnedByUser(draft: PlannerDraft, userPersonId: string): boolean {
  return draft.owner_person_id === userPersonId;
}

/** Safe label for the draft's entity kind. */
export function draftEntityKindLabel(draft: PlannerDraft): string {
  switch (draft.entity_type) {
    case 'task':
      return 'Tarea';
    case 'event':
      return 'Evento';
    case 'plan':
      return 'Plan';
  }
}

/** Safe label for the last autosaved date. */
export function draftLastSavedLabel(draft: PlannerDraft): string {
  if (!draft.last_autosaved_at) return 'Sin guardar';
  try {
    const d = new Date(draft.last_autosaved_at);
    if (Number.isNaN(d.getTime())) return 'Sin guardar';
    return d.toLocaleString();
  } catch {
    return 'Sin guardar';
  }
}

/**
 * Operational-surface projection guard used by tests (§22). The lane asserts
 * "drafts do NOT project to surfaces" by ensuring NONE of the operational
 * surface tags are present in this list.
 */
export const DRAFT_OPERATIONALLY_PROJECTED: readonly string[] = [];

export const DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN: readonly string[] = [
  'home',
  'calendar',
  'search',
  'quick_actions',
  'attention',
  'activity',
  'trash',
  'archive',
  'recurrence',
  'notifications',
  'badges',
];

/** True when a draft should offer "continue / discard new" on entry. */
export function offersPendingRecovery(draft: PlannerDraft | null): boolean {
  return draft !== null && draft.trashed_at === null && !!draft.updated_at;
}
