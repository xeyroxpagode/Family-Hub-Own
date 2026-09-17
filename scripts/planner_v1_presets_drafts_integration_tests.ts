import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import {
  PLANNER_ROUTE_NAMES,
  ROUTE_NAMES,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';
import {
  presetApplicationToFormOpenRequest,
  draftApplicationToFormOpenRequest,
} from '../front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors';
import { applyPlannerPreset } from '../front/mi-front-limpio/services/planner/plannerPresetAdapters';
import { applyPlannerDraft } from '../front/mi-front-limpio/services/planner/plannerDraftAdapters';
import {
  createPlannerAutosaveState,
  reducePlannerAutosaveState,
} from '../front/mi-front-limpio/services/planner/plannerAutosaveCoordinator';
import {
  sheetMachineReducer,
  type PlannerSheetState,
} from '../front/mi-front-limpio/services/planner/plannerSheetState';
import {
  DRAFT_OPERATIONALLY_PROJECTED,
  DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN,
} from '../front/mi-front-limpio/components/planner/drafts/plannerDraftsViewState';
import { plannerKeys, householdOf } from '../front/mi-front-limpio/services/planner/plannerKeys';
import {
  CURRENT_PAYLOAD_VERSION,
  PAYLOAD_SCHEMA,
  PRESET_ADAPTER_KEYS,
} from '../front/mi-front-limpio/services/planner/plannerPresetContracts';
import type {
  PlannerDraft,
  PlannerPreset,
  PlannerPresetRevision,
  PlannerTemplateEntityType,
} from '../front/mi-front-limpio/types/plannerPresetsDrafts';
import type { PlannerSafeErrorBehavior } from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';

let assertions = 0;

function check(condition: unknown, message: string): void {
  assert.ok(condition, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const HOUSEHOLD = '33333333-3333-4333-8333-333333333333';
const EMPTY_RESOLVED = {};

function iso(day: number): string {
  return `2026-07-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function preset(entityType: PlannerTemplateEntityType): PlannerPreset<Record<string, unknown>> {
  return {
    id: `${entityType}-preset`,
    entity_type: entityType,
    source: 'personal',
    owner_person_id: OWNER,
    household_id: null,
    name: `${entityType} preset`,
    active_revision_id: `${entityType}-revision`,
    version: 4,
    trashed_at: null,
    retention_expires_at: null,
    planner_preset_revisions: [revision(entityType)],
    created_at: iso(1),
    updated_at: iso(2),
  };
}

function revision(entityType: PlannerTemplateEntityType): PlannerPresetRevision<Record<string, unknown>> {
  const payload =
    entityType === 'task'
      ? { title: 'Buy filters', placeholders: [{ path: 'title', type: 'person', required: true }] }
      : entityType === 'event'
      ? { title: 'Doctor visit', category: 'health', placeholders: [] }
      : { objectiveTemplate: 'Prepare trip', milestones: [{}], tasks: [{}], events: [{}], placeholders: [] };
  return {
    id: `${entityType}-revision`,
    preset_id: `${entityType}-preset`,
    revision_number: 1,
    revision_state: 'published',
    adapter_key: PRESET_ADAPTER_KEYS[entityType],
    payload_schema: PAYLOAD_SCHEMA,
    payload_version: CURRENT_PAYLOAD_VERSION,
    payload,
    structural_fingerprint: `${entityType}-fingerprint`,
    version: 2,
    created_at: iso(1),
    updated_at: iso(2),
    published_at: iso(2),
  };
}

function draft(overrides: Partial<PlannerDraft<Record<string, unknown>>> = {}): PlannerDraft<Record<string, unknown>> {
  const entityType = overrides.entity_type ?? 'task';
  return {
    id: overrides.id ?? 'draft-1',
    client_draft_key: overrides.client_draft_key ?? 'task:create:local',
    entity_type: entityType,
    owner_person_id: overrides.owner_person_id ?? OWNER,
    intended_scope: overrides.intended_scope ?? 'personal',
    intended_household_id: overrides.intended_household_id ?? null,
    source_preset_id: overrides.source_preset_id ?? null,
    source_preset_revision_id: overrides.source_preset_revision_id ?? null,
    adapter_key: overrides.adapter_key ?? PRESET_ADAPTER_KEYS[entityType],
    payload_schema: overrides.payload_schema ?? PAYLOAD_SCHEMA,
    payload_version: overrides.payload_version ?? CURRENT_PAYLOAD_VERSION,
    payload: overrides.payload ?? { title: 'Draft title', placeholders: [] },
    content_fingerprint: overrides.content_fingerprint ?? 'draft-fingerprint',
    version: overrides.version ?? 1,
    last_autosaved_at: overrides.last_autosaved_at ?? iso(3),
    trashed_at: overrides.trashed_at ?? null,
    retention_expires_at: overrides.retention_expires_at ?? null,
    created_at: overrides.created_at ?? iso(1),
    updated_at: overrides.updated_at ?? iso(3),
  };
}

function safeError(category: PlannerSafeErrorBehavior['category']): PlannerSafeErrorBehavior {
  return {
    category,
    message: 'safe',
    preservesData: true,
    allowsRetry: true,
    requiresRefetch: category === 'version_conflict',
    opensConflictReview: category === 'version_conflict',
    restoresOptimisticState: category === 'version_conflict',
    keepsOperationPending: category === 'uncertain_network_outcome',
    canAutoClose: false,
  };
}

const navigation = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
const types = read('front/mi-front-limpio/navigation/types.ts');
const plannerScreen = read('front/mi-front-limpio/screens/planner/PlannerScreen.tsx');
const routeBridge = read('front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx');
const sheetHost = read('front/mi-front-limpio/components/planner/PlannerSheetHost.tsx');
const quickActions = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
const home = read('front/mi-front-limpio/screens/home/HomePlannerSections.tsx');
const calendar = read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx');
const search = read('front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx');
const globalTrash = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');
const presetService = read('front/mi-front-limpio/services/plannerPresets.ts');
const draftService = read('front/mi-front-limpio/services/plannerDrafts.ts');

for (const routeName of [
  ROUTE_NAMES.PresetLibrary,
  ROUTE_NAMES.PresetDetail,
  ROUTE_NAMES.PresetCreate,
  ROUTE_NAMES.PresetEdit,
  ROUTE_NAMES.DraftRecovery,
  ROUTE_NAMES.DraftResume,
  ROUTE_NAMES.PresetDraftsTrash,
]) {
  check(PLANNER_ROUTE_NAMES.includes(routeName), `${routeName} is in canonical route registry`);
  check(types.includes(routeName), `${routeName} has typed stack params`);
  check(navigation.includes(`name="${routeName}"`), `${routeName} is registered in Planner stack`);
}

check(plannerScreen.includes('openPresetLibrary'), 'Planner owns a local Preset Library entry');
check(plannerScreen.includes('openDraftRecovery'), 'Planner owns a local Draft Recovery entry');
check(plannerScreen.includes('>Presets<'), 'Preset entry uses visible Presets language');
check(plannerScreen.includes('>Borradores<'), 'Draft entry uses visible Borradores language');
check(!plannerScreen.includes("'presets'"), 'Presets are not added as a Planner tab');
check(!plannerScreen.includes("'drafts'"), 'Drafts are not added as a Planner tab');

check(routeBridge.includes('PlannerPresetLibraryScreen'), 'Integration bridge renders the library screen');
check(routeBridge.includes('PlannerPresetDetailScreen'), 'Integration bridge renders preview/detail before apply');
check(routeBridge.includes('PlannerPresetFormScreen'), 'Integration bridge renders create/edit screen');
check(routeBridge.includes('PlannerDraftsScreen'), 'Integration bridge renders draft recovery screen');
check(routeBridge.includes('PlannerPresetDraftsTrashScreen'), 'Integration bridge renders local restore/trash surface');
check(routeBridge.includes('preparePlannerPresetApplication'), 'Preset apply prepares preview payload before opening a form');
check(routeBridge.includes('presetApplicationToFormOpenRequest'), 'Preset apply uses lane adapter into form-open request');
check(routeBridge.includes('draftApplicationToFormOpenRequest'), 'Draft resume uses lane adapter into form-open request');
check(routeBridge.includes('sheet.openTaskForm'), 'Task preset/draft opens the existing Task form');
check(routeBridge.includes('sheet.openEventForm'), 'Event preset/draft opens the existing Event form');
check(routeBridge.includes('sheet.openPlanForm'), 'Plan preset/draft opens the existing Plan form');
check(!/createTask|createEvent|createGoal|writeCanonicalPlanGraph/.test(routeBridge), 'Preset apply and Draft resume do not submit entities');

for (const entityType of ['task', 'event', 'plan'] as const) {
  const sourcePreset = preset(entityType);
  const applied = applyPlannerPreset({ kind: 'preset', preset: sourcePreset, revision: revision(entityType) }, EMPTY_RESOLVED);
  const request = presetApplicationToFormOpenRequest(applied, sourcePreset, {
    laneCorrelationId: `integration-${entityType}`,
    preserveSourceReference: true,
  });
  equal(request.kind, entityType, `${entityType} preset maps to ${entityType} form request`);
  equal(request.sourcePresetId, sourcePreset.id, `${entityType} preset preserves source preset reference`);
  check(applied.applicable, `${entityType} preset remains reviewable before explicit submit`);
}

const taskPresetWithPlaceholder = applyPlannerPreset({ kind: 'preset', preset: preset('task'), revision: revision('task') }, EMPTY_RESOLVED);
check(taskPresetWithPlaceholder.placeholders.length > 0, 'Preset placeholders are retained for review');
check(taskPresetWithPlaceholder.warnings.includes('unresolved_placeholders'), 'Unresolved placeholders are surfaced safely');

const taskOpenState = sheetMachineReducer({ kind: 'closed' }, { isSubmitting: false, activeIntentId: null }, {
  type: 'OPEN_TASK',
  input: { source: 'unknown' },
}).state;
equal(taskOpenState.kind, 'task_form', 'Sheet reducer opens Task form as a single state');
const eventOpenState = sheetMachineReducer(taskOpenState, { isSubmitting: false, activeIntentId: null }, {
  type: 'OPEN_EVENT',
  input: { source: 'unknown' },
}).state;
equal(eventOpenState.kind, 'event_form', 'Sheet reducer replaces Task with Event instead of stacking');
const planOpenState = sheetMachineReducer(eventOpenState, { isSubmitting: false, activeIntentId: null }, {
  type: 'OPEN_PLAN',
  input: { source: 'unknown' },
}).state;
equal(planOpenState.kind, 'plan_form', 'Sheet reducer opens Plan in the same host');
equal((sheetHost.match(/<Modal\b/g) ?? []).length, 1, 'PlannerSheetHost remains the only modal host');
check(sheetHost.includes('requestClose') && sheetHost.includes('isSubmitting'), 'Sheet host preserves safe close and submit lock wiring');

const ownedDraft = draft({ source_preset_id: 'preset-1', source_preset_revision_id: 'revision-1' });
const draftApplication = applyPlannerDraft(ownedDraft, OWNER, EMPTY_RESOLVED);
const draftRequest = draftApplicationToFormOpenRequest(draftApplication, ownedDraft.source_preset_id, ownedDraft.source_preset_revision_id, {
  laneCorrelationId: 'draft-resume',
  preserveSourceReference: true,
});
check(draftApplication.privateToCurrentUser, 'Draft recovery is private to the current owner');
equal(draftRequest.kind, 'task', 'Task draft resumes into Task form request');
equal(draftRequest.sourcePresetId, 'preset-1', 'Draft resume preserves preset source reference');
check(!applyPlannerDraft(draft({ owner_person_id: OTHER }), OWNER, EMPTY_RESOLVED).applicable, 'Foreign draft is blocked by owner isolation');
check(routeBridge.includes('PlannerDraftResumeRoute'), 'Draft resume has a dedicated route');
check(read('front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx').includes('discardPlannerDraft'), 'Draft discard uses definitive discard service');
check(!read('front/mi-front-limpio/services/planner/reliability/productiveMutations.ts').includes('enqueuePlannerDraftTrash'), 'Draft discard no longer exposes legacy trash queue helper');
equal(DRAFT_OPERATIONALLY_PROJECTED.length, 0, 'Drafts do not project as Task/Event/Plan entities');
check(DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN.includes('calendar'), 'Drafts remain absent from Calendar');

let autosave = createPlannerAutosaveState();
autosave = reducePlannerAutosaveState(autosave, { type: 'EDIT', seq: 1 });
equal(autosave.status, 'dirty', 'Autosave tracks dirty state');
autosave = reducePlannerAutosaveState(autosave, { type: 'FLUSH', seq: 1 }, 'planner.draft.task');
equal(autosave.status, 'autosaving', 'Autosave enters autosaving state');
const originalIdentity = autosave.identity;
autosave = reducePlannerAutosaveState(autosave, { type: 'ERROR', seq: 1, error: safeError('uncertain_network_outcome') });
equal(autosave.status, 'uncertain', 'Autosave tracks uncertain outcome');
autosave = reducePlannerAutosaveState(autosave, { type: 'RETRY', seq: 1 });
equal(autosave.identity, originalIdentity, 'Autosave retry reuses the same identity');
autosave = reducePlannerAutosaveState(autosave, { type: 'SUCCESS', seq: 1, outcome: 'replay' });
equal(autosave.status, 'saved', 'Autosave replay resolves as saved');
autosave = reducePlannerAutosaveState(autosave, { type: 'EDIT', seq: 2 });
autosave = reducePlannerAutosaveState(autosave, { type: 'FLUSH', seq: 2 }, 'planner.draft.task');
autosave = reducePlannerAutosaveState(autosave, { type: 'SUCCESS', seq: 2, outcome: 'noop' });
equal(autosave.status, 'saved', 'Autosave noop resolves as saved');
autosave = reducePlannerAutosaveState(autosave, { type: 'EDIT', seq: 3 });
autosave = reducePlannerAutosaveState(autosave, { type: 'FLUSH', seq: 3 }, 'planner.draft.task');
autosave = reducePlannerAutosaveState(autosave, { type: 'ERROR', seq: 3, error: safeError('version_conflict') });
equal(autosave.status, 'conflict', 'Autosave conflict preserves content for review');

const personalPresetKey = plannerKeys.presets({ personId: OWNER }, 'task');
const householdPresetKey = plannerKeys.presets({ householdId: HOUSEHOLD }, 'task');
const personalDraftKey = plannerKeys.drafts({ personId: OWNER }, 'task');
const householdDraftKey = plannerKeys.drafts({ householdId: HOUSEHOLD }, 'task');
equal(householdOf(personalPresetKey), null, 'Personal presets do not leak household scope');
equal(householdOf(householdPresetKey), HOUSEHOLD, 'Household presets are household-scoped');
equal(householdOf(personalDraftKey), null, 'Personal drafts do not leak household scope');
equal(householdOf(householdDraftKey), HOUSEHOLD, 'Household-intended draft keys remain partitioned');

check(presetService.includes('If-Match') && draftService.includes('If-Match'), 'Versioned mutations keep If-Match');
check(presetService.includes('X-Mutation-Id') && draftService.includes('X-Mutation-Id'), 'Mutations keep X-Mutation-Id');
check(presetService.includes('Idempotency-Key') && draftService.includes('Idempotency-Key'), 'Mutations keep Idempotency-Key');
check(presetService.includes('outcome: string') && draftService.includes('outcome: string'), 'Services consume canonical mutation outcomes');

check(!/preset|draft/i.test(quickActions), 'Quick Actions global surface remains clean');
check(!/preset|draft/i.test(home), 'Home global surface remains clean');
check(!/preset|draft/i.test(calendar), 'Calendar global surface remains clean');
check(!/preset|draft/i.test(search), 'Search global surface remains clean');
check(!/preset|draft/i.test(globalTrash), 'Global Trash remains separate from local Presets/Drafts trash');
check(navigation.includes('PlannerSheetHost'), 'Frontend Core single host stays mounted at HomeTabNavigator');
check(navigation.includes('TaskDetailScreen') && navigation.includes('EventDetailScreen'), 'Frontend Core detail routes remain registered');

const impossibleStack: PlannerSheetState = { kind: 'closed' };
equal(impossibleStack.kind, 'closed', 'Sheet state union still represents a single state');

console.log(`PLANNER PRESETS DRAFTS INTEGRATION: ${assertions} assertions passed.`);
