/**
 * HOMePLUS Finance V1.1 — Stage 7A UI System Foundation.
 *
 * Finance-scoped interaction tokens. Every value maps onto the canonical app
 * theme authority (constants/theme.ts via useAppTheme). No raw colors here;
 * components resolve dynamic Light/Dark colors through useAppTheme.
 *
 * Conceptual rhythm (spec ranges, snapped to canonical spacing tokens):
 * - title -> content ......... 12 (spacing[3])
 * - last content -> action ... 8  (spacing[2])
 * - section -> next section .. 28 (spacing[7])
 * - flat row min height ...... 52 (touchTargets.normal + padding)
 */

export const FINANCE_ROW_MIN_HEIGHT = 52;

export const FINANCE_UTILITY_ROW_MIN_HEIGHT = 44;

export const FINANCE_HIT_TARGET = 44;

export const FINANCE_ICON_BOX = 40;

export const FINANCE_ICON_BOX_SMALL = 32;

export const FINANCE_ACTION_ICON_SIZE = 20;

export const FINANCE_CHEVRON_SIZE = 18;

export const FINANCE_SMALL_ICON_SIZE = 16;

/** Inset for inset dividers inside flat rows (icon box + row gap). */
export const FINANCE_ROW_DIVIDER_INSET = 52;

export const financeSpacing = {
  /** Screen horizontal inset. */
  screenInset: 16,
  /** Gap between sections (section -> next section). */
  sectionGap: 28,
  /** Gap between section title and its content. */
  titleContentGap: 12,
  /** Gap between last content and the section action footer. */
  contentActionGap: 8,
  /** Gap between trailing boundary and next section handled by parent. */
  boundaryGap: 12,
  /** Vertical rhythm between form fields. */
  formFieldGap: 16,
  /** Gap between logical blocks inside a sheet. */
  sheetSectionGap: 16,
  /** Gap inside footers / button rows. */
  footerGap: 12,
  /** Horizontal padding inside tonal/grouped surfaces. */
  surfaceInset: 16,
} as const;

export type FinanceTypographyRole =
  | 'screenTitle'
  | 'sectionTitle'
  | 'primaryValue'
  | 'rowTitle'
  | 'rowSubtitle'
  | 'metadataLabel'
  | 'metadataValue'
  | 'helper'
  | 'actionLink'
  | 'periodLabel';

/**
 * Maps each Finance typographic role to a canonical theme variant.
 * Weight/tone are applied at the call site (see components below).
 */
export const financeTypographyRoles: Record<FinanceTypographyRole, string> = {
  screenTitle: 'title1',
  sectionTitle: 'title3',
  primaryValue: 'title1',
  rowTitle: 'bodySmall',
  rowSubtitle: 'caption',
  metadataLabel: 'caption',
  metadataValue: 'bodySmall',
  helper: 'caption',
  actionLink: 'bodySmall',
  periodLabel: 'bodySmall',
} as const;
