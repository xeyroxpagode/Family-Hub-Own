/**
 * HomeCloud W1-B / W1-C — Files pagination + global completion reconciliation.
 *
 * W1-B and W1-C are both about things that used to be invisible:
 *
 *  W1-B — the Files list silently truncated at the backend's 100-item page, and
 *         every transition between pages was decided inside a component. The
 *         transitions are therefore asserted HERE, against the real controller
 *         and the real browser read over a stubbed transport.
 *
 *  W1-C — upload EXECUTION already survived the UI (T1), but READ
 *         reconciliation did not: it lived in `FileIntake`/`MemoryIntake`
 *         callbacks that unmount at acceptance. These tests drive the real
 *         household coordinator and the real reconciliation registry, with no
 *         intake component in the picture at all.
 *
 * No renderer and no mocks of HomeCloud behaviour: the real services run against
 * a stubbed transport.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fetchFilesBrowser, FILES_BROWSER_MAX_LIMIT } from '../front/mi-front-limpio/services/homecloud/homecloudFilesService';
import {
  appendUniqueFiles,
  createFilesPagination,
  hasMoreFilesPages,
  type FilesBrowserPage,
  type FilesPaginationState,
} from '../front/mi-front-limpio/services/homecloud/homecloudFilesPagination';
import {
  homeCloudReadReconciliationListenerCount,
  reconcileHomeCloudReadAfterCompletion,
  subscribeHomeCloudReadReconciliation,
  __resetHomeCloudReadReconciliationForTests,
} from '../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation';
import { fetchHomeCloudFoldersCached, invalidateHomeCloudHousehold } from '../front/mi-front-limpio/services/homecloud/homecloudReadService';
import { ensureUploadCoordinator, __resetUploadCoordinatorsForTests } from '../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator';
import { createUploadJob, transition } from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import { createInMemoryUploadJobStore } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';
import { plannerCache } from '../front/mi-front-limpio/services/planner/plannerCache';
import { ApiError } from '../front/mi-front-limpio/services/api';
import type { UploadJob } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

// ── transport stub ──────────────────────────────────────────────────────────

class Transport {
  readonly calls: string[] = [];
  private readonly routes: [string, { status: number; body: unknown }][] = [];
  private readonly hang: string[] = [];
  private fallback = { status: 500, body: { code: 'server_error', message: 'boom' } };

  on(match: string, route: { status: number; body: unknown }): this {
    this.routes.unshift([match, route]);
    return this;
  }

  /** Never answer: used to hold a response open and release it late. */
  hangOn(match: string): this {
    this.hang.push(match);
    return this;
  }

  release(match: string): this {
    const at = this.hang.indexOf(match);
    if (at !== -1) this.hang.splice(at, 1);
    return this;
  }

  countOf(match: string): number {
    return this.calls.filter((call) => call.includes(match)).length;
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown) => {
      const target = String(input);
      this.calls.push(target);
      for (const held of this.hang) if (target.includes(held)) return new Promise<Response>(() => {});
      for (const [match, route] of this.routes) if (target.includes(match)) return json(route.status, route.body);
      return json(this.fallback.status, this.fallback.body);
    }) as typeof fetch;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// ── page fixtures ───────────────────────────────────────────────────────────

type FakeFile = { id: string; displayName: string };

function fileAt(index: number): FakeFile {
  return { id: `c-${String(index).padStart(3, '0')}`, displayName: `doc-${index}.pdf` };
}

/** A page of `count` files starting at `from`, exactly like the backend pages. */
function pageOf(from: number, count: number, nextOffset: number | null): FilesBrowserPage {
  return {
    folders: [],
    files: Array.from({ length: count }, (_, index) => fileAt(from + index)) as never,
    nextOffset,
  };
}

/**
 * S4-iii C2 — a reader shaped like the backend `browseFiles` AFTER the has-more
 * probe: for a requested `limit` it reads one row more and then answers only
 * `limit` rows plus an EVIDENCE-BASED `nextOffset`. `total` is how many rows the
 * household really has, which is what makes the boundaries 100/200/300 testable.
 */
function probedPage(total: number, offset: number, limit = 100): FilesBrowserPage {
  const window = Math.max(Math.min(offset + limit + 1, total) - offset, 0);
  const hasMore = window > limit;
  return pageOf(offset, hasMore ? limit : window, hasMore ? offset + limit : null);
}

type Reader = (input: { limit: number; offset: number }) => Promise<FilesBrowserPage>;

/** A harness that records every state the controller publishes. */
function harness(reader: Reader, limit = 100) {
  const seen: FilesPaginationState[] = [];
  const controller = createFilesPagination({
    read: reader,
    limit,
    onState: (state) => seen.push(state),
  });
  return { controller, seen, last: () => seen[seen.length - 1] };
}

function resetCaches(): void {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  __resetUploadCoordinatorsForTests();
  storesByHousehold.clear();
}

// ── W1-B A: 101+ files ───────────────────────────────────────────────────────

async function testOverOneHundredFiles(): Promise<void> {
  console.log('\n=== W1-B A: more than 100 files are all reachable ===');
  resetCaches();
  const transport = new Transport();
  // 101 files: the read proves a second page exists with the 101st row and
  // answers 100 rows plus `nextOffset: 100`; the follow-up read answers the
  // single remaining file, which proves it was the last.
  transport.on('/api/homecloud/files', {
    status: 200,
    body: { browser: { folders: [], files: Array.from({ length: 100 }, (_, i) => fileAt(i)), nextOffset: 100 } },
  });
  transport.install();

  const seen: FilesPaginationState[] = [];
  let call = 0;
  const controller = createFilesPagination({
    limit: 100,
    onState: (state) => seen.push(state),
    read: async ({ limit, offset }) => {
      call += 1;
      if (offset === 0) {
        const data = await fetchFilesBrowser('tok', { limit, offset });
        return { folders: data.browser.folders, files: data.browser.files, nextOffset: data.browser.nextOffset };
      }
      // The single remaining file: a short page means the last page.
      return pageOf(100, 1, null);
    },
  });

  await controller.load();
  const first = controller.getState();
  record(first.files.length === 100, 'A1. page 1 holds the full 100 items (no silent truncation)');
  record(first.nextOffset === 100, 'A2. the read\'s PROVEN next offset is reported');
  record(hasMoreFilesPages(first), 'A3. so the list keeps paging on its own — STAGE 2 reopen removed the affordance entirely');
  record(transport.calls[0].includes('limit=100') && transport.calls[0].includes('offset=0'),
    'A4. the first page asks the EXISTING contract for limit/offset at 0');

  await controller.loadMore();
  const both = controller.getState();
  record(both.files.length === 101, 'A5. after "load more" all 101 files are present');
  record(both.files.every((file, index) => file.id === `c-${String(index).padStart(3, '0')}`),
    'A6. the order is exactly the paged order (nothing skipped, nothing reordered)');
  record(new Set(both.files.map((file) => file.id)).size === both.files.length,
    'A7. there are zero duplicate tiles');
  record(call === 2, 'A8. reaching 101 files cost exactly two page reads');
}

// ── W1-B B: final page ───────────────────────────────────────────────────────

async function testFinalPage(): Promise<void> {
  console.log('\n=== W1-B B: the final page offers no load-more ===');
  const { controller, last } = harness(async ({ offset }) => (offset === 0 ? probedPage(107, 0) : probedPage(107, offset)));

  await controller.load();
  record(hasMoreFilesPages(controller.getState()), 'B1. a non-null nextOffset means the list will keep paging on its own');
  await controller.loadMore();
  const final = controller.getState();
  record(final.nextOffset === null, 'B2. a short page resolves nextOffset to null (the last page)');
  record(!hasMoreFilesPages(final), 'B3. so the list stops asking, and shows no fake loading at the end');
  record(final.files.length === 107, 'B4. every item of the last page is still shown');

  // Asking again is a no-op, not a request past the end.
  const before = final.files.length;
  await controller.loadMore();
  record(controller.getState().files.length === before && controller.getState().nextOffset === null,
    'B5. loading more on the final page changes nothing');
  record(last().loadingMore === false, 'B6. and it does not leave the page spinner running');
}

// ── W1-B C: page failure ─────────────────────────────────────────────────────

async function testPageFailure(): Promise<void> {
  console.log('\n=== W1-B C: a failed page never destroys the loaded pages ===');
  let failNext = false;
const { controller } = harness(async ({ offset }) => {
    if (offset !== 0 && failNext) throw new ApiError('Se nos cayó la conexión.', 0, 'network_error');
    return offset === 0 ? probedPage(105, 0) : probedPage(105, offset);
  });

  await controller.load();
  failNext = true;
  await controller.loadMore();
  const failed = controller.getState();
  record(failed.files.length === 100, 'C1. page 1 stays fully visible after page 2 fails');
  record(failed.pageError !== null, 'C2. the page failure is reported');
  record(failed.loadingMore === false, 'C3. the spinner is released so the retry is usable');
  record(failed.nextOffset === 100, 'C4. nextOffset is untouched, so the retry asks for the SAME page');
  record(failed.loading === false, 'C5. a page failure is not presented as a first-page load');

  failNext = false;
  // STAGE 2 REOPEN: automatic next-page loading is LATCHED after a failure, so a
  // flaky connection cannot become a retry storm. Only an EXPLICIT request re-arms
  // it, which is exactly what the footer's `Reintentar` does — so the retry here is
  // `retryNextPage()`, not `loadMore()`. The two extra assertions make the latch
  // itself observable rather than incidental.
  await controller.loadMore();
  record(controller.getState().pageError !== null && controller.getState().autoPageBlocked === true,
    'C5a. a second AUTOMATIC attempt is refused while the failure is latched');
  record(controller.getState().nextOffset === 100 && controller.getState().files.length === 100,
    'C5b. and nothing was changed by the refusal: same offset, same loaded rows');
  await controller.retryNextPage();
  const retried = controller.getState();
  record(retried.pageError === null, 'C6. a successful retry clears the page error');
  record(retried.autoPageBlocked === false, 'C6a. and re-arms automatic paging');
  record(retried.files.length === 105, 'C7. the retried page is appended to what was already loaded');
}

// ── W1-B D/E/F: query, sort and folder resets ────────────────────────────────

async function testResets(): Promise<void> {
  console.log('\n=== W1-B D/E/F: query, sort and folder changes reset paging ===');
  const offsets: number[] = [];
  let dataset = 'A';
  const { controller } = harness(async ({ offset }) => {
    offsets.push(offset);
    // Query A has two pages; query B has one.
    if (dataset === 'A') return offset === 0 ? probedPage(104, 0) : probedPage(104, offset);
    return offset === 0 ? { folders: [], files: [fileAt(900)] as never, nextOffset: null } : pageOf(900, 9, null);
  });

  await controller.load();
  await controller.loadMore();
  record(controller.getState().files.length === 104, 'D1. query A is fully loaded (two pages)');

  offsets.length = 0;
  dataset = 'B';
  await controller.load();
  record(offsets[0] === 0, 'D2. a new query starts again at offset 0');
  record(controller.getState().files.length === 1, 'D3. the previous query\'s pages are REPLACED, not appended to');
  record(controller.getState().files.every((file) => file.id === 'c-900'),
    'D4. not a single item of the previous query survives');
  record(controller.getState().nextOffset === null, 'D5. and the new query brings its own paging state');

  // E: sort. Identical shape, different meaning — it must not inherit paging.
  offsets.length = 0;
  await controller.loadMore();
  await controller.load();
  record(offsets[0] === 0, 'E1. a sort change also restarts at offset 0');
  record(controller.getState().files.length === 1, 'E2. so a sort never inherits the previous page boundary');

  // F: folder.
  offsets.length = 0;
  await controller.load();
  record(offsets[0] === 0, 'F1. a folder change restarts at offset 0');

  // reset() is the household switch: everything goes, in flight included.
  dataset = 'A';
  await controller.load();
  await controller.loadMore();
  controller.reset();
  const afterReset = controller.getState();
  record(afterReset.files.length === 0 && afterReset.folders.length === 0 && afterReset.nextOffset === null,
    'F2. a household switch drops every loaded page');
}

// ── W1-B G: a stale response never contaminates a new query ──────────────────

/** A page read the test resolves by hand, to model a slow answer. */
function deferred(): { promise: Promise<FilesBrowserPage>; resolve: (page: FilesBrowserPage) => void } {
  let resolve!: (page: FilesBrowserPage) => void;
  const promise = new Promise<FilesBrowserPage>((settle) => { resolve = settle; });
  return { promise, resolve };
}

async function testStaleResponse(): Promise<void> {
  console.log('\n=== W1-B G: a late answer for query A cannot reach query B ===');
  const slowA = deferred();
  let dataset = 'A';
  const { controller } = harness(() => {
    if (dataset === 'A') return slowA.promise;
    return Promise.resolve({ folders: [], files: [fileAt(900)] as never, nextOffset: null });
  });

  const inFlightA = controller.load();
  dataset = 'B';
  await controller.load();
  record(controller.getState().files.length === 1, 'G1. query B is on screen while query A is still in flight');

  // Query A finally answers, with a full 100-item page plus its probe row.
  slowA.resolve(probedPage(101, 0));
  await inFlightA;
  const settled = controller.getState();
  record(settled.files.length === 1, 'G2. the late answer for A is DISCARDED, not appended');
  record(settled.files.every((file) => file.id === 'c-900'), 'G3. B still shows only its own results');
  record(settled.nextOffset === null, 'G4. and B keeps its own (final) page state');

  // The same must hold for a LATE PAGE of the current query.
  const slowPage = deferred();
  const { controller: paged } = harness(({ offset }) => (
    offset === 0 ? Promise.resolve(probedPage(103, 0)) : slowPage.promise
  ));
  await paged.load();
  const inFlightPage = paged.loadMore();
  // A household switch lands while the page is in flight.
  paged.reset();
  slowPage.resolve(probedPage(103, 100));
  await inFlightPage;
  record(paged.getState().files.length === 0,
    'G5. a page in flight when the household switched is discarded too');
  record(paged.getState().loadingMore === false,
    'G6. and the "load more" spinner does not survive the switch');
}

// ── W1-B H: folder ownership ─────────────────────────────────────────────────

async function testFolderOwnership(): Promise<void> {
  console.log('\n=== W1-B H: the folder catalogue has one owner ===');
  resetCaches();
  const transport = new Transport();
  transport.on('/api/homecloud/folders', { status: 200, body: { folders: [{ id: 'f-1', name: 'Docs' }] } });
  transport.on('/api/homecloud/files', {
    status: 200,
    body: { browser: { folders: [{ id: 'f-1', name: 'Docs' }], files: [], nextOffset: null } },
  });
  transport.install();

  // The catalogue is a household-scoped, CACHED read: repeated asks are one
  // request, which is what makes it safe to consult whenever it is needed.
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-a' });
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-a' });
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-a' });
  record(transport.countOf('/api/homecloud/folders') === 1,
    'H1. repeated catalogue reads collapse into ONE request (30s TTL)');
  record(transport.countOf('/api/homecloud/files') === 0,
    'H2. and the catalogue is never folded into the browser page read');

  // A household switch must not let one household's catalogue answer for another.
  invalidateHomeCloudHousehold({ householdId: 'hh-a' });
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-b' });
  record(transport.countOf('/api/homecloud/folders') === 2,
    'H3. another household reads its own catalogue, never the previous one');

  // The structural claim: Files no longer fires a catalogue request per load.
  const screen = readFront('screens/HomeCloudFilesScreen.tsx');
  record(!screen.includes('fetchHomeCloudFolders('),
    'H4. Files no longer uses the uncached catalogue fetch');
  record(screen.includes('fetchHomeCloudFoldersCached'),
    'H5. the catalogue has exactly one owner: the cached household-scoped read');
  const loadBody = between(screen, 'const load = useCallback', 'const loadMore = useCallback');
  record(!loadBody.includes('folders'),
    'H6. the list load no longer touches the catalogue at all');
  const catalogAssignments = screen.match(/setAllFolders\([^)]*\)/g) ?? [];
  record(catalogAssignments.length > 0 && catalogAssignments.every((line) => !line.includes('browser')),
    'H7. the catalogue is NEVER filled from the browser payload (one owner, no second source)');

  // And the picker is not broken by that: it still receives a destination list.
  record(/folders=\{allFolders\.length > 0 \? allFolders : folders\}/.test(screen),
    'H8. the move picker still receives a household-wide destination list');
}

// ── W1-C: the completion path ───────────────────────────────────────────────

type Reconciliation = { householdId: string; jobId: string; role: 'file' | 'memory' };

/**
 * Drive a REAL household coordinator to a real `completed` durable state.
 *
 * This is the W1-C authority: no intake component, no screen, no callback. If
 * reconciliation happens here, it cannot have come from a UI.
 */
/**
 * The durable store, one per household.
 *
 * This mirrors production: the T1 coordinator is a process singleton per
 * household and its STORE is fixed at creation, so several jobs of the same
 * household share one store. Creating a fresh store per call would make the
 * second job invisible to the already-configured coordinator.
 */
const storesByHousehold = new Map<string, ReturnType<typeof createInMemoryUploadJobStore>>();

function storeFor(householdId: string) {
  const existing = storesByHousehold.get(householdId);
  if (existing) return existing;
  const created = createInMemoryUploadJobStore();
  storesByHousehold.set(householdId, created);
  return created;
}

async function completeJobViaCoordinator(input: {
  householdId: string;
  jobId: string;
  role: 'file' | 'memory';
}): Promise<void> {
  const store = storeFor(input.householdId);
  const job = createUploadJob(input.householdId, {
    role: input.role,
    intakeSource: 'w1c:test',
    initialFolderId: null,
    initialAlbumId: null,
    caption: null,
    capturedAt: null,
    capturedYear: null,
    capturedMonth: null,
    capturePrecision: null,
  }, {
    localUri: `file:///w1c/${input.jobId}.pdf`,
    displayName: `${input.jobId}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 10,
    extension: 'pdf',
  });
  // The test drives the exact id it wants to reason about.
  const named: UploadJob = { ...job, id: input.jobId };
  store.put(named);

  const coordinator = ensureUploadCoordinator({
    store,
    householdId: input.householdId,
    run: async (jobId) => {
      // The LEGAL path through the frozen 9-state FSM. Taking a shortcut here
      // would throw inside the pump, which is exactly the kind of silent
      // failure this test must not paper over.
      let current = store.get(jobId)!;
      for (const next of ['registering', 'registered', 'uploading', 'verifying', 'finalizing', 'completed'] as const) {
        current = transition(current, next, next === 'registering' ? { contentId: `content-${input.jobId}` } : undefined);
        store.put(current);
      }
      return current;
    },
  });
  await coordinator.requestPump('w1c:test');

  // The durable store is the proof that this was a real completion, not a
  // simulation of one.
  const durable = store.get(input.jobId);
  if (!durable || durable.state !== 'completed') {
    throw new Error(`W1-C harness failed: job ${input.jobId} did not reach completed`);
  }
}

/**
 * Mount a surface: it hears the household's signal and acts ONLY on its own
 * role, exactly as the Files and Memories screens do.
 */
function observe(householdId: string, role: 'file' | 'memory'): { events: Reconciliation[]; stop: () => void } {
  const events: Reconciliation[] = [];
  const stop = subscribeHomeCloudReadReconciliation(householdId, (event) => {
    if (event.role !== role) return;
    events.push({ householdId: event.householdId, jobId: event.jobId, role: event.role });
  });
  return { events, stop };
}

async function testFileCompletionWithoutIntake(): Promise<void> {
  console.log('\n=== W1-C A/B: a File completion reconciles with or without the surface ===');
  resetCaches();

  // A: NO FileIntake, NO screen, NO callback — the accepted job's UI is long
  // gone. The ONLY thing that exists here is the household coordinator, the
  // durable store and the read layer.
  const unmounted = observe('hh-a', 'file');
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-a', role: 'file' });
  record(unmounted.events.length === 1,
    'A1. the completion is reported with no intake instance in existence (it is not a UI effect)');
  record(reconcileHomeCloudReadAfterCompletion({ householdId: 'hh-a', jobId: 'job-a', role: 'file' }) === null,
    'A2. and re-observing the same completed job is an idempotent no-op');

  // B: the same completion with the Files surface mounted.
  resetCaches();
  const mounted = observe('hh-a', 'file');
  const memory = observe('hh-a', 'memory');
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-b', role: 'file' });
  record(mounted.events.length === 1 && mounted.events[0].jobId === 'job-b',
    'B1. a mounted Files surface is told exactly once, without refocus or navigation');
  record(mounted.events[0].householdId === 'hh-a', 'B2. the event carries the real household');
  record(memory.events.length === 0, 'B3. a Memory surface ignores a FILE completion');
  mounted.stop(); memory.stop();
}

async function testMemoryCompletionWithoutIntake(): Promise<void> {
  console.log('\n=== W1-C D/E: Memory and Scanner land on the same path ===');
  resetCaches();

  // D: the MemoryIntake service is gone; only the job and the coordinator remain.
  const memories = observe('hh-a', 'memory');
  const files = observe('hh-a', 'file');
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-m', role: 'memory' });
  record(memories.events.length === 1 && memories.events[0].role === 'memory',
    'D1. a Memory completion reconciles the Memory read state with no intake instance alive');
  record(files.events.length === 0, 'D2. and never the Files read state');
  memories.stop(); files.stop();

  // E: a Scanner file is just a `role=file` job, so it must use this same path.
  resetCaches();
  const scanner = observe('hh-a', 'file');
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-scan', role: 'file' });
  record(scanner.events.length === 1, 'E1. a Scanner-produced file uses the same global reconciliation');
  record(scanner.events[0].jobId === 'job-scan', 'E2. reported against the real job, not the screen');
  scanner.stop();
}

async function testNoRefreshLoop(): Promise<void> {
  console.log('\n=== W1-C F: a repeated completed observation cannot loop ===');
  resetCaches();
  const seen = observe('hh-a', 'file');
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-loop', role: 'file' });
  record(seen.events.length === 1, 'F1. the completion notifies once');

  // The same completed job observed again and again (pump, recovery, snapshot).
  for (let attempt = 0; attempt < 5; attempt += 1) {
    reconcileHomeCloudReadAfterCompletion({ householdId: 'hh-a', jobId: 'job-loop', role: 'file' });
  }
  record(seen.events.length === 1, 'F2. five further observations produce no further notification');
  const result = reconcileHomeCloudReadAfterCompletion({ householdId: 'hh-a', jobId: 'job-loop', role: 'file' });
  record(result === null, 'F3. a repeated completion is reported as a no-op, not as new work');

  // And a genuinely NEW job of the same household still reconciles: the guard is
  // per job, not a latch that silences the domain forever.
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-loop-2', role: 'file' });
  record(seen.events.length === 2, 'F4. a different job in the same household still reconciles');
  seen.stop();
}

async function testHouseholdIsolation(): Promise<void> {
  console.log('\n=== W1-C G: household isolation ===');
  resetCaches();
  const inA = observe('hh-a', 'file');
  const inB = observe('hh-b', 'file');
  record(homeCloudReadReconciliationListenerCount('hh-a') === 1 && homeCloudReadReconciliationListenerCount('hh-b') === 1,
    'G1. each household has its own subscriber set');

  // Household A's job completes while the UI is scoped to B.
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-iso', role: 'file' });
  record(inB.events.length === 0, 'G2. a completion in A never refreshes B');
  record(inA.events.length === 1, 'G3. and it does refresh A');
  record(inB.events.every((event) => event.householdId === 'hh-b'), 'G4. no event ever crosses households');

  // The read-cache invalidation is equally scoped.
  await fetchHomeCloudFoldersCached('tok', { householdId: 'hh-b' });
  await completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-iso-2', role: 'file' });
  const survivors = plannerCache.dump().filter((entry) => entry.status === 'fresh' && String(entry.key[2]) === 'hh-b');
  record(survivors.length >= 1, 'G5. A\'s completion never drops B\'s read cache');
  inA.stop(); inB.stop();
}

async function testConcurrentDomains(): Promise<void> {
  console.log('\n=== W1-C H: concurrent jobs reconcile their own domain ===');
  resetCaches();
  const files = observe('hh-a', 'file');
  const memories = observe('hh-a', 'memory');

  await Promise.all([
    completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-cf', role: 'file' }),
    completeJobViaCoordinator({ householdId: 'hh-a', jobId: 'job-cm', role: 'memory' }),
  ]);

  record(files.events.length === 1 && files.events[0].jobId === 'job-cf',
    'H1. the Files read state is reconciled by the FILE job');
  record(memories.events.length === 1 && memories.events[0].jobId === 'job-cm',
    'H2. the Memory read state is reconciled by the MEMORY job');
  record(files.events.every((event) => event.role === 'file') && memories.events.every((event) => event.role === 'memory'),
    'H3. neither domain reconciles the other\'s read state');
  files.stop(); memories.stop();
}

function testReadInvalidationAndSecurity(): void {
  console.log('\n=== W1-C: read invalidation + no client authority ===');
  resetCaches();
  const raw = readFront('services/homecloud/homecloudReadReconciliation.ts');
  const source = stripComments(raw);
  record(source.includes('invalidateHomeCloudHousehold'),
    'I1. reconciliation uses the read layer\'s OWN invalidation (no parallel bookkeeping)');
  record(!source.includes('setInterval') && !source.includes('setTimeout'),
    'I2. no polling and no timer waits for finalize');
  record(!/fetch\(|requestJson|XMLHttpRequest/.test(source),
    'I3. the reconciliation itself issues no request of its own');
  record(!/bucket|storage_path|storagePath/.test(source),
    'I4. it never carries a bucket or a storage path');
  // The prohibition must hold in CODE, not only in prose.
  record(/bucket|storage_path|storagePath/.test(raw) === true,
    'I4b. the module really does discuss those terms, so I4 is checking code and not a vacuous match');

  const coordinator = stripComments(readFront('services/homecloud/homecloudUploadCoordinator.ts'));
  record(coordinator.includes('reconcileHomeCloudReadAfterCompletion'),
    'I5. the T1 coordinator is the one that reports the completion');
  record(!/setInterval/.test(coordinator), 'I6. the coordinator was not turned into a poller');
  record(readFront('services/homecloud/homecloudUploadRuntime.ts').includes('recoverUploadJobs'),
    'I7. there is still exactly ONE runtime and ONE recovery path');

  const files = readFront('screens/HomeCloudFilesScreen.tsx');
  record(files.includes('subscribeHomeCloudReadReconciliation'),
    'I8. Files listens to the global signal instead of relying on intake onComplete');
  const memories = readFront('screens/HomeCloudMemoriesScreen.tsx');
  record(memories.includes('subscribeHomeCloudReadReconciliation'),
    'I9. and so does Memories');
  // Correctness must not DEPEND on the intake callbacks, which are only a
  // local dismissal convenience. The proof is that the global subscription is
  // not tied to the intake lifecycle at all: it exists whether or not any
  // intake sheet is open, and its effect never re-subscribes because one is.
  // The window is anchored on the CALL SITE (not the import) so the check sees
  // the effect body and its dependency array, and nothing else.
  const filesEffect = between(files, 'return subscribeHomeCloudReadReconciliation', '}, [currentHousehold?.id, refresh]);');
  record(filesEffect.length > 0 && !/uploadOpen|fileInfo|addOpen|folderEditor/.test(filesEffect),
    'I10. the Files reconciliation is not bound to the intake lifecycle (unmount cannot break it)');
  const memoriesEffect = between(memories, 'return subscribeHomeCloudReadReconciliation', '}, [currentHousehold?.id, token, readFirstPage]);');
  record(memoriesEffect.length > 0 && !/draft|recorder|review|MemoryIntake/.test(memoriesEffect),
    'I11. the Memories reconciliation is not bound to the intake lifecycle either');
}

function testAppendHelper(): void {
  console.log('\n=== W1-B: dedupe helper ===');
  const page1 = [fileAt(0), fileAt(1)] as never as Parameters<typeof appendUniqueFiles>[0];
  const page2 = [fileAt(1), fileAt(2)] as never as Parameters<typeof appendUniqueFiles>[0];
  const merged = appendUniqueFiles(page1, page2);
  record(merged.length === 3, 'J1. an overlapping page never duplicates a tile');
  record(merged.map((file) => file.id).join(',') === 'c-000,c-001,c-002', 'J2. and the loaded order is preserved');
  record(appendUniqueFiles(page1, []).length === 2, 'J3. an empty page changes nothing');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function readFront(relative: string): string {
  const root = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio');
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  return start === -1 || end === -1 ? '' : source.slice(start, end);
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

async function main(): Promise<void> {
  console.log('=== HOMECLOUD W1-B / W1-C FILES PAGINATION + RECONCILIATION TESTS ===');
  record(FILES_BROWSER_MAX_LIMIT === 100, 'A0. the page size is the backend maximum (100)');

  await testOverOneHundredFiles();
  await testFinalPage();
  await testPageFailure();
  await testResets();
  await testStaleResponse();
  await testFolderOwnership();
  testAppendHelper();

  await testFileCompletionWithoutIntake();
  await testMemoryCompletionWithoutIntake();
  await testNoRefreshLoop();
  await testHouseholdIsolation();
  await testConcurrentDomains();
  testReadInvalidationAndSecurity();

  console.log(`\nHOMECLOUD_W1BC_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_W1BC_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_W1BC_TESTS=PASS');
  }
}

void main();
