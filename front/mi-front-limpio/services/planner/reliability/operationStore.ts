import {
  recoverPersistedPlannerOperation,
} from './operationStateMachine';
import type {
  PlannerDurableOperationStore,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerOperationScope,
} from './types';

export type PlannerReliabilityAsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const STORAGE_PREFIX = '@homeplus/planner/reliability/operations/v1';

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

export function validatePlannerOperationRecord(value: unknown): PlannerOperationRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as PlannerOperationRecord;
  const descriptor = record.descriptor;
  if (!descriptor || descriptor.schemaVersion !== 1) return null;
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
    || typeof descriptor.createdAt !== 'string'
  ) {
    return null;
  }
  if (!['pending', 'in_flight', 'uncertain', 'retrying', 'conflicted', 'confirmed'].includes(record.state)) return null;
  if (typeof record.attemptCount !== 'number' || record.attemptCount < 0) return null;
  if (!record.attempt || typeof record.attempt.requestMayHaveReachedServer !== 'boolean') return null;
  return record;
}

function parseStoredOperations(raw: string | null): { records: PlannerOperationRecord[]; quarantined: number } {
  if (raw === null) return { records: [], quarantined: 0 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { records: [], quarantined: 1 };
  }
  const values = Array.isArray(parsed) ? parsed : (parsed as { operations?: unknown[] })?.operations;
  if (!Array.isArray(values)) return { records: [], quarantined: 1 };
  const records: PlannerOperationRecord[] = [];
  let quarantined = 0;
  for (const value of values) {
    const record = validatePlannerOperationRecord(value);
    if (record) records.push(record);
    else quarantined += 1;
  }
  return { records, quarantined };
}

export function createPlannerDurableOperationStore(
  storage: PlannerReliabilityAsyncStorageLike,
  now: () => Date = () => new Date(),
): PlannerDurableOperationStore {
  async function read(partition: PlannerOperationPartition): Promise<PlannerOperationRecord[]> {
    const parsed = parseStoredOperations(await storage.getItem(buildPlannerOperationPartitionKey(partition)));
    return parsed.records;
  }

  async function write(partition: PlannerOperationPartition, operations: PlannerOperationRecord[]): Promise<void> {
    await storage.setItem(
      buildPlannerOperationPartitionKey(partition),
      JSON.stringify({ schemaVersion: 1, operations }),
    );
  }

  return {
    async hydrate(partition) {
      const hydrated = (await read(partition)).map((operation) => recoverPersistedPlannerOperation(operation, now()));
      await write(partition, hydrated);
      return hydrated;
    },
    async get(partition, localOperationId) {
      return (await read(partition)).find((operation) => operation.descriptor.localOperationId === localOperationId) ?? null;
    },
    async put(partition, operation) {
      const operations = await read(partition);
      const index = operations.findIndex((item) => item.descriptor.localOperationId === operation.descriptor.localOperationId);
      if (index === -1) operations.push(operation);
      else operations[index] = operation;
      await write(partition, operations);
    },
    async remove(partition, localOperationId) {
      await write(partition, (await read(partition)).filter((operation) => operation.descriptor.localOperationId !== localOperationId));
    },
    async list(partition) {
      return read(partition);
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
