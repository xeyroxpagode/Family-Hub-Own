import type { CapturePrecision } from './homecloudUploadTypes';

/**
 * HomeCloud STAGE 4C.1.1 — Media capture metadata (single source of truth).
 *
 * A photo/video imported from the gallery must behave like a GALLERY item: its
 * semantic date comes from the media's own temporal metadata, never from the
 * moment we happened to import or select it. This primitive is the ONLY place
 * allowed to answer "when was this really captured?".
 *
 * ---------------------------------------------------------------------------
 * REAL SOURCE PRIORITY (audited against expo-image-picker ~57.0.20)
 * ---------------------------------------------------------------------------
 * `ImagePicker.types.d.ts` (ImagePickerAsset, lines 230-316) declares exactly:
 * uri, assetId, width, height, type, fileName, fileSize, exif, base64,
 * duration, mimeType, pairedVideoAsset, file. Audited consequences:
 *
 * 1. `exif.DateTimeOriginal`   -> the capture instant. HIGHEST priority.
 * 2. `exif.DateTimeDigitized`  -> when the file was digitised (scans).
 * 3. `exif.DateTime`           -> last-resort EXIF stamp.
 *    Any of the three, when parseable, yields precision `exact` with the REAL
 *    capturedAt plus the year/month derived from it.
 *
 * Rejected sources, with the reason (never silently substituted):
 * - `asset.creationTime`: NOT part of ImagePickerAsset in this SDK version.
 *   There is no such field to read.
 * - `asset.duration`: a LENGTH in milliseconds, not an instant. It can never
 *   become a calendar date.
 * - `asset.assetId`: an iOS PHAsset identifier. It would only yield a date via
 *   `expo-media-library`, which is not a dependency of this app; adding a new
 *   native module is out of scope for this recovery.
 * - `fileName` date patterns (IMG_20240112_*, VID-20240112-WA0000, ...): a
 *   naming heuristic, not metadata. WhatsApp/Screenshot exports routinely
 *   disagree with reality, so a date parsed from a filename is untrustworthy.
 * - `Date.now()`, `createdAt`, `uploadedAt`, import date, selection date: all
 *   describe the IMPORT, not the CAPTURE. Explicitly prohibited.
 *
 * Practical consequence, stated honestly: a VIDEO selected from the library
 * arrives with no temporal metadata at all (no EXIF is delivered for videos),
 * so it resolves to precision `unknown` and lands in the honest "Sin fecha"
 * group instead of being dated by the import clock.
 *
 * ---------------------------------------------------------------------------
 * WHY THE EXIF WALL-CLOCK IS ENCODED AS UTC
 * ---------------------------------------------------------------------------
 * EXIF `DateTimeOriginal` carries no timezone: it is the local wall-clock at
 * the moment of capture. The backend derives `capturedYear`/`capturedMonth`
 * with `getUTC*` (backend/src/lib/homecloudIntakeValidation.js:132-137), and
 * the Timeline groups by that calendar month. Encoding the wall-clock as UTC is
 * therefore deliberate: the derived calendar date is exactly the date the user
 * experienced. Shifting it by the device offset would roll a photo taken at
 * 2024-01-12 22:00 in UTC-3 over to January 13th, which is a worse lie than a
 * shifted instant. `OffsetTimeOriginal` is intentionally ignored for the same
 * reason.
 */
export interface MediaCaptureAssetMetadata {
  /** Raw EXIF bag, present only when the picker was launched with `exif: true`. */
  readonly exif?: Record<string, unknown> | null;
  /** Broad media kind reported by the picker ('image' | 'video' | ...). */
  readonly type?: string | null;
  /** Video length in ms. NOT a date; declared so callers can see it is unused. */
  readonly duration?: number | null;
  /** Original filename. Technical metadata only; never parsed as a date. */
  readonly fileName?: string | null;
}

export interface MediaCaptureMetadata {
  capturedAt: string | null;
  capturedYear: number | null;
  capturedMonth: number | null;
  capturePrecision: CapturePrecision;
}

/** Human-readable priority, exported so the contract is assertable from tests. */
export const MEDIA_CAPTURE_SOURCE_PRIORITY: readonly string[] = [
  'exif.DateTimeOriginal',
  'exif.DateTimeDigitized',
  'exif.DateTime',
];

const EXIF_DATETIME = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
const MIN_YEAR = 1;
const MAX_YEAR = 9999;

/** ISO month abbreviations, matching the Timeline wording. */
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const UNKNOWN_CAPTURE: MediaCaptureMetadata = {
  capturedAt: null,
  capturedYear: null,
  capturedMonth: null,
  capturePrecision: 'unknown',
};

/** A frozen copy, so callers can never mutate the shared unknown value. */
export function unknownMediaCaptureMetadata(): MediaCaptureMetadata {
  return { ...UNKNOWN_CAPTURE };
}

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}

function isValidMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

/**
 * Convert an EXIF `DateTimeOriginal` / `DateTimeDigitized` / `DateTime` stamp
 * ("YYYY:MM:DD HH:MM:SS") into an ISO instant whose UTC calendar components
 * are the photographed day. Returns null when absent, malformed or out of
 * range. A partially-known stamp (year/month without a full clock) is still
 * accepted as long as the calendar day is real.
 */
function exifDateTimeToIso(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = EXIF_DATETIME.exec(raw.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second),
  ));
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible calendar stamps that Date.UTC would silently roll over
  // (e.g. "2024:02:31") instead of shifting the month without telling anyone.
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() + 1 !== Number(month)
    || date.getUTCDate() !== Number(day)
  ) return null;
  if (date.getUTCHours() > 23 || date.getUTCMinutes() > 59 || date.getUTCSeconds() > 59) return null;
  if (!isValidYear(date.getUTCFullYear())) return null;
  return date.toISOString();
}

/**
 * Derive the honest semantic date of one gallery asset.
 *
 * Trusted temporal metadata -> precision `exact`, the real capturedAt and the
 * year/month derived from it. Anything else -> precision `unknown` with every
 * component null. There is no third outcome and no fabricated date.
 */
export function deriveMediaCaptureMetadata(asset: MediaCaptureAssetMetadata): MediaCaptureMetadata {
  const exif = asset.exif;
  if (!exif || typeof exif !== 'object') return unknownMediaCaptureMetadata();

  for (const tag of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'] as const) {
    const iso = exifDateTimeToIso(exif[tag]);
    if (!iso) continue;
    const parsed = new Date(iso);
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    if (!isValidYear(year) || !isValidMonth(month)) continue;
    return {
      capturedAt: iso,
      capturedYear: year,
      capturedMonth: month,
      capturePrecision: 'exact',
    };
  }

  return unknownMediaCaptureMetadata();
}

/**
 * Informational label for the Review surface. Never an input: a photo/video
 * does not ask the user to grade its own precision. "12 ene 2024" or
 * "Sin fecha" — the honest "Sin fecha" is the whole point.
 */
export function formatMediaCaptureDate(metadata: MediaCaptureMetadata): string {
  if (metadata.capturePrecision === 'exact' && metadata.capturedAt) {
    const parsed = new Date(metadata.capturedAt);
    if (!Number.isNaN(parsed.getTime())) {
      const month = MONTHS_SHORT[parsed.getUTCMonth()];
      if (month) return `${parsed.getUTCDate()} ${month} ${parsed.getUTCFullYear()}`;
    }
  }
  if (isValidYear(metadata.capturedYear as number) && isValidMonth(metadata.capturedMonth as number)) {
    return `${MONTHS_SHORT[(metadata.capturedMonth as number) - 1]} ${metadata.capturedYear}`;
  }
  if (isValidYear(metadata.capturedYear as number)) return String(metadata.capturedYear);
  return 'Sin fecha';
}

/**
 * Register-payload fields for a gallery Memory.
 *
 * Mirrors the backend contract exactly: for `exact` the client sends ONLY
 * capturedAt and the server derives capturedYear/capturedMonth itself
 * (backend/src/lib/homecloudIntakeValidation.js:122-137 rejects client
 * supplied components for `exact`, so sending them would be a 400).
 */
export function memoryRegisterCaptureFields(metadata: MediaCaptureMetadata): {
  capturePrecision: CapturePrecision;
  capturedAt: string | null;
  capturedYear: number | null;
  capturedMonth: number | null;
} {
  if (metadata.capturePrecision === 'exact' && metadata.capturedAt) {
    return { capturePrecision: 'exact', capturedAt: metadata.capturedAt, capturedYear: null, capturedMonth: null };
  }
  if (metadata.capturePrecision === 'month_year') {
    return {
      capturePrecision: 'month_year',
      capturedAt: null,
      capturedYear: isValidYear(metadata.capturedYear as number) ? metadata.capturedYear : null,
      capturedMonth: isValidMonth(metadata.capturedMonth as number) ? metadata.capturedMonth : null,
    };
  }
  if (metadata.capturePrecision === 'year') {
    return {
      capturePrecision: 'year',
      capturedAt: null,
      capturedYear: isValidYear(metadata.capturedYear as number) ? metadata.capturedYear : null,
      capturedMonth: null,
    };
  }
  return { capturePrecision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null };
}
