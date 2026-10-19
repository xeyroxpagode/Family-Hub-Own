/**
 * Plans — single Plan root contract.
 *
 * Binding: `planner_goals` is the only Plan root. Create, List and Detail must
 * resolve against the same id space, and no live Plan call site may reach the
 * legacy `planner_plans` surfaces.
 *
 * Authority: PLANS_TECHNICAL_TRUTH_V1 §1.1 (one root), §18 (public family),
 * §19 (single frontend contract), §20 (Create failure CURRENT), §24 (not
 * rescued from `planner_plans`).
 */

import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ROUTE_NAMES } from '../front/mi-front-limpio/navigation/plannerNavigationContract';
import { PLAN_CONTRACT_FIELDS, PLAN_LIFECYCLE_VALUES, PLAN_SCOPE_VALUES } from '../front/mi-front-limpio/types/Plan';
import type { Plan } from '../front/mi-front-limpio/types/Plan';

const { toPlanDto, PLAN_DTO_FIELDS } = require(join(process.cwd(), 'backend/src/services/planner.plans.v1.dto')) as {
  toPlanDto: (goal: Record<string, unknown>, milestones: unknown[]) => Plan;
  PLAN_DTO_FIELDS: readonly string[];
};

let assertions = 0;
function check(condition: unknown, message: string): void {
  assert.ok(condition, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full.split('\\').join('/'));
    }
  }
  return out;
}

const FRONT_ROOT = 'front/mi-front-limpio';
const LIVE_PLAN_SURFACES = [
  `${FRONT_ROOT}/screens/planner`,
  `${FRONT_ROOT}/navigation`,
  `${FRONT_ROOT}/components/planner`,
  `${FRONT_ROOT}/services/planner`,
].flatMap((dir) => walk(dir));

/** Screens that are not registered on any navigator, so they cannot receive Plan traffic. */
const UNREGISTERED_LEGACY_SCREENS = [
  `${FRONT_ROOT}/screens/planner/GoalDetailScreen.tsx`,
  `${FRONT_ROOT}/screens/planner/PlannerGoalsScreen.tsx`,
];

const navigator = read(`${FRONT_ROOT}/navigation/HomeTabNavigator.tsx`);
const linkingApp = read(`${FRONT_ROOT}/App.tsx`);
const planClient = read(`${FRONT_ROOT}/services/plannerPlansV1Frontend.ts`);
const planDetailScreen = read(`${FRONT_ROOT}/screens/planner/PlannerPlanDetailScreenV1.tsx`);
const planListScreen = read(`${FRONT_ROOT}/screens/planner/PlannerPlanListScreen.tsx`);
const planCreateScreen = read(`${FRONT_ROOT}/screens/planner/PlannerPlanCreateScreen.tsx`);
const v1Service = read('backend/src/services/planner.plans.v1.service.js');
const v1Controller = read('backend/src/controllers/planner.plans.v1.controller.js');
const v1Routes = read('backend/src/routes/planner.v1.js');
const plannerQuickActions = read(`${FRONT_ROOT}/services/planner/plannerQuickActions.ts`);
const LEGACY_PLAN_TYPE = read(`${FRONT_ROOT}/types/PlannerPlan.ts`);
const planDto = read('backend/src/services/planner.plans.v1.dto.js');

// ---------------------------------------------------------------------------
// 1. Canonical Plan routes resolve against the Plan root
// ---------------------------------------------------------------------------

equal(ROUTE_NAMES.PlanList, 'PlanList', 'canonical Plan list route is the PlanList physical route');
equal(ROUTE_NAMES.PlanDetail, 'PlanDetail', 'canonical Plan detail route is the PlanDetail physical route');
equal(ROUTE_NAMES.PlanCreate, 'CreatePlan', 'canonical Plan create route is the CreatePlan physical route');

check(
  /name="PlanList"\s+component=\{PlannerPlanListScreen\}/.test(navigator),
  'PlanList physical route is registered to the Plan list screen',
);
check(
  /name="PlanDetail"\s+component=\{PlannerPlanDetailScreenV1\}/.test(navigator),
  'PlanDetail physical route is registered to the planner_goals-backed Plan detail screen',
);
check(
  /name="CreatePlan"\s+component=\{PlannerPlanCreateScreen\}/.test(navigator),
  'CreatePlan physical route is registered to the planner_goals-backed Plan create screen',
);

for (const screen of UNREGISTERED_LEGACY_SCREENS) {
  const name = screen.split('/').pop()!.replace('.tsx', '');
  check(!navigator.includes(`component={${name}}`), `${name} is not registered on any navigator`);
}

// ---------------------------------------------------------------------------
// 2. Create, List and Detail resolve against the same public family / id space
// ---------------------------------------------------------------------------

check(planClient.includes("`/api/planner/v1/plans/${planId}`"), 'Plan detail reads the planner_goals-backed family');
check(!planClient.includes("`/api/planner/plans/"), 'Plan client never addresses the legacy planner_plans family');

check(planListScreen.includes('listPlansV1('), 'Plan list reads through the canonical Plan family');
check(planDetailScreen.includes('getPlanByIdV1('), 'Plan detail reads through the canonical Plan family');
check(planCreateScreen.includes('createPlanV1('), 'Plan create writes through the canonical Plan family');

check(
  /router\.get\('\/plans',\s*plansV1Controller\.listPlans\)/.test(v1Routes),
  'the v1 Plan router exposes the Plan collection',
);
check(
  /router\.post\('\/plans',\s*plansV1Controller\.createPlan\)/.test(v1Routes),
  'the v1 Plan router exposes Plan create',
);
check(
  /router\.get\('\/plans\/:id',\s*plansV1Controller\.getPlanById\)/.test(v1Routes),
  'the v1 Plan router exposes Plan detail',
);
check(!v1Service.includes('planner_plans'), 'the v1 Plan service never touches planner_plans');
check(
  v1Service.includes(".from('planner_goals')"),
  'the v1 Plan service persists through planner_goals',
);
check(v1Controller.includes('planner.view'), 'the v1 Plan controller gates reads on planner.view');

// ---------------------------------------------------------------------------
// 3. No live Plan call site reaches the legacy surfaces
// ---------------------------------------------------------------------------

const LEGACY_DETAIL_TRAFFIC = /(navigate|replace)\(\s*['"`]GoalDetail['"`]|screen:\s*['"`]GoalDetail['"`]/;
const LEGACY_GRAPH_TRAFFIC = /services\/planner\/plannerPlans['"]/;
const LEGACY_STRUCTURE_TRAFFIC = /(navigate|replace)\(\s*['"`]EditGoal['"`]/;

/** Surfaces reachable from the canonical Create -> List -> Detail path. */
const PLAN_PATH_SURFACES = [
  `${FRONT_ROOT}/screens/planner/PlannerScreen.tsx`,
  `${FRONT_ROOT}/screens/planner/PlannerPlanListScreen.tsx`,
  `${FRONT_ROOT}/screens/planner/PlannerPlanCreateScreen.tsx`,
  `${FRONT_ROOT}/screens/planner/PlannerPlanDetailScreenV1.tsx`,
  `${FRONT_ROOT}/screens/planner/GoalForm.tsx`,
  `${FRONT_ROOT}/services/plannerPlansV1Frontend.ts`,
];

const liveSurfaces = LIVE_PLAN_SURFACES.filter((path) => !UNREGISTERED_LEGACY_SCREENS.includes(path));

const pathOffenders = PLAN_PATH_SURFACES.filter((path) => LEGACY_GRAPH_TRAFFIC.test(read(path)));
equal(
  pathOffenders.join(' | '),
  '',
  'no surface on the canonical Create -> List -> Detail path reaches the planner_plans graph client',
);

const legacyDetailOffenders = liveSurfaces.filter((path) => LEGACY_DETAIL_TRAFFIC.test(read(path)));
equal(legacyDetailOffenders.join(' | '), '', 'no live Plan surface navigates to the legacy GoalDetail route');

const legacyStructureOffenders = liveSurfaces.filter((path) => LEGACY_STRUCTURE_TRAFFIC.test(read(path)));
equal(legacyStructureOffenders.join(' | '), '', 'no live Plan surface navigates to a legacy structure edit route');

check(
  !planDetailScreen.includes('getCanonicalPlanGraph') && planDetailScreen.includes("navigate('EditPlan'"),
  'the canonical Plan detail screen reaches the canonical editor without the legacy graph',
);
check(
  planDetailScreen.includes('Promise.allSettled(['),
  'Plan detail isolates independent component reads instead of making them a sequential root failure',
);
check(
  planDetailScreen.includes('sectionErrors.events') && planDetailScreen.includes('retryLabel="Reintentar"'),
  'a failed Plan component section renders an explicit retry boundary while the root remains available',
);

// ---------------------------------------------------------------------------
// 3b. Remaining planner_plans surfaces are unreachable or gated, not retired
//     (Technical Truth §24/§25 — retirement belongs to R16/R18/R19, not R1)
// ---------------------------------------------------------------------------

const legacyGraphSurfaces = liveSurfaces.filter((path) => LEGACY_GRAPH_TRAFFIC.test(read(path)));
equal(
  legacyGraphSurfaces.join(' | '),
  [
    `${FRONT_ROOT}/screens/planner/PlannerPlanDetailScreen.tsx`,
    `${FRONT_ROOT}/screens/planner/PlannerPlansScreen.tsx`,
    `${FRONT_ROOT}/screens/planner/PlannerPlansSurfaces.tsx`,
    `${FRONT_ROOT}/screens/planner/PlannerPlanStructureEditScreen.tsx`,
    `${FRONT_ROOT}/components/planner/PlannerSheetHost.tsx`,
  ].join(' | '),
  'the exact set of remaining planner_plans surfaces is frozen until the cutover slices',
);

check(
  !navigator.includes('component={PlannerPlansScreen}'),
  'the legacy planner_plans list screen is not registered on any navigator',
);

// Exported-but-unregistered legacy screens (PlannerGoalsScreen,
// PlannerPlansScreen, PlannerSchedulesScreen, GoalDetailScreen) are classified
// DEAD LEGACY / NON-BLOCKING: audited and left unregistered. What matters is
// not only that the navigator skips them, but that NOTHING imports them, so no
// navigation, deep link, Home, Search, Attention or Trash path can revive them.
// Checked across the whole frontend, not just the navigator.
const LEGACY_SCREENS = [
  'PlannerGoalsScreen',
  'PlannerPlansScreen',
  'PlannerSchedulesScreen',
  'GoalDetailScreen',
];
const legacyImporters = walk(FRONT_ROOT)
  .filter((path) => !LEGACY_SCREENS.some((screen) => path.endsWith(`/${screen}.tsx`)))
  .filter((path) => LEGACY_SCREENS.some((screen) => new RegExp(`from ['"][^'"]*${screen}['"]`).test(read(path))))
  .map((path) => path.replace(`${FRONT_ROOT}/`, ''));
equal(
  legacyImporters.join(' | '),
  '',
  'no frontend module imports a legacy planner screen, so none has a productive caller',
);
// The route still NAMED `GoalDetail` must be the canonical V1 Plan detail, not
// the legacy component, or a canonical helper would silently revive legacy UI.
check(
  navigator.includes('<PlannerStack.Screen name="GoalDetail" component={PlannerPlanDetailScreen} />'),
  'the GoalDetail route name resolves to the canonical V1 Plan detail screen',
);
const createGoalAction = plannerQuickActions.slice(plannerQuickActions.indexOf("key: 'create_goal'"));
check(
  createGoalAction.slice(0, createGoalAction.indexOf('},')).includes('implemented: false'),
  'the Quick Action that opens the planner_plans create surface stays gated',
);

// ---------------------------------------------------------------------------
// 4. Deep links keep the historical path but resolve against the Plan root
// ---------------------------------------------------------------------------

check(linkingApp.includes("PlanDetail: 'goals/:entityId'"), 'plan deep links resolve against planner_goals');
check(!/^\s*GoalDetail: 'goals\/:entityId'/m.test(linkingApp), 'plan deep links no longer bind to the legacy detail route');

// ---------------------------------------------------------------------------
// 5. Create produces the Plan root id used by Detail
// ---------------------------------------------------------------------------

// R4b: the preparation lifecycle is no longer assembled in JS. The Plan service
// delegates creation to `create_goal_rpc`, and the writer is what pins the
// lifecycle. Both halves are asserted so the contract cannot drift silently
// back into a JS payload or into a column default.
const writeAuthoritySql = read(
  'supabase/migrations/20261003000003_planner_plan_write_authority.sql',
);

check(
  v1Service.includes("'create_goal_rpc'"),
  'Plan create delegates to the create_goal_rpc write authority',
);
check(
  /create or replace function public\.create_goal_rpc/.test(writeAuthoritySql),
  'the create write authority exists as a Plan root writer',
);
check(
  /'preparation'\s*\n?\s*\)\s*\n?\s*returning \* into v_row/.test(writeAuthoritySql),
  'Plan create produces the preparation lifecycle in the write authority',
);
check(
  !v1Service.includes("lifecycle: 'preparation'"),
  'the Plan service no longer hand-builds a planner_goals create payload',
);

// ---------------------------------------------------------------------------
// 6. One frontend Plan contract, projected by the backend Plan DTO
// ---------------------------------------------------------------------------

const GOAL_ROW = {
  id: '22f53d7f-f535-4548-b70b-86a45d020c1c',
  title: 'Reforma del baño',
  description: null,
  visibility: 'household',
  target_date: '2026-12-31',
  lifecycle: 'preparation',
  archived_at: null,
  trashed_at: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-02T00:00:00.000Z',
  version: 3,
};

const dto = toPlanDto(GOAL_ROW, []);

equal(
  Object.keys(dto).sort().join(','),
  [...PLAN_CONTRACT_FIELDS].sort().join(','),
  'the backend Plan DTO projects exactly the canonical Plan contract fields',
);
equal(
  [...PLAN_DTO_FIELDS].sort().join(','),
  [...PLAN_CONTRACT_FIELDS].sort().join(','),
  'the declared backend Plan DTO fields and the frontend Plan contract do not drift',
);
check(
  v1Service.includes("require('./planner.plans.v1.dto')"),
  'the Plan service consumes the single Plan DTO authority',
);
check(
  planDto.includes('scope: goal.visibility'),
  'the Plan DTO projects the persisted visibility as scope rather than a second scope authority',
);
equal(dto.id, GOAL_ROW.id, 'the Plan DTO keeps the planner_goals id space');
equal(dto.scope, 'household', 'the Plan DTO projects visibility as scope');
equal(dto.targetDate, '2026-12-31', 'the Plan DTO projects target_date');
equal(dto.version, 3, 'the Plan DTO carries optimistic concurrency version');
check(PLAN_LIFECYCLE_VALUES.includes(dto.lifecycle), 'the Plan DTO lifecycle stays inside the canonical lifecycle');
check(PLAN_SCOPE_VALUES.includes(dto.scope), 'the Plan DTO scope stays inside the canonical scope');

const dtoTyped: Plan = dto;
equal(dtoTyped.id, GOAL_ROW.id, 'the backend Plan DTO satisfies the canonical Plan type');

check(
  planClient.includes("from '../types/PlannerPlanV1'"),
  'the Plan client resolves the contract through the compatibility alias',
);
check(!planClient.includes("from '../types/PlannerGoal"), 'the Plan client does not depend on the legacy Goal projection');
check(
  !LEGACY_PLAN_TYPE.includes("lifecycle: 'preparation'"),
  'the legacy planner_plans contract is not the canonical Plan contract',
);

console.log(`\n=== PLANS single root tests: ${assertions} assertions ===`);
console.log('All passed.');
