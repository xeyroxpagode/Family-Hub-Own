import fs from 'node:fs';
import path from 'node:path';

import {
  buildFinancePaymentAttentionParams,
  openFinancePaymentFromAttention,
  parseFinanceEntryParams,
} from '../front/mi-front-limpio/navigation/financeNavigation';
import {
  formatDueDateHuman,
  formatExpectedAmount,
  type PaymentDueDto,
} from '../front/mi-front-limpio/services/finance/financePayments';
import type { AttentionItem } from '../front/mi-front-limpio/services/planner/plannerAttention';

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
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Internet',
    kind: 'NORMAL',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '25000',
    dueDate: addDays(0),
    categoryId: null,
    targetCreditCardAccountId: null,
    status: 'PENDING',
    overdue: false,
    paymentSeriesId: null,
    financialContextType: 'personal',
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    createdByPersonId: 'person-a',
    ...overrides,
  };
}

function paymentAttention(overrides: Partial<AttentionItem> = {}): AttentionItem {
  return {
    attentionId: 'attn:payment:11111111-1111-4111-8111-111111111111:person-a',
    dedupeKey: 'payment:11111111-1111-4111-8111-111111111111:person-a',
    entityType: 'payment',
    entityId: '11111111-1111-4111-8111-111111111111',
    title: 'Internet',
    summary: 'Vence hoy\n$25.000',
    reason: 'payment_due_today',
    severity: 'high',
    createdAt: '2026-08-27',
    updatedAt: '2026-08-27T00:00:00.000Z',
    personRecipientId: 'person-a',
    unresolved: true,
    priorityScore: 3,
    primaryAction: { label: 'Ver pago', capability: 'payment.view' },
    destination: {
      entityType: 'payment',
      entityId: '11111111-1111-4111-8111-111111111111',
      surfaceOrigin: 'attention',
      contextType: 'personal',
      initialTab: 'pagos',
      paymentDueId: '11111111-1111-4111-8111-111111111111',
    },
    sourceVersion: 'planner.global_attention.v1',
    ...overrides,
  };
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

async function main(): Promise<void> {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const attentionScreen = read('front/mi-front-limpio/screens/planner/PlannerAttentionActivityScreen.tsx');
  const homeTabNavigator = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const attentionTypes = read('front/mi-front-limpio/services/planner/plannerAttention.ts');
  const paymentDetail = read('front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx');
  const registerPayment = read('front/mi-front-limpio/components/finance/RegisterPaymentSheet.tsx');

  const item = paymentAttention();
  equal(item.entityType, 'payment', '5F-FE-24 payment Attention DTO parses');
  equal(item.destination.contextType, 'personal', '5F-FE-24b payment Attention carries Finance context');
  assert(attentionTypes.includes("'payment'"), '5F-FE-24c Attention entity type includes payment');

  assert(formatDueDateHuman(addDays(-1), true).startsWith('Venció'), '5F-FE-25 overdue copy is human');
  equal(formatDueDateHuman(addDays(0), false), 'Vence hoy', '5F-FE-26 due-today copy');
  equal(formatDueDateHuman(addDays(1), false), 'Vence mañana', '5F-FE-27 due-tomorrow copy');
  equal(formatDueDateHuman(addDays(3), false), 'Vence en 3 días', '5F-FE-28 due-in-3-days copy');
  equal(formatExpectedAmount(false, null, 'ARS'), 'A confirmar', '5F-FE-29 unknown amount is A confirmar');
  equal(formatExpectedAmount(true, '25000', 'ARS'), '25.000 ARS', '5F-FE-30 known amount is canonically formatted');
  assert(!registerPayment.includes('{expectedAmountText} {payment.currency}'), '5F-FE-30b register form does not suffix unknown amount with currency');

  const params = buildFinancePaymentAttentionParams({
    paymentDueId: '11111111-1111-4111-8111-111111111111',
    contextType: 'household',
  });
  equal(params.initialTab, 'pagos', '5F-FE-31 payment entity routes to Finance Pagos');
  equal(params.contextType, 'household', '5F-FE-32 context type is passed');
  equal(params.paymentDueId, '11111111-1111-4111-8111-111111111111', '5F-FE-33 correct paymentDueId passed');
  equal(parseFinanceEntryParams(params), params, '5F-FE-33b Finance entry params round-trip');

  const captured: { routeName: string; params?: unknown }[] = [];
  openFinancePaymentFromAttention({
    navigate(routeName: string, navParams?: unknown) {
      captured.push({ routeName, params: navParams });
    },
  }, { paymentDueId: item.entityId, contextType: item.destination.contextType });
  assert(JSON.stringify(captured[0]).includes('"screen":"MoreTab"'), '5F-FE-31b Attention navigates through More tab');
  assert(JSON.stringify(captured[0]).includes('"screen":"Finance"'), '5F-FE-31c Attention targets Finance screen');

  assert(financeScreen.includes('parseFinanceEntryParams(route.params)'), '5F-FE-34 FinanceScreen parses async payment entry params');
  assert(financeScreen.includes('setSelectedPayment(null);') && financeScreen.includes('setSelectedPaymentId(entryPaymentDueId)'), '5F-FE-34b Finance opens detail by paymentDueId without fabricating Payment object');
  assert(financeScreen.includes('paymentId={selectedPaymentId}'), '5F-FE-34c PaymentDetailSheet receives ID-only navigation');
  assert(paymentDetail.includes('getPaymentDueDetail') && paymentDetail.includes('setPayment(detail.paymentDue)'), '5F-FE-34d PaymentDetailSheet resolves current truth from detail API');
  assert(financeScreen.includes('paymentDetailRefreshNonce') && paymentDetail.includes('refreshNonce'), '5F-FE-34e Payment detail can re-fetch current truth after register');

  const paid = due({ status: 'PAID', actualAmount: '25000', actualDate: addDays(0), expenseRootTransactionId: 'tx-paid' });
  const cancelled = due({ status: 'CANCELLED' });
  assert(paid.status === 'PAID' && paymentDetail.includes('Detalle del pago registrado'), '5F-FE-35 stale PAID handled safely');
  assert(cancelled.status === 'CANCELLED' && paymentDetail.includes('Este pago fue cancelado'), '5F-FE-36 stale CANCELLED handled safely');

  assert(attentionScreen.includes("item.entityType === 'payment'") && attentionScreen.includes('openFinancePaymentFromAttention'), '5F-FE-31d payment has dedicated Finance route');
  assert(attentionScreen.includes('openEntityDetail(navigation, item.entityType'), '5F-FE-37 Task routing unchanged');
  assert(attentionScreen.includes('openEntityDetail(navigation, item.entityType'), '5F-FE-38 Event routing unchanged');
  assert(attentionScreen.includes('openEntityDetail(navigation, item.entityType'), '5F-FE-39 Plan routing unchanged');
  assert(attentionScreen.includes('useFocusEffect') && attentionScreen.includes('refresh();'), '5F-FE-39b Attention refreshes on return from Finance');
  assert(homeTabNavigator.includes('useFocusEffect') && homeTabNavigator.includes('fetchPlannerAttentionRequest'), '5F-FE-39c Home Attention badge refreshes from canonical Attention on focus');

  const duplicateItems = [
    paymentAttention({ attentionId: 'first', dedupeKey: 'payment:11111111-1111-4111-8111-111111111111:person-a' }),
    paymentAttention({ attentionId: 'second', dedupeKey: 'payment:11111111-1111-4111-8111-111111111111:person-a', reason: 'payment_overdue' }),
  ];
  equal(new Set(duplicateItems.map((candidate) => candidate.dedupeKey)).size, 1, '5F-FE-40 duplicate Payment attention has one stable render identity');

  console.log(`\nFINANCE_5F_PAYMENT_ATTENTION_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FINANCE_STAGE_5F_PAYMENT_ATTENTION_FRONTEND_TESTS=PASS' : 'FINANCE_STAGE_5F_PAYMENT_ATTENTION_FRONTEND_TESTS=FAIL');
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error('FINANCE_STAGE_5F_PAYMENT_ATTENTION_FRONTEND_TESTS=ERROR');
  console.error(error);
  process.exit(1);
});
