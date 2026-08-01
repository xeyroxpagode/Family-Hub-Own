import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

let assertions = 0;

function check(condition: unknown, message: string): void {
  assert.ok(condition, message);
  assertions += 1;
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function forbids(source: string, names: readonly string[], label: string): void {
  for (const name of names) {
    check(!new RegExp(`\\b${name}\\s*\\(`).test(source), `${label} does not call ${name} directly`);
    check(!new RegExp(`import\\s*{[\\s\\S]*\\b${name}\\b[\\s\\S]*}\\s*from\\s*['"][^'"]*plannerTasks['"]`).test(source), `${label} does not import ${name} from plannerTasks`);
  }
}

const taskForm = read('front/mi-front-limpio/screens/planner/TaskForm.tsx');
const taskList = read('front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx');
const trash = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');

check(taskForm.includes('enqueuePlannerTaskCreate'), 'TaskForm creates through reliability enqueue');
check(taskForm.includes('enqueuePlannerTaskUpdate'), 'TaskForm updates through reliability enqueue');
check(taskList.includes('enqueuePlannerTaskComplete'), 'Task list complete action uses reliability enqueue');
check(taskList.includes('enqueuePlannerTaskVerify'), 'Task list verify action uses reliability enqueue');
check(taskList.includes('enqueuePlannerTaskCancel'), 'Task list cancel action uses reliability enqueue');
check(taskList.includes('enqueuePlannerTaskReactivate'), 'Task list reactivate action uses reliability enqueue');
check(taskList.includes('enqueuePlannerTaskTrash'), 'Task list trash action uses reliability enqueue');
check(trash.includes('enqueuePlannerTaskRestore'), 'Global trash restores tasks through reliability enqueue');

forbids(taskForm, ['createPlannerTask', 'updatePlannerTask'], 'TaskForm');
forbids(taskList, ['completePlannerTask', 'verifyPlannerTask', 'cancelPlannerTask', 'reactivatePlannerTask', 'trashPlannerTask', 'restorePlannerTask'], 'PlannerTasksScreen');
forbids(trash, ['restorePlannerTask'], 'PlannerTrashScreen');

console.log(`PLANNER FRONTEND TASKS: ${assertions} assertions passed.`);
