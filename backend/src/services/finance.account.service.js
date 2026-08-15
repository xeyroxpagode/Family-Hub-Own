'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_ACCOUNT_BALANCE_STATES,
  FINANCE_ACCOUNT_STATUSES,
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CONTEXT_TYPES,
  isValidFinanceAccountStatus,
  isValidFinanceAccountType,
} = require('../constants/finance.constants');

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_TEXT_RE = /^-?(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_ACCOUNT_AUTHORITY_FIELDS = Object.freeze([
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
  'authUserId',
  'auth_user_id',
  'contextId',
  'financialContextId',
]);

const PROTECTED_CREATE_FIELDS = Object.freeze([
  'id',
  'status',
  'lifecycle',
  'archivedAt',
  'archived_at',
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'createdByPersonId',
  'created_by_person_id',
  'updatedByPersonId',
  'updated_by_person_id',
]);

const PROTECTED_BALANCE_FIELDS = Object.freeze([
  'balance',
  'currentBalance',
  'current_balance',
  'openingBalance',
  'opening_balance',
  'balanceState',
  'balance_state',
  'anchor',
  'anchorAmount',
  'anchor_amount',
  'balanceAnchor',
  'balance_anchor',
]);

const PROTECTED_UPDATE_FIELDS = Object.freeze([
  ...PROTECTED_CREATE_FIELDS,
  ...PROTECTED_BALANCE_FIELDS,
  'financialContextType',
  'financial_context_type',
  'contextType',
  'context_type',
  'accountType',
  'account_type',
  'currency',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para acceder a esta cuenta Finance.', 'finance_account_forbidden');
  }

  if (['23514', '23502', '23503', '22P02'].includes(error?.code)) {
    throw createHttpError(400, 'Cuenta Finance invalida.', 'validation_error');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
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

function assertNoAuthorityInjection(payload = {}) {
  for (const field of FORBIDDEN_ACCOUNT_AUTHORITY_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      throw createHttpError(
        400,
        `Finance Account no acepta ${field} arbitrario como autoridad de ownership.`,
        'finance_account_owner_authority_forbidden',
      );
    }
  }
}

function assertNoForbiddenFields(payload = {}, fields, code) {
  for (const field of fields) {
    if (hasOwn(payload, field)) {
      throw createHttpError(
        400,
        `Finance Account no acepta mutar ${field}.`,
        code,
      );
    }
  }
}

function normalizeName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw createHttpError(400, 'name es obligatorio.', 'invalid_finance_account_name');
  }
  return name;
}

function normalizeCurrency(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'currency es obligatoria.', 'finance_account_currency_required');
  }

  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(
      400,
      'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
      'invalid_finance_account_currency',
    );
  }

  return value;
}

function normalizeAccountType(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'accountType es obligatorio.', 'finance_account_type_required');
  }

  if (!isValidFinanceAccountType(value)) {
    throw createHttpError(
      400,
      'accountType invalido. Debe ser ACCOUNT o CREDIT_CARD.',
      'invalid_finance_account_type',
    );
  }

  return value;
}

function normalizeStatusFilter(value) {
  if (value === undefined || value === null || value === '') {
    return FINANCE_ACCOUNT_STATUSES.ACTIVE;
  }
  if (!isValidFinanceAccountStatus(value)) {
    throw createHttpError(400, 'status invalido. Debe ser ACTIVE o ARCHIVED.', 'invalid_finance_account_status');
  }
  return value;
}

function truthy(value) {
  return value === true || value === 'true' || value === '1';
}

function normalizeDecimalText(value, code = 'invalid_finance_account_balance_amount') {
  if (typeof value !== 'string' || !DECIMAL_TEXT_RE.test(value.trim())) {
    throw createHttpError(400, 'amount debe ser un decimal exacto como string.', code);
  }
  return value.trim();
}

function normalizeDecimalForDto(value) {
  if (value === undefined || value === null) return null;
  let text = String(value);
  if (!text.includes('.')) return text;
  text = text.replace(/0+$/, '').replace(/\.$/, '');
  if (text === '-0') return '0';
  return text;
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeEffectiveDate(value) {
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, 'effectiveDate debe ser YYYY-MM-DD.', 'invalid_finance_account_anchor_effective_date');
  }
  return value;
}

function normalizeInitialBalance(body = {}) {
  const candidate = body.initialBalance ?? body.initial_balance ?? null;
  if (candidate === undefined || candidate === null || candidate === '') return null;
  if (typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw createHttpError(400, 'initialBalance invalido.', 'invalid_finance_account_initial_balance');
  }
  return {
    amount: normalizeDecimalText(candidate.amount),
    effectiveDate: normalizeEffectiveDate(candidate.effectiveDate ?? candidate.effective_date),
  };
}

async function currentBalanceForAccount(client, row) {
  if (row.balance_state !== FINANCE_ACCOUNT_BALANCE_STATES.KNOWN) return null;
  const { data, error } = await client.rpc('finance_account_current_balance_text', {
    p_account_id: row.id,
  });
  if (error) throwSupabaseError(error);
  return normalizeDecimalForDto(data);
}

async function toDto(client, row) {
  const currentBalance = await currentBalanceForAccount(client, row);
  return {
    id: row.id,
    financialContextType: row.financial_context_type,
    ownerPersonId: row.owner_person_id ?? null,
    householdId: row.household_id ?? null,
    name: row.name,
    currency: row.currency,
    accountType: row.account_type,
    balanceState: row.balance_state,
    currentBalance,
    status: row.status,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

async function listFinanceAccounts(financeContext, query = {}) {
  assertNoAuthorityInjection(query);
  assertResolvedFinanceContext(financeContext);

  let request = financeContext.client
    .from('finance_accounts')
    .select('*');

  request = scopeFilters(request, financeContext);

  if (truthy(query.includeArchived) || truthy(query.include_archived)) {
    const requestedStatus = query.status ?? query.lifecycle;
    if (requestedStatus !== undefined && requestedStatus !== null && requestedStatus !== '') {
      request = request.eq('status', normalizeStatusFilter(requestedStatus));
    }
  } else {
    request = request.eq('status', normalizeStatusFilter(query.status ?? query.lifecycle));
  }

  request = request
    .order('name', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await request;
  if (error) throwSupabaseError(error);

  return { accounts: await Promise.all((data ?? []).map((row) => toDto(financeContext.client, row))) };
}

async function getAccountForMutation(financeContext, accountId) {
  assertResolvedFinanceContext(financeContext);

  let request = financeContext.client
    .from('finance_accounts')
    .select('*')
    .eq('id', accountId);

  request = scopeFilters(request, financeContext);

  const { data, error } = await request.maybeSingle();
  if (error) throwSupabaseError(error);
  if (!data) {
    throw createHttpError(404, 'Cuenta Finance no encontrada.', 'finance_account_not_found');
  }

  return data;
}

async function getFinanceAccount(financeContext, accountId) {
  const account = await getAccountForMutation(financeContext, accountId);
  return { account: await toDto(financeContext.client, account) };
}

async function createFinanceAccount(financeContext, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_CREATE_FIELDS, 'protected_finance_account_field');
  assertNoForbiddenFields(body, PROTECTED_BALANCE_FIELDS, 'finance_account_balance_field_not_supported');

  const accountType = normalizeAccountType(body.accountType ?? body.account_type);
  const initialBalance = normalizeInitialBalance(body);

  const { data, error } = await financeContext.client.rpc('finance_create_account_v1', {
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    p_name: normalizeName(body.name),
    p_currency: normalizeCurrency(body.currency),
    p_account_type: accountType,
    p_created_by_person_id: financeContext.personId,
    p_initial_anchor_amount: initialBalance?.amount ?? null,
    p_initial_anchor_effective_date: initialBalance?.effectiveDate ?? null,
  });

  if (error) throwSupabaseError(error);
  return { account: await toDto(financeContext.client, data) };
}

async function updateFinanceAccount(financeContext, accountId, body = {}) {
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, PROTECTED_UPDATE_FIELDS, 'protected_finance_account_field');

  const current = await getAccountForMutation(financeContext, accountId);
  if (!hasOwn(body, 'name')) {
    return { account: await toDto(financeContext.client, current), outcome: 'noop' };
  }

  const { data, error } = await financeContext.client
    .from('finance_accounts')
    .update({
      name: normalizeName(body.name),
      updated_by_person_id: financeContext.personId,
    })
    .eq('id', current.id)
    .select('*')
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data) {
    throw createHttpError(404, 'Cuenta Finance no encontrada.', 'finance_account_not_found');
  }

  return { account: await toDto(financeContext.client, data), outcome: 'updated' };
}

async function archiveFinanceAccount(financeContext, accountId, body = {}) {
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, [...PROTECTED_CREATE_FIELDS, ...PROTECTED_BALANCE_FIELDS, 'name', 'currency', 'accountType', 'account_type'], 'protected_finance_account_field');

  const current = await getAccountForMutation(financeContext, accountId);
  if (current.status === FINANCE_ACCOUNT_STATUSES.ARCHIVED) {
    return { account: await toDto(financeContext.client, current), outcome: 'noop' };
  }

  const { data, error } = await financeContext.client
    .from('finance_accounts')
    .update({
      status: FINANCE_ACCOUNT_STATUSES.ARCHIVED,
      archived_at: new Date().toISOString(),
      updated_by_person_id: financeContext.personId,
    })
    .eq('id', current.id)
    .select('*')
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data) throw createHttpError(404, 'Cuenta Finance no encontrada.', 'finance_account_not_found');
  return { account: await toDto(financeContext.client, data), outcome: 'archived' };
}

async function unarchiveFinanceAccount(financeContext, accountId, body = {}) {
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, [...PROTECTED_CREATE_FIELDS, ...PROTECTED_BALANCE_FIELDS, 'name', 'currency', 'accountType', 'account_type'], 'protected_finance_account_field');

  const current = await getAccountForMutation(financeContext, accountId);
  if (current.status === FINANCE_ACCOUNT_STATUSES.ACTIVE) {
    return { account: await toDto(financeContext.client, current), outcome: 'noop' };
  }

  const { data, error } = await financeContext.client
    .from('finance_accounts')
    .update({
      status: FINANCE_ACCOUNT_STATUSES.ACTIVE,
      archived_at: null,
      updated_by_person_id: financeContext.personId,
    })
    .eq('id', current.id)
    .select('*')
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data) throw createHttpError(404, 'Cuenta Finance no encontrada.', 'finance_account_not_found');
  return { account: await toDto(financeContext.client, data), outcome: 'unarchived' };
}

async function createInitialBalanceAnchor(financeContext, accountId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['currency', 'accountType', 'account_type', ...PROTECTED_CREATE_FIELDS], 'protected_finance_account_field');

  const amount = normalizeDecimalText(body.amount);
  const effectiveDate = normalizeEffectiveDate(body.effectiveDate ?? body.effective_date);

  const current = await getAccountForMutation(financeContext, accountId);
  if (current.status !== FINANCE_ACCOUNT_STATUSES.ACTIVE) {
    throw createHttpError(409, 'No se puede establecer saldo inicial en una cuenta archivada.', 'finance_account_archived');
  }
  if (current.balance_state !== FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN) {
    throw createHttpError(409, 'La cuenta ya tiene saldo conocido.', 'finance_account_initial_anchor_exists');
  }

  const { data, error } = await financeContext.client.rpc('finance_create_initial_balance_anchor_v1', {
    p_account_id: current.id,
    p_amount: amount,
    p_effective_date: effectiveDate,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) {
    if (error.code === '23505') {
      throw createHttpError(409, 'La cuenta ya tiene saldo conocido.', 'finance_account_initial_anchor_exists');
    }
    throwSupabaseError(error);
  }

  return { account: await toDto(financeContext.client, data), outcome: 'anchored' };
}

function accountReferenceFrom(body = {}) {
  const raw = body.account;
  if (raw === undefined || raw === null || raw === '') return null;
  const accountId = typeof raw === 'string'
    ? raw
    : (typeof raw === 'object' ? raw.id ?? raw.accountId ?? raw.account_id ?? null : null);
  if (!accountId || typeof accountId !== 'string' || !UUID_RE.test(accountId)) {
    throw createHttpError(400, 'Account invalida.', 'invalid_finance_transaction_account');
  }
  return accountId;
}

async function resolveAccountForTransaction(financeContext, body, transactionType, currency) {
  const accountId = accountReferenceFrom(body);
  if (!accountId) return null;

  const { data: account, error } = await financeContext.client
    .from('finance_accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!account) {
    throw createHttpError(400, 'Account no es seleccionable en este Financial Context.', 'invalid_finance_transaction_account');
  }

  if (account.status !== FINANCE_ACCOUNT_STATUSES.ACTIVE) {
    throw createHttpError(409, 'Account archivada no es seleccionable.', 'finance_account_archived');
  }

  if (
    account.account_type !== FINANCE_ACCOUNT_TYPES.ACCOUNT &&
    account.account_type !== FINANCE_ACCOUNT_TYPES.CREDIT_CARD
  ) {
    throw createHttpError(400, 'Tipo de cuenta invalido para esta transaccion.', 'invalid_finance_transaction_account_type');
  }

  if (account.currency !== currency) {
    throw createHttpError(400, 'La moneda de la transaccion debe coincidir con la cuenta.', 'finance_account_currency_mismatch');
  }

  const accountIsPersonal =
    account.financial_context_type === FINANCE_CONTEXT_TYPES.PERSONAL &&
    account.owner_person_id === financeContext.personId &&
    account.household_id === null;
  const accountIsActiveHousehold =
    account.financial_context_type === FINANCE_CONTEXT_TYPES.HOUSEHOLD &&
    account.household_id === financeContext.householdId &&
    account.owner_person_id === null;

  const accountIsCreditCard = account.account_type === FINANCE_ACCOUNT_TYPES.CREDIT_CARD;

  if (transactionType === 'expense') {
    if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL && accountIsPersonal) return account;
    if (financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD && (accountIsActiveHousehold || accountIsPersonal)) return account;
  }

  if (transactionType === 'income') {
    if (accountIsCreditCard) {
      throw createHttpError(400, 'CREDIT_CARD no recibe efectos Income.', 'finance_credit_card_income_denied');
    }
    if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL && accountIsPersonal) return account;
    if (financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD && accountIsActiveHousehold) return account;
  }

  throw createHttpError(400, 'Account no es compatible con esta transaccion Finance.', 'invalid_finance_transaction_account_relationship');
}

module.exports = {
  createFinanceAccount,
  listFinanceAccounts,
  getFinanceAccount,
  createInitialBalanceAnchor,
  resolveAccountForTransaction,
  normalizeDecimalText,
  normalizeDecimalForDto,
  normalizeEffectiveDate,
  getAccountForMutation,
  toDto,
  assertResolvedFinanceContext,
  assertNoAuthorityInjection,
  updateFinanceAccount,
  archiveFinanceAccount,
  unarchiveFinanceAccount,
};
