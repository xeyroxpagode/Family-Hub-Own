'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertNoAuthorityInjection(body = {}) {
  const forbidden = [
    'personId',
    'person_id',
    'ownerPersonId',
    'owner_person_id',
    'householdId',
    'household_id',
    'membershipId',
    'membership_id',
    'accountId',
    'account_id',
    'currency',
    'categoryId',
    'category_id',
  ];
  for (const field of forbidden) {
    if (body[field] !== undefined && body[field] !== null) {
      throw createHttpError(400, 'La devolucion hereda cuenta, moneda, categoria y contexto del gasto.', 'finance_refund_inherited_field_forbidden');
    }
  }
}

function normalizeUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createHttpError(400, `${field} invalido.`, 'validation_error');
  }
  return value;
}

function normalizePositiveAmount(value) {
  if (value === undefined || value === null || value === '') {
    throw createHttpError(400, 'Monto es obligatorio.', 'invalid_finance_refund_amount');
  }
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(text)) {
    throw createHttpError(400, 'Revisa el monto de la devolucion.', 'invalid_finance_refund_amount');
  }
  if (Number(text) <= 0) {
    throw createHttpError(400, 'El monto debe ser mayor que cero.', 'invalid_finance_refund_amount');
  }
  return text;
}

function normalizeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createHttpError(400, 'Fecha invalida.', 'invalid_finance_refund_date');
  }
  return value;
}

function scopeIdFor(financeContext) {
  return financeContext.contextType === 'personal' ? financeContext.personId : financeContext.householdId;
}

function toRefundDto(row) {
  return {
    id: row.id,
    rootRefundEventId: row.root_refund_event_id,
    correctedFromRefundEventId: row.corrected_from_refund_event_id ?? null,
    expenseRootTransactionId: row.expense_root_transaction_id,
    amount: String(row.amount),
    effectiveDate: row.effective_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRpcError(error) {
  const message = String(error?.message ?? '');
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    message.toLowerCase().includes('row-level security') ||
    message.includes('finance_refund_owner_authority_forbidden');

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para registrar esta devolucion.', 'finance_refund_forbidden');
  }
  if (error?.code === 'P0008') {
    throw createHttpError(409, 'La operacion ya fue procesada con otros datos.', 'idempotency_conflict');
  }
  if (error?.code === 'P0009') {
    throw createHttpError(409, 'La operacion ya se esta procesando. Reintentá en unos segundos.', 'idempotency_in_flight');
  }
  if (message.includes('finance_transaction_not_found')) {
    throw createHttpError(404, 'Movimiento no encontrado.', 'finance_transaction_not_found');
  }
  if (message.includes('finance_refund_event_not_found')) {
    throw createHttpError(404, 'Devolucion no encontrada.', 'finance_refund_event_not_found');
  }
  if (message.includes('stale_finance_refund_revision')) {
    throw createHttpError(409, 'Esta devolucion ya fue corregida. Actualiza el detalle e intenta de nuevo.', 'stale_finance_refund_revision');
  }
  if (message.includes('invalid_transaction_state_for_refund')) {
    throw createHttpError(409, 'Solo se puede registrar una devolucion sobre un gasto activo.', 'invalid_transaction_state_for_refund');
  }
  if (message.includes('finance_refund_dependent_transfer_commission')) {
    throw createHttpError(409, 'No se puede registrar una devolucion sobre una comision de Transferencia.', 'finance_refund_dependent_transfer_commission');
  }
  if (message.includes('invalid_finance_refund_amount')) {
    throw createHttpError(400, 'Revisa el monto de la devolucion.', 'invalid_finance_refund_amount');
  }
  if (message.includes('invalid_finance_refund_date') || message.includes('future_finance_refund_date')) {
    throw createHttpError(400, 'La fecha debe estar entre la fecha del gasto y hoy.', 'invalid_finance_refund_date');
  }
  if (message.includes('finance_refund_total_exceeds_expense_amount')) {
    throw createHttpError(409, 'La devolucion supera el monto pendiente del gasto.', 'finance_refund_total_exceeds_expense_amount');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

async function createRefund(financeContext, body = {}) {
  assertNoAuthorityInjection(body);

  const transactionId = normalizeUuid(body.transactionId ?? body.transaction_id, 'transactionId');
  const mutationId = body.mutationId ?? body.mutation_id;
  const idempotencyKey = body.idempotencyKey ?? body.idempotency_key;
  if (!mutationId || !idempotencyKey) {
    throw createHttpError(400, 'mutationId e idempotencyKey son obligatorios.', 'validation_error');
  }

  const amount = normalizePositiveAmount(body.amount);
  const effectiveDate = normalizeDate(body.effectiveDate ?? body.effective_date);
  const payload = { transactionId, amount, effectiveDate };
  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.refund.create',
    scopeType: financeContext.contextType,
    scopeId: scopeIdFor(financeContext),
    targetId: transactionId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  const { data, error } = await financeContext.client.rpc('finance_create_refund_event_v1', {
    p_transaction_id: transactionId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_amount: amount,
    p_effective_date: effectiveDate,
  });

  if (error) mapRpcError(error);
  return { refund: toRefundDto(data), outcome: 'created' };
}

async function correctRefund(financeContext, body = {}) {
  assertNoAuthorityInjection(body);

  const refundEventId = normalizeUuid(body.refundEventId ?? body.refund_event_id, 'refundEventId');
  const mutationId = body.mutationId ?? body.mutation_id;
  const idempotencyKey = body.idempotencyKey ?? body.idempotency_key;
  if (!mutationId || !idempotencyKey) {
    throw createHttpError(400, 'mutationId e idempotencyKey son obligatorios.', 'validation_error');
  }

  const amount = normalizePositiveAmount(body.amount);
  const effectiveDate = normalizeDate(body.effectiveDate ?? body.effective_date);
  const payload = { refundEventId, amount, effectiveDate };
  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.refund.correct',
    scopeType: financeContext.contextType,
    scopeId: scopeIdFor(financeContext),
    targetId: refundEventId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  const { data, error } = await financeContext.client.rpc('finance_correct_refund_event_v1', {
    p_refund_event_id: refundEventId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_amount: amount,
    p_effective_date: effectiveDate,
  });

  if (error) mapRpcError(error);
  return { refund: toRefundDto(data), outcome: 'created' };
}

module.exports = {
  createRefund,
  correctRefund,
};
