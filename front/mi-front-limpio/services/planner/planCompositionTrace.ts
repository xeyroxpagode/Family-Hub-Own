/**
 * REC-0A — Plan composition trace.
 *
 * Development-only diagnostics for the Plan lifecycle duplicate POST
 * investigation. Records each mount/unmount of the candidate Plan UI
 * surfaces so a single Activate tap can be traced back to:
 *  - how many Plan detail instances are alive,
 *  - how many form hosts are alive,
 *  - whether the legacy Goal detail and the canonical Plan detail are both
 *    mounted simultaneously.
 *
 * Mirror of `planWriteTrace.ts` shape (prefixed console.log under __DEV__)
 * so it composes with existing Reliability traces without touching
 * productive behaviour or backend contracts.
 *
 * Stages:
 *   - 'mount'           emitted once per component instance, at mount time
 *   - 'unmount'         emitted once per component instance, at unmount time
 *   - 'activate_handler' emitted from the Plan detail handler right before
 *                       `tracePlanWrite` takes over the Activate pipeline
 *
 * No PII, no mutation ids, no operation ids — component identity only:
 * `component` (stable name) and `instanceTag` (per-mount stable string).
 * `planTag` is optional and only emitted when the component already knows
 * the plan id at mount time (e.g. PlannerPlanDetailScreen which reads the
 * route param).
 *
 * Restrictions honoured:
 *   - no fix applied;
 *   - no debounce;
 *   - no legacy code removed;
 *   - no backend touched;
 *   - no reference-v1 touched;
 *   - no commit.
 */

import { useEffect, useMemo } from 'react';

export type PlanCompositionTraceStage = 'mount' | 'unmount' | 'activate_handler';

export type PlanCompositionTraceInput = {
  readonly component: string;
  readonly instanceTag: string;
  readonly stage: PlanCompositionTraceStage;
  readonly planTag?: string | null;
  readonly mutationTag?: string | null;
};

export function planCompositionTrace(input: PlanCompositionTraceInput): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  try {
    console.log('[PlanCompositionTrace]', {
      component: input.component,
      instanceTag: input.instanceTag,
      stage: input.stage,
      planTag: input.planTag ?? null,
      mutationTag: input.mutationTag ?? null,
    });
  } catch {
    // Development-only diagnostics must never affect mount/unmount.
  }
}

/**
 * Per-mount stable instance tag plus mount/unmount trace emission.
 *
 * Call once at the top of each instrumented component. Returns a string
 * token that is stable for the lifetime of the React instance and changes
 * if React remounts the component (which is exactly the signal REC-0A wants
 * to capture for duplicate-UI detection). Also wires a cleanup effect that
 * emits the `unmount` stage so we can detect which composition was alive at
 * the moment the Activate tap fired.
 *
 * `planTag` is captured at mount time only. Components that learn the plan
 * id later (e.g. via async fetch) should pass `null` here and rely on the
 * `planWriteTrace` mutationId correlation for the Activate pipeline.
 */
export function usePlanCompositionTrace(component: string, planTag?: string | null): string {
  const tag = useMemo(() => `pc:${Math.random().toString(36).slice(2, 10)}`, []);
  // Mount trace: emit synchronously on first render so the log appears
  // before any child effect can fire (and before any Activate handler can
  // ever run), even on a slow first paint.
  planCompositionTrace({ component, instanceTag: tag, stage: 'mount', planTag: planTag ?? null });
  useEffect(() => {
    return () => {
      planCompositionTrace({ component, instanceTag: tag, stage: 'unmount' });
    };
  }, [component, tag]);
  return tag;
}
