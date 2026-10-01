export type PlannerSearchEntityType = 'task' | 'event' | 'plan';
export type PlannerSearchContext = 'active';

export type PlannerSearchDestination = {
  readonly entityType: PlannerSearchEntityType;
  readonly entityId: string;
  readonly surfaceOrigin: 'search';
};

export type PlannerSearchResult = {
  readonly id: string;
  readonly entityType: PlannerSearchEntityType;
  readonly entityId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly destination: PlannerSearchDestination;
  readonly updatedAt: string | null;
};

export type PlannerSearchGroup = {
  readonly entityType: PlannerSearchEntityType;
  readonly label: string;
  readonly results: readonly PlannerSearchResult[];
};

export type PlannerSearchResponse = {
  readonly projectionVersion: string;
  readonly context: PlannerSearchContext;
  readonly query: string;
  readonly generatedAt: string;
  readonly limit: number;
  readonly total: number;
  readonly groups: readonly PlannerSearchGroup[];
};

export type PlannerSearchStatus =
  | { readonly kind: 'initial' }
  | { readonly kind: 'loading'; readonly stale: boolean }
  | { readonly kind: 'results'; readonly response: PlannerSearchResponse; readonly stale: boolean }
  | { readonly kind: 'empty'; readonly query: string }
  | { readonly kind: 'offline'; readonly staleResponse: PlannerSearchResponse | null }
  | { readonly kind: 'error'; readonly message: string; readonly code: string | null }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'session_invalid'; readonly message: string };

export function normalizePlannerSearchInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function shouldRunPlannerSearch(value: string): boolean {
  return normalizePlannerSearchInput(value).length > 0;
}

export function hasVisiblePlannerSearchResults(response: PlannerSearchResponse | null): boolean {
  return (response?.groups ?? []).some((group) => group.results.length > 0);
}

export function classifyPlannerSearchErrorLike(params: {
  readonly name?: string | null;
  readonly code?: string | null;
  readonly status?: number | null;
  readonly isNetworkError?: boolean;
  readonly message?: string | null;
  readonly staleResponse: PlannerSearchResponse | null;
}): PlannerSearchStatus {
  if (params.name === 'AbortError') {
    return { kind: 'loading', stale: params.staleResponse !== null };
  }
  if (params.status === 401 || params.code === 'not_authenticated') {
    return { kind: 'session_invalid', message: 'Tu sesión ya no está activa.' };
  }
  if (params.status === 403 || params.code === 'planner_forbidden') {
    return { kind: 'forbidden', message: 'No tenés acceso a Search en este hogar.' };
  }
  if (params.isNetworkError || params.code === 'network_error') {
    return { kind: 'offline', staleResponse: params.staleResponse };
  }
  return {
    kind: 'error',
    message: params.message || 'No pudimos buscar ahora. Intentá de nuevo.',
    code: params.code ?? null,
  };
}
