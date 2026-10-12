import { strict as assert } from 'node:assert';

import { resolveAdaptiveMenuLayout } from '../front/mi-front-limpio/services/homecloud/adaptiveActionMenuLayout';

const anchor = { x: 320, y: 80, width: 44, height: 44 };

for (const viewportWidth of [360, 390, 430]) {
  const layout = resolveAdaptiveMenuLayout({
    anchor,
    viewportWidth,
    viewportHeight: 844,
    safeTop: 47,
    safeBottom: 34,
    keyboardHeight: 0,
    menuWidth: 280,
    menuHeight: 260,
    fontScale: 1,
    itemCount: 4,
  });
  assert.equal(layout.presentation, 'popover');
  if (layout.presentation === 'popover') {
    assert.ok(layout.left >= 12, `${viewportWidth}: left safe clamp`);
    assert.ok(layout.left + 280 <= viewportWidth - 12, `${viewportWidth}: right safe clamp`);
    assert.ok(layout.top >= 59, `${viewportWidth}: top safe clamp`);
  }
}

const bottomFlip = resolveAdaptiveMenuLayout({
  anchor: { x: 330, y: 760, width: 44, height: 44 },
  viewportWidth: 390,
  viewportHeight: 844,
  safeTop: 47,
  safeBottom: 34,
  keyboardHeight: 0,
  menuWidth: 280,
  menuHeight: 260,
  fontScale: 1,
  itemCount: 4,
});
assert.equal(bottomFlip.presentation, 'popover');
if (bottomFlip.presentation === 'popover') assert.ok(bottomFlip.top < 760, 'bottom anchor flips above');

assert.equal(resolveAdaptiveMenuLayout({
  anchor,
  viewportWidth: 360,
  viewportHeight: 780,
  safeTop: 44,
  safeBottom: 34,
  keyboardHeight: 0,
  menuWidth: 300,
  menuHeight: 400,
  fontScale: 1.3,
  itemCount: 5,
}).presentation, 'sheet', '360/fontScale 1.3 falls back to sheet');

assert.equal(resolveAdaptiveMenuLayout({
  anchor,
  viewportWidth: 430,
  viewportHeight: 844,
  safeTop: 47,
  safeBottom: 34,
  keyboardHeight: 360,
  menuWidth: 280,
  menuHeight: 420,
  fontScale: 1,
  itemCount: 7,
}).presentation, 'sheet', 'keyboard-reduced viewport falls back to sheet');

assert.equal(resolveAdaptiveMenuLayout({
  anchor,
  viewportWidth: 430,
  viewportHeight: 900,
  safeTop: 47,
  safeBottom: 34,
  keyboardHeight: 0,
  menuWidth: 280,
  menuHeight: 440,
  fontScale: 1,
  itemCount: 7,
}).presentation, 'sheet', 'seven File actions use the complete sheet');

assert.equal(resolveAdaptiveMenuLayout({
  anchor: null,
  viewportWidth: 390,
  viewportHeight: 844,
  safeTop: 47,
  safeBottom: 34,
  keyboardHeight: 0,
  menuWidth: 280,
  menuHeight: 220,
  fontScale: 1,
  itemCount: 3,
}).presentation, 'sheet', 'unmeasured accessibility trigger uses reachable sheet');

console.log('HOMECLOUD_SHARED_POLISH_TESTS=PASS');
