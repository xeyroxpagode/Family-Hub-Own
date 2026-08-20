'use strict';

/**
 * Finance V1.1 - Stage 2F-A Minimum Read Authority.
 *
 * Read-only projection over the canonical `public.finance_transactions`
 * authority created by accepted Stage 2C. This service introduces NO new
 * persistence, NO new schema, NO secondary financial domain concepts, NO
 * read-model table, NO materialized truth, and NO currency conversion.
 *
 * Two minimum capabilities:
 *
 *   1. listFinanceMovements(financeContext, query)
 *      Returns chronological Expense/Income facts for the trusted Financial
 *      Context + period, ordered by transaction_date DESC and deterministic
 *      tie-breakers. Reads only canonical `finance_transactions` columns and
 *      the historical `category_label_snapshot` (never joins mutable current
 *      Category label to reconstruct history).
 *
 *   2. summarizeFinance(financeContext, query)
 *      Computes per-currency Expense total, Income total and Net =
 *      Income - Expense using exact decimal strings selected through
 *      `amount::text` and BigInt scaled by the canonical numeric(18,4) scale.
 *      Currencies are NEVER summed
 *      together; missing currencies are NEVER fabricated as zero buckets.
 *
 * Period contract: calendar month "YYYY-MM" aligned with `transaction_date`
 * (the financial occurrence date), never with `created_at`. Range is half-open
 * [start, endExclusive) computed with Date.UTC so DATE-only financial
 * occurrences never shift across calendar days because of timezone handling.
 *
 * Ownership/privacy reuses Stage 1 canonical authority (`resolveFinanceContext`)
 * and the existing `finance_transactions` RLS policies. No caller-supplied
 * owner IDs are honored as read selectors.
 */

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TRANSACTION_TYPES,
} = require('../constants/finance.constants');

const PERIOD_MONTH_RE = /^\d{4}-\d{2}$/;
const TEN_THOUSAND = 10000n;

/**
 * Read-only selector blocklist. Finance read authority is derived server-side
 * from the authenticated user (PERSONAL = current Person; HOUSEHOLD = global
 * active Household). No caller-supplied owner ID is ever honored as a read
 * selector; presence of any of these is rejected up-front.
 */
const FORBIDDEN_READ_SELECTOR_FIELDS = Object.freeze([
  'personId',
  'person_id',
  'ownerPersonId',
  'owner_person_id',
  'householdId',
  'household_id',
  'membershipId',
  'membership_id',
  'contextId',
  'financialContextId',
]);

function assertNoCallerOwnerSelectors(query = {}) {
  for (const field of FORBIDDEN_READ_SELECTOR_FIELDS) {
    const value = query?.[field];
    if (value !== undefined && value !== null && value !== '') {
      throw createHttpError(
        400,
        'Finance read no acepta IDs de ownership arbitrarios: la autoridad se deriva server-side del usuario autenticado.',
        'finance_read_owner_id_forbidden',
      );
    }
  }
}

const SELECT_COLUMNS = [
  'id',
  'transaction_type',
  'amount:amount::text',
  'currency',
  'transaction_date',
  'description',
  'category_id',
  'category_label_snapshot',
  'created_at',
  'updated_at',
].join(', ');

const TRASH_SELECT_COLUMNS = [
  'id',
  'transaction_type',
  'amount:amount::text',
  'currency',
  'transaction_date',
  'description',
  'category_id',
  'category_label_snapshot',
  'trashed_at',
  'created_at',
  'updated_at',
].join(', ');

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para leer Finance.', 'finance_read_forbidden');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

function normalizePeriodMonth(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(
      400,
      'Period es obligatorio para Finance read. El consumidor debe enviar YYYY-MM.',
      'finance_period_required',
    );
  }

  if (typeof value !== 'string' || !PERIOD_MONTH_RE.test(value)) {
    throw createHttpError(
      400,
      'Period invalido. Debe ser un mes calendario en formato YYYY-MM.',
      'invalid_finance_period',
    );
  }

  const [yearText, monthText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (month < 1 || month > 12 || year < 1) {
    throw createHttpError(
      400,
      'Period invalido. Debe ser un mes calendario en formato YYYY-MM.',
      'invalid_finance_period',
    );
  }

  return value;
}

function periodRange(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const endExclusive = new Date(Date.UTC(year, monthNum, 1));

  const toDateString = (date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  return { start: toDateString(start), endExclusive: toDateString(endExclusive) };
}

function assertResolvedFinanceContext(financeContext) {
  if (!financeContext || typeof financeContext !== 'object') {
    throw createHttpError(400, 'Financial Context resuelto requerido.', 'invalid_finance_context');
  }

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    if (!financeContext.personId || financeContext.householdId !== null) {
      throw createHttpError(400, 'Financial Context personal invalido.', 'invalid_finance_context');
    }
    return;
  }

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD) {
    if (!financeContext.personId || !financeContext.householdId || !financeContext.membershipId) {
      throw createHttpError(400, 'Financial Context household invalido.', 'invalid_finance_context');
    }
    return;
  }

  throw createHttpError(400, 'Financial Context type invalido.', 'invalid_finance_context');
}

function toScaledBigInt(value) {
  const text = String(value ?? '0').trim();
  if (!text) return 0n;
  const neg = text.startsWith('-');
  const absText = neg ? text.slice(1) : text;
  const dotIndex = absText.indexOf('.');
  let intPart = absText;
  let fracPart = '';
  if (dotIndex >= 0) {
    intPart = absText.slice(0, dotIndex);
    fracPart = absText.slice(dotIndex + 1);
  }
  if (intPart === '' || intPart === '-') intPart = '0';
  if (!/^\d+$/.test(intPart)) throw createHttpError(500, 'Monto Finance invalido.', 'invalid_finance_amount');
  const intScaled = BigInt(intPart) * TEN_THOUSAND;
  const fracPadded = fracPart ? (fracPart + '0000').slice(0, 4) : '';
  let fracScaled = 0n;
  if (fracPadded) {
    if (!/^\d+$/.test(fracPadded)) throw createHttpError(500, 'Monto Finance invalido.', 'invalid_finance_amount');
    fracScaled = BigInt(fracPadded);
  }
  const scaled = intScaled + fracScaled;
  return neg ? -scaled : scaled;
}

function fromScaledBigInt(scaled) {
  const neg = scaled < 0n;
  const abs = neg ? -scaled : scaled;
  let intPart = (abs / TEN_THOUSAND).toString();
  let frac = (abs % TEN_THOUSAND).toString().padStart(4, '0');
  frac = frac.replace(/0+$/, '');
  const zero = intPart === '0' && frac === '';
  const base = frac ? `${intPart}.${frac}` : intPart;
  return neg && !zero ? `-${base}` : base;
}

function scopeFilters(query, financeContext) {
  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    query = query
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.PERSONAL)
      .eq('owner_person_id', financeContext.personId)
      .is('household_id', null);
  } else {
    query = query
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.HOUSEHOLD)
      .eq('household_id', financeContext.householdId)
      .is('owner_person_id', null);
  }
  return query;
}

function movementToDto(row) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    amount: String(row.amount),
    currency: row.currency,
    transactionDate: row.transaction_date,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    categoryLabelSnapshot: row.category_label_snapshot ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function movementToTrashDto(row) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    amount: String(row.amount),
    currency: row.currency,
    transactionDate: row.transaction_date,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    categoryLabelSnapshot: row.category_label_snapshot ?? null,
    trashedAt: row.trashed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DETAIL_SELECT_COLUMNS = [
  'id',
  'transaction_type',
  'amount:amount::text',
  'currency',
  'financial_context_type',
  'owner_person_id',
  'household_id',
  'transaction_date',
  'description',
  'notes',
  'category_id',
  'category_label_snapshot',
  'status',
  'trashed_at',
  'corrected_from_transaction_id',
  'created_at',
  'updated_at',
  'finance_account_effects!inner(account_id, finance_accounts!inner(id, name, currency))',
].join(', ');

function transactionToDetailDto(row) {
  const accountEffect = row.finance_account_effects?.[0];
  const account = accountEffect?.finance_accounts;
  return {
    id: row.id,
    transactionType: row.transaction_type,
    amount: String(row.amount),
    currency: row.currency,
    financialContextType: row.financial_context_type,
    ownerPersonId: row.owner_person_id ?? null,
    householdId: row.household_id ?? null,
    transactionDate: row.transaction_date,
    description: row.description ?? null,
    notes: row.notes ?? null,
    categoryId: row.category_id ?? null,
    categoryLabelSnapshot: row.category_label_snapshot ?? null,
    status: row.status,
    trashedAt: row.trashed_at ?? null,
    correctedFromTransactionId: row.corrected_from_transaction_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountId: account?.id ?? null,
    accountName: account?.name ?? null,
    accountCurrency: account?.currency ?? null,
  };
}

async function getFinanceTransactionDetail(financeContext, transactionId) {
  assertNoCallerOwnerSelectors({});
  assertResolvedFinanceContext(financeContext);
  if (!transactionId) {
    throw createHttpError(400, 'transactionId es obligatorio.', 'validation_error');
  }

  let request = financeContext.client
    .from('finance_transactions')
    .select(DETAIL_SELECT_COLUMNS)
    .eq('id', transactionId);

  request = scopeFilters(request, financeContext);

  const { data, error } = await request.single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw createHttpError(404, 'Transaccion no encontrada.', 'finance_transaction_not_found');
    }
    throwSupabaseError(error);
  }

  return transactionToDetailDto(data);
}

async function listFinanceMovements(financeContext, query = {}) {
  assertNoCallerOwnerSelectors(query);
  assertResolvedFinanceContext(financeContext);
  const month = normalizePeriodMonth(query.month ?? query.period);
  const { start, endExclusive } = periodRange(month);

  let request = financeContext.client
    .from('finance_transactions')
    .select(SELECT_COLUMNS);

  request = scopeFilters(request, financeContext);
  request = request
    .eq('status', 'ACTIVE')
    .gte('transaction_date', start)
    .lt('transaction_date', endExclusive)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  const movements = (data ?? []).map(movementToDto);
  return { period: month, contextType: financeContext.contextType, movements };
}

async function listFinanceTrash(financeContext, query = {}) {
  assertNoCallerOwnerSelectors(query);
  assertResolvedFinanceContext(financeContext);

  let request = financeContext.client
    .from('finance_transactions')
    .select(TRASH_SELECT_COLUMNS);

  request = scopeFilters(request, financeContext);
  request = request
    .eq('status', 'TRASHED')
    .in('transaction_type', [FINANCE_TRANSACTION_TYPES.EXPENSE, FINANCE_TRANSACTION_TYPES.INCOME])
    .order('trashed_at', { ascending: false })
    .order('id', { ascending: false });

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  const movements = (data ?? []).map(movementToTrashDto);
  return { contextType: financeContext.contextType, movements };
}

async function summarizeFinance(financeContext, query = {}) {
  assertNoCallerOwnerSelectors(query);
  assertResolvedFinanceContext(financeContext);
  const month = normalizePeriodMonth(query.month ?? query.period);
  const { start, endExclusive } = periodRange(month);

  let request = financeContext.client
    .from('finance_transactions')
    .select('transaction_type, currency, amount:amount::text');

  request = scopeFilters(request, financeContext);
  request = request
    .eq('status', 'ACTIVE')
    .gte('transaction_date', start)
    .lt('transaction_date', endExclusive);

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  const buckets = new Map();
  for (const row of data ?? []) {
    if (!buckets.has(row.currency)) {
      buckets.set(row.currency, { expense: 0n, income: 0n });
    }
    const bucket = buckets.get(row.currency);
    const scaled = toScaledBigInt(row.amount);
    if (row.transaction_type === FINANCE_TRANSACTION_TYPES.EXPENSE) {
      bucket.expense += scaled;
    } else if (row.transaction_type === FINANCE_TRANSACTION_TYPES.INCOME) {
      bucket.income += scaled;
    }
  }

  const currencies = [];
  for (const [currency, bucket] of buckets) {
    const net = bucket.income - bucket.expense;
    currencies.push({
      currency,
      expense: fromScaledBigInt(bucket.expense),
      income: fromScaledBigInt(bucket.income),
      net: fromScaledBigInt(net),
    });
  }
  currencies.sort((left, right) => left.currency.localeCompare(right.currency));

  return { period: month, contextType: financeContext.contextType, currencies };
}

module.exports = {
  listFinanceMovements,
  listFinanceTrash,
  summarizeFinance,
  getFinanceTransactionDetail,
  normalizePeriodMonth,
  periodRange,
  assertNoCallerOwnerSelectors,
};
