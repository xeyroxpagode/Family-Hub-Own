import fs from 'node:fs';
import path from 'node:path';
import {
  beginMemoryViewerOpening,
  reportMemoryViewerDragBegin,
  reportMemoryViewerSettle,
  resolveMemoryViewerIndex,
  reuseMemoryViewerDataset,
  solveMemoryViewerAlignment,
  type MemoryViewerAlignmentCommand,
  type MemoryViewerOpeningState,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryViewerOpening';
import {
  albumViewerSession,
  collectionViewerSession,
  libraryViewerSession,
  memoryViewerDataset,
  type MemoryViewerSession,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource';
import type { HomeCloudMemoryListItem, HomeCloudMemoryKind } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

/**
 * HC2-C C0/C4 — the Viewer's OPENING INVARIANT, deterministically.
 *
 * THE PRODUCT TRUTH UNDER TEST
 *   EL MEMORY QUE EL USUARIO TOCÓ ES LA AUTORIDAD INICIAL DEL VIEWER.
 *
 * Every assertion below is BEHAVIOURAL: it drives the pure opening decisions
 * with the exact event sequence a native pager produces and checks what the
 * Viewer is allowed to do. The few source assertions are supplementary and only
 * cover structural truths that genuinely live in a style declaration (a page
 * declaring its width), which is why they are marked as such.
 */

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}

function memory(id: string, kind: HomeCloudMemoryKind): HomeCloudMemoryListItem {
  return {
    id, kind, role: 'memory', displayName: null, mimeType: kind === 'written' ? null : `${kind}/test`,
    extension: null, sizeBytes: null, uploadedByMemberId: null, uploadedAt: null, hasPreview: false,
    hiddenFromResurfacing: false, caption: null, writtenText: kind === 'written' ? id : null,
    capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown', albumIds: [],
    favorite: false,
  };
}

/** The Viewer's whole model, as ONE deterministic simulation harness. */
class ViewerSimulation {
  /** The dataset the pager pages over. */
  dataset: readonly HomeCloudMemoryListItem[];
  /** THE authority: what the parent currently holds. */
  activeContentId: string;
  /** The content id the pager was last commanded to align to. */
  alignedContentId: string | null = null;
  opening: MemoryViewerOpeningState;
  /** Every accepted authority write, in order. A regression shows up here. */
  readonly writes: string[] = [];
  /** How many `scrollToIndex` commands were issued. */
  alignCommands = 0;
  /** How many times the source was re-read. */
  nearEndCalls = 0;

  constructor(dataset: readonly HomeCloudMemoryListItem[], tappedContentId: string) {
    this.dataset = dataset;
    this.activeContentId = tappedContentId;
    this.opening = beginMemoryViewerOpening(tappedContentId, resolveMemoryViewerIndex(dataset, tappedContentId));
  }

  get activeIndex(): number {
    return resolveMemoryViewerIndex(this.dataset, this.activeContentId);
  }

  get isMissing(): boolean {
    return this.dataset.length === 0 || this.activeIndex < 0;
  }

  /** The one and only re-run of the alignment effect. */
  render(): MemoryViewerAlignmentCommand {
    const command = solveMemoryViewerAlignment({
      requestedIndex: this.opening.requestedIndex,
      activeIndex: this.activeIndex,
      locked: this.opening.locked,
      requestedContentId: this.opening.requestedContentId,
      activeContentId: this.activeContentId,
      alignedContentId: this.alignedContentId,
    });
    if (command.kind !== 'align') return command;
    this.alignedContentId = this.opening.locked ? this.opening.requestedContentId : this.activeContentId;
    this.alignCommands += 1;
    return command;
  }

  private accept(next: ReturnType<typeof reportMemoryViewerSettle>): void {
    if (next.state !== this.opening) this.opening = next.state;
  }

  /** `onMomentumScrollEnd(contentOffsetX)` against a viewport of `width`. */
  momentumSettled(contentOffsetX: number, width: number): void {
    const computedIndex = width > 0 ? Math.round(contentOffsetX / width) : 0;
    if (this.dataset.length > 0 && computedIndex >= this.dataset.length - 3) this.nearEndCalls += 1;
    const result = reportMemoryViewerSettle(this.opening, computedIndex, this.activeIndex);
    this.accept(result);
    if (!result.accept) return;
    const item = this.dataset[computedIndex];
    if (item !== undefined && item.id !== this.activeContentId) {
      this.activeContentId = item.id;
      this.writes.push(item.id);
    }
  }

  /** `onScrollEndDrag(contentOffsetX)`: releases the lock, never writes settled content. */
  dragEnded(contentOffsetX: number, width: number): void {
    if (!this.opening.locked) return;
    const computedIndex = width > 0 ? Math.round(contentOffsetX / width) : 0;
    this.accept(reportMemoryViewerSettle(this.opening, computedIndex, this.activeIndex));
  }

  /** `onScrollBeginDrag`: a real finger. */
  fingerDown(): void {
    this.accept(reportMemoryViewerDragBegin(this.opening));
  }
}

console.log('\n=== HC2-C VIEWER OPENING (C0 A2/A3/A4 + C4) ===');

const WIDTH = 400;
const image0 = memory('img-0', 'image');
const video1 = memory('vid-1', 'video');
const audio2 = memory('aud-2', 'audio');
const note3 = memory('not-3', 'written');
const image4 = memory('img-4', 'image');
const video5 = memory('vid-5', 'video');
const library = [image0, video1, audio2, note3, image4, video5];

// ---------------------------------------------------------------------------
// 1. EXACT OPEN at index 0
// ---------------------------------------------------------------------------
{
  const v = new ViewerSimulation(library, 'img-0');
  check(v.opening.locked && v.opening.requestedIndex === 0, 'a tapped Memory at index 0 arms the opening lock at index 0');
  const firstAlign = v.render();
  check(firstAlign.kind === 'align' && (firstAlign as { index: number }).index === 0, 'the first render aligns the pager to the requested index 0');
  check(v.render().kind === 'hold', 'a second render at the same requested index issues nothing: the alignment is idempotent');
  // Initial alignment produces NO momentum event at all on a non-animated
  // scrollToIndex. The user must still be on the tapped Memory.
  check(v.activeContentId === 'img-0' && v.writes.length === 0, 'a programmatic alignment that reports nothing leaves the tapped Memory active');
  // Noise: the pager reports a WRONG physical page during opening.
  v.momentumSettled(WIDTH * 1, WIDTH);
  check(v.activeContentId === 'img-0' && v.writes.length === 0, 'opening noise at index 1 is IGNORED, not treated as navigation');
  check(v.opening.locked, 'opening noise keeps the lock held');
  // A second, different noise value is still ignored.
  v.momentumSettled(WIDTH * 5, WIDTH);
  check(v.writes.length === 0 && v.activeContentId === 'img-0', 'further opening noise never rewrites the authority');
  // Finally the pager reports the requested page.
  v.momentumSettled(0, WIDTH);
  check(!v.opening.locked, 'the settle event that matches the requested index releases the lock');
  check(v.activeContentId === 'img-0', 'the releasing settle leaves the tapped Memory as the authority');
  check(v.writes.length === 0 && v.alignCommands === 1, 'confirming the id the user already tapped announces nothing and re-scrolls nothing');
}

// ---------------------------------------------------------------------------
// 2. EXACT OPEN at a NONZERO index (the reported Video/Audio jump)
// ---------------------------------------------------------------------------
{
  const v = new ViewerSimulation(library, 'vid-1');
  check(v.opening.requestedIndex === 1, 'a tapped Video at index 1 resolves to index 1');
  const align = v.render();
  check(align.kind === 'align' && (align as { index: number }).index === 1, 'the pager aligns to the requested nonzero index');
  // The exact failure mode that was observed: the physical offset reads as page
  // 0 and the Viewer used to follow it to the FIRST Memory.
  v.momentumSettled(0, WIDTH);
  check(v.activeContentId === 'vid-1', 'a wrong initial physical offset at index 0 does NOT move the Viewer to the first Memory');
  check(v.writes.length === 0, 'that wrong offset produced NO authority write at all');
  v.momentumSettled(WIDTH, WIDTH);
  check(!v.opening.locked && v.activeContentId === 'vid-1', 'the correct settle confirms the tapped Video and unlocks');
}
{
  const v = new ViewerSimulation(library, 'aud-2');
  v.render();
  v.momentumSettled(0, WIDTH);
  check(v.activeContentId === 'aud-2', 'a tapped Audio survives an initial offset that reads as page 0');
}
{
  const v = new ViewerSimulation(library, 'not-3');
  v.render();
  v.momentumSettled(0, WIDTH);
  check(v.activeContentId === 'not-3', 'a tapped Written survives an initial offset that reads as page 0');
}

// ---------------------------------------------------------------------------
// 3. MISSING requested item: NEVER index 0 (A3)
// ---------------------------------------------------------------------------
{
  const v = new ViewerSimulation(library, 'not-in-this-dataset');
  check(v.opening.requestedIndex === -1, 'an absent requested id resolves to -1');
  check(!v.opening.locked, 'an absent requested id is never locked over nothing');
  check(v.isMissing, 'an absent requested id yields the honest Missing surface');
  v.render();
  v.momentumSettled(WIDTH, WIDTH);
  check(v.writes.length === 0 && v.activeContentId === 'not-in-this-dataset', 'Missing NEVER silently falls back to index 0');
  check(v.render().kind === 'hold', 'a missing requested item issues no alignment command');
}
{
  const empty = new ViewerSimulation([], 'img-0');
  check(empty.isMissing, 'a source dataset that empties is Missing, not another Memory');
  check(resolveMemoryViewerIndex([], 'img-0') === -1, 'the raw index resolver never coerces -1 into 0');
  check(resolveMemoryViewerIndex(library, 'img-0') === 0 && resolveMemoryViewerIndex(library, 'vid-5') === 5, 'the raw index resolver returns the exact position');
}

// ---------------------------------------------------------------------------
// 4. USER NAVIGATION after the lock is released
// ---------------------------------------------------------------------------
{
  const v = new ViewerSimulation(library, 'img-0');
  v.render();
  v.momentumSettled(0, WIDTH);
  check(!v.opening.locked, 'the lock is released before genuine navigation');
  v.fingerDown();
  v.momentumSettled(WIDTH * 2, WIDTH);
  check(v.activeContentId === 'aud-2' && v.writes.includes('aud-2'), 'a user swipe after alignment DOES change the active content');
  v.momentumSettled(WIDTH * 3, WIDTH);
  check(v.activeContentId === 'not-3', 'a second swipe keeps navigating freely');
}

// ---------------------------------------------------------------------------
// 5. R1 — THE LOCK CANNOT DEADLOCK
// ---------------------------------------------------------------------------
{
  // (a) no settle event at all: the lock is held, but the pager was aligned by
  // the command, so the user is on the right page and nothing is broken.
  const quiet = new ViewerSimulation(library, 'vid-5');
  quiet.render();
  check(quiet.opening.locked && quiet.activeContentId === 'vid-5', 'a Viewer that reports nothing still shows the tapped Memory');
  // (b) a real finger releases it unconditionally.
  quiet.fingerDown();
  check(!quiet.opening.locked, 'a real drag releases the lock even with no settle ever reported');
  quiet.momentumSettled(WIDTH, WIDTH);
  check(quiet.activeContentId === 'vid-1', 'navigation works immediately after a drag released the lock');
}
{
  // (c) the drag-released-without-momentum path.
  const noMomentum = new ViewerSimulation(library, 'not-3');
  noMomentum.render();
  check(noMomentum.opening.locked, 'the lock starts held');
  noMomentum.dragEnded(WIDTH * 3, WIDTH);
  check(!noMomentum.opening.locked, 'onScrollEndDrag is the second lock-release path');
  check(noMomentum.writes.length === 0, 'a drag end never writes a settled page as active content');
}
{
  // (d) onScrollEndDrag with a WRONG offset does NOT release the lock: only a
  // matching index or a real finger does.
  const wrong = new ViewerSimulation(library, 'vid-1');
  wrong.render();
  wrong.dragEnded(WIDTH * 4, WIDTH);
  check(wrong.opening.locked, 'a drag end reporting a non-requested index keeps the lock held');
  wrong.dragEnded(WIDTH * 1, WIDTH);
  check(!wrong.opening.locked, 'the drag end that finally matches the requested index releases it');
}

// ---------------------------------------------------------------------------
// 6. DATASET UPDATES preserve the active content
// ---------------------------------------------------------------------------
{
  // Re-render with an EQUAL but newly allocated collection.
  const v = new ViewerSimulation(library, 'aud-2');
  v.render();
  v.momentumSettled(WIDTH * 2, WIDTH);
  const before = v.alignCommands;
  v.dataset = [image0, video1, audio2, note3, image4, video5].map((m) => ({ ...m }));
  v.render();
  check(v.alignCommands === before, 'reconstructing an equal dataset issues NO alignment command');
  check(v.activeContentId === 'aud-2', 'reconstructing an equal dataset preserves the active Memory');
}
{
  // Append a page after the active item.
  const v = new ViewerSimulation(library, 'not-3');
  v.render();
  v.momentumSettled(WIDTH * 3, WIDTH);
  const before = v.alignCommands;
  v.dataset = [...library, memory('img-6', 'image'), memory('vid-7', 'video')];
  v.render();
  check(v.alignCommands === before, 'appending a page issues NO alignment command');
  check(v.activeContentId === 'not-3', 'appending a page never displaces the active Memory');
}
{
  const v = new ViewerSimulation(library, 'vid-5');
  v.render();
  v.momentumSettled(WIDTH * 5, WIDTH);
  check(v.activeContentId === 'vid-5', 'the active Memory is the last one before the refresh');
  v.dataset = [image0, note3];
  check(v.isMissing, 'an active item that genuinely disappears yields Missing');
  check(v.render().kind === 'hold', 'a missing active item issues no scroll command');
  v.momentumSettled(0, WIDTH);
  check(v.activeContentId === 'vid-5' && v.writes.length === 0, 'Missing does not silently switch to the first Memory');
  check(v.isMissing, 'the Viewer stays Missing rather than adopting a substitute');
}
{
  // Programmatic active-content change (an alignment target) aligns correctly.
  const v = new ViewerSimulation(library, 'img-0');
  v.render();
  v.momentumSettled(0, WIDTH);
  const before = v.alignCommands;
  v.activeContentId = 'not-3';
  const command = v.render();
  check(command.kind === 'align' && (command as { index: number }).index === 3, 'a programmatic active-content change aligns to the new index');
  check(v.alignCommands === before + 1, 'exactly ONE alignment command for that change');
  v.render();
  check(v.alignCommands === before + 1, 're-rendering the same target issues nothing: no feedback loop');
}

// ---------------------------------------------------------------------------
// 7. NO feedback loop: momentum -> write -> effect -> scroll -> momentum
// ---------------------------------------------------------------------------
{
  const v = new ViewerSimulation(library, 'img-0');
  v.render();
  v.momentumSettled(0, WIDTH);
  // The OLD closed loop: every accepted settle re-ran the scroll, and that
  // scroll produced another settle, forever. Here the same settle is reported
  // many times; convergence means ONE write and ONE scroll.
  for (let repeat = 0; repeat < 10; repeat += 1) v.momentumSettled(0, WIDTH);
  check(v.alignCommands === 1, 'repeated identical settle events never re-issue a scroll to the index they reported');
  check(v.writes.length === 0 && v.activeContentId === 'img-0', 'repeated identical settle events never announce a new authority');
}
{
  // And a genuine second navigation still works after all that noise.
  const v = new ViewerSimulation(library, 'img-0');
  v.render();
  for (let repeat = 0; repeat < 5; repeat += 1) v.momentumSettled(0, WIDTH);
  v.fingerDown();
  v.momentumSettled(WIDTH * 4, WIDTH);
  check(v.activeContentId === 'img-4' && v.writes.join() === 'img-4', 'genuine navigation after settled noise is unaffected');
}

// ---------------------------------------------------------------------------
// 8. SOURCE ISOLATION (C4, §14) — the pager never changes source
// ---------------------------------------------------------------------------
{
  const all = [image0, video1, audio2, note3];
  const sources: MemoryViewerSession[] = [
    libraryViewerSession('vid-1'),
    albumViewerSession('album-7', 'Viaje', 'not-3'),
    collectionViewerSession({ kind: 'type', memoryKind: 'audio' }, 'type:audio', 'Audios', 'aud-2'),
    collectionViewerSession({ kind: 'type', memoryKind: 'written' }, 'type:written', 'Notas', 'not-3'),
  ];
  const labels: string[] = [];
  for (const session of sources) {
    const dataset = memoryViewerDataset(session.source, {
      library: all,
      album: { sourceId: 'album-7', memories: [image0, note3] },
      collection: { sourceId: session.source.kind === 'collection' ? session.source.sourceId : 'type:audio', memories: all },
    });
    labels.push(`${session.source.kind}:${session.activeContentId}:${dataset.length}`);
    const index = resolveMemoryViewerIndex(dataset, session.activeContentId);
    check(index >= 0, `the ${session.source.kind} source keeps its own dataset and finds its own item`);
  }
  check(
    labels.join('|') === 'library:vid-1:4|album:not-3:2|collection:aud-2:1|collection:not-3:1',
    'each source pages ONLY its own dataset: Library 4, Album 2, Audios 1, Notas 1',
  );
  // A type collection must never fall back to the library.
  const notas = memoryViewerDataset({ kind: 'collection', sourceId: 'type:written', collection: { kind: 'type', memoryKind: 'written' }, label: 'Notas' }, {
    library: all, album: { sourceId: null, memories: [] }, collection: { sourceId: 'type:audio', memories: all },
  });
  check(notas.length === 0, 'a source whose collectionId no longer matches returns empty, NOT the library');
  // An Album source whose Album detail closed empties instead of switching.
  const closedAlbum = memoryViewerDataset({ kind: 'album', sourceId: 'album-7', label: 'Viaje' }, {
    library: all, album: { sourceId: null, memories: [] }, collection: { sourceId: null, memories: [] },
  });
  check(closedAlbum.length === 0, 'a closed Album source empties instead of falling back to the library');
}

// ---------------------------------------------------------------------------
// 9. A4 — dataset identity is stable while the content is unchanged
// ---------------------------------------------------------------------------
{
  const idOf = (m: HomeCloudMemoryListItem) => m.id;
  const original = library;
  const rebuilt = library.map((m) => ({ ...m }));
  check(reuseMemoryViewerDataset(original, rebuilt, idOf) === original, 'an equal-content rebuild returns the PREVIOUS array identity');
  const appended = [...library, memory('img-6', 'image')];
  check(reuseMemoryViewerDataset(original, appended, idOf) === appended, 'a real append returns the new array');
  const reordered = [...library].reverse();
  check(reuseMemoryViewerDataset(original, reordered, idOf) === reordered, 'a different order is a different dataset');
  check(reuseMemoryViewerDataset(original, original, idOf) === original, 'the identical reference is returned untouched');
}

// ---------------------------------------------------------------------------
// 10. Supplementary STRUCTURAL assertions (style-declaration truths)
// ---------------------------------------------------------------------------
{
  const root = process.cwd();
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
  const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
  const video = read('front/mi-front-limpio/components/homecloud/MemoryVideoPage.tsx');
  const audio = read('front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx');
  const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');

  // A page's PHYSICAL width is a style declaration, so this is legitimately a
  // source assertion: every branch of both media pages must carry the pager's
  // own `width`, exactly like Image / Written / MediaPlaceholder already do.
  check(
    /MemoryVideoPage[\s\S]*?width: number;[\s\S]*?styles\.placeholder, \{ width \}[\s\S]*?styles\.wrap, \{ width \}[\s\S]*?styles\.failure, \{ width \}/.test(video),
    'MemoryVideoPage declares the pager width on EVERY branch (placeholder, player, loading, failure)',
  );
  check(
    /MemoryAudioPage[\s\S]*?width: number;[\s\S]*?styles\.placeholder, \{ width \}[\s\S]*?styles\.page, \{ width \}[\s\S]*?styles\.failure, \{ width \}/.test(audio),
    'MemoryAudioPage declares the pager width on EVERY branch (placeholder, player, loading, failure)',
  );
  check(
    /MemoryVideoPage memory=\{memory\} accessToken=\{accessToken\} active=\{active\} authorized=\{authorized\} width=\{width\}/.test(viewer)
    && /MemoryAudioPage memory=\{memory\} accessToken=\{accessToken\} active=\{active\} authorized=\{authorized\} width=\{width\}/.test(viewer),
    'the Viewer hands its own width to both media pages',
  );
  check(
    /styles\.imagePage,\{width\}/.test(viewer) && /style=\{\{ width \}\}/.test(viewer),
    'Image and Written pages keep declaring the same width',
  );
  // A3 must not be reintroduced anywhere.
  check(
    !/Math\.max\(0,\s*memories\.findIndex/.test(viewer) && !/Math\.max\(0,\s*memories\.findIndex/.test(screen),
    'the index-0 fallback is gone from the Viewer and from the screen',
  );
  check(
    viewer.includes('getMemoryOriginalUrl')
    && /title="Reintentar"/.test(viewer)
    && /setAttempt/.test(viewer)
    && viewer.includes('Reintentar cargar este recuerdo'),
    'the image original error offers an EXPLICIT Retry that re-runs the existing seam',
  );
  // HC2-B media ownership must be untouched by the opening lock.
  check(
    viewer.includes('AppState.addEventListener') && viewer.includes('mediaPlaybackAuthorized')
    && /momentumRef\.current = false;\s*setDragging\(false\);/.test(viewer),
    'HC2-B lifecycle: one AppState listener, one authorization intent, drag restore preserved',
  );
  check(
    /solveMemoryViewerAlignment/.test(viewer) && /alignedContentIdRef/.test(viewer),
    'the Viewer aligns from ONE authority keyed by content id',
  );
  // A4.
  check(
    /viewerMemories = useMemo/.test(screen) && screen.includes('reuseMemoryViewerDataset'),
    'viewerMemories is memoized with explicit dependencies and stable identity',
  );
  check(
    !/memories: readonly HomeCloudMemoryListItem\[\];\n  readonly activeContentId/.test(
      read('front/mi-front-limpio/services/homecloud/homecloudMemoryViewerSource.ts'),
    ),
    'the dead MemoryViewerSession.memories snapshot is gone',
  );
}

console.log(failed === 0 ? '\nHC2C_VIEWER_OPENING_TESTS=PASS' : `\nHC2C_VIEWER_OPENING_TESTS=FAIL pass=? fail=${failed}`);
if (failed) process.exitCode = 1;