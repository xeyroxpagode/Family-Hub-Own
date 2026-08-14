'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TRANSACTION_TYPES,
  isValidFinanceContextType,
  isValidFinanceTransactionType,
} = require('../constants/finance.constants');
const { resolveFinanceSourceContextBoundary } = require('./finance.sourceContext.service');

const FINANCE_TRANSACTION_REQUIRED_FIELDS = Object.freeze([
  'amount',
  'currency',
  'financialContext',
  'date',
]);

const FINANCE_TRANSACTION_OPTIONAL_FIELDS = Object.freeze([
  'description',
  'category',
  'account',
  'notes',
  'document',
  'relatedDomainObject',
]);

const CALLER_AUTHORITY_FIELDS = Object.freeze([
  'personId',
  'ownerPersonId',
  'householdId',
  'membershipId',
  'contextId',
  'financialContextId',
]);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

function assertNoCallerOwnershipAuthority(payload) {
  for (const field of CALLER_AUTHORITY_FIELDS) {
    if (payload?.[field] !== undefined && payload?.[field] !== null) {
      throw createHttpError(
        400,
        `Finance Transaction no acepta ${field} arbitrario como autoridad de ownership.`,
        'finance_transaction_owner_authority_forbidden',
      );
    }
  }
}

function normalizeTransactionType(value) {
  if (!isValidFinanceTransactionType(value)) {
    throw createHttpError(
      400,
      'Transaction type invalido. Debe ser income, expense o transfer.',
      'invalid_finance_transaction_type',
    );
  }

  return value;
}

function normalizePositiveAmount(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Amount es obligatorio.', 'finance_transaction_amount_required');
  }

  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(
      400,
      'Amount debe ser una magnitud monetaria positiva.',
      'invalid_finance_transaction_amount',
    );
  }

  return amount;
}

function normalizeCurrency(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Currency es obligatoria.', 'finance_transaction_currency_required');
  }

  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(
      400,
      'Currency debe usar el codigo canonico ISO-4217 de 3 letras en mayusculas.',
      'invalid_finance_transaction_currency',
    );
  }

  return value;
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

function normalizeFinancialDate(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Date es obligatoria.', 'finance_transaction_date_required');
  }

  if (!isValidDateOnly(value)) {
    throw createHttpError(
      400,
      'Date debe ser la fecha financiera de ocurrencia en formato YYYY-MM-DD.',
      'invalid_finance_transaction_date',
    );
  }

  return value;
}

function assertResolvedFinanceContext(financialContext) {
  if (!financialContext || typeof financialContext !== 'object') {
    throw createHttpError(400, 'Financial Context resuelto requerido.', 'finance_transaction_context_required');
  }

  if (!isValidFinanceContextType(financialContext.contextType)) {
    throw createHttpError(400, 'Financial Context type invalido.', 'invalid_finance_transaction_context');
  }

  if (financialContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    if (!financialContext.personId || financialContext.householdId !== null) {
      throw createHttpError(400, 'Financial Context personal invalido.', 'invalid_finance_transaction_context');
    }
    return;
  }

  if (!financialContext.personId || !financialContext.householdId || !financialContext.membershipId) {
    throw createHttpError(400, 'Financial Context household invalido.', 'invalid_finance_transaction_context');
  }
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalValue(value) {
  if (value === undefined || value === null || value === '') return null;
  return value;
}

function normalizeFinanceTransactionContract(payload = {}) {
  assertNoCallerOwnershipAuthority(payload);

  const type = normalizeTransactionType(payload.type);
  const amount = normalizePositiveAmount(payload.amount);
  const currency = normalizeCurrency(payload.currency);
  assertResolvedFinanceContext(payload.financialContext);
  const date = normalizeFinancialDate(payload.date);
  const sourceContext = resolveFinanceSourceContextBoundary({
    financialContext: payload.financialContext,
    source: payload.source,
  });

  return Object.freeze({
    type,
    amount,
    currency,
    financialContext: payload.financialContext,
    date,
    description: normalizeOptionalString(payload.description),
    category: normalizeOptionalValue(payload.category),
    account: normalizeOptionalValue(payload.account),
    notes: normalizeOptionalString(payload.notes),
    document: normalizeOptionalValue(payload.document),
    relatedDomainObject: normalizeOptionalValue(payload.relatedDomainObject),
    sourceContext,
  });
}

module.exports = {
  FINANCE_TRANSACTION_REQUIRED_FIELDS,
  FINANCE_TRANSACTION_OPTIONAL_FIELDS,
  normalizeFinanceTransactionContract,
  isValidDateOnly,
  FINANCE_TRANSACTION_TYPES,
};
