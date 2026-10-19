'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Event product creation is household-only across V0, V1, and the live Calendar surface', () => {
  assert.match(read('backend/src/controllers/planner.events.controller.js'), /personal_events_not_supported/)
  assert.match(read('backend/src/controllers/planner.events.v1.controller.js'), /scopeType !== 'household'/)
  assert.match(read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx'), /const eventScope = 'household' as const/)
})

test('V0 PATCH is a compatibility adapter for canonical scheduling and location fields', () => {
  const source = read('backend/src/services/planner.events.service.js')
  assert.match(source, /patch\.scheduling = \{ type: 'all_day'/)
  assert.match(source, /patch\.scheduling = \{[\s\S]*type: 'timed'/)
  assert.match(source, /patch\.location = locationName/)
  assert.match(source, /p_patch: patch/)
})

test('canonical DTO defines temporal condition with household-local all-day dates and effective end boundary', () => {
  const migration = read('supabase/migrations/20261004000002_planner_event_core_closure.sql')
  assert.match(migration, /now\(\) at time zone coalesce\(h\.timezone, 'UTC'\)/)
  assert.match(migration, /when now\(\) >= coalesce\(v_event\.ends_at/)
  assert.match(migration, /when v_local_today < v_event\.start_date then 'upcoming'/)
  assert.match(migration, /when v_local_today > v_event\.end_date then 'past'/)
})

test('Event Core does not create an occurrence table or redesign Series/Participants', () => {
  const migration = read('supabase/migrations/20261004000002_planner_event_core_closure.sql')
  assert.doesNotMatch(migration, /create table.*occurrence/i)
  assert.doesNotMatch(migration, /alter table public\.planner_event_(series|participants)/)
})

// One Event response contract for create / read / update. The shared mutation RPC
// answers `{ data: { event }, outcome }`, but that transport envelope is unwrapped
// at the service boundary, so every Event route answers `{ event }`. Locked here
// because a leaked `data`/`outcome` layer is invisible to a type that only ever
// reads `.event`, and would silently break any second consumer.
test('every Event route answers the same { event } envelope, with no leaked transport layer', () => {
  const service = read('backend/src/services/planner.events.service.js')
  assert.match(
    service,
    /const event = result\?\.body\?\.data\?\.event \?\? result/,
    'update must unwrap the mutation transport envelope',
  )

  const client = read('front/mi-front-limpio/services/plannerEvents.ts')
  assert.match(client, /type PlannerEventResponse = \{\s*event: PlannerEvent;\s*\}/)
  // Every single-Event call must be typed with that one response shape. The
  // collection read is the only `{ events }` contract.
  const routes = [...client.matchAll(/requestJson<([A-Za-z]+)>\(\s*[`'"](\/api\/planner\/events[^`'"\s]*)/g)]
  const list = routes.filter(([, responseType]) => responseType === 'PlannerEventsResponse')
  const single = routes.filter(([, responseType]) => responseType === 'PlannerEventResponse')
  assert.equal(list.length, 1, 'exactly one Event call may use the { events } collection contract')
  assert.equal(single.length, 8, `every Event read/write answers { event } (got ${single.length})`)
  assert.equal(routes.length, list.length + single.length, 'no Event route may use another response shape')
  for (const [, , route] of single) {
    assert.doesNotMatch(route, /\/api\/planner\/events\$\{/, 'the collection read must not be typed as a single Event')
  }

  // No productive caller may read the transport layer off an Event response.
  assert.doesNotMatch(client, /\.outcome/)
  assert.doesNotMatch(client, /data\.event/)
})
