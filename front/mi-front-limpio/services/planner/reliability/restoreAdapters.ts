/**
 * Planner V1 — 11A.2A Reliability restore adapters for Goals/Milestones.
 *
 * IR-11A-RELIABILITY-001 corrects the direct HTTP bypasses in Trash restore:
 * `restoreGoal` and `restoreGoalMilestone` used `requestJson` directly,
 * omitting Reliability runtime concerns (mutation identity, retry, replay/noop,
 * lost response, late response, household switch invalidation).
 *
 * These helpers route the existing canonical HTTP endpoints through the
 * productive mutation runtime so restore:
 *   - preserves mutation identity across retries;
 *   - does not claim success before canonical confirmation;
 *   - discards stale late responses after household switch;
 *   - keeps offline/uncertain semantics contract-aligned.
 *
 * The Plan adapter (`productiveAdapters.ts`) handles the new operation types
 * `goal.restore` and `goal.milestone.restore` and delegates to the same
 * `restoreGoal` / `restoreGoalMilestone` HTTP helpers, but under runtime
 * supervision (queue, dedupe, retry policy, conflict detection).
 */

export {
  enqueuePlannerGoalRestore,
  enqueuePlannerMilestoneRestore,
} from './productiveMutations';
