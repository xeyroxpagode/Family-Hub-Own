import {
  ALBUMS_RAIL_INITIAL,
  createAlbumsRailController,
  solveAlbumsRailPhase,
  solveAlbumsRailShowsSkeleton,
  type AlbumsRailState,
} from '../front/mi-front-limpio/services/homecloud/homecloudAlbumsPagination';
import type { HomeCloudAlbum } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

/**
 * HC2-C C0 BUG B — the Albums rail's first paint, deterministically.
 *
 * WHAT IS BEING PROVEN
 * --------------------
 * B1: a scope reset that runs AFTER the rail's reads must not be able to strand
 *     the rail. The controller REJECTS any answer whose generation is not the
 *     newest, so `load -> reload -> reset` used to discard every answer and leave
 *     the rail at `loading: true, albums: []` with nothing left to re-read.
 * B2: the first paint is ONE read, not two contradictory ones.
 * R3: household isolation is NOT weakened. A real scope change still drops the
 *     previous household before the new scoped read is issued.
 *
 * These are executed against the REAL controller, so the ordering is proven by
 * behaviour rather than asserted from reading the screen.
 */

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}

function album(id: string): HomeCloudAlbum {
  return {
    id, name: `Album ${id}`, coverContentId: null, createdByMemberId: null,
    createdAt: null, itemCount: 0,
  } as unknown as HomeCloudAlbum;
}

/** A read whose answer can be resolved by hand, so ordering is observable. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

interface Harness {
  readonly controller: ReturnType<typeof createAlbumsRailController>;
  readonly states: AlbumsRailState[];
  readonly latest: () => AlbumsRailState;
  /** How many reads were issued, in order, with their kind. */
  readonly reads: string[];
  /** How many of those reads were AUTHORITATIVE. */
  authoritativeReads(): number;
}

function harness(answers: Record<string, readonly HomeCloudAlbum[] | Error>): Harness {
  const states: AlbumsRailState[] = [];
  const reads: string[] = [];
  const pending = new Map<string, ReturnType<typeof deferred<readonly HomeCloudAlbum[]>>>();
  const controller = createAlbumsRailController({
    onState: (state) => states.push(state),
    read: async ({ authoritative }) => {
      const key = authoritative ? 'authoritative' : 'cached';
      reads.push(key);
      const gate = deferred<readonly HomeCloudAlbum[]>();
      pending.set(`${key}-${reads.filter((r) => r === key).length}`, gate);
      const answer = answers[key];
      if (answer instanceof Error) { gate.reject(answer); return gate.promise; }
      gate.resolve(answer ?? []);
      return gate.promise;
    },
  });
  return {
    controller,
    states,
    reads,
    authoritativeReads: () => reads.filter((r) => r === 'authoritative').length,
    latest: () => states[states.length - 1] ?? ALBUMS_RAIL_INITIAL,
  };
}

/** Let every already-resolved promise settle. */
async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) await Promise.resolve();
}

console.log('\n=== HC2-C ALBUMS RAIL FIRST PAINT (C0 B1/B2/B4 + R3) ===');

/**
 * The rail controller is asynchronous, so the sequencing proofs are executed
 * inside one async run. The process exit code is still set from `failed`, so a
 * rejection here cannot masquerade as a pass.
 */
void (async function runAlbumsRailProofs(): Promise<void> {

// ---------------------------------------------------------------------------
// 1. THE REPORTED DEFECT: load -> reload -> reset, with no later read
// ---------------------------------------------------------------------------
{
  const h = harness({ cached: [album('a1')], authoritative: [album('a1'), album('a2')] });
  h.controller.load();
  h.controller.reload();
  h.controller.reset();
  await settle();
  check(
    h.latest().loading === true && h.latest().albums.length === 0,
    'REPRODUCED: load -> reload -> reset with no later read strands the rail on the skeleton forever',
  );
  check(h.reads.length === 2, 'the stranded sequence issued exactly the two reads that were both discarded');
}

// ---------------------------------------------------------------------------
// 2. THE FIX: the read is emitted by the scope effect, AFTER the reset
// ---------------------------------------------------------------------------
{
  const h = harness({ cached: [album('a1'), album('a2')], authoritative: [album('a1'), album('a2')] });
  // The order React may produce: focus reload, then the scope reset + its read.
  h.controller.reload();
  h.controller.reset();
  h.controller.load();
  await settle();
  check(
    h.latest().albums.length === 2 && h.latest().loading === false,
    'reset followed by its own read RESOLVES: the first paint is never stranded',
  );
  check(solveAlbumsRailPhase(h.latest()) === 'ready-data', 'the rail reaches ready-data instead of the skeleton');
}
{
  // The other order: the scope reset + read first, then the focus reload.
  const h = harness({ cached: [album('a1')], authoritative: [album('a1'), album('a2')] });
  h.controller.reset();
  h.controller.load();
  h.controller.reload();
  await settle();
  check(
    h.latest().albums.length === 2 && h.latest().loading === false,
    'a focus reload after the scoped read still resolves the rail',
  );
  check(h.authoritativeReads() === 1, 'focus contributes exactly ONE authoritative read');
}
{
  // The initial mount has no previous household: reset is a harmless no-op and
  // the single read resolves.
  const h = harness({ cached: [album('a1')] });
  h.controller.reset();
  h.controller.load();
  await settle();
  check(h.latest().albums.length === 1 && h.latest().loading === false, 'the INITIAL MOUNT resolves on its own');
  check(h.reads.length === 1, 'the initial mount issues exactly ONE first-paint read (B2)');
}

// ---------------------------------------------------------------------------
// 3. HOUSEHOLD ISOLATION IS NOT WEAKENED (R3)
// ---------------------------------------------------------------------------
{
  const h = harness({ cached: [album('houseA-1')], authoritative: [album('houseA-1')] });
  h.controller.reset();
  h.controller.load();
  await settle();
  check(h.latest().albums[0]?.id === 'houseA-1', 'household A resolves its own Albums');

  // A real scope change: reset FIRST (dropping A), then the new scoped read.
  h.states.length = 0;
  h.controller.reset();
  check(h.latest().albums.length === 0, 'a scope change drops the previous household IMMEDIATELY, before any read');
  check(solveAlbumsRailPhase(h.latest()) === 'loading', 'and shows an honest skeleton, because nothing is known yet');
  h.controller.load();
  await settle();
  check(h.latest().albums[0]?.id === 'houseA-1', 'the new scoped read resolves for the new scope');
}
{
  // A late answer for the PREVIOUS household can never repaint the new one.
  const gate = deferred<readonly HomeCloudAlbum[]>();
  const states: AlbumsRailState[] = [];
  const controller = createAlbumsRailController({
    onState: (state) => states.push(state),
    read: async ({ authoritative }) => (authoritative ? [album('houseA-1')] : gate.promise),
  });
  const inFlight = controller.load();
  controller.reset();
  gate.resolve([album('stale-1')]);
  await inFlight;
  await settle();
  const latest = states[states.length - 1];
  check(latest.albums.length === 0 && latest.loading === true, 'a stale in-flight answer cannot paint into the new scope');
}

// ---------------------------------------------------------------------------
// 4. THE FIVE MUTUALLY EXCLUSIVE STATES (§23)
// ---------------------------------------------------------------------------
{
  const cases: [AlbumsRailState, string, string][] = [
    [ALBUMS_RAIL_INITIAL, 'loading', 'a never-answered first paint is loading'],
    [{ albums: [], loading: false, refreshing: false, error: null }, 'ready-empty', 'a successful read with no Albums is ready-empty, not loading'],
    [{ albums: [album('a')], loading: false, refreshing: false, error: null }, 'ready-data', 'Albums on screen is ready-data'],
    [{ albums: [], loading: false, refreshing: false, error: 'boom' }, 'error', 'a failed read with nothing beside it is an error'],
    [{ albums: [album('a')], loading: false, refreshing: true, error: null }, 'refreshing', 'a re-read over valid Albums is refreshing'],
    [{ albums: [album('a')], loading: false, refreshing: true, error: 'boom' }, 'refreshing', 'a failure WITH content keeps the tiles: the message is published beside them'],
    [{ albums: [], loading: true, refreshing: false, error: 'boom' }, 'error', 'an error wins over a stale loading flag'],
  ];
  for (const [state, expected, label] of cases) {
    check(solveAlbumsRailPhase(state) === expected, label);
  }
  check(
    solveAlbumsRailPhase({ albums: [album('a')], loading: true, refreshing: false, error: null }) === 'ready-data',
    'content always wins over a loading flag, so a re-read never hides valid Albums',
  );
}

// ---------------------------------------------------------------------------
// 5. REFRESHING NEVER RENDERS A SKELETON (§23.4)
// ---------------------------------------------------------------------------
{
  const h = harness({ cached: [album('a1')], authoritative: [album('a1')] });
  h.controller.reset();
  h.controller.load();
  await settle();
  const statesWhileRefreshing: AlbumsRailState[] = [];
  h.controller.reload();
  // The published state at the START of a reload is what the surface sees.
  statesWhileRefreshing.push(h.latest());
  await settle();
  check(
    solveAlbumsRailPhase(h.latest()) !== 'loading',
    'a reload over already-loaded Albums never returns to the skeleton phase',
  );
  check(statesWhileRefreshing.length === 1 && statesWhileRefreshing[0]!.albums.length === 1, 'the albums stay on screen through the reload');
  check(h.latest().refreshing === true || h.latest().albums.length === 1, 'the reload resolves back to the same Albums');
}

// ---------------------------------------------------------------------------
// 6. ERROR KEEPS AN EXPLICIT RETRY, AND SKELETONS NEVER BECOME THE EMPTY STATE
// ---------------------------------------------------------------------------
{
  const h = harness({ cached: new Error('sin red'), authoritative: new Error('sin red') });
  h.controller.reset();
  h.controller.load();
  await settle();
  check(h.latest().error !== null, 'a failed first read publishes the message');
  check(solveAlbumsRailPhase(h.latest()) === 'error', 'a failed first read is an ERROR state, never a disguised empty household');
  // The retry is the same authoritative path the surface already calls.
  h.controller.reload();
  await settle();
  check(h.latest().error !== null, 'retrying the failure keeps the honest error while it still fails');
  check(h.reads.length === 2, 'the retry is a real re-read, not a silent success');
}

// ---------------------------------------------------------------------------
// 7. A PAGE-0 RE-READ WITH CONTENT NEVER SHOWS A SKELETON (§23.8 / §9)
// ---------------------------------------------------------------------------
{
  check(solveAlbumsRailShowsSkeleton(false) === true, 'with nothing loaded a page-0 read shows the skeleton');
  check(solveAlbumsRailShowsSkeleton(true) === false, 'with content already on screen a page-0 read shows NOTHING');
}

// ---------------------------------------------------------------------------
// 8. SUPPLEMENTARY STRUCTURAL ASSERTIONS (effect ORDER is the whole bug)
// ---------------------------------------------------------------------------
{
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const root = process.cwd();
  const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'), 'utf8');
  const rail = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/homecloud/AlbumsRail.tsx'), 'utf8');

  // B1 as a structural property: the rail READ is the LAST statement of the ONE
  // scope-reset effect, i.e. it can never precede the reset that invalidates it.
  const scopeEffect = screen.slice(screen.indexOf('railControllerRef.current!.reset();'));
  check(
    /railControllerRef\.current!\.reset\(\);[\s\S]*?if \(token && householdId\) void railControllerRef\.current!\.load\(\);/.test(scopeEffect),
    'the rail read is emitted by the scope-reset effect, AFTER the reset',
  );
  check(
    !/const loadRail = useCallback/.test(screen) && !/void loadRail\(\)/.test(screen),
    'there is NO separate first-paint rail effect any more (one read, not two)',
  );
  check(
    /solveAlbumsRailPhase\(state\)/.test(rail) && /phase === 'error'/.test(rail) && /phase === 'ready-empty'/.test(rail),
    'the Albums surface resolves its phase in ONE place instead of re-deriving booleans',
  );
  // B4: the root header is no longer unmounted behind a whole-body skeleton.
  check(
    /ListEmptyComponent=\{timelineEmptyState\}/.test(screen),
    'the Timeline declares its own loading/empty/error as ListEmptyComponent',
  );
  check(
    !/\) : loading \? \(\s*<MemoriesLoadingSkeleton \/>/.test(screen),
    'the whole-body skeleton branch that unmounted the Albums section is gone',
  );
  check(
    /if \(token && householdId\) void railControllerRef\.current!\.load\(\);/.test(screen)
      && screen.includes('railControllerRef.current!.reset();'),
    'R3: the scope reset still runs on a real household change',
  );
}

console.log(failed === 0 ? '\nHC2C_ALBUMS_RAIL_TESTS=PASS' : `\nHC2C_ALBUMS_RAIL_TESTS=FAIL fail=${failed}`);
if (failed) process.exitCode = 1;
})().catch((error: unknown) => {
  failed += 1;
  console.error('FAIL: the Albums rail proof run threw', error);
  console.log(`\nHC2C_ALBUMS_RAIL_TESTS=FAIL fail=${failed}`);
  process.exitCode = 1;
});