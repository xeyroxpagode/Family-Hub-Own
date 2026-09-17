import type {
  PlanActivationReadiness,
  PlanCompletionBlocker,
  PlanCompletionReadiness,
  PlanExternalReferenceShape,
  PlanRequirementHierarchyNode,
  PlanStructureChangeset,
  PlanStructureIndicator,
  PlanStructureMutationOutcome,
  PlanStructureMutationResult,
  PlanStructureOperation,
  PlanStructureSnapshot,
  PlannerPlan,
  PlannerPlanGraphDto,
  PlannerPlanManualCondition,
  PlannerPlanMeasurement,
  PlannerPlanMilestone,
  PlannerPlanRequirement,
} from '../../types/PlannerPlan';

// ---------------------------------------------------------------------------
// 1. DTO ADAPTERS (backend raw -> canonical Plan structure snapshot)
// ---------------------------------------------------------------------------

const DEFAULT_DRAFT_ISOLATION = {
  contained: true,
  operationalChildrenPublished: false,
  appearsInHome: false,
  notifies: false,
  recurs: false,
};

export function toPlanStructureSnapshot(raw: Readonly<Record<string, unknown>>): PlanStructureSnapshot {
  const plan = (raw.plan ?? {}) as Record<string, unknown>;
  const indicators = (raw.indicators ?? {}) as Record<string, number>;
  const trashedAt = (plan.trashedAt ?? plan.trashed_at ?? null) as string | null;
  const rawLifecycle = String(plan.lifecycle ?? 'draft');
  const lifecycle = (trashedAt || rawLifecycle === 'trash') ? 'trash' as const : rawLifecycle as PlannerPlan['lifecycle'];

  return {
    plan: {
      id: String(plan.id ?? ''),
      version: Number(plan.version ?? 0),
      scope: String(plan.scope ?? 'personal') as PlannerPlan['scope'],
      ownerPersonId: (plan.ownerPersonId ?? plan.owner_person_id ?? null) as string | null,
      householdId: (plan.householdId ?? plan.household_id ?? null) as string | null,
      objective: String(plan.objective ?? ''),
      description: (typeof plan.description === 'string' ? plan.description : null) as string | null,
      lifecycle,
      targetDate: (plan.targetDate ?? plan.target_date ?? null) as string | null,
      finalizationKind: (plan.finalizationKind ?? plan.finalization_kind ?? 'none') as PlannerPlan['finalizationKind'],
      archivedAt: (plan.archivedAt ?? plan.archived_at ?? null) as string | null,
      trashedAt: trashedAt,
      createdAt: String(plan.createdAt ?? plan.created_at ?? ''),
      updatedAt: String(plan.updatedAt ?? plan.updated_at ?? ''),
      availableActions: (Array.isArray(plan.availableActions) ? plan.availableActions : []) as readonly string[],
    },
    indicators: {
      milestoneCount: Number(indicators.milestone_count ?? indicators.milestoneCount ?? 0),
      completedMilestoneCount: Number(indicators.completed_milestone_count ?? indicators.completedMilestoneCount ?? 0),
      measurementCount: Number(indicators.measurement_count ?? indicators.measurementCount ?? 0),
      reachedMeasurementCount: Number(indicators.reached_measurement_count ?? indicators.reachedMeasurementCount ?? 0),
      necessaryRequirementCount: Number(indicators.necessary_requirement_count ?? indicators.necessaryRequirementCount ?? 0),
      satisfiedNecessaryRequirementCount: Number(indicators.satisfied_necessary_requirement_count ?? indicators.satisfiedNecessaryRequirementCount ?? 0),
      supportingRequirementCount: Number(indicators.supporting_requirement_count ?? indicators.supportingRequirementCount ?? 0),
    },
    milestones: adaptMilestones(raw),
    measurements: adaptMeasurements(raw),
    manualConditions: adaptManualConditions(raw),
    requirements: adaptRequirements(raw),
    draftIsolation: (raw.draftIsolation ?? raw.draft_isolation ?? DEFAULT_DRAFT_ISOLATION) as PlannerPlanGraphDto['draftIsolation'],
  };
}

function adaptMilestones(raw: { readonly milestones?: readonly Record<string, unknown>[] }): readonly PlannerPlanMilestone[] {
  return (raw.milestones ?? []).map((row) => ({
    id: String(row.id ?? ''),
    planId: String(row.planId ?? row.plan_id ?? ''),
    version: Number(row.version ?? 0),
    title: String(row.title ?? ''),
    description: (row.description ?? null) as string | null,
    completionMode: (row.completionMode ?? row.completion_mode ?? 'manual') as PlannerPlanMilestone['completionMode'],
    lifecycle: (row.trashed_at ? 'trash' : row.lifecycle ?? 'pending') as PlannerPlanMilestone['lifecycle'],
    classification: (row.classification ?? 'supporting') as PlannerPlanMilestone['classification'],
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
  }));
}

function adaptMeasurements(raw: { readonly measurements?: readonly Record<string, unknown>[] }): readonly PlannerPlanMeasurement[] {
  return (raw.measurements ?? []).map((row) => ({
    id: String(row.id ?? ''),
    planId: String(row.planId ?? row.plan_id ?? ''),
    version: Number(row.version ?? 0),
    name: String(row.name ?? ''),
    currentValue: Number(row.currentValue ?? row.current_value ?? 0),
    targetValue: (row.targetValue ?? row.target_value ?? null) as number | null,
    unit: String(row.unit ?? ''),
    targetOperator: (row.targetOperator ?? row.target_operator ?? 'gte') as PlannerPlanMeasurement['targetOperator'],
    targetReached: Boolean(row.targetReached ?? false),
    classification: (row.classification ?? 'supporting') as PlannerPlanMeasurement['classification'],
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    history: Array.isArray(row.history) ? (row.history as Record<string, unknown>[]).map((entry) => ({
      id: String(entry.id ?? ''),
      value: Number(entry.value ?? 0),
      previousValue: (entry.previousValue ?? entry.previous_value ?? null) as number | null,
      correctionOfId: (entry.correctionOfId ?? entry.correction_of_id ?? null) as string | null,
      recordedAt: String(entry.recordedAt ?? entry.recorded_at ?? ''),
    })) : [],
  }));
}

function adaptManualConditions(raw: { readonly manualConditions?: readonly Record<string, unknown>[] }): readonly PlannerPlanManualCondition[] {
  return (raw.manualConditions ?? []).map((row) => ({
    id: String(row.id ?? ''),
    planId: String(row.planId ?? row.plan_id ?? ''),
    version: Number(row.version ?? 0),
    label: String(row.label ?? ''),
    isSatisfied: Boolean(row.isSatisfied ?? row.is_satisfied ?? false),
    classification: (row.classification ?? 'supporting') as PlannerPlanManualCondition['classification'],
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
  }));
}

function adaptRequirements(raw: { readonly requirements?: readonly Record<string, unknown>[] }): readonly PlannerPlanRequirement[] {
  return (raw.requirements ?? []).map((row) => ({
    id: String(row.id ?? ''),
    planId: String(row.planId ?? row.plan_id ?? ''),
    parentRequirementId: (row.parentRequirementId ?? row.parent_requirement_id ?? null) as string | null,
    version: Number(row.version ?? 0),
    classification: (row.classification ?? 'supporting') as PlannerPlanRequirement['classification'],
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    subject: adaptRequirementSubject(row),
    satisfied: Boolean(row.satisfied ?? false),
  }));
}

function adaptRequirementSubject(row: Record<string, unknown>): PlannerPlanRequirement['subject'] {
  const subjectType = row.subjectType ?? row.subject_type;
  if (subjectType === 'external') {
    const linked = (row.linkedEntity ?? row.linked_entity) as Record<string, unknown> | undefined;
    return {
      kind: 'external',
      externalKind: (row.externalKind ?? row.external_kind ?? 'task') as 'task' | 'event',
      externalReferenceKey: String(row.externalReferenceKey ?? row.external_reference_key ?? ''),
      externalEntityId: (row.externalEntityId ?? row.external_entity_id ?? row.external_reference_key ?? null) as string | null,
      bindingState: ((linked?.availability === 'available') ? 'bound' : 'unavailable') as 'bound' | 'unavailable',
      linkedEntity: linked ? {
        entityType: String(linked.entityType ?? linked.entity_type ?? 'task') as 'task' | 'event',
        externalEntityId: String(linked.externalEntityId ?? linked.external_entity_id ?? ''),
        planRequirementId: (linked.planRequirementId ?? linked.plan_requirement_id ?? null) as string | null,
        title: (linked.title ?? null) as string | null,
        lifecycle: (linked.lifecycle ?? null) as string | null,
        relationKind: (linked.relationKind ?? linked.relation_kind ?? 'supporting') as 'necessary' | 'supporting',
        availability: (linked.availability ?? 'missing') as 'available' | 'missing' | 'trashed' | 'forbidden' | 'stale',
      } : null,
    };
  }
  if (subjectType === 'milestone') return { kind: 'milestone', milestoneId: String(row.milestoneId ?? row.milestone_id ?? '') };
  if (subjectType === 'measurement') return { kind: 'measurement', measurementId: String(row.measurementId ?? row.measurement_id ?? '') };
  return { kind: 'manual_condition', manualConditionId: String(row.manualConditionId ?? row.manual_condition_id ?? '') };
}

// ---------------------------------------------------------------------------
// 2. CHANGESET BUILDER (canonical -> backend DTO)
// ---------------------------------------------------------------------------

export function buildChangeset(
  planId: string,
  expectedPlanVersion: number,
  operations: readonly PlanStructureOperation[],
): PlanStructureChangeset {
  return { planId, expectedPlanVersion, operations: [...operations] };
}

export function operationsToBackendPayload(
  operations: readonly PlanStructureOperation[],
): readonly Readonly<Record<string, unknown>>[] {
  return operations.map((op, index) => ({
    localId: op.localId,
    entityType: op.entityType,
    action: mapOperationKindToAction(op.operation),
    entityId: op.entityId ?? null,
    expectedVersion: op.expectedVersion ?? null,
    parentRequirementId: op.payload.parent_requirement_id ?? null,
    classification: op.payload.classification ?? null,
    sortOrder: op.payload.sort_order ?? index,
    payload: op.payload,
  }));
}

function mapOperationKindToAction(kind: PlanStructureOperation['operation']): string {
  switch (kind) {
    case 'add': return 'create';
    case 'update': return 'update';
    case 'trash': return 'trash';
    case 'restore': return 'restore';
    case 'reorder': return 'update';
    case 'parent_change': return 'update';
  }
}

// ---------------------------------------------------------------------------
// 3. CHANGESET CONTRACT VALIDATION
// ---------------------------------------------------------------------------

export function changesetHasOperations(cst: PlanStructureChangeset): boolean {
  return cst.operations.length > 0;
}

export function changesetHasPlanVersion(cst: PlanStructureChangeset): boolean {
  return Number.isInteger(cst.expectedPlanVersion) && cst.expectedPlanVersion >= 1;
}

export function validateChangeset(cst: PlanStructureChangeset): readonly string[] {
  const errors: string[] = [];
  if (!cst.planId) errors.push('plan_id_required');
  if (!changesetHasPlanVersion(cst)) errors.push('expected_plan_version_required');
  const ids = new Set<string>();
  for (const op of cst.operations) {
    if (!op.localId) errors.push('operation_local_id_required');
    if (!['milestone', 'measurement', 'manual_condition', 'requirement'].includes(op.entityType)) {
      errors.push(`operation_entity_invalid:${op.localId}`);
    }
    if (!['add', 'update', 'trash', 'restore', 'reorder', 'parent_change'].includes(op.operation)) {
      errors.push(`operation_kind_invalid:${op.localId}`);
    }
    if (op.entityType === 'requirement' && op.operation === 'parent_change') {
      const parentId = op.payload.parent_requirement_id as string | undefined;
      if (parentId === op.entityId) errors.push(`requirement_self_parent:${op.localId}`);
    }
    if (ids.has(op.localId)) errors.push(`operation_duplicate_local_id:${op.localId}`);
    ids.add(op.localId);
  }
  return errors as Readonly<readonly string[]>;
}

export function versionsMatch(expected: number, actualPlanVersion: number): boolean {
  return expected === actualPlanVersion;
}

export function mutationResultOutcome(
  result: { readonly outcome?: string; readonly version?: number },
  previousVersion: number,
): PlanStructureMutationOutcome {
  const outcome = result.outcome;
  if (outcome === 'noop' || outcome === 'replay') return outcome as PlanStructureMutationOutcome;
  if (outcome === 'version_conflict' || outcome === 'invalid_transition') return outcome as PlanStructureMutationOutcome;
  if (typeof result.version === 'number' && result.version > previousVersion) return 'confirmed';
  return 'rollback';
}

// ---------------------------------------------------------------------------
// 4. REQUIREMENT HIERARCHY VALIDATION
// ---------------------------------------------------------------------------

export function validateRequirementsSamePlan(
  requirement: PlannerPlanRequirement,
  parentRequirementId: string | null,
  allRequirements: readonly PlannerPlanRequirement[],
): readonly string[] {
  const errors: string[] = [];
  if (requirement.id === parentRequirementId) {
    errors.push('requirement_self_parent');
    return errors;
  }
  if (parentRequirementId === null) return errors;
  const parent = allRequirements.find((r) => r.id === parentRequirementId);
  if (!parent) {
    errors.push('requirement_parent_not_found');
    return errors;
  }
  if (parent.planId !== requirement.planId) {
    errors.push('requirement_parent_different_plan');
  }
  return errors;
}

export function detectRequirementCycle(
  requirementId: string,
  candidateParentId: string,
  allRequirements: readonly PlannerPlanRequirement[],
): readonly string[] {
  const errors: string[] = [];
  if (requirementId === candidateParentId) {
    errors.push('requirement_cycle_self_parent');
    return errors;
  }
  const visited = new Set<string>();
  let current: string | null = candidateParentId;
  while (current) {
    if (visited.has(current)) {
      errors.push('requirement_cycle_detected');
      return errors;
    }
    if (current === requirementId) {
      errors.push('requirement_cycle_includes_self');
      return errors;
    }
    visited.add(current);
    const parent = allRequirements.find((r) => r.id === current);
    current = parent?.parentRequirementId ?? null;
  }
  return errors;
}

export function childrenStable(
  requirements: readonly PlannerPlanRequirement[],
  parentId: string | null,
): readonly PlannerPlanRequirement[] {
  const filtered = requirements.filter((r) => r.parentRequirementId === parentId);
  return [...filtered].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

export function topLevelRequirements(
  requirements: readonly PlannerPlanRequirement[],
): readonly PlannerPlanRequirement[] {
  return childrenStable(requirements, null);
}

export function getChildren(
  requirements: readonly PlannerPlanRequirement[],
  parentId: string,
): readonly PlannerPlanRequirement[] {
  return childrenStable(requirements, parentId);
}

export function buildRequirementTree(
  allRequirements: readonly PlannerPlanRequirement[],
  parentId: string | null = null,
): readonly PlanRequirementHierarchyNode[] {
  return childrenStable(allRequirements, parentId).map((r) => ({
    id: r.id,
    parentRequirementId: r.parentRequirementId,
    sortOrder: r.sortOrder,
    children: buildRequirementTree(allRequirements, r.id),
  }));
}

export function countUnsatisfiedNecessaryTopLevel(
  requirements: readonly PlannerPlanRequirement[],
): number {
  return requirements.filter(
    (r) => r.parentRequirementId === null && r.classification === 'necessary' && !r.satisfied,
  ).length;
}

// ---------------------------------------------------------------------------
// 5. ACTIVATION READINESS PROJECTION
// ---------------------------------------------------------------------------

export function projectActivationReadiness(snapshot: PlanStructureSnapshot): PlanActivationReadiness {
  const activeMilestones = snapshot.milestones.filter((m) => m.lifecycle !== 'trash');
  const hasUsefulStructure = activeMilestones.length > 0
    || snapshot.measurements.length > 0
    || snapshot.manualConditions.length > 0;

  if (!hasUsefulStructure) return 'NO_USEFUL_STRUCTURE';

  const hasUnboundNecessaryExternal = snapshot.requirements.some(
    (r) => r.classification === 'necessary' && r.subject.kind === 'external' && r.subject.bindingState === 'unavailable',
  );

  if (hasUnboundNecessaryExternal) return 'NECESSARY_REQUIREMENT_PENDING';

  return 'READY';
}

export function activationReadinessLabel(readiness: PlanActivationReadiness): string {
  switch (readiness) {
    case 'NO_USEFUL_STRUCTURE': return 'Agrega al menos un hito, medicion o condicion manual para poder activar.';
    case 'NECESSARY_REQUIREMENT_PENDING': return 'Hay un requisito necesario con vinculo externo no resuelto.';
    case 'READY': return 'La estructura parece suficiente. El backend tiene la palabra final.';
    case 'BACKEND_ONLY_UNKNOWN': return 'No se pudo evaluar la estructura localmente.';
  }
}

// Activation matrix for reference (frontend projection only, backend always authoritative)
export const ACTIVATION_MATRIX: ReadonlyArray<{
  readonly scenario: string;
  readonly localProjection: PlanActivationReadiness;
}> = [
  { scenario: 'Plan con 0 nodos utiles', localProjection: 'NO_USEFUL_STRUCTURE' },
  { scenario: '1 milestone activo, 0 ext requisites', localProjection: 'READY' },
  { scenario: '1 measurement, 0 ext', localProjection: 'READY' },
  { scenario: '1 condicion manual, 0 ext', localProjection: 'READY' },
  { scenario: 'Solo requirements necesarios, sin nodos', localProjection: 'NO_USEFUL_STRUCTURE' },
  { scenario: 'Nodo valido + req externa necessary no bound', localProjection: 'NECESSARY_REQUIREMENT_PENDING' },
  { scenario: 'Nodo valido + req externa necessary bound', localProjection: 'READY' },
  { scenario: 'Solo nodo en trashed', localProjection: 'NO_USEFUL_STRUCTURE' },
  { scenario: 'Nodo valido + 1 req necesario no bound', localProjection: 'NECESSARY_REQUIREMENT_PENDING' },
  { scenario: 'Nodo valido + todos los req externos resueltos', localProjection: 'READY' },
];

// ---------------------------------------------------------------------------
// 6. COMPLETION READINESS PROJECTION
// ---------------------------------------------------------------------------

export function projectCompletionReadiness(
  snapshot: PlanStructureSnapshot,
  options: { readonly confirmUnresolved?: boolean } = {},
): PlanCompletionReadiness {
  const blockers: PlanCompletionBlocker[] = [];

  if (snapshot.plan.lifecycle === 'completed') {
    return { canComplete: false, blockers: [{ kind: 'already_completed', label: 'El plan ya esta completado.' }] };
  }

  if (snapshot.plan.lifecycle !== 'active' && snapshot.plan.lifecycle !== 'paused') {
    return { canComplete: false, blockers: [{ kind: 'not_active', label: 'Solo se pueden completar planes activos o pausados.' }] };
  }

  const pendingNecessary = snapshot.requirements.filter(
    (r) => r.parentRequirementId === null && r.classification === 'necessary' && !r.satisfied,
  );

  if (pendingNecessary.length > 0 && !options.confirmUnresolved) {
    return {
      canComplete: false,
      blockers: [{
        kind: 'necessary_requirements_pending',
        requirementIds: pendingNecessary.map((r) => r.id),
        label: `${pendingNecessary.length} requisitos necesarios pendientes. Confirma forzar completado.`,
      }],
    };
  }

  return { canComplete: true, blockers: [] };
}

// ---------------------------------------------------------------------------
// 7. SCOPE ISOLATION
// ---------------------------------------------------------------------------

export function validatePlanScopeIsolation(
  plan: PlannerPlan,
  candidateOperations: readonly PlanStructureOperation[],
): { readonly valid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];
  for (const t of candidateOperations) {
    if (t.payload.plan_id && t.payload.plan_id !== plan.id) {
      errors.push(`node_references_different_plan:${t.localId}`);
    }
    if (plan.scope === 'personal' && t.payload.household_id) {
      errors.push(`personal_plan_household_reference:${t.localId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 8. EXTERNAL REFERENCES (Task/Event opaque)
// ---------------------------------------------------------------------------

export function extractExternalReferences(
  snapshot: PlanStructureSnapshot,
): readonly PlanExternalReferenceShape[] {
  return snapshot.requirements
    .filter((r) => r.subject.kind === 'external')
    .map((r) => {
      const ext = r.subject as Extract<typeof r.subject, { kind: 'external' }>;
      return {
        externalReferenceType: ext.externalKind,
        externalReferenceId: ext.externalEntityId ?? ext.externalReferenceKey ?? null,
        necessary: r.classification === 'necessary',
        satisfied: r.satisfied,
      };
    });
}

// ---------------------------------------------------------------------------
// 9. INDICATORS DERIVATION (separate from percentage)
// ---------------------------------------------------------------------------

export function deriveMilestoneIndicator(snapshot: PlanStructureSnapshot): {
  readonly completed: number;
  readonly total: number;
} {
  const active = snapshot.milestones.filter((m) => m.lifecycle !== 'trash');
  return {
    completed: active.filter((m) => m.lifecycle === 'completed').length,
    total: active.length,
  };
}

export function deriveMeasurementIndicator(snapshot: PlanStructureSnapshot): {
  readonly total: number;
  readonly reached: number;
} {
  return {
    total: snapshot.measurements.length,
    reached: snapshot.measurements.filter((m) => m.targetReached).length,
  };
}

export function deriveManualConditionIndicator(snapshot: PlanStructureSnapshot): {
  readonly total: number;
  readonly satisfied: number;
} {
  return {
    total: snapshot.manualConditions.length,
    satisfied: snapshot.manualConditions.filter((c) => c.isSatisfied).length,
  };
}

export function deriveRequirementIndicator(snapshot: PlanStructureSnapshot): {
  readonly total: number;
  readonly necessary: number;
  readonly satisfied: number;
} {
  return {
    total: snapshot.requirements.length,
    necessary: snapshot.requirements.filter((r) => r.classification === 'necessary').length,
    satisfied: snapshot.requirements.filter((r) => r.satisfied).length,
  };
}
