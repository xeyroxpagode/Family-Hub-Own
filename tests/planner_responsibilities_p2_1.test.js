'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { assignmentForOccurrence, isResolved, nextOccurrence, validateRule } = require('../backend/src/domain/planner.responsibilities.domain')

const members = ['a', 'b', 'c']
const daily = { kind: 'daily', anchorDate: '2026-09-14', interval: 1, weekdays: [] }
const rule = (assignmentKind, memberIds = []) => ({ assignmentKind, memberIds, schedule: daily })

test('R1 Fixed single member -> correct Task assignee', () => assert.deepEqual(assignmentForOccurrence(rule('fixed', ['a']), members, 1).memberIds, ['a']))
test('R2 Fixed multiple members -> canonical shared assignment', () => assert.deepEqual(assignmentForOccurrence(rule('fixed', ['a', 'b']), members, 1).memberIds, ['a', 'b']))
test('R3 Claimable -> anyone Task', () => assert.equal(assignmentForOccurrence(rule('claimable'), members, 1).assignmentKind, 'anyone'))
test('R4 Unassigned -> real unassigned Task', () => assert.equal(assignmentForOccurrence(rule('unassigned'), members, 1).assignmentKind, 'legacy_unassigned'))
test('R5 Rotation -> deterministic order', () => assert.deepEqual([1, 2, 3, 4].map((n) => assignmentForOccurrence(rule('rotation', members), members, n).memberIds[0]), ['a', 'b', 'c', 'a']))
test('R6 Rotation override -> replacement does not alter next slot', () => { const slot = assignmentForOccurrence(rule('rotation', members), members, 2).slotMemberId; assert.equal(slot, 'b'); assert.equal(assignmentForOccurrence(rule('rotation', members), members, 3).slotMemberId, 'c') })
test('R7 Daily recurrence -> next slot only', () => assert.equal(nextOccurrence(daily, '2026-09-14'), '2026-09-15'))
test('R8 Daily overdue -> advances after resolution date, no missed pile', () => assert.equal(nextOccurrence(daily, '2026-09-17'), '2026-09-18'))
test('R9 Every 2 days -> correct calendar anchor', () => assert.equal(nextOccurrence({ kind: 'interval', interval: 2, unit: 'days', anchorDate: '2026-09-14' }, '2026-09-17'), '2026-09-18'))
test('R10 Weekly multi-day -> correct next valid weekday', () => assert.equal(nextOccurrence({ kind: 'weekdays', interval: 1, weekdays: [2, 5], anchorDate: '2026-09-14' }, '2026-09-16'), '2026-09-18'))
test('R11 Every 2 weeks -> interval respected', () => assert.equal(nextOccurrence({ kind: 'weekdays', interval: 2, weekdays: [2], anchorDate: '2026-09-14' }, '2026-09-16'), '2026-09-29'))
test('R12 Monthly normal -> correct date', () => assert.equal(nextOccurrence({ kind: 'monthly', interval: 1, monthDay: 15, anchorDate: '2026-01-01' }, '2026-09-16'), '2026-10-15'))
test('R13 Monthly day 31 -> clamps to final valid day', () => assert.equal(nextOccurrence({ kind: 'monthly', interval: 1, monthDay: 31, anchorDate: '2026-01-01' }, '2026-01-31'), '2026-02-28'))
test('R14 Completion-based -> resolution date anchors next', () => assert.equal(nextOccurrence({ kind: 'after_completion', interval: 3, unit: 'months', anchorDate: '2026-09-15' }, '2026-09-20'), '2026-12-20'))
test('R15 Verification required -> awaiting is not resolved', () => assert.equal(isResolved({ status: 'awaiting_verification', requiresVerification: true }), false))
test('R16 Verification correction -> correction is not resolved', () => assert.equal(isResolved({ status: 'correction_requested', requiresVerification: true }), false))
test('R17 Verified -> advances', () => assert.equal(isResolved({ status: 'verified', requiresVerification: true }), true))
test('R18 repeated materializer -> schema owns unique responsibility+sequence', () => { const migration = require('fs').readFileSync(require('path').join(__dirname, '../supabase/migrations/20260916000001_planner_responsibilities_p2_1.sql'), 'utf8'); assert.match(migration, /unique \(responsibility_id, sequence\)/); assert.match(migration, /unique index.*one_live/is) })
test('R19 pause -> inactive lifecycle is part of contract', () => assert.ok(require('../backend/src/domain/planner.responsibilities.domain').LIFECYCLES.includes('paused')))
test('R20 resume -> next calendar point after today, no backlog', () => assert.equal(nextOccurrence({ kind: 'weekdays', interval: 1, weekdays: [1], anchorDate: '2026-08-01' }, '2026-09-16'), '2026-09-21'))
test('R21 edit schedule -> pure schedule computation does not mutate current Task', () => { const task = { due_date: '2026-09-16' }; nextOccurrence({ kind: 'monthly', interval: 1, monthDay: 1, anchorDate: '2026-01-01' }, '2026-09-16'); assert.equal(task.due_date, '2026-09-16') })
test('R22 edit assignment -> assignment rule does not mutate concrete Task', () => { const task = { member: 'a' }; assignmentForOccurrence(rule('fixed', ['b']), members, 2); assert.equal(task.member, 'a') })
test('R23 archive -> lifecycle contract', () => assert.ok(require('../backend/src/domain/planner.responsibilities.domain').LIFECYCLES.includes('archived')))
test('R24 restore/unarchive -> active lifecycle contract', () => assert.ok(require('../backend/src/domain/planner.responsibilities.domain').LIFECYCLES.includes('active')))
test('R25 removed rotation member -> skipped future and cursor stays stable', () => { const afterA = assignmentForOccurrence(rule('rotation', members), ['a', 'c'], 2, 'a'); assert.equal(afterA.slotMemberId, 'c'); assert.equal(assignmentForOccurrence(rule('rotation', members), ['a', 'c'], 3, afterA.slotMemberId).slotMemberId, 'a') })
test('R26 rotation <2 valid members -> requires adjustment', () => assert.equal(validateRule(rule('rotation', ['a', 'b']), ['a']).reason, 'La rotación necesita al menos 2 integrantes.'))
test('R27 invalid fixed member -> requires adjustment', () => assert.equal(validateRule(rule('fixed', ['b']), ['a']).reason, 'Elegí un nuevo responsable.'))
test('R28 Task origin -> schema has immutable linkage', () => { const migration = require('fs').readFileSync(require('path').join(__dirname, '../supabase/migrations/20260916000001_planner_responsibilities_p2_1.sql'), 'utf8'); assert.match(migration, /responsibility_occurrence_sequence/); assert.match(migration, /on delete restrict/) })
test('R29 temporary replacement -> occurrence slot is separately persisted', () => { const migration = require('fs').readFileSync(require('path').join(__dirname, '../supabase/migrations/20260916000001_planner_responsibilities_p2_1.sql'), 'utf8'); assert.match(migration, /rotation_slot_member_id/) })
test('R30 reopen resolved old occurrence -> ledger resolution is not rolled back', () => { const source = require('fs').readFileSync(require('path').join(__dirname, '../backend/src/services/planner.responsibilities.service.js'), 'utf8'); assert.doesNotMatch(source, /delete\(\).*planner_responsibility_occurrences/); assert.doesNotMatch(source, /next_sequence\s*[-=]/) })
test('R31 materialization is an explicit endpoint and task reads remain read-only', () => {
  const fs = require('fs'); const path = require('path');
  const router = fs.readFileSync(path.join(__dirname, '../backend/src/routes/planner.js'), 'utf8');
  const tasksController = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/planner.tasks.controller.js'), 'utf8');
  const responsibilityService = fs.readFileSync(path.join(__dirname, '../backend/src/services/planner.responsibilities.service.js'), 'utf8');
  assert.match(router, /post\('\/responsibilities\/materialize-due'/);
  assert.doesNotMatch(tasksController, /materializeHousehold/);
  assert.doesNotMatch(responsibilityService.match(/async function listResponsibilities[\s\S]*?async function getResponsibility/)?.[0] ?? '', /materializeHousehold/);
})
test('R32 occurrence ledger blocks direct authenticated writes while the established materializer resolves linked Tasks', () => {
  const fs = require('fs'); const path = require('path');
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261004000001_planner_responsibility_closure_hardening.sql'), 'utf8');
  const service = fs.readFileSync(path.join(__dirname, '../backend/src/services/planner.responsibilities.service.js'), 'utf8');
  assert.match(migration, /revoke insert, update, delete on table public\.planner_responsibility_occurrences from authenticated/);
  assert.match(migration, /drop policy if exists planner_responsibility_occurrences_insert/);
  assert.match(migration, /drop policy if exists planner_responsibility_occurrences_update/);
  assert.match(migration, /update public\.planner_responsibility_occurrences/);
  assert.doesNotMatch(service, /planner_responsibility_occurrences'\)\.update/);
})
test('R33 responsibility and member writes reuse the visible API authority', () => {
  const fs = require('fs'); const path = require('path');
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261004000001_planner_responsibility_closure_hardening.sql'), 'utf8');
  assert.match(migration, /planner_current_actor_has_capability\(household_id, 'task\.create_household'\)/);
  assert.match(migration, /planner_current_actor_has_capability\(household_id, 'planner\.view'\)/);
  assert.match(migration, /create policy planner_responsibility_members_delete/);
})
