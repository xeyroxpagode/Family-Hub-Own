const MONTH_LABELS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

export type FinancePeriodDirection = 'previous' | 'next';

function padMonth(month: number): string {
  return String(month).padStart(2, '0');
}

export function financeMonthFromLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`;
}

export function shiftFinanceMonth(period: string, direction: FinancePeriodDirection): string {
  const [yearText, monthText] = period.split('-');
  let year = Number(yearText);
  let month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return financeMonthFromLocalDate();
  }

  month += direction === 'previous' ? -1 : 1;
  if (month === 0) {
    year -= 1;
    month = 12;
  } else if (month === 13) {
    year += 1;
    month = 1;
  }

  return `${year}-${padMonth(month)}`;
}

export function formatFinancePeriodLabel(period: string): string {
  const [yearText, monthText] = period.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return period;
  }
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export function isCurrentFinanceMonth(period: string, today: Date = new Date()): boolean {
  return period === financeMonthFromLocalDate(today);
}

export function localDateOnly(date: Date = new Date()): string {
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftLocalDateOnly(date: Date, days: number): string {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return localDateOnly(shifted);
}

export function formatFinanceDateGroupLabel(dateOnly: string, today: Date = new Date()): string {
  const todayOnly = localDateOnly(today);
  if (dateOnly === todayOnly) return 'HOY';
  if (dateOnly === shiftLocalDateOnly(today, -1)) return 'AYER';

  const [, monthText, dayText] = dateOnly.split('-');
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
    return dateOnly;
  }

  return `${day} ${MONTH_LABELS[month - 1]}`;
}
