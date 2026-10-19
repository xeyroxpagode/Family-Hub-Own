import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveChecklistDropIndex } from '../front/mi-front-limpio/services/planner/plannerChecklistDrag';
import { PlannerTaskChecklistMutationQueue, type PlannerChecklistItem } from '../front/mi-front-limpio/services/planner/plannerTaskChecklistMutationQueue';

type Task = { id: string; version: number; checklist: PlannerChecklistItem[] };
const item = (text: string, checked = false) => ({ text, checked });
const clone = (task: Task): Task => ({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) });
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>) => { try { await fn(); console.log(`  ok  ${name}`); passed += 1; } catch (error: any) { console.error(`  FAIL ${name}: ${error.message}`); process.exitCode = 1; } };

const makeQueue = (overrides: Partial<ConstructorParameters<typeof PlannerTaskChecklistMutationQueue<Task>>[0]> = {}) => {
  let server: Task = { id: 'task-1', version: 1, checklist: [item('A')] };
  const calls: Array<{ checklist: PlannerChecklistItem[]; version: number }> = [];
  const states: any[] = [];
  const errors: unknown[] = [];
  const options = {
    taskId: server.id,
    initialTask: clone(server),
    mutate: async (checklist: PlannerChecklistItem[], version: number) => {
      calls.push({ checklist, version });
      server = { ...server, version: version + 1, checklist: checklist.map((entry) => ({ ...entry })) };
      return clone(server);
    },
    refresh: async () => clone(server),
    onState: (state: any) => states.push(state),
    onRecoverableError: (error: unknown) => errors.push(error),
    ...overrides,
  };
  return { queue: new PlannerTaskChecklistMutationQueue<Task>(options), calls, states, errors, getServer: () => server, setServer: (next: Task) => { server = clone(next); } };
};

async function main() {
await test('1. toggle único usa una mutation y adopta nueva versión', async () => {
  const h = makeQueue(); h.queue.setDesired([item('A', true)]); const result = await h.queue.flush();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].version, 1); assert.equal(result.version, 2);
});

await test('2. tres toggles rápidos mantienen una sola request en vuelo', async () => {
  const first = deferred<Task>(); let active = 0; let peak = 0; let invocation = 0;
  const h = makeQueue({ mutate: async (checklist, version) => { h.calls.push({ checklist, version }); active += 1; peak = Math.max(peak, active); invocation += 1; if (invocation === 1) { const result = await first.promise; active -= 1; return result; } active -= 1; return { id: 'task-1', version: version + 1, checklist }; } });
  h.queue.setDesired([item('A', true)]); h.queue.setDesired([item('A', false)]); h.queue.setDesired([item('A', true)]);
  first.resolve({ id: 'task-1', version: 2, checklist: [item('A', true)] }); await h.queue.flush();
  assert.equal(peak, 1); assert.deepEqual(h.calls.map((call) => call.version), [1]);
});

await test('3. intención B durante request A se persiste con la versión nueva', async () => {
  const first = deferred<Task>(); let count = 0;
  const h = makeQueue({ mutate: async (checklist, version) => { h.calls.push({ checklist, version }); count += 1; if (count === 1) return first.promise; return { id: 'task-1', version: version + 1, checklist }; } });
  h.queue.setDesired([item('A', true)]); h.queue.setDesired([item('B', true)]); first.resolve({ id: 'task-1', version: 2, checklist: [item('A', true)] });
  const result = await h.queue.flush(); assert.deepEqual(h.calls.map((call) => call.version), [1, 2]); assert.deepEqual(result.checklist, [item('B', true)]);
});

await test('4. check/uncheck rápido termina unchecked', async () => {
  const first = deferred<Task>(); let count = 0;
  const h = makeQueue({ mutate: async (checklist, version) => { h.calls.push({ checklist, version }); if (count++ === 0) return first.promise; return { id: 'task-1', version: version + 1, checklist }; } });
  h.queue.setDesired([item('A', true)]); h.queue.setDesired([item('A', false)]); first.resolve({ id: 'task-1', version: 2, checklist: [item('A', true)] });
  assert.deepEqual((await h.queue.flush()).checklist, [item('A', false)]);
});

await test('5. varios pasos rápidos no pierden cambios', async () => {
  const first = deferred<Task>(); let count = 0;
  const h = makeQueue({ initialTask: { id: 'task-1', version: 1, checklist: [item('A'), item('B'), item('C')] }, mutate: async (checklist, version) => { h.calls.push({ checklist, version }); if (count++ === 0) return first.promise; return { id: 'task-1', version: version + 1, checklist }; } });
  h.queue.setDesired([item('A', true), item('B'), item('C')]); h.queue.setDesired([item('A', true), item('B', true), item('C', true)]);
  first.resolve({ id: 'task-1', version: 2, checklist: [item('A', true), item('B'), item('C')] });
  assert.deepEqual((await h.queue.flush()).checklist, [item('A', true), item('B', true), item('C', true)]);
});

await test('6. un 412 refresca, rebasea y reintenta una vez', async () => {
  let attempts = 0; const h = makeQueue({ mutate: async (checklist, version) => { h.calls.push({ checklist, version }); if (attempts++ === 0) throw { status: 412, code: 'version_conflict_v2' }; return { id: 'task-1', version: version + 1, checklist }; }, refresh: async () => ({ id: 'task-1', version: 4, checklist: [item('A')] }) });
  h.queue.setDesired([item('A', true)]); const result = await h.queue.flush(); assert.deepEqual(h.calls.map((call) => call.version), [1, 4]); assert.equal(result.version, 5);
});

await test('7. segundo conflicto detiene retries y expone error recuperable', async () => {
  const h = makeQueue({ mutate: async (checklist, version) => { h.calls.push({ checklist, version }); throw { status: 412, code: 'version_conflict_v2' }; }, refresh: async () => ({ id: 'task-1', version: 8, checklist: [item('A')] }) });
  h.queue.setDesired([item('A', true)]); await assert.rejects(() => h.queue.flush()); assert.equal(h.calls.length, 2); assert.equal(h.errors.length, 1);
});

const editor = readFileSync('front/mi-front-limpio/components/planner/PlannerChecklistEditor.tsx', 'utf8');
const detail = readFileSync('front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx', 'utf8');
await test('8. sólo el grip instala los panHandlers', () => { assert.match(editor, /<View \{\.\.\.responder\.panHandlers\} style=\{styles\.grip\}/); });
await test('9. drag bloquea el scroll vertical del contenedor', () => { assert.match(detail, /scrollEnabled=\{!checklistDragging\}/); assert.match(detail, /onDragStateChange=\{setChecklistDragging\}/); });
await test('10. acciones de fila quedan bloqueadas durante drag', () => { assert.match(editor, /disabled=\{disabled \|\| interactionsLocked\}/); });
await test('11. geometría real soporta una fila multilínea', () => { assert.equal(resolveChecklistDropIndex(0, 130, [{ y: 0, height: 96 }, { y: 96, height: 48 }, { y: 144, height: 72 }]), 2); });
await test('12. geometría permite primero↔último', () => { const layouts = [{ y: 0, height: 48 }, { y: 48, height: 80 }, { y: 128, height: 48 }]; assert.equal(resolveChecklistDropIndex(0, 150, layouts), 2); assert.equal(resolveChecklistDropIndex(2, -150, layouts), 0); });
await test('13. release restaura scroll', () => { assert.match(editor, /onPanResponderRelease[\s\S]*onDragStateChange\(item\.key, false\)/); });
await test('14. cancel y unmount restauran scroll', () => { assert.match(editor, /onPanResponderTerminate[\s\S]*onDragStateChange\(item\.key, false\)/); assert.match(editor, /useEffect\(\(\) => \(\) => onDragStateChange\?\.\(false\)/); });
await test('15. reorder se persiste una sola vez y rehidrata igual', async () => { const h = makeQueue(); const reordered = [item('Último'), item('Primero')]; h.queue.setDesired(reordered); const saved = await h.queue.flush(); assert.equal(h.calls.length, 1); const reopened = makeQueue({ initialTask: saved }); assert.deepEqual((await reopened.queue.flush()).checklist, reordered); });
await test('16. completar espera flush y evalúa el checklist final', async () => { const gate = deferred<Task>(); const h = makeQueue({ mutate: async (checklist, version) => gate.promise }); h.queue.setDesired([item('A', true)]); let evaluated = false; const completion = h.queue.flush().then((confirmed) => { evaluated = confirmed.checklist.every((entry) => entry.checked); }); await tick(); assert.equal(evaluated, false); gate.resolve({ id: 'task-1', version: 2, checklist: [item('A', true)] }); await completion; assert.equal(evaluated, true); assert.match(detail, /completionTask = await \(checklistQueueRef\.current\?\.flush\(\)/); });

if (process.exitCode) throw new Error('Patch 1.1 focused tests failed');
console.log(`\nPatch 1.1 focused tests passed (${passed}/16).`);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

