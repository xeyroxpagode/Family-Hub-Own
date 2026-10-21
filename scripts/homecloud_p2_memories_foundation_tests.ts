import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  emptySemanticDateDraft,
  semanticDateDraftFromCapture,
  semanticDateValueFromDraft,
} from '../front/mi-front-limpio/services/homecloud/homecloudSemanticDate';
import {
  createMemorySelectionSession,
  enterMemorySelection,
  isMemorySelecting,
  toggleMemorySelection,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemorySelection';

/**
 * HOMECLOUD P2.0A + P2.0B FOUNDATION — resume of the interrupted P2 slice.
 *
 * WHAT IS BEHAVIOURAL HERE AND WHY
 * --------------------------------
 * The semantic-date draft/value helpers and the selection session are pure
 * values, so every claim about them is EXECUTED. The household create flow,
 * the type-selection projection and the create-menu routing genuinely live
 * in declarations (a screen, a service wrapper, JSX wiring), so those are
 * STRUCTURAL assertions and marked as such — they pin the contract the
 * interrupted agent left dirty, after it was verified by hand against the
 * frozen authorities.
 */

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const crearGrupo = read('front/mi-front-limpio/screens/CrearGrupo.tsx');
const households = read('front/mi-front-limpio/services/households.ts');
const memoriesScreen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const collectionDetail = read('front/mi-front-limpio/components/homecloud/MemoryCollectionDetailView.tsx');
const intakeValidation = read('backend/src/lib/homecloudIntakeValidation.js');

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

console.log('\n=== HOMECLOUD P2.0A + P2.0B FOUNDATION TESTS ===\n');

// ── P2.0A household post-create transition (STRUCTURAL) ──
test('[structural] create has a submit lock against double tap', () => {
  assert.match(crearGrupo, /if \(creatingRef\.current\) return;/);
  assert.match(crearGrupo, /creatingRef\.current = true;/);
  assert.match(crearGrupo, /disabled=\{loading\}/);
});
test('[structural] failure releases the lock and stays retryable', () => {
  assert.match(crearGrupo, /setErrorMessage\(error \?\? 'Error inesperado\. Intenta nuevamente\.'\)/);
  assert.match(crearGrupo, /finally \{\s+creatingRef\.current = false;/);
});
test('[structural] success refreshes the authoritative context', () => {
  assert.match(crearGrupo, /await refetchMe\(\);/);
});
test('[structural] success resets navigation to Home (Back cannot return)', () => {
  assert.match(crearGrupo, /navigation\.reset\(\{ index: 0, routes: \[\{ name: 'HomeTabs' \}\] \}\)/);
});
test('[structural] wrapper activates the new household through existing authority', () => {
  assert.match(households, /setActiveHouseholdRequest/);
  assert.match(households, /response\.me\?\.active_household\?\.id !== response\.household\.id/);
});
test('[structural] no new global household state architecture', () => {
  assert.doesNotMatch(households, /createContext|useState|useReducer|zustand|createStore/);
});

// ── P2.0B visible selected state inside Types (STRUCTURAL) ──
test('[structural] collection detail projects the shared selection by contentId', () => {
  assert.match(collectionDetail, /selected=\{selectedMemoryIds\?\.has\(memory\.id\) === true\}/);
});
test('[structural] collection detail never hardcodes selected=false', () => {
  assert.doesNotMatch(collectionDetail, /selected=\{false\}/);
});
test('[structural] screen hands the ONE selection session to the collection', () => {
  assert.match(memoriesScreen, /selectedMemoryIds=\{selection\.selectedIds\}/);
});
test('[structural] no second Type-specific selection state exists', () => {
  assert.doesNotMatch(memoriesScreen, /typeSelectedIds|selectedTypeIds|collectionSelectedIds/);
  assert.doesNotMatch(collectionDetail, /useState.*[Ss]elected/);
});
test('[structural] root and collection share the same selected grammar', () => {
  assert.match(memoriesScreen, /selected: selection\.selectedIds\.has\(memory\.id\)/);
});
test('[structural] D4 drag/range engine is reused, not rewritten', () => {
  assert.match(memoriesScreen, /applyMemoryVisualRange/);
  assert.match(memoriesScreen, /toggleMemorySelection/);
});

// ── P2.0B selection session (BEHAVIOURAL, shared engine) ──
test('toggle on/off round-trips on the shared session', () => {
  let session = createMemorySelectionSession();
  session = enterMemorySelection(session, { purpose: { kind: 'generic' }, initialContentIds: ['c1'] });
  assert.ok(isMemorySelecting(session));
  session = toggleMemorySelection(session, 'c1');
  assert.ok(!session.selectedIds.has('c1'));
  session = toggleMemorySelection(session, 'c2');
  assert.ok(session.selectedIds.has('c2'));
});

// ── ST-3 semantic partial preservation (BEHAVIOURAL, new P2 code) ──
test('month_year capture survives the draft (not collapsed to unknown)', () => {
  const draft = semanticDateDraftFromCapture(null, 'month_year', 2023, 10);
  assert.equal(draft.precision, 'month_year');
  assert.deepEqual(semanticDateValueFromDraft(draft), {
    precision: 'month_year', capturedAt: null, capturedYear: 2023, capturedMonth: 10,
  });
});
test('year capture survives the draft (no fake month)', () => {
  const draft = semanticDateDraftFromCapture(null, 'year', 1999, null);
  assert.equal(draft.precision, 'year');
  assert.deepEqual(semanticDateValueFromDraft(draft), {
    precision: 'year', capturedAt: null, capturedYear: 1999, capturedMonth: null,
  });
});
test('month_year without components stays honest (empty, not synthesized)', () => {
  const draft = semanticDateDraftFromCapture(null, 'month_year', null, null);
  assert.equal(draft.year, '');
});
test('exact still preserves the original instant (no fake midnight over real EXIF)', () => {
  const timestamp = '2018-07-05T18:30:45.000Z';
  const draft = semanticDateDraftFromCapture(timestamp, 'exact', null, null);
  assert.equal(draft.exactCapturedAt, timestamp);
  assert.deepEqual(semanticDateValueFromDraft(draft), {
    precision: 'exact', capturedAt: timestamp, capturedYear: null, capturedMonth: null,
  });
});
test('unknown capture carries nothing (no uploaded_at-shaped fallback possible)', () => {
  assert.deepEqual(semanticDateDraftFromCapture(null, 'unknown', null, null), emptySemanticDateDraft());
});

// ── Critical favorites contract guard (STRUCTURAL) ──
test('[structural] persisted/API favorite field is never is_favorite', () => {
  for (const [label, code] of [
    ['intake-validation', intakeValidation],
    ['households-wrapper', households],
    ['semantic-date', read('front/mi-front-limpio/services/homecloud/homecloudSemanticDate.ts')],
    ['memory-intake', read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx')],
  ] as const) {
    assert.doesNotMatch(code, /is_favorite/, `${label} mentions is_favorite`);
  }
});

console.log(`\nHOMECLOUD_P2_FOUNDATION_RESULT pass=${passed} fail=0`);
console.log('HOMECLOUD_P2_FOUNDATION_TESTS=PASS');
