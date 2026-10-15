'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (path) => fs.readFileSync(path, 'utf8');

test('Measurements are a reachable cross-platform Plan-local product', () => {
  const detail = read('front/mi-front-limpio/screens/planner/PlannerPlanDetailScreenV1.tsx');
  const frontend = read('front/mi-front-limpio/services/plannerPlansV1Frontend.ts');
  const routes = read('backend/src/routes/planner.v1.js');
  const migration = read('supabase/migrations/20261006000003_planner_measurement_history_trash_reads.sql');

  assert.doesNotMatch(detail, /Alert\.prompt/);
  for (const field of ['measurementName', 'measurementCurrent', 'measurementTarget', 'measurementUnit', 'measurementOperator', 'measurementClassification']) {
    assert.match(detail, new RegExp(field));
  }
  assert.match(detail, /\['gte', 'lte', 'eq'\]/);
  assert.match(detail, /\['necessary', 'supporting'\]/);
  assert.match(detail, /Papelera de mediciones/);
  assert.match(detail, /Historial/);
  assert.match(frontend, /measurements\/trash/);
  assert.match(frontend, /measurements\/\$\{measurementId\}\/history/);
  assert.match(routes, /measurements\/:measurementId\/history/);
  assert.match(migration, /planner_current_actor_has_capability\(v_household, 'planner\.view'\)/);
  assert.match(migration, /m\.goal_id = p_goal_id and m\.trashed_at is not null/);
  assert.match(migration, /h\.goal_id = p_goal_id and h\.measurement_id = p_measurement_id/);
  assert.doesNotMatch(migration, /grant execute[^;]+to anon/);
});
