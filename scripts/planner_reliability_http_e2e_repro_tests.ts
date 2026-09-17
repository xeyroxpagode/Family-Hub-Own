/**
 * Repro: end-to-end Task/Event/Plan submit through the reliability runtime.
 *
 * Purpose: detect the first stage that fails when the user submits a Task,
 * Event or Plan from inside Planner. Mirrors the runtime path used by the
 * TaskForm / EventForm / PlannerSheetHost (PlanFormHost).
 *
 * Strategy:
 *   - Open a runtime via `openPlannerReliabilityRuntimeForSession` exactly
 *     the way PlannerScreen does it.
 *   - Mock `globalThis.fetch` so each POST is observable without a backend.
 *   - Call `enqueuePlannerTaskCreate`, `enqueuePlannerEventCreate` and
 *     `enqueuePlannerPlanGraphWrite`.
 *   - Capture, for each entity, the last stage reached, the real error
 *     (name, code, message, instanceof ApiError), whether requestJson was
 *     reached and whether `fetch` was reached.
 *
 * No production code is mutated in this repro; test asserts on real
 * production paths open-by-default adapters, real async-storage memory
 * store, and the published enqueue helpers.
 */

import { ApiError } from '../front/mi-front-limpio/services/api';
import {
  createPlannerDurableOperationStore,
  disposePlannerReliabilityRuntimes,
  openPlannerReliabilityRuntimeForSession,
} from '../front/mi-front-limpio/services/planner/reliability';
import {
  enqueuePlannerEventCreate,
  enqueuePlannerPlanGraphWrite,
  enqueuePlannerPlanStructureChangeset,
  enqueuePlannerTaskCreate,
} from '../front/mi-front-limpio/services/planner/reliability';
import {
  buildPlanLifecycleWrite,
  buildPlanStructureChangesetWrite,
  createPlanWriteIntent,
  createPlanStructureWriteIntent,
  type MinimalPlanCreatePayload,
  type PlanStructureDraft,
} from '../front/mi-front-limpio/services/planner/plannerPlans';
import { omitUndefinedPlannerPayloadProperties } from '../front/mi-front-limpio/services/planner/plannerPayloadFilter';
import type { CreatePlannerTaskPayload } from '../front/mi-front-limpio/services/plannerTasks';
import type { CreatePlannerEventPayload } from '../front/mi-front-limpio/services/plannerEvents';

// Diagnostic: walk an object and report the first path containing undefined.
function findUndefinedPaths(value: unknown, basePath = '', acc: string[] = [], depth = 0): string[] {
  if (depth > 8) return acc;
  if (value === undefined) {
    acc.push(basePath || '<root>');
    return acc;
  }
  if (value === null || typeof value !== 'object') return acc;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      findUndefinedPaths(value[i], `${basePath}[${i}]`, acc, depth + 1);
    }
    return acc;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const v = (value as Record<string, unknown>)[key];
    if (v === undefined) acc.push(basePath ? `${basePath}.${key}` : key);
    else if (v !== null && typeof v === 'object') findUndefinedPaths(v, basePath ? `${basePath}.${key}` : key, acc, depth + 1);
  }
  return acc;
}

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
// The frontend `requestJson` resolves the API base URL from
// `process.env.EXPO_PUBLIC_API_URL` at module-eval time. In pure-Node repros
// that variable is unset and the operation stays stuck in `retrying` with
// `api_url_missing`. We seed a dummy base URL before importing any service:
// the actual network call is intercepted by `withFetchMock`, so the value
// itself is never on the wire.
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://repro.local';

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

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
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

class FakeAsyncStorage {
  private readonly values = new Map<string, string>();
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

type FetchCall = { path: string; method: string };

type StageLog = {
  entity: string;
  domain: string;
  stage: string;
  errorName?: string;
  errorCode?: string | null;
  errorMessage?: string;
  isApiError: boolean;
  runtimePresent: boolean;
  path?: string;
  fetchStarted: boolean;
};

async function openFreshRuntime(): Promise<void> {
  const storage = new FakeAsyncStorage();
  const store = createPlannerDurableOperationStore(storage, () => new Date('2026-08-01T12:00:00.000Z'));
  // Mirror PlannerScreen's openPlannerReliabilityRuntimeForSession call.
  const runtime = openPlannerReliabilityRuntimeForSession(
    {
      accessToken: 'token',
      authenticatedUserId: 'user-a',
      activeHouseholdId: 'hh-a',
      authResolved: true,
      householdResolved: true,
    },
    {
      store,
      connectivity: { isOnline: () => true },
    },
  );
  assert(runtime !== null, 'runtime opened for resolved session (matches PlannerScreen effect)');
}

async function withFetchMock<T>(
  realFetch: typeof fetch,
  calls: FetchCall[],
  stageLog: StageLog,
  fn: () => Promise<T>,
): Promise<{ result: T | null; error: unknown | null }> {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ path: String(input), method: init?.method ?? 'GET' });
    stageLog.fetchStarted = true;
    return new Response(JSON.stringify({ data: { id: 'e2e-resolved' }, version: 2 }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-e2e' },
    });
  }) as typeof fetch;
  try {
    const result = await fn();
    return { result, error: null };
  } catch (error) {
    return { result: null, error };
  } finally {
    globalThis.fetch = realFetch;
  }
}

function summarize(stageLog: StageLog, error: unknown): void {
  if (error instanceof Error) {
    stageLog.errorName = error.name;
    stageLog.errorMessage = error.message;
    stageLog.isApiError = error instanceof ApiError;
    stageLog.errorCode = error instanceof ApiError ? error.code : null;
  }
  console.log(
    `  [STAGE] entity=${stageLog.entity} domain=${stageLog.domain} stage=${stageLog.stage} ` +
      `runtimePresent=${stageLog.runtimePresent} errorName=${stageLog.errorName ?? '-'} ` +
      `errorCode=${stageLog.errorCode ?? '-'} isApiError=${stageLog.isApiError} ` +
      `fetchStarted=${stageLog.fetchStarted} path=${stageLog.path ?? '-'}`,
  );
  if (stageLog.errorMessage) console.log(`  [MSG] ${stageLog.errorMessage}`);
}

void (async () => {
  const realFetch = globalThis.fetch;

  await runTest('TASK submit inside Planner reaches fetch via reliability runtime', async () => {
    await openFreshRuntime();
    const stageLog: StageLog = {
      entity: 'task',
      domain: 'task',
      stage: 'enqueuePlannerTaskCreate',
      isApiError: false,
      runtimePresent: false,
      fetchStarted: false,
    };
    stageLog.runtimePresent = true;
    const calls: FetchCall[] = [];
    // Mirrors TaskForm build: optionals become undefined then filtered via
    // omitUndefinedPlannerPayloadProperties so the canonical hash does not
    // trip on `planner_reliability_undefined_hash_property` at description,
    // category, due_time or assigned_to_member_id.
    const rawTaskPayload: CreatePlannerTaskPayload = {
      title: 'Repro task from planner',
      description: undefined,
      priority: 'normal',
      category: undefined,
      due_date: '2026-08-04',
      due_time: undefined,
      assigned_to_member_id: undefined,
      requires_verification: false,
      goal_id: null,
    };
    const taskPayload = omitUndefinedPlannerPayloadProperties(rawTaskPayload);
    const undefinedPaths = findUndefinedPaths(taskPayload);
    assert(undefinedPaths.length === 0, `task payload has no undefined own properties (got ${undefinedPaths.join(',')})`);
    const { result, error } = await withFetchMock(
      realFetch,
      calls,
      stageLog,
      () => enqueuePlannerTaskCreate(taskPayload, { mutationId: 'mut-task-repro', idempotencyKey: 'idem-task-repro' }),
    );
    assert(error === null, 'no exception thrown by enqueuePlannerTaskCreate');
    assert(calls.length === 1, `exactly one POST issued (got ${calls.length})`);
    if (calls[0]) {
      stageLog.path = calls[0].path;
      stageLog.stage = 'fetch';
    }
    summarize(stageLog, error);
  });

  await runTest('EVENT submit inside Planner reaches fetch via reliability runtime (all-day, optionals filtered)', async () => {
    await openFreshRuntime();
    const stageLog: StageLog = {
      entity: 'event',
      domain: 'event',
      stage: 'enqueuePlannerEventCreate',
      isApiError: false,
      runtimePresent: true,
      fetchStarted: false,
    };
    const calls: FetchCall[] = [];
    // Mirrors EventForm build for an all-day event: ends_at, description,
    // location_name and expected_version fall back to undefined. Without the
    // omitUndefinedPlannerPayloadProperties guard the canonical hash would
    // raise `planner_reliability_undefined_hash_property` at `description`
    // before any POST was issued.
    const rawEventPayload: CreatePlannerEventPayload & { expected_version?: number } = {
      title: 'Repro event',
      description: undefined,
      starts_at: '2026-08-02T00:00:00.000Z',
      ends_at: undefined,
      all_day: true,
      location_name: undefined,
      recurrence: 'none',
      expected_version: undefined,
    };
    const eventPayload = omitUndefinedPlannerPayloadProperties(rawEventPayload);
    const undefinedPaths = findUndefinedPaths(eventPayload);
    assert(undefinedPaths.length === 0, `event payload has no undefined own properties (got ${undefinedPaths.join(',')})`);
    const { error } = await withFetchMock(
      realFetch,
      calls,
      stageLog,
      () =>
        enqueuePlannerEventCreate(
          eventPayload,
          { mutationId: 'mut-event-repro', idempotencyKey: 'idem-event-repro' },
        ),
    );
    assert(error === null, 'no exception thrown by enqueuePlannerEventCreate');
    assert(calls.length === 1, `exactly one POST issued (got ${calls.length})`);
    if (calls[0]) {
      stageLog.path = calls[0].path;
      stageLog.stage = 'fetch';
    }
    summarize(stageLog, error);
  });

  await runTest('PLAN submit inside Planner reaches fetch via reliability runtime', async () => {
    await openFreshRuntime();
    const stageLog: StageLog = {
      entity: 'plan',
      domain: 'plan',
      stage: 'enqueuePlannerPlanGraphWrite',
      isApiError: false,
      runtimePresent: true,
      fetchStarted: false,
    };
    const calls: FetchCall[] = [];
    const minimalPayload: MinimalPlanCreatePayload = {
      objective: 'Repro plan',
      scope: 'household',
      householdId: 'hh-a',
      outcome: 'activate_when_valid',
    };
    const request = {
      entityType: 'plan' as const,
      action: 'create' as const,
      planId: null,
      entityId: null,
      expectedVersion: null,
      expectedPlanVersion: null,
      payload: {
        objective: minimalPayload.objective,
        scope: minimalPayload.scope,
        household_id: minimalPayload.householdId ?? null,
        description: null,
        target_date: null,
        finalization_kind: 'none',
        desired_outcome: minimalPayload.outcome,
        initial_structure: null,
      },
    };
    const intent = createPlanWriteIntent(request);
    const undefinedPaths = findUndefinedPaths(request);
    assert(undefinedPaths.length === 0, `plan create request has no undefined own properties (got ${undefinedPaths.join(',')})`);
    const { error } = await withFetchMock(realFetch, calls, stageLog, () =>
      enqueuePlannerPlanGraphWrite(request, intent, 'create'),
    );
    assert(error === null, 'no exception thrown by enqueuePlannerPlanGraphWrite');
    if (error instanceof Error) {
      console.log(`  [DIAG] error stack: ${error.stack ?? ''}`);
    }
    assert(calls.length === 1, `exactly one POST issued (got ${calls.length})`);
    if (calls[0]) {
      stageLog.path = calls[0].path;
      stageLog.stage = 'fetch';
    }
    summarize(stageLog, error);
  });

  await runTest('PLAN ACTIVATE reaches fetch via reliability runtime (closed_reason is null, not undefined)', async () => {
    await openFreshRuntime();
    const stageLog: StageLog = {
      entity: 'plan',
      domain: 'plan',
      stage: 'enqueuePlannerPlanGraphWrite(activate)',
      isApiError: false,
      runtimePresent: true,
      fetchStarted: false,
    };
    const calls: FetchCall[] = [];
    // buildPlanLifecycleWrite previously set `closed_reason: undefined` for
    // every transition that is not `close` (e.g. `activate`). The undefined
    // own property raised `planner_reliability_undefined_hash_property` in
    // the canonical hash step before the request could reach `fetch`. The
    // fix sets `closed_reason: null` for non-close transitions, which is
    // accepted by stableStringify AND ignored by the backend (which only
    // reads `closed_reason` on the `close` branch).
    const request = buildPlanLifecycleWrite({ id: 'plan-1', version: 1 }, 'activate');
    assert(
      request.payload?.closed_reason === null,
      `closed_reason is null (not undefined) for activate (got ${String(request.payload?.closed_reason)})`,
    );
    const undefinedPaths = findUndefinedPaths(request);
    assert(undefinedPaths.length === 0, `plan activate request has no undefined own properties (got ${undefinedPaths.join(',')})`);
    const intent = createPlanWriteIntent(request);
    const { error } = await withFetchMock(realFetch, calls, stageLog, () =>
      enqueuePlannerPlanGraphWrite(request, intent, 'update'),
    );
    assert(error === null, 'no exception thrown by enqueuePlannerPlanGraphWrite(activate)');
    assert(calls.length === 1, `exactly one POST issued (got ${calls.length})`);
    if (calls[0]) {
      stageLog.path = calls[0].path;
      stageLog.stage = 'fetch';
    }
    summarize(stageLog, error);
  });

  await runTest('PLAN STRUCTURE SAVE reaches fetch via reliability runtime (empty nodes hash-safe)', async () => {
    await openFreshRuntime();
    const stageLog: StageLog = {
      entity: 'plan',
      domain: 'plan',
      stage: 'enqueuePlannerPlanStructureChangeset',
      isApiError: false,
      runtimePresent: true,
      fetchStarted: false,
    };
    const calls: FetchCall[] = [];
    // Structure save with an empty nodes array mirrors the first Save after
    // opening the Structure editor (PlannerPlanStructureEditScreen starts
    // with `nodes: []`). The canonical hash must not raise for an empty
    // operations array.
    const draft: PlanStructureDraft = {
      planId: 'plan-1',
      expectedPlanVersion: 1,
      nodes: [],
    };
    const decision = buildPlanStructureChangesetWrite(draft);
    assert(decision.canSubmit, 'empty structure changeset is submittable');
    const undefinedPaths = findUndefinedPaths(decision.remoteRequest);
    assert(undefinedPaths.length === 0, `structure changeset has no undefined own properties (got ${undefinedPaths.join(',')})`);
    const intent = createPlanStructureWriteIntent(decision.remoteRequest);
    const { error } = await withFetchMock(realFetch, calls, stageLog, () =>
      enqueuePlannerPlanStructureChangeset(decision.remoteRequest, intent),
    );
    assert(error === null, 'no exception thrown by enqueuePlannerPlanStructureChangeset');
    assert(calls.length === 1, `exactly one POST issued (got ${calls.length})`);
    if (calls[0]) {
      stageLog.path = calls[0].path;
      stageLog.stage = 'fetch';
    }
    summarize(stageLog, error);
  });

  await runTest('TASK submit fails with planner_reliability_runtime_unavailable when runtime is absent', async () => {
    // No openFreshRuntime call here → simulate the lifecycle when PlannerScreen
    // disposed the runtime while the sheet was still open (e.g. authMeLoading
    // flipped and the effect cleanup ran before the user pressed Save).
    disposePlannerReliabilityRuntimes();
    const stageLog: StageLog = {
      entity: 'task',
      domain: 'task',
      stage: 'enqueueConfirmed',
      isApiError: false,
      runtimePresent: false,
      fetchStarted: false,
    };
    const calls: FetchCall[] = [];
    const { error } = await withFetchMock(realFetch, calls, stageLog, () =>
      enqueuePlannerTaskCreate({ title: 'Repro task no runtime' }, { mutationId: 'mut-task-no-runtime', idempotencyKey: 'idem-task-no-runtime' }),
    );
    assert(error !== null, 'exception thrown when runtime absent');
    assert(error instanceof ApiError, 'error is ApiError');
    if (error instanceof ApiError) {
      stageLog.errorName = error.name;
      stageLog.errorCode = error.code;
      stageLog.errorMessage = error.message;
      stageLog.isApiError = true;
    }
    assert(calls.length === 0, 'no POST issued when runtime absent');
    summarize(stageLog, error);
  });

  console.log(`\nHTTP e2e repro tests: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
