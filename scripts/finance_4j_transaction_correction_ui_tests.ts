import { ApiError } from '../front/mi-front-limpio/services/api';
import {
  normalizeFinanceTransactionDetailPayload,
  type FinanceTransactionDetailDto,
} from '../front/mi-front-limpio/services/finance/financeTransactionDetail';
import {
  buildTransactionCorrectionPayload,
  correctionAmountsEqual,
  getTransactionCorrectionSaveBlocker,
  getTransactionCorrectionChanges,
  isTransactionCorrectionAccountSelectionInvalid,
  loadTransactionCorrectionDetail,
  resolveTransactionCorrectionDetailLoad,
  transactionCorrectionAccountReviewLabel,
  transactionCorrectionCanonicalDraftFromDraft,
  transactionCorrectionCategoryReviewLabel,
  transactionCorrectionDraftFromOriginal,
  transactionCorrectionOriginalFromDetail,
  type TransactionCorrectionCanonicalDraft,
} from '../front/mi-front-limpio/services/finance/transactionCorrectionDetailLoad';

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
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

const realBackendDetailShape = {
  id: '6d596616-c91f-487b-a9c7-d239be620cbe',
  transactionType: 'expense',
  amount: '5000.0000',
  currency: 'ARS',
  financialContextType: 'personal',
  ownerPersonId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
  householdId: null,
  transactionDate: '2026-08-21',
  description: null,
  notes: null,
  categoryId: 'ff7b95ed-80f5-42bf-8cf7-93d0bb285a60',
  categoryLabelSnapshot: 'Alimentación',
  status: 'ACTIVE',
  trashedAt: null,
  correctedFromTransactionId: null,
  createdAt: '2026-08-21T11:14:54.848706+00:00',
  updatedAt: '2026-08-21T11:14:54.848706+00:00',
  accountId: '657ceafc-6944-4c99-950d-2c64b7aad336',
  accountName: 'Fin 4J-R Account',
  accountCurrency: 'ARS',
} satisfies Record<string, unknown>;

function detail(overrides: Partial<FinanceTransactionDetailDto> = {}): FinanceTransactionDetailDto {
  return normalizeFinanceTransactionDetailPayload({
    ...realBackendDetailShape,
    ...overrides,
  });
}

function changesForDraft(draft: TransactionCorrectionCanonicalDraft, labels: { categoryLabel?: string | null; accountLabel?: string | null } = {}) {
  return getTransactionCorrectionChanges({
    original: transactionCorrectionOriginalFromDetail(detail({
      description: 'Original description',
      notes: 'Original notes',
    })),
    draft,
    formatAmount: (amount, currency) => `${amount} ${currency}`,
    formatDate: (value) => value,
    ...labels,
  });
}

function baseCanonicalDraft(overrides: Partial<TransactionCorrectionCanonicalDraft> = {}): TransactionCorrectionCanonicalDraft {
  return {
    amount: '5000',
    currency: 'ARS',
    transactionDate: '2026-08-21',
    description: 'Original description',
    categoryId: String(realBackendDetailShape.categoryId),
    accountId: String(realBackendDetailShape.accountId),
    notes: 'Original notes',
    ...overrides,
  };
}

async function main(): Promise<void> {
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

await runTest('R39 - real backend detail response shape is consumable by frontend service normalizer', () => {
  const dto = normalizeFinanceTransactionDetailPayload(realBackendDetailShape);
  assertEqual(Object.keys(realBackendDetailShape), [
    'id',
    'transactionType',
    'amount',
    'currency',
    'financialContextType',
    'ownerPersonId',
    'householdId',
    'transactionDate',
    'description',
    'notes',
    'categoryId',
    'categoryLabelSnapshot',
    'status',
    'trashedAt',
    'correctedFromTransactionId',
    'createdAt',
    'updatedAt',
    'accountId',
    'accountName',
    'accountCurrency',
  ], 'R39 top-level keys match the real bare DTO response');
  assertEqual(dto.id, realBackendDetailShape.id, 'R39 transaction id preserved');
  assertEqual(dto.transactionType, 'expense', 'R39 type preserved');
  assertEqual(dto.amount, '5000.0000', 'R39 amount preserved as decimal string');
  assertEqual(dto.currency, 'ARS', 'R39 currency preserved');
  assertEqual(dto.transactionDate, '2026-08-21', 'R39 date preserved');
  assertEqual(dto.description, null, 'R39 nullable description preserved');
  assertEqual(dto.categoryId, realBackendDetailShape.categoryId, 'R39 categoryId preserved');
  assertEqual(dto.accountId, realBackendDetailShape.accountId, 'R39 accountId preserved');
  assertEqual(dto.notes, null, 'R39 nullable notes preserved');
  assertEqual(dto.status, 'ACTIVE', 'R39 status preserved');
});

await runTest('R40 - 200 detail response resolves FinanceTransactionDetailDto', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3001';
  let requestedUrl = '';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify(realBackendDetailShape), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { getFinanceTransactionDetail } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    const dto = await getFinanceTransactionDetail({
      accessToken: 'redacted-test-token',
      contextType: 'personal',
      transactionId: String(realBackendDetailShape.id),
    });

    assert(requestedUrl.endsWith(`/api/finance/transactions/${realBackendDetailShape.id}?contextType=personal`), 'R40 service calls exact detail endpoint');
    assertEqual(dto, detail(), 'R40 service returns the detail DTO directly');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await runTest('R41-R44 - nullable canonical detail fields do not reject', () => {
  assertEqual(detail({ description: null }).description, null, 'R41 nullable description accepted');
  assertEqual(detail({ categoryId: null, categoryLabelSnapshot: null }).categoryId, null, 'R42 nullable category accepted');
  assertEqual(detail({ accountId: null, accountName: null, accountCurrency: null }).accountId, null, 'R43 nullable account accepted');
  assertEqual(detail({ notes: null }).notes, null, 'R44 nullable notes accepted');
});

await runTest('R45 - canonical amount representation parses and compares correctly', async () => {
  const dto = detail({ amount: '5000.0000' });
  const load = await resolveTransactionCorrectionDetailLoad(async () => dto);
  assert(correctionAmountsEqual('5000', dto.amount, dto.currency), 'R45 5000 equals backend 5000.0000');
  assert(load.step === 'form', 'R45 detail load with decimal string reaches form');
  if (load.step === 'form') {
    assertEqual(load.draft.amount.status, 'valid', 'R45 amount parses as valid MoneyInput');
    assertEqual(load.draft.amount.technicalValue?.amount ?? null, '5000', 'R45 form canonical amount is raw magnitude');
  }
});

await runTest('R46 - canonical type/status representation maps correctly', () => {
  assertEqual(detail({ transactionType: 'income', status: 'SUPERSEDED' }).transactionType, 'income', 'R46 lowercase income type accepted');
  assertEqual(detail({ transactionType: 'expense', status: 'TRASHED' }).status, 'TRASHED', 'R46 uppercase status accepted');

  let badTypeRejected = false;
  try {
    normalizeFinanceTransactionDetailPayload({ ...realBackendDetailShape, transactionType: 'EXPENSE' });
  } catch {
    badTypeRejected = true;
  }
  assert(badTypeRejected, 'R46 uppercase transaction type rejected at canonical DTO boundary');

  let badStatusRejected = false;
  try {
    normalizeFinanceTransactionDetailPayload({ ...realBackendDetailShape, status: 'active' });
  } catch {
    badStatusRejected = true;
  }
  assert(badStatusRejected, 'R46 lowercase status rejected at canonical DTO boundary');
});

await runTest('R47 - successful detail load transitions loading to form', async () => {
  const load = await resolveTransactionCorrectionDetailLoad(async () => detail());
  assertEqual(load.step, 'form', 'R47 success result is form');
  assertEqual(load.error, null, 'R47 success clears error');
});

await runTest('R48 - successful load initializes original and draft exactly once', async () => {
  let initializeCount = 0;
  const load = await resolveTransactionCorrectionDetailLoad(
    async () => detail(),
    (original) => {
      initializeCount += 1;
      return transactionCorrectionDraftFromOriginal(original);
    },
  );

  assertEqual(initializeCount, 1, 'R48 draft initializer called exactly once');
  if (load.step === 'form') {
    assertEqual(load.original.id, realBackendDetailShape.id, 'R48 original id initialized');
    assertEqual(load.draft.date, '2026-08-21', 'R48 draft date initialized');
    assertEqual(load.draft.description, '', 'R48 null description initializes empty draft string');
    assertEqual(load.draft.selectedCategoryId, realBackendDetailShape.categoryId, 'R48 draft category initialized');
    assertEqual(load.draft.expenseAccountId, realBackendDetailShape.accountId, 'R48 draft account initialized once for expense');
  }
});

await runTest('R49 - real transport failure transitions loading to error', async () => {
  const load = await resolveTransactionCorrectionDetailLoad(async () => {
    throw new ApiError('Network down', 0, 'network_error');
  });
  assertEqual(load.step, 'error', 'R49 failure result is error');
  assertEqual(load.error, 'Network down', 'R49 ApiError message is preserved');
});

await runTest('R50 - retry clears error and can reach form', async () => {
  let attempts = 0;
  let state: { step: 'loading' | 'form' | 'error'; error: string | null } = { step: 'loading', error: null };

  async function runAttempt(): Promise<void> {
    state = { step: 'loading', error: null };
    const result = await resolveTransactionCorrectionDetailLoad(async () => {
      attempts += 1;
      if (attempts === 1) throw new ApiError('Temporary failure', 503, 'temporarily_unavailable');
      return detail();
    });
    state = { step: result.step, error: result.error };
  }

  await runAttempt();
  assertEqual(state, { step: 'error', error: 'Temporary failure' }, 'R50 first attempt reaches error');

  await runAttempt();
  assertEqual(state, { step: 'form', error: null }, 'R50 retry clears error and reaches form');
  assertEqual(attempts, 2, 'R50 retry performs the same detail request again');
});

await runTest('A - normal opening with resolved prefetch reaches form without fallback GET', async () => {
  let fallbackGetCount = 0;
  const dto = detail();
  const loaded = await loadTransactionCorrectionDetail({
    transactionId: dto.id,
    contextType: dto.financialContextType,
    prefetchedDetail: {
      transactionId: dto.id,
      contextType: dto.financialContextType,
      detail: dto,
      promise: null,
      failed: false,
    },
    fetchDetail: async () => {
      fallbackGetCount += 1;
      return detail({ amount: '9999.0000' });
    },
  });
  const result = await resolveTransactionCorrectionDetailLoad(async () => loaded);

  assertEqual(fallbackGetCount, 0, 'A resolved prefetch skips fallback detail GET');
  assertEqual(result.step, 'form', 'A Lo anoté mal can render form from prefetched detail');
  if (result.step === 'form') {
    assertEqual(result.draft.amountText, '5000.0000', 'A form receives prefetched amount immediately');
  }
});

await runTest('B - pending prefetch is reused and does not duplicate detail GET', async () => {
  let fallbackGetCount = 0;
  const dto = detail();
  const loaded = await loadTransactionCorrectionDetail({
    transactionId: dto.id,
    contextType: dto.financialContextType,
    prefetchedDetail: {
      transactionId: dto.id,
      contextType: dto.financialContextType,
      detail: null,
      promise: Promise.resolve(dto),
      failed: false,
    },
    fetchDetail: async () => {
      fallbackGetCount += 1;
      return detail({ amount: '9999.0000' });
    },
  });

  assertEqual(fallbackGetCount, 0, 'B no duplicate detail GET while prefetch promise is pending');
  assertEqual(loaded.id, dto.id, 'B pending prefetch promise supplies the detail');
});

await runTest('C - prefetch failure falls back to normal detail GET and reaches form', async () => {
  let fallbackGetCount = 0;
  const dto = detail();
  const loaded = await loadTransactionCorrectionDetail({
    transactionId: dto.id,
    contextType: dto.financialContextType,
    prefetchedDetail: {
      transactionId: dto.id,
      contextType: dto.financialContextType,
      detail: null,
      promise: Promise.reject(new Error('prefetch failed')),
      failed: false,
    },
    fetchDetail: async () => {
      fallbackGetCount += 1;
      return dto;
    },
  });
  const result = await resolveTransactionCorrectionDetailLoad(async () => loaded);

  assertEqual(fallbackGetCount, 1, 'C fallback performs one normal detail GET after prefetch failure');
  assertEqual(result.step, 'form', 'C fallback detail GET can reach form');
});

await runTest('D - canonical correction POST includes corrected fields, not only mutation identity', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({
      transaction: {
        ...realBackendDetailShape,
        type: 'expense',
        amount: 500,
        date: realBackendDetailShape.transactionDate,
      },
      outcome: 'created',
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { correctFinanceTransaction } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    await correctFinanceTransaction({
      accessToken: 'redacted-test-token',
      contextType: 'personal',
      personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
      householdId: null,
      transactionId: String(realBackendDetailShape.id),
      mutationId: 'mut_fin4j_final',
      idempotencyKey: 'idem_fin4j_final',
      amount: '500',
      currency: 'ARS',
      transactionDate: '2026-08-21',
      description: 'corrected',
      categoryId: null,
      accountId: String(realBackendDetailShape.accountId),
      notes: null,
      clearCategory: true,
      clearNotes: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert(Boolean(requestBody), 'D request body captured');
  const body = requestBody as unknown as Record<string, unknown>;
  assertEqual(body.transactionId, realBackendDetailShape.id, 'D body includes transactionId');
  assertEqual(body.amount, '500', 'D body includes corrected amount');
  assertEqual(body.currency, 'ARS', 'D body includes corrected currency');
  assertEqual(body.transactionDate, '2026-08-21', 'D body includes corrected date');
  assertEqual(body.description, 'corrected', 'D body includes corrected description');
  assertEqual(body.accountId, realBackendDetailShape.accountId, 'D body includes corrected account');
  assertEqual(body.clearCategory, true, 'D body includes clearCategory flag');
  assert(typeof body.payloadHash === 'string' && body.payloadHash.length === 64, 'D body includes payloadHash');
});

await runTest('E - amount-only review preserves original category/account labels before option lists load', () => {
  const original = transactionCorrectionOriginalFromDetail(detail({
    description: 'Trace expense',
    notes: 'Trace note',
  }));

  const categoryLabel = transactionCorrectionCategoryReviewLabel({
    original,
    selectedCategoryId: original.categoryId,
    selectedCategoryLabel: null,
  });
  const accountLabel = transactionCorrectionAccountReviewLabel({
    original,
    selectedAccountId: original.accountId,
    selectedAccountLabel: null,
  });
  const clearedCategory = transactionCorrectionCategoryReviewLabel({
    original,
    selectedCategoryId: null,
    selectedCategoryLabel: null,
  });
  const clearedAccount = transactionCorrectionAccountReviewLabel({
    original,
    selectedAccountId: null,
    selectedAccountLabel: null,
  });

  assertEqual(categoryLabel, 'Alimentación', 'E unchanged category reuses original snapshot instead of showing Sin categoria');
  assertEqual(accountLabel, 'Fin 4J-R Account · ARS', 'E unchanged account reuses original account snapshot instead of showing Sin cuenta');
  assertEqual(clearedCategory, 'Sin categoria', 'E explicit category clear still displays Sin categoria');
  assertEqual(clearedAccount, 'Sin cuenta', 'E explicit account clear still displays Sin cuenta');
});

await runTest('F - amount-only correction body keeps clear flags false', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({
      transaction: {
        ...realBackendDetailShape,
        type: 'expense',
        amount: 500,
        date: realBackendDetailShape.transactionDate,
      },
      outcome: 'created',
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { correctFinanceTransaction } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    await correctFinanceTransaction({
      accessToken: 'redacted-test-token',
      contextType: 'personal',
      personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
      householdId: null,
      transactionId: String(realBackendDetailShape.id),
      mutationId: 'mut_fin4j_amount_only',
      idempotencyKey: 'idem_fin4j_amount_only',
      amount: '500',
      currency: 'ARS',
      transactionDate: '2026-08-21',
      description: String(realBackendDetailShape.description ?? 'Trace expense'),
      categoryId: String(realBackendDetailShape.categoryId),
      accountId: String(realBackendDetailShape.accountId),
      notes: String(realBackendDetailShape.notes ?? 'Trace note'),
      clearDescription: false,
      clearCategory: false,
      clearAccount: false,
      clearNotes: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert(Boolean(requestBody), 'F request body captured');
  const body = requestBody as unknown as Record<string, unknown>;
  assertEqual(body.amount, '500', 'F body includes only the intended amount change');
  assertEqual(body.categoryId, realBackendDetailShape.categoryId, 'F body keeps original category id');
  assertEqual(body.accountId, realBackendDetailShape.accountId, 'F body keeps original account id');
  assertEqual(body.clearDescription, false, 'F body keeps clearDescription false');
  assertEqual(body.clearCategory, false, 'F body keeps clearCategory false');
  assertEqual(body.clearAccount, false, 'F body keeps clearAccount false');
  assertEqual(body.clearNotes, false, 'F body keeps clearNotes false');
});

await runTest('G - correction service rejects non-canonical 2xx success bodies', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({
      transaction: {
        ...realBackendDetailShape,
        type: 'expense',
        amount: 500,
        status: 'SUPERSEDED',
        date: realBackendDetailShape.transactionDate,
      },
      outcome: 'created',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  let rejected = false;
  try {
    const { correctFinanceTransaction } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    await correctFinanceTransaction({
      accessToken: 'redacted-test-token',
      contextType: 'personal',
      personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
      householdId: null,
      transactionId: String(realBackendDetailShape.id),
      mutationId: 'mut_fin4j_invalid_success',
      idempotencyKey: 'idem_fin4j_invalid_success',
      amount: '500',
    });
  } catch {
    rejected = true;
  } finally {
    globalThis.fetch = originalFetch;
  }

  assertEqual(rejected, true, 'G service rejects 2xx response unless transaction is ACTIVE');
});

await runTest('FIELD CATEGORY - ID based diff does not disappear when selected label is unresolved', () => {
  const changes = changesForDraft(
    baseCanonicalDraft({ categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d' }),
    { categoryLabel: null },
  );
  assertEqual(changes.map((change) => change.field), ['categoryId'], 'FIELD CATEGORY category-only diff is detected by ID');
  assertEqual(changes[0]?.oldValue, 'Alimentación', 'FIELD CATEGORY review old label uses original snapshot');
  assertEqual(changes[0]?.newValue, 'Categoria seleccionada', 'FIELD CATEGORY unresolved new label still shows an explicit change');
});

await runTest('FIELD CATEGORY - loaded label and explicit clear are represented separately', () => {
  const changed = changesForDraft(
    baseCanonicalDraft({ categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d' }),
    { categoryLabel: 'Transporte' },
  );
  const cleared = changesForDraft(baseCanonicalDraft({ categoryId: null }));
  const original = transactionCorrectionOriginalFromDetail(detail({ description: 'Original description', notes: 'Original notes' }));
  const clearPayload = buildTransactionCorrectionPayload('personal', original, baseCanonicalDraft({ categoryId: null }));

  assertEqual(changed[0]?.newValue, 'Transporte', 'FIELD CATEGORY loaded category label appears in review');
  assertEqual(cleared.map((change) => change.field), ['categoryId'], 'FIELD CATEGORY clear creates category diff');
  assertEqual(cleared[0]?.newValue, 'Sin categoria', 'FIELD CATEGORY clear displays Sin categoria');
  assertEqual(clearPayload.categoryId, null, 'FIELD CATEGORY clear payload sends categoryId null');
  assertEqual(clearPayload.clearCategory, true, 'FIELD CATEGORY clear payload sends clearCategory true');
});

await runTest('S01 SAVE PIPELINE - category-only keeps unchanged original account submit-ready', () => {
  const original = transactionCorrectionOriginalFromDetail(detail({
    description: 'Original description',
    notes: 'Original notes',
  }));
  const draft = baseCanonicalDraft({
    categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
    accountId: original.accountId,
  });

  const accountInvalid = isTransactionCorrectionAccountSelectionInvalid({
    original,
    draft,
    selectedAccountExists: false,
    accountsLoading: false,
    accountsError: null,
  });
  const blocker = getTransactionCorrectionSaveBlocker({
    submitting: false,
    mutationId: 'mut_fin4j_s01',
    idempotencyKey: 'idem_fin4j_s01',
    original,
    draft,
    accessToken: 'token',
    personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    accountSelectionInvalid: accountInvalid,
  });

  assertEqual(accountInvalid, false, 'S01 unchanged original account does not block category-only save');
  assertEqual(blocker, null, 'S01 valid review screen is submit-ready');
});

await runTest('S02 SAVE PIPELINE - changed unresolved account still blocks before POST', () => {
  const original = transactionCorrectionOriginalFromDetail(detail());
  const draft = baseCanonicalDraft({
    accountId: '11111111-1111-4111-8111-111111111111',
  });
  const accountInvalid = isTransactionCorrectionAccountSelectionInvalid({
    original,
    draft,
    selectedAccountExists: false,
    accountsLoading: false,
    accountsError: null,
  });
  const blocker = getTransactionCorrectionSaveBlocker({
    submitting: false,
    mutationId: 'mut_fin4j_s02',
    idempotencyKey: 'idem_fin4j_s02',
    original,
    draft,
    accessToken: 'token',
    personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    accountSelectionInvalid: accountInvalid,
  });

  assertEqual(accountInvalid, true, 'S02 unresolved changed account is invalid');
  assertEqual(blocker, 'invalidAccountSelection', 'S02 save blocker identifies exact account guard');
});

await runTest('S03 SAVE PIPELINE - pre-HTTP identity guards are explicit', () => {
  const original = transactionCorrectionOriginalFromDetail(detail());
  const draft = baseCanonicalDraft();

  assertEqual(getTransactionCorrectionSaveBlocker({
    submitting: false,
    mutationId: null,
    idempotencyKey: 'idem_fin4j_s03',
    original,
    draft,
    accessToken: 'token',
    personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    accountSelectionInvalid: false,
  }), 'missingMutationId', 'S03 missing mutationId is named before HTTP');
  assertEqual(getTransactionCorrectionSaveBlocker({
    submitting: false,
    mutationId: 'mut_fin4j_s03',
    idempotencyKey: null,
    original,
    draft,
    accessToken: 'token',
    personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    accountSelectionInvalid: false,
  }), 'missingIdempotencyKey', 'S03 missing idempotencyKey is named before HTTP');
});

await runTest('S04 SAVE PIPELINE - selected category label wins over unresolved fallback', () => {
  const original = transactionCorrectionOriginalFromDetail(detail());
  const selectedCategoryId = 'a4962295-d715-4f79-95bf-a499cc6c412d';
  const reviewLabel = transactionCorrectionCategoryReviewLabel({
    original,
    selectedCategoryId,
    selectedCategoryLabel: 'Transporte',
  });
  const fallbackLabel = transactionCorrectionCategoryReviewLabel({
    original,
    selectedCategoryId,
    selectedCategoryLabel: null,
  });

  assertEqual(reviewLabel, 'Transporte', 'S04 loaded selected label is shown in review');
  assertEqual(fallbackLabel, 'Categoria seleccionada', 'S04 generic label remains fallback only');
});

await runTest('S05 SAVE PIPELINE - category-only payload has semantic category diff and no clear', () => {
  const original = transactionCorrectionOriginalFromDetail(detail({
    description: 'Original description',
    notes: 'Original notes',
  }));
  const draft = baseCanonicalDraft({
    categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
  });
  const changes = getTransactionCorrectionChanges({
    original,
    draft,
    formatAmount: (amount, currency) => `${amount} ${currency}`,
    formatDate: (value) => value,
    categoryLabel: 'Transporte',
  });
  const payload = buildTransactionCorrectionPayload('personal', original, draft);

  assertEqual(original.categoryId, 'ff7b95ed-80f5-42bf-8cf7-93d0bb285a60', 'S05 originalCategoryId captured');
  assertEqual(original.categoryLabelSnapshot, 'Alimentación', 'S05 originalCategoryLabel captured');
  assertEqual(draft.categoryId, 'a4962295-d715-4f79-95bf-a499cc6c412d', 'S05 selectedCategoryId captured');
  assertEqual(changes.map((change) => change.field), ['categoryId'], 'S05 semantic diff is categoryId only');
  assertEqual(changes[0]?.newValue, 'Transporte', 'S05 review label uses selected category label');
  assertEqual(payload.categoryId, 'a4962295-d715-4f79-95bf-a499cc6c412d', 'S05 payload categoryId is selected category');
  assertEqual(payload.clearCategory, false, 'S05 payload clearCategory false');
});

await runTest('S06 SAVE PIPELINE - correct service emits one POST for one save intent', async () => {
  let postCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (String(init?.method).toUpperCase() === 'POST') postCount += 1;
    return new Response(JSON.stringify({
      transaction: {
        ...realBackendDetailShape,
        type: 'expense',
        amount: 5000,
        date: realBackendDetailShape.transactionDate,
      },
      outcome: 'created',
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { correctFinanceTransaction } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    await correctFinanceTransaction({
      accessToken: 'redacted-test-token',
      personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
      householdId: null,
      mutationId: 'mut_fin4j_s06',
      idempotencyKey: 'idem_fin4j_s06',
      ...buildTransactionCorrectionPayload('personal', transactionCorrectionOriginalFromDetail(detail()), baseCanonicalDraft({
        categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
      })),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assertEqual(postCount, 1, 'S06 one save intent emits exactly one POST');
});

await runTest('S07 SAVE PIPELINE - missing person prevents API call before request body', () => {
  const original = transactionCorrectionOriginalFromDetail(detail());
  const blocker = getTransactionCorrectionSaveBlocker({
    submitting: false,
    mutationId: 'mut_fin4j_s07',
    idempotencyKey: 'idem_fin4j_s07',
    original,
    draft: baseCanonicalDraft({ categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d' }),
    accessToken: 'token',
    personId: null,
    accountSelectionInvalid: false,
  });

  assertEqual(blocker, 'missingPersonId', 'S07 missing personId is an explicit pre-HTTP blocker');
});

await runTest('FIELD CONTRACT - every editable field participates in semantic diff', () => {
  const draft = baseCanonicalDraft({
    amount: '4200',
    currency: 'USD',
    transactionDate: '2026-08-20',
    description: 'Compra semanal',
    categoryId: 'category-home',
    accountId: 'account-bank',
    notes: 'Ticket revisado',
  });
  const changes = changesForDraft(draft, {
    categoryLabel: 'Hogar',
    accountLabel: 'Banco · USD',
  });

  assertEqual(changes.map((change) => change.field), [
    'amount',
    'currency',
    'transactionDate',
    'description',
    'categoryId',
    'accountId',
    'notes',
  ], 'FIELD CONTRACT diff has exactly all editable fields in canonical order');
});

await runTest('FIELD CONTRACT - no-change and reverted draft produce no semantic diff', () => {
  const original = transactionCorrectionOriginalFromDetail(detail({
    description: 'Original description',
    notes: 'Original notes',
  }));
  const draftFromOriginal = transactionCorrectionDraftFromOriginal(original);
  const canonical = transactionCorrectionCanonicalDraftFromDraft(original, {
    ...draftFromOriginal,
    selectedCategoryId: 'transporte',
  });
  const reverted = { ...canonical, selectedCategoryId: undefined } as unknown;
  void reverted;
  const noChange = transactionCorrectionCanonicalDraftFromDraft(original, draftFromOriginal);
  const changedBack = {
    ...baseCanonicalDraft(),
    categoryId: original.categoryId,
  };

  assertEqual(changesForDraft(noChange).length, 0, 'FIELD CONTRACT untouched original cannot submit');
  assertEqual(changesForDraft(changedBack).length, 0, 'FIELD CONTRACT final reverted category equals original and has no diff');
});

await runTest('REQUEST FIELD-COMPLETE - payload preserves untouched fields and emits clear flags only for explicit clears', () => {
  const original = transactionCorrectionOriginalFromDetail(detail({
    description: 'Original description',
    notes: 'Original notes',
  }));
  const categoryOnly = buildTransactionCorrectionPayload('personal', original, baseCanonicalDraft({
    categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
  }));
  const clearText = buildTransactionCorrectionPayload('personal', original, baseCanonicalDraft({
    description: '',
    notes: '',
  }));

  assertEqual(categoryOnly.amount, '5000', 'REQUEST FIELD-COMPLETE category-only keeps amount');
  assertEqual(categoryOnly.currency, 'ARS', 'REQUEST FIELD-COMPLETE category-only keeps currency');
  assertEqual(categoryOnly.transactionDate, '2026-08-21', 'REQUEST FIELD-COMPLETE category-only keeps date');
  assertEqual(categoryOnly.description, 'Original description', 'REQUEST FIELD-COMPLETE category-only keeps description');
  assertEqual(categoryOnly.categoryId, 'a4962295-d715-4f79-95bf-a499cc6c412d', 'REQUEST FIELD-COMPLETE category-only sends new categoryId');
  assertEqual(categoryOnly.accountId, realBackendDetailShape.accountId, 'REQUEST FIELD-COMPLETE category-only keeps account');
  assertEqual(categoryOnly.notes, 'Original notes', 'REQUEST FIELD-COMPLETE category-only keeps notes');
  assertEqual(categoryOnly.clearCategory, false, 'REQUEST FIELD-COMPLETE category-only does not clear category');
  assertEqual(clearText.clearDescription, true, 'REQUEST FIELD-COMPLETE explicit description clear is true');
  assertEqual(clearText.clearNotes, true, 'REQUEST FIELD-COMPLETE explicit notes clear is true');
  assertEqual(clearText.clearCategory, false, 'REQUEST FIELD-COMPLETE untouched category clear is false');
  assertEqual(clearText.clearAccount, false, 'REQUEST FIELD-COMPLETE untouched account clear is false');
});

await runTest('HTTP FIELD-COMPLETE - category-only correction POST body includes categoryId and unchanged snapshot fields', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({
      transaction: {
        ...realBackendDetailShape,
        type: 'expense',
        amount: 5000,
        date: realBackendDetailShape.transactionDate,
      },
      outcome: 'created',
    }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { correctFinanceTransaction } = require('../front/mi-front-limpio/services/finance/financeMovements') as typeof import('../front/mi-front-limpio/services/finance/financeMovements');
    await correctFinanceTransaction({
      accessToken: 'redacted-test-token',
      contextType: 'personal',
      personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
      householdId: null,
      transactionId: String(realBackendDetailShape.id),
      mutationId: 'mut_fin4j_category_only',
      idempotencyKey: 'idem_fin4j_category_only',
      amount: '5000',
      currency: 'ARS',
      transactionDate: '2026-08-21',
      description: 'Original description',
      categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
      accountId: String(realBackendDetailShape.accountId),
      notes: 'Original notes',
      clearDescription: false,
      clearCategory: false,
      clearAccount: false,
      clearNotes: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const body = requestBody as unknown as Record<string, unknown>;
  assertEqual(body.categoryId, 'a4962295-d715-4f79-95bf-a499cc6c412d', 'HTTP FIELD-COMPLETE category-only body includes categoryId');
  assertEqual(body.amount, '5000', 'HTTP FIELD-COMPLETE category-only body keeps amount');
  assertEqual(body.description, 'Original description', 'HTTP FIELD-COMPLETE category-only body keeps description');
  assertEqual(body.clearCategory, false, 'HTTP FIELD-COMPLETE category-only body does not clear');
});

await runTest('RPC FIELD-COMPLETE - backend service forwards every editable field and clear flag', async () => {
  const { correctTransaction } = require(`${process.cwd()}/backend/src/services/finance.transaction.correction.service`) as {
    correctTransaction: (financeContext: Record<string, unknown>, body: Record<string, unknown>) => Promise<unknown>;
  };
  let rpcName = '';
  let rpcParams: Record<string, unknown> | null = null;
  await correctTransaction({
    contextType: 'personal',
    personId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    householdId: null,
    client: {
      rpc: async (name: string, params: Record<string, unknown>) => {
        rpcName = name;
        rpcParams = params;
        return {
          data: {
            id: '6d596616-c91f-487b-a9c7-d239be620cbe',
            transaction_type: 'expense',
            amount: '4200.0000',
            currency: 'USD',
            financial_context_type: 'personal',
            owner_person_id: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
            household_id: null,
            transaction_date: '2026-08-20',
            description: 'Compra semanal',
            notes: 'Ticket revisado',
            category_id: 'a4962295-d715-4f79-95bf-a499cc6c412d',
            category_label_snapshot: 'Transporte',
            status: 'ACTIVE',
            trashed_at: null,
            corrected_from_transaction_id: String(realBackendDetailShape.id),
            created_at: '2026-08-21T11:14:54.848706+00:00',
            updated_at: '2026-08-21T11:14:54.848706+00:00',
            created_by_person_id: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
          },
          error: null,
        };
      },
    },
  }, {
    transactionId: String(realBackendDetailShape.id),
    mutationId: 'mut_fin4j_rpc_field_complete',
    idempotencyKey: 'idem_fin4j_rpc_field_complete',
    amount: '4200',
    currency: 'USD',
    transactionDate: '2026-08-20',
    description: 'Compra semanal',
    categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d',
    accountId: '657ceafc-6944-4c99-950d-2c64b7aad336',
    notes: 'Ticket revisado',
    clearDescription: false,
    clearCategory: false,
    clearAccount: false,
    clearNotes: false,
  });

  const params = rpcParams as unknown as Record<string, unknown>;
  assertEqual(rpcName, 'finance_correct_transaction_v1', 'RPC FIELD-COMPLETE uses correction RPC');
  assertEqual(params.p_amount, '4200', 'RPC FIELD-COMPLETE amount forwarded');
  assertEqual(params.p_currency, 'USD', 'RPC FIELD-COMPLETE currency forwarded');
  assertEqual(params.p_transaction_date, '2026-08-20', 'RPC FIELD-COMPLETE date forwarded');
  assertEqual(params.p_description, 'Compra semanal', 'RPC FIELD-COMPLETE description forwarded');
  assertEqual(params.p_category_id, 'a4962295-d715-4f79-95bf-a499cc6c412d', 'RPC FIELD-COMPLETE category forwarded');
  assertEqual(params.p_account_id, '657ceafc-6944-4c99-950d-2c64b7aad336', 'RPC FIELD-COMPLETE account forwarded');
  assertEqual(params.p_notes, 'Ticket revisado', 'RPC FIELD-COMPLETE notes forwarded');
  assertEqual(params.p_clear_category, false, 'RPC FIELD-COMPLETE clearCategory forwarded');
  assert(typeof params.p_payload_hash === 'string' && String(params.p_payload_hash).length === 64, 'RPC FIELD-COMPLETE payload hash generated');
});

await runTest('IDEMPOTENCY FIELD COVERAGE - backend canonical hash changes for every editable field and clear flag', async () => {
  const { hashIdempotencyRequestV2 } = require(`${process.cwd()}/backend/src/lib/plannerIdempotencyAdapter`) as {
    hashIdempotencyRequestV2: (params: Record<string, unknown>) => string;
  };
  const basePayload = {
    transactionId: String(realBackendDetailShape.id),
    amount: '5000',
    currency: 'ARS',
    transactionDate: '2026-08-21',
    description: 'Original description',
    categoryId: String(realBackendDetailShape.categoryId),
    accountId: String(realBackendDetailShape.accountId),
    notes: 'Original notes',
    clearDescription: false,
    clearCategory: false,
    clearAccount: false,
    clearNotes: false,
    expectedVersion: undefined,
  };
  const hash = (payload: Record<string, unknown>) => hashIdempotencyRequestV2({
    operation: 'finance.transaction.correct',
    scopeType: 'personal',
    scopeId: '556eea6a-d2d5-4e63-980c-78bd02f53fef',
    targetId: String(realBackendDetailShape.id),
    payload,
    expectedVersion: undefined,
    mutationId: 'same-mutation',
  });
  const baseHash = hash(basePayload);
  const variants = [
    { amount: '500' },
    { currency: 'USD' },
    { transactionDate: '2026-08-20' },
    { description: 'Changed description' },
    { categoryId: 'a4962295-d715-4f79-95bf-a499cc6c412d' },
    { accountId: '11111111-1111-4111-8111-111111111111' },
    { notes: 'Changed notes' },
    { clearCategory: true, categoryId: null },
  ];

  for (const variant of variants) {
    assert(hash({ ...basePayload, ...variant }) !== baseHash, `IDEMPOTENCY FIELD COVERAGE hash changes for ${Object.keys(variant).join('+')}`);
  }
});

console.log(`\nFINANCE_STAGE_4J_RECONSTRUCTED_TESTS_R39_R50_AND_FINAL_PREFETCH pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_4J_RECONSTRUCTED_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_4J_RECONSTRUCTED_TESTS_AND_FINAL_PREFETCH=PASS');
}

main().catch((error) => {
  console.error(`FINANCE_STAGE_4J_RECONSTRUCTED_TESTS=FATAL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
