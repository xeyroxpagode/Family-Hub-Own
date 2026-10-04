/**
 * HomeCloud MO-A3 DEVICE FIX — GESTURE OWNERSHIP (pure, framework free).
 *
 * WHY THIS FILE EXISTS
 * -------------------
 * MO-A3's automated gates passed and physical iPhone QA still failed in three
 * places. All three are the SAME class of defect: the JS side of the app
 * believed it owned a gesture that the native side actually owned. So the three
 * decisions are stated here, with no React and no React Native, and they are RUN
 * by the tests instead of being re-argued in a component.
 *
 * The three fixes, and what each one is NOT:
 *
 *  - D1 auto-scroll: the list ref does NOT expose `scrollToOffset`. The runtime
 *    capability is resolved here instead of being assumed by a local type.
 *  - D2 pull-to-refresh: `UIRefreshControl` is ARMED NATIVELY at touch-down, so
 *    a JS responder transfer cannot disarm it. The only Expo Go-safe answer is
 *    that the control must not exist while a selection session can sweep.
 *  - D3 exit swipe: `HomeCloud` is a card inside a React Navigation NATIVE
 *    stack, whose interactive pop is a native pan recognizer. A JS
 *    `PanResponder` cannot block it, so the route's own documented
 *    `gestureEnabled` option is the only seam.
 *
 * EXPO GO, NOT A CUSTOM DEV CLIENT
 * -------------------------------
 * Every API used here is plain JavaScript against React Native core, and it is
 * the stack the app ALREADY runs on a physical iPhone: `SectionList`, `ScrollView`
 * and `navigation.setOptions`. No native module, no RNGH/Reanimated, no rebuild
 * and no Apple Developer account is introduced, so nothing here can break the
 * Expo Go target.
 */

/**
 * D1 — WHICH SCROLL CAPABILITY ACTUALLY CARRIED THE COMMAND.
 *
 * `null` means NO command was issued, which the caller must treat as a hard
 * fact: it may not advance its tracked offset and it may not pretend the list
 * moved.
 */
export type MemoryListScrollMethod = 'scrollToOffset' | 'scrollResponder' | 'refScrollTo';

export interface MemoryListScrollResult {
  /** The documented capability that really carried the command, or `null`. */
  readonly method: MemoryListScrollMethod | null;
  /**
   * The offset the caller may now record as the LIVE offset, or `null` when
   * nothing moved. Keeping this honest is what makes the ticker's offset
   * tracking coherent instead of an accumulating fiction.
   */
  readonly appliedOffset: number | null;
}

/** Structural shape of a `ScrollView`-like imperative handle. */
interface ScrollToCapable {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
}

/** Structural shape of a list handle that exposes the documented responder. */
interface ScrollResponderCapable {
  getScrollResponder: () => unknown;
}

/** Structural shape of a `VirtualizedList`-like handle. */
interface ScrollToOffsetCapable {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}

function asScrollToCapable(value: unknown): ScrollToCapable | null {
  if (value === null || typeof value !== 'object') return null;
  return isFunction((value as ScrollToCapable).scrollTo) ? (value as ScrollToCapable) : null;
}

/**
 * D1 — SCROLL THE MEMORY GRID TO AN ABSOLUTE VERTICAL OFFSET.
 *
 * THE RUNTIME OBJECT IS THE AUTHORITY. `ref` on a `SectionList` is the
 * `SectionList` CLASS INSTANCE, and in React Native 0.86 that class publishes
 * exactly `scrollToLocation`, `recordInteraction`, `flashScrollIndicators`,
 * `getScrollResponder`, `getScrollableNode` and `setNativeProps`
 * (`Libraries/Lists/SectionList.js`, and the matching `SectionList.d.ts`).
 * `scrollToOffset` lives one level down, on the `VirtualizedList` that the
 * `SectionList` renders internally, and is NOT forwarded. Declaring it on a
 * local ref type is what produced `undefined is not a function`.
 *
 * THE RESOLUTION ORDER, each step guarded by a real `typeof` check:
 *   1. `scrollToOffset` — used only when the host really is a VirtualizedList
 *      or FlatList. It is the most precise command, so it wins when present.
 *   2. `getScrollResponder().scrollTo({ x, y, animated: false })` — THE path a
 *      CURRENT `SectionList` takes. `getScrollResponder` is declared on
 *      `SectionListComponent` and returns the underlying `ScrollView`, whose
 *      `scrollTo` is a plain native `scrollTo` command: no native module, no
 *      rebuild, and identical on iOS and Android.
 *   3. `scrollTo` on the handle itself — the same command when the host is
 *      itself a ScrollView.
 *
 * `scrollToLocation` is DELIBERATELY NOT USED. It is index-based
 * (`sectionIndex` / `itemIndex`), it positions an ITEM rather than advancing by
 * a pixel delta, and without `getItemLayout` it cannot address a target outside
 * the render window. None of that can express "advance 28 px on this tick", so
 * using it would trade a crash for a wrong scroll.
 *
 * NEVER ANIMATED. An animated command stacks with the ticker's own cadence and
 * the two fight; the ticker's whole reason to exist is the one-frame rhythm.
 *
 * NO CATCH. A capability that is missing is handled by returning a result; a
 * command that genuinely throws is a real defect and must stay visible rather
 * than be swallowed behind a pretend success.
 */
export function scrollMemoryListToOffset(list: unknown, offset: number): MemoryListScrollResult {
  const unsupported: MemoryListScrollResult = { method: null, appliedOffset: null };
  if (!Number.isFinite(offset) || offset < 0) return unsupported;
  if (list === null || typeof list !== 'object') return unsupported;

  const direct = list as Partial<ScrollToOffsetCapable>;
  if (isFunction(direct.scrollToOffset)) {
    direct.scrollToOffset({ offset, animated: false });
    return { method: 'scrollToOffset', appliedOffset: offset };
  }

  const responderHost = list as Partial<ScrollResponderCapable>;
  if (isFunction(responderHost.getScrollResponder)) {
    const responder = asScrollToCapable(responderHost.getScrollResponder());
    if (responder !== null) {
      responder.scrollTo({ x: 0, y: offset, animated: false });
      return { method: 'scrollResponder', appliedOffset: offset };
    }
  }

  const selfScroll = asScrollToCapable(list);
  if (selfScroll !== null) {
    selfScroll.scrollTo({ x: 0, y: offset, animated: false });
    return { method: 'refScrollTo', appliedOffset: offset };
  }

  return unsupported;
}

// ===========================================================================
// D2 — PULL-TO-REFRESH OWNERSHIP
// ===========================================================================

export interface MemoryRefreshGateInput {
  /** A selection session is open (any source: library or collection). */
  readonly selecting: boolean;
  /** The long press fired: a drag may take the pointer on the next move. */
  readonly dragArmed: boolean;
  /** The drag owns the pointer right now. */
  readonly dragActive: boolean;
}

export interface MemoryRefreshGate {
  /**
   * Whether the native `RefreshControl` may EXIST on the list at all.
   *
   * This is the gesture-prevention half of D2 and it is deliberately about
   * MOUNTING, not about `refreshing`. On iOS the refresh control is a real
   * `UIRefreshControl` attached to the `UIScrollView`, and the native pan
   * recognizer has been tracking since touch-down; the JS responder transfer
   * that gives the drag the pointer does not cancel it. Setting
   * `refreshing={false}` therefore still arms the pull gesture — which is
   * exactly the physical failure. Not mounting the control is the only Expo Go
   * safe prevention. Android reads the same prop on the same ScrollView, so the
   * decision is identical on both platforms by construction.
   */
  readonly mountRefreshControl: boolean;
  /**
   * Whether the business callback may run a read.
   *
   * This is the defensive half of D2: an already-armed native control, a stale
   * one, or any future platform that fires `onRefresh` regardless must still be
   * unable to replace the dataset underneath a sweep, because that is what
   * makes the rows under a stationary finger change mid-drag.
   */
  readonly allowRefresh: boolean;
}

/**
 * D2 — WHO MAY OWN A VERTICAL REFRESH, STATED ONCE.
 *
 * `mountRefreshControl` is the whole selection session, not just the active
 * drag: the arming long press has not happened yet when the finger goes down, so
 * a gesture-level condition could only ever be evaluated after the native pan is
 * already tracking. Session-wide suppression is the honest superset.
 *
 * Ordinary scrolling is untouched by either field: neither one disables the
 * ScrollView, and the header refresh button plus intake completion call the same
 * read directly and are only rendered in normal mode.
 */
export function solveMemoryRefreshGate(input: MemoryRefreshGateInput): MemoryRefreshGate {
  const selecting = input.selecting === true;
  const dragUnsafe = selecting || input.dragArmed === true || input.dragActive === true;
  return { mountRefreshControl: !selecting, allowRefresh: !dragUnsafe };
}

// ===========================================================================
// D3 — PARENT / NAVIGATION EXIT GESTURE OWNERSHIP
// ===========================================================================

/**
 * The `gestureEnabled` value `HomeCloud` has when this screen did not touch it.
 *
 * `MoreStackScreen` declares `screenOptions={{ headerShown: false }}` and no
 * `gestureEnabled`, and `MoreStack.Screen name="HomeCloud"` declares none
 * either, so the effective baseline is the documented native-stack default.
 * `captureBaseline` lets a caller override that rather than trusting the
 * constant, so restoring never hard-codes an assumption.
 */
export const MEMORY_EXIT_GESTURE_BASELINE = true;

export interface MemoryExitGestureLockOptions {
  /**
   * Apply the route option. In the app this is exactly
   * `navigation.setOptions({ gestureEnabled })` on the `HomeCloud` route.
   */
  readonly apply: (gestureEnabled: boolean) => void;
  /** Defaults to {@link MEMORY_EXIT_GESTURE_BASELINE}. */
  readonly baseline?: boolean;
}

export interface MemoryExitGestureLock {
  /** True while the exit gesture is suppressed. */
  readonly suppressed: boolean;
  /** The value captured at construction, restored verbatim by `release()`. */
  readonly baseline: boolean;
  /**
   * Apply the desired state. Idempotent, and returns true ONLY when the route
   * option actually changed, so a re-render can never re-apply it.
   */
  readonly sync: (shouldSuppress: boolean) => boolean;
  /**
   * Restore the captured baseline. Idempotent and safe from any cause: session
   * cancel, session confirm, household switch, sign-out and unmount.
   */
  readonly release: () => boolean;
}

/**
 * D3 — A LOCK THAT OWNS ONE ROUTE OPTION AND ALWAYS GIVES IT BACK.
 *
 * The exit swipe is NOT a JS gesture. `HomeCloud` is a card in the `MoreStack`
 * native stack, and react-native-screens implements the interactive pop as a
 * native pan recognizer on the stack; `NativeStackView` forwards the route's
 * `gestureEnabled` straight to `RNSScreen`. A JS `PanResponder` inside the list
 * cannot block a native recognizer, which is why the sweep could navigate away
 * mid-drag. The route option is the only supported seam, and it is iOS-only by
 * documentation — on Android the native screen's gesture is forced off and the
 * system back gesture is handled in JS, so D3 is structurally an iOS defect.
 *
 * WHY IT IS A LOCK AND NOT A PIECE OF STATE: the restore has to be exact and it
 * has to be idempotent, because the same session can be ended by a cancel, a
 * confirm, a household switch, a sign-out, an AppState change or an unmount, and
 * two of those can race. Capturing the baseline once and restoring that exact
 * value is what makes "no permanent disabling of app navigation" true by
 * construction rather than by care.
 *
 * React Navigation additionally clears `setOptions` overrides when the screen
 * unmounts, so a lock released here cannot leave a stale disabled route behind.
 */
export function createMemoryExitGestureLock(options: MemoryExitGestureLockOptions): MemoryExitGestureLock {
  const baseline = options.baseline ?? MEMORY_EXIT_GESTURE_BASELINE;
  let suppressed = false;
  let released = true;

  const apply = (gestureEnabled: boolean): boolean => {
    options.apply(gestureEnabled);
    return true;
  };

  return {
    get suppressed() {
      return suppressed;
    },
    baseline,
    sync(shouldSuppress) {
      if (shouldSuppress === suppressed) return false;
      suppressed = shouldSuppress;
      released = false;
      // Suppressing writes the documented "off"; releasing restores the baseline.
      return apply(suppressed ? false : baseline);
    },
    release() {
      if (released) return false;
      released = true;
      if (!suppressed) return false;
      suppressed = false;
      return apply(baseline);
    },
  };
}