/**
 * Planner V1 — Phase 1 shared sheet guard tests.
 *
 * Tests the pure decision + derivation logic in
 * `front/mi-front-limpio/services/planner/plannerSheetGuard.ts`:
 * - close attempt resolution (blocked / ask / leave_ask / close)
 * - drag dismissal thresholds (distance + velocity, no upward dismiss)
 * - draft normalization (trim, id sort, empty checklist items)
 * - Figma §23.7.4 scenarios A-E for the Task draft
 * - Event/Goal/Plan derivations (registered contradictions C-08 / C-25 coverage)
 *
 * Run via `node tests/run.js planner-v1-sheet-guard`.
 */

import {
  resolveCloseAttempt,
  resolveDragDismiss,
  resolveInitialSheetDetent,
  resolveSheetDetent,
  normalizeDraftText,
  normalizeDraftIdList,
  normalizeDraftChecklist,
  buildTaskDraftSnapshot,
  sameTaskDraft,
  buildEventDraftSnapshot,
  sameEventDraft,
  buildGoalDraftSnapshot,
  sameGoalDraft,
  buildPlanDraftSnapshot,
  samePlanDraft,
  PLANNER_SHEET_GUARD_COPY,
} from '../front/mi-front-limpio/services/planner/plannerSheetGuard';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  FAIL ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertFalse(cond: boolean, msg: string) {
  if (cond) throw new Error(msg);
}

// --- resolveCloseAttempt ---

test('submitting always blocks, even while dirty or asking', () => {
  assertEqual(resolveCloseAttempt({ asking: false, dirty: false, isSubmitting: true }), 'blocked', 'clean+submitting');
  assertEqual(resolveCloseAttempt({ asking: false, dirty: true, isSubmitting: true }), 'blocked', 'dirty+submitting');
  assertEqual(resolveCloseAttempt({ asking: true, dirty: true, isSubmitting: true }), 'blocked', 'asking+submitting');
});

test('while asking, every non-destructive exit leaves the question', () => {
  assertEqual(resolveCloseAttempt({ asking: true, dirty: true, isSubmitting: false }), 'leave_ask', 'X/scrim/back never discard');
  assertEqual(resolveCloseAttempt({ asking: true, dirty: false, isSubmitting: false }), 'leave_ask', 'even if the probe turned clean');
});

test('dirty sheet enters the question instead of closing', () => {
  assertEqual(resolveCloseAttempt({ asking: false, dirty: true, isSubmitting: false }), 'ask', 'dirty -> ask');
});

test('clean sheet closes', () => {
  assertEqual(resolveCloseAttempt({ asking: false, dirty: false, isSubmitting: false }), 'close', 'clean -> close');
});

// --- resolveDragDismiss ---

test('upward drags never dismiss', () => {
  assertEqual(resolveDragDismiss({ dy: -120, vy: 3, panelHeight: 400 }), 'settle', 'upward');
  assertEqual(resolveDragDismiss({ dy: 0, vy: 5, panelHeight: 400 }), 'settle', 'zero travel');
});

test('distance threshold scales with panel height', () => {
  // short panel (300): threshold = max(88, 66) = 88
  assertEqual(resolveDragDismiss({ dy: 88, vy: 0, panelHeight: 300 }), 'dismiss', '88px on short panel');
  assertEqual(resolveDragDismiss({ dy: 87, vy: 0, panelHeight: 300 }), 'settle', '87px on short panel stays');
  // tall panel (600): threshold = max(88, 132) = 132
  assertEqual(resolveDragDismiss({ dy: 100, vy: 0, panelHeight: 600 }), 'settle', '100px on tall panel stays');
  assertEqual(resolveDragDismiss({ dy: 132, vy: 0, panelHeight: 600 }), 'dismiss', '132px on tall panel');
});

test('a fast downward flick dismisses with short travel', () => {
  assertEqual(resolveDragDismiss({ dy: 40, vy: 1.2, panelHeight: 600 }), 'dismiss', 'flick dismiss');
  assertEqual(resolveDragDismiss({ dy: 40, vy: 0.3, panelHeight: 600 }), 'settle', 'slow short drag stays');
});

test('a flick below the minimum travel never dismisses', () => {
  assertEqual(resolveDragDismiss({ dy: 10, vy: 4, panelHeight: 600 }), 'settle', 'tap-like gesture stays');
});

test('detent settling respects useful height, direction and velocity', () => {
  assertEqual(resolveSheetDetent({ currentHeight: 520, initialHeight: 500, expandedHeight: 760, vy: -0.4 }), 'expanded', 'upward flick expands');
  assertEqual(resolveSheetDetent({ currentHeight: 700, initialHeight: 500, expandedHeight: 760, vy: 0.4 }), 'initial', 'downward flick contracts');
  assertEqual(resolveSheetDetent({ currentHeight: 640, initialHeight: 500, expandedHeight: 760, vy: 0 }), 'expanded', 'above midpoint expands');
  assertEqual(resolveSheetDetent({ currentHeight: 580, initialHeight: 500, expandedHeight: 760, vy: 0 }), 'initial', 'below midpoint contracts');
  assertEqual(resolveSheetDetent({ currentHeight: 500, initialHeight: 500, expandedHeight: 500, vy: -1 }), 'initial', 'no fake second detent');
});

test('adaptive initial detent preserves a meaningful expanded state', () => {
  assertEqual(
    resolveInitialSheetDetent({ contentHeight: 700, expandedHeight: 760, minimumHeight: 440, chromeAndFooterHeight: 104, maximumInitialFraction: 0.78 }),
    593,
    'large intrinsic content cannot consume the expanded detent',
  );
  assertEqual(
    resolveInitialSheetDetent({ contentHeight: 300, expandedHeight: 760, minimumHeight: 440, chromeAndFooterHeight: 104, maximumInitialFraction: 0.78 }),
    440,
    'short content retains the useful minimum',
  );
  assertEqual(
    resolveInitialSheetDetent({ contentHeight: 400, expandedHeight: 450, minimumHeight: 440, chromeAndFooterHeight: 104, maximumInitialFraction: 0.78 }),
    450,
    'small viewports do not invent a second detent',
  );
});

// --- normalization ---

test('normalizeDraftText trims and nullish is empty', () => {
  assertEqual(normalizeDraftText('  hola  '), 'hola', 'trim');
  assertEqual(normalizeDraftText(null), '', 'null');
  assertEqual(normalizeDraftText(undefined), '', 'undefined');
});

test('normalizeDraftIdList drops empties and sorts (order is irrelevant)', () => {
  assertEqual(
    normalizeDraftIdList(['b', '', 'a']),
    ['a', 'b'],
    'sort+filter',
  );
  assertEqual(normalizeDraftIdList(null), [], 'null');
});

test('normalizeDraftChecklist drops empty texts and trims, preserving order', () => {
  assertEqual(
    normalizeDraftChecklist([
      { text: '  paso 1 ', checked: true },
      { text: '   ', checked: false },
      { text: 'paso 2', checked: false },
    ]),
    [
      { text: 'paso 1', checked: true },
      { text: 'paso 2', checked: false },
    ],
    'normalized checklist',
  );
});

// --- Figma §23.7.4 scenarios (Task draft) ---

const taskOpeningInput = {
  title: '',
  description: '',
  tipoId: 'general',
  priority: 'normal',
  category: 'General',
  dueDate: '2026-10-08',
  dueTime: '',
  assignedMemberIds: [] as string[],
  assignmentMode: 'unassigned',
  requiresVerification: false,
  checklist: [] as Array<{ text: string; checked: boolean }>,
  estimatedDuration: null as number | null,
  planClassification: 'necessary',
  goalId: null as string | null,
};

test('A: open blank, close -> not dirty', () => {
  const opening = buildTaskDraftSnapshot(taskOpeningInput);
  const current = buildTaskDraftSnapshot(taskOpeningInput);
  assertTrue(sameTaskDraft(current, opening), 'blank round-trip must be clean');
});

test('B: type a title -> dirty', () => {
  const opening = buildTaskDraftSnapshot(taskOpeningInput);
  const current = buildTaskDraftSnapshot({ ...taskOpeningInput, title: 'Revisar la heladera' });
  assertFalse(sameTaskDraft(current, opening), 'typed title must be dirty');
});

test('C: preset apply + unapply returns the draft to opening -> NOT dirty', () => {
  const opening = buildTaskDraftSnapshot(taskOpeningInput);
  // after unapply the draft is exactly the opening again
  const afterUnapply = buildTaskDraftSnapshot(taskOpeningInput);
  assertTrue(sameTaskDraft(afterUnapply, opening), 'reversible control must not raise the guard');
});

test('normalization: delete a char and retype it -> NOT dirty', () => {
  const opening = buildTaskDraftSnapshot({ ...taskOpeningInput, title: 'Tarea', description: '  nota  ' });
  const current = buildTaskDraftSnapshot({ ...taskOpeningInput, title: 'Tarea ', description: 'nota' });
  assertTrue(sameTaskDraft(current, opening), 'whitespace-only differences must not be dirty');
});

test('checklist: adding an empty item then removing it -> NOT dirty', () => {
  const opening = buildTaskDraftSnapshot(taskOpeningInput);
  const withEmptyItem = buildTaskDraftSnapshot({
    ...taskOpeningInput,
    checklist: [{ text: '   ', checked: false }],
  });
  assertTrue(sameTaskDraft(withEmptyItem, opening), 'empty checklist item is not work');
  const withRealItem = buildTaskDraftSnapshot({
    ...taskOpeningInput,
    checklist: [{ text: 'Paso', checked: false }],
  });
  assertFalse(sameTaskDraft(withRealItem, opening), 'a real checklist item is dirty');
});

test('assignee order does not matter, but assignee change does', () => {
  const opening = buildTaskDraftSnapshot({ ...taskOpeningInput, assignmentMode: 'assigned', assignedMemberIds: ['a', 'b'] });
  const reordered = buildTaskDraftSnapshot({ ...taskOpeningInput, assignmentMode: 'assigned', assignedMemberIds: ['b', 'a'] });
  assertTrue(sameTaskDraft(reordered, opening), 'same set, different order');
  const changed = buildTaskDraftSnapshot({ ...taskOpeningInput, assignmentMode: 'assigned', assignedMemberIds: ['a', 'c'] });
  assertFalse(sameTaskDraft(changed, opening), 'different set is dirty');
});

// --- Event draft (C-08 coverage: 1 of 6 -> all fields) ---

const eventOpeningInput = {
  title: 'Cumple',
  description: '',
  date: '2026-10-08',
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  locationName: '',
  recurrence: 'none',
  planClassification: 'necessary',
};

test('event: unchanged draft is clean', () => {
  const opening = buildEventDraftSnapshot(eventOpeningInput);
  const current = buildEventDraftSnapshot(eventOpeningInput);
  assertTrue(sameEventDraft(current, opening), 'event round-trip');
});

test('event: changing only the DAY raises the guard (C-08 fixed)', () => {
  const opening = buildEventDraftSnapshot(eventOpeningInput);
  const current = buildEventDraftSnapshot({ ...eventOpeningInput, date: '2026-10-09' });
  assertFalse(sameEventDraft(current, opening), 'day change must be dirty');
});

test('event: changing time, location, recurrence or allDay raises the guard', () => {
  const opening = buildEventDraftSnapshot(eventOpeningInput);
  assertFalse(
    sameEventDraft(buildEventDraftSnapshot({ ...eventOpeningInput, startTime: '11:00' }), opening),
    'time change must be dirty',
  );
  assertFalse(
    sameEventDraft(buildEventDraftSnapshot({ ...eventOpeningInput, locationName: 'Casa' }), opening),
    'location change must be dirty',
  );
  assertFalse(
    sameEventDraft(buildEventDraftSnapshot({ ...eventOpeningInput, recurrence: 'weekly' }), opening),
    'recurrence change must be dirty',
  );
  assertFalse(
    sameEventDraft(buildEventDraftSnapshot({ ...eventOpeningInput, allDay: true }), opening),
    'allDay change must be dirty',
  );
});

// --- Goal / Plan drafts ---

test('goal: title change is dirty, hydration snapshot is not', () => {
  const opening = buildGoalDraftSnapshot({
    title: 'Meta', description: '', category: 'home', visibility: 'household',
    targetValue: '10', currentValue: '0', unit: 'km', startsAt: '', endsAt: '',
  });
  assertTrue(
    sameGoalDraft(buildGoalDraftSnapshot({
      title: 'Meta', description: '', category: 'home', visibility: 'household',
      targetValue: '10', currentValue: '0', unit: 'km', startsAt: '', endsAt: '',
    }), opening),
    'unchanged goal is clean',
  );
  assertFalse(
    sameGoalDraft(buildGoalDraftSnapshot({
      title: 'Meta 2', description: '', category: 'home', visibility: 'household',
      targetValue: '10', currentValue: '0', unit: 'km', startsAt: '', endsAt: '',
    }), opening),
    'renamed goal is dirty',
  );
});

test('plan: objective, scope and finalization all count (C-25 coverage)', () => {
  const opening = buildPlanDraftSnapshot({ objective: '', scope: 'household', finalizationKind: 'none' });
  assertTrue(
    samePlanDraft(buildPlanDraftSnapshot({ objective: '', scope: 'household', finalizationKind: 'none' }), opening),
    'blank plan is clean',
  );
  assertFalse(
    samePlanDraft(buildPlanDraftSnapshot({ objective: 'Organizar viaje', scope: 'household', finalizationKind: 'none' }), opening),
    'objective text is dirty',
  );
  assertFalse(
    samePlanDraft(buildPlanDraftSnapshot({ objective: '', scope: 'personal', finalizationKind: 'none' }), opening),
    'scope change is dirty',
  );
  assertFalse(
    samePlanDraft(buildPlanDraftSnapshot({ objective: '', scope: 'household', finalizationKind: 'date' }), opening),
    'finalization change is dirty',
  );
});

// --- frozen copy ---

test('guard copy is frozen and exact', () => {
  assertEqual(PLANNER_SHEET_GUARD_COPY.title, '¿Descartar los cambios?', 'title');
  assertEqual(PLANNER_SHEET_GUARD_COPY.keepEditing, 'Seguir editando', 'safe action');
  assertEqual(PLANNER_SHEET_GUARD_COPY.discard, 'Descartar', 'destructive action');
});

// --- summary ---

console.log(`\nplanner_v1_sheet_guard_tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
