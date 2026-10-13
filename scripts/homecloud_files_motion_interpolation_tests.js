/**
 * HomeCloud Files / Shared — MOTION INTERPOLATION RANGE CONTRACT.
 *
 * The HomeCloud runtime regression this suite exists for:
 *
 *   Invariant Violation: inputRange (2) and outputRange (3) must have the same length
 *
 * HomeCloudFilesScreen.tsx rendered an interpolation whose `outputRange` carried
 * THREE keyframes while its `inputRange` kept only the two endpoints of the
 * driven value. React Native throws when it BUILDS that config — during render,
 * not during a gesture — so the screen died before a frame was painted, on every
 * device and after every reload.
 *
 * This suite is the guard. Its rules are React Native's own, taken from
 * `AnimatedInterpolation.js::checkValidRanges` in the version this project
 * installs (react-native 0.86.3), so a passing run means the app builds the
 * interpolation configs runtime accepts:
 *
 *   front/mi-front-limpio/node_modules/react-native/Libraries/Animated/nodes/AnimatedInterpolation.js:310
 *
 *   * inputRange.length === outputRange.length
 *   * inputRange.length >= 2, outputRange.length >= 2
 *   * inputRange must be monotonically non-decreasing
 *   * neither range may be ]-Infinity; +Infinity[
 *
 * RANGES COMPUTED AT RUNTIME ARE NOT SKIPPED, THEY ARE COUNTED. A range like
 * `[viewerOpenOrigin.translateX, 0]` has no literal numbers to compare, but it
 * still has to carry as many entries as its input, so the guard compares the
 * STRUCTURE of both ranges and only falls back to the numeric rules when both
 * are literal. A range built by a computed expression (`.map(...)`) is the one
 * case this cannot settle from the source, and those are listed explicitly so a
 * new computed range cannot slip in unnoticed.
 *
 * The second half of the suite keeps the APPROVED animations intact. A guard is
 * only honest if it cannot be satisfied by deleting the animation: the header
 * morph must keep its three-keyframe cross-fade, the folder slide must keep its
 * tracked translation, and reduced motion must still collapse the morph to a
 * 30 ms presence change instead of removing it.
 *
 * Run from the repository root:
 *   node scripts/homecloud_files_motion_interpolation_tests.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
const check = (name, fn) => { fn(); console.log(`PASS: ${name}`); };

/** Every surface that owns an animation after the Files Premium + Office work. */
const MOTION_SURFACES = [
  'front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx',
  'front/mi-front-limpio/screens/HomeCloudScreen.tsx',
  'front/mi-front-limpio/screens/HomeCloudFileViewerScreen.tsx',
  'front/mi-front-limpio/components/homecloud/HomeCloudUploadActivity.tsx',
  'front/mi-front-limpio/services/homecloud/FilesFavoritesChip.tsx',
  'front/mi-front-limpio/services/homecloud/FileUndoSnackbar.tsx',
  'front/mi-front-limpio/components/family/MapContextCard.tsx',
  'front/mi-front-limpio/components/family/MapContextNavigation.tsx',
  'front/mi-front-limpio/components/ui/Toggle.tsx',
];

/**
 * The only interpolation in these surfaces whose ranges are built by an
 * expression instead of an array literal, so its length cannot be read from the
 * source. Both of its ranges come from the SAME `ITEMS` list and therefore have
 * the same length by construction; naming it here is what keeps that true by
 * decision instead of by luck.
 */
const COMPUTED_RANGES = new Map([
  ['ITEMS.map((_, index) => index)',
    'MapContextNavigation builds the tab indicator range and its positions from the same ITEMS list'],
]);

/**
 * HC-POL-013 as approved in `08_HOMECLOUD_PREMIUM_POLISH_MASTER_LIST_REVISADA_V2.md`:
 * a cross-fade over 150 ms plus a displacement of <= 4 pt, leaving height,
 * search, grid and scroll untouched; 30 ms linear under reduced motion. The
 * driven value runs 0 -> 1, so a three-keyframe interpolation keys on 0/0.5/1.
 */
const HEADER_MORPH_KEYFRAMES = {
  inputRange: [0, 0.5, 1],
  opacity: [1, 0.55, 1],
  translateY: [0, 4, 0],
};

// ── the React Native invariant, ported from AnimatedInterpolation.js ──────────

/**
 * The message React Native would throw for this config, or null when runtime
 * would accept it. The wording is the runtime's own, so a failure here names
 * exactly what the device said.
 */
function interpolationViolation(inputRange, outputRange) {
  if (inputRange.length < 2) return 'inputRange must have at least 2 elements';
  if (outputRange.length < 2) return 'outputRange must have at least 2 elements';
  if (inputRange.length !== outputRange.length) {
    return `inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`;
  }
  if (inputRange.length === 2 && inputRange[0] === -Infinity && inputRange[1] === Infinity) {
    return 'inputRange cannot be ]-infinity;+infinity[';
  }
  if (outputRange.length === 2 && outputRange[0] === -Infinity && outputRange[1] === Infinity) {
    return 'outputRange cannot be ]-infinity;+infinity[';
  }
  for (let index = 1; index < inputRange.length; index += 1) {
    if (inputRange[index] < inputRange[index - 1]) {
      return `inputRange must be monotonically non-decreasing ${String(inputRange)}`;
    }
  }
  return null;
}

// ── reading the real sources ──────────────────────────────────────────────────

/** Reads the balanced `( ... )` block whose opening parenthesis is at `startIndex`. */
function balancedBlock(source, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex + 1, index);
    }
  }
  throw new Error('unbalanced interpolation config');
}

/** Reads the balanced `[ ... ]` literal whose opening bracket is at `startIndex`. */
function balancedArray(source, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex + 1, index);
    }
  }
  throw new Error('unbalanced range literal');
}

/**
 * How many entries a range literal declares, or null when it is built by an
 * expression instead of an array literal. The COUNT is the part React Native
 * enforces, so it is available even when the entries themselves are expressions.
 */
function entryCount(text) {
  const expression = text.trim();
  if (!/^[^,\[\]()]*(\s*,\s*[^,\[\]()]*)*$/.test(expression)) return null;
  if (expression === '') return null;
  return expression.split(',').length;
}

/** Evaluates a numeric range literal, or returns null when it is computed. */
function numericLiteral(text) {
  const expression = text.replace(/\s+/g, '');
  if (!/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)*$/.test(expression)) return null;
  return expression.split(',').map((value) => Number(value));
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

/**
 * The source text of `inputRange` / `outputRange` inside one config.
 *
 * A range is either an array literal (`[0, 0.5, 1]`, possibly with computed
 * entries) or an expression that builds one (`ITEMS.map(...)`); both are read
 * from the source, because React Native enforces the LENGTH of the result and
 * not only its values.
 */
function rangeTexts(body) {
  const texts = {};
  for (const key of ['inputRange', 'outputRange']) {
    const found = body.indexOf(key);
    if (found === -1) { texts[key] = null; continue; }
    const colon = body.indexOf(':', found + key.length);
    let start = colon + 1;
    while (start < body.length && /\s/.test(body[start])) start += 1;
    if (body[start] === '[') { texts[key] = balancedArray(body, start); continue; }
    let depth = 0;
    let index = start;
    for (; index < body.length; index += 1) {
      const character = body[index];
      if ('([{'.includes(character)) depth += 1;
      else if (')]}'.includes(character)) {
        if (depth === 0) break;
        depth -= 1;
      } else if (character === ',' && depth === 0) break;
    }
    texts[key] = body.slice(start, index);
  }
  return texts;
}

/**
 * Every `.interpolate({ ... })` config in a source. The numbers asserted below
 * are read from the SOURCE TEXT, so they are the numbers the app hands to
 * React Native, not a fixture restating them.
 */
function collectInterpolations(source) {
  const configs = [];
  const marker = '.interpolate(';
  let cursor = 0;
  while (true) {
    const start = source.indexOf(marker, cursor);
    if (start === -1) break;
    cursor = start + marker.length;
    const texts = rangeTexts(balancedBlock(source, start + marker.length - 1));
    configs.push({
      line: lineOf(source, start),
      inputText: texts.inputRange,
      outputText: texts.outputRange,
      inputNumbers: texts.inputRange === null ? null : numericLiteral(texts.inputRange),
      outputNumbers: texts.outputRange === null ? null : numericLiteral(texts.outputRange),
      inputCount: texts.inputRange === null ? null : entryCount(texts.inputRange),
      outputCount: texts.outputRange === null ? null : entryCount(texts.outputRange),
    });
  }
  return configs;
}

/**
 * The reason this config cannot be checked numerically, or null when it can.
 * A computed range is only acceptable when it is a NAMED one.
 */
function computedReason(config) {
  for (const source of [config.inputText, config.outputText]) {
    if (source === null) continue;
    const expression = source.replace(/\s+/g, ' ');
    for (const [marker, reason] of COMPUTED_RANGES) {
      if (expression.replace(/\s+/g, ' ').includes(marker.replace(/\s+/g, ' '))) return reason;
    }
  }
  return null;
}

/** Everything React Native can decide about one config, read from the source. */
function violationOf(config) {
  if (config.inputCount === null || config.outputCount === null) {
    return computedReason(config) === null ? 'a computed range that the suite cannot account for' : null;
  }
  if (config.inputNumbers !== null && config.outputNumbers !== null) {
    return interpolationViolation(config.inputNumbers, config.outputNumbers);
  }
  if (config.inputCount !== config.outputCount) {
    return `inputRange (${config.inputCount}) and outputRange (${config.outputCount}) must have the same length`;
  }
  return null;
}

// ── the regression ────────────────────────────────────────────────────────────

/** The shipped defect, verbatim, so the guard can be re-run against it. */
const SHIPPED_DEFECT = 'opacity: headerMorph.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55, 1] }),';
/** A mismatch that has nothing to do with the morph. */
const SYNTHETIC_DEFECT = 'opacity: something.interpolate({ inputRange: [0, 0.5, 1, 1.5], outputRange: [0, 1, 0] }),';

check('every interpolation in the motion surfaces keeps inputRange and outputRange aligned', () => {
  let audited = 0;
  for (const relative of MOTION_SURFACES) {
    const source = read(relative);
    // A surface may animate from a plain `Animated.Value` and own no
    // interpolation at all, which is a valid state to be audited in.
    for (const config of collectInterpolations(source)) {
      audited += 1;
      assert.equal(violationOf(config), null,
        `${relative}:${config.line}: ${violationOf(config)}`);
    }
  }
  // The audit list is only meaningful while it still covers the real
  // interpolations; a surface silently dropped from MOTION_SURFACES would
  // otherwise make this pass while checking nothing.
  assert.ok(audited >= 13,
    `expected the audited surfaces to hold at least 13 interpolations, found ${audited}`);
  assert.equal(collectInterpolations(read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx')).length, 5,
    'Files owns the header morph (2), the viewer open transform (3) and nothing else');
  assert.equal(collectInterpolations(read('front/mi-front-limpio/screens/HomeCloudScreen.tsx')).length, 1,
    'the shell owns the single tab cross-fade');
});

check('the viewer screen animates from plain driven values, and stays audited', () => {
  const viewer = read('front/mi-front-limpio/screens/HomeCloudFileViewerScreen.tsx');
  assert.equal(collectInterpolations(viewer).length, 0,
    'the viewer screen fades its chrome and its exit from plain driven values');
  assert.match(viewer, /Animated\.timing\(exitOpacity/);
  assert.match(viewer, /Animated\.timing\(chromeOpacity/);
  assert.match(viewer, /Animated\.timing\(overlayOpacity/);
});

check('the guard catches the shipped defect and is not vacuous', () => {
  const shipped = collectInterpolations(`<Animated.View style={${SHIPPED_DEFECT}} />`)[0];
  assert.equal(violationOf(shipped), 'inputRange (2) and outputRange (3) must have the same length',
    'the exact defect that crashed HomeCloud must still be reported');
  const synthetic = collectInterpolations(`<View style={${SYNTHETIC_DEFECT}} />`)[0];
  assert.equal(violationOf(synthetic), 'inputRange (4) and outputRange (3) must have the same length',
    'any incompatible pair must be detected, not only the shipped expression');
  // A computed output range is still counted: dropping an entry there is the same bug.
  const computed = collectInterpolations(
    'translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [origin.x, 0] })')[0];
  assert.equal(violationOf(computed), null, 'a two-entry computed output range is aligned');
  const computedShort = collectInterpolations(
    'translateX: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [origin.x, 0] })')[0];
  assert.equal(violationOf(computedShort),
    'inputRange (3) and outputRange (2) must have the same length',
    'a computed output range must be counted, not waved through');
  assert.equal(interpolationViolation([0, 1], [0, 1]), null, 'a valid two-keyframe config must pass');
  assert.equal(interpolationViolation([0, 0.5, 1], [1, 0.55, 1]), null, 'a valid three-keyframe config must pass');
  assert.match(interpolationViolation([1, 0.5], [0, 1]), /monotonically non-decreasing/,
    'the ported rules must cover the ordering rule as well as the length rule');
});

// ── the approved animations are preserved, not deleted ─────────────────────────

const files = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');

/** The interpolation configs of the HC-POL-013 header row, read from the screen. */
function headerMorphConfigs(source) {
  const first = source.indexOf('headerMorph.interpolate');
  assert.notEqual(first, -1, 'HC-POL-013: the header row must still drive its opacity from the morph');
  const configs = collectInterpolations(source.slice(first - 400, first + 400));
  assert.equal(configs.length, 2, 'HC-POL-013: the morph owns exactly two channels, opacity and translateY');
  return configs;
}

check('HC-POL-013 keeps the three-keyframe header cross-fade and the <=4 pt shift', () => {
  const [opacity, translateY] = headerMorphConfigs(files);
  assert.deepEqual(opacity.inputNumbers, HEADER_MORPH_KEYFRAMES.inputRange,
    'HC-POL-013: the cross-fade keys on 0/0.5/1, so its three keyframes align with the driven value');
  assert.deepEqual(opacity.outputNumbers, HEADER_MORPH_KEYFRAMES.opacity,
    'HC-POL-013: the row still fades to 0.55 and back, it was not flattened into a two-point fade');
  assert.deepEqual(translateY.inputNumbers, HEADER_MORPH_KEYFRAMES.inputRange,
    'HC-POL-013: the displacement shares the morph keyframes');
  assert.deepEqual(translateY.outputNumbers, HEADER_MORPH_KEYFRAMES.translateY,
    'HC-POL-013: the row still shifts by at most 4 pt');
});

check('HC-POL-013 still collapses to a 30 ms linear presence change under reduced motion', () => {
  assert.match(files, /Animated\.timing\(headerMorph/);
  assert.match(files, /toValue: selection\.mode \? 1 : 0/);
  assert.match(files, /duration: reducedMotion \? 30 : MOTION\.selectionMorph/);
  assert.match(files, /easing: Easing\.linear/);
  assert.match(files, /useNativeDriver: true/);
});

check('HC-POL-011 keeps the folder slide tracked, with the breadcrumb trailing it', () => {
  assert.match(files, /folderSlide\.setValue\(distance\)/);
  assert.match(files, /duration: reducedMotion \? 40 : MOTION\.folderSlide/);
  assert.match(files, /breadcrumbFade\.setValue\(0\)/);
  assert.match(files, /duration: reducedMotion \? 40 : MOTION\.folderBreadcrumb/);
  assert.match(files, /transform: \[\{ translateX: folderSlide \}\]/,
    'the slide is a tracked translation, so it must not be re-keyed by an interpolation');
});

check('the viewer open transform keeps translateX, translateY and scale on one progress', () => {
  const start = files.indexOf('viewerOpenProgress.interpolate');
  assert.notEqual(start, -1, 'HC-POL-012/057: the layer must still expand from the tapped tile');
  const configs = collectInterpolations(files.slice(start - 200, start + 400));
  assert.equal(configs.length, 3, 'translateX, translateY and scale all interpolate the open progress');
  for (const config of configs) {
    assert.deepEqual(config.inputNumbers, [0, 1]);
    assert.equal(config.outputCount, 2, `line ${config.line}: every channel interpolates from its origin`);
  }
});

console.log('HOMECLOUD_FILES_MOTION_INTERPOLATION_TESTS=PASS');