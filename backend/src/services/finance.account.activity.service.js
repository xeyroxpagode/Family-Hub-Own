'use strict';

/**
 * Finance V1.1 Stage 3H - Account recent activity READ-ONLY projection.
 *
 * This is the explicit read-only gap allowed by Stage 3H for the Account
 * Detail screen so it can truthfully render recent account-affecting facts.
 *
 * Boundary (strictly enforced):
 *
 *   - Reuses canonical `finance_account_effects` truth created by accepted
 *     Stages 3B (expense/income PRIMARY effects), 3E (transfer source/destination
 *     effects), 3G (commission PRIMARY expense effect).
 *   - Reuses canonical `finance_transactions` (description + category snapshot)
 *     and `finance_transfers` (description) for label enrichment only.
 *   - Reuses `resolveFinanceContext` + `finance_accounts` RLS to scope the
 *     Account to the trusted Financial Context.
 *   - `finance_account_effects` RLS (`finance_current_user_can_read_account`)
 *     is the read authority.
 *   - NO new schema, NO new mutation, NO new financial authority, NO new
 *     Account semantics, NO union table, NO TransactionWithFee fake row.
 *
 * Each effect surfaces as a single canonical account-affecting fact precisely
 * as it was written. A commissioned Transfer naturally produces TWO canonical
 * effect rows on the source Account (one TRANSFER_SOURCE, one expense PRIMARY
 * for the Commission); they are NOT merged into a fake row.
 */

const { createHttpError } = require('../lib/httpErrors');
const {
  getAccountForMutation,
  toDto,
  normalizeDecimalForDto,
  assertResolvedFinanceContext,
  assertNoAuthorityInjection,
} = require('./finance.account.service');

const FORBIDDEN_ACTIVITY_SELECTOR_FIELDS = Object.freeze([
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function assertNoCallerActivitySelectors(query = {}) {
  for (const field of FORBIDDEN_ACTIVITY_SELECTOR_FIELDS) {
    const value = query?.[field];
    if (value !== undefined && value !== null && value !== '') {
      throw createHttpError(
        400,
        'Account activity no acepta IDs de ownership arbitrarios: la autoridad se deriva server-side del usuario autenticado.',
        'finance_account_activity_owner_id_forbidden',
      );
    }
  }
}

function assertResolvedAccountId(accountId) {
  if (typeof accountId !== 'string' || !UUID_RE.test(accountId)) {
    throw createHttpError(400, 'accountId invalido.', 'invalid_finance_account_id');
  }
  return accountId;
}

function coerceLimit(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError(400, 'limit invalido.', 'invalid_finance_account_activity_limit');
  }
  return Math.min(parsed, MAX_LIMIT);
}

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para leer esta cuenta Finance.', 'finance_account_forbidden');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

const EFFECT_SELECT = [
  'id',
  'account_id',
  'transaction_id',
  'transfer_id',
  'effect_type',
  'effect_role',
  'effect_amount:effect_amount::text',
  'currency',
  'transaction_date',
  'transaction_created_at',
  'financial_context_type',
  'created_at',
].join(', ');

function activityTitleFromEffect(effect, enriched) {
  if (effect.effect_type === 'transfer') {
    return effect.effect_role === 'TRANSFER_SOURCE'
      ? 'Transferencia'
      : 'Transferencia recibida';
  }
  return enriched?.description?.trim() || (effect.effect_type === 'expense' ? 'Gasto' : 'Ingreso');
}

function toActivityDto(effect, enriched) {
  const baseTitle = activityTitleFromEffect(effect, enriched);
  const tag = effect.effect_type === 'transfer'
    ? 'transfer'
    : effect.effect_type;
  return {
    id: effect.id,
    effectType: effect.effect_type,
    effectRole: effect.effect_role,
    effectAmount: normalizeDecimalForDto(effect.effect_amount),
    currency: effect.currency,
    date: effect.transaction_date,
    description: enriched?.description ?? null,
    categoryLabelSnapshot: enriched?.category_label_snapshot ?? null,
    title: baseTitle,
    operationTag: tag,
    transactionId: effect.transaction_id ?? null,
    transferId: effect.transfer_id ?? null,
    createdAt: effect.created_at,
  };
}

async function listFinanceAccountActivity(financeContext, accountId, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoCallerActivitySelectors(query);
  assertNoAuthorityInjection(query);
  assertResolvedAccountId(accountId);

  const limit = coerceLimit(query.limit ?? query.lim);

  // Verify Account belongs to the trusted Financial Context and is readable
  // by the current user (RLS via getAccountForMutation -> scopeFilters +
  // finance_accounts RLS).
  const account = await getAccountForMutation(financeContext, accountId);

  let request = financeContext.client
    .from('finance_account_effects')
    .select(EFFECT_SELECT);

  request = request.eq('account_id', account.id);

  request = request
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  const { data: effectRows, error: effectError } = await request;
  if (effectError) throwSupabaseError(effectError);

  const effects = Array.isArray(effectRows) ? effectRows.slice(0, limit) : [];

  // Enrich labels by reusing canonical transaction/transfer truth. Joins are
  // performed client-side here in Node (the Supabase JS client RLS gates the
  // reads), staying strictly read-only over existing canonical authorities.
  const txnIds = [];
  const transferIds = [];
  const seenTxn = new Set();
  const seenTransfer = new Set();
  for (const effect of effects) {
    if (effect.transaction_id && !seenTxn.has(effect.transaction_id)) {
      seenTxn.add(effect.transaction_id);
      txnIds.push(effect.transaction_id);
    }
    if (effect.transfer_id && !seenTransfer.has(effect.transfer_id)) {
      seenTransfer.add(effect.transfer_id);
      transferIds.push(effect.transfer_id);
    }
  }

  const enrichedTxn = new Map();
  const enrichedTransfer = new Map();

  if (txnIds.length > 0) {
    const { data: txnRows, error: txnError } = await financeContext.client
      .from('finance_transactions')
      .select('id, description, category_label_snapshot')
      .in('id', txnIds)
      .eq('status', 'ACTIVE');
    if (txnError) throwSupabaseError(txnError);
    for (const row of Array.isArray(txnRows) ? txnRows : []) {
      enrichedTxn.set(row.id, {
        description: row.description,
        category_label_snapshot: row.category_label_snapshot,
      });
    }
  }

  if (transferIds.length > 0) {
    const { data: transferRows, error: transferError } = await financeContext.client
      .from('finance_transfers')
      .select('id, description')
      .in('id', transferIds);
    if (transferError) throwSupabaseError(transferError);
    for (const row of Array.isArray(transferRows) ? transferRows : []) {
      enrichedTransfer.set(row.id, {
        description: row.description,
        category_label_snapshot: null,
      });
    }
  }

  const items = effects
    .filter((effect) => {
      if (effect.transaction_id) {
        return enrichedTxn.has(effect.transaction_id);
      }
      return true;
    })
    .map((effect) => {
      const enriched = effect.transaction_id
        ? enrichedTxn.get(effect.transaction_id)
        : (effect.transfer_id ? enrichedTransfer.get(effect.transfer_id) : null);
      return toActivityDto(effect, enriched);
    });

  return {
    account: await toDto(financeContext.client, account),
    activity: items,
  };
}

module.exports = {
  listFinanceAccountActivity,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
