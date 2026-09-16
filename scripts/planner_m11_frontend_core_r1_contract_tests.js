#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

try {
  const migration = read('supabase/migrations/20260722090002_m11_frontend_core_plan_structure_links.sql');
  const router = read('backend/src/routes/planner.js');
  const controller = read('backend/src/controllers/planner.plans.controller.js');
  const service = read('backend/src/services/planner.plans.service.js');
  const planTypes = read('front/mi-front-limpio/types/PlannerPlan.ts');
  const planService = read('front/mi-front-limpio/services/planner/plannerPlans.ts');
  const detailScreen = read('front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx');
  const editScreen = read('front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx');
  const surfaces = read('front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx');

  check(migration.includes('create or replace function public.apply_planner_plan_structure_changeset_rpc'), 'Plan Structure RPC exists');
  check(migration.includes('planner_v2_reserve_idempotency('), 'Plan Structure reserves V2 idempotency before version branch');
  check(migration.includes('planner_v2_complete_idempotency('), 'Plan Structure completes V2 idempotency');
  check(migration.includes('planner_v2_append_audit('), 'Plan Structure appends exactly-once audit through shared helper');
  check(migration.includes("v_plan.version <> p_expected_plan_version"), 'Plan Structure checks If-Match graph version');
  check(migration.includes("update public.planner_plans set updated_at = now()"), 'Plan Structure advances Plan graph version once after effective changes');
  check(migration.includes('public.read_planner_plan_graph_rpc(v_plan.id)'), 'Plan Structure returns authoritative snapshot');
  check(migration.includes('planner_plan_external_link_dto'), 'stable link DTO helper exists');
  check(migration.includes('external_entity_id'), 'migration preserves stable external ids');
  check(migration.includes("'availability', 'missing'"), 'link DTO handles missing');
  check(migration.includes("then 'trashed'"), 'link DTO handles trash');
  check(migration.includes("'availability', 'forbidden'"), 'link DTO handles forbidden');
  check(migration.includes("'availability', 'stale'"), 'link DTO handles stale');
  check(!migration.includes('submit_mode'), 'migration does not introduce submit_mode');

  check(router.includes("router.post('/plans/:id/structure'"), 'HTTP route is mounted');
  check(controller.includes('applyPlanStructureChangeset'), 'controller exports structure handler');
  check(controller.includes('OPERATION_KINDS.VERSIONED_MUTATION'), 'controller requires versioned mutation contract');
  check(controller.includes('hashIdempotencyRequestV2'), 'controller uses canonical V2 payload hash');
  check(controller.includes('assertBackendWriteAuthorization'), 'controller derives write authorization server-side');
  check(!controller.includes('actorId'), 'controller does not accept client actor authority');
  check(service.includes("rpc('apply_planner_plan_structure_changeset_rpc'"), 'service delegates to atomic RPC');
  check(service.includes('assertStructureChangesetInput'), 'service validates changeset payload');
  check(service.includes('toLinkedEntityDto'), 'service maps stable linked entity DTO');

  check(planTypes.includes('PlanLinkedEntityAvailability'), 'frontend type exposes link availability');
  check(planTypes.includes('externalEntityId: string | null'), 'frontend type exposes external entity id');
  check(planService.includes('writeCanonicalPlanStructureChangeset'), 'frontend service writes structure changeset');
  check(planService.includes('/api/planner/plans/${encodeURIComponent(input.planId)}/structure'), 'frontend service calls structure endpoint');
  check(planService.includes('createPlanStructureWriteIntent'), 'frontend uses Foundation mutation intent');
  check(planService.includes('resolveDetailRouteName'), 'frontend resolves canonical Task/Event detail routes');
  check(!planService.includes('submit_mode: single_graph_request'), 'frontend does not reintroduce forbidden submit_mode');
  check(!planService.includes('integration_pending'), 'Plans service no longer classifies Structure as integration_pending');

  check(editScreen.includes('pendingIntent'), 'structure editor preserves mutation identity for retry');
  check(editScreen.includes('submitting'), 'structure editor blocks double submit');
  check(editScreen.includes('setDraft({'), 'structure editor replaces local state from authoritative response');
  check(surfaces.includes('accessibilityLiveRegion="polite"'), 'structure editor shows sync status');
  check(detailScreen.includes("intent.availability !== 'available'"), 'Plan Detail blocks unavailable links safely');
  check(detailScreen.includes('navigation.navigate(intent.route, intent.params)'), 'Plan Detail navigates Detail-first through canonical route');

  console.log(`\nM11 FRONTEND CORE R1 CONTRACT TESTS: PASS (${assertions} assertions)`);
} catch (error) {
  console.error(`\nM11 FRONTEND CORE R1 CONTRACT TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
}
