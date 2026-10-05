/**
 * HomeCloud Files — CANONICAL FILE ACTION GRAMMAR.
 *
 * One ordered declaration owns which actions a File has and what each one needs.
 * The per-File action host renders what this resolves to, so there is exactly
 * ONE place where a File operation is named, ordered and capability-gated.
 *
 * SEAMS. `Abrir` and `Mover a la papelera` are declared here, in their canonical
 * position, and they are NOT rendered: they have no backend, no persistence and
 * no behaviour in this slice. Declaring them here is what makes the later
 * addition a one-line change plus a handler, instead of a redesign of the action
 * surface — and marking them unimplemented is what keeps a fake disabled row
 * from ever being painted for an action that cannot work.
 *
 * FILES CORE — `Favorito` is no longer a seam. It is the ONE stateful action in
 * the grammar: its label states the intent the tap will perform, so the row
 * always reads `Quitar de favoritos` on a File that already is one and
 * `Agregar a favoritos` on one that is not. It needs only `view`, because a
 * personal favorite is a retrieval preference of one person, not organization of
 * the Household library.
 */

/** `view` = the member may read this File; `organize` = may change where it lives. */
export type HomeCloudFileActionRequirement = 'view' | 'organize' | 'delete';

/**
 * The File state a stateful action reads to name itself. A Favorite is the only
 * one in Files V1, and it is read from the CURRENT File the host was given, so
 * the label can never describe a stale copy of the File.
 */
export interface HomeCloudFileActionState {
  readonly isFavorite: boolean;
}

export type HomeCloudFileActionId =
  | 'info'
  | 'rename'
  | 'move'
  | 'download'
  | 'share'
  | 'favorite'
  | 'open'
  | 'trash';

export interface HomeCloudFileActionDefinition {
  readonly id: HomeCloudFileActionId;
  readonly label: string;
  readonly intent: 'primary' | 'secondary' | 'danger';
  readonly requires: HomeCloudFileActionRequirement;
  /**
   * Whether this action has real behaviour now. A seam is declared but not
   * implemented, and an unimplemented action is never offered.
   */
  readonly implemented: boolean;
  /**
   * The key of `HomeCloudFileActionState` this action's label depends on. When
   * the File currently satisfies it, `activeLabel` is rendered instead of
   * `label`. Absent means the action is stateless.
   */
  readonly stateKey?: keyof HomeCloudFileActionState;
  /** Label to render while `stateKey` holds. Never shown without a decided state. */
  readonly activeLabel?: string;
}

export const HOMECLOUD_FILE_ACTION_GRAMMAR: readonly HomeCloudFileActionDefinition[] = [
  { id: 'info', label: 'Información', intent: 'primary', requires: 'view', implemented: true },
  { id: 'rename', label: 'Renombrar', intent: 'secondary', requires: 'organize', implemented: true },
  { id: 'move', label: 'Mover', intent: 'secondary', requires: 'organize', implemented: true },
  { id: 'download', label: 'Guardar una copia', intent: 'secondary', requires: 'view', implemented: true },
  { id: 'share', label: 'Compartir', intent: 'secondary', requires: 'view', implemented: true },
  { id: 'favorite', label: 'Agregar a favoritos', activeLabel: 'Quitar de favoritos', stateKey: 'isFavorite', intent: 'secondary', requires: 'view', implemented: true },
  // ── EXTENSION SEAMS ── declared and ordered, never rendered ──
  { id: 'open', label: 'Abrir', intent: 'secondary', requires: 'view', implemented: false },
  { id: 'trash', label: 'Mover a la papelera', intent: 'danger', requires: 'delete', implemented: false },
];

export interface HomeCloudFileActionPermissions {
  readonly view: boolean;
  readonly organize: boolean;
  readonly delete: boolean;
}

export interface HomeCloudFileAction extends HomeCloudFileActionDefinition {
  /**
   * Whether the member may perform it. False keeps the row present but disabled
   * with its reason already stated, which is DENY-SAFE and never silent.
   */
  readonly available: boolean;
}

/**
 * The actions this File actually offers, in canonical order. Unimplemented seams
 * are filtered out here — once, for every consumer — so no caller can render one.
 *
 * `state` is the CURRENT File state, and it only renames a stateful action: it
 * never decides whether an action is offered, so a Favorite label can never
 * change what the member is allowed to do.
 */
export function resolveFileActions(permissions: HomeCloudFileActionPermissions, state?: HomeCloudFileActionState): HomeCloudFileAction[] {
  return HOMECLOUD_FILE_ACTION_GRAMMAR
    .filter((action) => action.implemented)
    .map((action) => ({
      ...action,
      label: action.stateKey && state?.[action.stateKey] === true && action.activeLabel
        ? action.activeLabel
        : action.label,
      available: permissions[action.requires] === true,
    }));
}

/** The declared-but-unimplemented ids, for the seam assertions. */
export const HOMECLOUD_FILE_ACTION_SEAMS: readonly HomeCloudFileActionId[] =
  HOMECLOUD_FILE_ACTION_GRAMMAR.filter((action) => !action.implemented).map((action) => action.id);

// ═══════════════════════════════════════════════════════════════════════════
// ACTION-SHEET REACHABILITY — the layout policy the File action sheet depends on
// ═══════════════════════════════════════════════════════════════════════════
/**
 * WHY THIS EXISTS.
 *
 * Device QA found the Favorite unreachable on a real phone: it is the SIXTH row of
 * a sheet whose content container was a bounded, NON-scrollable box, so on a short
 * or notched viewport the last rows were simply clipped off. No error, no disabled
 * control — the action was absent.
 *
 * The correct fix is structural: the File action sheet must SCROLL. That is a
 * one-property change in the host (`size="scrollable-content"` plus a scroll
 * container). What a source assertion cannot prove on its own is whether the
 * content really does overflow at the viewports the audit named, so the overflow
 * itself is DECIDED here, from the real design tokens, and is directly testable
 * without a device.
 *
 * It is a POLICY, not a layout engine: the numbers are the tokens the sheet and
 * the buttons already use (`spacing`, `componentSizes.primaryButtonHeight`,
 * `typography`, `touchTargets`), so the function cannot silently disagree with the
 * styles it reasons about unless those styles change too. What it does NOT do is
 * claim to replace what a real device renders — a component-level render proves
 * the scroll container is what the host actually mounts.
 */
export const FILE_ACTION_SHEET_LAYOUT = {
  /** `ActionSheet` gives a short sheet 90 % of the window, minus the top inset. */
  sheetHeightRatio: 0.9,
  /** …but never less than this, so the sheet is never a sliver on a small phone. */
  minSheetHeightDp: 360,
  /** `paddingTop: spacing[3]` plus the drag handle and its `marginBottom`. */
  chromeTopDp: 12 + 4 + 12,
  /** The header row: `max(touchTargets.normal, title2 line height)` + `spacing[4]`. */
  headerBaseDp: 44,
  headerLineHeightDp: 30,
  headerGapDp: 16,
  /** `paddingBottom: max(insets.bottom, spacing[4])` with a zero bottom inset. */
  sheetBottomPaddingDp: 16,
  /** `AppButton` `size="md"`: `max(primaryButtonHeight, body line + padding)`. */
  actionRowMinHeightDp: 52,
  actionRowTextLineHeightDp: 23,
  actionRowVerticalChromeDp: 18,
  /** `styles.list` gap is `spacing[3]`. */
  rowGapDp: 12,
  /** The folder caption the host renders above the actions (`typography.caption`). */
  captionLineHeightDp: 18,
  /** `styles.list` `paddingBottom: spacing[2]`. */
  listPaddingBottomDp: 8,
} as const;

export interface FileActionSheetLayoutInput {
  /** `useWindowDimensions().height`, in dp. */
  readonly viewportHeightDp: number;
  /** `useSafeAreaInsets().top`, in dp — the notch / status bar. */
  readonly insetTopDp: number;
  /** `useSafeAreaInsets().bottom`, in dp — the gesture bar / home indicator. */
  readonly insetBottomDp: number;
  /** The platform font scale the member has chosen. */
  readonly fontScale: number;
  /** How many action rows the grammar actually rendered. */
  readonly actionCount: number;
  /** Whether the folder caption is rendered above them. */
  readonly withCaption?: boolean;
  /** Whether the sheet carries a footer CTA (the Info view always does). */
  readonly withFooter?: boolean;
}

export interface FileActionSheetLayoutPolicy {
  /** How tall the sheet is allowed to be, after the top inset. */
  readonly sheetHeightDp: number;
  /** How tall the scrolling/clipping content box inside it is. */
  readonly contentBoxDp: number;
  /** How tall the actions actually want to be at this font scale. */
  readonly intrinsicContentDp: number;
  /** True when the intrinsic content does NOT fit: the box must scroll. */
  readonly overflows: boolean;
  /** How many dp are clipped away when the box does NOT scroll. */
  readonly clippedDp: number;
}

/**
 * Decide whether the File action sheet's content overflows its box.
 *
 * `overflows === true` is the whole point: it is the condition under which a
 * bounded, non-scrollable container silently hides the LAST rows, which is exactly
 * how the Favorite became unreachable.
 */
export function fileActionSheetLayoutPolicy(input: FileActionSheetLayoutInput): FileActionSheetLayoutPolicy {
  const L = FILE_ACTION_SHEET_LAYOUT;
  const fontScale = input.fontScale > 0 ? input.fontScale : 1;
  const sheetHeightDp = Math.max(L.minSheetHeightDp, Math.round(input.viewportHeightDp * L.sheetHeightRatio) - input.insetTopDp);
  const headerDp = Math.max(L.headerBaseDp, Math.round(L.headerLineHeightDp * fontScale)) + L.headerGapDp;
  const bottomDp = Math.max(input.insetBottomDp, L.sheetBottomPaddingDp);
  const contentBoxDp = Math.max(0, sheetHeightDp - L.chromeTopDp - headerDp - bottomDp);
  const rowDp = Math.max(L.actionRowMinHeightDp, Math.round(L.actionRowTextLineHeightDp * fontScale) + L.actionRowVerticalChromeDp);
  let parts = input.actionCount * rowDp + Math.max(0, input.actionCount - 1) * L.rowGapDp + L.listPaddingBottomDp;
  if (input.withCaption !== false) parts += Math.round(L.captionLineHeightDp * fontScale) + L.rowGapDp;
  if (input.withFooter === true) parts += 1; // a footer is pinned OUTSIDE the content box
  const intrinsicContentDp = parts;
  return {
    sheetHeightDp,
    contentBoxDp,
    intrinsicContentDp,
    overflows: intrinsicContentDp > contentBoxDp,
    clippedDp: Math.max(0, intrinsicContentDp - contentBoxDp),
  };
}

/** The rows `resolveFileActions` renders for a viewer who may organize everything. */
export const FILE_ACTION_RENDERED_ROW_COUNT = HOMECLOUD_FILE_ACTION_GRAMMAR.filter((action) => action.implemented).length;

/** The full vocabulary of a File action, so a handler cannot be attached to nothing. */
export type HomeCloudFileActionHandlerId = HomeCloudFileActionId;
