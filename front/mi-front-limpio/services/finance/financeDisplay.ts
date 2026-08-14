import type { FinanceTransactionKind } from './financeMovements';

export type FinanceAmountSign = 'none' | 'transaction' | 'net';

function stripLeadingZeros(value: string): string {
  const stripped = value.replace(/^0+(?=\d)/, '');
  return stripped || '0';
}

function splitDecimalString(value: string): { negative: boolean; integerPart: string; fractionPart: string } {
  const trimmed = String(value ?? '').trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [rawInteger = '0', rawFraction = ''] = unsigned.split('.');
  const integerPart = stripLeadingZeros(rawInteger.replace(/\D/g, '') || '0');
  const fractionPart = rawFraction.replace(/\D/g, '').replace(/0+$/, '');
  return { negative, integerPart, fractionPart };
}

export function isZeroDecimalString(value: string): boolean {
  const { integerPart, fractionPart } = splitDecimalString(value);
  return /^0+$/.test(integerPart) && (fractionPart === '' || /^0+$/.test(fractionPart));
}

export function formatFinanceDecimalString(value: string): string {
  const { integerPart, fractionPart } = splitDecimalString(value);
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fractionPart ? `${groupedInteger},${fractionPart}` : groupedInteger;
}

export function formatFinanceAmount(
  amount: string,
  currency: string,
  options: { transactionType?: FinanceTransactionKind; sign?: FinanceAmountSign } = {},
): string {
  const normalizedCurrency = String(currency ?? '').trim().toUpperCase();
  const signMode = options.sign ?? 'none';
  let visualSign = '';

  if (signMode === 'transaction') {
    visualSign = options.transactionType === 'expense' ? '-' : '+';
  } else if (signMode === 'net' && !isZeroDecimalString(amount)) {
    visualSign = String(amount).trim().startsWith('-') ? '-' : '+';
  }

  return `${visualSign}${formatFinanceDecimalString(amount)} ${normalizedCurrency}`.trim();
}

export function financeMovementTitle(transactionType: FinanceTransactionKind, description: string | null): string {
  const trimmed = description?.trim();
  if (trimmed) return trimmed;
  return transactionType === 'expense' ? 'Gasto' : 'Ingreso';
}
