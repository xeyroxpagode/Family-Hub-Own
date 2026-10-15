'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (path) => fs.readFileSync(path, 'utf8');

test('fresh adversarial audit keeps every required Plan capability reachable', () => {
  const detail = read('front/mi-front-limpio/screens/planner/PlannerPlanDetailScreenV1.tsx');
  const list = read('front/mi-front-limpio/screens/planner/PlannerPlanListScreen.tsx');
  const create = read('front/mi-front-limpio/screens/planner/PlannerPlanCreateScreen.tsx');
  const edit = read('front/mi-front-limpio/screens/planner/PlannerPlanEditScreen.tsx');
  const navigator = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const navigation = read('front/mi-front-limpio/navigation/plannerNavigationContract.ts');
  const client = read('front/mi-front-limpio/services/plannerPlansV1Frontend.ts');
  const reliability = read('front/mi-front-limpio/services/planner/reliability/productiveAdapters.ts');
  const routes = read('backend/src/routes/planner.v1.js');
  const parentRoutes = read('backend/src/routes/planner.js');
  const planService = read('backend/src/services/planner.plans.v1.service.js');
  const componentService = read('backend/src/services/planner.plan-components.service.js');
  const http = read('scripts/planner_overnight_http_journeys.js');

  assert.match(parentRoutes, /router\.use\(authFinalMiddleware\)/);
  for (const route of ['CreatePlan', 'PlanDetail', 'EditPlan', 'PlannerTrash', 'PlannerSearch', 'PlannerAttentionActivity']) {
    assert.match(navigator, new RegExp(`name="${route}"`));
  }
  assert.match(navigation, /plan: ROUTE_NAMES\.PlanDetail/);
  assert.match(list, /listPlansV1/);
  assert.match(create, /createPlanV1/);
  assert.match(edit, /getPlanByIdV1[\s\S]*updatePlanV1/);
  assert.match(detail, /initialPlanId: planId/);
  assert.match(detail, /openTaskDetail/);
  assert.match(detail, /openEventDetail/);
  assert.match(detail, /load\(true\)/);
  assert.doesNotMatch(detail, /Alert\.prompt/);
  assert.match(reliability, /restorePlanV1/);
  assert.doesNotMatch(reliability, /const response = await restoreGoal\(/);

  for (const endpoint of [
    '/plans', '/plans/:id', '/plans/:id/transition', '/plans/:id/trash', '/plans/:id/restore',
    '/plans/:id/readiness', '/plans/:id/components', '/plans/:id/measurements',
    '/plans/:id/measurements/trash', '/plans/:id/measurements/:measurementId/history',
    '/plans/:id/measurements/:measurementId/trash', '/plans/:id/measurements/:measurementId/restore',
    '/plans/:id/events/:eventId/link', '/plans/:id/events/:eventId/unlink',
  ]) assert.match(routes, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  for (const evidence of [
    'Plan Edit succeeds', 'advertised Resume executes successfully', 'override completes the Plan',
    'archive succeeds', 'unarchive succeeds', 'Plan trash succeeds', 'Plan restores',
    'Task edit persists', 'Task reclassification succeeds', 'Task survives unlink',
    'Event edit persists', 'Event reclassification succeeds', 'Event survives unlink',
    'Measurement reclassification succeeds', 'Measurement history reachable', 'Measurement restored',
    'Search returns canonical Plan', 'Home summary includes canonical Plan',
    'appears in Attention', 'Activity contains canonical Plan', 'trashed Plan is discoverable',
  ]) assert.match(http, new RegExp(evidence));

  for (const errorCode of [
    'planner_forbidden', 'plan_not_found', 'plan_locked', 'invalid_lifecycle_transition',
    'version_conflict', 'readiness_unresolved', 'invalid_plan_classification', 'personal_plans_not_supported',
  ]) assert.match(http + client + planService + componentService, new RegExp(errorCode));
});
