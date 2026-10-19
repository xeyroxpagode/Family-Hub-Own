'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (path) => fs.readFileSync(path, 'utf8');

test('canonical Plan consumers have one root, factual progress, and guarded relations', () => {
  const service = read('backend/src/services/planner.plans.v1.service.js');
  const list = read('front/mi-front-limpio/screens/planner/PlannerPlanListScreen.tsx');
  const tasks = read('front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx');
  const compatibilityClient = read('front/mi-front-limpio/services/plannerPlansV1.ts');
  const guard = read('supabase/migrations/20261006000004_planner_component_direct_write_guard.sql');

  assert.doesNotMatch(service, /getMilestones|planner_goal_milestones/);
  assert.doesNotMatch(list, /progress_percentage|progress\?\.percentage|progress_mode/);
  assert.match(tasks, /listPlansV1\(accessToken, \{ limit: 100 \}\)/);
  assert.doesNotMatch(tasks, /listGoals/);
  assert.match(compatibilityClient, /export \* from '\.\/plannerPlansV1Frontend'/);
  assert.doesNotMatch(compatibilityClient, /requestJson|\/api\/planner\/v1\/plans/);
  assert.match(guard, /lifecycle not in \('preparation', 'active', 'paused'\)/);
  assert.match(guard, /planner_goal_actor_is_owner/);
  assert.match(guard, /planner_current_actor_has_capability/);
});
