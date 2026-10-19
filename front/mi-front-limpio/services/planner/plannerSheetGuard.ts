/**
 * Planner V1 — Phase 1 shared sheet guard foundation.
 *
 * Purpose (frozen by PLANNER FIGMA TOTAL FREEZE V1.1 §23.7 / §52.5 and the
 * Phase 1 execution directive):
 * - Pure, React-free decision logic for sheet dismissal and the dirty guard.
 * - `dirty` must be a DERIVATION over a normalized opening snapshot, never an
 *   interaction event flag.
 * - The guard REPLACES the sheet body; while asking, X / scrim / back never
 *   discard — only `Descartar` destroys.
 * - Drag dismissal needs explicit, testable thresholds (distance + velocity).
 *
 * Out of scope:
 * - Rendering (belongs to PlannerSheetHost / PlannerSheetGuardView).
 * - Form state ownership (each form builds its own snapshot).
 */

// ---------------------------------------------------------------------------
// 1. Close attempt resolution
// ---------------------------------------------------------------------------

export type PlannerSheetCloseDecision = 'close' | 'ask' | 'leave_ask' | 'blocked';

export type PlannerSheetCloseAttemptInput = {
  /** The sheet is currently showing the "¿Descartar los cambios?" question. */
  readonly asking: boolean;
  /** Derived dirty state: normalized draft differs from the opening snapshot. */
  readonly dirty: boolean;
  /** A mutation is in flight; dismissal is blocked entirely. */
  readonly isSubmitting: boolean;
};

/**
 * Resolve any close attempt (X, backdrop, Android back, drag release, form
 * cancel) against the guard contract:
 * - submitting always blocks;
 * - while asking, every non-destructive exit leaves the question (Figma §23.7.3:
 *   "Escape / scrim / X nunca descartan");
 * - a dirty sheet enters the question instead of closing;
 * - a clean sheet closes.
 */
export function resolveCloseAttempt(input: PlannerSheetCloseAttemptInput): PlannerSheetCloseDecision {
  if (input.isSubmitting) return 'blocked';
  if (input.asking) return 'leave_ask';
  if (input.dirty) return 'ask';
  return 'close';
}

// ---------------------------------------------------------------------------
// 2. Drag dismissal thresholds
// ---------------------------------------------------------------------------

export type PlannerSheetDragDecision = 'dismiss' | 'settle';

export type PlannerSheetDragInput = {
  /** Downward travel of the panel in px (only dy > 0 counts). */
  readonly dy: number;
  /** Y velocity in px/ms at release (positive = downward). */
  readonly vy: number;
  /** Measured panel height in px. */
  readonly panelHeight: number;
};

/** Minimum travel before velocity alone can dismiss (px). */
const DRAG_MIN_TRAVEL_FOR_VELOCITY = 24;
/** Velocity that dismisses on its own when travel passed the minimum (px/ms). */
const DRAG_DISMISS_VELOCITY = 0.55;
/** Travel that dismisses on its own regardless of velocity (fraction of panel). */
const DRAG_DISMISS_TRAVEL_FRACTION = 0.22;
/** Absolute minimum distance threshold (px). */
const DRAG_DISMISS_MIN_DISTANCE = 88;

/**
 * Decide what a released drag does. Distance threshold scales with the panel
 * (a short menu should not need a full-screen swipe), velocity carries a fast
 * flick even with a short travel, and upward drags never dismiss.
 */
export function resolveDragDismiss(input: PlannerSheetDragInput): PlannerSheetDragDecision {
  const { dy, vy, panelHeight } = input;
  if (dy <= 0) return 'settle';

  const distanceThreshold = Math.max(
    DRAG_DISMISS_MIN_DISTANCE,
    panelHeight * DRAG_DISMISS_TRAVEL_FRACTION,
  );
  if (dy >= distanceThreshold) return 'dismiss';
  if (dy >= DRAG_MIN_TRAVEL_FOR_VELOCITY && vy >= DRAG_DISMISS_VELOCITY) return 'dismiss';
  return 'settle';
}

// ---------------------------------------------------------------------------
// 2b. Two-detent settling
// ---------------------------------------------------------------------------

export type PlannerSheetDetent = 'initial' | 'expanded';

/**
 * Select the resting detent after a handle drag. The host owns rendering;
 * keeping this decision pure makes velocity and midpoint behaviour testable.
 */
export function resolveSheetDetent(input: {
  readonly currentHeight: number;
  readonly initialHeight: number;
  readonly expandedHeight: number;
  /** Gesture velocity in px/ms. Negative is upward. */
  readonly vy: number;
}): PlannerSheetDetent {
  const { currentHeight, initialHeight, expandedHeight, vy } = input;
  if (expandedHeight <= initialHeight + 1) return 'initial';
  if (vy <= -0.25) return 'expanded';
  if (vy >= 0.25) return 'initial';
  const midpoint = initialHeight + ((expandedHeight - initialHeight) / 2);
  return currentHeight >= midpoint ? 'expanded' : 'initial';
}

/**
 * Keep an adaptive initial form height useful but visibly below its expanded
 * detent. Intrinsic ScrollView content already includes footer clearance, so
 * allowing it to consume the whole safe viewport would make the grabber a
 * no-op rather than a two-state control.
 */
export function resolveInitialSheetDetent(input: {
  readonly contentHeight: number;
  readonly expandedHeight: number;
  readonly minimumHeight: number;
  readonly chromeAndFooterHeight: number;
  readonly maximumInitialFraction: number;
}): number {
  const { contentHeight, expandedHeight, minimumHeight, chromeAndFooterHeight, maximumInitialFraction } = input;
  // Below one touch-target of travel there is no honest second detent.
  if (expandedHeight <= minimumHeight + 44) return expandedHeight;
  const initialCeiling = Math.max(minimumHeight, Math.round(expandedHeight * maximumInitialFraction));
  return Math.min(
    expandedHeight,
    initialCeiling,
    Math.max(minimumHeight, Math.round(contentHeight + chromeAndFooterHeight)),
  );
}

// ---------------------------------------------------------------------------
// 3. Guard copy (frozen)
// ---------------------------------------------------------------------------

export const PLANNER_SHEET_GUARD_COPY = {
  title: '¿Descartar los cambios?',
  body: 'Perdés lo que escribiste y no se guardó nada.',
  keepEditing: 'Seguir editando',
  discard: 'Descartar',
} as const;

// ---------------------------------------------------------------------------
// 4. Draft normalization + comparators
// ---------------------------------------------------------------------------

/** Normalize free text for comparison: trim; nullish equals empty. */
export function normalizeDraftText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Normalize an id list for comparison: drop empties, sort (order irrelevant). */
export function normalizeDraftIdList(value: readonly string[] | null | undefined): readonly string[] {
  if (!value) return [];
  return [...value].filter((id) => Boolean(id)).sort();
}

/** Normalize a checklist: trim items, drop empty texts, keep order (order matters). */
export function normalizeDraftChecklist(
  items: ReadonlyArray<{ text: string; checked: boolean }> | null | undefined,
): ReadonlyArray<{ readonly text: string; readonly checked: boolean }> {
  if (!items) return [];
  return items
    .map((item) => ({ text: (item.text ?? '').trim(), checked: Boolean(item.checked) }))
    .filter((item) => item.text.length > 0);
}

export type PlannerTaskDraftSnapshot = {
  readonly title: string;
  readonly description: string;
  readonly tipoId: string;
  readonly priority: string;
  readonly category: string;
  readonly dueDate: string;
  readonly dueTime: string;
  readonly assignedMemberIds: readonly string[];
  readonly assignmentMode: string;
  readonly requiresVerification: boolean;
  readonly checklist: ReadonlyArray<{ readonly text: string; readonly checked: boolean }>;
  readonly estimatedDuration: number | null;
  readonly planClassification: string;
  readonly goalId: string | null;
};

/**
 * Build the normalized opening snapshot for the Task form. Field semantics
 * follow §23.7.2: data fields in, UI-ephemeral state (touched flags, open
 * pickers, focus, scroll) out.
 */
export function buildTaskDraftSnapshot(input: {
  title: string;
  description: string;
  tipoId: string;
  priority: string;
  category: string;
  dueDate: string;
  dueTime: string;
  assignedMemberIds: readonly string[];
  assignmentMode: string;
  requiresVerification: boolean;
  checklist: ReadonlyArray<{ text: string; checked: boolean }>;
  estimatedDuration: number | null;
  planClassification: string;
  goalId: string | null;
}): PlannerTaskDraftSnapshot {
  return {
    title: normalizeDraftText(input.title),
    description: normalizeDraftText(input.description),
    tipoId: input.tipoId,
    priority: input.priority,
    category: normalizeDraftText(input.category),
    dueDate: normalizeDraftText(input.dueDate),
    dueTime: normalizeDraftText(input.dueTime),
    assignedMemberIds: normalizeDraftIdList(input.assignedMemberIds),
    assignmentMode: input.assignmentMode,
    requiresVerification: Boolean(input.requiresVerification),
    checklist: normalizeDraftChecklist(input.checklist),
    estimatedDuration: input.estimatedDuration ?? null,
    planClassification: input.planClassification,
    goalId: input.goalId ?? null,
  };
}

export function sameTaskDraft(a: PlannerTaskDraftSnapshot, b: PlannerTaskDraftSnapshot): boolean {
  return (
    a.title === b.title
    && a.description === b.description
    && a.tipoId === b.tipoId
    && a.priority === b.priority
    && a.category === b.category
    && a.dueDate === b.dueDate
    && a.dueTime === b.dueTime
    && a.assignedMemberIds.length === b.assignedMemberIds.length
    && a.assignedMemberIds.every((id, index) => id === b.assignedMemberIds[index])
    && a.assignmentMode === b.assignmentMode
    && a.requiresVerification === b.requiresVerification
    && a.checklist.length === b.checklist.length
    && a.checklist.every(
      (item, index) =>
        item.text === b.checklist[index].text && item.checked === b.checklist[index].checked,
    )
    && a.estimatedDuration === b.estimatedDuration
    && a.planClassification === b.planClassification
    && a.goalId === b.goalId
  );
}

export type PlannerEventDraftSnapshot = {
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly allDay: boolean;
  readonly locationName: string;
  readonly recurrence: string;
  readonly planClassification: string;
};

export function buildEventDraftSnapshot(input: {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  locationName: string;
  recurrence: string;
  planClassification: string;
}): PlannerEventDraftSnapshot {
  return {
    title: normalizeDraftText(input.title),
    description: normalizeDraftText(input.description),
    date: normalizeDraftText(input.date),
    startTime: normalizeDraftText(input.startTime),
    endTime: normalizeDraftText(input.endTime),
    allDay: Boolean(input.allDay),
    locationName: normalizeDraftText(input.locationName),
    recurrence: input.recurrence,
    planClassification: input.planClassification,
  };
}

export function sameEventDraft(a: PlannerEventDraftSnapshot, b: PlannerEventDraftSnapshot): boolean {
  return (
    a.title === b.title
    && a.description === b.description
    && a.date === b.date
    && a.startTime === b.startTime
    && a.endTime === b.endTime
    && a.allDay === b.allDay
    && a.locationName === b.locationName
    && a.recurrence === b.recurrence
    && a.planClassification === b.planClassification
  );
}

export type PlannerTitleScopeDraftSnapshot = {
  readonly title: string;
  readonly scope: string;
};

export function buildTitleScopeDraftSnapshot(input: {
  title: string;
  scope: string;
}): PlannerTitleScopeDraftSnapshot {
  return {
    title: normalizeDraftText(input.title),
    scope: input.scope,
  };
}

export function sameTitleScopeDraft(
  a: PlannerTitleScopeDraftSnapshot,
  b: PlannerTitleScopeDraftSnapshot,
): boolean {
  return a.title === b.title && a.scope === b.scope;
}

export type PlannerGoalDraftSnapshot = {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly visibility: string;
  readonly targetValue: string;
  readonly currentValue: string;
  readonly unit: string;
  readonly startsAt: string;
  readonly endsAt: string;
};

export function buildGoalDraftSnapshot(input: {
  title: string;
  description: string;
  category: string;
  visibility: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  startsAt: string;
  endsAt: string;
}): PlannerGoalDraftSnapshot {
  return {
    title: normalizeDraftText(input.title),
    description: normalizeDraftText(input.description),
    category: input.category,
    visibility: input.visibility,
    targetValue: normalizeDraftText(input.targetValue),
    currentValue: normalizeDraftText(input.currentValue),
    unit: normalizeDraftText(input.unit),
    startsAt: normalizeDraftText(input.startsAt),
    endsAt: normalizeDraftText(input.endsAt),
  };
}

export function sameGoalDraft(a: PlannerGoalDraftSnapshot, b: PlannerGoalDraftSnapshot): boolean {
  return (
    a.title === b.title
    && a.description === b.description
    && a.category === b.category
    && a.visibility === b.visibility
    && a.targetValue === b.targetValue
    && a.currentValue === b.currentValue
    && a.unit === b.unit
    && a.startsAt === b.startsAt
    && a.endsAt === b.endsAt
  );
}

export type PlannerPlanDraftSnapshot = {
  readonly objective: string;
  readonly scope: string;
  readonly finalizationKind: string;
};

export function buildPlanDraftSnapshot(input: {
  objective: string;
  scope: string;
  finalizationKind: string;
}): PlannerPlanDraftSnapshot {
  return {
    objective: normalizeDraftText(input.objective),
    scope: input.scope,
    finalizationKind: input.finalizationKind,
  };
}

export function samePlanDraft(a: PlannerPlanDraftSnapshot, b: PlannerPlanDraftSnapshot): boolean {
  return (
    a.objective === b.objective
    && a.scope === b.scope
    && a.finalizationKind === b.finalizationKind
  );
}
