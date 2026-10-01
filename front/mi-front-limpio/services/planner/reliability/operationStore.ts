import {
  recoverPersistedPlannerOperation,
} from './operationStateMachine';
import { emitPlannerReliabilityEvent } from './observability';
import { computePlannerRequestHash, validatePlannerExpectedVersion } from './operationIdentity';
import type {
  PlannerDurableOperationStore,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerOperationScope,
  PlannerReliabilityObserver,
} from './types';

export type PlannerReliabilityAsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const STORAGE_PREFIX = '@homeplus/planner/reliability/operations/v1';
const SUPPORTED_DURABLE_SCHEMA_VERSION = 1;
const REQUEST_HASH_PATTERN = /^fnv1a:[0-9a-f]{8}$/;

type PlannerStorageQuarantineReason =
  | 'invalid_json'
  | 'invalid_wrapper'
  | 'incompatible_schema'
  | 'invalid_operation_record'
  | 'invalid_expected_version'
  | 'invalid_request_material'
  | 'invalid_dependency'
  | 'incomplete_record';

type PlannerStorageQuarantineSource = 'parse' | 'wrapper' | 'schema' | 'record';

type PlannerStorageQuarantineFinding = {
  reason: PlannerStorageQuarantineReason;
  source: PlannerStorageQuarantineSource;
  count: number;
  schemaVersion?: number;
  operationKind?: string;
};

export function buildPlannerOperationPartitionKey(partition: PlannerOperationPartition): string {
  const household = partition.activeHouseholdId ?? 'personal';
  return `${STORAGE_PREFIX}/${partition.authenticatedUserId}/${household}`;
}

function isScope(value: unknown): value is PlannerOperationScope {
  if (!value || typeof value !== 'object') return false;
  const scope = value as Record<string, unknown>;
  return (scope.kind === 'personal' && typeof scope.ownerId === 'string')
    || (scope.kind === 'household' && typeof scope.householdId === 'string');
}

function isEntity(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entity = value as Record<string, unknown>;
  return typeof entity.type === 'string'
    && (entity.id === undefined || typeof entity.id === 'string');
}

function asSafeSchemaVersion(value: unknown): number | undefined {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    ? value
    : undefined;
}

function asSafeOperationKind(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-z0-9_.:-]{1,64}$/i.test(value) ? value : undefined;
}

function validatePlannerOperationRecordWithReason(value: unknown): {
  record: PlannerOperationRecord | null;
  reason?: PlannerStorageQuarantineReason;
  operationKind?: string;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { record: null, reason: 'incomplete_record' };
  }
  const record = value as PlannerOperationRecord;
  const descriptor = record.descriptor;
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    return { record: null, reason: 'incomplete_record' };
  }
  const operationKind = asSafeOperationKind((descriptor as { operationType?: unknown }).operationType);
  if (descriptor.schemaVersion !== SUPPORTED_DURABLE_SCHEMA_VERSION) {
    return { record: null, reason: 'incompatible_schema', operationKind };
  }
  if (
    typeof descriptor.localOperationId !== 'string'
    || typeof descriptor.mutationId !== 'string'
    || typeof descriptor.idempotencyKey !== 'string'
    || typeof descriptor.requestHash !== 'string'
    || typeof descriptor.domain !== 'string'
    || typeof descriptor.operationType !== 'string'
    || !descriptor.ownerPartition
    || typeof descriptor.ownerPartition.authenticatedUserId !== 'string'
    || !isScope(descriptor.scope)
    || !Array.isArray(descriptor.dependencies)
    || (descriptor.entity !== undefined && !isEntity(descriptor.entity))
    || typeof descriptor.createdAt !== 'string'
  ) {
    return { record: null, reason: 'incomplete_record', operationKind };
  }
  if (!REQUEST_HASH_PATTERN.test(descriptor.requestHash)) {
    return { record: null, reason: 'invalid_request_material', operationKind };
  }
  if (!descriptor.dependencies.every((dependency) => typeof dependency === 'string' && dependency.length > 0)) {
    return { record: null, reason: 'invalid_dependency', operationKind };
  }
  try {
    validatePlannerExpectedVersion(descriptor.expectedVersion, false);
  } catch {
    return { record: null, reason: 'invalid_expected_version', operationKind };
  }
  try {
    computePlannerRequestHash({
      domain: descriptor.domain,
      operationType: descriptor.operationType,
      scope: descriptor.scope,
      entity: descriptor.entity ?? null,
      expectedVersion: descriptor.expectedVersion ?? null,
      payload: descriptor.payload,
    });
  } catch {
    return { record: null, reason: 'invalid_request_material', operationKind };
  }
  if (!['pending', 'in_flight', 'uncertain', 'retrying', 'conflicted', 'confirmed'].includes(record.state)) {
    return { record: null, reason: 'incomplete_record', operationKind };
  }
  if (
    typeof record.attemptCount !== 'number'
    || !Number.isFinite(record.attemptCount)
    || !Number.isInteger(record.attemptCount)
    || record.attemptCount < 0
  ) {
    return { record: null, reason: 'incomplete_record', operationKind };
  }
  if (!record.attempt || typeof record.attempt.requestMayHaveReachedServer !== 'boolean') {
    return { record: null, reason: 'incomplete_record', operationKind };
  }
  return { record };
}

export function validatePlannerOperationRecord(value: unknown): PlannerOperationRecord | null {
  return validatePlannerOperationRecordWithReason(value).record;
}

function parseStoredOperations(raw: string | null): {
  records: PlannerOperationRecord[];
  quarantined: number;
  findings: PlannerStorageQuarantineFinding[];
  canRewrite: boolean;
} {
  if (raw === null) return { records: [], quarantined: 0, findings: [], canRewrite: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      records: [],
      quarantined: 1,
      findings: [{ reason: 'invalid_json', source: 'parse', count: 1 }],
      canRewrite: false,
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      records: [],
      quarantined: 1,
      findings: [{ reason: 'invalid_wrapper', source: 'wrapper', count: 1 }],
      canRewrite: false,
    };
  }
  const wrapper = parsed as { schemaVersion?: unknown; operations?: unknown };
  const safeSchemaVersion = asSafeSchemaVersion(wrapper.schemaVersion);
  if (wrapper.schemaVersion !== SUPPORTED_DURABLE_SCHEMA_VERSION) {
    return {
      records: [],
      quarantined: 1,
      findings: [{
        reason: safeSchemaVersion === undefined ? 'invalid_wrapper' : 'incompatible_schema',
        source: safeSchemaVersion === undefined ? 'wrapper' : 'schema',
        count: 1,
        schemaVersion: safeSchemaVersion,
      }],
      canRewrite: false,
    };
  }
  if (!Array.isArray(wrapper.operations)) {
    return {
      records: [],
      quarantined: 1,
      findings: [{
        reason: 'invalid_wrapper',
        source: 'wrapper',
        count: 1,
        schemaVersion: SUPPORTED_DURABLE_SCHEMA_VERSION,
      }],
      canRewrite: false,
    };
  }
  const records: PlannerOperationRecord[] = [];
  let quarantined = 0;
  const findings = new Map<string, PlannerStorageQuarantineFinding>();
  for (const value of wrapper.operations) {
    const validation = validatePlannerOperationRecordWithReason(value);
    if (validation.record) {
      records.push(validation.record);
    } else {
      quarantined += 1;
      const reason = validation.reason ?? 'invalid_operation_record';
      const source: PlannerStorageQuarantineSource = reason === 'incompatible_schema' ? 'schema' : 'record';
      const key = `${reason}:${source}:${validation.operationKind ?? ''}`;
      const existing = findings.get(key);
      if (existing) existing.count += 1;
      else findings.set(key, {
        reason,
        source,
        count: 1,
        schemaVersion: SUPPORTED_DURABLE_SCHEMA_VERSION,
        operationKind: validation.operationKind,
      });
    }
  }
  return { records, quarantined, findings: [...findings.values()], canRewrite: true };
}

async function emitStorageQuarantineFindings(
  observer: PlannerReliabilityObserver | undefined,
  findings: readonly PlannerStorageQuarantineFinding[],
  now: Date,
): Promise<void> {
  if (!observer) return;
  await Promise.all(findings.map((finding) => emitPlannerReliabilityEvent(
    observer,
    'storage_record_quarantined',
    null,
    {
      reason: finding.reason,
      source: finding.source,
      count: finding.count,
      schemaVersion: finding.schemaVersion ?? null,
      operationKind: finding.operationKind ?? null,
    },
    now,
  )));
}

export function createPlannerDurableOperationStore(
  storage: PlannerReliabilityAsyncStorageLike,
  now: () => Date = () => new Date(),
  observer?: PlannerReliabilityObserver,
): PlannerDurableOperationStore {
  async function read(partition: PlannerOperationPartition): Promise<{
    records: PlannerOperationRecord[];
    canRewrite: boolean;
  }> {
    const parsed = parseStoredOperations(await storage.getItem(buildPlannerOperationPartitionKey(partition)));
    await emitStorageQuarantineFindings(observer, parsed.findings, now());
    return { records: parsed.records, canRewrite: parsed.canRewrite };
  }

  async function write(partition: PlannerOperationPartition, operations: PlannerOperationRecord[]): Promise<void> {
    await storage.setItem(
      buildPlannerOperationPartitionKey(partition),
      JSON.stringify({ schemaVersion: 1, operations }),
    );
  }

  return {
    async hydrate(partition) {
      const parsed = await read(partition);
      const hydrated = parsed.records.map((operation) => recoverPersistedPlannerOperation(operation, now()));
      if (parsed.canRewrite) await write(partition, hydrated);
      return hydrated;
    },
    async get(partition, localOperationId) {
      return (await read(partition)).records.find((operation) => operation.descriptor.localOperationId === localOperationId) ?? null;
    },
    async put(partition, operation) {
      const operations = (await read(partition)).records;
      const index = operations.findIndex((item) => item.descriptor.localOperationId === operation.descriptor.localOperationId);
      if (index === -1) operations.push(operation);
      else operations[index] = operation;
      await write(partition, operations);
    },
    async remove(partition, localOperationId) {
      await write(partition, (await read(partition)).records.filter((operation) => operation.descriptor.localOperationId !== localOperationId));
    },
    async list(partition) {
      return (await read(partition)).records;
    },
    async replaceAll(partition, operations) {
      await write(partition, operations);
    },
  };
}

const liveAsyncStorage: PlannerReliabilityAsyncStorageLike = {
  getItem(key) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.getItem(key);
  },
  setItem(key, value) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.setItem(key, value);
  },
  removeItem(key) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.removeItem(key);
  },
};

export const plannerDurableOperationStore = createPlannerDurableOperationStore(liveAsyncStorage);

export function __testParseStoredOperations(raw: string | null): { records: PlannerOperationRecord[]; quarantined: number } {
  return parseStoredOperations(raw);
}
