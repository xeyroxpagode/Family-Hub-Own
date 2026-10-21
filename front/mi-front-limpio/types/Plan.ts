/**
 * Plan — canonical frontend contract for the product entity `Plan`.
 *
 * Single authority. `planner_goals` is the only Plan root, so the canonical
 * `Plan` id IS a `planner_goals.id`. Create, List, Detail and Edit must all
 * project this shape; there is no second Plan contract.
 *
 * Authority: PLANS_TECHNICAL_TRUTH_V1 §1.1 (one root), §1.2 (`goal_id` kept),
 * §2.1 (`visibility` is the persisted scope authority), §4 (lifecycle), §5
 * (archive is not lifecycle), §6 (trash is orthogonal), §19 (single frontend
 * contract).
 *
 * Legacy note: `PlannerPlanV1` is a compatibility alias of this type and
 * `PlannerGoal` / `PlannerPlan` remain legacy projections of retired
 * generations. They are not Plan authorities.
 */

/** Planner V1 exposes only Household Plans. Personal rows are compatibility-only. */
export type PlanScope = 'household';

export type PlanLifecycle =
  | 'preparation'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type Plan = {
  /** `planner_goals.id` — the same id space produced by Plan create. */
  id: string;
  title: string;
  description: string | null;
  /** Projection of the persisted `visibility` column; not a second authority. */
  scope: PlanScope;
  targetDate: string | null;
  lifecycle: PlanLifecycle;
  archivedAt: string | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  /**
   * Legacy aggregate carried for cutover only. It is not a persisted authority
   * and it is not a universal percentage; factual Progress replaces it.
   */
  progress?: {
    percentage: number | null;
    tasks?: { total: number; completed: number; pending: number };
    milestones?: { total: number; completed: number };
  };
  /**
   * SINGLE canonical action authority, projected by the server
   * (getPlanAvailableActions). The UI renders exactly this list; no local
   * lifecycle map may add or remove entries.
   */
  availableActions?: string[];
};

/**
 * Runtime mirror of the canonical Plan contract so the backend Plan DTO and
 * this type cannot drift silently.
 */
export const PLAN_CONTRACT_FIELDS = [
  'id',
  'title',
  'description',
  'scope',
  'targetDate',
  'lifecycle',
  'archivedAt',
  'trashedAt',
  'createdAt',
  'updatedAt',
  'version',
  'progress',
  'availableActions',
] as const;

export const PLAN_LIFECYCLE_VALUES: readonly PlanLifecycle[] = [
  'preparation',
  'active',
  'paused',
  'completed',
  'cancelled',
];

export const PLAN_SCOPE_VALUES: readonly PlanScope[] = ['household'];
