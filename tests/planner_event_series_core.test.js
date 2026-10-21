'use strict'
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path')
const root=path.join(__dirname,'..'), read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
test('Series core has defaults, weekly days, and explicit idempotent materialization',()=>{
 const sql=read('supabase/migrations/20261004000003_planner_event_series_core.sql')
 assert.match(sql,/event_defaults jsonb/); assert.match(sql,/daysOfWeek/); assert.match(sql,/materialize_planner_event_series_range_v1/); assert.match(sql,/on conflict do nothing/); assert.match(sql,/lifecycle='active'/); assert.doesNotMatch(sql,/household_schedule_blocks.*drop/i)
})
test('Materialization is POST-only and no Calendar GET is changed',()=>{
 assert.match(read('backend/src/routes/planner.js'),/post\('\/event-series\/materialize-range'/)
 assert.match(read('backend/src/controllers/planner.event-series.controller.js'),/event\.create_household/)
})
test('Series materialization range is bounded by the SERVER, matching the client contract',()=>{
 // The DB is the authority: the guard must live in the RPC, not only in JS.
 const bound=read('supabase/migrations/20261005000009_planner_event_series_materialization_bound.sql')
 assert.match(bound,/materialize_planner_event_series_range_v1/)
 assert.match(bound,/\(p_to - p_from\) > 180/)
 assert.match(bound,/errcode='2203'|22023/)
 // It must patch the live definition instead of hand-copying the body, and it
 // must fail loudly rather than silently no-op if the anchor moved.
 assert.match(bound,/pg_get_functiondef/)
 assert.match(bound,/refusing to guess/)
 // Preserved contracts the guard must not weaken.
 assert.doesNotMatch(bound,/drop\s+(table|function|index)/i)
 const service=read('backend/src/services/planner.event-series.service.js')
 assert.match(service,/MAX_MATERIALIZATION_RANGE_DAYS = 180/)
 assert.match(service,/event_series_range_too_large/)
 // One number, three places: client, API and DB must not drift apart.
 const screen=read('front/mi-front-limpio/screens/planner/PlannerSeriesScreen.tsx')
 assert.match(screen,/days > 180/)
})
test('Series materialization bound is proven against a real database',()=>{
 assert.ok(read('tests/planner_event_series_materialization_bound_transactional.sql').includes('rollback;'))
 const runner=read('scripts/planner_event_series_materialization_bound_database_tests.js')
 assert.match(runner,/planner_event_series_materialization_bound_transactional\.sql/)
 for (const claim of ['over-limit materialization range is rejected','a rejected range creates 0 occurrences','the maximum supported range (180 days) is accepted','retrying the same valid range creates nothing new'])
  assert.ok(runner.includes(claim),`missing bound assertion: ${claim}`)
})
