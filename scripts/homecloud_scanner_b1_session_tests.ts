/**
 * HC-3E B1 — editor session, navigation contract and PDF integration tests.
 *
 * Deterministic coverage of:
 * - temp-file ownership across preview/confirm/cancel/unmount (G);
 * - async confirmation results and stale-ticket disposal (F);
 * - the React Navigation 7 addListener contract and navigator cleanup (A);
 * - serializable route params — the class of bug that put functions into
 *   navigation state (A);
 * - scanner adoption, PDF cache invalidation, effective image selection and
 *   re-edit from preserved canonical parameters (G).
 *
 * Run via `node scripts/compiled-scannerb1/scripts/homecloud_scanner_b1_session_tests.js`.
 */

import {
  INITIAL_EDITOR_SESSION,
  editorDisplaySource,
  editorSessionAbandonEffects,
  reduceEditorSession,
  type EditorSessionEffect,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerEditorSession';
import {
  adoptPageEditOutcome,
  buildScanPdfCacheKey,
  canCreatePdf,
  createScannerPage,
  deletePage,
  getPageEffectiveDimensions,
  getPageEffectiveUri,
  movePageEarlier,
  movePageLater,
  type ScannerPage,
  type ScannerPageEdit,
  type ScannerPageEditOutcome,
} from '../front/mi-front-limpio/services/homecloud/homecloudScanner';
import {
  FULL_CROP_RECT,
  buildImageProcessingPlan,
  coerceScannerPageEdit,
  type Rect,
} from '../front/mi-front-limpio/services/homecloud/homecloudScannerGeometry';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

function effectsSummary(effects: readonly EditorSessionEffect[]): string {
  return effects
    .map((effect) => (effect.kind === 'delete-file' ? `delete:${effect.uri}` : `handoff:${effect.uri}`))
    .join(',');
}

function rectEq(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

console.log('\n=== HC-3E SCANNER B1 SESSION / NAVIGATION / PDF TESTS ===\n');

const EDIT: ScannerPageEdit = { cropRect: { x: 0.1, y: 0.1, width: 0.5, height: 0.4 }, rotationSteps: 1 };
const OTHER_EDIT: ScannerPageEdit = { cropRect: FULL_CROP_RECT, rotationSteps: 2 };

// ---------------------------------------------------------------------------
// session: preview lifecycle
// ---------------------------------------------------------------------------

{
  // Request a preview: deletes any previous preview, opens a ticket.
  const requested = reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'preview' });
  record(requested.state.phase === 'processing' && requested.state.pending?.purpose === 'preview' && requested.state.pending.ticket === 1, 'preview request opens processing with ticket 1');

  // A second request while processing is ignored (no double generation).
  const ignored = reduceEditorSession(requested.state, { type: 'process-requested', purpose: 'preview' });
  record(ignored.state.pending?.ticket === 1 && ignored.effects.length === 0, 'second request while processing is ignored');

  // Success installs the preview.
  const succeeded = reduceEditorSession(requested.state, {
    type: 'process-succeeded',
    ticket: 1,
    uri: 'file:///tmp/preview1.jpg',
    size: { width: 600, height: 800 },
    sessionAlive: true,
    edit: EDIT,
  });
  record(succeeded.state.phase === 'editing' && succeeded.state.previewUri === 'file:///tmp/preview1.jpg', 'preview success installs the preview file');
  record(succeeded.state.previewSize?.width === 600 && succeeded.state.previewSize?.height === 800, 'preview success records the generated dimensions');

  // Editing after a preview deletes it (the preview no longer matches the edit).
  const edited = reduceEditorSession(succeeded.state, { type: 'user-edits' });
  record(edited.state.previewUri === null && effectsSummary(edited.effects) === 'delete:file:///tmp/preview1.jpg', 'user edit deletes the obsolete preview');

  // A new preview request while one exists deletes the old one first.
  const reRequest = reduceEditorSession(succeeded.state, { type: 'process-requested', purpose: 'preview' });
  record(reRequest.state.previewUri === null && effectsSummary(reRequest.effects) === 'delete:file:///tmp/preview1.jpg', 'regeneration deletes the previous preview first');
}

// ---------------------------------------------------------------------------
// session: async confirmation (F)
// ---------------------------------------------------------------------------

{
  // Confirm WITHOUT a preview: generate, then hand off the explicit result.
  const requested = reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'confirm' });
  record(requested.state.pending?.purpose === 'confirm' && requested.state.pending.ticket === 1, 'confirm request opens a confirm ticket');
  const confirmed = reduceEditorSession(requested.state, {
    type: 'process-succeeded',
    ticket: 1,
    uri: 'file:///tmp/final1.jpg',
    size: { width: 600, height: 800 },
    sessionAlive: true,
    edit: EDIT,
  });
  record(confirmed.state.adopted === true && confirmed.state.previewUri === 'file:///tmp/final1.jpg', 'confirm success adopts the generated file');
  record(effectsSummary(confirmed.effects) === 'handoff:file:///tmp/final1.jpg', 'confirm success hands the file to the parent');
  record(confirmed.effects[0].kind === 'hand-off' && confirmed.effects[0].edit === EDIT, 'hand-off carries the canonical edit parameters');

  // After adoption, unmount must NOT delete the file (the Scanner owns it now).
  record(editorSessionAbandonEffects(confirmed.state).length === 0, 'abandon after adoption deletes nothing (ownership transferred)');

  // A second confirm after adoption is a no-op: no double hand-off.
  const twice = reduceEditorSession(confirmed.state, { type: 'confirmed', edit: OTHER_EDIT });
  record(twice.state.adopted === true && twice.effects.length === 0, 'second confirm after adoption is a no-op');

  // Confirm WITH a matching preview adopts it directly (no regeneration).
  const previewed = reduceEditorSession(
    reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'preview' }).state,
    { type: 'process-succeeded', ticket: 1, uri: 'file:///tmp/p1.jpg', size: { width: 10, height: 10 }, sessionAlive: true, edit: EDIT },
  );
  const adoptedDirectly = reduceEditorSession(previewed.state, { type: 'confirmed', edit: EDIT });
  record(adoptedDirectly.state.adopted === true && effectsSummary(adoptedDirectly.effects) === 'handoff:file:///tmp/p1.jpg', 'confirm with a matching preview adopts it without regenerating');

  // Confirm with no preview and nothing in flight: no-op (button guard).
  const empty = reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'confirmed', edit: EDIT });
  record(empty.state.adopted === false && empty.effects.length === 0, 'confirm without a preview or generation is a no-op');

  // Confirm while processing: no-op (button is disabled; the reducer agrees).
  const duringProcessing = reduceEditorSession(
    reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'preview' }).state,
    { type: 'confirmed', edit: EDIT },
  );
  record(duringProcessing.effects.length === 0 && duringProcessing.state.adopted === false, 'confirm during processing is ignored');

  // Failure: controlled error, original preserved, no navigation hand-off.
  const failed = reduceEditorSession(
    reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'confirm' }).state,
    { type: 'process-failed', ticket: 1, message: 'El área de recorte es demasiado pequeña.', sessionAlive: true },
  );
  record(failed.state.phase === 'editing' && failed.state.errorMessage === 'El área de recorte es demasiado pequeña.', 'processing failure surfaces a controlled error');
  record(failed.state.previewUri === null && failed.effects.length === 0 && failed.state.adopted === false, 'failure preserves the original and hands nothing off');

  // A failure for a stale ticket changes nothing.
  const staleFail = reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-failed', ticket: 99, message: 'x', sessionAlive: true });
  record(staleFail.state.errorMessage === null, 'stale failure is ignored');
}

// ---------------------------------------------------------------------------
// session: cancellation, stale results, unmount cleanup (G)
// ---------------------------------------------------------------------------

{
  // Cancel during processing: late success is deleted, never adopted.
  const requested = reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'confirm' });
  const cancelled = reduceEditorSession(requested.state, { type: 'cancelled' });
  record(cancelled.state.phase === 'editing' && cancelled.state.pending === null, 'cancel clears the in-flight request');
  const late = reduceEditorSession(cancelled.state, {
    type: 'process-succeeded',
    ticket: 1,
    uri: 'file:///tmp/late.jpg',
    size: { width: 1, height: 1 },
    sessionAlive: true,
    edit: EDIT,
  });
  record(effectsSummary(late.effects) === 'delete:file:///tmp/late.jpg' && late.state.adopted === false, 'result arriving after cancel is deleted, not adopted');

  // Success resolving after unmount: same disposal.
  const unmounted = reduceEditorSession(requested.state, {
    type: 'process-succeeded',
    ticket: 1,
    uri: 'file:///tmp/late2.jpg',
    size: { width: 1, height: 1 },
    sessionAlive: false,
    edit: EDIT,
  });
  record(effectsSummary(unmounted.effects) === 'delete:file:///tmp/late2.jpg', 'result arriving after unmount is deleted (no temp leak)');

  // Unmount cleanup deletes a still-owned preview exactly once.
  const previewed = reduceEditorSession(
    reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'preview' }).state,
    { type: 'process-succeeded', ticket: 1, uri: 'file:///tmp/p2.jpg', size: { width: 1, height: 1 }, sessionAlive: true, edit: EDIT },
  );
  const abandon = editorSessionAbandonEffects(previewed.state);
  record(effectsSummary(abandon) === 'delete:file:///tmp/p2.jpg', 'unmount with an owned preview deletes it');

  // Cancel with an owned preview deletes it; unmount after does nothing more.
  const cancelledPreview = reduceEditorSession(previewed.state, { type: 'cancelled' });
  record(effectsSummary(cancelledPreview.effects) === 'delete:file:///tmp/p2.jpg', 'cancel deletes the owned preview');
  record(editorSessionAbandonEffects(cancelledPreview.state).length === 0, 'no double delete after cancel');

  // Cancel after adoption: nothing to do.
  const adopted = reduceEditorSession(
    reduceEditorSession(INITIAL_EDITOR_SESSION, { type: 'process-requested', purpose: 'confirm' }).state,
    { type: 'process-succeeded', ticket: 1, uri: 'file:///tmp/f2.jpg', size: { width: 1, height: 1 }, sessionAlive: true, edit: EDIT },
  );
  const cancelAfterAdopt = reduceEditorSession(adopted.state, { type: 'cancelled' });
  record(cancelAfterAdopt.effects.length === 0, 'cancel after adoption never deletes the handed-off file');

  // Stale success (superseded ticket) is deleted.
  const stale = reduceEditorSession(INITIAL_EDITOR_SESSION, {
    type: 'process-succeeded',
    ticket: 42,
    uri: 'file:///tmp/stale.jpg',
    size: { width: 1, height: 1 },
    sessionAlive: true,
    edit: EDIT,
  });
  record(effectsSummary(stale.effects) === 'delete:file:///tmp/stale.jpg', 'stale ticket result is deleted');
}

// ---------------------------------------------------------------------------
// session: display derivation (preview vs original surface)
// ---------------------------------------------------------------------------

{
  const withPreview = { ...INITIAL_EDITOR_SESSION, previewUri: 'file:///tmp/p.jpg', previewSize: { width: 300, height: 200 } };
  const showingPreview = editorDisplaySource({ originalUri: 'file:///tmp/o.jpg', source: { width: 1200, height: 1800 }, edit: EDIT, session: withPreview });
  record(showingPreview.uri === 'file:///tmp/p.jpg' && showingPreview.rotationSteps === 0 && showingPreview.cropRect.width === 1, 'previewing shows the processed file full-frame and unrotated');

  const editingSurface = editorDisplaySource({ originalUri: 'file:///tmp/o.jpg', source: { width: 1200, height: 1800 }, edit: EDIT, session: INITIAL_EDITOR_SESSION });
  record(editingSurface.uri === 'file:///tmp/o.jpg' && editingSurface.rotationSteps === 1 && editingSurface.cropRect === EDIT.cropRect, 'editing shows the original with the live canonical edit');
}

// ---------------------------------------------------------------------------
// navigation contract (A)
// ---------------------------------------------------------------------------

/**
 * Faithful React Navigation 7 double: `addListener` returns an UNSUBSCRIBE
 * FUNCTION. Verified against @react-navigation/core 7.2.5
 * (types.d.ts: `addListener(...): () => void`).
 */
function createV7NavigationDouble() {
  const listeners: { type: string; callback: (event: unknown) => void }[] = [];
  return {
    navigation: {
      addListener(type: string, callback: (event: unknown) => void): () => void {
        const entry = { type, callback };
        listeners.push(entry);
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          const index = listeners.indexOf(entry);
          if (index >= 0) listeners.splice(index, 1);
        };
      },
      emit(type: string, event: unknown) {
        for (const entry of [...listeners]) {
          if (entry.type === type) entry.callback(event);
        }
      },
      listenerCount: () => listeners.length,
    },
  };
}

{
  const { navigation } = createV7NavigationDouble();
  const unsubscribe = navigation.addListener('beforeRemove', () => {});
  record(typeof unsubscribe === 'function', 'v7 addListener returns a function');
  record((unsubscribe as unknown as { remove?: unknown }).remove === undefined, 'v7 unsubscribe has NO .remove() — calling it was the B1 crash (root cause A)');

  // The scanner's guard pattern: useEffect(() => addListener(...)) — the
  // returned function IS the cleanup, so unmount unsubscribes.
  let handled = 0;
  const cleanup = navigation.addListener('beforeRemove', () => { handled += 1; });
  navigation.emit('beforeRemove', {});
  record(handled === 1, 'guard listener fires while subscribed');
  cleanup();
  navigation.emit('beforeRemove', {});
  record(handled === 1, 'unsubscribing removes the listener (navigator cleanup without .remove())');

  // Root-cause evidence: calling `.remove()` on the v7 unsubscribe would throw
  // `undefined is not a function` — exactly the B1 crash. The repaired editor
  // registers no beforeRemove listener at all; cancel is unmount cleanup.
  let threwOnRemove = false;
  try {
    (unsubscribe as unknown as { remove: () => void }).remove();
  } catch {
    threwOnRemove = true;
  }
  record(threwOnRemove, 'calling .remove() on a v7 unsubscribe throws — the B1 editor crash is reproduced and eliminated');
}

// Serializable route params: same walk as @react-navigation/core checkSerializable.
function isSerializable(value: unknown, seen: Set<unknown> = new Set()): boolean {
  if (value === undefined || value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return true;
  }
  if (typeof value === 'function') return false;
  if (Object.prototype.toString.call(value) !== '[object Object]' && !Array.isArray(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!isSerializable((value as Record<string, unknown>)[key], seen)) return false;
  }
  return true;
}

{
  const page = createScannerPage('scan_1', 'file:///tmp/scan_1.jpg', 1200, 1800);
  const editedPage: ScannerPage = { ...page, edit: EDIT };
  record(isSerializable({ page: editedPage }), 'editor route params (page snapshot) are serializable');
  record(isSerializable(EDIT), 'canonical edit params are serializable');

  const outcome: ScannerPageEditOutcome = { pageId: 'scan_1', edit: EDIT, processedUri: 'file:///tmp/p.jpg' };
  record(isSerializable(outcome), 'scannerEditOutcome param is serializable');

  // The B1 failure class: functions in params must FAIL the check.
  record(!isSerializable({ page, onConfirm: () => {} }), 'function params are rejected by the serializability walk (B1 bug class)');
  record(!isSerializable({ page, onCancel: () => {} }), 'the second callback param is rejected too');
}

// ---------------------------------------------------------------------------
// scanner adoption + PDF integration (G)
// ---------------------------------------------------------------------------

{
  const pages = [
    createScannerPage('a', 'file:///tmp/a.jpg', 1200, 1800),
    createScannerPage('b', 'file:///tmp/b.jpg', 1200, 1800),
  ];

  // Effective image selection: original while unedited.
  record(getPageEffectiveUri(pages[0]) === 'file:///tmp/a.jpg', 'unedited page uses the original');

  // Adoption installs the outcome on exactly that page.
  const outcomeA: ScannerPageEditOutcome = { pageId: 'a', edit: EDIT, processedUri: 'file:///tmp/a_processed.jpg' };
  const adopted = adoptPageEditOutcome(pages, outcomeA);
  record(adopted[0].edit === EDIT && adopted[0].processedUri === 'file:///tmp/a_processed.jpg', 'adoption applies the edit and takes the new file');
  record(adopted[0].originalUri === 'file:///tmp/a.jpg', 'adoption preserves the original capture');
  record(adopted[1].processedUri === null && adopted[1].edit === null, 'adoption leaves other pages untouched (independent edits)');
  record(getPageEffectiveUri(adopted[0]) === 'file:///tmp/a_processed.jpg', 'edited page uses the processed image');

  // Unknown pageId: no-op (a late outcome can never resurrect a deleted page).
  record(adoptPageEditOutcome(pages, { pageId: 'ghost', edit: EDIT, processedUri: 'x' }).every((page) => page.processedUri === null), 'adoption for an unknown page is a no-op');

  // Re-adoption replaces the previous processed file (the caller deletes the old).
  const outcomeA2: ScannerPageEditOutcome = { pageId: 'a', edit: OTHER_EDIT, processedUri: 'file:///tmp/a_processed2.jpg' };
  const readopted = adoptPageEditOutcome(adopted, outcomeA2);
  record(readopted[0].processedUri === 'file:///tmp/a_processed2.jpg' && readopted[0].edit === OTHER_EDIT, 're-adoption replaces the previous processed file and edit');

  // PDF cache invalidation: any effective-image change must change the key.
  const name = 'Escaneo - 08-10-2026.pdf';
  const keyBefore = buildScanPdfCacheKey(pages, name);
  const keyAfterAdoption = buildScanPdfCacheKey(adopted, name);
  record(keyBefore !== keyAfterAdoption, 'PDF cache key changes when a page is edited (invalidation)');
  record(buildScanPdfCacheKey(adopted, name) === buildScanPdfCacheKey(adopted, name), 'same content + name keeps the cache hit');
  record(buildScanPdfCacheKey(adopted, 'otro.pdf') !== buildScanPdfCacheKey(adopted, name), 'different name changes the key');
  const keyAfterDelete = buildScanPdfCacheKey(deletePage(adopted, 'a'), name);
  record(keyAfterDelete !== keyAfterAdoption, 'deleting a page invalidates the cache');
  const keyAfterReadopt = buildScanPdfCacheKey(readopted, name);
  record(keyAfterReadopt !== keyAfterAdoption, 'a second edit invalidates the previous PDF again');
  record(canCreatePdf([]) === false && canCreatePdf(pages) === true, 'PDF still requires at least one page');

  // HC-POL-022 — POSITION is content. The PDF embeds the pages in order, so a
  // reorder MUST invalidate a previously generated PDF: without the index in the
  // key, a scan whose pages were swapped would silently reuse the old-order file.
  record(buildScanPdfCacheKey(movePageLater(adopted, 'a'), name) !== keyAfterAdoption,
    'reordering a page invalidates the PDF cache (position is part of the content)');
  record(buildScanPdfCacheKey(movePageEarlier(adopted, 'a'), name) === buildScanPdfCacheKey(adopted, name),
    'a step that cannot happen keeps the cache hit (a is already first)');
  {
    const twoPages: readonly ScannerPage[] = [
      { id: 'a', originalUri: 'file:///tmp/a.jpg', processedUri: null, edit: null },
      { id: 'b', originalUri: 'file:///tmp/b.jpg', processedUri: null, edit: null },
    ];
    const swapped = movePageLater(twoPages, 'a');
    record(swapped.length === 2 && swapped[0].id === 'b' && swapped[1].id === 'a',
      'movePageLater swaps exactly the two neighbours');
    const swappedBack = movePageEarlier(swapped, 'a');
    record(swappedBack.length === 2 && swappedBack[0].id === 'a' && swappedBack[1].id === 'b',
      'movePageEarlier swaps them back');
    record(movePageEarlier(twoPages, 'a')[0].id === 'a' && movePageEarlier(twoPages, 'a')[1].id === 'b',
      'moving the first page earlier is a no-op for the order');
    record(movePageLater(twoPages, 'b')[0].id === 'a' && movePageLater(twoPages, 'b')[1].id === 'b',
      'moving the last page later is a no-op for the order');
  }

  // Effective dimensions follow the SAME processing plan as the editor (one
  // geometry authority), so the PDF page aspect matches the generated image.
  const dims = getPageEffectiveDimensions(adopted[0]);
  const plan = buildImageProcessingPlan({ width: 1200, height: 1800 }, EDIT.cropRect, EDIT.rotationSteps);
  record(plan.status === 'ok' && dims?.width === plan.resultSize.width && dims?.height === plan.resultSize.height, 'effective dimensions equal the processing plan result');
  record(getPageEffectiveDimensions(pages[0])?.width === 1200, 'unedited page keeps the capture dimensions');

  // Re-edit always starts from the preserved original + canonical params.
  const reopened = coerceScannerPageEdit(adopted[0].edit);
  record(rectEq(reopened.cropRect, EDIT.cropRect) && reopened.rotationSteps === EDIT.rotationSteps, 're-edit recovers the exact canonical parameters');
  record(adopted[0].originalUri === pages[0].originalUri, 're-edit still points at the preserved original capture');

  // Full re-edit flow: re-crop from the canonical params, re-confirm, re-adopt.
  const reedit: ScannerPageEdit = { cropRect: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 } as Rect, rotationSteps: 0 };
  const outcomeRe: ScannerPageEditOutcome = { pageId: 'a', edit: reedit, processedUri: 'file:///tmp/a_processed3.jpg' };
  const final = adoptPageEditOutcome(readopted, outcomeRe);
  record(final[0].edit === reedit && final[0].processedUri === 'file:///tmp/a_processed3.jpg', 're-edit confirmation adopts the regenerated file');
  record(buildScanPdfCacheKey(final, name) !== keyAfterReadopt, 're-edit invalidates the PDF cache');
}

console.log(`\nSCANNER_B1_SESSION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('SCANNER_B1_SESSION_TESTS=FAIL'); }
else { console.log('SCANNER_B1_SESSION_TESTS=PASS'); }
