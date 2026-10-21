import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  BOTTOM_CHROME_METRICS,
  resolveContentBottomInset,
  resolveOverlayRelationship,
  resolveToastBottomAnchor,
  type BottomChromeSlot,
} from '../services/core/bottomChrome';

/**
 * Bottom chrome ownership.
 *
 * A screen DECLARES which chrome is active at the bottom of the viewport and
 * receives, from that single declaration, the content bottom inset, the toast
 * bottom anchor and the relationship with an overlay.
 *
 * The default state reproduces the CURRENT app chrome (bottom navigation), so
 * a consumer that does not declare anything keeps the legacy geometry.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §9.
 */

export type BottomChromeContextValue = {
  /** The chrome that is currently visible at the bottom of the screen. */
  slot: BottomChromeSlot;
  /** Declare the active chrome. */
  setSlot: (slot: BottomChromeSlot) => void;
  /** Is the software keyboard on screen? */
  keyboardVisible: boolean;
  /** Report the software keyboard state. */
  setKeyboardVisible: (visible: boolean) => void;
  /** Bottom inset the scrollable content must reserve. */
  contentBottomInset: number;
  /** Bottom anchor for a toast. */
  toastBottomAnchor: number;
  /** Relationship between the chrome and an overlay. */
  overlayRelationship: (overlayOpen: boolean) => 'covers-chrome' | 'below-chrome';
};

const defaultState: BottomChromeContextValue = {
  slot: 'bottom-nav',
  setSlot: () => undefined,
  keyboardVisible: false,
  setKeyboardVisible: () => undefined,
  contentBottomInset: resolveContentBottomInset({ slot: 'bottom-nav', keyboardVisible: false, safeAreaBottom: 0 }),
  toastBottomAnchor: resolveToastBottomAnchor({ slot: 'bottom-nav', keyboardVisible: false, safeAreaBottom: 0 }),
  overlayRelationship: (overlayOpen: boolean) => resolveOverlayRelationship({ slot: 'bottom-nav', keyboardVisible: false, safeAreaBottom: 0 }, overlayOpen),
};

const BottomChromeContext = createContext<BottomChromeContextValue>(defaultState);

export function BottomChromeProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<BottomChromeSlot>('bottom-nav');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const contentBottomInset = useMemo(
    () => resolveContentBottomInset({ slot, keyboardVisible, safeAreaBottom: 0 }),
    [keyboardVisible, slot],
  );
  const toastBottomAnchor = useMemo(
    () => resolveToastBottomAnchor({ slot, keyboardVisible, safeAreaBottom: 0 }),
    [keyboardVisible, slot],
  );

  const overlayRelationship = useCallback(
    (overlayOpen: boolean) =>
      resolveOverlayRelationship({ slot, keyboardVisible, safeAreaBottom: 0 }, overlayOpen),
    [keyboardVisible, slot],
  );

  const value = useMemo<BottomChromeContextValue>(
    () => ({
      slot,
      setSlot,
      keyboardVisible,
      setKeyboardVisible,
      contentBottomInset,
      toastBottomAnchor,
      overlayRelationship,
    }),
    [contentBottomInset, keyboardVisible, overlayRelationship, slot, toastBottomAnchor],
  );

  return <BottomChromeContext.Provider value={value}>{children}</BottomChromeContext.Provider>;
}

/**
 * Read the bottom chrome contract. Safe outside a provider: it returns the
 * legacy defaults, so an undeclared consumer behaves exactly as before.
 */
export function useBottomChrome(): BottomChromeContextValue {
  return useContext(BottomChromeContext);
}

export { BOTTOM_CHROME_METRICS };
