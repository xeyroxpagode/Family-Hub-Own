import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  MEDIA_CAPTURE_SOURCE_PRIORITY,
  deriveMediaCaptureMetadata,
  formatMediaCaptureDate,
  memoryRegisterCaptureFields,
  unknownMediaCaptureMetadata,
} from '../front/mi-front-limpio/services/homecloud/homecloudMediaCaptureMetadata';
import { memoryPrimaryText } from '../front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline';
import type { HomeCloudMemoryListItem } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

const root = process.cwd();
// Normalize CRLF so line-anchored assertions behave the same on every checkout.
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const component = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const service = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const picker = read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts');
const durable = read('front/mi-front-limpio/services/homecloud/homecloudDurableArtifact.ts');
const captureSource = read('front/mi-front-limpio/services/homecloud/homecloudMediaCaptureMetadata.ts');
const timelineSource = read('front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline.ts');
const cardsSource = read('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const mediaReview = read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx');
const actionSheet = read('front/mi-front-limpio/components/ui/ActionSheet.tsx');

/**
 * Source with comments removed. Prohibitions like "never uses now()" are
 * asserted against CODE, not against the prose that documents the prohibition.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const captureCode = stripComments(captureSource);

/** Slice one create form by its own mount marker, not by a title that repeats. */
const reviewForm = component.slice(
  component.indexOf("visible={sheet === 'binary'}"),
  component.indexOf("visible={sheet === 'written'}"),
);
const writtenForm = component.slice(component.indexOf("visible={sheet === 'written'}"));

let passed = 0;
let failed = 0;
function test(name: string, run: () => void) {
  try {
    run();
    passed += 1;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL: ${name}`);
    console.error(`        ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
}

const mem = (over: Partial<HomeCloudMemoryListItem>): HomeCloudMemoryListItem => ({
  id: 'm1',
  role: 'memory',
  kind: 'image',
  displayName: null,
  mimeType: null,
  sizeBytes: null,
  hasPreview: false,
  caption: null,
  writtenText: null,
  capturedAt: null,
  capturedYear: null,
  capturedMonth: null,
  capturePrecision: 'unknown',
  albumIds: [],
  ...over,
} as HomeCloudMemoryListItem);

console.log('\n=== HOMECLOUD 4C1.1 MEMORY CREATE RUNTIME RECOVERY TESTS ===\n');

// ---------------------------------------------------------------------------
// 1-10: PICKER REUSE
// ---------------------------------------------------------------------------

test('1. picker launches while the create sheet stays presented (legal presentation order)', () => {
  // ROOT CAUSE guard: dismissing the Modal BEFORE awaiting the native picker is
  // what iOS drops. The dismiss must happen only on the cancel/close path.
  const runPicker = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  assert.doesNotMatch(runPicker.slice(0, runPicker.indexOf('await pick()')), /setSheet\(null\)/);
  assert.match(runPicker, /const draft = await pick\(\)/);
});

test('2. cancel keeps the create sheet open so the same button reopens the picker', () => {
  const chooseMedia = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  // A null draft (cancel OR failure) returns WITHOUT switching sheets.
  assert.match(chooseMedia, /const draft = await pick\(\);\s*if \(!draft\) return;/);
  // The pick flow never dismisses the create sheet: the only sheet it can open
  // is the Review, and only after a real selection.
  assert.doesNotMatch(chooseMedia, /setSheet\(null\)/);
  assert.equal(chooseMedia.split('setSheet(').length - 1, 1);
  assert.match(chooseMedia, /setSheet\('binary'\);/);
  // The button stays armed and the sheet is still the one on screen.
  assert.match(component, /title=\{picking \? 'Abriendo…' : 'Fotos y videos'\}/);
  assert.doesNotMatch(chooseMedia, /setSheet\(null\)/);
});

test('3. review replaces the create sheet only on a real selection', () => {
  assert.match(component, /setBinaryDraft\(draft\);[\s\S]{0,200}setSheet\('binary'\);/);
});

test('4. success clears the draft and the transient picker state', () => {
  const success = component.slice(component.indexOf("state.status !== 'completed'"), component.indexOf('const active ='));
  assert.match(success, /clearBinaryDraft\(\);/);
  assert.match(success, /setSheet\(null\);/);
  assert.match(component, /const clearBinaryDraft = useCallback\(\(\) => \{[\s\S]*?setBinaryDraft\(null\);[\s\S]*?setBinaryCaption\(''\);/);
});

test('5. failure preserves the draft for retry and never blocks the picker', () => {
  // The Review keeps binaryDraft, so Reintentar re-runs the same job.
  assert.match(component, /state\.status === 'failed' \? service\.retry\(\) : submitBinary\(\)/);
  // The trigger depends on the LOCAL guard only, never on a remote status.
  assert.match(component, /const triggerDisabled = !capabilities\.contribute \|\| active \|\| picking;/);
  assert.doesNotMatch(component, /disabled=\{[^}]*state\.status === 'picking'/);
});

test('6. pending guard is released in a finally on resolve', () => {
  const chooseMedia = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  assert.match(chooseMedia, /\} finally \{[\s\S]*pickingRef\.current = false;[\s\S]*setPicking\(false\);/);
});

test('7. pending guard is released in a finally on reject', () => {
  // A `finally` covers both the success and the throw path, so a rejection can
  // never leave the guard held.
  const chooseMedia = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  const tryIndex = chooseMedia.indexOf('try {');
  const finallyIndex = chooseMedia.indexOf('finally {');
  assert.ok(tryIndex >= 0 && finallyIndex > tryIndex, 'chooseMedia has try/finally');
  // The service also owns a guard released in its own finally.
  const pickMemory = service.slice(service.indexOf('async function runSourcePicker'), service.indexOf('async function createBinaryMemory'));
  assert.match(pickMemory, /\} finally \{\s*picking = false;/);
  // And it reports a real failure instead of throwing out of the guard.
  assert.match(pickMemory, /catch \(error\) \{[\s\S]*status: 'failed'/);
});

test('8. closing the sheet releases the picker guard (CLOSE reset contract)', () => {
  const closeCreate = component.slice(component.indexOf('const closeCreate'), component.indexOf('const closeReview'));
  assert.match(closeCreate, /pickerAttemptRef\.current \+= 1;/);
  assert.match(closeCreate, /pickingRef\.current = false;/);
  assert.match(closeCreate, /setPicking\(false\);/);
  assert.match(closeCreate, /service\.dismiss\(\);/);
  // The service-level guard is released by dismiss() too.
  const dismiss = service.slice(service.indexOf('function dismiss()'), service.indexOf('function subscribe('));
  assert.match(dismiss, /picking = false;/);
});

test('9. a double tap cannot open two native pickers', () => {
  assert.match(component, /const pickingRef = useRef\(false\);/);
  assert.match(component, /if \(pickingRef\.current\) return;/);
  // Second, independent line of defence at the service boundary.
  assert.match(service, /if \(picking\) return null;/);
});

test('10. a third attempt works: every attempt gets ownership, latest wins', () => {
  assert.match(component, /const pickerAttemptRef = useRef\(0\);/);
  const chooseMedia = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  assert.match(chooseMedia, /const attempt = pickerAttemptRef\.current \+ 1;\s*pickerAttemptRef\.current = attempt;/);
  // A late resolve from a superseded attempt can never commit its draft.
  assert.match(chooseMedia, /if \(!mountedRef\.current \|\| pickerAttemptRef\.current !== attempt\) return;/);
  // Nothing blocks a new attempt once the previous one settled.
  assert.match(service, /resetTransientState\(\);\s*emitState\(\{ status: 'picking' \}\);/);
});

test('picker reuse is not faked with timers, reloads, remounts or navigation', () => {
  const intake = component + service + picker;
  assert.doesNotMatch(intake, /setTimeout|setInterval/);
  assert.doesNotMatch(intake, /ReloadApp|reloadAsync|Updates\.reload|key=\{Date\.now\(\)|router\.(push|replace)|navigation\.(navigate|goBack)/);
  assert.doesNotMatch(intake, /forceMount|force remount/i);
});

// ---------------------------------------------------------------------------
// 11-18: MEDIA DATE
// ---------------------------------------------------------------------------

test('11. trusted temporal metadata -> precision exact', () => {
  const derived = deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 18:30:45' }, type: 'image' });
  assert.equal(derived.capturePrecision, 'exact');
});

test('12. capturedAt comes from the real metadata, not from the import', () => {
  const derived = deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 18:30:45' }, type: 'image' });
  assert.equal(derived.capturedAt, '2024-01-12T18:30:45.000Z');
});

test('13. year and month are derived from that capturedAt', () => {
  const derived = deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 18:30:45' }, type: 'image' });
  assert.equal(derived.capturedYear, 2024);
  assert.equal(derived.capturedMonth, 1);
});

test('14. no trusted metadata -> precision unknown and every component null', () => {
  for (const asset of [{}, { exif: null }, { exif: {} }, { exif: { DateTimeOriginal: 'nope' } }, { duration: 4200 }, { fileName: 'IMG_20240112_101010.jpg' }]) {
    const derived = deriveMediaCaptureMetadata(asset);
    assert.equal(derived.capturePrecision, 'unknown', JSON.stringify(asset));
    assert.equal(derived.capturedAt, null);
    assert.equal(derived.capturedYear, null);
    assert.equal(derived.capturedMonth, null);
  }
});

test('15. it never uses now() as a fallback date', () => {
  assert.doesNotMatch(captureCode, /new Date\(\)|Date\.now\(\)|\bnow\(\)/);
  const before = new Date().getUTCFullYear();
  const derived = deriveMediaCaptureMetadata({});
  assert.equal(derived.capturedAt, null);
  assert.notEqual(derived.capturedYear, before);
});

test('16. it never uses uploadedAt as a fallback date', () => {
  assert.doesNotMatch(captureCode, /uploadedAt/);
});

test('17. it never uses createdAt / import date / selection date', () => {
  assert.doesNotMatch(captureCode, /createdAt|importedAt|selectedAt/);
  // A stale filename date is a heuristic, not metadata: it must not win.
  const derived = deriveMediaCaptureMetadata({ fileName: 'VID_20240112_101010.mp4' });
  assert.equal(derived.capturePrecision, 'unknown');
});

test('18. Review shows the date informationally and never asks for precision', () => {
  // The precision editor exists only for the WRITTEN form, which has no
  // gallery metadata to derive from.
  assert.doesNotMatch(reviewForm, /MemorySemanticDateFields/);
  assert.equal(stripComments(component).split('MemorySemanticDateFields').length - 1, 3); // import x2 + written form
  assert.match(reviewForm, /subtitle=\{binaryDraft \? formatMediaCaptureDate\(binaryDraft\.capture\) : undefined\}/);
  assert.match(reviewForm, /<MemoryCaptureSummary capture=\{binaryDraft\?\.capture\} \/>/);
  // Nothing in the review is a date INPUT.
  assert.doesNotMatch(reviewForm, /semanticDateValueFromDraft|setSemanticDatePrecision|semanticDateDraftFromCapture/);
  // The summary is a readout, not an editor.
  const summary = component.slice(component.indexOf('function MemoryCaptureSummary'), component.indexOf('function MemoryAlbumSelector'));
  assert.doesNotMatch(summary, /onPress|FilterChip|AppInput|semanticDate/);
});

test('media date source priority is documented and executable', () => {
  assert.deepEqual([...MEDIA_CAPTURE_SOURCE_PRIORITY], ['exif.DateTimeOriginal', 'exif.DateTimeDigitized', 'exif.DateTime']);
  // Documented rejections, so the priority is auditable and not folklore.
  assert.match(captureSource, /asset\.creationTime`?[\s\S]*?NOT part of ImagePickerAsset/);
  assert.match(captureSource, /a LENGTH in milliseconds, not an instant/);
  assert.match(captureSource, /naming heuristic, not metadata/);
  // Fallback order really works.
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeDigitized: '2019:07:04 09:00:00' } }).capturedYear, 2019);
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTime: '2015:02:08 10:00:00' } }).capturedMonth, 2);
  // The original always wins over the weaker tags.
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2020:03:03 10:00:00', DateTime: '2015:02:08 10:00:00' } }).capturedYear, 2020);
});

test('exact register payload mirrors the backend contract (server derives components)', () => {
  const derived = deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 18:30:45' } });
  // backend homecloudIntakeValidation.js REJECTS client components for `exact`.
  assert.deepEqual(memoryRegisterCaptureFields(derived), {
    capturePrecision: 'exact', capturedAt: '2024-01-12T18:30:45.000Z', capturedYear: null, capturedMonth: null,
  });
  assert.deepEqual(memoryRegisterCaptureFields(unknownMediaCaptureMetadata()), {
    capturePrecision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null,
  });
});

test('impossible calendar stamps are rejected instead of silently rolling over', () => {
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:02:31 10:00:00' } }).capturePrecision, 'unknown');
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:13:01 10:00:00' } }).capturePrecision, 'unknown');
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:01 25:00:00' } }).capturePrecision, 'unknown');
  // The EXIF wall-clock is encoded as UTC on purpose: the derived calendar date
  // is the day the user experienced (see the primitive's documented rationale).
  assert.equal(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 22:00:00' } }).capturedMonth, 1);
});

test('Review date label is informative: "12 ene 2024" or "Sin fecha"', () => {
  assert.equal(formatMediaCaptureDate(deriveMediaCaptureMetadata({ exif: { DateTimeOriginal: '2024:01:12 18:30:45' } })), '12 ene 2024');
  assert.equal(formatMediaCaptureDate(unknownMediaCaptureMetadata()), 'Sin fecha');
});

// ---------------------------------------------------------------------------
// 19-23: FILENAME IS NOT IDENTITY
// ---------------------------------------------------------------------------

test('19. image without caption does not show displayName', () => {
  assert.equal(memoryPrimaryText(mem({ kind: 'image', caption: null, displayName: 'IMG_3485.HEIC' })), '');
});

test('20. video without caption does not show displayName', () => {
  assert.equal(memoryPrimaryText(mem({ kind: 'video', caption: null, displayName: 'VID_1029.MOV' })), '');
});

test('21. a caption may be shown when there is one', () => {
  assert.equal(memoryPrimaryText(mem({ kind: 'image', caption: 'La primera playa', displayName: 'IMG_3485.HEIC' })), 'La primera playa');
  assert.equal(memoryPrimaryText(mem({ kind: 'video', caption: 'El primer video', displayName: 'VID_1029.MOV' })), 'El primer video');
});

test('22. displayName still exists internally (storage/upload/search)', () => {
  assert.match(picker, /displayName: ensureSingleExtension\(rawName, extension\)/);
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts'), /displayName: job2\.artifact\.displayName/);
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudTypes.ts'), /readonly displayName: string \| null;/);
  // ...and the timeline primitive simply stops consulting it.
  const fn = timelineSource.slice(timelineSource.indexOf('export function memoryPrimaryText'));
  assert.doesNotMatch(stripComments(fn), /displayName/);
  // The card falls back to the honest semantic date, not to the filename.
  assert.match(cardsSource, /\{label\}\s*<\/AppText>/);
});

test('23. Review never uses the filename as title or label', () => {
  assert.doesNotMatch(stripComments(reviewForm), /displayName/);
  // The video preview states what it is, not what the file is called.
  assert.match(reviewForm, /<MemoryMediaReview draft=\{binaryDraft\} \/>/);
  assert.match(mediaReview, /<VideoView[\s\S]*nativeControls/);
  assert.doesNotMatch(stripComments(reviewForm), /binaryDraft\.artifact\.displayName/);
});

// ---------------------------------------------------------------------------
// 24-31: WRITTEN + KEYBOARD CONTRACTS
// ---------------------------------------------------------------------------

test('24. both create forms use a keyboard-aware composition', () => {
  assert.match(actionSheet, /KeyboardAvoidingView/);
  assert.match(actionSheet, /keyboardAware\?: boolean;/);
  assert.match(actionSheet, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  // Opt-in only: no other sheet changes its layout.
  const used = component.split('keyboardAware').length - 1;
  assert.equal(used, 2); // both memory create forms
});

test('25. tapping outside the input dismisses the keyboard, not the form', () => {
  assert.match(actionSheet, /if \(keyboardAware && keyboardVisible\) \{\s*Keyboard\.dismiss\(\);\s*return;/);
  // Driven by real keyboard events, not by guessing.
  assert.match(actionSheet, /Keyboard\.addListener\('keyboardDidShow'/);
  assert.match(actionSheet, /Keyboard\.addListener\('keyboardDidHide'/);
  // The written form can also be dismissed by dragging the scroll view.
  assert.match(writtenForm, /keyboardDismissMode="on-drag"/);
});

test('26. the CTA stays actionable with the keyboard open', () => {
  // The CTA lives in the ActionSheet footer, outside the scrolling body, and
  // the sheet is wrapped so the footer is never covered by the keyboard.
  assert.match(actionSheet, /const sheet = \(\s*<View style=\{\[styles\.modalSheet/);
  assert.match(actionSheet, /\{footer \? <View style=\{styles\.modalFooter\}>\{footer\}<\/View> : null\}/);
  assert.match(actionSheet, /keyboardAvoiding: \{ flexShrink: 1, justifyContent: 'flex-end' \}/);
  // Pressing it dismisses the keyboard and submits in one gesture.
  assert.match(component, /onPress=\{\(\) => void submitWritten\(\)\}/);
  assert.match(component, /Keyboard\.dismiss\(\);\s*const date = semanticDateValueFromDraft\(writtenDate\);/);
  // And the return key submits too.
  assert.match(component, /onSubmitEditing=\{\(\) => void submitWritten\(\)\}/);
  assert.match(component, /returnKeyType="done"/);
  assert.match(component, /blurOnSubmit/);
});

test('27. the form scrolls correctly with the keyboard open', () => {
  assert.match(writtenForm, /<ScrollView[\s\S]*?keyboardShouldPersistTaps="handled"/);
  // Date, album and the CTA all remain reachable: the body scrolls, the footer
  // is fixed, and the sheet is bottom-anchored.
  const dateIndex = writtenForm.indexOf('<MemorySemanticDateFields');
  const albumIndex = writtenForm.indexOf('<MemoryAlbumSelector');
  assert.ok(dateIndex > 0, 'the written form exposes the manual date');
  assert.ok(albumIndex > dateIndex, 'date precedes album inside the scrolling body');
});

test('28. blank written text is still invalid', () => {
  assert.match(component, /if \(writtenSubmitting \|\| !writtenText\.trim\(\) \|\| semanticDateDraftError\(writtenDate\)\) return;/);
  assert.match(component, /disabled=\{!writtenText\.trim\(\) \|\| writtenSubmitting/);
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts'), /if \(!writtenText\) throw new Error\('Escribí el recuerdo antes de guardarlo\.'\);/);
});

test('29. valid written text creates', () => {
  assert.match(component, /await createWrittenMemory\(config\.accessToken, \{/);
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts'), /\/api\/homecloud\/register/);
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts'), /\/finalize/);
});

test('30. the manual written date stays intact (exact / month_year / year / unknown)', () => {
  assert.match(component, /<MemorySemanticDateFields value=\{writtenDate\} onChange=\{setWrittenDate\}/);
  assert.match(component, /openWritten = \(\) => \{[\s\S]*setWrittenDate\(emptySemanticDateDraft\(\)\);/);
  assert.match(read('front/mi-front-limpio/components/homecloud/MemorySemanticDateFields.tsx'), /'Fecha exacta'/);
  assert.match(read('front/mi-front-limpio/components/homecloud/MemorySemanticDateFields.tsx'), /'Mes y año'/);
  assert.match(read('front/mi-front-limpio/components/homecloud/MemorySemanticDateFields.tsx'), /'Sólo año'/);
  assert.match(read('front/mi-front-limpio/components/homecloud/MemorySemanticDateFields.tsx'), /'Sin fecha'/);
});

test('31. the optional album stays intact on both forms', () => {
  assert.match(component, /const \[binaryAlbumId, setBinaryAlbumId\] = useState<string \| null>\(initialAlbumId \?\? null\);/);
  assert.match(component, /const \[writtenAlbumId, setWrittenAlbumId\] = useState<string \| null>\(initialAlbumId \?\? null\);/);
  assert.match(component, /<MemoryAlbumSelector albums=\{albums\} value=\{binaryAlbumId\} onChange=\{setBinaryAlbumId\}/);
  assert.match(component, /<MemoryAlbumSelector albums=\{albums\} value=\{writtenAlbumId\} onChange=\{setWrittenAlbumId\}/);
  assert.match(service, /initialAlbumId: metadata\.initialAlbumId/);
  // No album is a valid choice, and Create is never blocked by an empty list.
  assert.match(component, /albums\.length === 0 \? <FilterChip label="Sin álbum" selected disabled=\{disabled\} \/>/);
  // Albums CRUD stays out of this patch.
  assert.doesNotMatch(component, /Nuevo álbum|createAlbum|Nuevo album/);
});

test('CANCEL/CLOSE do not leak the durable artifact copy', () => {
  assert.match(component, /void import\('\.\/homecloudMemoryPicker'\)[\s\S]*discardMemoryMedia\(draft\.artifact\)/);
  assert.match(component, /if \(!service\.hasActiveJob\(\)\) discardDraftArtifact\(binaryDraft\);/);
  assert.match(picker, /export async function discardMemoryMedia/);
  // Only a folder this module created can ever be deleted.
  assert.match(durable, /const PENDING_FOLDER = \/\^pending_\\d\+_\[a-z0-9\]\+\$\/;/);
  assert.match(durable, /if \(parent !== workspace\) return;/);
  assert.match(durable, /deleteAsync\(fileDir, \{ idempotent: true \}\)/);
});

test('no remount of the surrounding surface is required to recover', () => {
  // The fix lives entirely in the intake's own transient state.
  assert.doesNotMatch(component, /key=\{Math\.random\(\)|key=\{Date\.now\(\)/);
  assert.match(component, /mountedRef\.current = false;/);
  assert.match(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'), /<MemoryIntake/);
  // The trigger is reachable again after any of the four terminal paths.
  assert.match(component, /onPress=\{\(\) => setSheet\('create'\)\}/);
});

test('ALBUM: no CRUD, no "Nuevo álbum", and an empty album list does not block Create', () => {
  assert.doesNotMatch(component + service, /Nuevo álbum|createAlbum|deleteAlbum|renameAlbum/);
  assert.doesNotMatch(component, /AlbumDetail|albumDetail/);
  assert.doesNotMatch(component, /disabled=\{[^}]*albums\.length === 0/);
});

test('VIEWER stays deferred: cards remain non-interactive', () => {
  assert.match(cardsSource, /Cards are intentionally NON-INTERACTIVE in this slice/);
  assert.doesNotMatch(cardsSource, /onPress|navigation\.|router\./);
  assert.doesNotMatch(component, /zoom|Viewer|viewer/);
});

console.log(`\nHOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_RESULT pass=${passed} fail=${failed}`);
if (failed > 0) {
  process.exitCode = 1;
  console.error('HOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_TESTS=FAIL');
} else {
  console.log('HOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_TESTS=PASS');
}
