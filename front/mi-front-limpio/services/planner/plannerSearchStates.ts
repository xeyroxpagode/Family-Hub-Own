/**
 * Planner V1 — M7 Search Base States.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Pure state discriminants for the Planner Search screen's entry-level states.
 * - Separate from the productive search states (typing, loading_results, results,
 *   empty_results, search_error) which belong to Search productiva (out of scope).
 * - Testable without rendering — no React, no side effects.
 *
 * States implemented:
 *   - loading: resolving gate access
 *   - disabled: feature flag false
 *   - forbidden: capability false (flag true but user lacks permission)
 *   - unavailable: gate open but backend search not yet implemented
 *
 * States NOT implemented (Search productiva only):
 *   - typing, loading_results, results, empty_results, search_error
 */

import { isPlannerSearchAvailable, type PlannerSearchAccess } from './plannerSearchAccess';

// ---------------------------------------------------------------------------
// 1. Search screen base state
// ---------------------------------------------------------------------------

export type PlannerSearchBaseState =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' };

// ---------------------------------------------------------------------------
// 2. Resolver
// ---------------------------------------------------------------------------

/**
 * Map `PlannerSearchAccess` to the Search screen's base state.
 * When access is `available`, this returns `unavailable` because Search
 * productiva is NOT implemented in M7. The screen acknowledges availability
 * but shows an honest "not yet available" state.
 */
export function resolvePlannerSearchBaseState(
  access: PlannerSearchAccess,
): PlannerSearchBaseState {
  if (access.kind === 'loading') return { kind: 'loading' };
  if (access.kind === 'disabled') return { kind: 'disabled' };
  if (access.kind === 'forbidden') return { kind: 'forbidden' };

  // access.kind === 'available' — gate is open but Search is not yet productive.
  // Show the honest unavailable state.
  return { kind: 'unavailable' };
}

// ---------------------------------------------------------------------------
// 3. State descriptors (copy per state)
// ---------------------------------------------------------------------------

export type SearchStateDescriptor = {
  readonly title: string;
  readonly description: string;
  readonly hasBackButton: boolean;
};

export function describeSearchState(state: PlannerSearchBaseState): SearchStateDescriptor {
  switch (state.kind) {
    case 'loading':
      return {
        title: 'Cargando',
        description: 'Verificando acceso a búsqueda...',
        hasBackButton: true,
      };
    case 'disabled':
      return {
        title: 'Búsqueda no disponible',
        description: 'La búsqueda en Planner aún no está habilitada.',
        hasBackButton: true,
      };
    case 'forbidden':
      return {
        title: 'Búsqueda no disponible',
        description: 'No tenés acceso a la búsqueda en este hogar.',
        hasBackButton: true,
      };
    case 'unavailable':
      return {
        title: 'Búsqueda en Planner',
        description: 'La búsqueda estará disponible próximamente.',
        hasBackButton: true,
      };
    default:
      return {
        title: 'Búsqueda no disponible',
        description: 'Revisá tu acceso o intentá de nuevo.',
        hasBackButton: true,
      };
  }
}

// ---------------------------------------------------------------------------
// 4. Guards
// ---------------------------------------------------------------------------

export function isSearchStateBlocking(state: PlannerSearchBaseState): boolean {
  return state.kind === 'disabled' || state.kind === 'forbidden';
}

export function isSearchStateLoading(state: PlannerSearchBaseState): boolean {
  return state.kind === 'loading';
}