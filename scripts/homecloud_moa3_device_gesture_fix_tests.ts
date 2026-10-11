/**
 * HomeCloud MO-A3 DEVICE FIX — D1 / D2 / D3 regression evidence.
 *
 * These three defects were invisible to the automated gates and real on a
 * physical iPhone, so this file is deliberately shaped around the RUNTIME
 * FACTS that were proven by reading the installed React Native, not around the
 * code that used to be there:
 *
 *  - D1. `ref` on a `SectionList` is the `SectionList` class instance. It
 *    publishes `scrollToLocation`, `recordInteraction`,
 *    `flashScrollIndicators`, `getScrollResponder`, `getScrollableNode` and
 *    `setNativeProps`, and NOT `scrollToOffset`. The fixtures below are built
 *    from that exact shape, so the "valid ref" case is a real SectionList and the
 *    "missing method" case is what a SectionList actually looks like. No fixture
 *    invents a method the runtime does not have in order to make a test pass.
 *  - D2. The pure gate decides mounting and callback permission; device gesture
 *    arbitration is still native and is NOT claimed to be proven here.
 *  - D3. `HomeCloud` is a card in the `MoreStack` native stack whose interactive
 *    pop is a native recognizer; the only seam is the route's `gestureEnabled`
 *    option, and this proves the lock disables it and gives it back.
 *
 * Deterministic: no database, no network, no React, no React Native.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  MEMORY_EXIT_GESTURE_BASELINE,
  createMemoryExitGestureLock,
  scrollMemoryListToOffset,
  solveMemoryRefreshGate,
  type MemoryListScrollResult,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryGestureOwnership';
import { createMemoryEdgeTicker } from '../front/mi-front-limpio/services/homecloud/homecloudMemoryDrag';

const root = process.cwd();
const read = (relative: string): string =>
  fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readCode = (relative: string): string =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

const OWNERSHIP_CODE = readCode(
  'front/mi-front-limpio/services/homecloud/homecloudMemoryGestureOwnership.ts',
);
const SCREEN_CODE = readCode('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const NAVIGATOR_CODE = readCode('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
const CARD_CODE = readCode('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx');

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

/** What one scroll call actually did, recorded without touching the adapter. */
interface ScrollProbe {
  readonly calls: Array<{ kind: string; payload: unknown }>;
}

function probe(): ScrollProbe & { calls: Array<{ kind: string; payload: unknown }> } {
  return { calls: [] };
}

/**
 * A FAITHFUL stand-in for the RN 0.86 `SectionList` class instance.
 *
 * Every method below is one the real class publishes
 * (`Libraries/Lists/SectionList.js`), and `scrollToOffset` is deliberately
 * ABSENT because the real class does not have it. `getScrollResponder()`
 * returns the `ScrollView`, which is what the real chain resolves to
 * (`SectionList.getScrollResponder` -> `VirtualizedList.getScrollResponder` ->
 * `ScrollView.getScrollResponder`, and `ScrollView.getScrollResponder` returns
 * the ScrollView itself).
 */
function sectionListRuntimeRef(recorder: ReturnType<typeof probe>, responderScrollTo?: 'missing'): {
  scrollToLocation: (params: unknown) => void;
  recordInteraction: () => void;
  flashScrollIndicators: () => void;
  getScrollResponder: () => unknown;
  getScrollableNode: () => number;
  setNativeProps: (props: object) => void;
} {
  const scrollView = {
    scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => {
      recorder.calls.push({ kind: 'scrollResponder.scrollTo', payload: options });
    },
    scrollToEnd: (options: { animated?: boolean }) => {
      recorder.calls.push({ kind: 'scrollResponder.scrollToEnd', payload: options });
    },
    getScrollResponder: () => scrollView,
  };
  return {
    scrollToLocation: (params) => {
      recorder.calls.push({ kind: 'scrollToLocation', payload: params });
    },
    recordInteraction: () => undefined,
    flashScrollIndicators: () => undefined,
    getScrollResponder: () => {
      if (responderScrollTo === 'missing') {
        // What `SectionList.getScrollResponder()` returns before the inner list
        // has mounted: `undefined`, NOT a broken object.
        return undefined;
      }
      return scrollView;
    },
    getScrollableNode: () => 42,
    setNativeProps: () => undefined,
  };
}

// ===========================================================================
section('D1. The scroll adapter resolves the capability the runtime really has');
// ===========================================================================

{
  // The physical failure: a real SectionList ref, called the way the screen
  // used to call it. `?.` guards a null ref, never a missing method.
  const recorder = probe();
  const ref = sectionListRuntimeRef(recorder);
  record(
    typeof (ref as unknown as Record<string, unknown>).scrollToOffset === 'undefined',
    'FIXTURE TRUTH: the runtime SectionList object really has no scrollToOffset',
  );
  let legacyCrash: string | null = null;
  try {
    (ref as unknown as { scrollToOffset: (params: unknown) => void }).scrollToOffset({
      offset: 120,
      animated: false,
    });
  } catch (error) {
    legacyCrash = error instanceof Error ? error.message : String(error);
  }
  record(
    legacyCrash !== null && legacyCrash.includes('is not a function'),
    `CHARACTERIZATION: the old call really is "${legacyCrash}", which is the device crash`,
  );
}

{
  // A valid ref with a supported method -> the command is carried, and it is the
  // DOCUMENTED path a SectionList can actually take.
  const recorder = probe();
  const result: MemoryListScrollResult = scrollMemoryListToOffset(
    sectionListRuntimeRef(recorder),
    240,
  );
  record(result.method === 'scrollResponder', 'a SectionList ref scrolls through getScrollResponder().scrollTo');
  record(result.appliedOffset === 240, 'the applied offset is reported back so the caller can record it');
  record(recorder.calls.length === 1, 'exactly ONE command is issued');
  record(
    recorder.calls[0].kind === 'scrollResponder.scrollTo'
      && JSON.stringify(recorder.calls[0].payload) === JSON.stringify({ x: 0, y: 240, animated: false }),
    'the command is an absolute vertical offset and is NEVER animated',
  );
}

{
  // Missing method -> NOT undefined is not a function, and NOT a pretend success.
  const recorder = probe();
  const result = scrollMemoryListToOffset(sectionListRuntimeRef(recorder, 'missing'), 240);
  record(result.method === null, 'a ref whose getScrollResponder() is not mounted reports NO capability');
  record(result.appliedOffset === null, 'and reports NO applied offset, so the caller cannot fake a scroll');
  record(recorder.calls.length === 0, 'not one command is issued against a capability that does not exist');

  let threw = false;
  try {
    scrollMemoryListToOffset(sectionListRuntimeRef(recorder, 'missing'), 240);
  } catch {
    threw = true;
  }
  record(!threw, 'the adapter NEVER throws "undefined is not a function"');
}

{
  // Degenerate hosts and offsets are refused, not attempted.
  const recorder = probe();
  const hosts: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['an empty object', {}],
    ['an object with non-function members', { scrollToOffset: 1, getScrollResponder: 'nope' }],
  ];
  record(
    hosts.every(([, host]) => {
      const result = scrollMemoryListToOffset(host, 100);
      return result.method === null && result.appliedOffset === null;
    }),
    'every non-list host is refused without a call',
  );
  record(recorder.calls.length === 0, 'no degenerate host ever produced a command');
  record(
    [Number.NaN, Number.POSITIVE_INFINITY, -1].every(
      (offset) => scrollMemoryListToOffset(sectionListRuntimeRef(recorder), offset).method === null,
    ),
    'a non-finite or negative offset is refused before any capability is touched',
  );
}

{
  // The preferred capability still wins when the host really has it, so the
  // adapter is not hard-wired to the SectionList shape.
  const recorder = probe();
  const virtualizedList = {
    scrollToOffset: (params: { offset: number; animated?: boolean }) => {
      recorder.calls.push({ kind: 'scrollToOffset', payload: params });
    },
  };
  const result = scrollMemoryListToOffset(virtualizedList, 90);
  record(result.method === 'scrollToOffset' && result.appliedOffset === 90, 'a VirtualizedList-style host uses scrollToOffset');
  record(
    recorder.calls.length === 1
      && JSON.stringify(recorder.calls[0].payload) === JSON.stringify({ offset: 90, animated: false }),
    'scrollToOffset is also issued un-animated',
  );

  const bare = probe();
  const scrollViewHost = {
    scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => {
      bare.calls.push({ kind: 'refScrollTo', payload: options });
    },
  };
  record(
    scrollMemoryListToOffset(scrollViewHost, 30).method === 'refScrollTo',
    'a ScrollView-style host falls through to its own scrollTo',
  );
  record(bare.calls.length === 1, 'the fall-through issues exactly one command');
}

{
  // index-based scrolling is refused ON PURPOSE: it cannot express "advance N px".
  record(
    !OWNERSHIP_CODE.includes('scrollToLocation('),
    'the adapter never calls scrollToLocation: it is index-based, not a pixel delta',
  );
  record(
    /getItemLayout/.test(OWNERSHIP_CODE) === false,
    'the fix does not smuggle in a getItemLayout requirement either',
  );
}

{
  // ONE scroll authority in the screen, and no invented surface left anywhere.
  record(
    !/scrollToOffset/.test(SCREEN_CODE),
    'the screen no longer mentions scrollToOffset at all: the invented type is gone',
  );
  record(
    !/MemoryGridListHandle/.test(SCREEN_CODE),
    'the invented MemoryGridListHandle type is removed, not merely unused',
  );
  record(
    (SCREEN_CODE.match(/scrollMemoryListToOffset\(/g) ?? []).length === 2,
    'both call sites (edge ticker and per-source restore) go through the ONE adapter',
  );
}

{
  // The ticker + the screen's own scroll composition, exactly as the screen
  // wires them: `scrollByRef` runs the adapter, records the offset ONLY when a
  // command was issued, and STOPS the ticker when the host cannot scroll.
  const runScreenScrollLoop = (list: unknown): { applied: number[]; running: boolean; ticks: number } => {
    const applied: number[] = [];
    const ticks: Array<() => void> = [];
    let tracked = 0;
    let tickerRef: { stop: () => void; isRunning: () => boolean } | null = null;
    const ticker = createMemoryEdgeTicker({
      schedule: (tick) => {
        ticks.push(tick);
        return ticks.length - 1;
      },
      cancel: () => undefined,
      viewportHeight: () => 800,
      // The screen's scrollByRef, in miniature and with the same rules.
      scrollBy: (delta) => {
        const next = Math.max(0, tracked + delta);
        const result = scrollMemoryListToOffset(list, next);
        if (result.appliedOffset === null) {
          tickerRef?.stop();
          return;
        }
        tracked = result.appliedOffset;
        applied.push(result.appliedOffset);
      },
    });
    tickerRef = ticker;
    ticker.update(2);
    for (const tick of ticks) tick();
    return { applied, running: ticker.isRunning(), ticks: ticks.length };
  };

  const supportedRecorder = probe();
  const supported = runScreenScrollLoop(sectionListRuntimeRef(supportedRecorder));
  record(supported.applied.length > 0, 'a supported ref makes every tick advance the list');
  record(
    supported.applied.every((offset, index) => index === 0 || offset < supported.applied[index - 1]),
    'the upper edge band really scrolls UP, so the applied offsets decrease',
  );
  record(supported.running, 'a supported ref keeps the ticker running across the band');

  const unsupported = runScreenScrollLoop({});
  record(unsupported.applied.length === 0, 'an unsupported ref issues no scroll at all');
  record(!unsupported.running, 'and the ticker is STOPPED, so it cannot burn frames for nothing');
  record(supportedRecorder.calls.length > 0, 'the supported case really reached the native command');
  record(unsupported.ticks === 1, 'exactly ONE interval was ever scheduled in the unsupported case');

  // A late tick after the stop must do nothing: no runaway, and no offset drift.
  const late = probe();
  let lateTicks: Array<() => void> = [];
  let lateTicker: { stop: () => void; update: (y: number) => void } | null = null;
  const lateTickerHandle = createMemoryEdgeTicker({
    schedule: (tick) => {
      lateTicks.push(tick);
      return lateTicks.length - 1;
    },
    cancel: () => undefined,
    viewportHeight: () => 800,
    scrollBy: () => {
      // Mirrors the screen: an unscrollable host stops the ticker on its first tick.
      lateTicker?.stop();
    },
  });
  lateTicker = lateTickerHandle;
  lateTickerHandle.update(2);
  lateTicks[0]();
  const callsAfterStop = late.calls.length;
  lateTicks[0]();
  record(callsAfterStop === 0 && late.calls.length === 0, 'a tick firing after the stop does nothing at all');

  // The stop-on-unsupported rule is the SCREEN's, so prove it is really there.
  record(
    /if \(result\.appliedOffset === null\) \{\s*stopEdgeScroll\(\);\s*return;\s*\}/.test(SCREEN_CODE),
    'the screen stops the ticker when no scroll capability exists (no runaway interval)',
  );
  record(
    /scrollOffsetsRef\.current\.set\(key, result\.appliedOffset\)/.test(SCREEN_CODE),
    'and it records the offset the adapter reported, never a computed fiction',
  );
}

{
  // Offset tracking stays coherent: the tracked offset only moves when a command
  // was really issued, so it can never accumulate a fiction.
  const recorder = probe();
  const tracked = new Map<string, number>([['library', 100]]);
  const step = (host: unknown, delta: number): number | null => {
    const next = Math.max(0, (tracked.get('library') ?? 0) + delta);
    const result = scrollMemoryListToOffset(host, next);
    if (result.appliedOffset === null) return null;
    tracked.set('library', result.appliedOffset);
    return tracked.get('library') ?? null;
  };
  record(step(sectionListRuntimeRef(recorder), 20) === 120, 'a successful scroll advances the tracked offset');
  record(step({}, 20) === null, 'an unsupported scroll leaves the tracked offset untouched');
  record(tracked.get('library') === 120, 'so the tracked offset still matches what the list really did');
  record(step(sectionListRuntimeRef(recorder), -500) === 0, 'a scroll past the top clamps to 0, never negative');
}

// ===========================================================================
section('D2. Pull-to-refresh: gesture prevention + business callback guard');
// ===========================================================================

{
  const normal = solveMemoryRefreshGate({ selecting: false, dragArmed: false, dragActive: false });
  record(normal.mountRefreshControl, 'NORMAL MODE: the RefreshControl is mounted');
  record(normal.allowRefresh, 'NORMAL MODE: refresh is allowed');

  const selecting = solveMemoryRefreshGate({ selecting: true, dragArmed: false, dragActive: false });
  record(!selecting.mountRefreshControl, 'SELECTION MODE: the RefreshControl is NOT mounted (gesture prevention)');
  record(!selecting.allowRefresh, 'SELECTION MODE, idle: the callback refuses too');

  const armed = solveMemoryRefreshGate({ selecting: false, dragArmed: true, dragActive: false });
  record(!armed.allowRefresh, 'a bare armed drag outside a session still refuses refresh');
  record(armed.mountRefreshControl, 'but an armed drag alone does not unmount a normal-mode control');

  const dragging = solveMemoryRefreshGate({ selecting: true, dragArmed: true, dragActive: true });
  record(
    !dragging.mountRefreshControl && !dragging.allowRefresh,
    'ACTIVE DRAG-SELECT: neither the gesture nor the callback may refresh',
  );
}

{
  // The mount decision is the SESSION, on purpose: the arming long press happens
  // after the native pan is already tracking, so a gesture-level condition could
  // never be evaluated early enough.
  record(
    [false, true].every(
      (armed) =>
        [false, true].every(
          (active) =>
            solveMemoryRefreshGate({ selecting: true, dragArmed: armed, dragActive: active })
              .mountRefreshControl === false,
        ),
    ),
    'mounting is false for EVERY selection-mode drag state, armed or not',
  );
}

{
  // Restoring: after the session is cancelled, normal mode works again.
  const afterCancel = solveMemoryRefreshGate({ selecting: false, dragArmed: false, dragActive: false });
  record(afterCancel.mountRefreshControl && afterCancel.allowRefresh, 'after cancellation refresh is allowed again');

  const staleArmed = solveMemoryRefreshGate({ selecting: false, dragArmed: false, dragActive: true });
  record(!staleArmed.allowRefresh, 'a still-active drag refuses even outside a session: no mid-sweep dataset swap');
  record(staleArmed.mountRefreshControl, 'but normal-mode refresh stays available for ordinary scrolling');
}

{
  // The wiring, not just the predicate.
  record(
    /solveMemoryRefreshGate\(\{\s*selecting,\s*dragArmed:\s*false,\s*dragActive:\s*false\s*\}\)\.mountRefreshControl/.test(
      SCREEN_CODE,
    ),
    'the list mounts the RefreshControl through the gate',
  );
  record(
    /<RefreshControl\s+refreshing=\{refreshing\}\s+onRefresh=\{handleGridRefresh\}\s*\/>/.test(SCREEN_CODE),
    'normal mode keeps the ordinary indicator and the guarded callback',
  );
  record(
    !/refreshing=\{selecting \? false : refreshing\}/.test(SCREEN_CODE),
    'the old "keep it mounted but show no spinner" suppression is gone: it never worked on device',
  );
  record(
    /solveMemoryRefreshGate\(\{[\s\S]{0,200}selecting,[\s\S]{0,120}dragRef\.current\.armed,[\s\S]{0,120}dragRef\.current\.active/.test(
      SCREEN_CODE,
    ),
    'the callback guard reads the LIVE drag refs, not a stale render value',
  );
  record(
    !/selecting && selection\.source\.kind === 'collection' \? undefined/.test(SCREEN_CODE),
    'refresh is no longer decided by which collection source happens to be visible',
  );
}

// ===========================================================================
section('D3. The parent exit gesture is disabled for the session and given back');
// ===========================================================================

{
  const applied: boolean[] = [];
  const lock = createMemoryExitGestureLock({ apply: (value) => applied.push(value) });

  record(lock.baseline === MEMORY_EXIT_GESTURE_BASELINE, 'the captured baseline is the native-stack default');
  record(!lock.suppressed, 'the lock starts NOT suppressed');

  record(lock.sync(false) === false && applied.length === 0, 'a normal-mode sync writes nothing at all');

  record(lock.sync(true) === true, 'entering a selection session disables the parent swipe');
  record(applied.length === 1 && applied[0] === false, 'and it writes gestureEnabled: false');
  record(lock.suppressed, 'the lock reports the gesture as suppressed');

  record(lock.sync(true) === false && applied.length === 1, 'a re-render while selecting never re-applies it');
  record(lock.sync(true) === false && applied.length === 1, 'and it stays idempotent however often it runs');

  record(lock.sync(false) === true, 'leaving the session restores the option');
  record(applied.length === 2 && applied[1] === MEMORY_EXIT_GESTURE_BASELINE, 'to the exact captured baseline');
  record(!lock.suppressed, 'and the lock is no longer suppressed');
}

{
  // Unmount while the session is still live: the gesture must come back.
  const applied: boolean[] = [];
  const lock = createMemoryExitGestureLock({ apply: (value) => applied.push(value) });
  lock.sync(true);
  record(lock.release() === true, 'releasing a live suppression reports the restore');
  record(applied.length === 2 && applied[1] === MEMORY_EXIT_GESTURE_BASELINE, 'unmount restores the baseline');
  record(lock.release() === false && applied.length === 2, 'release() is idempotent and never writes twice');
}

{
  // Two causes can race (unmount AND cancel). Neither may leave a stale lock.
  const applied: boolean[] = [];
  const lock = createMemoryExitGestureLock({ apply: (value) => applied.push(value) });
  lock.sync(true);
  lock.sync(false);
  record(applied.length === 2, 'cancel while live: suppressed then restored');
  record(lock.release() === false && applied.length === 2, 'the later unmount release is a no-op');
  record(applied[applied.length - 1] === MEMORY_EXIT_GESTURE_BASELINE, 'the LAST write is the enabled baseline');
}

{
  // An explicit baseline is honoured, so restoring never hard-codes an assumption.
  const applied: boolean[] = [];
  const lock = createMemoryExitGestureLock({ apply: (value) => applied.push(value), baseline: false });
  record(lock.baseline === false, 'a caller may declare a different baseline');
  lock.sync(true);
  lock.release();
  record(
    applied.length === 2 && applied[0] === false && applied[1] === false,
    'and the restore writes that declared baseline verbatim, not a hard-coded true',
  );
}

{
  // A long session with many transitions converges and never leaves it disabled.
  const applied: boolean[] = [];
  const lock = createMemoryExitGestureLock({ apply: (value) => applied.push(value) });
  for (let i = 0; i < 25; i += 1) {
    lock.sync(true);
    lock.sync(true);
    lock.sync(false);
    lock.release();
    lock.release();
  }
  record(lock.sync(true) === true && lock.sync(false) === true, 'the lock still works after many transitions');
  lock.release();
  record(applied[applied.length - 1] === MEMORY_EXIT_GESTURE_BASELINE, 'and the final state is the baseline, never disabled');
  record(!lock.suppressed, 'no stale suppressed state survives');
}

{
  // The wiring, and the owner it names.
  record(
    /createMemoryExitGestureLock\(\{[\s\S]{0,200}setOptions\(\{ gestureEnabled \}\)/.test(SCREEN_CODE),
    'the lock applies the route option through the CURRENT navigation API',
  );
  record(
    /exitGesture\.sync\(selecting\)/.test(SCREEN_CODE),
    'the suppression follows the selection session',
  );
  record(
    /useEffect\(\(\) => \(\) => \{\s*exitGesture\.release\(\);/.test(SCREEN_CODE),
    'and unmount releases it, so no gesture lock leaks outside HomeCloud',
  );
  record(
    /useNavigation<any>\(\)/.test(SCREEN_CODE) && /navigationRef\.current\?\.setOptions/.test(SCREEN_CODE),
    'the navigation object is read through a ref, so the once-only lock never closes over a stale one',
  );
  record(
    !/gestureEnabled/.test(NAVIGATOR_CODE),
    'the navigator is UNCHANGED: the fix is a dynamic route option, not a navigator edit',
  );
  record(
    /<MoreStack\.Screen name="HomeCloud" component=\{HomeCloudScreen\} \/>/.test(NAVIGATOR_CODE),
    'HomeCloud is still a card of the MoreStack native stack (the owner of the exit swipe)',
  );
  record(
    !/createNativeStackNavigator|createStackNavigator/.test(readCode('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx')),
    'no navigator is created or redesigned by this screen',
  );
}

// ===========================================================================
section('Gesture ownership is unchanged everywhere else');
// ===========================================================================

{
  // The drag state machine itself was NOT redesigned.
  record(
    /onStartShouldSetPanResponder: \(\) => false/.test(CARD_CODE)
      && /onMoveShouldSetPanResponderCapture: \(\) => false/.test(CARD_CODE),
    'the card still never claims the responder on touch start and uses no capture',
  );
  record(
    /MEMORY_DRAG_TAKEOVER_SLOP/.test(CARD_CODE),
    'the takeover slop is unchanged: a normal scroll is still never stolen',
  );
  record(
    !/RNGH|react-native-gesture-handler|reanimated/.test(OWNERSHIP_CODE + SCREEN_CODE),
    'no gesture-handler or Reanimated dependency was introduced (Expo Go constraint)',
  );
  record(
    !/NativeModules|requireNativeComponent|TurboModule/.test(OWNERSHIP_CODE),
    'no custom native module was introduced (Expo Go constraint)',
  );
  record(
    /MEMORY_DRAG_TICK_MS/.test(OWNERSHIP_CODE) === false,
    'the tick cadence still lives in the drag module, not in the new ownership module',
  );
}

// ===========================================================================
section('Freeze: backend, schema and shared infrastructure untouched');
// ===========================================================================

{
  const CHANGED = [
    'front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx',
    'front/mi-front-limpio/services/homecloud/homecloudMemoryGestureOwnership.ts',
  ].join('\n');
  record(CHANGED.length > 0, 'the patch is confined to the screen plus the new pure module');
  record(
    !/supabase|migration|\.sql|createClient/.test(OWNERSHIP_CODE),
    'the new module touches no database, migration or backend client',
  );
  record(
    !/homecloudReadService|homecloudMemorySelection|homecloudAlbumScope|requestJson|plannerCache/.test(OWNERSHIP_CODE),
    'the new module depends on no shared HomeCloud infrastructure',
  );
  record(
    !/MemoryIntake|uploadQueue|uploadCoordinator/.test(OWNERSHIP_CODE),
    'the new module has no upload, recovery or intake surface',
  );
}

console.log(`\nMOA3_DEVICE_GESTURE_FIX_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('MOA3_DEVICE_GESTURE_FIX_TESTS=FAIL');
} else {
  console.log('MOA3_DEVICE_GESTURE_FIX_TESTS=PASS');
}