export type PlannerDurableOperationState =
  | 'pending'
  | 'in_flight'
  | 'uncertain'
  | 'retrying'
  | 'conflicted'
  | 'confirmed';

export type PlannerOperationScope =
  | { kind: 'personal'; ownerId: string }
  | { kind: 'household'; householdId: string };

export type PlannerOperationPartition = {
  authenticatedUserId: string;
  activeHouseholdId?: string | null;
};

export type PlannerOperationEntity = {
  type: string;
  id?: string;
};

export type PlannerPendingOperation<TPayload = unknown> = {
  schemaVersion: 1;
  localOperationId: string;
  mutationId: string;
  idempotencyKey: string;
  requestHash: string;
  domain: string;
  operationType: string;
  ownerPartition: {
    authenticatedUserId: string;
  };
  scope: PlannerOperationScope;
  entity?: PlannerOperationEntity;
  expectedVersion?: number;
  payload: TPayload;
  dependencies: string[];
  createdAt: string;
};

export type PlannerConflictKind =
  | 'version_conflict'
  | 'idempotency_conflict'
  | 'authorization_blocked'
  | 'validation_failed'
  | 'retry_exhausted'
  | 'manual_review'
  | 'scope_mismatch'
  | 'dependency_failed'
  | 'unknown_non_retryable';

export type PlannerNormalizedConflict = {
  kind: PlannerConflictKind;
  stableCode: string;
  expectedVersion?: number;
  currentVersion?: number;
  authoritativeState?: unknown;
  metadata?: Record<string, unknown>;
};

export type PlannerNormalizedOperationError = {
  category:
    | 'network_retryable'
    | 'timeout_ambiguous'
    | 'rate_limited'
    | 'server_retryable'
    | 'version_conflict'
    | 'idempotency_conflict'
    | 'validation'
    | 'authorization'
    | 'not_found'
    | 'unknown_retryable'
    | 'unknown_non_retryable';
  stableCode: string;
  retryAfterMs?: number;
  requestId?: string | null;
  status?: number;
  details?: unknown;
};

export type PlannerAuthoritativeMutationOutcome = 'created' | 'updated' | 'noop' | 'replay';

export type PlannerAuthoritativeMutationResult<TResult = unknown> = {
  outcome: PlannerAuthoritativeMutationOutcome;
  data?: TResult;
  version?: number;
  requestId?: string | null;
  operationId?: string | null;
};

export type PlannerReconciliationOutcome = {
  applied: boolean;
  invalidationRequested?: boolean;
  refetchRequested?: boolean;
  metadata?: Record<string, unknown>;
};

export type PlannerOperationAttemptMetadata = {
  attemptStartedAt?: string;
  attemptFinishedAt?: string;
  requestStartedAt?: string;
  requestId?: string | null;
  requestMayHaveReachedServer: boolean;
  lastError?: PlannerNormalizedOperationError;
};

export type PlannerOperationRecord<TPayload = unknown, TResult = unknown> = {
  descriptor: PlannerPendingOperation<TPayload>;
  state: PlannerDurableOperationState;
  attemptCount: number;
  nextRetryAt?: string;
  updatedAt: string;
  confirmedAt?: string;
  authoritativeResult?: PlannerAuthoritativeMutationResult<TResult>;
  reconciliationAppliedAt?: string;
  conflict?: PlannerNormalizedConflict;
  quarantineReason?: string;
  attempt: PlannerOperationAttemptMetadata;
};

export type PlannerOperationExecutionContext = {
  accessToken: string;
  partition: PlannerOperationPartition;
  now(): Date;
  signal?: AbortSignal | null;
  timeoutMs?: number;
};

export type PlannerReliabilityDomainAdapter<TPayload = unknown, TResult = unknown> = {
  domain: string;
  execute(
    operation: PlannerOperationRecord<TPayload, TResult>,
    context: PlannerOperationExecutionContext,
  ): Promise<PlannerAuthoritativeMutationResult<TResult>>;
  reconcile(
    operation: PlannerOperationRecord<TPayload, TResult>,
    result: PlannerAuthoritativeMutationResult<TResult>,
  ): Promise<PlannerReconciliationOutcome>;
  classifyConflict?(
    operation: PlannerOperationRecord<TPayload, TResult>,
    error: PlannerNormalizedOperationError,
  ): PlannerNormalizedConflict;
  canSupersedePendingOperation?(
    previous: PlannerOperationRecord<TPayload, TResult>,
    next: PlannerOperationRecord<TPayload, TResult>,
  ): boolean;
  isRealtimeSignalRelated?(
    operation: PlannerOperationRecord<TPayload, TResult>,
    signal: PlannerReliabilityRealtimeSignal,
  ): boolean;
};

export type PlannerDurableOperationStore = {
  hydrate(partition: PlannerOperationPartition): Promise<PlannerOperationRecord[]>;
  get(partition: PlannerOperationPartition, localOperationId: string): Promise<PlannerOperationRecord | null>;
  put(partition: PlannerOperationPartition, operation: PlannerOperationRecord): Promise<void>;
  remove(partition: PlannerOperationPartition, localOperationId: string): Promise<void>;
  list(partition: PlannerOperationPartition): Promise<PlannerOperationRecord[]>;
  replaceAll?(partition: PlannerOperationPartition, operations: PlannerOperationRecord[]): Promise<void>;
};

export type PlannerRetryPolicyConfig = {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  jitterRatio: number;
};

export type PlannerClock = {
  now(): Date;
  setTimeout?(callback: () => void, delayMs: number): unknown;
  clearTimeout?(handle: unknown): void;
};

export type PlannerRandomSource = {
  next(): number;
};

export type PlannerReliabilityRealtimeSignal = {
  signalId?: string;
  domain: string;
  entityType: string;
  entityId: string;
  scope: PlannerOperationScope;
  version?: number;
  occurredAt?: string;
};

export type PlannerReliabilityEventName =
  | 'operation_enqueued'
  | 'operation_deduplicated'
  | 'operation_started'
  | 'operation_marked_uncertain'
  | 'operation_retry_scheduled'
  | 'operation_conflicted'
  | 'operation_confirmed'
  | 'operation_reconciled'
  | 'operation_discarded_unsent'
  | 'operation_cleanup'
  | 'operation_rehydrated'
  | 'operation_scope_blocked'
  | 'realtime_signal_received'
  | 'reconciliation_requested'
  | 'storage_record_quarantined';

export type PlannerReliabilityEvent = {
  name: PlannerReliabilityEventName;
  at: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type PlannerReliabilityObserver = {
  emit(event: PlannerReliabilityEvent): void | Promise<void>;
};
