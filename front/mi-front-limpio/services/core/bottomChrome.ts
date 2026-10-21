/**
 * Shared bottom-chrome model — Premium UX bottom chrome ownership.
 *
 * The layout of a screen depends on more than "is there a tab bar": the
 * sticky CTA, the selection bar, the sheet footer and the software keyboard
 * all claim the bottom of the viewport. This module is the single place where
 * that ownership is resolved, so no screen invents its own magic offset.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §9.
 *
 * Frozen chrome matrix:
 *
 * | Surface            | Chrome                          |
 * |--------------------|---------------------------------|
 * | Products normal    | BottomNav                       |
 * | Products selection | SelectionBar + BottomNav         |
 * | Shopping normal    | Sticky CTA + BottomNav           |
 * | Shopping selection | SelectionBar + BottomNav         |
 * | Purchase           | Sticky Finalize (no BottomNav)   |
 * | Sheet + keyboard   | Sheet footer + keyboard          |
 */

export type BottomChromeSlot =
  | 'none'
  | 'bottom-nav'
  | 'selection-bar'
  | 'sticky-cta'
  | 'sheet-footer';

export type BottomChromeState = {
  /** The chrome that is currently visible at the bottom of the screen. */
  readonly slot: BottomChromeSlot;
  /** Is the software keyboard on screen? */
  readonly keyboardVisible: boolean;
  /** Bottom safe-area inset of the device (pt). */
  readonly safeAreaBottom: number;
  /** Extra keyboard inset reported by the platform (pt). */
  readonly keyboardInset?: number;
};

/**
 * Chrome metrics, in points, derived from the measured CURRENT geometry
 * (Premium forensic audit §7). They are expressed once so a screen never
 * hardcodes `bottom: 96` on its own.
 */
export const BOTTOM_CHROME_METRICS = {
  /** FloatingNavigationBar shell height. */
  bottomNavHeight: 80,
  /** Breathing room between the content and the bottom nav. */
  bottomNavGap: 16,
  /** InventorySelectionBar height. */
  selectionBarHeight: 58,
  /** Breathing room between the selection bar and the bottom nav. */
  selectionBarGap: 6,
  /** Sticky CTA (Shopping / Purchase finalize) height. */
  stickyCtaHeight: 72,
  /** Breathing room between the sticky CTA and the bottom nav. */
  stickyCtaGap: 16,
  /** Breathing room between a toast and the chrome below it. */
  toastGap: 8,
} as const;

/**
 * Bottom inset the scrollable content must reserve so its last row is never
 * hidden behind the chrome.
 */
export function resolveContentBottomInset(state: BottomChromeState): number {
  const {
    bottomNavHeight,
    bottomNavGap,
    selectionBarHeight,
    selectionBarGap,
    stickyCtaHeight,
    stickyCtaGap,
  } = BOTTOM_CHROME_METRICS;

  switch (state.slot) {
    case 'bottom-nav':
      return bottomNavHeight + bottomNavGap;
    case 'selection-bar':
      return selectionBarHeight + selectionBarGap + bottomNavHeight + bottomNavGap;
    case 'sticky-cta':
      return stickyCtaHeight + stickyCtaGap + bottomNavHeight + bottomNavGap;
    case 'sheet-footer':
      return state.keyboardVisible ? (state.keyboardInset ?? 0) : 0;
    case 'none':
    default:
      return 0;
  }
}

/**
 * Bottom anchor for a toast. A toast always floats ABOVE the chrome that is
 * currently visible, so it can never be covered by the tab bar.
 */
export function resolveToastBottomAnchor(state: BottomChromeState): number {
  const { toastGap } = BOTTOM_CHROME_METRICS;
  return resolveContentBottomInset(state) + toastGap;
}

/**
 * Relationship between the chrome and an overlay. A sheet covers the chrome
 * completely: the chrome must not be drawn above it.
 */
export function resolveOverlayRelationship(
  state: BottomChromeState,
  overlayOpen: boolean,
): 'covers-chrome' | 'below-chrome' {
  if (!overlayOpen) return 'below-chrome';
  return state.slot === 'sheet-footer' ? 'below-chrome' : 'covers-chrome';
}
