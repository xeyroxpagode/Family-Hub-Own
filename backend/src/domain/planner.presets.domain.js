'use strict';

/**
 * P2.2A — Presets Foundation — canonical pure domain helpers.
 *
 * Preset Product Truth (frozen):
 *   PRESET = reusable stable Task configuration. Exists to make creation
 *   faster. It is NOT a recurring Task, a Responsibility, a Task instance, a
 *   Personal workspace entity, or a separate lifecycle engine.
 *
 * Stored fields (frozen contract §2):
 *   title, note, type, priority, estimated_duration, checklist template
 *   (labels/order only), requires_verification, requires_evidence.
 *
 * Never stored / never overwritten by application (contract §2, §9):
 *   assignee / assignment, date, due date, time, Plan, lifecycle/status,
 *   fulfillment, claimant, completion, verification result, evidence
 *   instances, Responsibility origin.
 *
 * All functions here are PURE: they never mutate their inputs and never
 * perform I/O. Checklist application is copy-on-use: every Task receives new
 * incomplete checklist items; no completion state leaks between Tasks or from
 * the source Task (§16, §23).
 */

const TASK_PRESET_PRIORITIES = Object.freeze(['low', 'normal', 'high']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePriority(value, fallback = 'normal') {
  const normalized = normalizeString(value);
  return TASK_PRESET_PRIORITIES.includes(normalized) ? normalized : fallback;
}

function normalizePositiveInt(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeChecklistTemplate(items) {
  if (!Array.isArray(items)) return [];
  const normalized = [];
  for (const item of items) {
    const rawText = isPlainObject(item) ? item.text : item;
    const text = normalizeString(rawText);
    if (!text) continue;
    // Labels/order only: completion state is never stored on the template.
    normalized.push({ text });
  }
  return normalized;
}

/**
 * Canonical task preset payload shape produced/consumed by P2.2A.
 * - `note` is the canonical key; `instructions` is legacy compatibility and
 *   falls back as the note source when `note` is absent.
 * - `type` is represented as `template_key` + `category` (the Task model's
 *   canonical type representation).
 * - `requires_evidence` is a configuration flag stored by the contract;
 *   application is a no-op for it until the Task model supports the field.
 */
function normalizePresetTaskPayload(payload) {
  const source = isPlainObject(payload) ? payload : {};
  const note = normalizeString(source.note) || normalizeString(source.instructions) || '';
  return {
    title: normalizeString(source.title) || '',
    note,
    template_key: normalizeString(source.template_key) || null,
    category: normalizeString(source.category) || null,
    priority: normalizePriority(source.priority),
    estimated_duration_minutes: normalizePositiveInt(source.estimated_duration_minutes),
    checklist: normalizeChecklistTemplate(source.checklist),
    requires_verification: Boolean(source.requires_verification),
    requires_evidence: Boolean(source.requires_evidence),
  };
}

/**
 * Extract the canonical task preset payload from a PlannerPreset row.
 * Reads the active published revision payload; falls back to the first
 * revision. Returns null when no usable revision exists.
 */
function presetTaskPayloadFromPreset(preset) {
  if (!preset) return null;
  const revisions = Array.isArray(preset.planner_preset_revisions) ? preset.planner_preset_revisions : [];
  const active = revisions.find((revision) => revision.id === preset.active_revision_id)
    ?? revisions.find((revision) => revision.revision_state === 'published')
    ?? revisions[0];
  if (!active || !isPlainObject(active.payload)) return null;
  return normalizePresetTaskPayload(active.payload);
}

/**
 * Save-from-task (§17): build the preset payload from an existing Task,
 * stripping every contextual field:
 *   assignee, date, time, Plan, fulfillment, status, completion,
 *   Responsibility origin.
 * Only reusable stable configuration survives. Checklist template keeps
 * labels/order only (completion state stripped, §23).
 */
function taskToPresetPayload(task) {
  const source = isPlainObject(task) ? task : {};
  return {
    title: normalizeString(source.title) || '',
    note: normalizeString(source.description) || '',
    template_key: normalizeString(source.template_key) || null,
    category: normalizeString(source.category) || null,
    priority: normalizePriority(source.priority),
    estimated_duration_minutes: normalizePositiveInt(source.estimated_duration_minutes),
    checklist: normalizeChecklistTemplate(source.checklist),
    requires_verification: Boolean(source.requires_verification),
    // P2.2A-R1: espejo del helper frontend (las Tasks actuales no exponen
    // requires_evidence, por lo que resulta false; se lee en vez de fijar
    // para no derivar cuando el modelo lo soporte).
    requires_evidence: Boolean(source.requires_evidence),
  };
}

/**
 * True when the draft holds meaningful non-default stable values that a
 * preset application would overwrite (contract §11). Context fields
 * (assignee, date, time, Plan) are NEVER considered: they are preserved by
 * application and must never trigger this conflict.
 */
function hasMeaningfulStableDraftValues(draft) {
  const source = isPlainObject(draft) ? draft : {};
  if (normalizeString(source.title).length > 0) return true;
  if (normalizeString(source.note ?? source.description).length > 0) return true;
  if (normalizeString(source.template_key).length > 0) return true;
  if (normalizeString(source.category).length > 0
    && normalizeString(source.category).toLowerCase() !== 'general') return true;
  if (normalizeString(source.priority) && normalizeString(source.priority) !== 'normal') return true;
  if (normalizePositiveInt(source.estimated_duration_minutes) !== null) return true;
  const checklist = Array.isArray(source.checklist) ? source.checklist : [];
  if (checklist.some((item) => normalizeString(isPlainObject(item) ? item.text : item).length > 0)) return true;
  if (source.requires_verification === true) return true;
  if (source.requires_evidence === true) return true;
  return false;
}

/**
 * Conflict decision (contract §11): true when applying `payload` would
 * overwrite meaningful non-default stable values already present in the
 * draft. The UI shows ONE compact confirmation; no field-by-field merge UI.
 */
function detectApplyConflict(draft, payload) {
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
 * Canonical merge (contract §9): apply a task preset payload to the current
 * Task draft. Preset MAY populate stable fields; preset MUST NOT overwrite
 * context. Returns a NEW draft object; inputs are never mutated.
 *
 * Checklist is copy-on-use: every item starts incomplete ({ text, checked: false }).
 */
function applyPresetToTaskDraft(draft, payload) {
  const source = isPlainObject(draft) ? draft : {};
  const preset = normalizePresetTaskPayload(payload);
  const next = cloneJson(source) ?? {};
  // P2.2A-R1 (defecto 3): el preset seleccionado es autoritativo para TODOS
  // los campos estables. La escritura es incondicional (incluso nota vacía,
  // template_key/category null y duración null limpian el valor previo), de
  // modo que A → B → A es determinístico. Los campos contextuales se
  // preservan por la copia del draft: nunca se escriben aquí.
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
  return next;
}

/**
 * Quick rail selection (contract §8): ordered deterministic subset suitable
 * for a horizontal rail. Household presets preferred; HomePlus fills
 * remaining slots. Deterministic order: household first (created order),
 * then HomePlus (created order); ties broken by id for stability.
 */
function selectQuickPresets(presets, limit = 6) {
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const activeTask = (Array.isArray(presets) ? presets : []).filter((preset) =>
    preset
    && preset.entity_type === 'task'
    && !preset.trashed_at
    && (preset.source === 'homeplus' || preset.source === 'household'));
  const household = activeTask
    .filter((preset) => preset.source === 'household')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  const homeplus = activeTask
    .filter((preset) => preset.source === 'homeplus')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  return [...household, ...homeplus].slice(0, safeLimit);
}

/**
 * Canonical DTO derivation (contract §26): explicitly distinguishes
 *   scope: homeplus | household | personal
 *   editable: boolean
 *   kind: task | event | plan
 * Derived fields are ADDITIVE over the raw row; the raw row remains the
 * compatibility surface.
 */
function toPresetDto(preset, context = {}) {
  if (!preset) return null;
  const isHomePlus = preset.source === 'homeplus';
  const isPersonal = preset.source === 'personal';
  let editable = !isHomePlus;
  if (isPersonal) {
    editable = Boolean(context.personId) && preset.owner_person_id === context.personId;
  } else if (!isHomePlus) {
    editable = Boolean(context.householdId) && preset.household_id === context.householdId;
  }
  return {
    ...preset,
    kind: preset.entity_type,
    scope: preset.source,
    editable: editable && !preset.trashed_at,
  };
}

module.exports = {
  TASK_PRESET_PRIORITIES,
  applyPresetToTaskDraft,
  detectApplyConflict,
  hasMeaningfulStableDraftValues,
  normalizePresetTaskPayload,
  normalizeChecklistTemplate,
  presetTaskPayloadFromPreset,
  selectQuickPresets,
  taskToPresetPayload,
  toPresetDto,
};
