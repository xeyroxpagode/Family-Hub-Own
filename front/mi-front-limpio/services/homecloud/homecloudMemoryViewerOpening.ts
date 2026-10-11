/**
 * HomeCloud HC2-C — VIEWER OPENING AUTHORITY (pure, framework free).
 *
 * THE PRODUCT TRUTH THIS FILE EXISTS TO PROTECT
 * ---------------------------------------------
 *   EL MEMORY QUE EL USUARIO TOCÓ ES LA AUTORIDAD INICIAL DEL VIEWER.
 *
 * At open, the Memory the user tapped is the initial authority of the Viewer.
 * No layout callback, no scroll callback, no default index, no dataset refresh
 * and no initial momentum event may replace it BEFORE the pager has been
 * aligned to it. Only after the alignment is established may genuine navigation
 * change the active content.
 *
 * WHY A PURE MODULE AND NOT A `useRef` IN THE COMPONENT
 * ------------------------------------------------------
 * Every transition worth preventing here is a VALUE transition:
 *
 *   - a settle event that reports the wrong physical page during opening;
 *   - a settle event that finally confirms the requested page;
 *   - a real finger drag, which is genuine user intent;
 *   - an alignment command that must NOT be re-issued (the feedback loop);
 *   - a requested id that is genuinely absent from the dataset.
 *
 * All of them are decided here, so they are directly testable without a
 * renderer, a device or a timing assumption. The component only mirrors the
 * result and issues the commands.
 *
 * NO `Math.max(0, findIndex(...))`
 * --------------------------------
 * "Not found" is `-1`, and `-1` means the honest `Missing` state. It is NEVER
 * coerced into page 0: silently opening the first Memory as if it were the
 * requested one is a lie the user can act on.
 *
 * THE LOCK CANNOT DEADLOCK (HC2-C R1)
 * -----------------------------------
 * The lock is released by THREE independent facts, not one:
 *
 *   1. a settle event whose computed index EQUALS the requested index;
 *   2. `onScrollEndDrag`, the path a drag released without momentum takes;
 *   3. `onScrollBeginDrag` — a real finger is genuine user intent, and a real
 *      finger is something initial programmatic alignment can never produce.
 *
 * Because the visual position is driven by `initialScrollIndex` plus the
 * alignment command (both derived from `requestedIndex`) and NOT by the locked
 * write, holding the lock can never leave the user looking at the wrong page:
 * at worst the lock simply means "no state write yet".
 */

export type MemoryViewerOpeningState = {
  /** The tapped Memory. Immutable for the whole life of the Viewer. */
  readonly requestedContentId: string;
  /**
   * Raw `findIndex` of the requested id in the dataset.
   *
   * `-1` means NOT FOUND, and `-1` is the ONLY meaning of "not found" here.
   */
  readonly requestedIndex: number;
  /**
   * True while the pager has not yet reported the requested page. While it is
   * held, a settle event whose computed id differs from the active content is
   * ignored instead of replacing the opening authority.
   */
  readonly locked: boolean;
};

/**
 * Why a settle/drag event was accepted or ignored.
 *
 * `locked` is the whole BUG A defence: initial physical-offset noise reported
 * during opening is classified as `locked`, never as navigation.
 */
export type MemoryViewerOpeningReason =
  /** The pager reported exactly the requested page: the lock is released. */
  | 'aligned'
  /** Opening noise that does not match the requested page: ignored. */
  | 'locked'
  /** A real finger: genuine user intent, released unconditionally. */
  | 'user-drag'
  /** Post-alignment navigation: the write is allowed. */
  | 'navigated'
  /** A missing requested item has no authority to protect. */
  | 'missing';

export type MemoryViewerOpeningResult = {
  readonly state: MemoryViewerOpeningState;
  /** True when the pager is allowed to REPLACE the opening authority. */
  readonly accept: boolean;
  readonly reason: MemoryViewerOpeningReason;
};

/**
 * Raw index of `contentId` in the dataset. `-1` when it is absent.
 *
 * Deliberately NOT `Math.max(0, ...)`: that fallback is the silent "open the
 * first Memory as if it were the requested one" defect.
 */
export function resolveMemoryViewerIndex(
  memories: readonly { readonly id: string }[],
  contentId: string,
): number {
  return memories.findIndex((memory) => memory.id === contentId);
}

/**
 * Arm the opening lock for ONE Viewer session.
 *
 * The Viewer's `activeContentId` AT MOUNT is the tapped id, so this is called
 * exactly once per open. It is NOT re-armed on later `activeContentId` changes,
 * because those are the navigation the lock is designed to allow.
 *
 * A MISSING requested item is never locked: there is no page to align to, the
 * honest `Missing` state is rendered instead, and holding a lock over nothing
 * would be a pointless deadlock.
 */
export function beginMemoryViewerOpening(
  requestedContentId: string,
  requestedIndex: number,
): MemoryViewerOpeningState {
  return {
    requestedContentId,
    requestedIndex,
    locked: requestedIndex >= 0,
  };
}

/**
 * `onScrollBeginDrag`: a real finger, therefore genuine user intent.
 *
 * This is what makes the lock incapable of freezing the pager: initial
 * programmatic alignment does not emit a drag, so any drag the user performs is
 * unambiguous and releases the lock at once.
 */
export function reportMemoryViewerDragBegin(
  state: MemoryViewerOpeningState,
): MemoryViewerOpeningResult {
  if (!state.locked) return { state, accept: true, reason: 'navigated' };
  return { state: { ...state, locked: false }, accept: true, reason: 'user-drag' };
}

/**
 * A pager settle report: `onMomentumScrollEnd` or `onScrollEndDrag`.
 *
 * `computedIndex` is what the physical offset translated to, NOT what the user
 * asked for, which is exactly why it cannot be trusted before alignment.
 *
 * `activeIndex` is passed in so an UNRESOLVED authority is decided here rather
 * than only by the component's early return. When the active Memory is genuinely
 * absent the honest surface is `Missing`, and accepting a write would replace
 * `Missing` with "some other Memory the user never asked for" — the same silent
 * substitution the index-0 fallback used to perform, one layer up.
 */
export function reportMemoryViewerSettle(
  state: MemoryViewerOpeningState,
  computedIndex: number,
  activeIndex: number,
): MemoryViewerOpeningResult {
  if (state.requestedIndex < 0 || activeIndex < 0) return { state, accept: false, reason: 'missing' };
  if (!state.locked) return { state, accept: true, reason: 'navigated' };
  if (computedIndex === state.requestedIndex) {
    return { state: { ...state, locked: false }, accept: true, reason: 'aligned' };
  }
  // Opening noise. The state is returned IDENTICALLY so no re-render is caused.
  return { state, accept: false, reason: 'locked' };
}

export type MemoryViewerAlignmentCommand =
  /** Move the pager to this index. Idempotent for the same index. */
  | { readonly kind: 'align'; readonly index: number }
  /** Do nothing: already aligned, or there is nothing honest to align to. */
  | { readonly kind: 'hold' };

/**
 * THE SINGLE PROGRAMMATIC ALIGNMENT AUTHORITY.
 *
 * This replaces an effect that fired on every `activeIndex` change, which made
 * `momentum -> set active -> effect -> scroll -> momentum` a closed loop. Two
 * things break that loop here:
 *
 *  - while the opening lock is held the ONLY target is the requested page, so a
 *    noise-driven state write cannot exist to be re-aligned to;
 *  - once released, a command is issued only when the active CONTENT ID is not
 *    the one the pager was last aligned to. Reconstructing an equal dataset, or
 *    appending a page, leaves that identity untouched and therefore issues
 *    nothing.
 *
 * A MISSING active id resolves to `hold`, because the honest surface for it is
 * `Missing`, not a scroll to page 0.
 */
export function solveMemoryViewerAlignment(input: {
  readonly requestedIndex: number;
  readonly activeIndex: number;
  readonly locked: boolean;
  readonly requestedContentId: string;
  readonly activeContentId: string;
  /** The content id the pager was last commanded to; `null` before the first. */
  readonly alignedContentId: string | null;
}): MemoryViewerAlignmentCommand {
  const opening = input.locked && input.requestedIndex >= 0;
  const targetId = opening ? input.requestedContentId : input.activeContentId;
  const targetIndex = opening ? input.requestedIndex : input.activeIndex;
  if (targetIndex < 0) return { kind: 'hold' };
  if (input.alignedContentId === targetId) return { kind: 'hold' };
  return { kind: 'align', index: targetIndex };
}

/**
 * Equal-content identity reuse for the Viewer's dataset.
 *
 * Refreshing page 0 or appending a page rebuilds arrays and objects. The
 * Viewer's dataset identity must still be stable while the CONTENT and the
 * SOURCE are unchanged, so the previous array is returned verbatim and no
 * `FlatList data` identity churn can move the active content.
 */
export function reuseMemoryViewerDataset<T>(
  previous: readonly T[],
  next: readonly T[],
  idOf: (item: T) => string,
): readonly T[] {
  if (previous === next) return previous;
  if (previous.length !== next.length) return next;
  for (let index = 0; index < next.length; index += 1) {
    if (idOf(previous[index] as T) !== idOf(next[index] as T)) return next;
  }
  return previous;
}