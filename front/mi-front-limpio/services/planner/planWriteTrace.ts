export type PlanWriteTraceOperation = 'create' | 'structure' | 'activate' | 'lifecycle';

export type PlanWriteTraceInput = {
  readonly operation: PlanWriteTraceOperation;
  readonly stage: string;
  readonly surface?: string;
  readonly instanceTag?: string | null;
  readonly mutationId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly localOperationId?: string | null;
  readonly planId?: string | null;
  readonly status?: number | string | null;
};

export function shortPlanWriteTag(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}:${value.slice(-4)}`;
}

export function tracePlanWrite(input: PlanWriteTraceInput): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  try {
    console.log('[PlanWriteTrace]', {
      operation: input.operation,
      stage: input.stage,
      surface: input.surface,
      instanceTag: input.instanceTag ?? null,
      mutationTag: shortPlanWriteTag(input.mutationId),
      idempotencyTag: shortPlanWriteTag(input.idempotencyKey),
      operationTag: shortPlanWriteTag(input.localOperationId),
      planTag: shortPlanWriteTag(input.planId),
      status: input.status ?? null,
    });
  } catch {
    // Development-only diagnostics must never affect writes.
  }
}
