/**
 * Planner payload filter.
 *
 * The Reliability runtime computes a canonical request hash by stable-stringifying
 * the payload via `Object.keys(...).sort()`. A property whose own value is
 * `undefined` is still enumerated by `Object.keys` and would raise
 * `planner_reliability_undefined_hash_property` before the request ever reaches
 * the network (see operationIdentity.ts).
 *
 * The frontend builders for Task and Event create payloads with optional fields
 * using `value || undefined`. This helper drops those `undefined`-valued own keys
 * before the payload enters Reliability, leaving the rest of the shape untouched.
 *
 * This is NOT a global strip: callers apply it at the exact construction sites
 * where `undefined` is intentionally produced for "field absent" semantics.
 */
export function omitUndefinedPlannerPayloadProperties<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (v !== undefined) out[key] = v;
  }
  return out as T;
}
