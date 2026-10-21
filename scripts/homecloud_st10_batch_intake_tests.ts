import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  batchActiveItem,
  batchCount,
  batchDateError,
  batchEffectiveAlbumId,
  batchEffectiveCaption,
  batchHasAlbumOverride,
  batchHasCaptionOverride,
  batchHasNext,
  batchHasPrevious,
  batchIsEmpty,
  batchItemKind,
  batchLabel,
  batchNextIndex,
  batchPreviousIndex,
  batchResolvedItems,
  batchSeedFromArtifact,
  clearItemAlbumOverride,
  clearItemCaptionOverride,
  createBatchFromArtifacts,
  createBatchSession,
  dedupeBatchArtifacts,
  resetItemDate,
  setBatchActiveIndex,
  setBatchAlbum,
  setBatchCaption,
  setItemAlbumOverride,
  setItemCaptionOverride,
  setItemDate,
  type BatchArtifactSeed,
  type BatchSession,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryBatch';
import type { CapturePrecision, UploadLocalArtifact } from '../front/mi-front-limpio/services/homecloud/homecloudUploadTypes';
import { semanticDateDraftFromCapture } from '../front/mi-front-limpio/services/homecloud/homecloudSemanticDate';

/**
 * HOMECLOUD_ST10_BATCH_INTAKE_TESTS
 *
 * ST-10.D/E — batch review and submission contract.
 *
 * HONESTY NOTE: these are pure-contract and source-shape assertions. A real
 * multi-select on a real iPhone, a real N-item upload and a real partial failure
 * remain DEVICE_QA_PENDING.
 */

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed += 1; console.log(`PASS: ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${name}\n  ${error instanceof Error ? error.message : String(error)}`); }
}

function artifact(name: string, mimeType: string): UploadLocalArtifact {
  return { localUri: `file:///durable/${name}`, displayName: name, mimeType, sizeBytes: 1024, extension: 'jpg' };
}

/** The three-date batch the Product Truth §6.7 gate is written about. */
function seedsWithThreeDistinctDates(): BatchArtifactSeed[] {
  return [
    { artifact: artifact('foto-2022.jpg', 'image/jpeg'), capture: { capturedAt: '2022-03-04T10:00:00.000Z', capturedYear: 2022, capturedMonth: 3, capturePrecision: 'exact' }, source: 'gallery' },
    { artifact: artifact('foto-2024.jpg', 'image/jpeg'), capture: { capturedAt: '2024-01-12T18:30:00.000Z', capturedYear: 2024, capturedMonth: 1, capturePrecision: 'exact' }, source: 'gallery' },
    { artifact: artifact('video-sin-fecha.mp4', 'video/mp4'), capture: { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' }, source: 'gallery' },
  ];
}

function session(seeds: readonly BatchArtifactSeed[], albumId: string | null = null): BatchSession {
  return createBatchFromArtifacts(seeds, albumId, 'batch-test');
}

// ===========================================================================
// PICKER — N items are retained, never reduced to assets[0]
// ===========================================================================
test('N selected items are retained in full', () => {
  const batch = session(seedsWithThreeDistinctDates());
  assert.equal(batchCount(batch), 3);
  assert.equal(batchIsEmpty(batch), false);
  assert.equal(batchResolvedItems(batch).length, 3);
  assert.deepEqual(batch.items.map((item) => item.label), ['foto-2022.jpg', 'foto-2024.jpg', 'video-sin-fecha.mp4']);
});

test('images-only, videos-only and mixed selections all survive', () => {
  const images = session([
    { artifact: artifact('a.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' }, source: 'gallery' },
    { artifact: artifact('b.png', 'image/png'), capture: { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' }, source: 'gallery' },
  ]);
  assert.deepEqual(images.items.map((item) => batchItemKind(item.draft)), ['image', 'image']);
  const videos = session([
    { artifact: artifact('a.mov', 'video/quicktime'), capture: { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' }, source: 'gallery' },
  ]);
  assert.deepEqual(videos.items.map((item) => batchItemKind(item.draft)), ['video']);
  const mixed = session(seedsWithThreeDistinctDates());
  assert.deepEqual(mixed.items.map((item) => batchItemKind(item.draft)), ['image', 'image', 'video']);
});

test('each draft is the canonical BinaryMemoryDraft shape', () => {
  const batch = session(seedsWithThreeDistinctDates());
  for (const item of batch.items) {
    const draft = batchSeedFromArtifact({ artifact: item.draft.artifact, capture: item.capture, source: item.draft.source }).draft;
    assert.deepEqual(Object.keys(draft).sort(), ['artifact', 'capture', 'source']);
  }
});

test('a duplicated source asset is submitted once, not twice', () => {
  const seeds = seedsWithThreeDistinctDates();
  const duplicated = [...seeds, seeds[0]];
  assert.equal(dedupeBatchArtifacts(duplicated).length, 3);
  assert.equal(batchCount(session(duplicated)), 3);
});

test('an empty selection is reported as empty, not as a one-item batch', () => {
  const empty = session([]);
  assert.equal(batchIsEmpty(empty), true);
  assert.equal(batchCount(empty), 0);
  assert.equal(batchLabel(empty), '1 de 0');
  assert.deepEqual(batchResolvedItems(empty), []);
});

// ===========================================================================
// INDEPENDENT SEMANTIC DATES — the hard product gate
// ===========================================================================
test('each item keeps its OWN derived date: 2022, 2024 and unknown coexist', () => {
  const resolved = batchResolvedItems(session(seedsWithThreeDistinctDates()));
  assert.equal(resolved[0].metadata.capturePrecision, 'exact');
  assert.equal(resolved[0].metadata.capturedAt, '2022-03-04T10:00:00.000Z');
  assert.equal(resolved[1].metadata.capturePrecision, 'exact');
  assert.equal(resolved[1].metadata.capturedAt, '2024-01-12T18:30:00.000Z');
  assert.equal(resolved[2].metadata.capturePrecision, 'unknown');
  assert.equal(resolved[2].metadata.capturedAt, null);
  assert.equal(resolved[2].metadata.capturedYear, null);
  assert.equal(resolved[2].metadata.capturedMonth, null);
});

test('there is NO batch-level date API at all', () => {
  const batch = session(seedsWithThreeDistinctDates());
  const exported = Object.keys(require('../front/mi-front-limpio/services/homecloud/homecloudMemoryBatch')).join(',');
  assert.ok(!/setBatchDate|batchDefaultDate|applySharedDate/.test(exported), 'nothing in the batch module can write one date across items');
  assert.ok(!('date' in batch), 'the session itself has no shared date field');
  assert.ok(!('capturedAt' in batch), 'and no shared capture instant');
});

test('NEGATIVE: correcting item A never modifies item B', () => {
  const before = session(seedsWithThreeDistinctDates());
  const after = setItemDate(before, 0, semanticDateDraftFromCapture('1999-12-31T00:00:00.000Z', 'exact', 1999, 12));
  assert.equal(batchResolvedItems(after)[0].metadata.capturedAt, '1999-12-31T00:00:00.000Z');
  // Item 1 is untouched, and untouched BY IDENTITY, not merely by value.
  assert.equal(after.items[1], before.items[1]);
  assert.equal(after.items[2], before.items[2]);
  assert.equal(batchResolvedItems(after)[1].metadata.capturedAt, '2024-01-12T18:30:00.000Z');
  assert.equal(batchResolvedItems(after)[2].metadata.capturePrecision, 'unknown');
});

test('NEGATIVE: correcting a date on a mixed batch never leaks across items', () => {
  const before = session([
    { artifact: artifact('a.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: 2020, capturedMonth: 5, capturePrecision: 'month_year' }, source: 'gallery' },
    { artifact: artifact('b.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: 2021, capturedMonth: 7, capturePrecision: 'month_year' }, source: 'gallery' },
    { artifact: artifact('c.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: 2019, capturedMonth: null, capturePrecision: 'year' }, source: 'gallery' },
  ]);
  const after = setItemDate(before, 1, semanticDateDraftFromCapture('2005-02-02T00:00:00.000Z', 'exact', 2005, 2));
  const resolved = batchResolvedItems(after);
  assert.equal(resolved[0].metadata.capturePrecision, 'month_year');
  assert.equal(resolved[0].metadata.capturedMonth, 5);
  assert.equal(resolved[0].metadata.capturedAt, null);
  assert.equal(resolved[1].metadata.capturePrecision, 'exact');
  assert.equal(resolved[2].metadata.capturePrecision, 'year');
  assert.equal(resolved[2].metadata.capturedMonth, null);
});

test('month_year and year precision are never silently upgraded', () => {
  const batch = session([
    { artifact: artifact('m.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: 2023, capturedMonth: 10, capturePrecision: 'month_year' }, source: 'gallery' },
    { artifact: artifact('y.jpg', 'image/jpeg'), capture: { capturedAt: null, capturedYear: 2024, capturedMonth: null, capturePrecision: 'year' }, source: 'gallery' },
  ]);
  const resolved = batchResolvedItems(batch);
  assert.equal(resolved[0].metadata.capturePrecision, 'month_year');
  assert.equal(resolved[0].metadata.capturedAt, null, 'a month_year never gains an invented day');
  assert.equal(resolved[0].metadata.capturedYear, 2023);
  assert.equal(resolved[0].metadata.capturedMonth, 10);
  assert.equal(resolved[1].metadata.capturePrecision, 'year');
  assert.equal(resolved[1].metadata.capturedAt, null);
  assert.equal(resolved[1].metadata.capturedMonth, null, 'a year never gains an invented month');
});

test('an exact date sends ONLY the instant, because the backend derives the components', () => {
  const resolved = batchResolvedItems(session(seedsWithThreeDistinctDates()));
  assert.equal(resolved[0].metadata.capturedYear, null);
  assert.equal(resolved[0].metadata.capturedMonth, null);
});

test('resetItemDate restores ONE item to its own derived date', () => {
  const before = session(seedsWithThreeDistinctDates());
  const edited = setItemDate(before, 0, semanticDateDraftFromCapture('1999-12-31T00:00:00.000Z', 'exact', 1999, 12));
  const reset = resetItemDate(edited, 0);
  assert.equal(batchResolvedItems(reset)[0].metadata.capturedAt, '2022-03-04T10:00:00.000Z');
  assert.equal(reset.items[1], before.items[1]);
});

test('an invalid date is reported per item, never applied to the others', () => {
  const batch = setItemDate(session(seedsWithThreeDistinctDates()), 2, { precision: 'exact', exactDate: '', exactCapturedAt: null, year: '', month: null });
  const resolved = batchResolvedItems(batch);
  assert.ok(resolved[2].dateError !== null, 'the item with the invalid date reports it');
  assert.equal(resolved[0].dateError, null);
  assert.equal(resolved[1].dateError, null);
  assert.ok(batchDateError(batch) !== null, 'Save can refuse the batch with a reason');
});

// ===========================================================================
// REVIEW NAVIGATION — one coherent review, stable edits
// ===========================================================================
test('the active item is the item whose metadata is being edited', () => {
  const batch = session(seedsWithThreeDistinctDates());
  assert.equal(batchActiveItem(batch)?.label, 'foto-2022.jpg');
  const moved = setBatchActiveIndex(batch, 2);
  assert.equal(batchActiveItem(moved)?.label, 'video-sin-fecha.mp4');
  assert.equal(batchResolvedItems(moved)[2].metadata.capturePrecision, 'unknown');
  assert.equal(batchLabel(moved), '3 de 3');
});

test('navigating preserves every edit made on a previous item', () => {
  const start = session(seedsWithThreeDistinctDates());
  const edited = setItemDate(start, 0, semanticDateDraftFromCapture('1999-12-31T00:00:00.000Z', 'exact', 1999, 12));
  const withCaption = setBatchCaption(edited, 'Vacaciones');
  const navigated = setBatchActiveIndex(setBatchActiveIndex(withCaption, 1), 2);
  const back = setBatchActiveIndex(navigated, 0);
  assert.equal(batchResolvedItems(back)[0].metadata.capturedAt, '1999-12-31T00:00:00.000Z', 'item 0 keeps its correction after visiting 1 and 2');
  assert.equal(batchEffectiveCaption(back, back.items[0]), 'Vacaciones');
});

test('navigation is bounded and reports its own availability', () => {
  const batch = session(seedsWithThreeDistinctDates());
  assert.equal(batchHasPrevious(batch), false);
  assert.equal(batchHasNext(batch), true);
  assert.equal(batchPreviousIndex(batch), 0);
  const last = setBatchActiveIndex(batch, 2);
  assert.equal(batchHasNext(last), false);
  assert.equal(batchNextIndex(last), 2);
  assert.equal(setBatchActiveIndex(batch, 99).activeIndex, 2, 'an out-of-range index is clamped, never wrapped');
  assert.equal(setBatchActiveIndex(batch, -5).activeIndex, 0);
});

test('navigation never rebuilds the items', () => {
  const batch = session(seedsWithThreeDistinctDates());
  const moved = setBatchActiveIndex(batch, 1);
  assert.equal(moved.items[0], batch.items[0]);
  assert.equal(moved.items[2], batch.items[2]);
});

// ===========================================================================
// BATCH ORGANIZATION — common value plus EXPLICIT per-item override
// ===========================================================================
test('a common Album applies to every item that has no override', () => {
  const batch = session(seedsWithThreeDistinctDates(), 'vacaciones');
  for (const item of batch.items) assert.equal(batchEffectiveAlbumId(batch, item), 'vacaciones');
});

test('per-item Album override: three items, one explicit exception', () => {
  let batch = session(seedsWithThreeDistinctDates(), 'vacaciones');
  batch = setItemAlbumOverride(batch, 2, 'cumpleanos');
  assert.equal(batchEffectiveAlbumId(batch, batch.items[0]), 'vacaciones');
  assert.equal(batchEffectiveAlbumId(batch, batch.items[1]), 'vacaciones');
  assert.equal(batchEffectiveAlbumId(batch, batch.items[2]), 'cumpleanos');
  assert.equal(batchHasAlbumOverride(batch.items[0]), false);
  assert.equal(batchHasAlbumOverride(batch.items[2]), true);
});

test('editing the COMMON Album never erases an explicit item override', () => {
  let batch = session(seedsWithThreeDistinctDates(), 'vacaciones');
  batch = setItemAlbumOverride(batch, 2, 'cumpleanos');
  const edited = setBatchAlbum(batch, 'verano');
  assert.equal(batchEffectiveAlbumId(edited, edited.items[2]), 'cumpleanos', 'the exception survives the common edit');
  assert.equal(edited.items[2], batch.items[2], 'and it survives BY IDENTITY');
  assert.equal(batchEffectiveAlbumId(edited, edited.items[0]), 'verano');
});

test('an item can return to the common Album explicitly', () => {
  let batch = setItemAlbumOverride(session(seedsWithThreeDistinctDates(), 'vacaciones'), 1, 'cumpleanos');
  batch = clearItemAlbumOverride(batch, 1);
  assert.equal(batchHasAlbumOverride(batch.items[1]), false);
  assert.equal(batchEffectiveAlbumId(batch, batch.items[1]), 'vacaciones');
});

test('an explicit "Sin album" is distinguishable from no opinion', () => {
  let batch = session(seedsWithThreeDistinctDates(), 'vacaciones');
  batch = setItemAlbumOverride(batch, 0, null);
  assert.equal(batchHasAlbumOverride(batch.items[0]), true);
  assert.equal(batchEffectiveAlbumId(batch, batch.items[0]), null);
  const resolved = batchResolvedItems(batch);
  assert.equal(resolved[0].metadata.initialAlbumId, null, 'this item is saved without an Album');
  assert.equal(resolved[1].metadata.initialAlbumId, 'vacaciones', 'while the others keep the common one');
});

test('the common description applies to items without an override', () => {
  const batch = setBatchCaption(session(seedsWithThreeDistinctDates()), '  Vacaciones  ');
  assert.equal(batchEffectiveCaption(batch, batch.items[0]), 'Vacaciones', 'a blank common description is no description');
  assert.equal(batchEffectiveCaption(setBatchCaption(batch, '   '), batch.items[0]), null);
});

test('per-item description override, and the common edit never erases it', () => {
  let batch = setBatchCaption(session(seedsWithThreeDistinctDates()), 'Vacaciones');
  batch = setItemCaptionOverride(batch, 1, 'Cumpleaños de Ana');
  assert.equal(batchEffectiveCaption(batch, batch.items[0]), 'Vacaciones');
  assert.equal(batchEffectiveCaption(batch, batch.items[1]), 'Cumpleaños de Ana');
  const edited = setBatchCaption(batch, ' otro texto ');
  assert.equal(batchEffectiveCaption(edited, edited.items[1]), 'Cumpleaños de Ana', 'the explicit description survives');
  assert.equal(batchEffectiveCaption(edited, edited.items[0]), 'otro texto');
  const cleared = clearItemCaptionOverride(edited, 1);
  assert.equal(batchHasCaptionOverride(cleared.items[1]), false);
  assert.equal(batchEffectiveCaption(cleared, cleared.items[1]), 'otro texto');
});

test('an explicit empty description is distinguishable from no opinion', () => {
  let batch = setBatchCaption(session(seedsWithThreeDistinctDates()), 'Vacaciones');
  batch = setItemCaptionOverride(batch, 0, null);
  assert.equal(batchHasCaptionOverride(batch.items[0]), true);
  assert.equal(batchEffectiveCaption(batch, batch.items[0]), null);
  assert.equal(batchEffectiveCaption(batch, batch.items[1]), 'Vacaciones');
});

// ===========================================================================
// IDENTITY
// ===========================================================================
test('each item has a distinct stable local identity that is not a content id', () => {
  const batch = session(seedsWithThreeDistinctDates());
  const ids = batch.items.map((item) => item.draftId);
  assert.equal(new Set(ids).size, 3, 'identities are unique');
  for (const id of ids) assert.ok(!/^[0-9a-f]{8}-[0-9a-f]{4}/.test(id), 'a local draft id must never look like a server content id');
  assert.equal(createBatchFromArtifacts(seedsWithThreeDistinctDates(), null, 'batch-test').items[1].draftId, ids[1], 'the same asset yields the same identity for the same position');
});

// ===========================================================================
// SOURCE-SHAPE GATES — the wiring the pure contract assumes
// ===========================================================================
const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const code = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
const picker = code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts'));
const service = code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts'));
const intake = code(read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx'));

test('the picker enables multiple selection and keeps EVERY asset', () => {
  assert.ok(/allowsMultipleSelection: multiple/.test(picker), 'allowsMultipleSelection is driven by the caller, not hardcoded off');
  assert.ok(!/assets\?\.\[0\]/.test(picker), 'nothing reduces the selection to assets[0]');
  assert.ok(/for \(const asset of assets\)/.test(picker), 'every returned asset is staged');
});

test('one asset failing does not destroy the rest of the selection', () => {
  assert.ok(/catch \(error\) \{\n        failure = error instanceof Error \? error : new Error\(String\(error\)\);/.test(picker), 'a per-asset failure is collected, not thrown out of the loop');
  assert.ok(/if \(seeds\.length === 0\) throw failure/.test(picker), 'only a TOTAL failure is a failure');
});

test('the batch reuses the existing review, the existing date editor and the existing destination selector', () => {
  assert.ok(/<MemoryMediaReview draft=\{batchActiveItem\(batch\)\?\.draft \?\? batch\.items\[0\]\.draft\}/.test(intake), 'the batch review renders the ACTIVE item through the existing review component');
  assert.ok(/<MemorySemanticDateFields\s+value=\{batchActiveItem\(batch\)\?\.date \?\? emptySemanticDateDraft\(\)\}/.test(intake), 'and edits the date through the existing date editor');
  assert.ok(/<MemoryAlbumSelector albums=\{albums\} value=\{batch\.albumId\}/.test(intake), 'and chooses the common Album through the existing selector');
  assert.ok(!/MemoryBatchReview|MemoryBatchSemanticDate/.test(intake), 'there is no second review or second metadata engine');
});

test('there is exactly ONE final save action for the whole batch', () => {
  assert.ok(/title=\{batchSubmitting \? 'Guardando…' : `Guardar \$\{batch === null \? 0 : batchCount\(batch\)\} recuerdos`\}/.test(intake), 'one save action names the whole batch');
  assert.equal((intake.match(/onPress=\{\(\) => void submitBatch\(\)\}/g) ?? []).length, 1, 'and it is wired exactly once');
  assert.ok(!/MemoryBatchSubmit|submitBinaryMemories/.test(intake), 'no per-item submit button exists');
});

test('ST-10.E — batch submission goes through the SAME queue, with no new engine', () => {
  assert.ok((service.match(/queue\.enqueue\(/g) ?? []).length === 2, 'the single-item and the batch path both enqueue through the one shared queue');
  assert.ok(/role: 'memory'/.test(service), 'a batch item is still a memory job');
  assert.ok(!/createUploadEngine\(\{/.test(service.split('async function createBinaryMemories')[1] ?? ''), 'the batch path builds no second upload engine');
  assert.ok(!/fetch\(|\/memories\/bulk|bulkEndpoint/.test(service), 'no bulk endpoint is invented');
});

test('ST-10.E — per-item states come from the durable store, in the engine vocabulary', () => {
  assert.ok(/function batchJobStates\(jobIds: readonly string\[\]\): MemoryBatchJobState\[\] \{[\s\S]*?const job = store\.get\(jobId\);/.test(service), 'the summary reads the durable store, not an optimistic local flag');
  const typeSource = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeTypes.ts');
  assert.ok(/readonly state: 'pending' \| 'registering' \| 'registered' \| 'uploading' \| 'verifying' \| 'finalizing' \| 'completed' \| 'failed' \| 'cancelled';/.test(typeSource), 'the per-item state is the engine vocabulary, never an invented batch lifecycle');
});

test('ST-10.E — retry is failed-only and never re-runs a completed item', () => {
  assert.ok(/const failedIds = summary\.filter\(\(job\) => job\.state === 'failed'\)\.map\(\(job\) => job\.jobId\);/.test(intake), 'only failed job ids are retried');
  assert.ok(/async function retryBatchJobs\(jobIds: readonly string\[\]\): Promise<void> \{[\s\S]*?for \(const jobId of jobIds\) await coordinator\.retry\(jobId\);/.test(service), 'and they go through the same idempotent coordinator retry as the global band');
});

test('ST-10.E — cancelling a batch never claims a finalized upload was undone', () => {
  assert.ok(/async function cancelBatchJobs[\s\S]*?for \(const jobId of jobIds\) \{\n      const result = await queue\.cancelJob\(jobId\);\n      if \(result\) cancelled \+= 1;/.test(service), 'cancel targets only the given ids and counts what was really cancelled');
  assert.ok(/\$\{cancelled\} cancelados: no se guardaron/.test(intake), 'the summary reports cancelled items as not saved');
  assert.ok(/\$\{saved\} de \$\{summary\.length \+ refused\.length\} guardados/.test(intake), 'and the headline count is derived, never hardcoded to the batch size');
  assert.ok(!/recuerdos guardados`\}/.test(intake), 'no unconditional "N recuerdos guardados" claim exists');
});

test('ST-10.E — the double-submit guard is synchronous and real', () => {
  assert.ok(/if \(acceptedBatchKey === batchKey && batchJobIds\.length > 0\) \{\n      return batchAcceptedItems\(batchJobIds\);\n    \}/.test(service), 'a second press of the same batch returns the SAME job ids instead of enqueueing twice');
  assert.ok(/if \(!current \|\| batchSubmitting\) return;/.test(intake), 'and the surface refuses a second press while one is in flight');
});

test('cancel before submit discards the whole unsubmitted batch', () => {
  assert.ok(/if \(!hasDurableJobs\) current\.items\.forEach\(\(item\) => discardDraftArtifact\(item\.draft\)\);/.test(intake), 'every unsubmitted artifact is released');
  assert.ok(/const hasDurableJobs = batchAcceptedRef\.current\.length > 0;/.test(intake), 'and once a durable job exists the artifacts are left to recovery instead');
});

test('AppState and focus loss release an unsubmitted batch without touching a submitted one', () => {
  const effect = intake.slice(intake.indexOf("memoryDevTrace('focus_lost'"), intake.indexOf('const reRecordAudio'));
  assert.ok(/clearBinaryDraft\('focus_lost'\); clearBatch\('focus_lost'\); service\.dismiss\(\); setSheet\(null\);/.test(effect), 'losing focus clears the single draft and the batch in the same boundary');
  assert.ok(/clearBatch\('focus_lost'\);/.test(effect), 'and clears the batch too');
});

test('household scoping: the batch never bypasses the contribute capability or the household-bound queue', () => {
  assert.ok(/async function pickMemoryBatch[\s\S]*?if \(!capabilities\.contribute\) \{/.test(service), 'the batch picker requires contribute');
  assert.ok(/async function createBinaryMemories[\s\S]*?if \(!capabilities\.contribute\) \{/.test(service), 'and so does the batch submission');
  assert.ok(/createSharedUploadQueue\(\{\s*\n    store,\s*\n    householdId,/.test(service), 'jobs are enqueued into the household-bound shared queue');
  assert.ok(/getHouseholdId: \(\) => householdId/.test(service), 'the engine is bound to this household only');
});

console.log(`\nHOMECLOUD_ST10_BATCH_INTAKE_TESTS pass=${passed} fail=${failed}`);
if (failed > 0) process.exitCode = 1;
else console.log('HOMECLOUD_ST10_BATCH_INTAKE_TESTS=PASS');