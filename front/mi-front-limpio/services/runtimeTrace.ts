/**
 * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION
 *
 * Shared dev-only trace channel for the gallery auth unmount investigation.
 * One channel keeps the auth, navigator, picker and intake events in a single
 * ordered stream, so the sequence
 *
 *   gallery_picker_launch -> gallery_picker_resolve -> app_state_change ->
 *   auth_state_change -> auth_me_load_start -> private_navigator_gate ->
 *   private_stack_unmount -> memory_intake_unmount
 *
 * can be read as one timeline instead of four interleaved ones.
 *
 * This module is OBSERVATION ONLY: it must never be used to change state,
 * gate a render, or short-circuit a flow.
 *
 * DETAILS CONTRACT (same rule as `homecloudMemoryDiagnostics`): callers pass
 * an allow-listed object. Never pass access/refresh tokens, auth codes, signed
 * URLs, request bodies, file URIs, EXIF payloads or user identifiers here.
 */
export function runtimeTrace(event: string, details?: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.info(`[HomeCloud Runtime] ${event}`, details ?? {});
}
