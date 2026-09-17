import type {
  PlannerOperationRecord,
  PlannerReliabilityDomainAdapter,
} from './types';

export class PlannerReliabilityAdapterRegistry {
  private readonly adapters = new Map<string, PlannerReliabilityDomainAdapter>();

  register(adapter: PlannerReliabilityDomainAdapter): void {
    this.adapters.set(adapter.domain, adapter);
  }

  get(domain: string): PlannerReliabilityDomainAdapter | null {
    return this.adapters.get(domain) ?? null;
  }

  list(): PlannerReliabilityDomainAdapter[] {
    return [...this.adapters.values()];
  }
}

export function canSupersedePlannerPendingOperation(
  adapter: PlannerReliabilityDomainAdapter | null,
  previous: PlannerOperationRecord,
  next: PlannerOperationRecord,
): boolean {
  if (previous.state !== 'pending' || previous.attemptCount !== 0 || previous.attempt.requestMayHaveReachedServer) {
    return false;
  }
  return adapter?.canSupersedePendingOperation?.(previous, next) === true;
}

export const defaultPlannerDraftAutosaveAdapterPolicy = Object.freeze({
  canSupersedePendingOperation: () => false,
});
