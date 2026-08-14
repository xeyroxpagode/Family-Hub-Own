export const MONEY_INPUT_CURRENCIES = ['ARS', 'USD', 'EUR'] as const;
export const DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS = MONEY_INPUT_CURRENCIES;

export type MoneyInputCurrencyCode = string;

export type MoneyInputStatus = 'empty' | 'valid' | 'zero' | 'invalid';

export type MoneyInputParseResult = {
  inputText: string;
  displayText: string;
  canonicalAmount: string | null;
  currency: MoneyInputCurrencyCode;
  status: MoneyInputStatus;
  isEmpty: boolean;
  isValid: boolean;
  technicalValue: { amount: string; currency: MoneyInputCurrencyCode } | null;
};

const MAX_DECIMAL_PLACES = 4;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

export function isMoneyInputCurrency(value: string): value is MoneyInputCurrencyCode {
  return CURRENCY_CODE_RE.test(value);
}

function stripLeadingZeros(value: string): string {
  const stripped = value.replace(/^0+(?=\d)/, '');
  return stripped || '0';
}

function normalizeDecimalValue(integerPart: string, fractionPart: string | null): string {
  const integer = stripLeadingZeros(integerPart || '0');
  if (fractionPart === null) return integer;
  const fraction = fractionPart.replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer;
}

function hasGroupedThousands(value: string, separator: string): boolean {
  const escaped = separator === '.' ? '\\.' : ',';
  return new RegExp(`^\\d{1,3}(${escaped}\\d{3})+$`).test(value);
}

function splitAmountText(input: string): { integerPart: string; fractionPart: string | null } | null {
  const compact = input.replace(/\s/g, '');
  if (!compact) return { integerPart: '', fractionPart: null };
  if (/[-+]/.test(compact) || /[^0-9.,]/.test(compact)) return null;

  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  if (!hasDot && !hasComma) return /^\d+$/.test(compact) ? { integerPart: compact, fractionPart: null } : null;

  if (hasDot && hasComma) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
    const decimalIndex = Math.max(lastDot, lastComma);
    const integerPart = compact.slice(0, decimalIndex).split(thousandsSeparator).join('');
    const fractionPart = compact.slice(decimalIndex + 1);
    if (!integerPart || !/^\d+$/.test(integerPart) || !/^\d{0,4}$/.test(fractionPart)) return null;
    return { integerPart, fractionPart };
  }

  const separator = hasDot ? '.' : ',';
  if (hasGroupedThousands(compact, separator)) {
    return { integerPart: compact.split(separator).join(''), fractionPart: null };
  }

  const pieces = compact.split(separator);
  if (pieces.length !== 2) return null;
  const [integerPart, fractionPart] = pieces;
  if (!integerPart || !/^\d+$/.test(integerPart) || !/^\d{0,4}$/.test(fractionPart)) return null;
  return { integerPart, fractionPart };
}

function isZeroCanonical(canonicalAmount: string): boolean {
  return Number(canonicalAmount) === 0;
}

export function parseMoneyInputText(inputText: string, currency: MoneyInputCurrencyCode): MoneyInputParseResult {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return {
      inputText,
      displayText: '',
      canonicalAmount: null,
      currency,
      status: 'empty',
      isEmpty: true,
      isValid: false,
      technicalValue: null,
    };
  }

  const split = splitAmountText(trimmed);
  if (!split || (split.fractionPart !== null && split.fractionPart.length > MAX_DECIMAL_PLACES)) {
    return {
      inputText,
      displayText: inputText,
      canonicalAmount: null,
      currency,
      status: 'invalid',
      isEmpty: false,
      isValid: false,
      technicalValue: null,
    };
  }

  const canonicalAmount = normalizeDecimalValue(split.integerPart, split.fractionPart);
  const status: MoneyInputStatus = isZeroCanonical(canonicalAmount) ? 'zero' : 'valid';
  const isValid = status === 'valid';

  return {
    inputText,
    displayText: formatMoneyInputDisplay(canonicalAmount),
    canonicalAmount,
    currency,
    status,
    isEmpty: false,
    isValid,
    technicalValue: isValid ? { amount: canonicalAmount, currency } : null,
  };
}

export function formatMoneyInputDisplay(canonicalAmount: string | null): string {
  if (!canonicalAmount) return '';
  const [integerPart, fractionPart] = canonicalAmount.split('.');
  const groupedInteger = stripLeadingZeros(integerPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fractionPart ? `${groupedInteger},${fractionPart}` : groupedInteger;
}
