#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ok ${message}`);
  } else {
    failed += 1;
    console.error(`  fail ${message}`);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

const service = read('front/mi-front-limpio/services/plannerTasks.ts');
const adapters = read('front/mi-front-limpio/adapters/planner/plannerTaskAdapters.ts');
const taskTypes = read('front/mi-front-limpio/types/plannerTaskV1.ts');
const rootScreen = read('front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx');
const taskContract = `${service}\n${adapters}\n${taskTypes}`;

section('service transport and backend operations');
[
  '/api/planner/tasks',
  '/api/planner/tasks/${taskId}',
  '/api/planner/tasks/${taskId}/complete',
  '/api/planner/tasks/${taskId}/verify',
  '/api/planner/tasks/${taskId}/trash',
  '/api/planner/tasks/${taskId}/restore',
  '/api/planner/tasks/${taskId}/reactivate',
  '/api/planner/v1/tasks/${taskId}/fulfillment',
  '/api/planner/v1/tasks/${taskId}/assignment',
  '/api/planner/v1/tasks/${taskId}/claim',
  '/api/planner/v1/tasks/${taskId}/fulfillments/${fulfillmentId}/${action}',
].forEach((needle) => assert(service.includes(needle), `service publishes ${needle}`));
assert(service.includes('plannerReadRequestOptions'), 'reads use Foundation read options');
assert(service.includes('plannerMutationRequestOptions'), 'mutations use Foundation mutation options');
assert(service.includes('buildPlannerVersionedIntent'), 'versioned mutations use Foundation intent');
assert(service.includes('normalizePlannerMutationResult'), 'mutation result normalization exported');
assert(service.includes('submitPlannerTaskForVerification'), 'submit for verification alias published');
assert(!service.includes('actorId'), 'service does not send actor authority');

section('task DTO and projection contract');
[
  'PlannerTaskDtoV1',
  'PlannerTaskProjection',
  'PlannerTaskCalendarProjectionV1',
  'PlannerTaskAvailableActionKey',
  'PlannerTaskAssignmentV1',
  'PlannerTaskAggregateV1',
  'PlannerTaskRecurrenceProjection',
  'PlannerTaskLocalMutationState',
].forEach((needle) => assert(taskTypes.includes(needle), `type ${needle} exported`));
[
  'personal',
  'household',
  'anyone',
  'members',
  'shared_once',
  'each_person',
  'pending',
  'awaiting_verification',
  'correction_requested',
  'verified',
].forEach((needle) => assert(taskContract.includes(`'${needle}'`), `canonical value ${needle}`));

section('published adapters');
[
  'plannerTasksRootAdapter',
  'projectPlannerTask',
  'projectPlannerTaskForCalendar',
  'toPlannerCalendarTaskProjection',
  'plannerTaskDetailRouteAdapter',
  'plannerTaskCreateFormAdapter',
  'plannerTaskEditFormAdapter',
  'plannerTaskMutationReducers',
  'plannerTaskAvailableActionLabels',
  'plannerTasksLaneContract',
  'plannerTaskVisualStateMatrix',
  'getPlannerTaskCacheKeys',
].forEach((needle) => assert(adapters.includes(needle), `adapter ${needle} exported`));
[
  'IR-FRONTEND-TASKS-WIRING-001',
  "routeName: ROUTE_NAMES.TaskDetail",
  "refreshBehavior: 'stale_while_refresh'",
  "views: ['day', 'week', 'month', 'no_date', 'filtered']",
  "createIntent: 'open_task_form'",
].forEach((needle) => assert(adapters.includes(needle), `root/detail contract contains ${needle}`));

section('available actions and reducers');
[
  'claim',
  'complete',
  'submit_for_verification',
  'verify',
  'request_correction',
  'resubmit',
  'revert',
  'reopen',
  'cancel',
  'reactivate',
  'trash',
  'restore',
].forEach((needle) => assert(adapters.includes(`${needle}:`) || adapters.includes(`'${needle}'`), `action ${needle} mapped`));
[
  'applyPlannerOptimistic',
  'reconcilePlannerOptimistic',
  'rollbackPlannerOptimistic',
  'preserveUncertainPlannerOptimistic',
  'markPlannerConflict',
  'outcome: PlannerMutationOutcome',
].forEach((needle) => assert(adapters.includes(needle), `reducer consumes ${needle}`));

section('calendar and temporal semantics');
assert(adapters.includes('semanticDate: task.due_date.slice(0, 10)'), 'date-only semantic local date preserved');
assert(adapters.includes('time: task.due_time ? task.due_time.slice(0, 5) : null'), 'optional time preserved');
assert(!adapters.includes('23:59'), 'no artificial 23:59');
assert(adapters.includes('badgeCountContribution: 1'), 'calendar count contribution is numeric one');
assert(adapters.includes("allDay: projection.time === null"), 'no-time task is all-day projection');
assert(adapters.includes("timed: projection.time !== null"), 'timed task remains timed');

section('root row UX');
assert(rootScreen.includes('projectPlannerTask(task)'), 'row consumes projection');
assert(rootScreen.includes('projection.accessibilityLabel'), 'row exposes full accessibility label');
assert(rootScreen.includes('primaryAction.label'), 'visible action comes from action mapping');
assert(rootScreen.includes('Abrir detalle de tarea'), 'row body opens detail intent');
assert(!rootScreen.includes('onLongPress'), 'no long press path');
assert(!rootScreen.includes('taskOverflowBtn'), 'no permanent overflow button');
assert(!rootScreen.includes('taskSecondaryAction'), 'no permanent secondary overflow action');

section('ownership guard');
const diff = execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const statusFiles = execFileSync('git', ['status', '--short', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.replace(/^(?:\?\?|[ MADRCU?!]{1,2})\s+/, ''));
const allowed = [
  /^front\/mi-front-limpio\/services\/plannerTasks/,
  /^front\/mi-front-limpio\/types\/.*Task/,
  /^front\/mi-front-limpio\/screens\/planner\/.*Task/,
  /^front\/mi-front-limpio\/components\/planner\/.*Task/,
  /^front\/mi-front-limpio\/features\/planner\/tasks\//,
  /^front\/mi-front-limpio\/adapters\/planner\/.*Task/,
  /^front\/mi-front-limpio\/tests\/.*Task/,
  /^docs\/implementation\/planner\/M11_FRONTEND_TASKS_REPORT\.md$/,
];
for (const file of [...new Set([...diff, ...statusFiles])]) {
  assert(allowed.some((pattern) => pattern.test(file.replace(/\\/g, '/'))), `diff path allowed: ${file}`);
}
assert(!statusFiles.some((file) => file.startsWith('backend/')), 'backend untouched');
assert(!statusFiles.some((file) => file.includes('package') || file.includes('lock')), 'package and lockfiles untouched');

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exit(1);
