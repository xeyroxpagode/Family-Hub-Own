/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset Detail/Preview view state.
 *
 * Lane-owned PURE module. Determines the safe action set a Detail/Preview
 * surface may surface, given the preset's source, revisions and capabilities.
 * The actual UI consumes this purely; tests exercise it without React.
 *
 * Privacy rule enforced here: HomePlus-source presets never present an "Edit"
 * action against the original, because HomePlus originals are read-only.
 */
import type {
  PlannerPreset,
  PlannerPresetSource,
} from '../../../types/plannerPresetsDrafts';

export type PresetDetailAction =
  | 'use'
  | 'edit'
  | 'duplicate'
  | 'trash'
  | 'restore';

export type PresetDetailInteraction = {
  readonly canUse: boolean;
  readonly canEdit: boolean;
  readonly canDuplicate: boolean;
  readonly canTrash: boolean;
  readonly canRestore: boolean;
  readonly actions: readonly PresetDetailAction[];
  /** Active revision summary (safe values only). */
  readonly activeRevisionNumber: number | null;
  readonly hasRevisions: boolean;
  /**
   * True when this preset is in the trash bucket (trashed_at !== null).
   */
  readonly isTrashed: boolean;
  /** Retention expiry if exposed by the contract; used as safe display hint. */
  readonly retentionExpiresAt: string | null;
};

/**
 * Compute the interaction envelope for a preset given `capabilities`. The
 * capabilities reflect the backend capability resolve (`planner.templates.use`
 * / `planner.templates.manage`).
 */
export function describePresetDetailInteraction(
  preset: PlannerPreset,
  capabilities: { use: boolean; manage: boolean },
): PresetDetailInteraction {
  const isHomePlus = preset.source === 'homeplus';
  const hasManageCapability = capabilities.manage && !isHomePlus;
  const isTrashed = preset.trashed_at !== null;

  const actions: PresetDetailAction[] = [];
  const canUse = capabilities.use && !isTrashed;
  if (canUse) actions.push('use');

  const canEdit = hasManageCapability && !isTrashed;
  if (canEdit) actions.push('edit');

  // Duplicate: surfaced only for personal & household sources (HomePlus
  // originals cannot be duplicated — there is no `duplicate` backend route on
  // the Presets v1 contract; the lane deliberately maps it to no-op rather
  // than fire an unsupported request).
  const canDuplicate = !isHomePlus && !isTrashed && capabilities.use;
  if (canDuplicate) actions.push('duplicate');

  const canTrash = hasManageCapability && !isTrashed;
  if (canTrash) actions.push('trash');

  const canRestore = hasManageCapability && isTrashed;
  if (canRestore) actions.push('restore');

  const revisions = preset.planner_preset_revisions ?? [];
  const active = revisions.find((r) => r.revision_state === 'published');
  return {
    canUse,
    canEdit,
    canDuplicate,
    canTrash,
    canRestore,
    actions,
    activeRevisionNumber: active?.revision_number ?? null,
    hasRevisions: revisions.length > 0,
    isTrashed,
    retentionExpiresAt: preset.retention_expires_at,
  };
}

/** Safe label for a source (delegates to library view state labels). */
export function safeSourceLabel(source: PlannerPresetSource): string {
  switch (source) {
    case 'homeplus':
      return 'HomePlus';
    case 'personal':
      return 'Personal';
    case 'household':
      return 'Familiar';
  }
}
