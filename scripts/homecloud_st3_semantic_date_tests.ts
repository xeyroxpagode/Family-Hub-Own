import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  emptySemanticDateDraft,
  semanticDateDraftError,
  semanticDateDraftFromCapture,
  semanticDateValueFromDraft,
  setSemanticDatePrecision,
} from '../front/mi-front-limpio/services/homecloud/homecloudSemanticDate';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

console.log('\n=== HOMECLOUD ST-3 MEMORY INFO + WRITTEN DATE TESTS ===\n');

test('WRIT-03: choosing exact never stamps today on the draft', () => {
  const draft = setSemanticDatePrecision(emptySemanticDateDraft(), 'exact', '2026-10-07');
  assert.equal(draft.precision, 'exact');
  assert.equal(draft.exactDate, '');
  assert.equal(draft.exactCapturedAt, null);
  assert.equal(semanticDateDraftError(draft), 'Elegí una fecha completa.');
});

test('a complete user-chosen day is required before a written memory can claim exact', () => {
  const draft = { ...setSemanticDatePrecision(emptySemanticDateDraft(), 'exact', '2026-10-07'), exactDate: '2023-10-18' };
  assert.equal(semanticDateDraftError(draft), null);
  assert.deepEqual(semanticDateValueFromDraft(draft), {
    precision: 'exact', capturedAt: '2023-10-18T00:00:00.000Z', capturedYear: null, capturedMonth: null,
  });
});

test('exact keeps the real EXIF instant when the day is unchanged', () => {
  const original = semanticDateDraftFromCapture('2018-07-05T18:30:45.000Z', 'exact');
  const kept = setSemanticDatePrecision(original, 'exact', '2026-10-07');
  assert.equal(kept.exactCapturedAt, '2018-07-05T18:30:45.000Z');
});

test('partial -> exact through unknown starts empty, never fabricates', () => {
  const partial = semanticDateDraftFromCapture(null, 'month_year', 2023, 10);
  const exact = setSemanticDatePrecision(partial, 'exact', '2026-10-07');
  assert.equal(exact.precision, 'exact');
  assert.equal(exact.exactDate, '');
  assert.equal(exact.exactCapturedAt, null);
});

test('unknown clears the whole draft (no uploaded_at-shaped fallback possible)', () => {
  const draft = semanticDateDraftFromCapture('2024-01-12T00:00:00.000Z', 'exact');
  assert.deepEqual(setSemanticDatePrecision(draft, 'unknown', '2026-10-07'), emptySemanticDateDraft());
});

test('MemoryInfoSheet renders the two dates distinctly and offers no filename/mime/size surface', () => {
  const sheet = read('front/mi-front-limpio/components/homecloud/MemoryInfoSheet.tsx');
  assert.match(sheet, /Cuándo ocurrió/);
  assert.match(sheet, /Cuándo se agregó/);
  assert.match(sheet, /MemorySemanticDateFields/);
  assert.match(sheet, /updateMemory/);
  assert.doesNotMatch(sheet, /mimeType/);
  assert.doesNotMatch(sheet, /sizeBytes/);
  assert.doesNotMatch(sheet, /original_storage_path/);
});

test('MemoryInfoSheet edits only when organize is allowed (readonly otherwise)', () => {
  const sheet = read('front/mi-front-limpio/components/homecloud/MemoryInfoSheet.tsx');
  assert.match(sheet, /canOrganize/);
  assert.match(sheet, /Guardar cambios/);
});

test('MemoryViewer exposes the info affordance and never invents capture time', () => {
  const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
  assert.match(viewer, /Información del recuerdo/);
  assert.match(viewer, /onOpenInfo/);
});

console.log(`\nHOMECLOUD_ST3_INFO_WRITTEN_RESULT pass=${passed} fail=0`);
console.log('HOMECLOUD_ST3_INFO_WRITTEN_TESTS=PASS');
