/**
 * HOMePLUS Finance V1.1 — Stage 7A interaction policies (code authority).
 *
 * These maps freeze the contracts that 7B/7C/7D migrations must follow.
 * They reference the existing global ActionSheet sizes and AppButton
 * variants without modifying those app-global primitives.
 */

import type { ActionSheetProps } from '../../ui/ActionSheet';
import type { AppButtonProps } from '../../ui/AppButton';

export type FinanceSheetIntent =
  | 'SHORT_FORM'
  | 'MEDIUM_FORM'
  | 'LONG_FORM'
  | 'DETAIL'
  | 'PICKER_CATALOG'
  | 'CALENDAR'
  | 'CONFIRMATION';

type ActionSheetSize = NonNullable<ActionSheetProps['size']>;

/**
 * ActionSheet semantic sizing policy (Stage 5 sizing preserved).
 * SHORT_FORM/CONFIRMATION stay intrinsic; catalogs may claim near-full
 * space only when the space is genuinely useful. No fixed magic heights.
 */
export const FINANCE_SHEET_SIZE_POLICY: Record<FinanceSheetIntent, ActionSheetSize> = {
  SHORT_FORM: 'content',
  MEDIUM_FORM: 'scrollable-content',
  LONG_FORM: 'scrollable-content',
  DETAIL: 'scrollable-content',
  PICKER_CATALOG: 'near-full',
  CALENDAR: 'near-full',
  CONFIRMATION: 'content',
} as const;

export type FinanceButtonRank = 'PRIMARY' | 'SECONDARY' | 'GHOST' | 'DESTRUCTIVE';

/**
 * Destructive hierarchy (visual grammar). Exactly one destructive treatment:
 * AppButton variant="danger". Destructive must never appear as pink card /
 * red outline / red plain text depending on the screen.
 */
export const FINANCE_BUTTON_RANK_POLICY: Record<FinanceButtonRank, NonNullable<AppButtonProps['variant']>> = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  GHOST: 'ghost',
  DESTRUCTIVE: 'danger',
} as const;

/**
 * Disabled-state grammar: disabled text token, reduced-but-readable
 * opacity (matches InteractivePressable), no press feedback, no active
 * chevron (chevrons render in text.muted), helper copy only when useful.
 * Disabled controls must not look like random pale cards.
 */
export const FINANCE_DISABLED_POLICY = {
  opacity: 0.58,
  textToken: 'colors.text.disabled',
  chevronToken: 'colors.text.muted',
  pressFeedback: false,
} as const;

/**
 * Keyboard contract frozen for all Stage 7 forms:
 * focused input remains visible; primary CTA remains reachable;
 * keyboard open -> sheet may grow until safe max, body scrolls only if
 * required; keyboard closed -> sheet returns to natural sizing;
 * no permanent blank expansion, no body/footer clipping,
 * no nested scroll deadlock.
 */
export const FINANCE_KEYBOARD_CONTRACT = {
  focusedInputVisible: true,
  primaryCtaReachable: true,
  sheetGrowsUntilSafeMax: true,
  bodyScrollsOnlyIfRequired: true,
  returnsToNaturalSizing: true,
  noPermanentBlankExpansion: true,
  noNestedScrollDeadlock: true,
} as const;

/**
 * Accessibility baseline: icon-only actions carry labels, interactive hit
 * targets are ~44x44 where possible, selection is conveyed semantically
 * (radio/tab roles + accessibilityState, not color only), disabled
 * controls are semantically disabled, long labels ellipsize without
 * clipping core truth.
 */
export const FINANCE_A11Y_BASELINE = {
  hitTarget: 44,
  iconOnlyRequiresLabel: true,
  selectionSemantic: true,
  disabledSemantic: true,
  longLabelsEllipsize: true,
} as const;
