'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');
const {
  assertNoAuthorityInjection: assertNoBaseAuthorityInjection,
  assertResolvedFinanceContext,
} = require('./finance.account.service');

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;
const PERIOD_KEY_RE = {
  MONTHLY: /^[0-9]{4}-(0[1-9]|1[0-2])$/,
  YEARLY: /^[0-9]{4}$/,
};

const FORBIDDEN_ANALYSIS_SELECTORS = Object.freeze([
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

const SAFE_ERROR_MESSAGES = Object.freeze({
  finance_analysis_context_forbidden: 'No tenes permiso para leer este contexto Finance.',
  invalid_finance_analysis_currency: 'currency debe usar codigo canonico ISO-style de 3 letras en mayusculas.',
  invalid_finance_analysis_period_type: 'periodType debe ser MONTHLY o YEARLY.',
  invalid_finance_analysis_period: 'Periodo invalido.',
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function assertNoAnalysisSelectorInjection(query = {}) {
  assertNoBaseAuthorityInjection(query);
  for (const field of FORBIDDEN_ANALYSIS_SELECTORS) {
    if (hasOwn(query, field) && query[field] !== undefined && query[field] !== null && query[field] !== '') {
      throw createHttpError(
        400,
        'Finance analysis no acepta IDs de ownership arbitrarios: la autoridad se deriva server-side.',
        'finance_analysis_owner_authority_forbidden',
      );
    }
  }
}

function normalizeCurrency(value) {
  if (typeof value !== 'string' || !CURRENCY_CODE_RE.test(value)) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_analysis_currency, 'invalid_finance_analysis_currency');
  }
  return value;
}

function normalizePeriodType(value) {
  if (value !== 'MONTHLY' && value !== 'YEARLY') {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_analysis_period_type, 'invalid_finance_analysis_period_type');
  }
  return value;
}

function normalizePeriodKey(periodType, value) {
  if (typeof value !== 'string' || !PERIOD_KEY_RE[periodType]?.test(value)) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES.invalid_finance_analysis_period, 'invalid_finance_analysis_period');
  }
  return value;
}

function throwAnalysisRpcError(error) {
  const text = String(error?.message ?? '');
  const code = text.match(/finance_[a-z0-9_]+|invalid_[a-z0-9_]+/)?.[0] ?? error?.code ?? 'internal_error';

  if (error?.code === '42501' || code.includes('forbidden')) {
    throw createHttpError(403, SAFE_ERROR_MESSAGES[code] ?? 'No tenes permiso para leer Finance.', code);
  }

  if (['23514', '22007', '22P02'].includes(error?.code) || code.startsWith('invalid_')) {
    throw createHttpError(400, SAFE_ERROR_MESSAGES[code] ?? 'Analysis Finance invalido.', code);
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', code);
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

async function getFinanceAnalysis(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAnalysisSelectorInjection(query);

  const currency = normalizeCurrency(query.currency);
  const periodType = normalizePeriodType(query.periodType ?? query.period_type ?? 'MONTHLY');
  const periodKey = normalizePeriodKey(periodType, query.period ?? query.periodKey ?? query.period_key);

  const { data, error } = await financeContext.client.rpc('finance_analysis_v1', {
    p_financial_context_type: financeContext.contextType,
    p_owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : null,
    p_household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financeContext.householdId : null,
    p_currency: currency,
    p_period_type: periodType,
    p_period_key: periodKey,
  });

  if (error) throwAnalysisRpcError(error);
  return data;
}

async function getSpendingLimitProgress(financeContext, query = {}) {
  const analysis = await getFinanceAnalysis(financeContext, query);
  return {
    contextType: analysis.contextType,
    currency: analysis.currency,
    periodType: analysis.periodType,
    period: analysis.period,
    limits: analysis.spendingLimitProgress ?? [],
  };
}

module.exports = {
  getFinanceAnalysis,
  getSpendingLimitProgress,
  assertNoAnalysisSelectorInjection,
};
