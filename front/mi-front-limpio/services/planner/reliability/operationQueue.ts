import { evaluatePlannerOperationDependencies, sortPlannerOperationsByDependency } from './dependencyGraph';
import { canSupersedePlannerPendingOperation, PlannerReliabilityAdapterRegistry } from './domainAdapters';
import { classifyPlannerOperationError, conflictFromPlannerOperationError } from './errorClassifier';
import { emitPlannerReliabilityEvent, noopPlannerReliabilityObserver } from './observability';
import { assertPlannerOperationScopeMatchesPartition, hasPlannerIdentityConflict, isSamePlannerOperationIdentity } from './operationIdentity';
import { transitionPlannerOperation } from './operationStateMachine';
import { applyPlannerOperationReconciliation, canCleanupPlannerConfirmedOperation, markPlannerOperationConfirmed } from './reconciliation';
import { computePlannerRetryDelayMs, DEFAULT_PLANNER_RETRY_POLICY, hasPlannerRetryAttemptsRemaining, isPlannerRetryableError } from './retryPolicy';
import type {
  PlannerClock,
  PlannerDurableOperationStore,
  PlannerOperationExecutionContext,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerRandomSource,
  PlannerReliabilityDomainAdapter,
  PlannerReliabilityObserver,
  PlannerRetryPolicyConfig,
} from './types';

export type PlannerOperationQueueOptions = {
  store: PlannerDurableOperationStore;
  partition: PlannerOperationPartition;
  accessToken: string;
  adapters?: readonly PlannerReliabilityDomainAdapter[];
  observer?: PlannerReliabilityObserver;
  clock?: PlannerClock;
  random?: PlannerRandomSource;
  retryPolicy?: Partial<PlannerRetryPolicyConfig>;
  retentionMs?: number;
  maxOperationsPerDrain?: number;
};

export class PlannerOperationQueue {
  private readonly store: PlannerDurableOperationStore;
  private readonly partition: PlannerOperationPartition;
  private readonly accessToken: string;
  private readonly observer: PlannerReliabilityObserver;
  private readonly clock: PlannerClock;
  private readonly random: PlannerRandomSource;
  private readonly retryPolicy: PlannerRetryPolicyConfig;
  private readonly retentionMs: number;
  private readonly maxOperationsPerDrain: number;
  private readonly registry = new PlannerReliabilityAdapterRegistry();

  constructor(options: PlannerOperationQueueOptions) {
    this.store = options.store;
    this.partition = options.partition;
    this.accessToken = options.accessToken;
    this.observer = options.observer ?? noopPlannerReliabilityObserver;
    this.clock = options.clock ?? { now: () => new Date() };
    this.random = options.random ?? { next: () => Math.random() };
    this.retryPolicy = { ...DEFAULT_PLANNER_RETRY_POLICY, ...options.retryPolicy };
    this.retentionMs = options.retentionMs ?? 5_000;
    this.maxOperationsPerDrain = options.maxOperationsPerDrain ?? 3;
    options.adapters?.forEach((adapter) => this.registry.register(adapter));
  }

  async hydrate(): Promise<PlannerOperationRecord[]> {
    const operations = await this.store.hydrate(this.partition);
    await Promise.all(operations.map((operation) => emitPlannerReliabilityEvent(this.observer, 'operation_rehydrated', operation, {}, this.clock.now())));
    return operations;
  }

  async enqueue(operation: PlannerOperationRecord): Promise<PlannerOperationRecord> {
    assertPlannerOperationScopeMatchesPartition(operation, this.partition);
    const existing = await this.store.list(this.partition);
    const duplicate = existing.find((candidate) => isSamePlannerOperationIdentity(candidate, operation));
    if (duplicate) {
      await emitPlannerReliabilityEvent(this.observer, 'operation_deduplicated', duplicate, {}, this.clock.now());
      return duplicate;
    }
    const conflict = existing.find((candidate) => hasPlannerIdentityConflict(candidate, operation));
    if (conflict) {
      const conflicted = {
        ...operation,
        state: 'conflicted' as const,
        conflict: { kind: 'idempotency_conflict' as const, stableCode: 'same_mutation_different_hash' },
        updatedAt: this.clock.now().toISOString(),
      };
      await this.store.put(this.partition, conflicted);
      return conflicted;
    }
    const adapter = this.registry.get(operation.descriptor.domain);
    const superseded = existing.filter((candidate) => canSupersedePlannerPendingOperation(adapter, candidate, operation));
    for (const previous of superseded) await this.store.remove(this.partition, previous.descriptor.localOperationId);
    await this.store.put(this.partition, operation);
    await emitPlannerReliabilityEvent(this.observer, superseded.length ? 'operation_deduplicated' : 'operation_enqueued', operation, {}, this.clock.now());
    return operation;
  }

  async drain(): Promise<PlannerOperationRecord[]> {
    const results: PlannerOperationRecord[] = [];
    const operations = sortPlannerOperationsByDependency(await this.store.list(this.partition));
    let started = 0;
    for (const operation of operations) {
      if (started >= this.maxOperationsPerDrain) break;
      if (!this.isEligibleByStateAndTime(operation)) continue;
      const dependency = evaluatePlannerOperationDependencies(operation, operations);
      if (!dependency.executable) continue;
      const adapter = this.registry.get(operation.descriptor.domain);
      if (!adapter) continue;
      try {
        assertPlannerOperationScopeMatchesPartition(operation, this.partition);
      } catch {
        await emitPlannerReliabilityEvent(this.observer, 'operation_scope_blocked', operation, {}, this.clock.now());
        continue;
      }
      started += 1;
      results.push(await this.execute(operation, adapter));
    }
    return results;
  }

  async discardUnsentOperation(localOperationId: string): Promise<boolean> {
    const operation = await this.store.get(this.partition, localOperationId);
    if (!operation) return false;
    const neverSent = operation.state === 'pending'
      && operation.attemptCount === 0
      && !operation.attempt.requestStartedAt
      && !operation.attempt.requestMayHaveReachedServer;
    if (!neverSent) return false;
    await this.store.remove(this.partition, localOperationId);
    await emitPlannerReliabilityEvent(this.observer, 'operation_discarded_unsent', operation, {}, this.clock.now());
    return true;
  }

  async cleanupConfirmed(): Promise<number> {
    const operations = await this.store.list(this.partition);
    let removed = 0;
    for (const operation of operations) {
      if (canCleanupPlannerConfirmedOperation(operation, operations, this.clock.now(), this.retentionMs)) {
        await this.store.remove(this.partition, operation.descriptor.localOperationId);
        removed += 1;
        await emitPlannerReliabilityEvent(this.observer, 'operation_cleanup', operation, {}, this.clock.now());
      }
    }
    return removed;
  }

  async resolveConflictAsPending(localOperationId: string): Promise<PlannerOperationRecord | null> {
    const operation = await this.store.get(this.partition, localOperationId);
    if (!operation || operation.state !== 'conflicted') return null;
    const resolved = transitionPlannerOperation({ ...operation, conflict: undefined }, 'pending', this.clock.now());
    await this.store.put(this.partition, resolved);
    return resolved;
  }

  private isEligibleByStateAndTime(operation: PlannerOperationRecord): boolean {
    if (operation.state !== 'pending' && operation.state !== 'retrying' && operation.state !== 'uncertain') return false;
    if (operation.state === 'retrying' && operation.nextRetryAt && Date.parse(operation.nextRetryAt) > this.clock.now().getTime()) return false;
    return true;
  }

  private async execute(
    operation: PlannerOperationRecord,
    adapter: PlannerReliabilityDomainAdapter,
  ): Promise<PlannerOperationRecord> {
    const now = this.clock.now();
    let inFlight = transitionPlannerOperation(operation, 'in_flight', now);
    inFlight = {
      ...inFlight,
      attemptCount: inFlight.attemptCount + 1,
      attempt: {
        ...inFlight.attempt,
        attemptStartedAt: now.toISOString(),
        requestStartedAt: now.toISOString(),
        requestMayHaveReachedServer: true,
      },
    };
    await this.store.put(this.partition, inFlight);
    await emitPlannerReliabilityEvent(this.observer, 'operation_started', inFlight, {}, now);

    const context: PlannerOperationExecutionContext = {
      accessToken: this.accessToken,
      partition: this.partition,
      now: () => this.clock.now(),
    };

    try {
      const result = await adapter.execute(inFlight, context);
      let confirmed = markPlannerOperationConfirmed(inFlight, result, this.clock.now());
      await this.store.put(this.partition, confirmed);
      await emitPlannerReliabilityEvent(this.observer, 'operation_confirmed', confirmed, { outcome: result.outcome }, this.clock.now());
      confirmed = await applyPlannerOperationReconciliation(adapter, confirmed, this.clock.now());
      await this.store.put(this.partition, confirmed);
      await emitPlannerReliabilityEvent(this.observer, 'operation_reconciled', confirmed, { outcome: result.outcome }, this.clock.now());
      return confirmed;
    } catch (error) {
      const normalized = classifyPlannerOperationError(error);
      if (normalized.category === 'timeout_ambiguous') {
        const uncertain = {
          ...transitionPlannerOperation(inFlight, 'uncertain', this.clock.now()),
          attempt: { ...inFlight.attempt, lastError: normalized, attemptFinishedAt: this.clock.now().toISOString(), requestMayHaveReachedServer: true },
        };
        await this.store.put(this.partition, uncertain);
        await emitPlannerReliabilityEvent(this.observer, 'operation_marked_uncertain', uncertain, { errorCategory: normalized.category, stableCode: normalized.stableCode }, this.clock.now());
        return uncertain;
      }
      if (isPlannerRetryableError(normalized) && hasPlannerRetryAttemptsRemaining(inFlight.attemptCount, this.retryPolicy)) {
        const delayMs = computePlannerRetryDelayMs({
          attemptIndex: inFlight.attemptCount - 1,
          error: normalized,
          config: this.retryPolicy,
          random: this.random,
        });
        const retrying = {
          ...transitionPlannerOperation(inFlight, 'retrying', this.clock.now()),
          nextRetryAt: new Date(this.clock.now().getTime() + delayMs).toISOString(),
          attempt: { ...inFlight.attempt, lastError: normalized, attemptFinishedAt: this.clock.now().toISOString() },
        };
        await this.store.put(this.partition, retrying);
        await emitPlannerReliabilityEvent(this.observer, 'operation_retry_scheduled', retrying, { errorCategory: normalized.category, retryDelayBucketMs: delayMs }, this.clock.now());
        return retrying;
      }
      const conflict = !hasPlannerRetryAttemptsRemaining(inFlight.attemptCount, this.retryPolicy)
        ? { kind: 'retry_exhausted' as const, stableCode: 'retry_exhausted' }
        : adapter.classifyConflict?.(inFlight, normalized) ?? conflictFromPlannerOperationError(normalized);
      const conflicted = {
        ...transitionPlannerOperation(inFlight, 'conflicted', this.clock.now()),
        conflict,
        attempt: { ...inFlight.attempt, lastError: normalized, attemptFinishedAt: this.clock.now().toISOString() },
      };
      await this.store.put(this.partition, conflicted);
      await emitPlannerReliabilityEvent(this.observer, 'operation_conflicted', conflicted, { errorCategory: normalized.category, stableCode: normalized.stableCode }, this.clock.now());
      return conflicted;
    }
  }
}
