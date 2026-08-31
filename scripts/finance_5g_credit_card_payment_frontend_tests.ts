import fs from 'node:fs';
import path from 'node:path';

import {
  formatExpectedAmount,
  formatDueDateHuman,
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
  const paymentDetail = read('front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx');
  const payCreditCard = read('front/mi-front-limpio/components/finance/PayCreditCardSheet.tsx');
  const paymentRow = read('front/mi-front-limpio/components/finance/PaymentRow.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const financePayments = read('front/mi-front-limpio/services/finance/financePayments.ts');

  console.log('\n=== CREATION UX ===');
  {
    assert(newPayment.includes('KIND_OPTIONS'), '5G-01 kind options defined');
    assert(newPayment.includes("label: 'Pago'") && newPayment.includes("label: 'Tarjeta de crédito'"), '5G-02 human kind labels');
    assert(newPayment.includes('PAYMENT_KINDS.NORMAL') && newPayment.includes('PAYMENT_KINDS.CREDIT_CARD'), '5G-03 kind values used');
    assert(newPayment.includes('setKind(option.kind)'), '5G-04 kind selection updates state');
    assert(newPayment.includes('isCreditCard'), '5G-05 isCreditCard derived');

    assert(newPayment.includes('eligibleTargetCards'), '5G-06 target card eligibility hook');
    assert(newPayment.includes("operation: 'transfer-destination'"), '5G-07 target card uses transfer-destination operation');
    assert(newPayment.includes('targetCardSelectorVisible'), '5G-08 target card selector visible state');
    assert(newPayment.includes('AccountSelector'), '5G-09 AccountSelector used for target card');
    assert(newPayment.includes("allowNone={false}"), '5G-10 target card required (no none)');
    assert(newPayment.includes("operationHint=\"transfer-destination\""), '5G-11 target card operation hint');

    assert(newPayment.includes('targetCardId'), '5G-12 targetCardId state');
    assert(newPayment.includes('effectiveCurrency'), '5G-13 effectiveCurrency derives from target card');
    assert(newPayment.includes('targetCard.currency'), '5G-14 currency from target card');
    assert(newPayment.includes('isCreditCard && targetCard ? targetCard.currency : currency'), '5G-15 currency precedence correct');

    assert(newPayment.includes('!isCreditCard &&'), '5G-16 category hidden for CREDIT_CARD');
    assert(newPayment.includes('isCreditCard && targetCard &&'), '5G-17 summary shows target card name');
    assert(newPayment.includes('isCreditCard ?') && newPayment.includes('categoryId: selectedCategoryId'), '5G-18 NORMAL payload includes categoryId');
    assert(newPayment.includes('isCreditCard ? { targetCreditCardAccountId: targetCardId }'), '5G-19 CREDIT_CARD payload includes targetCreditCardAccountId');
    assert(!newPayment.match(/categoryId.*isCreditCard/), '5G-20 CREDIT_CARD payload excludes categoryId');
    assert(newPayment.includes('expectedAmountKnown ? amount.technicalValue!.amount : null'), '5G-21 amount handling for unknown');
    assert(newPayment.includes('canSubmit') && newPayment.includes('!isCreditCard || Boolean(targetCardId)'), '5G-22 submit requires target card for CREDIT_CARD');
  }

  console.log('\n=== PAYMENT DETAIL ===');
  {
    assert(paymentDetail.includes('onRegisterCreditCardPayment'), '5G-23 detail props include onRegisterCreditCardPayment');
    assert(paymentDetail.includes('showRegisterNormal') && paymentDetail.includes('showRegisterCreditCard'), '5G-24 separate show flags for kind');
    assert(paymentDetail.includes('title="Registrar pago"'), '5G-25 NORMAL shows Registrar pago');
    assert(paymentDetail.includes('title="Pagar tarjeta"'), '5G-26 CREDIT_CARD shows Pagar tarjeta');
    assert(!paymentDetail.includes('disabled={payment?.kind !== PAYMENT_KINDS.NORMAL}'), '5G-27 no disabled hack for register button');
    assert(paymentDetail.includes('payment?.kind === PAYMENT_KINDS.CREDIT_CARD && payment.targetCreditCard'), '5G-28 detail shows target card for CREDIT_CARD');
    assert(paymentDetail.includes('Tarjeta'), '5G-29 target card label in detail');
    assert(paymentDetail.includes('payment.kind === PAYMENT_KINDS.CREDIT_CARD && payment.actualAccountId'), '5G-30 paid detail shows source account for CREDIT_CARD');
    assert(paymentDetail.includes('Pagado desde'), '5G-31 paid detail label "Pagado desde"');
    assert(!paymentDetail.includes('payment.actualCategoryId') || paymentDetail.includes('payment.kind === PAYMENT_KINDS.NORMAL'), '5G-32 category only shown for NORMAL paid');
    assert(paymentDetail.includes('payment.kind === PAYMENT_KINDS.NORMAL && payment.actualCategoryId'), '5G-33 NORMAL paid shows category');
  }

  console.log('\n=== PAY CREDIT CARD SHEET ===');
  {
    assert(payCreditCard.includes('PayCreditCardSheet'), '5G-34 component exists');
    assert(payCreditCard.includes('registerCreditCardPayment'), '5G-35 uses registerCreditCardPayment');
    assert(payCreditCard.includes('eligibleSourceAccounts'), '5G-36 source account eligibility hook');
    assert(payCreditCard.includes("operation: 'transfer-source'"), '5G-37 source uses transfer-source operation');
    assert(payCreditCard.includes('allowNone={false}'), '5G-38 source account required (no none)');
    assert(payCreditCard.includes("operationHint=\"transfer-source\""), '5G-39 source account operation hint');
    assert(payCreditCard.includes('isCrossCurrency'), '5G-40 cross-currency detection');
    assert(payCreditCard.includes('payment?.targetCreditCard && payment.currency !== payment.targetCreditCard.currency'), '5G-41 cross-currency based on target card currency');
    assert(payCreditCard.includes('destinationAmount'), '5G-42 destination amount state');
    assert(payCreditCard.includes('handleDestinationAmountChange'), '5G-43 destination amount handler');
    assert(payCreditCard.includes('Monto a acreditar en la tarjeta'), '5G-44 destination amount label');
    assert(payCreditCard.includes('Monto que sale de la cuenta de origen'), '5G-45 source amount label for cross-currency');
    assert(payCreditCard.includes('Monto a pagar'), '5G-46 single amount label for same-currency');
    assert(payCreditCard.includes('destinationAmount.technicalValue.amount'), '5G-47 payload includes destinationAmount for cross-currency');
    assert(payCreditCard.includes('sourceAccountId: selectedAccountId'), '5G-48 payload includes sourceAccountId');
    assert(!payCreditCard.includes('actualCategoryId'), '5G-49 no category field in sheet');
    assert(payCreditCard.includes('Pagar tarjeta'), '5G-50 submit button says Pagar tarjeta');
    assert(payCreditCard.includes('Pagar a'), '5G-51 shows fixed destination card');
    assert(payCreditCard.includes('payment.targetCreditCard?.name'), '5G-52 destination card name displayed');
    assert(payCreditCard.includes('canSubmit') && payCreditCard.includes('Boolean(selectedAccountId)'), '5G-53 submit requires source account');
    assert(payCreditCard.includes('No tenés cuentas disponibles para pagar esta tarjeta'), '5G-54 empty source account error message');
  }

  console.log('\n=== PAYMENT ROW ===');
  {
    assert(paymentRow.includes('PAYMENT_KINDS'), '5G-55 imports PAYMENT_KINDS');
    assert(paymentRow.includes('isCreditCard'), '5G-56 derives isCreditCard');
    assert(paymentRow.includes('badgesRow'), '5G-57 badgesRow container');
    assert(paymentRow.includes('creditCardBadge'), '5G-58 creditCardBadge style');
    assert(paymentRow.includes('Tarjeta de crédito'), '5G-59 credit card badge text');
    assert(paymentRow.includes('colors.terracotta[50]'), '5G-60 credit card badge uses terracotta');
  }

  console.log('\n=== FINANCE SCREEN WIRING ===');
  {
    assert(financeScreen.includes('PayCreditCardSheet'), '5G-61 imports PayCreditCardSheet');
    assert(financeScreen.includes('payCreditCardVisible'), '5G-62 payCreditCardVisible state');
    assert(financeScreen.includes('handleRegisterCreditCardPayment'), '5G-63 handleRegisterCreditCardPayment function');
    assert(financeScreen.includes('setPayCreditCardVisible(true)'), '5G-64 opens PayCreditCardSheet');
    assert(financeScreen.includes('onRegisterCreditCardPayment={handleRegisterCreditCardPayment}'), '5G-65 passes handler to PaymentDetailSheet');
    assert(financeScreen.includes('<PayCreditCardSheet'), '5G-66 renders PayCreditCardSheet');
    assert(financeScreen.includes('onSuccess={handlePaymentRegisterSuccess}'), '5G-67 PayCreditCardSheet uses shared success handler');
  }

  console.log('\n=== SERVICE TYPES ===');
  {
    assert(financePayments.includes('RegisterCreditCardPaymentPayload'), '5G-68 RegisterCreditCardPaymentPayload type exists');
    assert(financePayments.includes('sourceAccountId: string'), '5G-69 payload has sourceAccountId');
    assert(financePayments.includes('destinationAmount?: string | null'), '5G-70 payload has optional destinationAmount');
    assert(financePayments.includes('registerCreditCardPayment'), '5G-71 registerCreditCardPayment function exported');
    assert(financePayments.includes("CREDIT_CARD: 'CREDIT_CARD'"), '5G-72 CREDIT_CARD kind constant');
  }

  console.log('\n=== FORMATTERS ===');
  {
    equal(formatExpectedAmount(false, null, 'ARS'), 'A confirmar', '5G-73 unknown amount is A confirmar');
    equal(formatExpectedAmount(true, '180000', 'ARS'), '180.000 ARS', '5G-74 known amount formats with currency');
    equal(formatRecurrenceSummary(series({ recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH, recurrenceIntervalCount: 1 })), 'Se repite cada mes', '5G-75 monthly recurrence summary');
    assert(formatDueDateHuman(addDays(0), false) === 'Vence hoy', '5G-76 due today copy');
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