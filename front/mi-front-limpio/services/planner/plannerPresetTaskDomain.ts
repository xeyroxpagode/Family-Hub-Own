/**
 * Planner P2.2A — Presets Foundation — canonical TASK preset domain (pure).
 *
 * Lane-owned TypeScript mirror of `backend/src/domain/planner.presets.domain.js`.
 * Semantics MUST stay in lock-step with the backend module; drift is treated
 * as an integration contract break.
 *
 * Preset Product Truth (frozen):
 *   PRESET = reusable stable Task configuration. It exists to make creation
 *   faster. It is NOT a recurring Task, a Responsibility, a Task instance, a
 *   Personal workspace entity, or a separate lifecycle engine.
 *
 * Stored fields (frozen contract):
 *   title, note, type (template_key + category), priority,
 *   estimated_duration_minutes, checklist template (labels/order only),
 *   requires_verification, requires_evidence.
 *
 * Never stored / never overwritten by application:
 *   assignee / assignment, date, due date, time, Plan, lifecycle/status,
 *   fulfillment, claimant, completion, verification result, evidence
 *   instances, Responsibility origin.
 *
 * Canonical UX scope (frozen):
 *   kind = 'task', scope in { 'homeplus', 'household' }.
 *   `personal` presets and `event`/`plan` presets remain compatibility-only:
 *   physical data is preserved, but canonical P2.2A surfaces exclude them.
 *
 * All functions here are PURE and never mutate their inputs.
 */
import type { PlannerPreset } from '../../types/plannerPresetsDrafts';

export const PRESET_TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export type PresetTaskPriority = (typeof PRESET_TASK_PRIORITIES)[number];

/** Canonical Task preset stable payload (adapter `planner.task.template.v1`). */
export type PlannerPresetTaskPayload = {
  readonly title: string;
  readonly note: string;
  readonly template_key: string | null;
  readonly category: string | null;
  readonly priority: PresetTaskPriority;
  readonly estimated_duration_minutes: number | null;
  /** Checklist template: labels + order only. Completion state is NEVER stored. */
  readonly checklist: ReadonlyArray<{ readonly text: string }>;
  readonly requires_verification: boolean;
  readonly requires_evidence: boolean;
};

/**
 * Draft view consumed by preset application. Contextual fields (assignee,
 * date, time, Plan) may exist on the caller's draft but are deliberately NOT
 * part of this contract: application preserves them by only writing the keys
 * named here.
 */
export type PresetApplicableTaskDraft = {
  title?: string;
  note?: string;
  description?: string;
  template_key?: string | null;
  category?: string | null;
  priority?: string;
  estimated_duration_minutes?: number | null;
  checklist?: ReadonlyArray<{ text: string; checked?: boolean } | string>;
  requires_verification?: boolean;
  requires_evidence?: boolean;
  checklistState?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePriority(value: unknown, fallback: PresetTaskPriority = 'normal'): PresetTaskPriority {
  const normalized = normalizeString(value);
  return (PRESET_TASK_PRIORITIES as readonly string[]).includes(normalized)
    ? (normalized as PresetTaskPriority)
    : fallback;
}

function normalizePositiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/** Checklist template normalization: keeps labels/order, drops completion. */
export function normalizePresetChecklistTemplate(
  items: ReadonlyArray<{ text?: unknown; checked?: unknown } | string> | unknown,
): ReadonlyArray<{ readonly text: string }> {
  if (!Array.isArray(items)) return [];
  const normalized: Array<{ text: string }> = [];
  for (const item of items) {
    const rawText = isPlainObject(item) ? item.text : item;
    const text = normalizeString(rawText);
    if (!text) continue;
    normalized.push({ text });
  }
  return normalized;
}

/**
 * Canonical task preset payload shape produced/consumed by P2.2A.
 * `note` is canonical; legacy `instructions` falls back as note source.
 */
export function normalizePresetTaskPayload(payload: unknown): PlannerPresetTaskPayload {
  const source = isPlainObject(payload) ? payload : {};
  const note = normalizeString(source.note) || normalizeString(source.instructions) || '';
  return {
    title: normalizeString(source.title) || '',
    note,
    template_key: normalizeString(source.template_key) || null,
    category: normalizeString(source.category) || null,
    priority: normalizePriority(source.priority),
    estimated_duration_minutes: normalizePositiveInt(source.estimated_duration_minutes),
    checklist: normalizePresetChecklistTemplate(source.checklist),
    requires_verification: Boolean(source.requires_verification),
    requires_evidence: Boolean(source.requires_evidence),
  };
}

/**
 * Extract the canonical task preset payload from a `PlannerPreset` row.
 * Reads the active published revision payload; falls back to the first
 * revision. Returns null when no usable revision exists.
 */
export function presetTaskPayloadFromPreset(preset: PlannerPreset | null | undefined): PlannerPresetTaskPayload | null {
  if (!preset) return null;
  const revisions = Array.isArray(preset.planner_preset_revisions) ? preset.planner_preset_revisions : [];
  const active = revisions.find((revision) => revision.id === preset.active_revision_id)
    ?? revisions.find((revision) => revision.revision_state === 'published')
    ?? revisions[0];
  if (!active || !isPlainObject(active.payload)) return null;
  return normalizePresetTaskPayload(active.payload);
}

/**
 * Canonical merge (contract): apply a task preset payload onto the current
 * Task draft. Preset MAY populate stable fields; preset MUST NOT touch
 * context. Returns a NEW draft object; inputs are never mutated.
 *
 * Checklist is copy-on-use: every item starts incomplete ({ text, checked: false }).
 */
export function applyPresetToTaskDraft<TDraft extends PresetApplicableTaskDraft>(
  draft: TDraft,
  payload: unknown,
): TDraft & PresetApplicableTaskDraft {
  const source: PresetApplicableTaskDraft = draft ?? {};
  const preset = normalizePresetTaskPayload(payload);
  const next = { ...(cloneJson(source) as Record<string, unknown>) };
  // P2.2A-R1 (defecto 3): el preset seleccionado es autoritativo para TODOS
  // los campos estables. Escritura incondicional (nota vacía, template_key /
  // category null y duración null limpian el valor previo) para que
  // A → B → A sea determinístico. El contexto se preserva por la copia.
  next.title = preset.title;
  next.note = preset.note;
  if ('description' in source) next.description = preset.note;
  next.template_key = preset.template_key;
  next.category = preset.category;
  next.priority = preset.priority;
  next.estimated_duration_minutes = preset.estimated_duration_minutes;
  next.checklist = preset.checklist.map((item) => ({ text: item.text, checked: false }));
  next.requires_verification = preset.requires_verification;
  next.requires_evidence = preset.requires_evidence;
  return next as TDraft & PresetApplicableTaskDraft;
}

/**
 * True when the draft holds meaningful non-default stable values that a
 * preset application would overwrite. Context fields (assignee, date, time,
 * Plan) NEVER participate: they are preserved by application and must never
 * trigger a conflict.
 */
export function hasMeaningfulStableDraftValues(draft: unknown): boolean {
  const source = isPlainObject(draft) ? draft : {};
  if (normalizeString(source.title).length > 0) return true;
  if (normalizeString(source.note ?? source.description).length > 0) return true;
  if (normalizeString(source.template_key).length > 0) return true;
  const category = normalizeString(source.category);
  if (category.length > 0 && category.toLowerCase() !== 'general') return true;
  const priority = normalizeString(source.priority);
  if (priority && priority !== 'normal') return true;
  if (normalizePositiveInt(source.estimated_duration_minutes) !== null) return true;
  const checklist = Array.isArray(source.checklist) ? source.checklist : [];
  if (checklist.some((item) => normalizeString(isPlainObject(item) ? item.text : item).length > 0)) return true;
  if (source.requires_verification === true) return true;
  if (source.requires_evidence === true) return true;
  return false;
}

/**
 * Conflict decision: true when applying `payload` would overwrite meaningful
 * non-default stable values already present in the draft. The UI shows ONE
 * compact confirmation; no field-by-field merge UI.
 */
export function detectApplyConflict(draft: unknown, payload: unknown): boolean {
  if (!hasMeaningfulStableDraftValues(draft)) return false;
  const candidate = normalizePresetTaskPayload(payload);
  const current = isPlainObject(draft) ? draft : {};
  const currentNote = normalizeString(current.note ?? current.description);
  if (candidate.title && normalizeString(current.title) && candidate.title !== normalizeString(current.title)) return true;
  if (candidate.note && currentNote && candidate.note !== currentNote) return true;
  if (candidate.template_key && normalizeString(current.template_key) && candidate.template_key !== normalizeString(current.template_key)) return true;
  if (candidate.category && normalizeString(current.category)
    && candidate.category.toLowerCase() !== normalizeString(current.category).toLowerCase()) return true;
  if (candidate.priority !== 'normal' && normalizeString(current.priority) && normalizeString(current.priority) !== 'normal'
    && candidate.priority !== normalizeString(current.priority)) return true;
  if (candidate.estimated_duration_minutes !== null
    && normalizePositiveInt(current.estimated_duration_minutes) !== null
    && candidate.estimated_duration_minutes !== normalizePositiveInt(current.estimated_duration_minutes)) return true;
  const currentChecklist = Array.isArray(current.checklist) ? current.checklist : [];
  const currentLabels = currentChecklist
    .map((item) => normalizeString(isPlainObject(item) ? item.text : item))
    .filter((text) => text.length > 0);
  if (candidate.checklist.length > 0 && currentLabels.length > 0) return true;
  if (candidate.requires_verification === true && current.requires_verification === false) return true;
  return false;
}

/**
 * Save-from-task: build the preset payload from an existing Task, stripping
 * every contextual field (assignee, date, time, Plan, fulfillment, status,
 * completion, Responsibility origin). Only reusable stable configuration
 * survives. Checklist keeps labels/order only (completion stripped).
 */
export function taskToPresetPayload(task: unknown): PlannerPresetTaskPayload {
  const source = isPlainObject(task) ? task : {};
  return {
    title: normalizeString(source.title) || '',
    note: normalizeString(source.description) || '',
    template_key: normalizeString(source.template_key) || null,
    category: normalizeString(source.category) || null,
    priority: normalizePriority(source.priority),
    estimated_duration_minutes: normalizePositiveInt(source.estimated_duration_minutes),
    checklist: normalizePresetChecklistTemplate(source.checklist),
    requires_verification: Boolean(source.requires_verification),
    requires_evidence: Boolean(source.requires_evidence),
  };
}

/**
 * Canonical library grouping (P2.2A): task-only presets partitioned into
 * household ("DEL HOGAR", first) and HomePlus ("DE HOMEPLUS", second).
 * Compatibility rows (personal scope, event/plan kinds, trashed presets) are
 * EXCLUDED from the canonical surface but never deleted. Order is
 * deterministic: created_at asc, then id.
 */
export function buildCanonicalPresetGroups(presets: readonly PlannerPreset[]): {
  readonly household: readonly PlannerPreset[];
  readonly homeplus: readonly PlannerPreset[];
} {
  const household: PlannerPreset[] = [];
  const homeplus: PlannerPreset[] = [];
  for (const preset of presets) {
    if (!preset || preset.entity_type !== 'task' || preset.trashed_at) continue;
    if (preset.source === 'household') household.push(preset);
    else if (preset.source === 'homeplus') homeplus.push(preset);
  }
  const byCreated = (a: PlannerPreset, b: PlannerPreset) =>
    String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id));
  household.sort(byCreated);
  homeplus.sort(byCreated);
  return { household, homeplus };
}

/**
 * Quick rail selection (contract): ordered deterministic subset suitable for
 * a horizontal rail. Household presets preferred; HomePlus fills remaining
 * slots. Deterministic order; ties broken by id.
 */
export function selectQuickPresets(
  presets: readonly PlannerPreset[],
  limit = 6,
): readonly PlannerPreset[] {
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const groups = buildCanonicalPresetGroups(presets);
  return [...groups.household, ...groups.homeplus].slice(0, safeLimit);
}

/**
 * Canonical scope flags for one preset row. When the backend DTO already
 * carries `scope`/`kind`/`editable`, those win; otherwise they derive from
 * the raw row (compatibility).
 */
export function presetCanonicalScope(preset: PlannerPreset): {
  readonly kind: 'task' | 'event' | 'plan';
  readonly scope: 'homeplus' | 'household' | 'personal';
  readonly editable: boolean;
} {
  const withDto = preset as PlannerPreset & {
    kind?: PlannerPreset['entity_type'];
    scope?: PlannerPreset['source'];
    editable?: boolean;
  };
  const kind = withDto.kind ?? preset.entity_type;
  const scope = withDto.scope ?? preset.source;
  const editable = withDto.editable ?? (scope !== 'homeplus' && !preset.trashed_at);
  return { kind, scope, editable };
}

/**
 * True when two canonical task payloads differ in any stable field. Used by
 * the edit flow to skip the revision cycle when nothing changed (noop).
 */
export function presetTaskPayloadsDiffer(
  a: PlannerPresetTaskPayload | null | undefined,
  b: PlannerPresetTaskPayload | null | undefined,
): boolean {
  const left = normalizePresetTaskPayload(a ?? {});
  const right = normalizePresetTaskPayload(b ?? {});
  return JSON.stringify(left) !== JSON.stringify(right);
}
