import {
  registerHouseholdLifecycle,
  registerSessionLifecycle,
} from '../../core/lifecycle';
import { plannerCache } from '../plannerCache';
import { createPlannerOperationRecord, createPlannerPendingOperation } from './operationIdentity';
import { PlannerOperationQueue } from './operationQueue';
import { PlannerOperationScheduler } from './operationScheduler';
import { plannerDurableOperationStore } from './operationStore';
import { PlannerReliabilityRealtimeBridge } from './realtimeBridge';
import { createPlannerReliabilityProductiveAdapters } from './productiveAdapters';
import { emitPlannerReliabilityEvent, noopPlannerReliabilityObserver } from './observability';
import type { PlannerMutationIntent } from '../plannerMutationIntent';
import type {
  PlannerClock,
  PlannerDurableOperationStore,
  PlannerOperationEntity,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerOperationScope,
  PlannerPendingOperation,
  PlannerReliabilityDomainAdapter,
  PlannerReliabilityObserver,
  PlannerReliabilityRealtimeSignal,
} from './types';

export type PlannerReliabilityResolvedScope = {
  readonly accessToken: string;
  readonly authenticatedUserId: string;
  readonly activeHouseholdId: string | null;
};

export type PlannerReliabilityScopeInput = {
  readonly accessToken?: string | null;
  readonly authenticatedUserId?: string | null;
  readonly activeHouseholdId?: string | null;
  readonly authResolved: boolean;
  readonly householdResolved: boolean;
};

export type PlannerReliabilityConnectivitySource = {
  readonly isOnline: () => boolean;
  readonly subscribe?: (listener: (online: boolean) => void) => () => void;
};

export type PlannerReliabilityRuntimeOptions = PlannerReliabilityResolvedScope & {
  readonly store?: PlannerDurableOperationStore;
  readonly adapters?: readonly PlannerReliabilityDomainAdapter[];
  readonly observer?: PlannerReliabilityObserver;
  readonly connectivity?: PlannerReliabilityConnectivitySource;
  readonly clock?: PlannerClock;
  readonly schedulerIntervalMs?: number;
};

export type PlannerReliabilityEnqueueInput<TPayload = unknown> = {
  readonly intent: PlannerMutationIntent;
  readonly domain: string;
  readonly operationType: string;
  readonly payload: TPayload;
  readonly entity?: PlannerOperationEntity;
  readonly scope?: PlannerOperationScope;
  readonly dependencies?: readonly string[];
};

const activeRuntimes = new Map<string, PlannerReliabilityRuntime>();
let lifecycleInstalled = false;

function partitionOf(scope: PlannerReliabilityResolvedScope): PlannerOperationPartition {
  return {
    authenticatedUserId: scope.authenticatedUserId,
    activeHouseholdId: scope.activeHouseholdId,
  };
}

function scopeKey(scope: PlannerReliabilityResolvedScope): string {
  return `${scope.authenticatedUserId}:${scope.activeHouseholdId ?? 'personal'}`;
}

export function resolvePlannerReliabilityScope(input: PlannerReliabilityScopeInput): PlannerReliabilityResolvedScope | null {
  if (!input.authResolved || !input.householdResolved) return null;
  if (!input.accessToken || !input.authenticatedUserId) return null;
  return {
    accessToken: input.accessToken,
    authenticatedUserId: input.authenticatedUserId,
    activeHouseholdId: input.activeHouseholdId ?? null,
  };
}

export class PlannerReliabilityRuntime {
  readonly partition: PlannerOperationPartition;
  readonly key: string;
  private readonly queue: PlannerOperationQueue;
  private readonly scheduler: PlannerOperationScheduler;
  private readonly realtime = new PlannerReliabilityRealtimeBridge();
  private readonly store: PlannerDurableOperationStore;
  private readonly adapters: readonly PlannerReliabilityDomainAdapter[];
  private readonly observer: PlannerReliabilityObserver;
  private readonly clock: PlannerClock;
  private readonly connectivity?: PlannerReliabilityConnectivitySource;
  private unsubscribeConnectivity: (() => void) | null = null;
  private disposed = false;
  private started = false;
  private drainInFlight: Promise<PlannerOperationRecord[]> | null = null;

  constructor(options: PlannerReliabilityRuntimeOptions) {
    this.partition = partitionOf(options);
    this.key = scopeKey(options);
    this.store = options.store ?? plannerDurableOperationStore;
    this.adapters = options.adapters ?? createPlannerReliabilityProductiveAdapters();
    this.observer = options.observer ?? noopPlannerReliabilityObserver;
    this.clock = options.clock ?? { now: () => new Date(), setTimeout, clearTimeout };
    this.connectivity = options.connectivity;
    this.queue = new PlannerOperationQueue({
      store: this.store,
      partition: this.partition,
      accessToken: options.accessToken,
      adapters: this.adapters,
      observer: this.observer,
      clock: this.clock,
    });
    this.scheduler = new PlannerOperationScheduler(this.queue, this.clock, options.schedulerIntervalMs ?? 1_000);
  }

  async restore(): Promise<PlannerOperationRecord[]> {
    this.assertOpen();
    return this.queue.hydrate();
  }

  start(): void {
    this.assertOpen();
    if (this.started) return;
    this.started = true;
    void this.restore();
    if (this.isOnline()) this.scheduler.start();
    this.unsubscribeConnectivity = this.connectivity?.subscribe?.((online) => {
      if (this.disposed) return;
      if (online) {
        this.scheduler.start();
        this.scheduler.triggerReconnect();
      } else {
        this.scheduler.stop();
      }
    }) ?? null;
    void emitPlannerReliabilityEvent(this.observer, 'reconciliation_requested', null, { reason: 'scope_opened' }, this.clock.now());
  }

  async enqueue<TPayload>(input: PlannerReliabilityEnqueueInput<TPayload>): Promise<PlannerOperationRecord<TPayload>> {
    this.assertOpen();
    const descriptor = this.createDescriptor(input);
    const record = createPlannerOperationRecord(descriptor);
    const enqueued = await this.queue.enqueue(record);
    if (this.isOnline()) this.scheduler.triggerReconnect();
    return enqueued as PlannerOperationRecord<TPayload>;
  }

  async enqueueAndFlush<TPayload>(input: PlannerReliabilityEnqueueInput<TPayload>): Promise<PlannerOperationRecord<TPayload>> {
    this.assertOpen();
    const enqueued = await this.enqueue(input);
    if (!this.isOnline()) return enqueued;
    await this.drainNow();
    return (await this.store.get(this.partition, enqueued.descriptor.localOperationId) ?? enqueued) as PlannerOperationRecord<TPayload>;
  }

  async drainNow(): Promise<PlannerOperationRecord[]> {
    this.assertOpen();
    if (this.drainInFlight) return this.drainInFlight;
    this.drainInFlight = this.queue.drain()
      .finally(() => {
        this.drainInFlight = null;
      });
    return this.drainInFlight;
  }

  async retry(localOperationId: string): Promise<PlannerOperationRecord | null> {
    this.assertOpen();
    const operation = await this.queue.resolveConflictAsPending(localOperationId);
    if (operation && this.isOnline()) this.scheduler.triggerReconnect();
    return operation;
  }

  async discardLocalUnsent(localOperationId: string): Promise<boolean> {
    this.assertOpen();
    return this.queue.discardUnsentOperation(localOperationId);
  }

  async listOperations(): Promise<PlannerOperationRecord[]> {
    this.assertOpen();
    return this.store.list(this.partition);
  }

  async receiveRealtimeSignal(signal: PlannerReliabilityRealtimeSignal) {
    this.assertOpen();
    const operations = await this.store.list(this.partition);
    const decision = this.realtime.receiveSignal({ signal, operations, adapters: this.adapters });
    await emitPlannerReliabilityEvent(this.observer, 'realtime_signal_received', null, {
      domain: signal.domain,
      entityType: signal.entityType,
      action: decision.action,
    }, this.clock.now());
    if (decision.action === 'reconciliation_requested') {
      const scope = signal.scope.kind === 'household' ? { householdId: signal.scope.householdId } : null;
      if (scope) {
        if (signal.domain === 'task') plannerCache.executeInvalidation({ kind: 'task', action: 'update', entityId: signal.entityId }, scope);
        if (signal.domain === 'event') plannerCache.executeInvalidation({ kind: 'event', action: 'update', entityId: signal.entityId }, scope);
        if (signal.domain === 'plan') plannerCache.executeInvalidation({ kind: 'plan', action: 'update', entityId: signal.entityId }, scope);
      }
      await emitPlannerReliabilityEvent(this.observer, 'reconciliation_requested', null, {
        domain: signal.domain,
        entityType: signal.entityType,
        operationCount: decision.operationIds.length,
      }, this.clock.now());
    }
    return decision;
  }

  dispose(): void {
    if (this.disposed) return;
    this.scheduler.stop();
    this.unsubscribeConnectivity?.();
    this.unsubscribeConnectivity = null;
    this.disposed = true;
    this.started = false;
    activeRuntimes.delete(this.key);
    void emitPlannerReliabilityEvent(this.observer, 'operation_cleanup', null, { reason: 'scope_closed' }, this.clock.now());
  }

  private createDescriptor<TPayload>(input: PlannerReliabilityEnqueueInput<TPayload>): PlannerPendingOperation<TPayload> {
    const scope = input.scope ?? (
      this.partition.activeHouseholdId
        ? { kind: 'household' as const, householdId: this.partition.activeHouseholdId }
        : { kind: 'personal' as const, ownerId: this.partition.authenticatedUserId }
    );
    return createPlannerPendingOperation({
      intent: input.intent,
      domain: input.domain,
      operationType: input.operationType,
      partition: this.partition,
      scope,
      payload: input.payload,
      entity: input.entity,
      dependencies: input.dependencies,
      createdAt: this.clock.now(),
    });
  }

  private isOnline(): boolean {
    return this.connectivity?.isOnline() !== false;
  }

  private assertOpen(): void {
    if (this.disposed) throw new Error('planner_reliability_runtime_disposed');
  }
}

export function openPlannerReliabilityRuntime(options: PlannerReliabilityRuntimeOptions): PlannerReliabilityRuntime {
  installPlannerReliabilityLifecycleBindings();
  const key = scopeKey(options);
  const existing = activeRuntimes.get(key);
  if (existing) return existing;
  for (const runtime of [...activeRuntimes.values()]) runtime.dispose();
  const runtime = new PlannerReliabilityRuntime(options);
  activeRuntimes.set(key, runtime);
  runtime.start();
  return runtime;
}

export function openPlannerReliabilityRuntimeForSession(
  input: PlannerReliabilityScopeInput,
  options: Omit<PlannerReliabilityRuntimeOptions, keyof PlannerReliabilityResolvedScope> = {},
): PlannerReliabilityRuntime | null {
  const scope = resolvePlannerReliabilityScope(input);
  return scope ? openPlannerReliabilityRuntime({ ...scope, ...options }) : null;
}

export function getActivePlannerReliabilityRuntime(): PlannerReliabilityRuntime | null {
  return [...activeRuntimes.values()][0] ?? null;
}

export function disposePlannerReliabilityRuntimes(): void {
  for (const runtime of [...activeRuntimes.values()]) runtime.dispose();
  activeRuntimes.clear();
}

export function installPlannerReliabilityLifecycleBindings(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  registerSessionLifecycle({
    name: 'planner-reliability-runtime',
    order: 50,
    cleanup: () => disposePlannerReliabilityRuntimes(),
  });
  registerHouseholdLifecycle({
    name: 'planner-reliability-runtime',
    order: 50,
    beforeSwitch: () => disposePlannerReliabilityRuntimes(),
  });
}

installPlannerReliabilityLifecycleBindings();
