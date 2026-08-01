import { OPERATION_KINDS } from '../front/mi-front-limpio/services/api';
import { updatePlannerEvent } from '../front/mi-front-limpio/services/plannerEvents';
import {
  buildPlannerReliabilityConflictReviewRoute,
  createPlannerDurableOperationStore,
  createPlannerOperationRecord,
  createPlannerPendingOperation,
  disposePlannerReliabilityRuntimes,
  openPlannerReliabilityRuntime,
  openPlannerReliabilityRuntimeForSession,
  PLANNER_RELIABILITY_PRODUCTIVE_DOMAINS,
  resolvePlannerReliabilityScope,
  transitionPlannerOperation,
  type PlannerAuthoritativeMutationResult,
  type PlannerDurableOperationStore,
  type PlannerOperationPartition,
  type PlannerOperationRecord,
  type PlannerReliabilityDomainAdapter,
  type PlannerReliabilityEvent,
} from '../front/mi-front-limpio/services/planner/reliability';
import type { PlannerMutationIntent } from '../front/mi-front-limpio/services/planner/plannerMutationIntent';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  } finally {
    disposePlannerReliabilityRuntimes();
  }
}

class FakeStorage {
  values = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

class ManualClock {
  nowValue = new Date('2026-08-01T12:00:00.000Z');
  callbacks = new Map<number, () => unknown>();
  cleared: number[] = [];
  nextHandle = 1;
  now(): Date {
    return this.nowValue;
  }
  setTimeout(callback: () => unknown, _delayMs: number): number {
    const handle = this.nextHandle;
    this.nextHandle += 1;
    this.callbacks.set(handle, callback);
    return handle;
  }
  clearTimeout(handle: unknown): void {
    this.cleared.push(Number(handle));
    this.callbacks.delete(Number(handle));
  }
  async flushOne(): Promise<void> {
    const [handle, callback] = [...this.callbacks.entries()][0] ?? [];
    if (!handle || !callback) return;
    this.callbacks.delete(handle);
    await Promise.resolve(callback());
    await Promise.resolve();
  }
}

function partition(user = 'user-a', household: string | null = 'hh-a'): PlannerOperationPartition {
  return { authenticatedUserId: user, activeHouseholdId: household };
}

function intent(seed: string, version?: number): PlannerMutationIntent {
  return {
    mutationId: `mut-${seed}`,
    idempotencyKey: `idem-${seed}`,
    ifMatch: version,
    operationKind: version === undefined ? OPERATION_KINDS.CREATE_IDEMPOTENT : OPERATION_KINDS.VERSIONED_MUTATION,
  };
}

function operation(seed: string, overrides: Partial<PlannerOperationRecord> = {}): PlannerOperationRecord {
  const descriptor = createPlannerPendingOperation({
    intent: intent(seed, overrides.descriptor?.expectedVersion),
    domain: overrides.descriptor?.domain ?? 'task',
    operationType: overrides.descriptor?.operationType ?? 'update',
    partition: partition(),
    scope: overrides.descriptor?.scope ?? { kind: 'household', householdId: 'hh-a' },
    entity: overrides.descriptor?.entity ?? { type: 'task', id: seed },
    payload: overrides.descriptor?.payload ?? { title: seed },
    dependencies: overrides.descriptor?.dependencies ?? [],
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
  });
  return {
    ...createPlannerOperationRecord(descriptor),
    ...overrides,
    descriptor: { ...descriptor, ...overrides.descriptor },
    attempt: { ...createPlannerOperationRecord(descriptor).attempt, ...overrides.attempt },
  };
}

function memoryStore(): { storage: FakeStorage; store: PlannerDurableOperationStore } {
  const storage = new FakeStorage();
  return {
    storage,
    store: createPlannerDurableOperationStore(storage, () => new Date('2026-08-01T12:00:00.000Z')),
  };
}

function fakeAdapter(calls: PlannerOperationRecord[], result: PlannerAuthoritativeMutationResult = { outcome: 'updated', data: { id: 'task-1', version: 2 }, version: 2 }): PlannerReliabilityDomainAdapter {
  return {
    domain: 'task',
    async execute(op) {
      calls.push(op);
      return result;
    },
    async reconcile() {
      return { applied: true, invalidationRequested: true };
    },
  };
}

function observer(events: PlannerReliabilityEvent[]) {
  return { emit: (event: PlannerReliabilityEvent) => { events.push(event); } };
}

void (async () => {
  await runTest('scope resolver refuses unresolved auth or household', () => {
    assert(resolvePlannerReliabilityScope({ authResolved: false, householdResolved: true, accessToken: 'token', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a' }) === null, 'auth unresolved blocks runtime');
    assert(resolvePlannerReliabilityScope({ authResolved: true, householdResolved: false, accessToken: 'token', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a' }) === null, 'household unresolved blocks runtime');
    assert(openPlannerReliabilityRuntimeForSession({ authResolved: true, householdResolved: true, accessToken: null, authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a' }) === null, 'missing token blocks runtime');
    assert(resolvePlannerReliabilityScope({ authResolved: true, householdResolved: true, accessToken: 'token', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a' })?.activeHouseholdId === 'hh-a', 'resolved scope opens only when both authorities are ready');
  });

  await runTest('runtime is a singleton per active user-household scope and disposes on scope switch', async () => {
    const { store } = memoryStore();
    const clock = new ManualClock();
    const first = openPlannerReliabilityRuntime({ accessToken: 'token-a', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a', store, adapters: [], clock });
    const same = openPlannerReliabilityRuntime({ accessToken: 'token-a', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a', store, adapters: [], clock });
    assert(first === same, 'same scope reuses one runtime instance');
    const switched = openPlannerReliabilityRuntime({ accessToken: 'token-a', authenticatedUserId: 'user-a', activeHouseholdId: 'hh-b', store, adapters: [], clock });
    assert(switched !== first, 'household switch creates a new runtime');
    try {
      await first.listOperations();
      assert(false, 'old runtime rejects use after dispose');
    } catch {
      assert(true, 'old runtime disposed on scope switch');
    }
  });

  await runTest('offline enqueue persists before dispatch and reconnect drains with same identity', async () => {
    const { store } = memoryStore();
    const clock = new ManualClock();
    const calls: PlannerOperationRecord[] = [];
    let online = false;
    const listeners: Array<(online: boolean) => void> = [];
    const runtime = openPlannerReliabilityRuntime({
      accessToken: 'token',
      authenticatedUserId: 'user-a',
      activeHouseholdId: 'hh-a',
      store,
      adapters: [fakeAdapter(calls, { outcome: 'replay', data: { id: 'task-1', version: 2 }, version: 2 })],
      connectivity: { isOnline: () => online, subscribe: (next) => { listeners.push(next); return () => { listeners.length = 0; }; } },
      clock,
    });
    const enqueued = await runtime.enqueue({
      intent: intent('task-update', 1),
      domain: 'task',
      operationType: 'update',
      entity: { type: 'task', id: 'task-1' },
      payload: { payload: { title: 'Changed' } },
    });
    assert((await store.list(partition())).some((op) => op.descriptor.localOperationId === enqueued.descriptor.localOperationId), 'operation durable before transport');
    assert(calls.length === 0, 'offline enqueue does not dispatch');
    online = true;
    listeners[0]?.(true);
    await clock.flushOne();
    assert(calls.length === 1, 'reconnect drains exactly once');
    assert(calls[0].descriptor.mutationId === enqueued.descriptor.mutationId, 'retry/replay keeps mutation identity');
    assert(calls[0].descriptor.idempotencyKey === enqueued.descriptor.idempotencyKey, 'retry/replay keeps idempotency identity');
    assert((await store.list(partition()))[0].state === 'confirmed', 'replay authoritative outcome confirms');
  });

  await runTest('restored in-flight operation becomes uncertain without a new identity', async () => {
    const { store } = memoryStore();
    const pending = operation('restart', { descriptor: { ...operation('restart').descriptor, expectedVersion: 1 } });
    const inFlight = transitionPlannerOperation(pending, 'in_flight', new Date('2026-08-01T12:00:01.000Z'));
    await store.put(partition(), inFlight);
    const runtime = openPlannerReliabilityRuntime({
      accessToken: 'token',
      authenticatedUserId: 'user-a',
      activeHouseholdId: 'hh-a',
      store,
      adapters: [],
      connectivity: { isOnline: () => false },
      clock: new ManualClock(),
    });
    const restored = await runtime.restore();
    assert(restored[0].state === 'uncertain', 'in-flight restores as uncertain');
    assert(restored[0].descriptor.mutationId === inFlight.descriptor.mutationId, 'restart preserves mutation id');
    assert(restored[0].descriptor.requestHash === inFlight.descriptor.requestHash, 'restart preserves request hash');
  });

  await runTest('realtime signal requests reconciliation and never confirms an operation', async () => {
    const { store } = memoryStore();
    const uncertain = { ...operation('rt'), state: 'uncertain' as const, attemptCount: 1, attempt: { requestMayHaveReachedServer: true } };
    await store.put(partition(), uncertain);
    const events: PlannerReliabilityEvent[] = [];
    const runtime = openPlannerReliabilityRuntime({
      accessToken: 'token',
      authenticatedUserId: 'user-a',
      activeHouseholdId: 'hh-a',
      store,
      adapters: [fakeAdapter([])],
      observer: observer(events),
      connectivity: { isOnline: () => false },
      clock: new ManualClock(),
    });
    const decision = await runtime.receiveRealtimeSignal({
      signalId: 'sig-1',
      domain: 'task',
      entityType: 'task',
      entityId: 'rt',
      scope: { kind: 'household', householdId: 'hh-a' },
      version: 2,
    });
    assert(decision.action === 'reconciliation_requested', 'signal requests reconciliation');
    assert((await store.get(partition(), uncertain.descriptor.localOperationId))?.state === 'uncertain', 'signal does not confirm directly');
    assert(events.some((event) => event.name === 'realtime_signal_received'), 'realtime event observed');
    assert(events.some((event) => event.name === 'reconciliation_requested'), 'reconciliation event observed');
  });

  await runTest('Conflict Review route is typed and safe', () => {
    const route = buildPlannerReliabilityConflictReviewRoute({ type: 'request_conflict_route', localOperationId: 'op-safe', domain: 'task' });
    assert(route?.routeName === 'PlannerConflictReview', 'routes to Conflict Review');
    assertEqual(route?.params, { localOperationId: 'op-safe', domain: 'task' }, 'route params are minimal');
  });

  await runTest('productive adapter catalog covers required domains', () => {
    assertEqual(PLANNER_RELIABILITY_PRODUCTIVE_DOMAINS, ['task', 'event', 'plan', 'preset', 'draft'], 'productive domains');
  });

  await runTest('Event service uses canonical mutation headers for durable dispatch', async () => {
    const calls: Array<{ path: string; headers: Record<string, string>; body: string | undefined }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        path: String(input),
        headers: init?.headers as Record<string, string>,
        body: typeof init?.body === 'string' ? init.body : undefined,
      });
      return new Response(JSON.stringify({ event: { id: 'event-1', version: 3 } }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-request-id': 'req-1' },
      });
    }) as typeof fetch;
    try {
      await updatePlannerEvent('token', 'event-1', { title: 'Cena', expected_version: 2 }, {
        mutationId: 'mut-event',
        idempotencyKey: 'idem-event',
        contextScope: 'hh-a',
      });
      assert(calls.length === 1, 'one canonical transport call');
      assert(calls[0].headers.Authorization === 'Bearer token', 'actor comes from access token');
      assert(calls[0].headers['X-Mutation-Id'] === 'mut-event', 'mutation id header preserved');
      assert(calls[0].headers['Idempotency-Key'] === 'idem-event', 'idempotency header preserved');
      assert(calls[0].headers['If-Match'] === '2', 'expectedVersion maps to If-Match');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  console.log(`\nM11.7C Reliability Integration tests: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
