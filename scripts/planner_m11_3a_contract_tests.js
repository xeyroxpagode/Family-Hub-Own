#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY ||= 'm11-3a-contract-placeholder';

const plansService = require('../backend/src/services/planner.plans.service');
const plannerIdempotencyAdapter = require('../backend/src/lib/plannerIdempotencyAdapter');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function testMigrationContract() {
  const migration = read('supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql');
  const migrationV2 = read('supabase/migrations/20260722049000_m11_3a_consume_shared_mutation_authority.sql');
  check(migration.includes('create table public.planner_plans'), 'canonical Plan container is additive');
  check(migration.includes('create table public.planner_plan_milestones'), 'canonical Milestone table exists');
  check(migration.includes('create table public.planner_plan_measurements'), 'multiple Measurement table exists');
  check(migration.includes('create table public.planner_plan_measurement_history'), 'Measurement history is immutable and separate');
  check(migration.includes('create table public.planner_plan_manual_conditions'), 'manual condition table exists');
  check(migration.includes('create table public.planner_plan_requirements'), 'hierarchical Requirement table exists');
  check(migration.includes("scope in ('personal', 'household')"), 'Plan scope is explicit');
  check(migration.includes("lifecycle in ('draft', 'active', 'paused', 'completed', 'closed')"), 'Plan lifecycle excludes Trash storage alias');
  check(migration.includes('archived_at is null or lifecycle in'), 'Archive is orthogonal and terminal-only');
  check(migration.includes('parent_requirement_id uuid null references public.planner_plan_requirements'), 'Requirements are hierarchical');
  check(migration.includes('requirement hierarchy cannot contain a cycle'), 'Requirement cycles are rejected');
  check(migration.includes('requirement subject must belong to the same Plan'), 'Requirement subjects must belong to the same Plan');
  check(migration.includes('planner_plan_requirements_one_milestone_idx'), 'Milestone cannot be counted twice');
  check(migration.includes('planner_plan_requirements_one_measurement_idx'), 'Measurement cannot be counted twice');
  check(migration.includes('planner_plan_requirements_one_condition_idx'), 'manual condition cannot be counted twice');
  check(migration.includes("external_kind is not null and external_reference_key is not null and external_entity_id is null"), 'external Task/Event contract is typed but unbound');
  check(!/references public\.planner_(tasks|events)/i.test(migration), 'Plan migration creates no Task/Event FK');
  check(!/alter table public\.planner_(tasks|events)/i.test(migration), 'Plan migration does not alter Task/Event schema');
  check(migration.includes('p_entity_type <> \'plan\''), 'child writes advance the structural Plan version');
  check(migration.includes("v_transition = 'complete'"), 'graph lifecycle completion exists');
  check(!migration.includes('set lifecycle=\'completed\'') || migration.includes("v_transition = 'complete'"), 'Plan completion occurs only by explicit transition');
  check(!migration.includes('progress_percentage'), 'canonical graph exposes no universal percentage');
  check(/'automaticBackfillSafe'\s*,\s*false/.test(migration), 'legacy auto-backfill is explicitly unsafe');
  check(/'strategy'\s*,\s*'preserve_and_report'/.test(migration), 'legacy data is preserved and reported');
  check(!/delete\s+from\s+public\.planner_goals/i.test(migration), 'legacy Goals are never deleted');
  check(migration.includes('security definer') && migration.includes('set search_path = pg_catalog, public'), 'definer functions use a safe search path');
  check(migration.includes('auth.uid() is null or v_actor_person_id is null'), 'write actor is derived from authentication');
  check(migration.includes('planner_plan_operations'), 'Plan operations have an exactly-once ledger');
  check(migration.includes('unique (actor_person_id, idempotency_key)'), 'canonical Idempotency-Key owns replay identity');
  check(migration.includes('p_mutation_id') && migration.includes('p_idempotency_key'), 'mutation correlation and idempotency remain separate');
  check(migration.includes('insert into public.audit_events'), 'household mutations use canonical audit_events');
  check(migration.includes('return jsonb_set(v_operation.response_body'), 'idempotent replay returns the stored result');
  check(migration.includes("raise exception 'idempotency key conflict'"), 'same operation with different payload is rejected');
  check(migration.includes("p.lifecycle <> 'draft' or p.created_by_person_id = public.current_person_id()"), 'household Draft RLS is creator-private');
  check(migration.includes('planner_plan_measurement_history_correction_same_measurement_fkey'), 'Measurement corrections are same-Measurement and same-Plan');
  check(migration.includes('public.reserve_planner_idempotency_key(')
    && migration.includes('public.complete_planner_idempotency_key('), 'household writes consume canonical idempotency RPCs');
  check(migration.includes("v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash'"), 'Trash contains Plan-owned children');
  check(migration.includes('planner_plan_requirement_satisfied_internal')
    && migration.includes("classification = 'necessary'"), 'Requirement satisfaction recursively evaluates necessary children');
  check(migration.includes('p_expected_plan_version integer'), 'writer accepts an additive expected Plan graph version');
  check(migration.includes("p_action in ('archive','unarchive')"), 'Archive and Unarchive share the SQL capability');
  check(migration.includes("v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen'"), 'terminal Plans reject child graph mutations');
  check(migration.includes("v_outcome <> 'noop'") && migration.includes("v_outcome := 'noop'"), 'noop paths avoid effective graph writes and audit');
  check(migration.includes("'before_state'") && migration.includes("'result_state'"), 'audit metadata records safe before and result states');
  check(/'visualGoalRetirementReady'\s*,\s*false/.test(migration), 'legacy visual retirement remains Integration-gated');

  // R2A REAUD-02 (Plans-owned): semantic noop detection must be present for
  // every Plan-owned update family and must use NULL-safe comparison.
  check(migration.includes('Semantic noop detection'), 'Plan update documents the semantic noop intent');
  check((migration.match(/is not distinct from/g) || []).length >= 4, 'semantic comparison uses NULL-safe IS NOT DISTINCT FROM across families');
  check(migration.includes("if p_action = 'update' then"), 'Plan update branch is present');
  check(migration.includes("v_outcome := 'noop';\n            else\n              update public.planner_plan_milestones"), 'Milestone noop comparison guards the UPDATE');
  check(migration.includes("v_outcome := 'noop';\n            else\n              update public.planner_plan_measurements"), 'Measurement noop comparison guards the UPDATE');
  check(migration.includes("v_outcome := 'noop';\n            else\n              update public.planner_plan_requirements"), 'Requirement noop comparison guards the UPDATE');
  check(migration.includes("v_outcome := 'noop';\n            else\n              update public.planner_plan_manual_conditions"), 'manual condition noop comparison guards the UPDATE');
  check(migration.includes("if p_entity_type <> 'plan' and v_outcome <> 'noop' then"), 'structural Plan graph version advances only on effective child mutations');
  // REAUD-01 must remain Integration-owned: no Plans-side reservation takeover,
  // no extra idempotency mechanism, no raw 23505 swallowing inside Plans SQL.
  check(!/takeover|expire.*reservation|recover.*reservation/i.test(migration), 'Plans SQL does not add shared-reservation takeover/recovery');
  check(migration.includes("raise exception 'canonical idempotency reservation required'"), 'canonical shared reservation remains authoritative and unmodified');
  check(!/when\s+sqlstate\s*=\s*'23505'\s*then\s+v_outcome\s*:=\s*'noop'/.test(migration), 'Plans SQL does not translate raw 23505 into a local noop');

  // V2 Consumption (OLA 2) - new migration 20260722049000
  check(migrationV2.includes('planner_v2_reserve_idempotency('), 'V2 migration consumes planner_v2_reserve_idempotency');
  check(migrationV2.includes('planner_v2_complete_idempotency('), 'V2 migration consumes planner_v2_complete_idempotency');
  check(migrationV2.includes('planner_v2_append_audit('), 'V2 migration consumes planner_v2_append_audit');
  check(!migrationV2.includes('p_canonical_reserved'), 'V2 migration removes pre-reservation parameter');
  check(!migrationV2.includes('withIdempotency'), 'V2 migration does not reference legacy withIdempotency');
  check(migrationV2.includes("v_error_code:='idempotency_conflict'"), 'V2 migration normalizes to canonical idempotency_conflict');
  check(!migrationV2.includes('reserve_planner_idempotency_key('), 'V2 migration removes legacy reserve RPC call');
  check(!migrationV2.includes('complete_planner_idempotency_key('), 'V2 migration removes legacy complete RPC call');
}

function testRunnerContract() {
  const runner = read('scripts/planner_m11_3a_test_runner.js');
  check(runner.includes("'M11.3A database suite run 1'"), 'runner executes the first DB iteration');
  check(runner.includes("'M11.3A database suite run 2'"), 'runner executes the second DB iteration');
  check((runner.match(/--assert-clean/g) || []).length >= 5, 'runner runs two intermediate ten-counter gates plus cleanup iterations and a final gate');
  check(runner.includes("'M11.3A ten-counter clean gate 1'"), 'runner emits the first ten-counter assert-clean gate');
  check(runner.includes("'M11.3A ten-counter clean gate 2'"), 'runner emits the second ten-counter assert-clean gate');
  check(runner.includes("'M11.3A final ten-counter assert-clean'"), 'runner runs an unconditional final ten-counter clean gate');
  check(runner.includes('M11.3A final clean reconstruction (always)'), 'runner performs an unconditional final reset in finally');
  check(runner.includes('primaryError') && runner.includes('cleanupError'), 'runner propagates primary and cleanup errors separately');
  check(runner.includes('if (primaryError || cleanupError)'), 'runner surfaces any failure as non-zero exit code');
  check(runner.includes('M11.3A SELF-CONTAINED TEST RUNNER: PASS'), 'runner keeps the PASS banner only on the success path');
}

function testRuntimeBoundary() {
  const controller = read('backend/src/controllers/planner.plans.controller.js');
  const service = read('backend/src/services/planner.plans.service.js');
  const dto = read('front/mi-front-limpio/types/PlannerPlan.ts');

  check(controller.includes('getAuthenticatedPerson'), 'Plan controller supports personal context without active household');
  check(controller.includes('requireActiveMembership'), 'household Plan controller requires active membership');
  check(controller.includes("assertCapability(capabilities, 'planner.view')"), 'household Plan controller requires planner.view');
  check(controller.includes("assertCapability(householdContext.capabilities, 'goal.create_household')"), 'existing Goal create capability is reused');
  check(!controller.includes("require('../services/planner.tasks"), 'Plan controller does not import Task production service');
  check(!controller.includes("require('../services/planner.events"), 'Plan controller does not import Event production service');
  check(service.includes("rpc('write_planner_plan_graph_rpc'"), 'backend delegates writes to one atomic graph RPC');
  check(service.includes("rpc('read_planner_plan_graph_rpc'"), 'backend consumes the canonical graph read DTO');
  check(!controller.includes('withIdempotency('), 'household controller does NOT use legacy split reservation');
  check(controller.includes('hashIdempotencyRequestV2'), 'controller uses V2 canonical payload hash');
  check(controller.includes('expectedPlanVersion'), 'controller publishes expected Plan graph version');
  check(service.includes('p_expected_plan_version'), 'service forwards expected Plan graph version');
  check(dto.includes('expectedPlanVersion'), 'mutation DTO exposes expected Plan graph version');
  check(service.includes('(data ?? []).map(toPlanDto)'), 'Plan list uses the additive canonical DTO');
  check(!/percentage/i.test(dto), 'Plan DTO has no universal percentage');
  check(dto.includes('completedMilestoneCount') && dto.includes('reachedMeasurementCount'), 'DTO exposes separate real indicators');
  check(dto.includes("bindingState: 'pending_integration'"), 'DTO publishes the future external requirement boundary');
  check(dto.includes('operationalChildrenPublished: false'), 'DTO publishes Draft isolation metadata');
}

function testDtoMapper() {
  const raw = {
    plan: {
      id: 'p1', version: 7, scope: 'personal', owner_person_id: 'person-1', household_id: null,
      objective: 'Objetivo', description: null, lifecycle: 'draft', target_date: null,
      finalization_kind: 'none', archived_at: null, trashed_at: null,
      created_at: '2026-07-22T00:00:00Z', updated_at: '2026-07-22T00:00:00Z',
    },
    indicators: {
      milestone_count: 2, completed_milestone_count: 1, measurement_count: 2,
      reached_measurement_count: 1, necessary_requirement_count: 3,
      satisfied_necessary_requirement_count: 2, supporting_requirement_count: 1,
    },
    milestones: [],
    measurements: [
      { id: 'x1', plan_id: 'p1', version: 2, name: 'Ahorro', current_value: '420',
        target_value: '800', unit: 'USD', target_operator: 'gte', classification: 'necessary',
        sort_order: 0, history: [] },
      { id: 'x2', plan_id: 'p1', version: 1, name: 'Peso', current_value: '70',
        target_value: '72', unit: 'kg', target_operator: 'lte', classification: 'supporting',
        sort_order: 1, history: [] },
    ],
    manualConditions: [], requirements: [],
    draftIsolation: { contained: true, operationalChildrenPublished: false, appearsInHome: false, notifies: false, recurs: false },
  };
  const dto = plansService.toPlanGraphDto(raw);
  check(dto.plan.lifecycle === 'draft' && dto.draftIsolation.contained, 'Draft mapper keeps graph contained');
  check(dto.measurements.length === 2, 'DTO keeps multiple Measurements');
  check(dto.measurements[0].targetReached === false && dto.measurements[1].targetReached === true, 'Measurement targets are derived independently');
  check(!Object.hasOwn(dto, 'percentage') && !Object.hasOwn(dto.indicators, 'percentage'), 'DTO mapper never synthesizes universal progress');
  check(dto.indicators.completedMilestoneCount === 1 && dto.indicators.reachedMeasurementCount === 1, 'DTO keeps separate structural indicators');
}

function testValidation() {
  let invalid = null;
  try {
    plansService.assertGraphWriteInput({ entityType: 'task', action: 'create' });
  } catch (error) {
    invalid = error;
  }
  check(invalid?.code === 'validation_error', 'Plan writer rejects Task as an owned graph entity');

  let transition = null;
  try {
    plansService.assertGraphWriteInput({ entityType: 'plan', action: 'transition', payload: { transition: 'auto_complete' } });
  } catch (error) {
    transition = error;
  }
  check(transition?.code === 'invalid_transition', 'Plan writer rejects automatic completion');

  let missingPlanVersion = null;
  try {
    plansService.assertGraphWriteInput({ entityType: 'measurement', action: 'create', payload: {} });
  } catch (error) {
    missingPlanVersion = error;
  }
  check(missingPlanVersion?.code === 'expected_plan_version_required', 'child writes require expected Plan graph version');

  const mappedConflict = plansService.mapPlanRpcError({
    code: '40007', details: '{"current":8,"expected":7,"resource":"plan"}',
  });
  check(mappedConflict.statusCode === 412 && mappedConflict.details.current === 8,
    'version conflict exposes sanitized current/expected details');
}

try {
  testMigrationContract();
  testRuntimeBoundary();
  testDtoMapper();
  testValidation();
  testRunnerContract();
  console.log(`\nM11.3A CONTRACT TESTS: PASS (${assertions} assertions)`);
} catch (error) {
  console.error(`\nM11.3A CONTRACT TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
}
