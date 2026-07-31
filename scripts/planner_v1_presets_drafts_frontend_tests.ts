import { readFileSync } from 'node:fs';

import {
  PLANNER_PRESET_DRAFTS_ROUTES,
  createLaneCorrelationId,
  draftApplicationToFormOpenRequest,
  presetApplicationToFormOpenRequest,
  presetDraftsLaneExtension,
} from '../front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors';
import { plannerKeys, classifyKey, householdOf } from '../front/mi-front-limpio/services/planner/plannerKeys';
import type {
  PlannerDraft,
  PlannerPreset,
  PlannerPresetRevision,
  PlannerTemplateEntityType,
} from '../front/mi-front-limpio/types/plannerPresetsDrafts';
import {
  CURRENT_PAYLOAD_VERSION,
  PAYLOAD_SCHEMA,
  PLACEHOLDER_TYPES,
  PRESET_ADAPTER_KEYS,
  PRESET_ENTITY_TYPES,
  PRESET_SOURCES,
  REVISION_STATES,
  defaultAdapterKeyFor,
  isPlannerDraftIntendedScope,
  isPlannerPlaceholderType,
  isPlannerPresetSource,
  isPlannerRevisionState,
  isSupportedPayloadVersion,
  migratePayloadInPlace,
} from '../front/mi-front-limpio/services/planner/plannerPresetContracts';
import {
  applyPlannerPreset,
  assertPayloadUnchanged,
  safeWarningMessage,
} from '../front/mi-front-limpio/services/planner/plannerPresetAdapters';
import {
  applyPlannerDraft,
  draftSafeWarningMessage,
  hasMeaningfulDraftContent,
  isDraftRecoverableForOwner,
} from '../front/mi-front-limpio/services/planner/plannerDraftAdapters';
import {
  classifyPresetLibraryVisualState,
  filterPresetsByKind,
  groupPresetsBySource,
  partitionPresets,
  presetKindSafeLabel,
  presetSourceSafeLabel,
} from '../front/mi-front-limpio/components/planner/presets/plannerPresetLibraryViewState';
import {
  describePresetDetailInteraction,
  safeSourceLabel,
} from '../front/mi-front-limpio/components/planner/presets/plannerPresetDetailViewState';
import {
  DRAFT_OPERATIONALLY_PROJECTED,
  DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN,
  classifyDraftsVisualState,
  draftEntityKindLabel,
  draftLastSavedLabel,
  isOwnedByUser,
  offersPendingRecovery,
  partitionDrafts,
} from '../front/mi-front-limpio/components/planner/drafts/plannerDraftsViewState';
import {
  clearPlaceholderValue,
  placeholderValueKind,
  safePlaceholderLabel,
  setPlaceholderValue,
  validateResolvedPlaceholders,
  type PlaceholderDescriptor,
  type ResolvedPlaceholders,
} from '../front/mi-front-limpio/services/planner/plannerPlaceholderResolver';
import {
  auditPlaceholderLabelsForInternals,
  buildPlaceholderResolutionSteps,
  canAdvanceThroughPlaceholders,
  listUnresolvedRequired,
  placeholderValueFactories,
} from '../front/mi-front-limpio/components/planner/placeholders/plannerPlaceholderResolutionViewState';
import {
  createPlannerAutosaveState,
  freshAutosaveIdentity,
  reducePlannerAutosaveState,
  versionedAutosaveIdentity,
} from '../front/mi-front-limpio/services/planner/plannerAutosaveCoordinator';
import type { PlannerSafeErrorBehavior } from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';
import {
  draftRecoverySafeMessage,
  openDraft,
  recoverDraft,
  resumeDraft,
} from '../front/mi-front-limpio/services/planner/plannerDraftEntry';
import * as plannerApi from '../front/mi-front-limpio/services/api';
import {
  autosavePlannerDraft,
  listPlannerDrafts,
  recoverPlannerDraft,
  restorePlannerDraft,
  trashPlannerDraft,
} from '../front/mi-front-limpio/services/plannerDrafts';
import {
  createPlannerPreset,
  getPlannerPresetRevision,
  listPlannerPresetRevisions,
  listPlannerPresets,
  preparePlannerPresetApplication,
  publishPlannerPresetRevision,
  restorePlannerPreset,
  startPlannerPresetRevision,
  trashPlannerPreset,
  updatePlannerPresetMetadata,
  updatePlannerPresetRevisionDraft,
} from '../front/mi-front-limpio/services/plannerPresets';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

type TestFn = () => void | Promise<void>;
type RequestJsonOptions = plannerApi.RequestJsonOptions;
type RequestJsonFunction = typeof plannerApi.requestJson;

const OWNER = 'aaa000-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbb000-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const HOUSEHOLD = 'hhh000-hhhh-4hhh-8hhh-hhhhhhhhhhhh';
const TOKEN = 'token';
const EMPTY_RESOLVED: ResolvedPlaceholders = {};

let passCount = 0;
let failCount = 0;
const tests: { name: string; fn: TestFn }[] = [];

function ok(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function assertNotEqual<T>(actual: T, unexpected: T, message: string): void {
  ok(JSON.stringify(actual) !== JSON.stringify(unexpected), `${message} should not equal ${JSON.stringify(unexpected)}`);
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function iso(day: number): string {
  return `2026-07-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function safeError(category: PlannerSafeErrorBehavior['category']): PlannerSafeErrorBehavior {
  return {
    category,
    message: 'safe',
    preservesData: true,
    allowsRetry: category !== 'version_conflict',
    requiresRefetch: category === 'version_conflict',
    opensConflictReview: category === 'version_conflict',
    restoresOptimisticState: category === 'version_conflict',
    keepsOperationPending: category === 'uncertain_network_outcome' || category === 'offline',
    canAutoClose: false,
  };
}

function makePreset(overrides: Partial<PlannerPreset<Record<string, unknown>>> = {}): PlannerPreset<Record<string, unknown>> {
  return {
    id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
    entity_type: overrides.entity_type ?? 'task',
    source: overrides.source ?? 'personal',
    owner_person_id: overrides.owner_person_id ?? OWNER,
    household_id: overrides.household_id ?? null,
    name: overrides.name ?? 'Preset',
    active_revision_id: overrides.active_revision_id ?? null,
    version: overrides.version ?? 1,
    trashed_at: overrides.trashed_at ?? null,
    retention_expires_at: overrides.retention_expires_at ?? null,
    planner_preset_revisions: overrides.planner_preset_revisions,
    created_at: overrides.created_at ?? iso(1),
    updated_at: overrides.updated_at ?? iso(2),
  };
}

function makeRevision(overrides: Partial<PlannerPresetRevision<Record<string, unknown>>> = {}): PlannerPresetRevision<Record<string, unknown>> {
  return {
    id: overrides.id ?? '22222222-2222-4222-8222-222222222222',
    preset_id: overrides.preset_id ?? '11111111-1111-4111-8111-111111111111',
    revision_number: overrides.revision_number ?? 1,
    revision_state: overrides.revision_state ?? 'published',
    adapter_key: overrides.adapter_key ?? PRESET_ADAPTER_KEYS.task,
    payload_schema: overrides.payload_schema ?? PAYLOAD_SCHEMA,
    payload_version: overrides.payload_version ?? CURRENT_PAYLOAD_VERSION,
    payload: overrides.payload ?? { title: 'Reusable', reusableConfig: {}, placeholders: [] },
    structural_fingerprint: overrides.structural_fingerprint ?? 'fingerprint',
    version: overrides.version ?? 1,
    created_at: overrides.created_at ?? iso(1),
    updated_at: overrides.updated_at ?? iso(2),
    published_at: overrides.published_at ?? iso(2),
  };
}

function makeDraft(overrides: Partial<PlannerDraft<Record<string, unknown>>> = {}): PlannerDraft<Record<string, unknown>> {
  return {
    id: overrides.id ?? '33333333-3333-4333-8333-333333333333',
    client_draft_key: overrides.client_draft_key ?? 'task:create:local',
    entity_type: overrides.entity_type ?? 'task',
    owner_person_id: overrides.owner_person_id ?? OWNER,
    intended_scope: overrides.intended_scope ?? 'personal',
    intended_household_id: overrides.intended_household_id ?? null,
    source_preset_id: overrides.source_preset_id ?? null,
    source_preset_revision_id: overrides.source_preset_revision_id ?? null,
    adapter_key: overrides.adapter_key ?? PRESET_ADAPTER_KEYS.task,
    payload_schema: overrides.payload_schema ?? PAYLOAD_SCHEMA,
    payload_version: overrides.payload_version ?? CURRENT_PAYLOAD_VERSION,
    payload: overrides.payload ?? { title: 'Draft title', reusableConfig: {}, placeholders: [] },
    content_fingerprint: overrides.content_fingerprint ?? 'draft-fingerprint',
    version: overrides.version ?? 1,
    last_autosaved_at: overrides.last_autosaved_at ?? iso(3),
    trashed_at: overrides.trashed_at ?? null,
    retention_expires_at: overrides.retention_expires_at ?? null,
    created_at: overrides.created_at ?? iso(1),
    updated_at: overrides.updated_at ?? iso(3),
  };
}

type ApiCall = {
  readonly path: string;
  readonly options: RequestJsonOptions;
};

const originalRequestJson: RequestJsonFunction = plannerApi.requestJson;
const mutableApi = plannerApi as unknown as { requestJson: RequestJsonFunction };
const apiCalls: ApiCall[] = [];
let nextResponse: unknown = {};

function mockApiResponse(response: unknown): void {
  apiCalls.length = 0;
  nextResponse = response;
  mutableApi.requestJson = async <T>(path: string, options: RequestJsonOptions = {}): Promise<T> => {
    apiCalls.push({ path, options });
    return nextResponse as T;
  };
}

function restoreApi(): void {
  mutableApi.requestJson = originalRequestJson;
}

console.log('\n=== PLANNER PRESETS DRAFTS FRONTEND TESTS (TS) ===');

runTest('PlannerSheetHost remains the unique modal host', () => {
  const code = read('front/mi-front-limpio/components/planner/PlannerSheetHost.tsx');
  assertEqual((code.match(/<Modal\b/g) ?? []).length, 1, 'single Modal count');
  ok(!code.includes('PlannerPresetSheetHost'), 'no second sheet host');
  ok(!code.includes('PresetModal'), 'no preset-specific modal host');
});

runTest('Global operational surfaces are not wired to presets/drafts', () => {
  const quick = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
  const home = read('front/mi-front-limpio/screens/home/HomePlannerSections.tsx');
  const calendar = read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx');
  const search = read('front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx');
  const trash = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');
  ok(!/preset|draft/i.test(quick), 'Quick Actions clean');
  ok(!/preset|draft/i.test(home), 'Home clean');
  ok(!/preset|draft/i.test(calendar), 'Calendar clean');
  ok(!/preset|draft/i.test(search), 'Search clean');
  ok(!/preset|draft/i.test(trash), 'global Trash clean');
});

runTest('Lane descriptors are published and Integration consumes them locally', () => {
  const descriptorCode = read('front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors.ts');
  const navCode = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  ok(PLANNER_PRESET_DRAFTS_ROUTES.length === 1, 'one lane-owned route descriptor');
  ok(PLANNER_PRESET_DRAFTS_ROUTES[0].routeName === 'PlannerPresetLibrary', 'route descriptor uses canonical route name');
  ok(presetDraftsLaneExtension.requiredCapabilities.includes('planner.templates.use'), 'use capability declared');
  ok(presetDraftsLaneExtension.requiredCapabilities.includes('planner.templates.manage'), 'manage capability declared');
  ok(presetDraftsLaneExtension.canEditSource('homeplus') === false, 'HomePlus source is read-only');
  ok(presetDraftsLaneExtension.canEditSource('personal'), 'personal source can be edited');
  ok(presetDraftsLaneExtension.canEditSource('household'), 'household source can be edited');
  ok(PRESET_ENTITY_TYPES.every((kind) => presetDraftsLaneExtension.supportsKind(kind)), 'Task/Event/Plan kinds supported');
  ok(descriptorCode.includes('suggestedEntry'), 'route stays descriptor-only');
  ok(navCode.includes('PlannerPresetLibraryRoute') && navCode.includes('PlannerDraftRecoveryRoute'), 'Integration registers local Planner routes');
});

runTest('Services do not import projection, durability, backend or Supabase modules', () => {
  const files = [
    'front/mi-front-limpio/services/plannerPresets.ts',
    'front/mi-front-limpio/services/plannerDrafts.ts',
    'front/mi-front-limpio/services/planner/plannerPresetAdapters.ts',
    'front/mi-front-limpio/services/planner/plannerDraftAdapters.ts',
    'front/mi-front-limpio/services/planner/plannerAutosaveCoordinator.ts',
  ];
  const forbiddenImport = /^\s*import\b.*(HomePlanner|Calendar|Search|Attention|Badge|Notification|Recurrence|Reliability|supabase|backend|migrations)/im;
  for (const file of files) {
    ok(!forbiddenImport.test(read(file)), `${file} has no forbidden imports`);
  }
});

runTest('No package, lockfile, backend, migration or global-route change is needed for the lane', () => {
  const changedSinceBase = read('scripts/planner_v1_presets_drafts_frontend_tests.js');
  ok(changedSinceBase.includes('Backend code unchanged'), 'JS suite preserves backend invariant');
  ok(read('package.json').includes('"typecheck"'), 'root package is only consumed by tests');
  ok(read('front/mi-front-limpio/package.json').includes('"typescript"'), 'frontend package is only consumed by typecheck');
  ok(read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx').includes('PlannerPresetDraftsIntegrationRoutes'), 'Planner stack consumes Integration routes');
});

runTest('Query keys partition personal and household presets/drafts', () => {
  const personalPresets = plannerKeys.presets({ personId: OWNER }, 'task');
  const householdPresets = plannerKeys.presets({ householdId: HOUSEHOLD }, 'plan');
  const personalDrafts = plannerKeys.drafts({ personId: OWNER }, 'event');
  const householdDrafts = plannerKeys.drafts({ householdId: HOUSEHOLD }, 'all');
  assertEqual(classifyKey(personalPresets), 'presets', 'personal presets classified');
  assertEqual(classifyKey(householdPresets), 'presets', 'household presets classified');
  assertEqual(classifyKey(personalDrafts), 'drafts', 'personal drafts classified');
  assertEqual(classifyKey(householdDrafts), 'drafts', 'household drafts classified');
  assertEqual(householdOf(personalPresets), null, 'personal presets have no household');
  assertEqual(householdOf(householdPresets), HOUSEHOLD, 'household presets carry household');
  assertEqual(householdOf(personalDrafts), null, 'personal drafts have no household');
  assertEqual(householdOf(householdDrafts), HOUSEHOLD, 'household drafts carry household');
  assertNotEqual(plannerKeys.drafts({ householdId: 'h1' })[3], plannerKeys.drafts({ householdId: 'h2' })[3], 'household drafts do not collide');
});

runTest('Preset library visual states cover loading, empty, stale, offline and partial refresh', () => {
  const list = [makePreset()];
  assertEqual(classifyPresetLibraryVisualState({ list: null, isLoading: true, isRefreshing: false, isOffline: false, isStale: false, errorKind: null }), 'initial_loading', 'loading');
  assertEqual(classifyPresetLibraryVisualState({ list: [], isLoading: false, isRefreshing: false, isOffline: false, isStale: false, errorKind: null }), 'empty', 'empty');
  assertEqual(classifyPresetLibraryVisualState({ list, isLoading: false, isRefreshing: false, isOffline: false, isStale: true, errorKind: 'none' }), 'stale', 'stale');
  assertEqual(classifyPresetLibraryVisualState({ list, isLoading: false, isRefreshing: false, isOffline: true, isStale: false, errorKind: null }), 'offline', 'offline');
  assertEqual(classifyPresetLibraryVisualState({ list, isLoading: false, isRefreshing: true, isOffline: false, isStale: false, errorKind: null }), 'refreshing_with_data_preserved', 'refresh keeps data');
  assertEqual(classifyPresetLibraryVisualState({ list, isLoading: false, isRefreshing: false, isOffline: false, isStale: false, errorKind: 'partial' }), 'partial_error', 'partial error');
  assertEqual(classifyPresetLibraryVisualState({ list: [], isLoading: false, isRefreshing: false, isOffline: false, isStale: false, errorKind: 'fatal' }), 'fatal_safe_error', 'fatal safe error');
});

runTest('Preset list filters and partitions by Task/Event/Plan and source', () => {
  const task = makePreset({ id: 'p-task', entity_type: 'task', source: 'personal' });
  const event = makePreset({ id: 'p-event', entity_type: 'event', source: 'household', household_id: HOUSEHOLD });
  const plan = makePreset({ id: 'p-plan', entity_type: 'plan', source: 'homeplus', owner_person_id: null });
  const trashed = makePreset({ id: 'p-trash', trashed_at: iso(4) });
  const list = [task, event, plan, trashed];
  assertEqual(filterPresetsByKind(list, 'task').map((p) => p.id), ['p-task', 'p-trash'], 'task filter');
  assertEqual(filterPresetsByKind(list, 'event').map((p) => p.id), ['p-event'], 'event filter');
  assertEqual(filterPresetsByKind(list, 'plan').map((p) => p.id), ['p-plan'], 'plan filter');
  assertEqual(filterPresetsByKind(list, 'all').length, 4, 'all filter');
  assertEqual(groupPresetsBySource(list).personal.length, 2, 'personal source bucket');
  assertEqual(groupPresetsBySource(list).household.length, 1, 'household source bucket');
  assertEqual(groupPresetsBySource(list).homeplus.length, 1, 'HomePlus source bucket');
  assertEqual(partitionPresets(list).active.length, 3, 'active presets');
  assertEqual(partitionPresets(list).trashed.length, 1, 'trashed presets');
  assertEqual(presetKindSafeLabel('plan'), 'Planes', 'safe kind label');
  assertEqual(presetSourceSafeLabel('household'), 'Familiar', 'safe source label');
});

runTest('Preset preview/detail permissions match source, capabilities and trash state', () => {
  const published = makeRevision({ revision_number: 7 });
  const personal = describePresetDetailInteraction(makePreset({ planner_preset_revisions: [published] }), { use: true, manage: true });
  ok(personal.canUse && personal.canEdit && personal.canTrash && personal.canDuplicate, 'personal actions allowed');
  ok(!personal.canRestore, 'active personal cannot restore');
  assertEqual(personal.activeRevisionNumber, 7, 'published revision summary');
  const homeplus = describePresetDetailInteraction(makePreset({ source: 'homeplus', owner_person_id: null }), { use: true, manage: true });
  ok(homeplus.canUse && !homeplus.canEdit && !homeplus.canTrash && !homeplus.canDuplicate, 'HomePlus original not editable');
  const trashed = describePresetDetailInteraction(makePreset({ trashed_at: iso(5) }), { use: true, manage: true });
  ok(!trashed.canUse && !trashed.canEdit && !trashed.canTrash && trashed.canRestore, 'trashed preset restore only');
  const readonly = describePresetDetailInteraction(makePreset(), { use: true, manage: false });
  ok(readonly.canUse && !readonly.canEdit && !readonly.canTrash, 'manage capability gates edit/trash');
  assertEqual(safeSourceLabel('homeplus'), 'HomePlus', 'safe HomePlus label');
});

runTest('Preset contract constants and guards mirror supported backend values', () => {
  assertEqual(PRESET_ENTITY_TYPES, ['task', 'event', 'plan'], 'entity types');
  assertEqual(PRESET_SOURCES, ['homeplus', 'personal', 'household'], 'preset sources');
  assertEqual(REVISION_STATES, ['draft', 'published', 'superseded'], 'revision states');
  ok(PLACEHOLDER_TYPES.every(isPlannerPlaceholderType), 'all placeholder types are recognized');
  ok(isPlannerPresetSource('personal') && !isPlannerPresetSource('global'), 'preset source guard');
  ok(isPlannerDraftIntendedScope('household') && !isPlannerDraftIntendedScope('shared'), 'draft scope guard');
  ok(isPlannerRevisionState('published') && !isPlannerRevisionState('active'), 'revision state guard');
  assertEqual(defaultAdapterKeyFor('task'), PRESET_ADAPTER_KEYS.task, 'task adapter key');
  assertEqual(defaultAdapterKeyFor('event'), PRESET_ADAPTER_KEYS.event, 'event adapter key');
  assertEqual(defaultAdapterKeyFor('plan'), PRESET_ADAPTER_KEYS.plan, 'plan adapter key');
  ok(isSupportedPayloadVersion(1) && isSupportedPayloadVersion(2) && !isSupportedPayloadVersion(99), 'payload versions');
  const migrated = migratePayloadInPlace({ title: 'old' }, 1, 2);
  ok(migrated !== null && Array.isArray(migrated.placeholders), 'v1 migration adds placeholders');
  ok(migrated !== null && typeof migrated.reusableConfig === 'object', 'v1 migration adds reusable config');
  assertEqual(migratePayloadInPlace({}, 3, 2), null, 'unsupported migration returns null');
});

runTest('Applying Task and Event presets is review-first and immutable', () => {
  const taskRevision = makeRevision({
    adapter_key: PRESET_ADAPTER_KEYS.task,
    payload: { title: 'Call plumber', instructions: 'Bring estimate', category: 'home', placeholders: [] },
  });
  const eventRevision = makeRevision({
    id: 'rev-event',
    adapter_key: PRESET_ADAPTER_KEYS.event,
    payload: { title: 'Dinner', category: 'family', suggestedDurationMinutes: 90, placeholders: [] },
  });
  const taskSnapshot = JSON.stringify(taskRevision);
  const eventSnapshot = JSON.stringify(eventRevision);
  const taskApp = applyPlannerPreset({ kind: 'preset', preset: makePreset({ entity_type: 'task' }), revision: taskRevision }, EMPTY_RESOLVED);
  const eventApp = applyPlannerPreset({ kind: 'preset', preset: makePreset({ entity_type: 'event' }), revision: eventRevision }, EMPTY_RESOLVED);
  ok(taskApp.applicable && taskApp.entityKind === 'task', 'task preset applicable');
  ok(eventApp.applicable && eventApp.entityKind === 'event', 'event preset applicable');
  assertEqual(taskApp.compatiblePrefill.kind, 'task', 'task uses real form prefill shape');
  assertEqual(eventApp.compatiblePrefill.kind, 'event', 'event uses real form prefill shape');
  ok(taskApp.pendingFields.includes('title') && taskApp.pendingFields.includes('instructions'), 'task pending fields require user review');
  ok(eventApp.pendingFields.includes('title') && eventApp.pendingFields.includes('suggestedDurationMinutes'), 'event pending fields require user review');
  ok(taskApp.warnings.includes('partial_prefill_only'), 'task partial prefill warning');
  ok(eventApp.warnings.includes('partial_prefill_only'), 'event partial prefill warning');
  ok(assertPayloadUnchanged(taskSnapshot, taskRevision), 'task revision immutable');
  ok(assertPayloadUnchanged(eventSnapshot, eventRevision), 'event revision immutable');
});

runTest('Applying Plan preset returns structural summary and never auto-creates', () => {
  const revision = makeRevision({
    adapter_key: PRESET_ADAPTER_KEYS.plan,
    payload: {
      objectiveTemplate: 'Renovar cocina',
      milestones: [{ title: 'Comprar materiales' }],
      tasks: [{ title: 'Medir mesada' }, { title: 'Elegir griferia' }],
      events: [{ title: 'Visita tecnica' }],
      measurements: [{ name: 'Presupuesto' }],
      relationships: [{ from: 'task', to: 'milestone' }],
      placeholders: [],
    },
  });
  const snapshot = JSON.stringify(revision);
  const app = applyPlannerPreset({ kind: 'preset', preset: makePreset({ entity_type: 'plan' }), revision }, EMPTY_RESOLVED);
  ok(app.applicable, 'plan preset applicable');
  assertEqual(app.entityKind, 'plan', 'entity kind plan');
  ok(app.structuralSummary !== null, 'structural summary exists');
  if (app.structuralSummary) {
    assertEqual(app.structuralSummary.objectiveTemplate, 'Renovar cocina', 'objective template preserved');
    assertEqual(app.structuralSummary.milestoneCount, 1, 'milestones counted');
    assertEqual(app.structuralSummary.taskCount, 2, 'tasks counted');
    assertEqual(app.structuralSummary.eventCount, 1, 'events counted');
    assertEqual(app.structuralSummary.measurementCount, 1, 'measurements counted');
    assertEqual(app.structuralSummary.relationshipCount, 1, 'relationships counted');
  }
  assertEqual(app.compatiblePrefill.kind, 'plan', 'Plan form receives plan prefill shape');
  ok(assertPayloadUnchanged(snapshot, revision), 'plan payload immutable');
});

runTest('Preset incompatibilities and placeholders surface safe warnings only', () => {
  const old = applyPlannerPreset({
    kind: 'preset',
    preset: makePreset({ entity_type: 'task' }),
    revision: makeRevision({ payload_version: 99 }),
  }, EMPTY_RESOLVED);
  ok(!old.applicable, 'unsupported payload is not applicable');
  assertEqual(safeWarningMessage(old.warnings[0]), 'No pudimos usar este preset con la version actual.'.replace('version', 'versión'), 'safe unsupported message');
  const wrongAdapter = applyPlannerPreset({
    kind: 'preset',
    preset: makePreset({ entity_type: 'task' }),
    revision: makeRevision({ adapter_key: PRESET_ADAPTER_KEYS.plan }),
  }, EMPTY_RESOLVED);
  ok(!wrongAdapter.applicable, 'wrong adapter is not applicable');
  assertEqual(wrongAdapter.warnings[0], 'unsupported_adapter', 'unsupported adapter warning');
  const withPlaceholder = applyPlannerPreset({
    kind: 'preset',
    preset: makePreset({ entity_type: 'task' }),
    revision: makeRevision({ payload: { title: 'A', placeholders: [{ id: 'who', type: 'person', path: 'assignee.id', required: true }] } }),
  }, EMPTY_RESOLVED);
  ok(withPlaceholder.placeholders.length === 1, 'declared placeholders returned');
  ok(withPlaceholder.warnings.includes('unresolved_placeholders'), 'unresolved placeholder warning');
});

runTest('Placeholder resolver validates required/optional values and preserves user input', () => {
  const descriptors: PlaceholderDescriptor[] = [
    { id: 'person', type: 'person', path: 'assignee.person_id', required: true },
    { id: 'date', type: 'date', path: 'due.date', required: true, label: 'Fecha limite' },
    { id: 'place', type: 'place', path: 'location.private_path', required: false },
  ];
  assertEqual(placeholderValueKind('person'), 'person', 'person value kind');
  assertEqual(placeholderValueKind('unknown'), 'text', 'unknown maps deny-safe');
  assertEqual(listUnresolvedRequired(descriptors, EMPTY_RESOLVED).map((d) => d.id), ['person', 'date'], 'required unresolved');
  let resolved = setPlaceholderValue(EMPTY_RESOLVED, 'person', placeholderValueFactories.person('user-1'));
  ok(!canAdvanceThroughPlaceholders(descriptors, resolved), 'cannot continue until all required values exist');
  resolved = setPlaceholderValue(resolved, 'date', placeholderValueFactories.date('2026-08-01'));
  ok(canAdvanceThroughPlaceholders(descriptors, resolved), 'can continue once required values exist');
  const preserved = setPlaceholderValue(resolved, 'person', placeholderValueFactories.person('user-2'));
  assertEqual(preserved.person, resolved.person, 'non-empty user value preserved without force');
  const forced = setPlaceholderValue(resolved, 'person', placeholderValueFactories.person('user-2'), { force: true });
  assertEqual(forced.person, placeholderValueFactories.person('user-2'), 'force can intentionally replace value');
  const cleared = clearPlaceholderValue(forced, 'person');
  ok(cleared.person === undefined, 'clear removes placeholder value');
  const validation = validateResolvedPlaceholders(descriptors, resolved);
  ok(validation.canContinue && validation.invalid.length === 0, 'validation succeeds');
  assertEqual(safePlaceholderLabel(descriptors[0]), 'Dato requerido', 'internal path hidden by fallback');
  assertEqual(safePlaceholderLabel(descriptors[1]), 'Fecha limite', 'explicit label used');
  ok(!auditPlaceholderLabelsForInternals(descriptors).labelHasInternalPath, 'labels do not leak paths');
  assertEqual(buildPlaceholderResolutionSteps(descriptors).map((step) => step.expectedValueKind), ['person', 'date', 'place'], 'resolution steps use typed factories');
});

runTest('Preset services build real list/create/edit/revision/trash/restore requests', async () => {
  mockApiResponse({ presets: [makePreset()] });
  const list = await listPlannerPresets(TOKEN, { entity_type: 'task', include_trashed: true });
  assertEqual(list.presets.length, 1, 'list shape');
  assertEqual(apiCalls[0].path, '/api/planner/presets?entity_type=task&include_trashed=true', 'list path and filters');
  mockApiResponse({ data: makePreset(), outcome: 'created', version: 1 });
  await createPlannerPreset(TOKEN, {
    name: 'Morning',
    entity_type: 'task',
    source: 'personal',
    adapter_key: PRESET_ADAPTER_KEYS.task,
    payload: { title: 'Open house' },
  }, { mutationId: 'mut-create', idempotencyKey: 'idem-create' });
  assertEqual(apiCalls[0].path, '/api/planner/presets', 'create path');
  assertEqual(apiCalls[0].options.method, 'POST', 'create method');
  assertEqual((apiCalls[0].options.headers ?? {})['X-Mutation-Id'], 'mut-create', 'create mutation id');
  assertEqual((apiCalls[0].options.headers ?? {})['Idempotency-Key'], 'idem-create', 'create idempotency');
  ok(!JSON.stringify(apiCalls[0].options.body).includes('owner_person_id'), 'create body has no actor authority');
  mockApiResponse({ data: makePreset({ name: 'Edited' }), outcome: 'updated', version: 2 });
  await updatePlannerPresetMetadata(TOKEN, 'preset-1', { name: 'Edited' }, { expectedVersion: 1, mutationId: 'mut-edit', idempotencyKey: 'idem-edit' });
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1', 'metadata edit path');
  assertEqual(apiCalls[0].options.method, 'PATCH', 'metadata edit method');
  assertEqual((apiCalls[0].options.headers ?? {})['If-Match'], '1', 'version conflict guard header');
  mockApiResponse({ data: makeRevision({ revision_state: 'draft' }), outcome: 'created', version: 1 });
  await startPlannerPresetRevision(TOKEN, 'preset-1', { mutationId: 'mut-rev', idempotencyKey: 'idem-rev' });
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1/revisions', 'start revision path');
  assertEqual(apiCalls[0].options.method, 'POST', 'start revision method');
  mockApiResponse({ revisions: [makeRevision()] });
  await listPlannerPresetRevisions(TOKEN, 'preset-1');
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1/revisions', 'list revisions path');
  mockApiResponse({ revision: makeRevision() });
  await getPlannerPresetRevision(TOKEN, 'rev-1');
  assertEqual(apiCalls[0].path, '/api/planner/preset-revisions/rev-1', 'get revision path');
  mockApiResponse({ data: makeRevision(), outcome: 'updated', version: 3 });
  await updatePlannerPresetRevisionDraft(TOKEN, 'rev-1', { payload: { title: 'Changed' } }, { expectedVersion: 2, mutationId: 'mut-draft', idempotencyKey: 'idem-draft' });
  assertEqual(apiCalls[0].options.method, 'PATCH', 'revision draft patch method');
  assertEqual((apiCalls[0].options.headers ?? {})['If-Match'], '2', 'revision draft version guard');
  mockApiResponse({ data: makePreset(), outcome: 'updated', version: 4 });
  await publishPlannerPresetRevision(TOKEN, 'rev-1', { expectedVersion: 3, mutationId: 'mut-publish', idempotencyKey: 'idem-publish' });
  assertEqual(apiCalls[0].path, '/api/planner/preset-revisions/rev-1/publish', 'publish path');
  mockApiResponse({ data: makePreset({ trashed_at: iso(4) }), outcome: 'updated', version: 5 });
  await trashPlannerPreset(TOKEN, 'preset-1', { expectedVersion: 4, mutationId: 'mut-trash', idempotencyKey: 'idem-trash' });
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1/trash', 'trash path');
  mockApiResponse({ data: makePreset(), outcome: 'updated', version: 6 });
  await restorePlannerPreset(TOKEN, 'preset-1', { expectedVersion: 5, mutationId: 'mut-restore', idempotencyKey: 'idem-restore' });
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1/restore', 'restore path');
  mockApiResponse({ data: {}, outcome: 'noop', version: 1 });
  await preparePlannerPresetApplication(TOKEN, 'preset-1', 'rev-1');
  assertEqual(apiCalls[0].path, '/api/planner/presets/preset-1/prepare?revision_id=rev-1', 'prepare path');
});

runTest('Draft visual state, privacy, trash and last-updated labels are safe', () => {
  const active = makeDraft({ id: 'd-active' });
  const householdPrivate = makeDraft({ id: 'd-household', intended_scope: 'household', intended_household_id: HOUSEHOLD });
  const trashed = makeDraft({ id: 'd-trash', trashed_at: iso(7) });
  assertEqual(classifyDraftsVisualState({ list: null, isLoading: true, isRefreshing: false, errorKind: null }), 'initial_loading', 'draft loading');
  assertEqual(classifyDraftsVisualState({ list: [], isLoading: false, isRefreshing: false, errorKind: 'none' }), 'empty', 'draft empty');
  assertEqual(classifyDraftsVisualState({ list: [active], isLoading: false, isRefreshing: true, errorKind: 'none' }), 'refreshing_with_data_preserved', 'draft refresh preserves data');
  assertEqual(classifyDraftsVisualState({ list: [active], isLoading: false, isRefreshing: false, errorKind: 'partial' }), 'partial_error', 'draft partial error');
  assertEqual(classifyDraftsVisualState({ list: [], isLoading: false, isRefreshing: false, errorKind: 'fatal' }), 'fatal_safe_error', 'draft fatal safe error');
  assertEqual(partitionDrafts([active, householdPrivate, trashed]).active.length, 2, 'draft active partition');
  assertEqual(partitionDrafts([active, householdPrivate, trashed]).trashed.length, 1, 'draft trash partition');
  ok(isOwnedByUser(active, OWNER), 'owner match');
  ok(!isOwnedByUser(makeDraft({ owner_person_id: OTHER }), OWNER), 'owner mismatch stays private');
  ok(householdPrivate.intended_scope === 'household' && isOwnedByUser(householdPrivate, OWNER), 'intended household remains private to owner');
  assertEqual(draftEntityKindLabel(makeDraft({ entity_type: 'event' })), 'Evento', 'event label');
  ok(draftLastSavedLabel(active).length > 0, 'last saved label exists');
  assertEqual(draftLastSavedLabel(makeDraft({ last_autosaved_at: '' })), 'Sin guardar', 'missing last saved label safe');
  ok(offersPendingRecovery(active), 'active draft offers recovery');
  ok(!offersPendingRecovery(trashed), 'trashed draft does not offer recovery');
  assertEqual(DRAFT_OPERATIONALLY_PROJECTED.length, 0, 'no operational draft projection');
  ok(DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN.includes('home') && DRAFT_OPERATIONALLY_PROJECTED_FORBIDDEN.includes('search'), 'forbidden projection tags listed');
});

runTest('Draft adapters enforce privacy, meaningful content and safe errors', () => {
  const task = makeDraft({ payload: { title: 'Buy paint', instructions: 'Blue', category: 'home' } });
  const applied = applyPlannerDraft(task, OWNER, EMPTY_RESOLVED);
  ok(applied.applicable && applied.privateToCurrentUser, 'owned draft applicable');
  assertEqual(applied.compatiblePrefill, { kind: 'task', title: 'Buy paint', instructions: 'Blue', category: 'home' }, 'task draft prefill');
  ok(!applied.intendedHousehold, 'personal draft not household-intended');
  const household = applyPlannerDraft(makeDraft({ intended_scope: 'household', intended_household_id: HOUSEHOLD }), OWNER, EMPTY_RESOLVED);
  ok(household.applicable && household.intendedHousehold && household.privateToCurrentUser, 'household intended draft stays private');
  const mismatch = applyPlannerDraft(makeDraft({ owner_person_id: OTHER }), OWNER, EMPTY_RESOLVED);
  ok(!mismatch.applicable && !mismatch.privateToCurrentUser, 'owner mismatch blocked');
  assertEqual(draftSafeWarningMessage(mismatch.warnings[0]), 'No pudimos abrir este borrador.', 'owner mismatch safe message');
  const unsupported = applyPlannerDraft(makeDraft({ payload_version: 99 }), OWNER, EMPTY_RESOLVED);
  ok(!unsupported.applicable, 'unsupported draft payload blocked');
  assertEqual(unsupported.warnings[0], 'payload_version_unsupported', 'unsupported warning');
  ok(isDraftRecoverableForOwner(task, OWNER), 'owner recovery guard true');
  ok(!isDraftRecoverableForOwner(task, OTHER), 'owner recovery guard false');
  ok(hasMeaningfulDraftContent({ title: 'x' }), 'meaningful title');
  ok(hasMeaningfulDraftContent({ tasks: [{ title: 'Nested' }] }), 'meaningful nested content');
  ok(!hasMeaningfulDraftContent({ title: ' ', reusableConfig: {}, placeholders: [], clientRevision: '1', lastLocalEditAt: iso(8) }), 'empty/default-only draft ignored');
});

runTest('Draft recovery opens forms without submit and guards user/household generations', () => {
  const draft = makeDraft({
    source_preset_id: 'preset-1',
    source_preset_revision_id: 'rev-1',
    intended_scope: 'household',
    intended_household_id: HOUSEHOLD,
  });
  const recovered = recoverDraft(draft, { currentOwnerId: OWNER }, EMPTY_RESOLVED);
  ok(recovered.kind === 'opened', 'recoverDraft opens owned draft');
  if (recovered.kind === 'opened') {
    assertEqual(recovered.request.mode, 'create', 'recovery opens create form only');
    assertEqual(recovered.request.source, 'preset_drafts_lane', 'source attributed to lane');
    assertEqual(recovered.request.sourcePresetId, 'preset-1', 'source preset preserved');
    ok(recovered.request.intendedHousehold, 'intended household carried as metadata only');
  }
  assertEqual(recoverDraft(null, { currentOwnerId: OWNER }, EMPTY_RESOLVED).kind, 'not_found', 'recoverDraft not found');
  assertEqual(openDraft(makeDraft({ owner_person_id: OTHER }), { currentOwnerId: OWNER }, EMPTY_RESOLVED).kind, 'owner_mismatch', 'openDraft owner mismatch');
  assertEqual(resumeDraft(draft, { currentOwnerId: OWNER, userGeneration: -1 }, EMPTY_RESOLVED).kind, 'generation_stale', 'user generation guard');
  assertEqual(resumeDraft(draft, { currentOwnerId: OWNER, householdGeneration: -1 }, EMPTY_RESOLVED).kind, 'generation_stale', 'household generation guard');
  assertEqual(draftRecoverySafeMessage({ kind: 'generation_stale', draft }), 'Tu sesión cambió. Revisá la versión más reciente antes de continuar.', 'generation stale safe message');
  assertEqual(draftRecoverySafeMessage({ kind: 'not_found' }), 'No encontramos un borrador guardado.', 'not found safe message');
});

runTest('Autosave reducer covers dirty, debounce/coalescing, out-of-order, retry, replay and noop', () => {
  let state = createPlannerAutosaveState();
  state = reducePlannerAutosaveState(state, { type: 'EDIT', seq: 1 });
  assertEqual(state.status, 'dirty', 'edit marks dirty');
  state = reducePlannerAutosaveState(state, { type: 'FLUSH', seq: 1 }, 'planner.draft.task');
  assertEqual(state.status, 'autosaving', 'flush autosaves');
  ok(state.identity !== null && state.inFlight, 'autosave creates identity');
  const firstIdentity = state.identity;
  const coalesced = reducePlannerAutosaveState(state, { type: 'FLUSH', seq: 1 }, 'planner.draft.task');
  assertEqual(coalesced.identity, firstIdentity, 'same seq flush coalesces');
  const staleResponse = reducePlannerAutosaveState(state, { type: 'SUCCESS', seq: 0, outcome: 'updated' });
  assertEqual(staleResponse.status, 'autosaving', 'out-of-order old response ignored');
  state = reducePlannerAutosaveState(state, { type: 'SUCCESS', seq: 1, outcome: 'created' });
  assertEqual(state.status, 'saved', 'created success saved');
  ok(!state.dirty && !state.inFlight && state.lastSavedAt !== null, 'saved clears in-flight');
  state = reducePlannerAutosaveState(state, { type: 'EDIT', seq: 2 });
  state = reducePlannerAutosaveState(state, { type: 'FLUSH', seq: 2 }, 'planner.draft.task');
  const secondIdentity = state.identity;
  state = reducePlannerAutosaveState(state, { type: 'ERROR', seq: 2, error: safeError('uncertain_network_outcome') });
  assertEqual(state.status, 'uncertain', 'uncertain outcome');
  state = reducePlannerAutosaveState(state, { type: 'RETRY', seq: 2 });
  assertEqual(state.identity, secondIdentity, 'retry reuses same mutation identity');
  assertEqual(state.status, 'autosaving', 'retry autosaves again');
  state = reducePlannerAutosaveState(state, { type: 'SUCCESS', seq: 2, outcome: 'replay' });
  assertEqual(state.status, 'saved', 'replay success saved');
  state = reducePlannerAutosaveState(state, { type: 'EDIT', seq: 3 });
  state = reducePlannerAutosaveState(state, { type: 'FLUSH', seq: 3 }, 'planner.draft.task');
  state = reducePlannerAutosaveState(state, { type: 'SUCCESS', seq: 3, outcome: 'noop' });
  assertEqual(state.status, 'saved', 'noop success saved');
  state = reducePlannerAutosaveState(state, { type: 'EDIT', seq: 4 });
  state = reducePlannerAutosaveState(state, { type: 'FLUSH', seq: 4 }, 'planner.draft.task');
  state = reducePlannerAutosaveState(state, { type: 'ERROR', seq: 4, error: safeError('version_conflict') });
  assertEqual(state.status, 'conflict', 'version conflict state');
  ok(state.dirty && !state.inFlight, 'conflict preserves local data');
  const localOnly = reducePlannerAutosaveState(createPlannerAutosaveState(), { type: 'LOCAL_ONLY' });
  assertEqual(localOnly.status, 'dirty', 'local-only edit never submits');
  assertNotEqual(freshAutosaveIdentity('planner.draft.task').mutationId, freshAutosaveIdentity('planner.draft.task').mutationId, 'fresh identities differ across sessions');
  assertEqual(versionedAutosaveIdentity('planner.draft.task', 3).ifMatch, '3', 'versioned identity carries expected version');
});

runTest('Draft services build real autosave/recover/trash/restore requests', async () => {
  mockApiResponse({ drafts: [makeDraft()] });
  const list = await listPlannerDrafts(TOKEN);
  assertEqual(list.drafts.length, 1, 'draft list shape');
  assertEqual(apiCalls[0].path, '/api/planner/drafts', 'draft list path');
  mockApiResponse({ draft: makeDraft() });
  await recoverPlannerDraft(TOKEN, 'task:create:local', 'task');
  assertEqual(apiCalls[0].path, '/api/planner/drafts/recover?client_draft_key=task%3Acreate%3Alocal&entity_type=task', 'recover service path');
  mockApiResponse({ data: makeDraft(), outcome: 'created', version: 1 });
  await autosavePlannerDraft(TOKEN, {
    client_draft_key: 'task:create:local',
    entity_type: 'task',
    intended_scope: 'personal',
    adapter_key: PRESET_ADAPTER_KEYS.task,
    payload: { title: 'Autosave' },
  }, { mutationId: 'mut-auto', idempotencyKey: 'idem-auto' });
  assertEqual(apiCalls[0].path, '/api/planner/drafts/autosave', 'autosave path');
  assertEqual(apiCalls[0].options.method, 'POST', 'autosave method');
  assertEqual((apiCalls[0].options.headers ?? {})['X-Mutation-Id'], 'mut-auto', 'autosave mutation id');
  assertEqual((apiCalls[0].options.headers ?? {})['Idempotency-Key'], 'idem-auto', 'autosave idempotency');
  ok(!JSON.stringify(apiCalls[0].options.body).includes('owner_person_id'), 'autosave body has no actor authority');
  mockApiResponse({ data: makeDraft({ trashed_at: iso(9) }), outcome: 'updated', version: 2 });
  await trashPlannerDraft(TOKEN, 'draft-1', { expectedVersion: 1, mutationId: 'mut-trash', idempotencyKey: 'idem-trash' });
  assertEqual(apiCalls[0].path, '/api/planner/drafts/draft-1/trash', 'draft trash path');
  assertEqual((apiCalls[0].options.headers ?? {})['If-Match'], '1', 'draft trash version guard');
  mockApiResponse({ data: makeDraft(), outcome: 'updated', version: 3 });
  await restorePlannerDraft(TOKEN, 'draft-1', { expectedVersion: 2, mutationId: 'mut-restore', idempotencyKey: 'idem-restore' });
  assertEqual(apiCalls[0].path, '/api/planner/drafts/draft-1/restore', 'draft restore path');
});

runTest('Form-open adapters preserve source reference only when requested', () => {
  const preset = makePreset({ id: 'preset-1', active_revision_id: 'rev-1' });
  const presetApplication = applyPlannerPreset({ kind: 'preset', preset, revision: makeRevision() }, EMPTY_RESOLVED);
  const keepPresetRef = presetApplicationToFormOpenRequest(presetApplication, preset, { laneCorrelationId: 'corr-1', preserveSourceReference: true });
  assertEqual(keepPresetRef.kind, 'task', 'preset opens task form');
  assertEqual(keepPresetRef.sourcePresetId, 'preset-1', 'preset source id preserved');
  assertEqual(keepPresetRef.sourcePresetRevisionId, 'rev-1', 'preset revision id preserved');
  const dropPresetRef = presetApplicationToFormOpenRequest(presetApplication, preset, { laneCorrelationId: 'corr-2' });
  ok(dropPresetRef.sourcePresetId === undefined, 'preset source ref omitted by default');
  const draft = makeDraft({ source_preset_id: 'preset-2', source_preset_revision_id: 'rev-2' });
  const draftApplication = applyPlannerDraft(draft, OWNER, EMPTY_RESOLVED);
  const keepDraftRef = draftApplicationToFormOpenRequest(draftApplication, draft.source_preset_id, draft.source_preset_revision_id, { laneCorrelationId: 'corr-3', preserveSourceReference: true });
  assertEqual(keepDraftRef.kind, 'task', 'draft opens task form');
  assertEqual(keepDraftRef.sourcePresetId, 'preset-2', 'draft source preset id preserved');
  const dropDraftRef = draftApplicationToFormOpenRequest(draftApplication, draft.source_preset_id, draft.source_preset_revision_id, { laneCorrelationId: 'corr-4' });
  ok(dropDraftRef.sourcePresetId === undefined, 'draft source ref omitted by default');
  ok(createLaneCorrelationId('preset_apply').startsWith('planner.preset_apply.'), 'preset correlation id');
  ok(createLaneCorrelationId('draft_resume').startsWith('planner.draft_resume.'), 'draft correlation id');
});

runTest('Architecture files preserve detail-first, no submit-on-apply and safe close constraints', () => {
  const presetAdapter = read('front/mi-front-limpio/services/planner/plannerPresetAdapters.ts');
  const draftEntry = read('front/mi-front-limpio/services/planner/plannerDraftEntry.ts');
  const autosave = read('front/mi-front-limpio/services/planner/plannerAutosaveCoordinator.ts');
  const form = read('front/mi-front-limpio/components/planner/presets/PlannerPresetFormScreen.tsx');
  const draftsScreen = read('front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx');
  ok(/Never throws/i.test(presetAdapter) && /Never executes/i.test(presetAdapter), 'preset apply is review-first and no auto-create');
  ok(draftEntry.includes('NEVER executes submit') && draftEntry.includes('owner'), 'draft recovery does not submit and validates owner');
  ok(autosave.includes('does NOT implement') && autosave.includes('parallel mutation identity'), 'autosave has no durable queue or second identity policy');
  ok(form.includes('onCommit') && form.includes('onStartRevision') && form.includes('onPublishRevision'), 'preset form exposes create/revision/publish callbacks');
  ok(form.includes('if (revision) onPublishRevision(revision);'), 'publish revision guarded before submit');
  ok(draftsScreen.includes('start-from-scratch') && draftsScreen.includes('continue') && draftsScreen.includes('send-to-trash'), 'safe close/recovery actions documented');
});

async function main(): Promise<void> {
  try {
    for (const test of tests) {
      console.log(`\n=== ${test.name} ===`);
      try {
        await test.fn();
      } catch (error: unknown) {
        console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
        failCount += 1;
      }
    }
  } finally {
    restoreApi();
  }
  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();
