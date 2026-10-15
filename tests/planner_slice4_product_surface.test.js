'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (path) => fs.readFileSync(path, 'utf8');

test('canonical Plan edit, archive discovery, navigation and presets stay reachable', () => {
  const navigator = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const detail = read('front/mi-front-limpio/screens/planner/PlannerPlanDetailScreenV1.tsx');
  const list = read('front/mi-front-limpio/screens/planner/PlannerPlanListScreen.tsx');
  const edit = read('front/mi-front-limpio/screens/planner/PlannerPlanEditScreen.tsx');
  const searchGuard = read('front/mi-front-limpio/services/planner/plannerSearchGuard.ts');
  const presets = read('front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx');
  const activity = read('front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx');

  assert.match(navigator, /name="EditPlan" component=\{PlannerPlanEditScreen\}/);
  assert.match(detail, /availableActions\?\.includes\('edit'\)/);
  assert.match(detail, /navigate\('EditPlan', \{ entityId: plan\.id/);
  assert.match(edit, /updatePlanV1\(/);
  assert.doesNotMatch(edit, /services\/planner\/plannerPlans|Milestone/);
  assert.match(list, /archived: 'all'/);
  assert.match(list, /key: 'archived'/);
  assert.doesNotMatch(searchGuard, /routeName: 'Planner'/);
  assert.match(searchGuard, /routeName: 'PlannerHome'/);
  assert.match(presets, /entity_type === 'plan'[\s\S]*ROUTE_NAMES\.PlanCreate/);
  assert.match(presets, /request\.kind === 'plan'[\s\S]*ROUTE_NAMES\.PlanCreate/);
  assert.doesNotMatch(activity, /openEntityDetail\(navigation, 'plan', \{ entityId: item\.entityId/);
});
