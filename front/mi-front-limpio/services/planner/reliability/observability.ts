import type {
  PlannerOperationRecord,
  PlannerReliabilityEventName,
  PlannerReliabilityObserver,
} from './types';

export const noopPlannerReliabilityObserver: PlannerReliabilityObserver = Object.freeze({
  emit() {
    // no-op by design
  },
});

export async function emitPlannerReliabilityEvent(
  observer: PlannerReliabilityObserver,
  name: PlannerReliabilityEventName,
  operation: PlannerOperationRecord | null,
  metadata: Record<string, string | number | boolean | null> = {},
  now: Date = new Date(),
): Promise<void> {
  try {
    await observer.emit({
      name,
      at: now.toISOString(),
      metadata: sanitizePlannerReliabilityMetadata({
        domain: operation?.descriptor.domain ?? null,
        operationType: operation?.descriptor.operationType ?? null,
        state: operation?.state ?? null,
        attemptCount: operation?.attemptCount ?? null,
        dependencyCount: operation?.descriptor.dependencies.length ?? null,
        scopeKind: operation?.descriptor.scope.kind ?? null,
        requestId: operation?.attempt.requestId ?? null,
        ...metadata,
      }),
    });
  } catch {
    // Observability must not break the queue.
  }
}

export function sanitizePlannerReliabilityMetadata(
  metadata: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const blocked = /payload|title|description|note|location|email|person|token|secret|authorization|stack|raw/i;
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!blocked.test(key)) output[key] = value;
  }
  return output;
}
