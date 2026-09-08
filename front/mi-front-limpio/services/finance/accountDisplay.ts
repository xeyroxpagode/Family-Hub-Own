import { FINANCE_ACCOUNT_BALANCE_STATES, FINANCE_ACCOUNT_TYPES, type FinanceAccountDto } from './financeAccounts';

export type AccountBalancePresentation = {
  readOnly: boolean;
  /** True when balanceState = UNKNOWN; must never be displayed as zero. */
  isUnknown: boolean;
  /** True for CREDIT_CARD accounts. */
  isCreditCard: boolean;
  /** True when the canonical stored balance represents debt (negative). */
  isDebt: boolean;
  /** True for the rare CREDIT_CARD positive-balance edge preserved as numerical truth. */
  isCreditEdgePositive: boolean;
  /** UI label: "Saldo actual" | "Deuda actual" | "Saldo a favor". */
  label: string;
  /** UI label for the unknown state. */
  unknownLabel: string;
  /** Canonical decimal string for display. null when UNKNOWN. */
  displayAmount: string | null;
  /** Currency code. */
  currency: string | null;
};

const UNKNOWN_LABEL = 'Saldo sin establecer';

function isZeroDecimalString(value: string): boolean {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true;
  const unsigned = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed;
  const [intPart = '0', fracPart = ''] = unsigned.split('.');
  return /^0+$/.test(intPart) && (fracPart === '' || /^0+$/.test(fracPart));
}

/**
 * Canonical Account balance presentation.
 *
 * Boundary:
 *   - UNKNOWN  -> "Saldo sin establecer" (NEVER $0, H06).
 *   - ACCOUNT KNOWN zero -> "Saldo actual $0" (distinct from UNKNOWN, H19).
 *   - ACCOUNT KNOWN positive -> "Saldo actual $X".
 *   - ACCOUNT KNOWN negative (rare) -> "Saldo actual $-X" (preserve truth).
 *   - CREDIT_CARD KNOWN debt (backend negative) -> "Deuda actual $|X|"
 *     (NEVER expose "-$..." in normal UX, H09/H10).
 *   - CREDIT_CARD KNOWN zero debt -> "Deuda actual $0".
 *   - CREDIT_CARD KNOWN positive (edge) -> "Saldo a favor $X" (neutral
 *     fallback, preserve numerical truth per Product Freeze V1.1 §9).
 */
export function getAccountBalancePresentation(account: Pick<FinanceAccountDto, 'accountType' | 'balanceState' | 'currentBalance' | 'currency'>): AccountBalancePresentation {
  const isCreditCard = account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD;
  const isUnknown = account.balanceState === FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN;

  if (isUnknown) {
    return {
      readOnly: true,
      isUnknown: true,
      isCreditCard,
      isDebt: false,
      isCreditEdgePositive: false,
      label: isCreditCard ? 'Deuda actual' : 'Saldo actual',
      unknownLabel: UNKNOWN_LABEL,
      displayAmount: null,
      currency: account.currency ?? null,
    };
  }

  const canonical = String(account.currentBalance ?? '0');
  const isNegative = canonical.startsWith('-');
  const unsigned = isNegative ? canonical.slice(1) : canonical;

  if (isCreditCard) {
    if (isNegative || isZeroDecimalString(canonical)) {
      return {
        readOnly: false,
        isUnknown: false,
        isCreditCard: true,
        isDebt: true,
        isCreditEdgePositive: false,
        label: 'Deuda actual',
        unknownLabel: UNKNOWN_LABEL,
        displayAmount: unsigned,
        currency: account.currency ?? null,
      };
    }
    return {
      readOnly: false,
      isUnknown: false,
      isCreditCard: true,
      isDebt: false,
      isCreditEdgePositive: true,
      label: 'Saldo a favor',
      unknownLabel: UNKNOWN_LABEL,
      displayAmount: canonical,
      currency: account.currency ?? null,
    };
  }

  return {
    readOnly: false,
    isUnknown: false,
    isCreditCard: false,
    isDebt: false,
    isCreditEdgePositive: false,
    label: 'Saldo actual',
    unknownLabel: UNKNOWN_LABEL,
    displayAmount: canonical,
    currency: account.currency ?? null,
  };
}

/**
 * Strip trailing zeros from the FRACTIONAL part only. The integer part must
 * never lose magnitude: 70000 must never become 7, and 55050 must never become
 * 5505 (this was the runtime bug observed in 3H QA — `/0+$/` was matching the
 * whole string and stripping integer zeros).
 *
 * Canonical Finance amounts are decimal strings; this helper is the single
 * display-side normalizer reused across Account presentation, Activity rows,
 * Balance Anchor/Correction summaries and Transfer previews.
 */
export function stripTrailingDecimalZeros(value: string | null | undefined): string {
  const text = String(value ?? '');
  if (text === '') return '0';
  const dotIndex = text.indexOf('.');
  if (dotIndex === -1) return text || '0';
  const integer = text.slice(0, dotIndex);
  let fraction = text.slice(dotIndex + 1).replace(/0+$/, '');
  if (!fraction) return integer || '0';
  return `${integer || '0'}.${fraction}`;
}

/**
 * Format a canonical decimal amount for display using the es-AR thousands
 * separator (dot). Only fractional trailing zeros are stripped; integer
 * magnitude is preserved exactly.
 */
export function formatCanonicalAmountForDisplay(value: string | null | undefined): string {
  const normalized = stripTrailingDecimalZeros(value);
  const dotIndex = normalized.indexOf('.');
  const integerPart = dotIndex === -1 ? normalized : normalized.slice(0, dotIndex);
  const fractionPart = dotIndex === -1 ? '' : normalized.slice(dotIndex + 1);
  const sign = integerPart.startsWith('-') ? '-' : '';
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fractionPart
    ? `${sign}${groupedInteger},${fractionPart}`
    : `${sign}${groupedInteger}`;
}

export function formatAccountPresentationAmount(presentation: AccountBalancePresentation): string {
  if (presentation.displayAmount === null) return presentation.unknownLabel;
  return formatCanonicalAmountForDisplay(presentation.displayAmount);
}

const DECIMAL_TEXT_RE = /^-?(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
const DECIMAL_SCALE = 4;

type ScaledDecimal = {
  sign: -1 | 0 | 1;
  digits: string;
};

function stripLeadingZeros(value: string): string {
  const stripped = value.replace(/^0+(?=\d)/, '');
  return stripped || '0';
}

function toScaledDecimal(value: string): ScaledDecimal {
  const text = String(value ?? '').trim();
  if (!DECIMAL_TEXT_RE.test(text)) {
    throw new Error('invalid_decimal_string');
  }
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [rawInteger = '0', rawFraction = ''] = unsigned.split('.');
  const integer = stripLeadingZeros(rawInteger || '0');
  const fraction = (rawFraction + '0000').slice(0, DECIMAL_SCALE);
  const digits = stripLeadingZeros(`${integer}${fraction}`);
  const isZero = /^0+$/.test(digits);
  return {
    sign: isZero ? 0 : negative ? -1 : 1,
    digits: isZero ? '0' : digits,
  };
}

function compareAbsDigits(left: string, right: string): -1 | 0 | 1 {
  const a = stripLeadingZeros(left);
  const b = stripLeadingZeros(right);
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function addAbsDigits(left: string, right: string): string {
  let carry = 0;
  let result = '';
  let i = left.length - 1;
  let j = right.length - 1;
  while (i >= 0 || j >= 0 || carry > 0) {
    const sum = (i >= 0 ? left.charCodeAt(i) - 48 : 0) + (j >= 0 ? right.charCodeAt(j) - 48 : 0) + carry;
    result = String(sum % 10) + result;
    carry = Math.floor(sum / 10);
    i -= 1;
    j -= 1;
  }
  return stripLeadingZeros(result);
}

function subtractAbsDigits(left: string, right: string): string {
  let borrow = 0;
  let result = '';
  let i = left.length - 1;
  let j = right.length - 1;
  while (i >= 0) {
    let digit = (left.charCodeAt(i) - 48) - borrow;
    const subtrahend = j >= 0 ? right.charCodeAt(j) - 48 : 0;
    if (digit < subtrahend) {
      digit += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    result = String(digit - subtrahend) + result;
    i -= 1;
    j -= 1;
  }
  return stripLeadingZeros(result);
}

function fromScaledDecimal(value: ScaledDecimal): string {
  if (value.sign === 0 || /^0+$/.test(value.digits)) return '0';
  const padded = value.digits.padStart(DECIMAL_SCALE + 1, '0');
  const integer = stripLeadingZeros(padded.slice(0, -DECIMAL_SCALE) || '0');
  const fraction = padded.slice(-DECIMAL_SCALE).replace(/0+$/, '');
  const unsigned = fraction ? `${integer}.${fraction}` : integer;
  return value.sign < 0 ? `-${unsigned}` : unsigned;
}

export function addDecimalStrings(left: string, right: string): string {
  const a = toScaledDecimal(left);
  const b = toScaledDecimal(right);
  if (a.sign === 0) return fromScaledDecimal(b);
  if (b.sign === 0) return fromScaledDecimal(a);
  if (a.sign === b.sign) {
    return fromScaledDecimal({ sign: a.sign, digits: addAbsDigits(a.digits, b.digits) });
  }
  const comparison = compareAbsDigits(a.digits, b.digits);
  if (comparison === 0) return '0';
  if (comparison > 0) {
    return fromScaledDecimal({ sign: a.sign, digits: subtractAbsDigits(a.digits, b.digits) });
  }
  return fromScaledDecimal({ sign: b.sign, digits: subtractAbsDigits(b.digits, a.digits) });
}

export function subtractDecimalStrings(left: string, right: string): string {
  const trimmed = String(right ?? '').trim();
  const negated = trimmed.startsWith('-') ? trimmed.slice(1) : `-${trimmed}`;
  return addDecimalStrings(left, negated);
}

export function compareDecimalStrings(left: string, right: string): -1 | 0 | 1 {
  const a = toScaledDecimal(left);
  const b = toScaledDecimal(right);
  if (a.sign !== b.sign) return a.sign < b.sign ? -1 : 1;
  if (a.sign === 0) return 0;
  const absComparison = compareAbsDigits(a.digits, b.digits);
  return a.sign > 0 ? absComparison : (absComparison === 0 ? 0 : absComparison > 0 ? -1 : 1);
}

export function toCanonicalSignedAccountBalance(magnitudeText: string, accountType: string | undefined): string {
  const amount = stripTrailingDecimalZeros(magnitudeText);
  if (accountType !== FINANCE_ACCOUNT_TYPES.CREDIT_CARD || isZeroDecimalString(amount)) {
    return amount;
  }
  return amount.startsWith('-') ? amount : `-${amount}`;
}
