import type { HomeCloudMemoryListItem } from './homecloudTypes';

/**
 * HomeCloud STAGE 4B.2 — Memories Timeline grouping (pure, no React Native).
 *
 * Authority: Stage 4B.1 read model (canonical server order) + Product Truth.
 *
 * The server already returns Memories in the canonical Timeline order
 * (known semantic dates first, unknown last). This primitive NEVER re-sorts:
 * it preserves the received order and only assigns each Memory to its honest
 * semantic group. `uploadedAt` is never read here on purpose: it records
 * binary custody, not the semantic capture date.
 *
 * Grouping rules (capturePrecision is the only date authority):
 * - unknown    -> "Sin fecha" section, always LAST. No year is inferred.
 * - year       -> "Durante {year}" block. Never January, never day 1. It is
 *                forced AFTER the known-month groups of the same year.
 * - month_year -> "{Month} {year}" group (e.g. "Agosto 2020"). No day invented.
 * - exact      -> the month group matching its coherent capturedYear /
 *                capturedMonth (falls back to parsing capturedAt UTC when the
 *                components are missing). Grouping stays monthly.
 *
 * Visual structure: YearGroup[] (year header) -> sections (month / year-only
 * blocks). `flattenTimelineForSectionList` adapts the tree to RN SectionList
 * rows of up to 3 cards (Figma uses a 3-column grid), keeping stable keys.
 */

/** Honest Spanish month names (capitalized, Figma wording). */
export const TIMELINE_MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** Lowercase month names for exact-date card labels (Figma wording). */
const TIMELINE_MONTH_NAMES_LOWER = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const TIMELINE_UNKNOWN_TITLE = 'Sin fecha';

export type TimelineSectionKind = 'month' | 'year' | 'unknown';

export interface TimelineSection {
  /** Stable key: `m:{year}-{month}` | `y-only:{year}` | `unknown`. */
  readonly key: string;
  readonly kind: TimelineSectionKind;
  readonly year: number | null;
  readonly month: number | null;
  /** "Agosto" | "Durante 2020" | "Sin fecha". Year context travels in the parent. */
  readonly title: string;
  readonly items: readonly HomeCloudMemoryListItem[];
}

export interface TimelineYearGroup {
  /** Stable key: `year:{year}` | `unknown`. */
  readonly key: string;
  readonly year: number | null;
  /** "2026" | "Sin fecha". */
  readonly title: string;
  readonly sections: readonly TimelineSection[];
}

export interface TimelineRow {
  /** Stable key: `{sectionKey}:row-{index}`. */
  readonly key: string;
  readonly sectionKey: string;
  readonly items: readonly HomeCloudMemoryListItem[];
}

export interface TimelineListSection {
  /** Stable key, mirrors the TimelineSection key. */
  readonly key: string;
  readonly kind: TimelineSectionKind;
  /** Year header ("2026"); rendered once per year group. Null reuses context. */
  readonly yearTitle: string | null;
  readonly title: string;
  readonly data: readonly TimelineRow[];
}

/** "Agosto". Month context: the parent year header carries the year. */
export function formatTimelineMonthTitle(month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) return TIMELINE_UNKNOWN_TITLE;
  return TIMELINE_MONTH_NAMES[month - 1];
}

/** "Durante 2020". Honest year-only label: never a month, never a day. */
export function formatTimelineYearOnlyTitle(year: number): string {
  return `Durante ${year}`;
}

function isValidYear(year: unknown): year is number {
  return typeof year === 'number' && Number.isInteger(year) && year >= 1 && year <= 9999;
}

function isValidMonth(month: unknown): month is number {
  return typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12;
}

/**
 * Derive the (year, month) grouping coordinates of one Memory from its
 * SEMANTIC date only. Returns null when the date is honestly unknown.
 * `uploadedAt` is deliberately never consulted.
 */
function semanticGroupOf(memory: HomeCloudMemoryListItem): {
  precision: 'month' | 'year' | 'unknown';
  year: number | null;
  month: number | null;
} {
  const precision = memory.capturePrecision;
  if (precision === 'unknown') return { precision: 'unknown', year: null, month: null };
  if (precision === 'year') {
    if (isValidYear(memory.capturedYear)) return { precision: 'year', year: memory.capturedYear, month: null };
    return { precision: 'unknown', year: null, month: null };
  }
  // month_year and exact both live in a month group.
  if (isValidYear(memory.capturedYear) && isValidMonth(memory.capturedMonth)) {
    return { precision: 'month', year: memory.capturedYear, month: memory.capturedMonth };
  }
  if (precision === 'exact' && typeof memory.capturedAt === 'string') {
    const parsed = new Date(memory.capturedAt);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth() + 1;
      if (isValidYear(year) && isValidMonth(month)) {
        return { precision: 'month', year, month };
      }
    }
  }
  // Defensive: a year-known Memory without a usable month degrades to the
  // year-only block instead of inventing a month.
  if (isValidYear(memory.capturedYear)) return { precision: 'year', year: memory.capturedYear, month: null };
  return { precision: 'unknown', year: null, month: null };
}

/**
 * Group Memories into YearGroup -> sections, preserving the received
 * (canonical 4B.1) order. Unknown is always last; within a year, known-month
 * groups come first (in first-seen order) and the year-only block trails.
 */
export function groupMemoriesForTimeline(
  memories: readonly HomeCloudMemoryListItem[],
): TimelineYearGroup[] {
  const yearOrder: (number | null)[] = [];
  const monthSectionsByYear = new Map<number, TimelineSection[]>();
  const monthIndexByYear = new Map<number, Map<number, number>>();
  const yearOnlyByYear = new Map<number, HomeCloudMemoryListItem[]>();
  const unknownItems: HomeCloudMemoryListItem[] = [];

  const ensureYear = (year: number) => {
    if (!monthSectionsByYear.has(year)) {
      monthSectionsByYear.set(year, []);
      monthIndexByYear.set(year, new Map());
      yearOrder.push(year);
    }
  };

  for (const memory of memories) {
    const group = semanticGroupOf(memory);
    if (group.precision === 'unknown' || group.year === null) {
      unknownItems.push(memory);
      continue;
    }
    ensureYear(group.year);
    if (group.precision === 'year') {
      const existing = yearOnlyByYear.get(group.year);
      if (existing) existing.push(memory);
      else yearOnlyByYear.set(group.year, [memory]);
      continue;
    }
    const sections = monthSectionsByYear.get(group.year) as TimelineSection[];
    const indexByMonth = monthIndexByYear.get(group.year) as Map<number, number>;
    const month = group.month as number;
    const existingIndex = indexByMonth.get(month);
    if (existingIndex === undefined) {
      indexByMonth.set(month, sections.length);
      sections.push({
        key: `m:${group.year}-${month}`,
        kind: 'month',
        year: group.year,
        month,
        title: formatTimelineMonthTitle(month),
        items: [memory],
      });
    } else {
      (sections[existingIndex].items as HomeCloudMemoryListItem[]).push(memory);
    }
  }

  const groups: TimelineYearGroup[] = yearOrder.map((year) => {
    const sections = [...(monthSectionsByYear.get(year as number) ?? [])];
    const yearOnly = yearOnlyByYear.get(year as number) ?? [];
    if (yearOnly.length > 0) {
      sections.push({
        key: `y-only:${year}`,
        kind: 'year',
        year: year as number,
        month: null,
        title: formatTimelineYearOnlyTitle(year as number),
        items: [...yearOnly],
      });
    }
    return {
      key: `year:${year}`,
      year: year as number,
      title: String(year),
      sections,
    };
  });

  if (unknownItems.length > 0) {
    groups.push({
      key: 'year:unknown',
      year: null,
      title: TIMELINE_UNKNOWN_TITLE,
      sections: [
        {
          key: 'unknown',
          kind: 'unknown',
          year: null,
          month: null,
          title: TIMELINE_UNKNOWN_TITLE,
          items: [...unknownItems],
        },
      ],
    });
  }

  return groups;
}

/**
 * Split one section into grid rows of up to `columns` cards for SectionList.
 * Pure: no rendering, stable row keys.
 */
export function chunkTimelineSectionItems(
  sectionKey: string,
  items: readonly HomeCloudMemoryListItem[],
  columns = 3,
): TimelineRow[] {
  const width = Number.isInteger(columns) && columns > 0 ? columns : 3;
  const rows: TimelineRow[] = [];
  for (let index = 0; index < items.length; index += width) {
    rows.push({
      key: `${sectionKey}:row-${rows.length}`,
      sectionKey,
      items: items.slice(index, index + width),
    });
  }
  return rows;
}

/**
 * Flatten year groups into SectionList-ready sections. The year header title
 * is set only on the first section of each year group.
 */
export function flattenTimelineForSectionList(
  yearGroups: readonly TimelineYearGroup[],
  columns = 3,
): TimelineListSection[] {
  const flat: TimelineListSection[] = [];
  for (const group of yearGroups) {
    group.sections.forEach((section, sectionIndex) => {
      flat.push({
        key: section.key,
        kind: section.kind,
        yearTitle: sectionIndex === 0 ? group.title : null,
        title: section.title,
        data: chunkTimelineSectionItems(section.key, section.items, columns),
      });
    });
  }
  return flat;
}

/**
 * Honest semantic-date label for one Memory (card metadata, never grouping).
 * Mirrors the Figma wording: exact shows the real day, partial precisions
 * never invent one.
 */
export function memorySemanticLabel(memory: HomeCloudMemoryListItem): string {
  if (memory.capturePrecision === 'exact' && typeof memory.capturedAt === 'string') {
    const parsed = new Date(memory.capturedAt);
    if (!Number.isNaN(parsed.getTime())) {
      const day = parsed.getUTCDate();
      const month = TIMELINE_MONTH_NAMES_LOWER[parsed.getUTCMonth()];
      return `${day} ${month} ${parsed.getUTCFullYear()}`;
    }
    if (isValidYear(memory.capturedYear) && isValidMonth(memory.capturedMonth)) {
      return `${TIMELINE_MONTH_NAMES_LOWER[memory.capturedMonth - 1]} ${memory.capturedYear}`;
    }
  }
  if (memory.capturePrecision === 'month_year' && isValidYear(memory.capturedYear) && isValidMonth(memory.capturedMonth)) {
    return `${TIMELINE_MONTH_NAMES[memory.capturedMonth - 1]} de ${memory.capturedYear}`;
  }
  if (memory.capturePrecision === 'year' && isValidYear(memory.capturedYear)) {
    return formatTimelineYearOnlyTitle(memory.capturedYear);
  }
  return TIMELINE_UNKNOWN_TITLE;
}

/**
 * Primary text contract for cards (Product Truth).
 *
 * - Written: writtenText IS the content.
 * - Binary:  the caption IS the content, when there is one.
 *
 * `displayName` is TECHNICAL metadata (the original filename). It is NEVER the
 * visual identity of a Memory: `IMG_3485.HEIC` / `VID_1029.MOV` must not appear
 * on the Memories Root, the Timeline, image cards, video cards or as a Review
 * title. It stays available for storage/upload and for a future
 * "Información técnica / Nombre original" surface, and it remains searchable.
 *
 * Returns '' when there is honestly nothing to show; the card then falls back
 * to `memorySemanticLabel` ("12 ene 2024" / "Sin fecha"). NEVER returns
 * 'NULL'/'undefined'/MIME.
 */
export function memoryPrimaryText(memory: HomeCloudMemoryListItem): string {
  if (memory.kind === 'written') {
    return typeof memory.writtenText === 'string' ? memory.writtenText : '';
  }
  if (typeof memory.caption === 'string' && memory.caption.length > 0) return memory.caption;
  return '';
}
