type TraceDetails = Record<string, string | number | boolean | null | undefined>;

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Development-only, low-noise timing for tracing UI, transport and merge paths. */
export function beginPerformanceTrace(name: string, details: TraceDetails = {}) {
  const startedAt = clock();
  if (__DEV__) console.log(`[PerfQA] ${name}.start`, details);

  return (stage: string, stageDetails: TraceDetails = {}) => {
    if (!__DEV__) return;
    console.log(`[PerfQA] ${name}.${stage}`, {
      ...details,
      ...stageDetails,
      elapsedMs: Math.round(clock() - startedAt),
    });
  };
}
