/**
 * Shared overlay registry — Premium UX overlay/pager contract.
 *
 * A single, app-wide registry of the overlays that are currently open. It
 * exists so that the INVENTORY pager can ask a structural question
 * ("is a primary overlay open?") and so that a popover can be closed when the
 * pager gesture starts, without any screen knowing about the others.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §10.
 *
 * Rules:
 * - a PRIMARY overlay (sheet / dialog) BLOCKS the pager;
 * - a POPOVER does not block the pager: the pager closes it when the gesture
 *   starts;
 * - closing an overlay never changes the route and never unmounts the
 *   underlay.
 */

export type OverlayKind = 'sheet' | 'popover' | 'dialog';

export type OverlayEntry = {
  readonly id: string;
  readonly kind: OverlayKind;
  /** Optional close handler, invoked when the registry asks overlays to close. */
  readonly close?: () => void;
};

export type OverlaySnapshot = {
  readonly open: boolean;
  readonly primaryOpen: boolean;
  readonly popoverOpen: boolean;
  readonly count: number;
};

const overlays = new Map<string, OverlayEntry>();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function readSnapshot(): OverlaySnapshot {
  let primaryOpen = false;
  let popoverOpen = false;
  overlays.forEach((entry) => {
    if (entry.kind === 'popover') popoverOpen = true;
    else primaryOpen = true;
  });
  return {
    open: overlays.size > 0,
    primaryOpen,
    popoverOpen,
    count: overlays.size,
  };
}

/**
 * Register an open overlay. The returned function unregisters it and MUST be
 * called on unmount, otherwise the pager would stay blocked forever.
 */
export function registerOverlay(entry: OverlayEntry): () => void {
  overlays.set(entry.id, entry);
  emit();
  return () => {
    if (overlays.get(entry.id) === entry) {
      overlays.delete(entry.id);
      emit();
    }
  };
}

/** Remove an overlay by id. */
export function unregisterOverlay(id: string): void {
  if (overlays.delete(id)) emit();
}

/** Is a primary overlay (sheet / dialog) currently open? */
export function hasPrimaryOverlay(): boolean {
  return readSnapshot().primaryOpen;
}

/** Is any popover currently open? */
export function hasOpenPopover(): boolean {
  return readSnapshot().popoverOpen;
}

/** Is any overlay (primary or popover) currently open? */
export function hasOpenOverlay(): boolean {
  return overlays.size > 0;
}

/**
 * Close every open popover. Used when the pager gesture starts: a popover
 * must never survive the transition that it was covering.
 */
export function closeOpenPopovers(): void {
  const popovers = [...overlays.values()].filter((entry) => entry.kind === 'popover');
  if (popovers.length === 0) return;
  popovers.forEach((entry) => {
    entry.close?.();
    overlays.delete(entry.id);
  });
  emit();
}

/** Close every open overlay (used by the Android back handler). */
export function closeAllOverlays(): void {
  if (overlays.size === 0) return;
  [...overlays.values()].forEach((entry) => {
    entry.close?.();
    overlays.delete(entry.id);
  });
  emit();
}

/** Current registry snapshot. */
export function getOverlaySnapshot(): OverlaySnapshot {
  return readSnapshot();
}

/** Subscribe to registry changes. Returns the unsubscribe function. */
export function subscribeOverlayState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper: drop every registered overlay without calling close handlers. */
export function resetOverlayRegistry(): void {
  overlays.clear();
  emit();
}
