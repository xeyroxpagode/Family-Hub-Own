import fs from 'node:fs';
import path from 'node:path';

import {
  cancelPaymentDue,
  cancelPaymentSeries,
  createOneOffPaymentDue,
  createPaymentSeries,
  editPaymentDue,
  editPaymentSeries,
  formatDueDateHuman,
  formatExpectedAmount,
  formatRecurrenceSummary,
  groupPaymentDuesByStatus,
  listPaymentDues,
  PAYMENT_DUE_STATUSES,
  PAYMENT_KINDS,
  RECURRENCE_UNITS,
  registerNormalPayment,
  sortPaymentDuesForDisplay,
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

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) console.error(error.stack);
  }
}

function addDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function series(overrides: Partial<PaymentSeriesDto> = {}): PaymentSeriesDto {
  return {
    id: 'series-1',
    title: 'Internet',
    kind: PAYMENT_KINDS.NORMAL,
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '25000',
    defaultCategoryId: null,
    targetCreditCardAccountId: null,
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: addDays(1),
    status: 'ACTIVE',
    financialContextType: 'personal',
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    createdByPersonId: 'person-1',
    ...overrides,
  };
}

function due(overrides: Partial<PaymentDueDto> = {}): PaymentDueDto {
  return {
    id: 'due-1',
    title: 'Internet',
    kind: PAYMENT_KINDS.NORMAL,
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '25000',
    dueDate: addDays(1),
    categoryId: null,
    targetCreditCardAccountId: null,
    status: PAYMENT_DUE_STATUSES.PENDING,
    overdue: false,
    paymentSeriesId: null,
    financialContextType: 'personal',
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    createdByPersonId: 'person-1',
    ...overrides,
  };
}

type CapturedRequest = {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
};

async function withFetchCapture<T>(fn: (requests: CapturedRequest[]) => Promise<T>): Promise<T> {
  const requests: CapturedRequest[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : null;
    requests.push({ url: String(input), method: init?.method ?? 'GET', body });
    return new Response(JSON.stringify(mockResponse(String(input))), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    return await fn(requests);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function mockResponse(url: string): unknown {
  if (url.includes('/payments/series') && !url.includes('/cancel')) {
    return { paymentSeries: [series()] };
  }
  if (url.includes('/payments/dues') && !url.includes('/register') && !url.includes('/cancel')) {
    return { paymentDues: [due()] };
  }
  if (url.includes('/payments/dues/') && url.includes('/register')) {
    return { paymentDue: due({ status: PAYMENT_DUE_STATUSES.PAID, actualAmount: '26450', actualDate: addDays(0), expenseRootTransactionId: 'expense-1' }) };
  }
  if (url.includes('/payments/dues/') && url.includes('/cancel')) {
    return { paymentDue: due({ status: PAYMENT_DUE_STATUSES.CANCELLED }) };
  }
  if (url.includes('/payments/series/') && url.includes('/cancel')) {
    return { paymentSeries: series({ status: 'CANCELLED' }) };
  }
  if (url.includes('/payments/series/')) {
    return { paymentSeries: series(), currentDue: due() };
  }
  return { paymentDue: due() };
}

function hookSignature(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.match(/\b(useState|useRef|useEffect|useMemo|useCallback)(?:<[^>]+>)?\s*\(/)?.[1])
    .filter((hook): hook is string => Boolean(hook));
}

function lineNumberOf(source: string, needle: string): number {
  const index = source.split(/\r?\n/).findIndex((line) => line.includes(needle));
  return index === -1 ? -1 : index + 1;
}

function linesMatching(source: string, pattern: RegExp): number[] {
  return source
    .split(/\r?\n/)
    .map((line, index) => pattern.test(line) ? index + 1 : -1)
    .filter((line) => line !== -1);
}

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

async function main(): Promise<void> {
  const root = process.cwd();

  await runTest('5E source wiring removes placeholder and owns Payments surfaces', () => {
    const financeScreen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinanceScreen.tsx'), 'utf8');
    const paymentsList = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentsList.tsx'), 'utf8');
    const paymentRow = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentRow.tsx'), 'utf8');
    const newPayment = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/NewPaymentSheet.tsx'), 'utf8');
    const registerPayment = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/RegisterPaymentSheet.tsx'), 'utf8');
    const editPayment = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/EditPaymentDueSheet.tsx'), 'utf8');
    const paymentDetail = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx'), 'utf8');
    const paymentController = fs.readFileSync(path.join(root, 'backend/src/controllers/finance.payment.controller.js'), 'utf8');

    assert(!financeScreen.includes('Los pagos esperados se integran en su etapa propia'), '1 placeholder development copy removed');
    assert(financeScreen.includes('<PaymentsList'), '2 Pagos tab renders PaymentsList');
    assert(financeScreen.includes('<NewPaymentSheet'), '3 creation sheet wired');
    assert(financeScreen.includes('<RegisterPaymentSheet'), '4 register sheet wired');
    assert(financeScreen.includes('<EditPaymentDueSheet'), '5 unified edit sheet wired');
    assert(!financeScreen.includes('<PaymentRecurrenceEditor'), '6 standalone recurrence editor is not user-facing from detail');
    assert(paymentsList.includes('No tenés pagos pendientes'), '7 empty state copy is user-facing');
    assert(paymentsList.includes('Agregar pago'), '8 empty state action exists');
    assert(newPayment.includes('kind: PAYMENT_KINDS.NORMAL'), '9 create flow is NORMAL-only in 5E');
    assert(registerPayment.includes('isNormal && amount.isValid'), '10 CREDIT_CARD cannot use NORMAL register form');
    assert(editPayment.includes('editPaymentDue') && editPayment.includes('editPaymentSeries'), '11 unified edit sheet keeps due and series endpoint clients');
    assert(paymentDetail.includes('title={payment?.title ?? \'Detalle del pago\'}'), '12 Payment Detail title is null-safe');
    assert(paymentController.includes('bodyWithoutContextRoutingFields') && paymentController.includes('paymentService.editPaymentDue(financeContext, dueId, bodyWithoutContextRoutingFields(req.body))'), '13 edit due strips context routing fields after controller resolves context');
  });

  await runTest('5E Payment Detail action hierarchy and scoped edit/cancel UX', () => {
    const financeScreen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinanceScreen.tsx'), 'utf8');
    const editPayment = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/EditPaymentDueSheet.tsx'), 'utf8');
    const paymentDetail = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx'), 'utf8');

    assert(paymentDetail.includes('title="Registrar pago"'), '5E-1 PENDING NORMAL exposes Registrar pago');
    assert(paymentDetail.includes('title="Editar"'), '5E-2 PENDING exposes unified Editar action');
    assert(paymentDetail.includes('title="Cancelar"'), '5E-3 PENDING exposes unified Cancelar action');
    assert(!paymentDetail.includes('title="Editar este pago"'), '5E-4 no top-level Editar este pago');
    assert(!paymentDetail.includes('title="Editar recurrencia"'), '5E-5 no top-level Editar recurrencia');
    assert(!paymentDetail.includes('title="Cancelar este pago"'), '5E-6 no top-level Cancelar este pago');
    assert(!paymentDetail.includes('title="Cancelar recurrencia"'), '5E-7 no top-level Cancelar recurrencia');
    assert(paymentDetail.includes('showRegisterNormal = pending && payment?.kind === PAYMENT_KINDS.NORMAL'), '5E-8 CREDIT_CARD is not sent through NORMAL register');
    assert(paymentDetail.includes('{!paid && !cancelled && ('), '5E-9 PAID/CANCELLED hide active management actions');
    assert(paymentDetail.includes('Ver movimiento'), '5E-10 PAID keeps Ver movimiento as useful action');

    assert(editPayment.includes("const [editScope, setEditScope] = useState<EditScope>('single')"), '5E-11 recurring edit defaults to Solo este pago');
    assert(editPayment.includes('Aplicar cambios a'), '5E-12 recurring edit has scope selector');
    assert(editPayment.includes('Solo este pago') && editPayment.includes('Este y los siguientes'), '5E-13 edit uses user intent scope labels');
    assert(editPayment.includes("editScope === 'single' ?"), '5E-14 single scope exposes due fields only');
    assert(editPayment.includes("label=\"Vencimiento\""), '5E-15 single scope exposes Vencimiento');
    assert(editPayment.includes("label=\"Fecha base\"") && editPayment.includes('Frecuencia'), '5E-16 series scope exposes recurrence controls');
    assert(editPayment.includes('Personalizado'), '5E-17 recurrence controls include Personalizado');
    assert(editPayment.includes('await editPaymentDue(accessToken, contextType, payment.id'), '5E-18 Solo este pago uses Due edit mutation');
    assert(editPayment.includes('await editPaymentSeries(accessToken, contextType, activeSeries.id'), '5E-19 Este y los siguientes uses Series edit mutation');
    assert(countOccurrences(editPayment, 'label="Nombre / título"') === 1, '5E-20 shared title field is not duplicated into simultaneous forms');
    assert(countOccurrences(editPayment, 'label="Monto esperado"') === 1, '5E-21 shared amount field is not duplicated into simultaneous forms');
    assert(countOccurrences(editPayment, 'label="Categoría"') === 1, '5E-22 shared category field is not duplicated into simultaneous forms');

    assert(paymentDetail.includes('¿Qué querés cancelar?'), '5E-23 recurring cancel asks for scope');
    assert(paymentDetail.includes("setCancelScope('single')"), '5E-24 cancel defaults to Solo este pago');
    assert(paymentDetail.includes("cancelScope === 'series'"), '5E-25 recurring cancel can select future scope');
    assert(paymentDetail.includes('await cancelPaymentDue(accessToken, contextType, payment.id)'), '5E-26 Solo este pago cancellation uses Due cancel mutation');
    assert(paymentDetail.includes('await cancelPaymentSeries(accessToken, contextType, series.id)'), '5E-27 Este y los siguientes cancellation uses Series cancel mutation');
    assert(paymentDetail.includes('Este pago dejará de estar pendiente.'), '5E-28 one-off cancel has compact direct confirmation');
    assert(paymentDetail.includes('<ActionSheet') && paymentDetail.includes('size="content"'), '5E-29 cancel/detail sheets use content-sized contract');
    assert(!financeScreen.includes('paymentRecurrenceEditorVisible'), '5E-30 FinanceScreen removed duplicate recurrence modal state');
  });

  await runTest('5E list presentation and ordering helpers', () => {
    const paymentRow = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentRow.tsx'), 'utf8');
    const overdue = due({ id: 'overdue', title: 'Alquiler', dueDate: addDays(-2), overdue: true });
    const today = due({ id: 'today', title: 'Luz', dueDate: addDays(0), overdue: false });
    const future = due({ id: 'future', title: 'Internet', dueDate: addDays(3), overdue: false, paymentSeriesId: 'series-1', paymentSeries: series() });
    const paid = due({ id: 'paid', title: 'Seguro', status: PAYMENT_DUE_STATUSES.PAID, dueDate: addDays(-10), actualAmount: '1000', actualDate: addDays(-9) });
    const cancelled = due({ id: 'cancelled', title: 'Cancelado', status: PAYMENT_DUE_STATUSES.CANCELLED, dueDate: addDays(-20), overdue: false });
    const sorted = sortPaymentDuesForDisplay([paid, future, cancelled, today, overdue]);
    const grouped = groupPaymentDuesByStatus(sorted);

    equal(sorted[0].id, 'overdue', '13 overdue sorts first');
    equal(sorted[1].id, 'today', '14 due today sorts before upcoming');
    equal(sorted[2].id, 'future', '15 upcoming sorts before paid');
    equal(grouped.overdue.map((item) => item.id), ['overdue'], '16 overdue group only pending overdue');
    equal(grouped.upcoming.map((item) => item.id), ['today', 'future'], '17 upcoming group pending not overdue');
    equal(grouped.paid.map((item) => item.id), ['paid'], '18 paid history group');
    assert(!grouped.overdue.some((item) => item.id === 'cancelled'), '19 cancelled is not payable overdue');
    assert(!grouped.upcoming.some((item) => item.id === 'cancelled'), '20 cancelled is not payable upcoming');
    assert(paymentRow.includes('formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency)'), '20b row amount uses canonical Finance formatter when currency is known');
    assert(!paymentRow.includes('Se repite cada ${recurrenceIntervalCount}'), '20c row does not duplicate singular recurrence formatting');
    equal(formatExpectedAmount(false, null), 'A confirmar', '21 unknown amount renders A confirmar');
    equal(formatExpectedAmount(true, '25000'), '25000', '22 known amount preserved for formatting');
    equal(formatExpectedAmount(true, '25000', 'ARS'), '25.000 ARS', '22b known amount formats canonically with currency');
    assert(formatDueDateHuman(addDays(-1), true).includes('Venció'), '23 overdue copy is human');
    equal(formatDueDateHuman(addDays(0), false), 'Vence hoy', '24 today copy');
    equal(formatDueDateHuman(addDays(1), false), 'Vence mañana', '25 tomorrow copy');
    equal(formatExpectedAmount(true, null), 'A confirmar', '26 missing amount does not render fake zero');
    equal(formatRecurrenceSummary(series({ recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH, recurrenceIntervalCount: 1 })), 'Se repite cada mes', '27 monthly recurrence summary uses singular human copy');
    equal(formatRecurrenceSummary(series({ recurrenceIntervalUnit: RECURRENCE_UNITS.WEEK, recurrenceIntervalCount: 2 })), 'Se repite cada 2 semanas', '27 biweekly recurrence summary');
    equal(formatRecurrenceSummary(series({ recurrenceIntervalUnit: RECURRENCE_UNITS.DAY, recurrenceIntervalCount: 30 })), 'Se repite cada 30 días', '28 custom day recurrence summary');
    assert(future.paymentSeriesId === 'series-1' && future.paymentSeries !== null, '29 recurring due can carry series summary data');
  });

  await runTest('5E PaymentDetailSheet hook order and transition coverage', () => {
    const paymentDetail = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/PaymentDetailSheet.tsx'), 'utf8');
    const earlyReturnLines = linesMatching(paymentDetail, /^\s*if\s*\([^)]*\)\s*return\s+null;/);
    const hookLines = linesMatching(paymentDetail, /\b(useState|useRef|useEffect|useMemo|useCallback)(?:<[^>]+>)?\s*\(/);
    const lastHookLine = Math.max(...hookLines);

    assert(hookSignature(paymentDetail).length >= 10, '30 PaymentDetailSheet hook signature remains non-trivial and guarded');
    assert(earlyReturnLines.every((line) => line > lastHookLine), '31 no early return appears before the final hook');
    assert(lineNumberOf(paymentDetail, 'if (!visible) return null;') > lastHookLine, '32 closed/no Payment guard runs after all hooks');
    assert(lineNumberOf(paymentDetail, "payment ? formatExpectedAmount") > 0, '33 amount memo tolerates missing Payment');
    assert(lineNumberOf(paymentDetail, "payment ? formatDueDateHuman") > 0, '34 due-date memo tolerates missing Payment');
    assert(paymentDetail.includes('loading ? ('), '35 open before detail load renders loading branch safely');
    assert(paymentDetail.includes("Cargando..."), '36 loading branch has stable content');
    assert(paymentDetail.includes(') : error ? ('), '37 detail load error branch is guarded inside render');
    assert(paymentDetail.includes(') : payment ? ('), '38 detail arrives renders payment branch');
    assert(paymentDetail.includes("title={payment?.title ?? 'Detalle del pago'}"), '39 close/reopen without selected Payment remains null-safe');
    assert(paymentDetail.includes('[visible, paymentId, accessToken, contextType, refreshNonce]'), '40 same/different Payment reopen reloads by paymentId');
    assert(paymentDetail.includes('setPayment(null);') && paymentDetail.includes('setSeries(null);'), '41 closing clears selected detail state');
    assert(paymentDetail.includes('showRegisterNormal = pending') || paymentDetail.includes('showRegisterCreditCard = pending'), '42 PENDING one-off exposes register path');
    assert(paymentDetail.includes('formatRecurrenceSummary(series)'), '43 PENDING recurring renders recurrence summary');
    assert(paymentDetail.includes('Detalle del pago registrado'), '44 PAID state renders registered-payment detail');
    assert(paymentDetail.includes('Este pago fue cancelado'), '45 CANCELLED state renders cancelled detail');
    assert(paymentDetail.includes("import { ScrollView, StyleSheet, View } from 'react-native'"), '46 Payment Detail owns a scrollable body');
    assert(paymentDetail.includes('size="content"'), '47 Payment Detail keeps the accepted content-sized sheet contract');
    assert(paymentDetail.includes('<ScrollView') && paymentDetail.includes('contentContainerStyle={styles.content}'), '48 Payment Detail body is mounted inside the scroll content owner');
    assert(paymentDetail.includes('nestedScrollEnabled'), '49 Payment Detail allows nested Android scrolling inside the sheet');
    assert(!paymentDetail.includes('styles.container'), '50 Payment Detail does not wrap compact sheet content in a flex root');
    assert(!/container:\s*{[^}]*flex:\s*1/s.test(paymentDetail), '51 Payment Detail has no flex-only compact-sheet container');
    assert(!/height:\s*(?:['"]\d+%['"]|\d{3,})/.test(paymentDetail), '52 Payment Detail does not use a fixed-height workaround');
  });

  await runTest('5E payment client payload contracts', async () => {
    await withFetchCapture(async (requests) => {
      await listPaymentDues({ accessToken: 'token', contextType: 'personal' });
      assert(requests[0].url.endsWith('/api/finance/payments/dues?contextType=personal'), '46 list dues uses context and no status narrowing');
      equal(requests[0].method, 'GET', '47 list dues GET');
    });

    await withFetchCapture(async (requests) => {
      await createOneOffPaymentDue('token', 'personal', {
        kind: PAYMENT_KINDS.NORMAL,
        title: 'Luz',
        currency: 'ARS',
        expectedAmountKnown: false,
        expectedAmount: null,
        dueDate: addDays(5),
      });
      equal(requests[0].method, 'POST', '48 one-off create POST');
      equal(requests[0].body?.kind, PAYMENT_KINDS.NORMAL, '49 one-off create NORMAL kind');
      equal(requests[0].body?.expectedAmountKnown, false, '50 one-off unknown amount flag');
      equal(requests[0].body?.expectedAmount, null, '51 one-off unknown amount null');
      assert(!('account' in (requests[0].body ?? {})) && !('accountId' in (requests[0].body ?? {})), '52 create does not request/store account');
      assert(Boolean(requests[0].body?.mutationId) && Boolean(requests[0].body?.idempotencyKey) && Boolean(requests[0].body?.payloadHash), '53 create includes idempotency identity');
    });

    await withFetchCapture(async (requests) => {
      await createPaymentSeries('token', 'personal', {
        kind: PAYMENT_KINDS.NORMAL,
        title: 'Internet',
        currency: 'ARS',
        defaultExpectedAmountKnown: true,
        defaultExpectedAmount: '25000',
        recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
        recurrenceIntervalCount: 1,
        recurrenceAnchorDate: addDays(10),
      });
      assert(requests[0].url.endsWith('/api/finance/payments/series'), '54 recurring create uses series endpoint');
      equal(requests[0].body?.recurrenceIntervalUnit, RECURRENCE_UNITS.MONTH, '55 recurring monthly unit');
      equal(requests[0].body?.recurrenceIntervalCount, 1, '56 recurring monthly count');
    });

    await withFetchCapture(async (requests) => {
      await editPaymentDue('token', 'personal', 'due-1', {
        title: 'Internet actualizado',
        expectedAmountKnown: true,
        expectedAmount: '26000',
        dueDate: addDays(6),
        clearCategory: true,
      });
      equal(requests[0].method, 'PATCH', '57 edit due PATCH');
      assert(requests[0].url.includes('/api/finance/payments/dues/due-1'), '58 edit due targets due endpoint');
      equal(requests[0].body?.clearCategory, true, '59 edit due can clear category');
    });

    await withFetchCapture(async (requests) => {
      await editPaymentSeries('token', 'personal', 'series-1', {
        recurrenceIntervalUnit: RECURRENCE_UNITS.DAY,
        recurrenceIntervalCount: 30,
        recurrenceAnchorDate: addDays(1),
      });
      equal(requests[0].method, 'PATCH', '60 edit recurrence PATCH');
      assert(requests[0].url.includes('/api/finance/payments/series/series-1'), '61 edit recurrence uses series endpoint');
      equal(requests[0].body?.recurrenceIntervalCount, 30, '62 custom recurrence interval sent');
    });

    await withFetchCapture(async (requests) => {
      await cancelPaymentDue('token', 'personal', 'due-1');
      await cancelPaymentSeries('token', 'personal', 'series-1');
      assert(requests[0].url.includes('/payments/dues/due-1/cancel'), '63 cancel occurrence uses due cancel endpoint');
      assert(requests[1].url.includes('/payments/series/series-1/cancel'), '64 cancel series uses series cancel endpoint');
    });

    await withFetchCapture(async (requests) => {
      await registerNormalPayment('token', 'personal', 'due-1', {
        actualAmount: '26450',
        actualDate: addDays(0),
        actualCategoryId: null,
        actualAccountId: null,
      });
      assert(requests[0].url.includes('/payments/dues/due-1/register'), '65 register normal uses register endpoint');
      equal(requests[0].body?.actualAmount, '26450', '66 register actual amount sent');
      equal(requests[0].body?.actualDate, addDays(0), '67 register actual date sent');
      assert(!('sourceAccountId' in (requests[0].body ?? {})), '68 normal register never sends credit-card source account');
    });
  });

  console.log(`\nFINANCE_5E_PAYMENTS_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FINANCE_STAGE_5E_PAYMENTS_FRONTEND_TESTS=PASS' : 'FINANCE_STAGE_5E_PAYMENTS_FRONTEND_TESTS=FAIL');
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
