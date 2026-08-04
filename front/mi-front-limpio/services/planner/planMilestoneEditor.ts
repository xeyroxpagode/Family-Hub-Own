import type {
  PlanMilestone,
  PlanStructureChangeset,
  PlanStructureOperation,
  PlanStructureSnapshot,
} from '../../types/PlannerPlan';
import { buildChangeset } from './planStructureContract';

export type MilestoneEditorDraftEntry = {
  readonly localId: string;
  title: string;
  description?: string | null;
  completionMode: PlanMilestone['completionMode'];
  sortOrder: number;
};

export type MilestoneEditorDraft = {
  readonly planId: string;
  readonly baseVersion: number;
  readonly originalSnapshot: PlanStructureSnapshot;
  readonly entries: readonly MilestoneEditorDraftEntry[];
};

export const MILESTONE_COMPLETION_MODE_LABELS: Record<PlanMilestone['completionMode'], string> = {
  automatic: 'Automatico',
  manual: 'Manual',
};

let localIdSeq = 0;

export function nextLocalId(): string {
  localIdSeq += 1;
  return `ms:${localIdSeq}`;
}

export function resetLocalIdSeq(value = 0): void {
  localIdSeq = value;
}

export function buildMilestoneEditorDraft(snapshot: PlanStructureSnapshot): MilestoneEditorDraft {
  const entries: MilestoneEditorDraftEntry[] = snapshot.milestones
    .filter((m) => m.lifecycle !== 'trash')
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    })
    .map((m) => ({
      localId: String(m.id),
      title: m.title,
      description: m.description,
      completionMode: m.completionMode,
      sortOrder: m.sortOrder,
    }));

  return {
    planId: snapshot.plan.id,
    baseVersion: snapshot.plan.version,
    originalSnapshot: snapshot,
    entries,
  };
}

export function validateMilestoneEntry(entry: Partial<MilestoneEditorDraftEntry>): readonly string[] {
  const errors: string[] = [];
  if (!entry.title || !entry.title.trim()) errors.push('title_required');
  if (!entry.completionMode) errors.push('completion_mode_required');
  if (entry.completionMode && !['automatic', 'manual'].includes(entry.completionMode as string)) {
    errors.push('completion_mode_invalid');
  }
  return errors;
}

export function addMilestoneToDraft(
  draft: MilestoneEditorDraft,
  entry: Omit<MilestoneEditorDraftEntry, 'localId' | 'sortOrder'>,
): MilestoneEditorDraft {
  const maxOrder = draft.entries.reduce((max, e) => Math.max(max, e.sortOrder), -1);
  const newEntry: MilestoneEditorDraftEntry = {
    ...entry,
    localId: nextLocalId(),
    sortOrder: maxOrder + 1,
  };
  return {
    ...draft,
    entries: [...draft.entries, newEntry],
  };
}

export function updateMilestoneInDraft(
  draft: MilestoneEditorDraft,
  localId: string,
  patch: Partial<Pick<MilestoneEditorDraftEntry, 'title' | 'description' | 'completionMode'>>,
): MilestoneEditorDraft {
  return {
    ...draft,
    entries: draft.entries.map((e) => (e.localId === localId ? { ...e, ...patch } : e)),
  };
}

export function removeMilestoneFromDraft(draft: MilestoneEditorDraft, localId: string): MilestoneEditorDraft {
  return {
    ...draft,
    entries: draft.entries.filter((e) => e.localId !== localId),
  };
}

export function moveMilestoneUp(draft: MilestoneEditorDraft, localId: string): MilestoneEditorDraft {
  const index = draft.entries.findIndex((e) => e.localId === localId);
  if (index <= 0) return draft;
  return swapEntries(draft, index, index - 1);
}

export function moveMilestoneDown(draft: MilestoneEditorDraft, localId: string): MilestoneEditorDraft {
  const index = draft.entries.findIndex((e) => e.localId === localId);
  if (index < 0 || index >= draft.entries.length - 1) return draft;
  return swapEntries(draft, index, index + 1);
}

function swapEntries(draft: MilestoneEditorDraft, aIndex: number, bIndex: number): MilestoneEditorDraft {
  const entries = [...draft.entries];
  const [aEntry] = entries.splice(aIndex, 1);
  entries.splice(bIndex, 0, aEntry);
  const normalized = entries.map((entry, index) => ({
    ...entry,
    sortOrder: index,
  }));
  return { ...draft, entries: normalized };
}

export function buildMilestoneChangeset(draft: MilestoneEditorDraft): PlanStructureChangeset | null {
  const snapshotMilestones = draft.originalSnapshot.milestones
    .filter((m) => m.lifecycle !== 'trash')
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });
  const operations: PlanStructureOperation[] = [];

  const snapIds = new Set(snapshotMilestones.map((m) => m.id));
  const draftIds = new Set<string>();

  for (const entry of draft.entries) {
    draftIds.add(entry.localId);
  }

  for (const entry of draft.entries) {
    const isPersisted = snapIds.has(entry.localId);
    if (!isPersisted) {
      operations.push({
        localId: entry.localId,
        entityType: 'milestone',
        operation: 'add',
        entityId: null,
        expectedVersion: null,
        payload: {
          title: entry.title,
          description: entry.description ?? null,
          completion_mode: entry.completionMode,
          classification: 'supporting',
          sort_order: entry.sortOrder,
        },
      });
      continue;
    }
    const snapMs = snapshotMilestones.find((m) => m.id === entry.localId);
    if (!snapMs) {
      operations.push({
        localId: entry.localId,
        entityType: 'milestone',
        operation: 'trash',
        entityId: entry.localId,
        expectedVersion: null,
        payload: {},
      });
      continue;
    }
    const hasTitleChange = entry.title !== snapMs.title;
    const hasCompletionModeChange = entry.completionMode !== snapMs.completionMode;
    const hasSortOrderChange = entry.sortOrder !== snapMs.sortOrder;
    const hasChanges = hasTitleChange || hasCompletionModeChange || hasSortOrderChange;

    if (hasSortOrderChange && !hasTitleChange && !hasCompletionModeChange) {
      operations.push({
        localId: entry.localId,
        entityType: 'milestone',
        operation: 'reorder',
        entityId: entry.localId,
        expectedVersion: snapMs.version,
        payload: {
          sort_order: entry.sortOrder,
        },
      });
    } else if (hasChanges) {
      operations.push({
        localId: entry.localId,
        entityType: 'milestone',
        operation: 'update',
        entityId: entry.localId,
        expectedVersion: snapMs.version,
        payload: {
          title: entry.title,
          description: entry.description ?? null,
          completion_mode: entry.completionMode,
          sort_order: entry.sortOrder,
        },
      });
    }
  }

  for (const snapMs of snapshotMilestones) {
    if (!draftIds.has(snapMs.id)) {
      operations.push({
        localId: snapMs.id,
        entityType: 'milestone',
        operation: 'trash',
        entityId: snapMs.id,
        expectedVersion: snapMs.version,
        payload: {},
      });
    }
  }

  if (operations.length === 0) return null;

  const orderOps = operations.filter((op) => op.operation === 'reorder');
  const orderSet = new Set<number>();
  for (let i = 0; i < orderOps.length; i++) {
    const so = orderOps[i].payload.sort_order as number;
    if (orderSet.has(so)) {
      orderOps[i] = { ...orderOps[i], payload: { ...orderOps[i].payload, sort_order: Math.max(...orderSet) + 1 } };
    }
    orderSet.add(so);
  }

  return buildChangeset(draft.planId, draft.baseVersion, operations);
}

export function hasDraftChanges(draft: MilestoneEditorDraft): boolean {
  return buildMilestoneChangeset(draft) !== null;
}

export function draftMilestoneCount(draft: MilestoneEditorDraft): number {
  return draft.entries.length;
}