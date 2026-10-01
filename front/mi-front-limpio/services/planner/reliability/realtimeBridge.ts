import type {
  PlannerOperationRecord,
  PlannerOperationScope,
  PlannerReliabilityDomainAdapter,
  PlannerReliabilityRealtimeSignal,
} from './types';

export type PlannerRealtimeBridgeDecision =
  | { action: 'ignored'; reason: 'duplicate' | 'old_version' | 'scope_mismatch' | 'not_related' }
  | { action: 'reconciliation_requested'; operationIds: string[] };

function sameScope(a: PlannerOperationScope, b: PlannerOperationScope): boolean {
  return a.kind === b.kind && (
    a.kind === 'personal'
      ? a.ownerId === (b as { kind: 'personal'; ownerId: string }).ownerId
      : a.householdId === (b as { kind: 'household'; householdId: string }).householdId
  );
}

export class PlannerReliabilityRealtimeBridge {
  private readonly seen = new Set<string>();
  private readonly latestVersionByEntity = new Map<string, number>();

  receiveSignal(input: {
    signal: PlannerReliabilityRealtimeSignal;
    operations: readonly PlannerOperationRecord[];
    adapters: readonly PlannerReliabilityDomainAdapter[];
  }): PlannerRealtimeBridgeDecision {
    const { signal } = input;
    const dedupeKey = signal.signalId ?? `${signal.domain}:${signal.entityType}:${signal.entityId}:${signal.version ?? 'none'}:${signal.occurredAt ?? 'none'}`;
    if (this.seen.has(dedupeKey)) return { action: 'ignored', reason: 'duplicate' };
    this.seen.add(dedupeKey);

    const entityKey = `${signal.domain}:${signal.entityType}:${signal.entityId}`;
    const previousVersion = this.latestVersionByEntity.get(entityKey);
    if (signal.version !== undefined && previousVersion !== undefined && signal.version <= previousVersion) {
      return { action: 'ignored', reason: 'old_version' };
    }
    if (signal.version !== undefined) this.latestVersionByEntity.set(entityKey, signal.version);

    const operationIds = input.operations
      .filter((operation) => sameScope(operation.descriptor.scope, signal.scope))
      .filter((operation) => operation.descriptor.domain === signal.domain)
      .filter((operation) => {
        const adapter = input.adapters.find((candidate) => candidate.domain === operation.descriptor.domain);
        if (adapter?.isRealtimeSignalRelated) return adapter.isRealtimeSignalRelated(operation, signal);
        return operation.descriptor.entity?.type === signal.entityType && operation.descriptor.entity?.id === signal.entityId;
      })
      .map((operation) => operation.descriptor.localOperationId);

    if (operationIds.length === 0) {
      const hasSameScope = input.operations.some((operation) => sameScope(operation.descriptor.scope, signal.scope));
      return { action: 'ignored', reason: hasSameScope ? 'not_related' : 'scope_mismatch' };
    }
    return { action: 'reconciliation_requested', operationIds };
  }
}
