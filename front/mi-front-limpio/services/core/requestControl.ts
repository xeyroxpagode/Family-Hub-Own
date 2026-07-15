import { appRequestRegistry } from './serverState';

export type RequestControlOptions = {
  signal?: AbortSignal | null;
  timeoutMs?: number;
  scopeId?: string | null;
};

export function createRequestControl(options: RequestControlOptions = {}) {
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort();
  const unregister = appRequestRegistry.register(controller, options.scopeId ?? null);
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromExternal, { once: true });

  if (options.timeoutMs != null && options.timeoutMs > 0) {
    timeoutHandle = setTimeout(() => controller.abort(), options.timeoutMs);
  }

  let disposed = false;
  return {
    signal: controller.signal,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      options.signal?.removeEventListener('abort', abortFromExternal);
      unregister();
    },
  } as const;
}
