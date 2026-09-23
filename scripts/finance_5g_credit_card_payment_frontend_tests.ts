import fs from 'node:fs';
import path from 'node:path';

import {
  formatDueDateHuman,
  formatExpectedAmount,
  formatRecurrenceSummary,
  PAYMENT_KINDS,
  RECURRENCE_UNITS,
  type PaymentDueDto,
  type PaymentSeriesDto,
} from '../front/mi-front-limpio/services/finance/financePayments';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function addDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function due(overrides: Partial<PaymentDueDto> = {}): PaymentDueDto {
  return {
    id: 'due-1',
    title: 'Visa',
    kind: PAYMENT_KINDS.CREDIT_CARD,
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '180000',
    dueDate: addDays(5),
    categoryId: null,
    targetCreditCardAccountId: 'card-1',
    status: 'PENDING',
    overdue: false,
    paymentSeriesId: null,
    financialContextType: 'personal',
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    createdByPersonId: 'person-1',
    targetCreditCard: { id: 'card-1', name: 'Visa', currency: 'ARS', accountType: 'CREDIT_CARD' },
    ...overrides,
  };
}

function series(overrides: Partial<PaymentSeriesDto> = {}): PaymentSeriesDto {
  return {
    id: 'series-1',
    title: 'Visa Mensual',
    kind: PAYMENT_KINDS.CREDIT_CARD,
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '180000',
    defaultCategoryId: null,
    targetCreditCardAccountId: 'card-1',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: addDays(5),
    status: 'ACTIVE',
    financialContextType: 'personal',
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    createdByPersonId: 'person-1',
    targetCreditCard: { id: 'card-1', name: 'Visa', currency: 'ARS', accountType: 'CREDIT_CARD' },
    currentDue: due(),
    ...overrides,
  };
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

async function main(): Promise<void> {
  const newPayment = read('front/mi-front-limpio/components/finance/NewPaymentSheet.tsx');
  const paymentsList = read('front/mi-front-limpio/components/finance/PaymentsList.tsx');
  const paymentDetail = read('front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx');
  const payCreditCard = read('front/mi-front-limpio/components/finance/PayCreditCardSheet.tsx');
  const directCreditCardPayment = read('front/mi-front-limpio/components/finance/DirectCreditCardPaymentSheet.tsx');
  const paymentRow = read('front/mi-front-limpio/components/finance/PaymentRow.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const financePayments = read('front/mi-front-limpio/services/finance/financePayments.ts');

  console.log('\n=== NEW PAYMENT NORMAL-ONLY ===');
  {
    assert(!newPayment.includes('KIND_OPTIONS'), '5G-01 NewPayment has no payment/card mode switch');
    assert(newPayment.includes('kind: PAYMENT_KINDS.NORMAL'), '5G-02 create payload is NORMAL');
    assert(!newPayment.includes('targetCreditCardAccountId'), '5G-03 NewPayment does not create card dues');
    assert(newPayment.includes('Qué pagás'), '5G-04 normal obligation copy is human');
    assert(newPayment.includes('Monto por definir'), '5G-05 unknown amount copy is explicit');
    assert(newPayment.includes('getQuickFinanceCategories'), '5G-06 category gallery consumes canonical categories');
    assert(newPayment.includes('RECURRENCE_PRESETS') && newPayment.includes('FormActionRow') && newPayment.includes('Se repite'), '5G-07 recurrence is compact row-driven');
    assert(newPayment.includes('Más detalles') && newPayment.includes('detailsOpen'), '5G-08 optional details are progressive');
    assert(newPayment.includes('createPaymentSeries') && newPayment.includes('createOneOffPaymentDue'), '5G-09 one-time and recurring contracts remain wired');
  }

  console.log('\n=== PAYMENTS CARD ENTRY ===');
  {
    assert(paymentsList.includes('Tarjetas') && paymentsList.includes('Pagos pendientes') && paymentsList.includes('Vencidos') && paymentsList.includes('Hoy') && paymentsList.includes('Próximos'), '5G-10 Payments IA has card rail plus pending temporal groups');
    assert(paymentsList.includes('listFinanceAccounts') && paymentsList.includes('FINANCE_ACCOUNT_TYPES.CREDIT_CARD'), '5G-11 Payments reads active credit cards');
    assert(paymentsList.includes('choosePrimaryCreditCardDue'), '5G-12 card section chooses primary due by canonical helper');
    assert(paymentsList.includes('onCreditCardDuePress') && paymentsList.includes('onDirectCardPayment'), '5G-13 card row exposes due and direct payment routes');
    assert(paymentsList.includes('Deuda actual') && paymentsList.includes("compareDecimalStrings(balance.displayAmount, '0') > 0"), '5G-14 card rail excludes zero and saldo-a-favor cards');
    assert(paymentsList.includes('Pagar restante') && paymentsList.includes('Pagar'), '5G-15 card actionable copy is financial');
    assert(paymentsList.includes('accessibilityLabel="Nuevo pago"') && !paymentsList.includes('Agregar pago'), '5G-16 Add payment is owned by utility plus');
  }

  console.log('\n=== PAYMENT DETAIL ===');
  {
    assert(paymentDetail.includes('onRegisterCreditCardPayment'), '5G-17 detail props include onRegisterCreditCardPayment');
    assert(paymentDetail.includes('showRegisterNormal') && paymentDetail.includes('showRegisterCreditCard'), '5G-18 separate show flags for kind');
    assert(paymentDetail.includes('title="Pagar"'), '5G-19 NORMAL shows Pagar');
    assert(paymentDetail.includes("'Pagar restante'") && paymentDetail.includes("'Pagar tarjeta'"), '5G-20 CREDIT_CARD shows remaining/direct card labels');
    assert(paymentDetail.includes('payment?.kind === PAYMENT_KINDS.CREDIT_CARD && payment.targetCreditCard'), '5G-21 detail shows target card for CREDIT_CARD');
    assert(paymentDetail.includes('Pagado desde'), '5G-22 paid card detail shows source account');
    assert(paymentDetail.includes('Ya registraste pagos para este vencimiento'), '5G-23 partial due copy avoids backend terminology');
    assert(!paymentDetail.includes('PARTIALLY_PAID') && !paymentDetail.includes('Este PaymentDue'), '5G-24 no technical status/copy leaks');
  }

  console.log('\n=== PAY CREDIT CARD DUE ===');
  {
    assert(payCreditCard.includes('settleCreditCardPaymentDue'), '5G-25 due payment uses settlement endpoint');
    assert(payCreditCard.includes('eligibleSourceAccounts'), '5G-26 source account eligibility hook');
    assert(payCreditCard.includes("operation: 'transfer-source'"), '5G-27 source uses transfer-source operation');
    assert(payCreditCard.includes('allowNone={false}'), '5G-28 source account required');
    assert(payCreditCard.includes('isCrossCurrency'), '5G-29 cross-currency detection');
    assert(payCreditCard.includes('destinationAmount'), '5G-30 destination amount state');
    assert(payCreditCard.includes('Llega') && payCreditCard.includes('Sale'), '5G-31 cross-currency labels Sale/Llega');
    assert(payCreditCard.includes('exceedsRemaining'), '5G-32 due-specific payment prevents overpay');
    assert(payCreditCard.includes('sourceAccountId: selectedAccountId'), '5G-33 payload includes sourceAccountId');
    assert(!payCreditCard.includes('actualCategoryId'), '5G-34 no category field in card settlement');
  }

  console.log('\n=== DIRECT CARD PAYMENT ===');
  {
    assert(directCreditCardPayment.includes('createFinanceTransfer'), '5G-35 direct card payment uses canonical transfer');
    assert(directCreditCardPayment.includes('Podés pagar parcial, total o de más'), '5G-36 direct payment allows over debt');
    assert(directCreditCardPayment.includes('Saldo a favor'), '5G-37 direct payment presents credit balance state');
    assert(directCreditCardPayment.includes('No calculamos tipo de cambio'), '5G-38 direct cross-currency asks explicit source amount');
  }

  console.log('\n=== ROWS AND SCREEN WIRING ===');
  {
    assert(paymentRow.includes('PAYMENT_KINDS'), '5G-39 PaymentRow imports PAYMENT_KINDS');
    assert(paymentRow.includes('isCreditCard'), '5G-40 PaymentRow derives isCreditCard');
    assert(!paymentRow.includes('creditCardBadge'), '5G-41 row no longer uses card-style badges');
    assert(financeScreen.includes('DirectCreditCardPaymentSheet'), '5G-42 FinanceScreen imports DirectCreditCardPaymentSheet');
    assert(financeScreen.includes('directCardPaymentVisible'), '5G-43 FinanceScreen owns direct card payment state');
    assert(financeScreen.includes('handleDirectCardPayment'), '5G-44 FinanceScreen opens direct card payment route');
    assert(financeScreen.includes('onCreditCardDuePress={handlePaymentPress}'), '5G-45 Payments card due route reuses Payment Detail');
    assert(financeScreen.includes('onDirectCardPayment={handleDirectCardPayment}'), '5G-46 Payments direct route reuses transfer sheet');
    assert(financeScreen.includes('onSuccess={handlePaymentRegisterSuccess}'), '5G-47 card mutation refresh uses shared success handler');
  }

  console.log('\n=== SERVICE TYPES AND FORMATTERS ===');
  {
    assert(financePayments.includes('SettleCreditCardPaymentDuePayload'), '5G-48 SettleCreditCardPaymentDuePayload type exists');
    assert(financePayments.includes('choosePrimaryCreditCardDue'), '5G-49 primary due helper is exported');
    assert(financePayments.includes('sourceAccountId: string'), '5G-50 payload has sourceAccountId');
    assert(financePayments.includes('destinationAmount?: string | null'), '5G-51 payload has optional destinationAmount');
    assert(financePayments.includes("CREDIT_CARD: 'CREDIT_CARD'"), '5G-52 CREDIT_CARD kind constant');
    equal(formatExpectedAmount(false, null, 'ARS'), 'Monto por definir', '5G-53 unknown amount is Monto por definir');
    equal(formatExpectedAmount(true, '180000', 'ARS'), '180.000 ARS', '5G-54 known amount formats with currency');
    equal(formatRecurrenceSummary(series({ recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH, recurrenceIntervalCount: 1 })), 'Se repite cada mes', '5G-55 monthly recurrence summary');
    assert(formatDueDateHuman(addDays(0), false) === 'Vence hoy', '5G-56 due today copy');
  }

  console.log(`\nFINANCE_5G_CREDIT_CARD_PAYMENT_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FINANCE_STAGE_5G_CREDIT_CARD_PAYMENT_FRONTEND_TESTS=PASS' : 'FINANCE_STAGE_5G_CREDIT_CARD_PAYMENT_FRONTEND_TESTS=FAIL');
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error('FINANCE_STAGE_5G_CREDIT_CARD_PAYMENT_FRONTEND_TESTS=ERROR');
  console.error(error);
  process.exit(1);
});
