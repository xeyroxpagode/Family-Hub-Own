export type MenuAnchor = { x: number; y: number; width: number; height: number };
export type AdaptiveMenuLayoutInput = {
  anchor: MenuAnchor | null; viewportWidth: number; viewportHeight: number;
  safeTop: number; safeBottom: number; keyboardHeight: number;
  menuWidth: number; menuHeight: number; fontScale: number; itemCount: number;
};
export type AdaptiveMenuLayout =
  | { presentation: 'sheet' }
  | { presentation: 'popover'; left: number; top: number; originX: number; originY: number };

export function resolveAdaptiveMenuLayout(input: AdaptiveMenuLayoutInput): AdaptiveMenuLayout {
  const margin = 12;
  const bottom = input.viewportHeight - input.safeBottom - input.keyboardHeight - margin;
  const availableHeight = bottom - (input.safeTop + margin);
  if (input.anchor === null || input.menuHeight > availableHeight) return { presentation: 'sheet' };
  const anchor = input.anchor;
  const below = anchor.y + anchor.height + 4;
  const above = anchor.y - input.menuHeight - 4;
  const idealTop = below + input.menuHeight <= bottom ? below : above;
  const top = Math.max(input.safeTop + margin, Math.min(idealTop, bottom - input.menuHeight));
  const idealLeft = anchor.x + anchor.width - input.menuWidth;
  const left = Math.max(margin, Math.min(idealLeft, input.viewportWidth - input.menuWidth - margin));
  return {
    presentation: 'popover', left, top,
    originX: Math.max(0, Math.min(input.menuWidth, anchor.x + anchor.width - left)),
    originY: Math.max(0, Math.min(input.menuHeight, anchor.y - top)),
  };
}
