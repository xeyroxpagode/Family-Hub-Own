'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { requireMutationContract, OPERATION_KINDS } = require('../lib/mutationContracts');
const {
  hashIdempotencyRequestV2,
  mapV2RpcError,
} = require('../lib/plannerIdempotencyAdapter');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');
const {
  assertNoAuthorityInjection,
  assertResolvedFinanceContext,
  normalizeDecimalForDto,
  normalizeDecimalText,
  normalizeEffectiveDate,
} = require('./finance.account.service');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_TRANSFER_FIELDS = Object.freeze([
  'category',
  'categoryId',
  'category_id',
  'currency',
  'sourceCurrency',
  'source_currency',
  'destinationCurrency',
  'destination_currency',
  'fee',
  'transferFee',
  'transfer_fee',
  'fx',
  'rate',
  'exchangeRate',
  'exchange_rate',
  'budget',
  'payment',
  'paid',
  'status',
  'commission',
  'commissionCurrency',
  'commission_currency',
  'commissionAccountId',
  'commission_account_id',
  'commissionCategoryId',
  'commission_category_id',
  'commissionCategory',
  'commissionAccount',
  'commissionLabel',
  'commission_label',
  'commissionDescription',
  'commission_description',
  'commissionMerchant',
  'commission_merchant',
  'commissionNotes',
  'commission_notes',
  'commissionDate',
  'commission_date',
  'commissionContext',
  'commission_context',
  'commissionContextType',
  'commission_context_type',
]);

const SAFE_TRANSFER_ERROR_MESSAGES = Object.freeze({
  finance_transfer_same_account: 'Elegí dos cuentas distintas.',
  finance_transfer_source_required: 'Elegí una cuenta de origen.',
  finance_transfer_destination_required: 'Elegí una cuenta de destino.',
  invalid_finance_transfer_amount: 'Revisá el monto a transferir.',
  invalid_finance_transfer_source_amount: 'Revisá el monto de origen.',
  invalid_finance_transfer_destination_amount: 'Revisá el monto de destino.',
  invalid_finance_transfer_date: 'Revisá la fecha de la transferencia.',
  finance_transfer_source_archived: 'La cuenta de origen está archivada.',
  finance_transfer_destination_archived: 'La cuenta de destino está archivada.',
  finance_transfer_credit_card_source_deferred: 'Las tarjetas de crédito no pueden ser cuenta de origen.',
  invalid_finance_transfer_destination_type: 'La cuenta de destino no es válida para transferencias.',
  finance_transfer_same_currency_amount_mismatch_3f: 'En la misma moneda, el monto de origen y destino debe coincidir.',
  finance_transfer_source_insufficient_funds: 'Saldo insuficiente para cubrir la transferencia y la comision.',
  finance_account_insufficient_funds: 'No tenés saldo suficiente en la cuenta de origen.',
  finance_transfer_commission_negative: 'La comisión debe ser una magnitud positiva.',
  invalid_finance_transfer_commission_amount: 'Revisá la comisión.',
  finance_commission_category_not_found: 'No encontramos la categoría de comisiones e intereses.',
  finance_transfer_source_not_found: 'No tenés permiso para usar la cuenta de origen.',
  finance_transfer_destination_not_found: 'No tenés permiso para usar la cuenta de destino.',
  invalid_transfer_state_for_trash: 'La transferencia no está en estado ACTIVA.',
  invalid_transfer_state_for_restore: 'La transferencia no está en estado REVERTIDA.',
  finance_payment_settlement_exceeds_remaining: 'El monto no puede superar lo que resta pagar.',
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw createHttpError(400, 'El campo de texto es invalido.', 'validation_error');
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function assertNoForbiddenTransferFields(body = {}) {
  assertNoAuthorityInjection(body);
  for (const field of FORBIDDEN_TRANSFER_FIELDS) {
    if (hasOwn(body, field)) {
      throw createHttpError(400, `Transfer no acepta ${field} en 3F.`, 'protected_finance_transfer_field');
    }
  }
}

function accountIdFrom(value, code) {
  const accountId = typeof value === 'string'
    ? value
    : (value && typeof value === 'object' ? value.id ?? value.accountId ?? value.account_id ?? null : null);
  if (!accountId || typeof accountId !== 'string' || !UUID_RE.test(accountId)) {
    throw createHttpError(400, 'Account requerida para Transfer.', code);
  }
  return accountId;
}

function sourceAccountIdFrom(body = {}) {
  return accountIdFrom(
    body.sourceAccount ?? body.source_account ?? body.source ?? null,
    'finance_transfer_source_required',
  );
}

function destinationAccountIdFrom(body = {}) {
  return accountIdFrom(
    body.destinationAccount ?? body.destination_account ?? body.destination ?? null,
    'finance_transfer_destination_required',
  );
}

function normalizeTransferAmount(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'amount es obligatorio.', 'invalid_finance_transfer_amount');
  }
  const text = normalizeDecimalText(String(value), 'invalid_finance_transfer_amount');
  if (!isPositiveDecimalText(text)) {
    throw createHttpError(400, 'amount debe ser positivo.', 'invalid_finance_transfer_amount');
  }
  return text;
}

function isPositiveDecimalText(text) {
  if (text.startsWith('-')) return false;
  return text.replace('.', '').split('').some((char) => char !== '0');
}

function normalizeCommissionAmount(body = {}) {
  const raw = body.commissionAmount ?? body.commission_amount;
  if (raw === undefined || raw === null || raw === '') return null;
  const text = normalizeDecimalText(String(raw), 'invalid_finance_transfer_commission_amount');
  if (text.startsWith('-')) {
    throw createHttpError(400, 'No se puede ingresar signo en Commission.', 'invalid_finance_transfer_commission_amount');
  }
  if (!isPositiveDecimalText(text)) {
    throw createHttpError(400, 'Commission debe ser positivo.', 'invalid_finance_transfer_commission_amount');
  }
  return text;
}

function normalizeTransferSideAmount(value, code) {
  if (value === undefined || value === null || value === '') return null;
  const text = normalizeDecimalText(String(value), code);
  if (!isPositiveDecimalText(text)) {
    throw createHttpError(400, 'Transfer amount debe ser positivo.', code);
  }
  return text;
}

function normalizeTransferAmounts(body = {}) {
  const hasLegacyAmount = hasOwn(body, 'amount');
  const hasSourceAmount = hasOwn(body, 'sourceAmount') || hasOwn(body, 'source_amount');
  const hasDestinationAmount = hasOwn(body, 'destinationAmount') || hasOwn(body, 'destination_amount');

  if (hasLegacyAmount && (hasSourceAmount || hasDestinationAmount)) {
    throw createHttpError(400, 'Transfer amount contract ambiguo.', 'invalid_finance_transfer_amount_contract');
  }

  if (hasLegacyAmount) {
    return {
      sourceAmount: normalizeTransferAmount(body.amount),
      destinationAmount: null,
    };
  }

  const sourceAmount = normalizeTransferSideAmount(
    body.sourceAmount ?? body.source_amount,
    'invalid_finance_transfer_source_amount',
  );
  const destinationAmount = normalizeTransferSideAmount(
    body.destinationAmount ?? body.destination_amount,
    'invalid_finance_transfer_destination_amount',
  );

  if (!sourceAmount) {
    throw createHttpError(400, 'sourceAmount es obligatorio.', 'invalid_finance_transfer_source_amount');
  }

  return { sourceAmount, destinationAmount };
}

function normalizeTransferDto(raw) {
  const transfer = raw?.transfer ?? raw;
  const commission = raw?.commission ?? null;
  const sourceAccountId = transfer.sourceAccountId ?? transfer.source_account_id;
  const destinationAccountId = transfer.destinationAccountId ?? transfer.destination_account_id;
  const sourceAmount = transfer.sourceAmount ?? transfer.source_amount ?? transfer.amount;
  const destinationAmount = transfer.destinationAmount ?? transfer.destination_amount ?? transfer.amount;
  const sourceCurrency = transfer.sourceCurrency ?? transfer.source_currency ?? transfer.currency;
  const destinationCurrency = transfer.destinationCurrency ?? transfer.destination_currency ?? transfer.currency;
  const date = transfer.date ?? transfer.transfer_date;
  const createdAt = transfer.createdAt ?? transfer.created_at;
  return {
    id: transfer.id,
    type: 'transfer',
    sourceAccountId,
    destinationAccountId,
    amount: normalizeDecimalForDto(transfer.amount ?? sourceAmount),
    sourceAmount: normalizeDecimalForDto(sourceAmount),
    destinationAmount: normalizeDecimalForDto(destinationAmount),
    currency: transfer.currency,
    sourceCurrency,
    destinationCurrency,
    date,
    description: transfer.description ?? null,
    notes: transfer.notes ?? null,
    status: transfer.status ?? 'ACTIVE',
    createdAt,
    commission: commission
      ? {
        expenseId: commission.expenseId,
        amount: normalizeDecimalForDto(commission.amount),
        currency: commission.currency,
        categoryId: commission.categoryId,
        categoryLabelSnapshot: commission.categoryLabelSnapshot,
        accountId: commission.accountId,
        financialContextType: commission.financialContextType,
      }
      : null,
    sourceTotalDebit: normalizeDecimalForDto(raw?.sourceTotalDebit ?? sourceAmount),
  };
}

function normalizeCorrelation(correlation = {}) {
  const mutationId = correlation.mutationId ?? correlation.mutation_id ?? null;
  const idempotencyKey = correlation.idempotencyKey ?? correlation.idempotency_key ?? null;
  const requestId = correlation.requestId ?? correlation.request_id ?? null;
  if (!mutationId || !idempotencyKey) {
    throw createHttpError(422, 'Transfer requiere X-Mutation-Id e Idempotency-Key.', 'idempotency_key_required');
  }
  return { mutationId, idempotencyKey, requestId };
}

function correlationFromRequest(req) {
  return requireMutationContract(req, OPERATION_KINDS.CREATE_IDEMPOTENT);
}

function normalizeTransferId(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, `${field} invalido.`, 'validation_error');
  }
  return value;
}

function normalizeMutationPayload(correlation = {}) {
  const mutationId = correlation.mutationId ?? correlation.mutation_id ?? null;
  const idempotencyKey = correlation.idempotencyKey ?? correlation.idempotency_key ?? null;
  const payloadHash = correlation.payloadHash ?? correlation.payload_hash ?? null;
  if (!mutationId || !idempotencyKey || !payloadHash) {
    throw createHttpError(422, 'Transfer lifecycle requiere mutationId, idempotencyKey y payloadHash.', 'idempotency_key_required');
  }
  return { mutationId, idempotencyKey, payloadHash };
}

async function trashTransfer(financeContext, transferId, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  const tid = normalizeTransferId(transferId, 'transferId');
  const { mutationId, idempotencyKey, payloadHash } = normalizeMutationPayload(correlation);

  const { data, error } = await financeContext.client.rpc('finance_trash_transfer_v1', {
    p_transfer_id: tid,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) {
    if (['P0008', 'P0009'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.transfer.trash');
    }
    const code = String(error.message ?? '').match(/(?:invalid_)?finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('insufficient') ? 409 : 400;
    throw createHttpError(status, SAFE_TRANSFER_ERROR_MESSAGES[code] ?? 'No pudimos mover la transferencia a papelera.', code);
  }

  return {
    transfer: normalizeTransferDto(data),
    outcome: data.outcome === 'replay' ? 'replay' : 'trashed',
  };
}

async function restoreTransfer(financeContext, transferId, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  const tid = normalizeTransferId(transferId, 'transferId');
  const { mutationId, idempotencyKey, payloadHash } = normalizeMutationPayload(correlation);

  const { data, error } = await financeContext.client.rpc('finance_restore_transfer_v1', {
    p_transfer_id: tid,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) {
    if (['P0008', 'P0009'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.transfer.restore');
    }
    const code = String(error.message ?? '').match(/(?:invalid_)?finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501' ? 403 : code.includes('insufficient') || code.includes('exceeds') ? 409 : 400;
    throw createHttpError(status, SAFE_TRANSFER_ERROR_MESSAGES[code] ?? 'No pudimos restaurar la transferencia.', code);
  }

  return {
    transfer: normalizeTransferDto(data),
    outcome: data.outcome === 'replay' ? 'replay' : 'restored',
  };
}

async function createTransfer(financeContext, body = {}, correlation = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoForbiddenTransferFields(body);

  const sourceAccountId = sourceAccountIdFrom(body);
  const destinationAccountId = destinationAccountIdFrom(body);
  if (sourceAccountId === destinationAccountId) {
    throw createHttpError(400, 'Source y Destination deben ser cuentas distintas.', 'finance_transfer_same_account');
  }

  const { sourceAmount, destinationAmount } = normalizeTransferAmounts(body);
  const date = normalizeEffectiveDate(body.date ?? body.transferDate ?? body.transfer_date);
  const description = normalizeOptionalText(body.description);
  const notes = normalizeOptionalText(body.notes);
  const commissionAmount = normalizeCommissionAmount(body);
  const normalizedCorrelation = normalizeCorrelation(correlation);

  const payload = {
    sourceAccountId,
    destinationAccountId,
    sourceAmount,
    destinationAmount,
    date,
    description,
    notes,
    commissionAmount,
  };

  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.transfer.create',
    scopeType: FINANCE_CONTEXT_TYPES.PERSONAL,
    scopeId: financeContext.personId,
    targetId: null,
    payload,
    expectedVersion: null,
    mutationId: normalizedCorrelation.mutationId,
  });

  const { data, error } = await financeContext.client.rpc('finance_create_transfer_v1', {
    p_actor_account_id: financeContext.accountId,
    p_actor_person_id: financeContext.personId,
    p_source_account_id: sourceAccountId,
    p_destination_account_id: destinationAccountId,
    p_source_amount: sourceAmount,
    p_destination_amount: destinationAmount,
    p_transfer_date: date,
    p_description: description,
    p_notes: notes,
    p_request_id: normalizedCorrelation.requestId ?? null,
    p_mutation_id: normalizedCorrelation.mutationId,
    p_idempotency_key: normalizedCorrelation.idempotencyKey,
    p_payload_hash: payloadHash,
    p_commission_amount: commissionAmount,
  });

  if (error) {
    if (['P0008', 'P0009', '55000', 'P0010'].includes(error.code)) {
      throw mapV2RpcError(error, 'finance.transfer.create');
    }

    const code = String(error.message ?? '').match(/(?:invalid_)?finance_[a-z0-9_]+/)?.[0] ?? error.code ?? 'internal_error';
    const status = error.code === '42501'
      ? 403
      : code.includes('archived') || code.includes('cross_currency') || code.includes('credit_card_source') || code.includes('insufficient')
        ? 409
        : 400;
    throw createHttpError(status, SAFE_TRANSFER_ERROR_MESSAGES[code] ?? 'No pudimos registrar la transferencia.', code);
  }

  const responseBody = data.response_body ?? data.body ?? data;
  return {
    transfer: normalizeTransferDto(responseBody),
    outcome: data.outcome === 'replay' ? 'replay' : 'created',
  };
}

module.exports = {
  createTransfer,
  trashTransfer,
  restoreTransfer,
  correlationFromRequest,
};
