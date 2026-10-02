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

/**
 * ONE STABLE NATIVE MODAL HOST for source|binary.
 *
 * Slice it by its own mount marker. Inside it, `source` and `binary` are two
 * CONTENT branches of the same host, so each one is sliced by its own branch
 * anchor rather than by a host marker (there is only one host).
 */
const hostForm = component.slice(
  component.indexOf("visible={sheet === 'source' || sheet === 'binary'}"),
  component.indexOf("visible={sheet === 'recorder'}"),
);
const binaryContentStart = component.indexOf('{sheet === \'binary\' ? (');
/** The binary branch: from its ternary to the source branch's own body. */
const binaryContent = component.slice(binaryContentStart, component.indexOf('<View style={styles.actions}>', binaryContentStart));
const writtenForm = component.slice(component.indexOf("visible={sheet === 'written'}"));
/** The picker flow, from its own declaration to the first `choose*` wrapper. */
const runPickerSource = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
/** The unified host's single close policy, source+binary aware. */
const sourceBinaryClosePolicy = component.slice(
  component.indexOf('const handleSourceBinaryRequestClose'),
  component.indexOf('/**', component.indexOf('const handleSourceBinaryRequestClose')),
);

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
  assert.doesNotMatch(runPicker.slice(0, runPicker.indexOf('await pick(mediaAttempt)')), /setSheet\(null\)/);
  assert.match(runPicker, /const draft = await pick\(mediaAttempt\)/);
});

test('2. cancel keeps the create sheet open so the same button reopens the picker', () => {
  const chooseMedia = component.slice(component.indexOf('const runPicker'), component.indexOf('const chooseMedia'));
  // A null draft (cancel OR failure) returns WITHOUT switching sheets.
  assert.match(chooseMedia, /const draft = await pick\(mediaAttempt\);\s*if \(!draft\) return;/);
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
  // Scoped to the picker flow itself. Before this was scoped it also matched
  // `acceptCamera`, so it passed for a reason that had nothing to do with the
  // gallery handoff. The commit must sit AFTER the null-draft bail: a cancel
  // can never open the Review.
  assert.ok(runPickerSource.indexOf('if (!draft) return;') >= 0, 'runPicker bails on a null draft');
  assert.ok(runPickerSource.indexOf('if (!draft) return;') < runPickerSource.indexOf('setBinaryDraft(draft);'));
  assert.match(runPickerSource, /setBinaryDraft\(draft\);[\s\S]{0,200}setSheet\('binary'\);/);
});

test('4. success clears the draft and the transient picker state', () => {
  const success = component.slice(component.indexOf("state.status !== 'completed'"), component.indexOf('const active ='));
  assert.match(success, /clearBinaryDraft\('completed'\);/);
  assert.match(success, /setSheet\(null\);/);
  // The success result is reported BEFORE the local teardown, so a cleanup
  // problem can never rewrite a persisted memory as a failed save.
  assert.ok(success.indexOf('onComplete?.(state.contentId)') < success.indexOf("clearBinaryDraft('completed')"));
  assert.match(component, /const clearBinaryDraft = useCallback\(\(reason: BinaryDraftClearReason\) => \{[\s\S]*?setBinaryDraft\(null\);[\s\S]*?setBinaryCaption\(''\);/);
});

test('5. failure preserves the draft for retry and never blocks the picker', () => {
  // A pre-acceptance failure keeps binaryDraft and the same footer retries
  // acceptance. Post-acceptance failures belong to global job activity.
  assert.match(component, /acceptedDraftRef\.current = null;[\s\S]*setAccepting\(false\);[\s\S]*return;/);
  assert.match(component, /onPress=\{\(\) => \{ Keyboard\.dismiss\(\); void submitBinary\(\); \}\}/);
  // A detached background upload never blocks opening a new intake.
  assert.match(component, /const triggerDisabled = !capabilities\.contribute \|\| picking \|\| accepting;/);
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
  assert.match(chooseMedia, /if \(!mountedRef\.current \|\| pickerAttemptRef\.current !== attempt \|\| !attemptAuthorityRef\.current\.owns\(mediaAttempt\)\) return;/);
  // Nothing blocks a new attempt once the previous one settled.
  assert.match(service, /resetTransientState\(\);\s*emitState\(\{ status: 'picking' \}\);/);
});

test('picker reuse is not faked with timers, reloads, remounts or navigation', () => {
  // The shared sheet is part of the surface: a modal-side timer would be just as
  // much of a fake as one in the intake.
  const intake = component + service + picker + actionSheet;
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
  assert.doesNotMatch(binaryContent, /MemorySemanticDateFields/);
  assert.equal(stripComments(component).split('MemorySemanticDateFields').length - 1, 3); // import x2 + written form
  assert.match(hostForm, /subtitle=\{sheet === 'binary' && binaryDraft \? formatMediaCaptureDate\(binaryDraft\.capture\) : undefined\}/);
  assert.match(binaryContent, /<MemoryCaptureSummary capture=\{binaryDraft\?\.capture\} \/>/);
  // Nothing in the review is a date INPUT.
  assert.doesNotMatch(binaryContent, /semanticDateValueFromDraft|setSemanticDatePrecision|semanticDateDraftFromCapture/);
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
  assert.doesNotMatch(stripComments(binaryContent), /displayName/);
  // The video preview states what it is, not what the file is called.
  assert.match(binaryContent, /<MemoryMediaReview draft=\{binaryDraft\} attempt=\{reviewAttempt \?\? undefined\} \/>/);
  assert.match(mediaReview, /<VideoView[\s\S]*nativeControls/);
  assert.doesNotMatch(stripComments(binaryContent), /binaryDraft\.artifact\.displayName/);
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
  assert.match(component, /if \(!service\.hasActiveJob\(\) && !acceptingRef\.current\) discardDraftArtifact\(binaryDraft\);/);
  assert.match(picker, /export async function discardMemoryMedia/);
  // Only a folder this module created can ever be deleted (T1: the strict
  // shape lives in the shared sweep policy; the durable module enforces it).
  assert.match(read('front/mi-front-limpio/services/homecloud/homecloudOrphanSweepPolicy.ts'), /PENDING_FOLDER_PATTERN = \/\^pending_\\d\+_\[a-z0-9\]\+\$\//);
  assert.match(durable, /if \(parent !== workspace\) return;/);
  assert.match(durable, /deleteAsync\(fileDir, \{ idempotent: true \}\)/);
});

test('no remount of the surrounding surface is required to recover', () => {
  // The fix lives entirely in the intake's own transient state.
  assert.doesNotMatch(component, /key=\{Math\.random\(\)|key=\{Date\.now\(\)/);
  assert.match(component, /mountedRef\.current = false;/);
  assert.match(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx'), /<MemoryIntake/);
  // The `+` trigger ITSELF is the reachable door. A bare
  // `onPress={() => setSheet('create')}` also matches the source sheet's "Volver"
  // ghost button, so it proved nothing about the trigger.
  assert.match(component, /const openCreate = useCallback[\s\S]*service\.dismiss\(\);[\s\S]*setSheet\('create'\);/);
  assert.match(component, /onPress=\{openCreate\}\s*\n\s*disabled=\{triggerDisabled\}\s*\n\s*accessibilityLabel="Crear recuerdo"/);
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

// ---------------------------------------------------------------------------
// 32-40: GALLERY -> REVIEW HANDOFF CONTRACT
// ---------------------------------------------------------------------------
//
// The contract under test, not an implementation detail:
//
//   "a valid gallery artifact reaches the review/binary state EXACTLY ONCE,
//    and never loses the draft on the way",
//
// on ONE stable native modal host that also presents the source chooser.
//
// What is deliberately NOT the contract: *which setter* performs the
// transition, or *when* relative to any native dismissal callback. Two
// alternatives were tried and are excluded by name rather than merely
// discouraged: a two-phase handoff (close the chooser host, then open the
// Review from the next render's native `onDismiss`) and any timer/deadline.
// Neither is a cross-platform authority, and the two separate native Modals they
// needed were themselves the demonstrated cause of the dropped presentation.

test('32. a valid gallery artifact reaches the Review in EXACTLY ONE transition', () => {
  // Exactly one sheet transition in the picker flow, and it IS the Review.
  // Any intermediate sheet would need a second signal (a native dismissal) to
  // leave, and that signal is not a cross-platform authority.
  assert.equal(runPickerSource.split('setSheet(').length - 1, 1);
  assert.match(runPickerSource, /setSheet\('binary'\);/);
  // The draft and the Review open in the same commit: no window in which the
  // artifact exists while the Review does not.
  assert.match(runPickerSource, /setBinaryDraft\(draft\);[\s\S]{0,200}setSheet\('binary'\);/);
  assert.ok(runPickerSource.indexOf('setBinaryDraft(draft);') < runPickerSource.indexOf("setSheet('binary')"));
});

test('33. the gallery handoff owns no intermediate sheet, no pending draft and no dismissal signal', () => {
  // The two-phase "gallery-handoff" experiment and its pending draft are gone.
  assert.doesNotMatch(component, /gallery-handoff|pendingBinaryReview|completeGalleryBinaryHandoff/);
  // A native dismissal callback is never an AUTHORITY. Today the intake does not
  // wire one at all; the assertion is on the prohibition, so a future
  // diagnostics-only listener may not quietly become a transition.
  const dismissalBlocks = [...stripComments(component).matchAll(/onDismiss=\{([\s\S]{0,400}?)\}/g)].map((match) => match[1]);
  for (const block of dismissalBlocks) {
    assert.doesNotMatch(block, /setSheet|setBinaryDraft|clearBinaryDraft|closeReview/);
  }
  assert.doesNotMatch(stripComments(actionSheet), /onDismiss/);
  // No deadline is the authority that reaches the Review either.
  assert.doesNotMatch(runPickerSource, /setTimeout|setInterval|requestAnimationFrame/);
});

test('34. the handoff starts no upload, no request and no household/auth re-scope', () => {
  // The handoff is a pure local presentation change. Persistence is owned by
  // submitBinary -> createBinaryMemory, and by nothing in the picker flow; the
  // household stays whatever the service instance was created with.
  assert.doesNotMatch(runPickerSource, /createBinaryMemory|register|upload|household|accessToken|capabilities|service\./);
  // And it never clears or re-sources the artifact.
  assert.doesNotMatch(runPickerSource, /clearBinaryDraft|discardDraftArtifact/);
  // `initialAlbumId` only reseeds the album selector, which is local UI state.
  assert.equal((runPickerSource.match(/setBinaryAlbumId\(/g) ?? []).length, 1);
});

test('35. every close path of the unified host converges on ONE authority', () => {
  // X, backdrop and the Android hardware back all reach the same `requestClose`
  // -> `onRequestClose`. There is no second, contradictory door: ActionSheet
  // exposes no iOS interactive-gesture dismissal, so a swipe cannot transition.
  assert.match(actionSheet, /const requestClose = \(\) => \{\s*if \(!closeDisabled\) onRequestClose\(\);\s*\};/);
  assert.match(actionSheet, /onPress=\{requestClose\} disabled=\{closeDisabled\}/);
  assert.match(actionSheet, /onPress=\{handleBackdropPress\}/);
  assert.match(actionSheet, /onRequestClose=\{requestClose\}/);
  assert.match(actionSheet, /const handleBackdropPress = \(\) => \{[\s\S]*?requestClose\(\);\s*\};/);
  const actionSheetCode = stripComments(actionSheet);
  assert.doesNotMatch(actionSheetCode, /Swipeable|panGesture|GestureDetector|presentationStyle|pageSheet|onSwipeComplete/);
  // ONE host, ONE close handler. Closing can never open the Review twice and can
  // never cancel and advance at the same time.
  assert.equal((hostForm.match(/onRequestClose=/g) ?? []).length, 1);
  assert.match(hostForm, /onRequestClose=\{handleSourceBinaryRequestClose\}/);
  assert.doesNotMatch(stripComments(hostForm), /setSheet\('binary'\)/);
});

test('36. the Review keeps its draft on every close path while the engine owns it', () => {
  // Same single authority (X / backdrop / Android back) and a close policy that
  // varies per content: only an IDLE binary may be abandoned, and a submitting
  // one cannot be discarded from any affordance.
  assert.match(hostForm, /closeDisabled=\{sheet === 'binary' && \(active \|\| accepting\)\}/);
  assert.match(sourceBinaryClosePolicy, /if \(sheet === 'binary' && !active && !accepting\) \{/);
  // Exactly one door into closeReview from the host: no unguarded variant.
  assert.equal((sourceBinaryClosePolicy.match(/closeReview\(\)/g) ?? []).length, 1);
  // closeReview names its reason, so an abandoned draft is always attributable.
  assert.match(component, /const clearBinaryDraft = useCallback\(\(reason: BinaryDraftClearReason\) => \{/);
  for (const reason of ['accepted', 'completed', 'review_close', 'focus_lost', 'rerecord']) {
    assert.ok(component.includes(`clearBinaryDraft('${reason}')`), reason);
  }
});

// ---------------------------------------------------------------------------
// 37-40: ONE STABLE NATIVE MODAL HOST (source|binary)
// ---------------------------------------------------------------------------
//
// The demonstrated root cause of "the picked video never reaches the Review"
// was a dismiss/present race between two separate native Modal hosts and the
// native gallery picker. The contract under test is therefore structural, not
// behavioural: one stable host, content transitions instead of presentations,
// and no timer and no dismissal callback standing in for a native signal.

test('37. source and binary share ONE native modal host, and it is the old dual-host topology that is gone', () => {
  const code = stripComments(component);
  assert.equal((code.match(/visible=\{sheet === 'source' \|\| sheet === 'binary'\}/g) ?? []).length, 1);
  // Neither host may come back: two native Modals is exactly what raced.
  assert.equal((code.match(/visible=\{sheet === 'source'\}/g) ?? []).length, 0);
  assert.equal((code.match(/visible=\{sheet === 'binary'\}/g) ?? []).length, 0);
});

test('38. source -> binary is a CONTENT transition of the same host', () => {
  const code = stripComments(hostForm);
  // Two content branches behind one presentation.
  assert.match(code, /\{sheet === 'binary' \? \(/);
  assert.match(code, /title=\{sheet === 'binary' \? 'Revisar recuerdo' : 'Elegir contenido'\}/);
  assert.match(code, /size=\{sheet === 'binary' \? 'scrollable-content' : 'content'\}/);
  assert.match(code, /keyboardAware=\{sheet === 'binary'\}/);
  assert.match(code, /footer=\{sheet === 'binary' \? \(/);
  // The transition itself is the plain setSheet('binary') content change, and it
  // runs the source's CLOSE logic zero times: no intermediate sheet, no
  // unmount, no dismissal callback between the two contents.
  assert.match(runPickerSource, /setBinaryDraft\(draft\);[\s\S]{0,200}setSheet\('binary'\);/);
  assert.doesNotMatch(runPickerSource, /closeReview|closeCreate|discardDraftArtifact/);
});

test('39. gallery image and gallery video reach the Review through that same host and that same submit', () => {
  // One picker for both kinds: neither kind has a private presentation path.
  assert.match(picker, /'images'/);
  assert.match(picker, /'videos'/);
  assert.match(picker, /asset\.type === 'image'/);
  assert.match(picker, /asset\.type === 'video'/);
  // Both kinds resolve to ONE binary draft shape and one Review primitive; the
  // Review only chooses a player by MIME, it never by source.
  assert.match(stripComments(picker), /export async function pickMemoryMedia/);
  assert.match(mediaReview, /const kind = draft\.artifact\.mimeType\.startsWith\('image\/'\)/);
  assert.doesNotMatch(stripComments(mediaReview), /draft\.source ===/);
  // ONE Guardar entry, ONE createBinaryMemory call site, no source/kind branch.
  assert.equal((stripComments(component).match(/const submitBinary = useCallback/g) ?? []).length, 1);
  assert.equal((stripComments(component).match(/service\.createBinaryMemory\(/g) ?? []).length, 1);
});

test('40. the host has no timer, no opacity/zIndex trick and no navigation escape', () => {
  const code = stripComments(component);
  assert.doesNotMatch(code + stripComments(mediaReview), /setTimeout|setInterval|requestAnimationFrame|InteractionManager/);
  assert.doesNotMatch(code, /opacity:\s*0|zIndex:\s*9999|elevation:\s*100/);
  assert.doesNotMatch(code, /router\.(push|replace)|navigation\.(navigate|goBack)/);
  // Visibility is the presentation contract, full stop.
  assert.match(hostForm, /visible=\{sheet === 'source' \|\| sheet === 'binary'\}/);
});

console.log(`\nHOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_RESULT pass=${passed} fail=${failed}`);
if (failed > 0) {
  process.exitCode = 1;
  console.error('HOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_TESTS=FAIL');
} else {
  console.log('HOMECLOUD_4C1_1_MEMORY_CREATE_RECOVERY_TESTS=PASS');
}
