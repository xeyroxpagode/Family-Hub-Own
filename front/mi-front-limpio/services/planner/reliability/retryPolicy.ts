import type {
  PlannerNormalizedOperationError,
  PlannerRandomSource,
  PlannerRetryPolicyConfig,
} from './types';

export const DEFAULT_PLANNER_RETRY_POLICY: PlannerRetryPolicyConfig = {
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  maxAttempts: 5,
  jitterRatio: 0.2,
};

export function computePlannerRetryDelayMs(input: {
  attemptIndex: number;
  error?: PlannerNormalizedOperationError;
  config?: Partial<PlannerRetryPolicyConfig>;
  random?: PlannerRandomSource;
}): number {
  if (input.error?.retryAfterMs !== undefined) return Math.max(0, input.error.retryAfterMs);
  const config = { ...DEFAULT_PLANNER_RETRY_POLICY, ...input.config };
  const exponential = Math.min(config.baseDelayMs * (2 ** Math.max(0, input.attemptIndex)), config.maxDelayMs);
  const random = input.random?.next() ?? 0.5;
  const jitter = exponential * config.jitterRatio * ((random * 2) - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

export function isPlannerRetryableError(error: PlannerNormalizedOperationError): boolean {
  return [
    'network_retryable',
    'timeout_ambiguous',
    'rate_limited',
    'server_retryable',
    'unknown_retryable',
  ].includes(error.category);
}

export function hasPlannerRetryAttemptsRemaining(
  attemptCount: number,
  config: Partial<PlannerRetryPolicyConfig> = {},
): boolean {
  return attemptCount < { ...DEFAULT_PLANNER_RETRY_POLICY, ...config }.maxAttempts;
}
