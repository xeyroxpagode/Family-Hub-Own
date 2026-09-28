import type { MemoryAttempt } from './homecloudMemoryAttempt';

export function memoryDevTrace(event: string, details?: Record<string, unknown>): void {
  if (!__DEV__) return;
  // Deliberately structured and allow-listed by callers: never pass tokens,
  // signed URLs, binary data, or full EXIF payloads here.
  console.info(`[HomeCloud Memory] ${event}`, details ?? {});
}

export function memoryAttemptTrace(attempt: MemoryAttempt, event: string, details?: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.info(`[HC MemoryCreate][${attempt.id}][${attempt.label}] ${event}`, details ?? {});
}
