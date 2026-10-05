/**
 * HomeCloud Files - Stage 2 / Phase 2 - THE DISPLAY FILTER / ORDER GRAMMAR.
 *
 * Files V1 had three separate permanent controls: a `Recientes / A-Z` sort button,
 * a `Favoritos` toggle, and a `Seleccionar` button, all sitting in the title row
 * next to a visible refresh icon. That row was the busiest part of a screen whose
 * whole promise is being information-first.
 *
 * Stage 2 collapses display state into ONE compact icon whose menu carries two
 * labelled groups:
 *
 *   MOSTRAR   Todos | Favoritos
 *   ORDENAR   Recientes | A-Z
 *
 * Two rules make the collapse honest rather than lossy:
 *
 *   - `Favoritos` remains a MODE that composes with folder, search, sort and
 *     pagination and is filtered SERVER-side before the page is taken. Nothing
 *     about it changed; only where it is chosen from.
 *   - `Recientes / A-Z` remains a server-side ORDER. The client still never sorts
 *     a page it already received.
 *
 * Selection mode and manual refresh deliberately do NOT live here: they are
 * screen-level actions, not display filters, and they belong in the header
 * overflow. Folding them into a "filter" menu would make the menu's meaning
 * ambiguous.
 *
 * The grammar is a pure module with no React and no transport, so the contract is
 * testable without a device, a renderer or a server.
 */
import type { FileSort } from './homecloudFilesService';

export type FilesShowMode = 'all' | 'favorites';

export interface FilesFilterState {
  readonly show: FilesShowMode;
  readonly sort: FileSort;
}

/** The state a freshly opened Files browser is in: everything, newest first. */
export const DEFAULT_FILES_FILTER_STATE: FilesFilterState = Object.freeze({ show: 'all', sort: 'recent' });

export const FILES_SHOW_OPTIONS: readonly { readonly value: FilesShowMode; readonly label: string }[] = Object.freeze([
  { value: 'all', label: 'Todos' },
  { value: 'favorites', label: 'Favoritos' },
]);

export const FILES_SORT_OPTIONS: readonly { readonly value: FileSort; readonly label: string }[] = Object.freeze([
  { value: 'recent', label: 'Recientes' },
  { value: 'name', label: 'A-Z' },
]);

export function filesShowLabel(state: FilesFilterState): string {
  return FILES_SHOW_OPTIONS.find((option) => option.value === state.show)?.label ?? 'Todos';
}

export function filesSortLabel(state: FilesFilterState): string {
  return FILES_SORT_OPTIONS.find((option) => option.value === state.sort)?.label ?? 'Recientes';
}

/**
 * Whether the current context differs from the default in ANY way.
 *
 * This is the single input to the filter icon's active indication, and it is
 * deliberately a boolean rather than a count. A number would be ambiguous here
 * (`2` could mean "Favoritos + A-Z", or a filter count that does not exist in
 * Files V1), and a large badge would fight the content-first promise of the
 * screen. A subtle accent plus a small dot is the convention the donor screen
 * already uses for exactly this case.
 */
export function hasNonDefaultFilesFilter(state: FilesFilterState): boolean {
  return state.show !== DEFAULT_FILES_FILTER_STATE.show || state.sort !== DEFAULT_FILES_FILTER_STATE.sort;
}

/**
 * One honest sentence describing what is being shown, for the menu's subtitle and
 * for assistive technology.
 *
 * It names BOTH axes and names them in the product's own words, so a screen reader
 * user is never told "filtered" without learning what the filter actually is.
 */
export function filesFilterDescription(state: FilesFilterState): string {
  const show = state.show === 'favorites' ? 'solo tus favoritos' : 'todos los archivos';
  const sort = state.sort === 'name' ? 'ordenados de A a Z' : 'ordenados por más recientes';
  return `Mostrando ${show}, ${sort}.`;
}

/** Accessibility label for the single filter icon. */
export function filesFilterAccessibilityLabel(state: FilesFilterState): string {
  return `Filtros y orden. ${filesFilterDescription(state)} Toca para cambiar.`;
}

/** The `favoritesOnly` server parameter implied by this state. */
export function filesFavoritesOnly(state: FilesFilterState): boolean {
  return state.show === 'favorites';
}