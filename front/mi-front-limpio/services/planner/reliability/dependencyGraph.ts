import type { PlannerOperationRecord } from './types';

export type PlannerDependencyDecision =
  | { executable: true }
  | { executable: false; reason: 'missing' | 'pending' | 'uncertain' | 'conflicted' | 'cycle'; dependencyId?: string };

export function detectPlannerDependencyCycle(operations: readonly PlannerOperationRecord[]): string[] | null {
  const byId = new Map(operations.map((operation) => [operation.descriptor.localOperationId, operation]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    if (visiting.has(id)) {
      return stack.slice(stack.indexOf(id)).concat(id);
    }
    if (visited.has(id)) return null;
    const operation = byId.get(id);
    if (!operation) return null;
    visiting.add(id);
    stack.push(id);
    for (const dependencyId of operation.descriptor.dependencies) {
      const cycle = visit(dependencyId);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    visited.add(id);
    stack.pop();
    return null;
  }

  for (const operation of operations) {
    const cycle = visit(operation.descriptor.localOperationId);
    if (cycle) return cycle;
  }
  return null;
}

export function evaluatePlannerOperationDependencies(
  operation: PlannerOperationRecord,
  operations: readonly PlannerOperationRecord[],
): PlannerDependencyDecision {
  const cycle = detectPlannerDependencyCycle(operations);
  if (cycle?.includes(operation.descriptor.localOperationId)) {
    return { executable: false, reason: 'cycle', dependencyId: cycle[0] };
  }
  const byId = new Map(operations.map((item) => [item.descriptor.localOperationId, item]));
  for (const dependencyId of operation.descriptor.dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) return { executable: false, reason: 'missing', dependencyId };
    if (dependency.state === 'conflicted') return { executable: false, reason: 'conflicted', dependencyId };
    if (dependency.state === 'uncertain' || dependency.state === 'in_flight') return { executable: false, reason: 'uncertain', dependencyId };
    if (dependency.state !== 'confirmed') return { executable: false, reason: 'pending', dependencyId };
  }
  return { executable: true };
}

export function sortPlannerOperationsByDependency(
  operations: readonly PlannerOperationRecord[],
): PlannerOperationRecord[] {
  const byId = new Map(operations.map((operation) => [operation.descriptor.localOperationId, operation]));
  const sorted: PlannerOperationRecord[] = [];
  const seen = new Set<string>();
  function visit(operation: PlannerOperationRecord): void {
    if (seen.has(operation.descriptor.localOperationId)) return;
    seen.add(operation.descriptor.localOperationId);
    for (const dependencyId of operation.descriptor.dependencies) {
      const dependency = byId.get(dependencyId);
      if (dependency) visit(dependency);
    }
    sorted.push(operation);
  }
  operations.forEach(visit);
  return sorted;
}
