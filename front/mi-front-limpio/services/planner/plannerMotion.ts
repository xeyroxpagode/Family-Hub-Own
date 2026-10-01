export type PlannerMotionToken =
  | 'press'
  | 'selection'
  | 'sheet_transition'
  | 'state_transition'
  | 'feedback_rollback';

export type PlannerMotionSpec = {
  readonly durationMs: number;
  readonly easing: 'linear' | 'standard' | 'emphasized';
  readonly allowScale: boolean;
  readonly allowTranslate: boolean;
  readonly allowCollapse: boolean;
};

const MOTION: Readonly<Record<PlannerMotionToken, PlannerMotionSpec>> = {
  press: { durationMs: 80, easing: 'standard', allowScale: true, allowTranslate: false, allowCollapse: false },
  selection: { durationMs: 140, easing: 'standard', allowScale: false, allowTranslate: false, allowCollapse: false },
  sheet_transition: { durationMs: 180, easing: 'emphasized', allowScale: false, allowTranslate: true, allowCollapse: false },
  state_transition: { durationMs: 180, easing: 'standard', allowScale: false, allowTranslate: false, allowCollapse: false },
  feedback_rollback: { durationMs: 220, easing: 'emphasized', allowScale: false, allowTranslate: true, allowCollapse: false },
};

export function getPlannerMotionSpec(
  token: PlannerMotionToken,
  reduceMotion: boolean,
): PlannerMotionSpec {
  const spec = MOTION[token];
  if (!reduceMotion) return spec;
  return {
    durationMs: token === 'press' ? 0 : Math.min(spec.durationMs, 80),
    easing: 'linear',
    allowScale: false,
    allowTranslate: false,
    allowCollapse: false,
  };
}
