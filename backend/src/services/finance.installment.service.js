'use strict';

/**
 * Finance V1.1 Stage 8D.2 - Credit Card Installment Foundation domain service.
 *
 * DORMANT foundation. These primitives establish the installment contract
 * without being wired into the product New Expense flow, Movements, Resumen,
 * Limits or Analysis. The create primitive exists only as the domain entry
 * point over the canonical SQL mutation; it is intentionally NOT routed
 * through the Express API in this substage (no user-reachable mutation).
 *
 * - createCreditCardInstallmentPlan(financeContext, body)
 *     Calls the canonical SQL mutation. Enforces (via the DB) card-only,
 *     currency, count and exact-sum invariants; duplicate plans are rejected
 *     idempotently through the unique expense-root constraint.
 *
 * - getCreditCardInstallmentPlan(financeContext, rootTransactionId)
 *     READ-ONLY projection answering totalAmount / installmentCount /
 *     installments[{ordinal, amount}]. No cycle/due fields exist in 8D.2.
 *
 * Amounts are returned as canonical decimal strings (numeric(18,4) semantics),
 * never as floating point.
 */

const { createHttpError } = require('../lib/httpErrors');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');
const {
  assertResolvedFinanceContext,
  getAccountForMutation,
  normalizeDecimalForDto,
} = require('./finance.account.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_INSTALLMENT_FIELDS = Object.freeze([
  'personId',
  'person_id',
  'ownerPersonId',
  'owner_person_id',
  'householdId',
  'household_id',
  'membershipId',
  'membership_id',
  'userId',
  'user_id',
  'contextId',
  'financialContextId',
]);

const DOMAIN_ERROR_CODES = Object.freeze([
  'finance_transaction_owner_authority_forbidden',
  'invalid_finance_installment_count',
  'finance_installment_count_exceeds_max',
  'finance_transaction_not_found',
  'invalid_expense_state_for_installments',
  'finance_installment_requires_credit_card',
  'finance_installment_currency_mismatch',
  'invalid_finance_installment_total',
  'finance_installment_total_too_small_for_count',
  'finance_installment_sum_mismatch_internal',
  'finance_credit_card_installment_plan_exists',
  'credit_card_timing_required',
]);

function assertNoAuthorityInjection(body = {}) {
  for (const field of FORBIDDEN_INSTALLMENT_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && value !== '') {
      throw createHttpError(
        400,
        'Installment Plan no acepta IDs de ownership arbitrarios: la autoridad se deriva server-side del usuario autenticado.',
        'finance_installment_owner_id_forbidden',
      );
    }
  }
}

function extractDomainCode(message) {
  if (typeof message !== 'string') return null;
  for (const code of DOMAIN_ERROR_CODES) {
    if (message.includes(code)) return code;
  }
  return null;
}

function throwSupabaseError(error) {
  const domainCode = extractDomainCode(error?.message);

  if (domainCode === 'finance_credit_card_installment_plan_exists') {
    throw createHttpError(409, 'La compra ya tiene un plan de cuotas.', domainCode);
  }

  if (domainCode === 'finance_transaction_not_found') {
    throw createHttpError(404, 'Compra no encontrada.', domainCode);
  }

  if (domainCode === 'credit_card_timing_required') {
    throw createHttpError(409, 'Configurá el cierre y vencimiento de esta tarjeta antes de usar cuotas.', domainCode);
  }

  if (domainCode === 'finance_transaction_owner_authority_forbidden') {
    throw createHttpError(403, 'No tenes permiso para operar con este plan de cuotas.', 'finance_installment_forbidden');
  }

  if (domainCode) {
    throw createHttpError(400, 'Plan de cuotas invalido.', domainCode);
  }

  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para operar con este plan de cuotas.', 'finance_installment_forbidden');
  }

  if (['23514', '23502', '23503', '23505', '22P02', '22007'].includes(error?.code)) {
    throw createHttpError(400, 'Plan de cuotas invalido.', 'validation_error');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

function normalizeExpenseRootTransactionId(value) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, 'expenseRootTransactionId invalido.', 'invalid_finance_installment_expense_root');
  }
  return value;
}

function normalizeInstallmentCount(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw createHttpError(400, 'installmentCount invalido.', 'invalid_finance_installment_count');
  }
  return value;
}

function scopeFilters(request, financeContext) {
  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return request
      .eq('financial_context_type', FINANCE_CONTEXT_TYPES.PERSONAL)
      .eq('owner_person_id', financeContext.personId)
      .is('household_id', null);
  }

  return request
    .eq('financial_context_type', FINANCE_CONTEXT_TYPES.HOUSEHOLD)
    .eq('household_id', financeContext.householdId)
    .is('owner_person_id', null);
}

function installmentToDto(row) {
  return {
    ordinal: row.ordinal,
    amount: String(row.amount),
    cycleCloseDate: row.cycle_close_date ?? null,
    cycleDueDate: row.cycle_due_date ?? null,
  };
}

function planToDto(row, installments) {
  return {
    id: row.id,
    expenseRootTransactionId: row.expense_root_transaction_id,
    installmentCount: row.installment_count,
    totalAmount: String(row.total_amount),
    currency: row.currency,
    closingDaySnapshot: row.closing_day_snapshot ?? null,
    dueDaySnapshot: row.due_day_snapshot ?? null,
    installments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function planSummaryToDto(row, installments) {
  const futureInstallments = installments.filter((item) => {
    if (!item.cycleDueDate) return true;
    return item.cycleDueDate >= new Date().toISOString().slice(0, 10);
  });
  const futureTotal = futureInstallments.reduce((sum, item) => sum + Number(item.amount), 0);

  return {
    ...planToDto(row, installments),
    purchaseTitle: row.__purchaseTitle ?? null,
    purchaseDate: row.__purchaseDate ?? null,
    futureInstallmentCount: futureInstallments.length,
    futureAmount: normalizeDecimalForDto(String(futureTotal)),
    futureInstallments,
  };
}

async function createCreditCardInstallmentPlan(financeContext, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);

  const expenseRootTransactionId = normalizeExpenseRootTransactionId(body.expenseRootTransactionId ?? body.expense_root_transaction_id);
  const installmentCount = normalizeInstallmentCount(body.installmentCount ?? body.installment_count);

  const { data, error } = await financeContext.client.rpc(
    'finance_create_credit_card_installment_plan_v1',
    {
      p_expense_root_transaction_id: expenseRootTransactionId,
      p_installment_count: installmentCount,
      p_created_by_person_id: financeContext.personId,
    },
  );

  if (error) throwSupabaseError(error);

  return {
    planId: data.planId,
    expenseRootTransactionId: data.expenseRootTransactionId,
    installmentCount: data.installmentCount,
    totalAmount: data.totalAmount,
    currency: data.currency,
  };
}

async function getCreditCardInstallmentPlan(financeContext, rootTransactionId) {
  assertResolvedFinanceContext(financeContext);
  const expenseRootTransactionId = normalizeExpenseRootTransactionId(rootTransactionId);

  let planRequest = financeContext.client
    .from('finance_credit_card_installment_plans')
    .select('id, expense_root_transaction_id, installment_count, total_amount:total_amount::text, currency, financial_context_type, owner_person_id, household_id, closing_day_snapshot, due_day_snapshot, created_at, updated_at')
    .eq('expense_root_transaction_id', expenseRootTransactionId);

  planRequest = scopeFilters(planRequest, financeContext);

  const { data: plan, error: planError } = await planRequest.maybeSingle();
  if (planError) throwSupabaseError(planError);

  if (!plan) {
    return { plan: null };
  }

  const { data: rows, error: rowsError } = await financeContext.client
    .from('finance_credit_card_installments')
    .select('ordinal, amount:amount::text, cycle_close_date, cycle_due_date')
    .eq('installment_plan_id', plan.id)
    .order('ordinal', { ascending: true });

  if (rowsError) throwSupabaseError(rowsError);

  return {
    plan: planToDto(plan, (rows ?? []).map(installmentToDto)),
  };
}

async function listCreditCardInstallmentPlansForAccount(financeContext, accountId, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(query);
  const cardId = normalizeExpenseRootTransactionId(accountId);
  const account = await getAccountForMutation(financeContext, cardId);
  if (account.account_type !== 'CREDIT_CARD') {
    throw createHttpError(400, 'La cuenta no es una tarjeta de crédito.', 'finance_installment_requires_credit_card');
  }

  const limit = Math.min(Math.max(Number(query.limit ?? 12) || 12, 1), 24);
  const today = new Date().toISOString().slice(0, 10);

  const { data: effects, error: effectsError } = await financeContext.client
    .from('finance_account_effects')
    .select('transaction_id')
    .eq('account_id', account.id)
    .eq('effect_type', 'expense')
    .eq('effect_role', 'PRIMARY')
    .eq('effect_status', 'ACTIVE');
  if (effectsError) throwSupabaseError(effectsError);

  const transactionIds = [...new Set((effects ?? []).map((row) => row.transaction_id).filter(Boolean))];
  if (transactionIds.length === 0) return { plans: [] };

  const { data: transactions, error: txError } = await financeContext.client
    .from('finance_transactions')
    .select('id, root_transaction_id, description, transaction_date, status')
    .in('id', transactionIds)
    .eq('status', 'ACTIVE');
  if (txError) throwSupabaseError(txError);

  const txByRoot = new Map();
  const rootIds = [];
  for (const row of transactions ?? []) {
    const root = row.root_transaction_id ?? row.id;
    if (!txByRoot.has(root)) {
      txByRoot.set(root, row);
      rootIds.push(root);
    }
  }
  if (rootIds.length === 0) return { plans: [] };

  let planRequest = financeContext.client
    .from('finance_credit_card_installment_plans')
    .select('id, expense_root_transaction_id, installment_count, total_amount:total_amount::text, currency, financial_context_type, owner_person_id, household_id, closing_day_snapshot, due_day_snapshot, created_at, updated_at')
    .in('expense_root_transaction_id', rootIds);
  planRequest = scopeFilters(planRequest, financeContext);

  const { data: plans, error: plansError } = await planRequest;
  if (plansError) throwSupabaseError(plansError);
  if (!plans?.length) return { plans: [] };

  const planIds = plans.map((plan) => plan.id);
  const { data: rows, error: rowsError } = await financeContext.client
    .from('finance_credit_card_installments')
    .select('installment_plan_id, ordinal, amount:amount::text, cycle_close_date, cycle_due_date')
    .in('installment_plan_id', planIds)
    .order('cycle_due_date', { ascending: true })
    .order('ordinal', { ascending: true });
  if (rowsError) throwSupabaseError(rowsError);

  const installmentsByPlan = new Map();
  for (const row of rows ?? []) {
    const list = installmentsByPlan.get(row.installment_plan_id) ?? [];
    list.push(installmentToDto(row));
    installmentsByPlan.set(row.installment_plan_id, list);
  }

  return {
    plans: plans
      .map((plan) => {
        const tx = txByRoot.get(plan.expense_root_transaction_id);
        return planSummaryToDto({
          ...plan,
          __purchaseTitle: tx?.description ?? null,
          __purchaseDate: tx?.transaction_date ?? null,
        }, installmentsByPlan.get(plan.id) ?? []);
      })
      .filter((plan) => plan.futureInstallmentCount > 0 || plan.installments.some((item) => !item.cycleDueDate || item.cycleDueDate >= today))
      .sort((a, b) => {
        const aDate = a.futureInstallments[0]?.cycleDueDate ?? '9999-12-31';
        const bDate = b.futureInstallments[0]?.cycleDueDate ?? '9999-12-31';
        return aDate.localeCompare(bDate);
      })
      .slice(0, limit),
  };
}

module.exports = {
  createCreditCardInstallmentPlan,
  getCreditCardInstallmentPlan,
  listCreditCardInstallmentPlansForAccount,
};
