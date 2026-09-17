import { ApiError, OPERATION_KINDS } from '../front/mi-front-limpio/services/api';
import type { PlannerMutationIntent } from '../front/mi-front-limpio/services/planner/plannerMutationIntent';
import {
  PlannerOperationQueue,
  PlannerReliabilityRealtimeBridge,
  buildPlannerOperationPartitionKey,
  canTransitionPlannerOperation,
  computePlannerRequestHash,
  computePlannerRetryDelayMs,
  createPlannerDurableOperationStore,
  createPlannerOperationRecord,
  createPlannerPendingOperation,
  defaultPlannerDraftAutosaveAdapterPolicy,
  detectPlannerDependencyCycle,
  evaluatePlannerOperationDependencies,
  sanitizePlannerReliabilityMetadata,
  sortPlannerOperationsByDependency,
  transitionPlannerOperation,
  validatePlannerOperationRecord,
  __testParseStoredOperations,
  type PlannerAuthoritativeMutationResult,
  type PlannerDurableOperationStore,
  type PlannerOperationPartition,
  type PlannerOperationRecord,
  type PlannerReliabilityDomainAdapter,
  type PlannerReliabilityEvent,
} from '../front/mi-front-limpio/services/planner/reliability';

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

function assertThrows(fn: () => unknown, message: string): void {
  try {
    fn();
    assert(false, message);
  } catch {
    assert(true, message);
  }
}

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  }
}

class FakeStorage {
  values = new Map<string, string>();
  failNextSet = false;
  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    if (this.failNextSet) {
      this.failNextSet = false;
      throw new Error('write_interrupted');
    }
    this.values.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
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

function record(seed: string, overrides: Partial<PlannerOperationRecord> = {}): PlannerOperationRecord {
  const p = partition();
  const descriptor = createPlannerPendingOperation({
    intent: intent(seed, overrides.descriptor?.expectedVersion),
    domain: overrides.descriptor?.domain ?? 'fake',
    operationType: overrides.descriptor?.operationType ?? 'update',
    partition: p,
    scope: overrides.descriptor?.scope ?? { kind: 'household', householdId: 'hh-a' },
    entity: overrides.descriptor?.entity ?? { type: 'task', id: seed },
    payload: overrides.descriptor?.payload ?? { value: seed },
    dependencies: overrides.descriptor?.dependencies ?? [],
    createdAt: new Date('2026-07-31T00:00:00.000Z'),
  });
  return {
    ...createPlannerOperationRecord(descriptor),
    ...overrides,
    descriptor: { ...descriptor, ...overrides.descriptor },
    attempt: { ...createPlannerOperationRecord(descriptor).attempt, ...overrides.attempt },
  };
}

function createMemoryStore(events?: PlannerReliabilityEvent[], throwingObserver = false): { storage: FakeStorage; store: PlannerDurableOperationStore } {
  const storage = new FakeStorage();
  const eventObserver = events
    ? {
      emit: (event: PlannerReliabilityEvent) => {
        events.push(event);
        if (throwingObserver) throw new Error('observer_down');
      },
    }
    : undefined;
  return {
    storage,
    store: createPlannerDurableOperationStore(
      storage,
      () => new Date('2026-07-31T00:00:00.000Z'),
      eventObserver,
    ),
  };
}

function adapter(script: Array<PlannerAuthoritativeMutationResult | Error>, reconciled: string[] = []): PlannerReliabilityDomainAdapter {
  let calls = 0;
  return {
    domain: 'fake',
    async execute(operation) {
      const result = script[Math.min(calls, script.length - 1)];
      calls += 1;
      if (result instanceof Error) throw result;
      return result;
    },
    async reconcile(operation) {
      reconciled.push(operation.descriptor.localOperationId);
      return { applied: true };
    },
    canSupersedePendingOperation(previous, next) {
      return previous.descriptor.entity?.type === 'draft'
        && previous.descriptor.entity?.id === next.descriptor.entity?.id;
    },
  };
}

function observer(events: PlannerReliabilityEvent[]) {
  return { emit: (event: PlannerReliabilityEvent) => { events.push(event); } };
}

function blockedReason(decision: ReturnType<typeof evaluatePlannerOperationDependencies>): string | null {
  return decision.executable ? null : decision.reason;
}

function pendingWithIfMatch(value: unknown, operationKind: PlannerMutationIntent['operationKind'] = OPERATION_KINDS.VERSIONED_MUTATION) {
  return () => createPlannerPendingOperation({
    intent: {
      mutationId: 'mut-expected-version',
      idempotencyKey: 'idem-expected-version',
      ifMatch: value as number,
      operationKind,
    },
    domain: 'fake',
    operationType: 'update',
    partition: partition(),
    scope: { kind: 'household', householdId: 'hh-a' },
    entity: { type: 'task', id: 'task-1' },
    payload: { value: 'strict' },
    createdAt: new Date('2026-07-31T00:00:00.000Z'),
  });
}

function privateMetadataKeys(event: PlannerReliabilityEvent): string[] {
  return Object.keys(event.metadata).filter((key) => /payload|body|draft|title|description|token|secret|mutation|idempotency|user|household|uuid|raw|stack|header/i.test(key));
}

void (async () => {
  await runTest('descriptor identity and deterministic hash are stable across retry/restart', () => {
    const a = record('same');
    const b = record('same');
    assertEqual(a.descriptor.mutationId, b.descriptor.mutationId, 'mutation id preserved');
    assertEqual(a.descriptor.idempotencyKey, b.descriptor.idempotencyKey, 'idempotency key preserved');
    assertEqual(a.descriptor.requestHash, b.descriptor.requestHash, 'request hash deterministic');
    assert(computePlannerRequestHash({ b: 1, a: 2 }) === computePlannerRequestHash({ a: 2, b: 1 }), 'hash ignores object key order');
    assert(a.descriptor.ownerPartition.authenticatedUserId === 'user-a', 'owner partition from authenticated context');
  });

  await runTest('expectedVersion validation is strict at runtime without coercion', () => {
    assert(pendingWithIfMatch(2)().expectedVersion === 2, 'integer expectedVersion accepted');
    assert(createPlannerPendingOperation({
      intent: intent('create-without-version'),
      domain: 'fake',
      operationType: 'create',
      partition: partition(),
      scope: { kind: 'household', householdId: 'hh-a' },
      payload: { title: 'new' },
      createdAt: new Date('2026-07-31T00:00:00.000Z'),
    }).expectedVersion === undefined, 'absent optional expectedVersion accepted');
    assertThrows(pendingWithIfMatch('2'), 'numeric string expectedVersion rejected');
    assertThrows(pendingWithIfMatch('two'), 'plain string expectedVersion rejected');
    assertThrows(pendingWithIfMatch(1.5), 'float expectedVersion rejected');
    assertThrows(pendingWithIfMatch(Number.NaN), 'NaN expectedVersion rejected');
    assertThrows(pendingWithIfMatch(Number.POSITIVE_INFINITY), 'Infinity expectedVersion rejected');
    assertThrows(pendingWithIfMatch(Number.NEGATIVE_INFINITY), '-Infinity expectedVersion rejected');
    assertThrows(pendingWithIfMatch(-1), 'negative expectedVersion rejected');
    assertThrows(pendingWithIfMatch(true), 'boolean expectedVersion rejected');
    assertThrows(pendingWithIfMatch(null), 'null expectedVersion rejected');
    assertThrows(pendingWithIfMatch([2]), 'array expectedVersion rejected');
    assertThrows(pendingWithIfMatch({ value: 2 }), 'object expectedVersion rejected');
    assertThrows(pendingWithIfMatch(new Date('2026-07-31T00:00:00.000Z')), 'Date expectedVersion rejected');
    assertThrows(pendingWithIfMatch('2', OPERATION_KINDS.CREATE_IDEMPOTENT), 'present optional expectedVersion follows strict rules');
    assertThrows(pendingWithIfMatch(undefined), 'missing required expectedVersion rejected');
  });

  await runTest('request hash uses one canonical JSON policy and rejects unsupported material', () => {
    assert(computePlannerRequestHash({ b: 1, a: 2 }) === computePlannerRequestHash({ a: 2, b: 1 }), 'top-level reordered keys hash equally');
    assert(computePlannerRequestHash({ a: { z: 1, y: 2 } }) === computePlannerRequestHash({ a: { y: 2, z: 1 } }), 'nested reordered keys hash equally');
    assert(computePlannerRequestHash({ items: [1, 2] }) !== computePlannerRequestHash({ items: [2, 1] }), 'array order changes hash');
    assert(computePlannerRequestHash({ value: null }) !== computePlannerRequestHash({ value: false }), 'null and false differ');
    assert(computePlannerRequestHash({ value: 0 }) !== computePlannerRequestHash({ value: '' }), 'zero and empty string differ');
    assert(computePlannerRequestHash({ value: 1 }) !== computePlannerRequestHash({ value: 2 }), 'material payload difference changes hash');
    assertThrows(() => computePlannerRequestHash({ value: new Date('2026-07-31T00:00:00.000Z') }), 'Date hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: undefined }), 'undefined object value rejected');
    assertThrows(() => computePlannerRequestHash([undefined]), 'undefined array value rejected');
    const sparse: unknown[] = [];
    sparse[1] = 'x';
    assertThrows(() => computePlannerRequestHash(sparse), 'sparse array rejected');
    assertThrows(() => computePlannerRequestHash({ value: Number.NaN }), 'NaN hash number rejected');
    assertThrows(() => computePlannerRequestHash({ value: Number.POSITIVE_INFINITY }), 'Infinity hash number rejected');
    assertThrows(() => computePlannerRequestHash({ value: BigInt(1) }), 'bigint hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: () => null }), 'function hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: Symbol('s') }), 'symbol hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: new Map([['a', 1]]) }), 'Map hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: new Set([1]) }), 'Set hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: /x/ }), 'RegExp hash material rejected');
    assertThrows(() => computePlannerRequestHash({ value: new Uint8Array([1]) }), 'typed array hash material rejected');
    class CustomHashMaterial { value = 1; }
    assertThrows(() => computePlannerRequestHash({ value: new CustomHashMaterial() }), 'custom instance hash material rejected');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assertThrows(() => computePlannerRequestHash(cyclic), 'cyclic hash material rejected');
    const retry = record('retry-hash');
    const retrying = transitionPlannerOperation(retry, 'in_flight', new Date('2026-07-31T00:00:00.000Z'));
    assert(retrying.descriptor.requestHash === retry.descriptor.requestHash, 'retry keeps assigned requestHash');
  });

  await runTest('state machine allows required transitions and rejects arbitrary transitions', () => {
    assert(canTransitionPlannerOperation('pending', 'in_flight'), 'pending to in_flight');
    assert(canTransitionPlannerOperation('in_flight', 'confirmed'), 'in_flight to confirmed');
    assert(canTransitionPlannerOperation('in_flight', 'retrying'), 'in_flight to retrying');
    assert(canTransitionPlannerOperation('in_flight', 'uncertain'), 'in_flight to uncertain');
    assert(canTransitionPlannerOperation('in_flight', 'conflicted'), 'in_flight to conflicted');
    assert(canTransitionPlannerOperation('retrying', 'in_flight'), 'retrying to in_flight');
    assert(canTransitionPlannerOperation('uncertain', 'confirmed'), 'uncertain to confirmed');
    assert(canTransitionPlannerOperation('uncertain', 'conflicted'), 'uncertain to conflicted');
    assert(!canTransitionPlannerOperation('pending', 'confirmed'), 'pending cannot confirm directly');
    try {
      transitionPlannerOperation(record('bad'), 'confirmed', new Date());
      assert(false, 'invalid transition throws');
    } catch {
      assert(true, 'invalid transition throws');
    }
  });

  await runTest('durable storage persists, partitions, hydrates in_flight as uncertain, and quarantines corrupt records', async () => {
    const { storage, store } = createMemoryStore();
    await store.put(partition('user-a', 'hh-a'), record('a'));
    await store.put(partition('user-b', 'hh-a'), record('b', { descriptor: { ...record('b').descriptor, ownerPartition: { authenticatedUserId: 'user-b' } } }));
    assert((await store.list(partition('user-a', 'hh-a'))).length === 1, 'user partition isolated');
    assert((await store.list(partition('user-b', 'hh-a'))).length === 1, 'other user partition isolated');
    const inFlight = transitionPlannerOperation(record('flight'), 'in_flight', new Date('2026-07-31T00:00:00.000Z'));
    await store.put(partition(), inFlight);
    const hydrated = await store.hydrate(partition());
    assert(hydrated.some((op) => op.descriptor.localOperationId === inFlight.descriptor.localOperationId && op.state === 'uncertain'), 'in_flight recovers to uncertain');
    const key = buildPlannerOperationPartitionKey(partition('user-a', 'hh-b'));
    storage.values.set(key, JSON.stringify({ schemaVersion: 1, operations: [record('valid'), { bad: true }, { descriptor: { schemaVersion: 999 } }] }));
    const parsed = __testParseStoredOperations(storage.values.get(key) ?? null);
    assert(parsed.records.length === 1 && parsed.quarantined === 2, 'corrupt and incompatible records quarantined');
    assert(validatePlannerOperationRecord(record('valid')) !== null, 'valid record validates');
  });

  await runTest('durable schemaVersion restore accepts only explicitly supported wrappers', () => {
    const valid = JSON.stringify({ schemaVersion: 1, operations: [record('schema-valid')] });
    assert(__testParseStoredOperations(valid).records.length === 1, 'current schemaVersion accepted');
    assert(__testParseStoredOperations(JSON.stringify({ operations: [] })).quarantined === 1, 'missing schemaVersion quarantined');
    assert(__testParseStoredOperations(JSON.stringify({ schemaVersion: '1', operations: [] })).quarantined === 1, 'string schemaVersion quarantined');
    assert(__testParseStoredOperations(JSON.stringify({ schemaVersion: null, operations: [] })).quarantined === 1, 'null schemaVersion quarantined');
    assert(__testParseStoredOperations(JSON.stringify({ schemaVersion: 99, operations: [] })).quarantined === 1, 'unknown future schemaVersion quarantined');
    assert(__testParseStoredOperations(JSON.stringify({ schemaVersion: 0, operations: [] })).quarantined === 1, 'old schemaVersion without migrator quarantined');
    assert(__testParseStoredOperations(JSON.stringify(['legacy-array'])).quarantined === 1, 'wrapper array quarantined');
    assert(__testParseStoredOperations(JSON.stringify({ schemaVersion: 1, operations: {} })).quarantined === 1, 'operations non-array quarantined');
    const mixed = __testParseStoredOperations(JSON.stringify({ schemaVersion: 1, operations: [record('neighbor'), { bad: true }] }));
    assert(mixed.records.length === 1 && mixed.quarantined === 1, 'valid neighboring record preserved with corrupt record');
  });

  await runTest('quarantine observability emits sanitized storage_record_quarantined events', async () => {
    const events: PlannerReliabilityEvent[] = [];
    const { storage, store } = createMemoryStore(events);
    const key = buildPlannerOperationPartitionKey(partition());
    storage.values.set(key, '{bad json');
    assert((await store.hydrate(partition())).length === 0, 'invalid JSON does not restore operations');
    assert(events.some((event) => event.name === 'storage_record_quarantined' && event.metadata.reason === 'invalid_json' && event.metadata.source === 'parse' && event.metadata.count === 1), 'invalid JSON quarantine event emitted');
    storage.values.set(key, JSON.stringify({ schemaVersion: 2, operations: [record('future')] }));
    await store.hydrate(partition());
    assert(events.some((event) => event.name === 'storage_record_quarantined' && event.metadata.reason === 'incompatible_schema' && event.metadata.source === 'schema' && event.metadata.schemaVersion === 2), 'schema quarantine event emitted');
    const valid = record('clean-neighbor');
    storage.values.set(key, JSON.stringify({
      schemaVersion: 1,
      operations: [
        valid,
        { ...record('private-corrupt'), descriptor: { ...record('private-corrupt').descriptor, expectedVersion: '2', payload: { title: 'secret title', body: 'secret body' } } },
        { ...record('bad-dep'), descriptor: { ...record('bad-dep').descriptor, dependencies: [null] } },
        { ...record('bad-material'), descriptor: { ...record('bad-material').descriptor, requestHash: 'not-a-safe-hash' } },
      ],
    }));
    const restored = await store.hydrate(partition());
    assert(restored.length === 1 && restored[0].descriptor.localOperationId === valid.descriptor.localOperationId, 'corrupt record does not eliminate valid neighbor');
    assert(events.some((event) => event.name === 'storage_record_quarantined' && event.metadata.reason === 'invalid_expected_version'), 'invalid expectedVersion quarantine emitted');
    assert(events.some((event) => event.name === 'storage_record_quarantined' && event.metadata.reason === 'invalid_dependency'), 'invalid dependency quarantine emitted');
    assert(events.some((event) => event.name === 'storage_record_quarantined' && event.metadata.reason === 'invalid_request_material'), 'invalid request material quarantine emitted');
    const quarantineEvents = events.filter((event) => event.name === 'storage_record_quarantined');
    assert(quarantineEvents.every((event) => privateMetadataKeys(event).length === 0), 'quarantine metadata omits private fields');
    const throwingEvents: PlannerReliabilityEvent[] = [];
    const throwing = createMemoryStore(throwingEvents, true);
    const throwingKey = buildPlannerOperationPartitionKey(partition());
    throwing.storage.values.set(throwingKey, JSON.stringify({ schemaVersion: 1, operations: [record('throw-valid'), { bad: true }] }));
    assert((await throwing.store.hydrate(partition())).length === 1, 'throwing observer does not break restore');
    storage.values.set(key, JSON.stringify({ schemaVersion: 'bad', operations: [record('not-executed')] }));
    assert((await store.hydrate(partition())).length === 0, 'corrupt wrapper does not execute operations');
    assert(storage.values.get(key)?.includes('not-executed') === true, 'corrupt wrapper is not indiscriminately overwritten');
  });

  await runTest('write interruption does not fake success', async () => {
    const { storage, store } = createMemoryStore();
    storage.failNextSet = true;
    try {
      await store.put(partition(), record('interrupted'));
      assert(false, 'interrupted write throws to caller');
    } catch {
      assert((await store.list(partition())).length === 0, 'interrupted write leaves no durable record');
    }
  });

  await runTest('confirmed operation two-phase reconciliation and cleanup are durable and idempotent', async () => {
    const { store } = createMemoryStore();
    const reconciled: string[] = [];
    const events: PlannerReliabilityEvent[] = [];
    const queue = new PlannerOperationQueue({
      store,
      partition: partition(),
      accessToken: 'token',
      adapters: [adapter([{ outcome: 'updated', data: { version: 2 }, version: 2, requestId: 'req-1' }], reconciled)],
      observer: observer(events),
      clock: { now: () => new Date('2026-07-31T00:00:10.000Z') },
      retentionMs: 0,
    });
    await queue.enqueue(record('confirm'));
    const drained = await queue.drain();
    assert(drained[0].state === 'confirmed', 'backend success confirms');
    assert(drained[0].authoritativeResult?.outcome === 'updated', 'authoritative result persisted');
    assert(typeof drained[0].reconciliationAppliedAt === 'string', 'reconciliation applied after confirmation');
    assert(reconciled.length === 1, 'adapter reconciled once');
    assert(await queue.cleanupConfirmed() === 1, 'cleanup removes confirmed reconciled record');
    assert(await queue.cleanupConfirmed() === 0, 'cleanup idempotent');
    assert(events.filter((event) => event.name === 'operation_confirmed').length === 1, 'exactly one confirmed event');
  });

  await runTest('lost response then restart replays with same identity and does not duplicate backend effect', async () => {
    const { store } = createMemoryStore();
    const op = record('lost');
    let backendEffects = 0;
    const replayAdapter: PlannerReliabilityDomainAdapter = {
      domain: 'fake',
      async execute(operation) {
        assert(operation.descriptor.mutationId === op.descriptor.mutationId, 'replay mutation id unchanged');
        assert(operation.descriptor.idempotencyKey === op.descriptor.idempotencyKey, 'replay idempotency unchanged');
        if (backendEffects === 0) {
          backendEffects += 1;
          throw Object.assign(new Error('timeout'), { name: 'AbortError' });
        }
        return { outcome: 'replay', data: { ok: true }, version: 2 };
      },
      async reconcile() {
        return { applied: true };
      },
    };
    let queue = new PlannerOperationQueue({ store, partition: partition(), accessToken: 'token', adapters: [replayAdapter] });
    await queue.enqueue(op);
    const first = await queue.drain();
    assert(first[0].state === 'uncertain', 'lost acknowledgement becomes uncertain');
    queue = new PlannerOperationQueue({ store, partition: partition(), accessToken: 'token', adapters: [replayAdapter] });
    await queue.hydrate();
    const second = await queue.drain();
    assert(second[0].state === 'confirmed' && second[0].authoritativeResult?.outcome === 'replay', 'replay confirms after restart');
    assert(backendEffects === 1, 'backend effect not duplicated by replay');
  });

  await runTest('retry policy honors 429 Retry-After, exponential backoff, jitter, max attempts, and retry exhaustion', async () => {
    assert(computePlannerRetryDelayMs({ attemptIndex: 2, config: { baseDelayMs: 1000, maxDelayMs: 10_000, jitterRatio: 0 }, random: { next: () => 0.5 } }) === 4000, 'exponential delay');
    assert(computePlannerRetryDelayMs({ attemptIndex: 1, error: { category: 'rate_limited', stableCode: 'rate', retryAfterMs: 12_000 } }) === 12_000, 'retry-after wins');
    const { store } = createMemoryStore();
    const queue = new PlannerOperationQueue({
      store,
      partition: partition(),
      accessToken: 'token',
      adapters: [adapter([new TypeError('offline')])],
      retryPolicy: { maxAttempts: 1, baseDelayMs: 10, jitterRatio: 0 },
    });
    await queue.enqueue(record('exhaust'));
    const result = await queue.drain();
    assert(result[0].state === 'conflicted' && result[0].conflict?.kind === 'retry_exhausted', 'max attempts conflicts without delete');
  });

  await runTest('deduplication and autosave supersession only affect pending unsent operations', async () => {
    const { store } = createMemoryStore();
    const queue = new PlannerOperationQueue({ store, partition: partition(), accessToken: 'token', adapters: [adapter([{ outcome: 'noop' }])] });
    const first = record('dup');
    const second = record('dup');
    await queue.enqueue(first);
    const duplicate = await queue.enqueue(second);
    assert(duplicate.descriptor.localOperationId === first.descriptor.localOperationId, 'same identity same hash dedupes');
    const draftA = record('draft-a', { descriptor: { ...record('draft-a').descriptor, entity: { type: 'draft', id: 'draft-1' }, payload: { text: 'old' } } });
    const draftB = record('draft-b', { descriptor: { ...record('draft-b').descriptor, entity: { type: 'draft', id: 'draft-1' }, payload: { text: 'new' } } });
    await queue.enqueue(draftA);
    await queue.enqueue(draftB);
    const records = await store.list(partition());
    assert(!records.some((op) => op.descriptor.localOperationId === draftA.descriptor.localOperationId), 'adapter can supersede pending unsent autosave');
    assert(defaultPlannerDraftAutosaveAdapterPolicy.canSupersedePendingOperation() === false, 'default draft policy is no coalescing');
    const inFlight = transitionPlannerOperation(record('draft-flight', { descriptor: { ...record('draft-flight').descriptor, entity: { type: 'draft', id: 'draft-2' } } }), 'in_flight', new Date());
    await store.put(partition(), inFlight);
    await queue.enqueue(record('draft-new', { descriptor: { ...record('draft-new').descriptor, entity: { type: 'draft', id: 'draft-2' } } }));
    assert((await store.list(partition())).some((op) => op.descriptor.localOperationId === inFlight.descriptor.localOperationId), 'in-flight autosave not superseded');
  });

  await runTest('dependency graph orders chains and blocks missing, uncertain, conflicted and cycles', () => {
    const a = record('a');
    const b = record('b', { descriptor: { ...record('b').descriptor, dependencies: [a.descriptor.localOperationId] } });
    const c = record('c', { descriptor: { ...record('c').descriptor, dependencies: [b.descriptor.localOperationId] } });
    assertEqual(sortPlannerOperationsByDependency([c, b, a]).map((op) => op.descriptor.localOperationId), [a, b, c].map((op) => op.descriptor.localOperationId), 'chain sorted');
    assert(blockedReason(evaluatePlannerOperationDependencies(b, [b])) === 'missing', 'missing dependency blocks');
    assert(blockedReason(evaluatePlannerOperationDependencies(b, [b, transitionPlannerOperation(a, 'in_flight', new Date())])) === 'uncertain', 'in-flight dependency blocks as uncertain');
    assert(blockedReason(evaluatePlannerOperationDependencies(b, [b, { ...a, state: 'conflicted' }])) === 'conflicted', 'conflicted dependency blocks');
    const cycleA = record('cycle-a');
    const cycleB = record('cycle-b', { descriptor: { ...record('cycle-b').descriptor, dependencies: [cycleA.descriptor.localOperationId] } });
    const cycleAFinal = { ...cycleA, descriptor: { ...cycleA.descriptor, dependencies: [cycleB.descriptor.localOperationId] } };
    assert(detectPlannerDependencyCycle([cycleAFinal, cycleB]) !== null, 'direct cycle detected');
  });

  await runTest('scope protection blocks wrong user and household while personal same-user remains eligible', async () => {
    const { store } = createMemoryStore();
    const householdA = record('hh-a');
    const queueB = new PlannerOperationQueue({ store, partition: partition('user-a', 'hh-b'), accessToken: 'token', adapters: [adapter([{ outcome: 'updated' }])] });
    try {
      await queueB.enqueue(householdA);
      assert(false, 'household mismatch rejected');
    } catch {
      assert(true, 'household mismatch rejected');
    }
    const personal = record('personal', { descriptor: { ...record('personal').descriptor, scope: { kind: 'personal', ownerId: 'user-a' } } });
    const queuePersonal = new PlannerOperationQueue({ store, partition: partition('user-a', 'hh-b'), accessToken: 'token', adapters: [adapter([{ outcome: 'noop' }])] });
    await queuePersonal.enqueue(personal);
    assert((await store.list(partition('user-a', 'hh-b'))).length === 1, 'personal same-user operation visible in current user partition');
    const queueOtherUser = new PlannerOperationQueue({ store, partition: partition('user-b', 'hh-b'), accessToken: 'token', adapters: [adapter([{ outcome: 'noop' }])] });
    assert((await queueOtherUser.hydrate()).length === 0, 'logout/user switch does not expose previous user queue');
  });

  await runTest('discard only removes pending never-sent operations', async () => {
    const { store } = createMemoryStore();
    const queue = new PlannerOperationQueue({ store, partition: partition(), accessToken: 'token' });
    const pending = record('discard');
    await queue.enqueue(pending);
    assert(await queue.discardUnsentOperation(pending.descriptor.localOperationId), 'pending unsent discarded');
    const uncertain = { ...record('uncertain'), state: 'uncertain' as const, attemptCount: 1, attempt: { requestMayHaveReachedServer: true } };
    await store.put(partition(), uncertain);
    assert(!(await queue.discardUnsentOperation(uncertain.descriptor.localOperationId)), 'uncertain cannot be discarded as unsent');
    const started = { ...record('started'), attemptCount: 1, attempt: { requestMayHaveReachedServer: true, requestStartedAt: '2026-07-31T00:00:00.000Z' } };
    await store.put(partition(), started);
    assert(!(await queue.discardUnsentOperation(started.descriptor.localOperationId)), 'sent attempt cannot be discarded as unsent');
  });

  await runTest('conflicts preserve local intent and authoritative conflict metadata', async () => {
    const { store } = createMemoryStore();
    const queue = new PlannerOperationQueue({
      store,
      partition: partition(),
      accessToken: 'token',
      adapters: [adapter([new ApiError('conflict', 412, 'version_conflict_v2', null, 'req-conflict', { expected_version: 1, current_version: 2, current: { id: 'task-1', version: 2 } })])],
    });
    const op = record('conflict', { descriptor: { ...record('conflict').descriptor, expectedVersion: 1 } });
    await queue.enqueue(op);
    const [result] = await queue.drain();
    assert(result.state === 'conflicted', 'version conflict is durable conflict');
    assertEqual(result.descriptor.payload, op.descriptor.payload, 'local intent payload preserved');
    assert(result.conflict?.currentVersion === 2, 'current authoritative version preserved');
    assert(result.conflict?.authoritativeState !== undefined, 'authoritative state preserved');
  });

  await runTest('realtime signal requests reconciliation but never confirms directly', () => {
    const bridge = new PlannerReliabilityRealtimeBridge();
    const op = record('rt', { state: 'uncertain' });
    const signal = { domain: 'fake', entityType: 'task', entityId: 'rt', scope: { kind: 'household' as const, householdId: 'hh-a' }, version: 2, signalId: 'sig-1' };
    const decision = bridge.receiveSignal({ signal, operations: [op], adapters: [] });
    assert(decision.action === 'reconciliation_requested', 'signal requests reconciliation');
    assert(op.state === 'uncertain', 'signal does not confirm operation');
    assert(bridge.receiveSignal({ signal, operations: [op], adapters: [] }).action === 'ignored', 'duplicate signal ignored');
    assert(bridge.receiveSignal({ signal: { ...signal, signalId: 'sig-old', version: 1 }, operations: [op], adapters: [] }).action === 'ignored', 'old version ignored');
    assert(bridge.receiveSignal({ signal: { ...signal, signalId: 'sig-scope', scope: { kind: 'household', householdId: 'hh-b' } }, operations: [op], adapters: [] }).action === 'ignored', 'wrong scope ignored');
  });

  await runTest('observability sanitizes private metadata and observer failure does not break execution', async () => {
    const metadata = sanitizePlannerReliabilityMetadata({ payloadTitle: 'secret', domain: 'fake', attemptCount: 1, token: 'secret' });
    assert(!('payloadTitle' in metadata) && !('token' in metadata) && metadata.domain === 'fake', 'private metadata omitted');
    const { store } = createMemoryStore();
    const queue = new PlannerOperationQueue({
      store,
      partition: partition(),
      accessToken: 'token',
      adapters: [adapter([{ outcome: 'noop' }])],
      observer: { emit: () => { throw new Error('observer_down'); } },
    });
    await queue.enqueue(record('observer'));
    const result = await queue.drain();
    assert(result[0].state === 'confirmed', 'observer failure does not break queue');
  });

  console.log(`\nM11.7A Reliability tests: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
