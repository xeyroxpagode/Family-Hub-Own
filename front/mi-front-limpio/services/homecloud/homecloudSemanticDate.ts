import type { CapturePrecision } from './homecloudUploadTypes';

export interface SemanticDateValue {
  precision: CapturePrecision;
  capturedAt: string | null;
  capturedYear: number | null;
  capturedMonth: number | null;
}

export interface SemanticDateDraft {
  precision: CapturePrecision;
  exactDate: string;
  exactCapturedAt: string | null;
  year: string;
  month: number | null;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function semanticDateDraftFromCapture(
  capturedAt: string | null,
  precision: CapturePrecision,
): SemanticDateDraft {
  if (precision === 'exact' && capturedAt) {
    const parsed = new Date(capturedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        precision: 'exact',
        exactDate: parsed.toISOString().slice(0, 10),
        exactCapturedAt: parsed.toISOString(),
        year: String(parsed.getUTCFullYear()),
        month: parsed.getUTCMonth() + 1,
      };
    }
  }
  return { precision: 'unknown', exactDate: '', exactCapturedAt: null, year: '', month: null };
}

export function emptySemanticDateDraft(): SemanticDateDraft {
  return semanticDateDraftFromCapture(null, 'unknown');
}

export function semanticDateDraftError(draft: SemanticDateDraft): string | null {
  if (draft.precision === 'unknown') return null;
  const year = Number(draft.year);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return 'Ingresá un año válido.';
  if (draft.precision === 'year') return null;
  if (!Number.isInteger(draft.month) || draft.month! < 1 || draft.month! > 12) return 'Elegí un mes.';
  if (draft.precision === 'month_year') return null;
  const match = DATE_ONLY.exec(draft.exactDate);
  if (!match) return 'Elegí una fecha completa.';
  const [, y, m, d] = match;
  const parsed = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (
    parsed.getUTCFullYear() !== Number(y)
    || parsed.getUTCMonth() + 1 !== Number(m)
    || parsed.getUTCDate() !== Number(d)
  ) return 'Elegí una fecha válida.';
  return null;
}

export function semanticDateValueFromDraft(draft: SemanticDateDraft): SemanticDateValue {
  const error = semanticDateDraftError(draft);
  if (error) throw new Error(error);
  if (draft.precision === 'unknown') {
    return { precision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null };
  }
  const year = Number(draft.year);
  if (draft.precision === 'year') {
    return { precision: 'year', capturedAt: null, capturedYear: year, capturedMonth: null };
  }
  if (draft.precision === 'month_year') {
    return { precision: 'month_year', capturedAt: null, capturedYear: year, capturedMonth: draft.month };
  }
  const originalDate = draft.exactCapturedAt?.slice(0, 10);
  return {
    precision: 'exact',
    capturedAt: originalDate === draft.exactDate
      ? draft.exactCapturedAt
      : `${draft.exactDate}T00:00:00.000Z`,
    capturedYear: null,
    capturedMonth: null,
  };
}

export function setSemanticDatePrecision(
  draft: SemanticDateDraft,
  precision: CapturePrecision,
  suggestedDate: string,
): SemanticDateDraft {
  if (precision === 'unknown') return emptySemanticDateDraft();
  const date = DATE_ONLY.test(draft.exactDate) ? draft.exactDate : suggestedDate;
  const [year, month] = date.split('-').map(Number);
  return {
    ...draft,
    precision,
    exactDate: date,
    exactCapturedAt: draft.exactDate === date ? draft.exactCapturedAt : null,
    year: draft.year || String(year),
    month: draft.month ?? month,
  };
}
