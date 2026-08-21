'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter');

async function restoreFinanceTransaction(financeContext, body = {}) {
  const transactionId = body.transactionId ?? body.transaction_id;
  const mutationId = body.mutationId ?? body.mutation_id;
  const idempotencyKey = body.idempotencyKey ?? body.idempotency_key;
  const expectedVersion = body.expectedVersion ?? body.expected_version;

  if (!transactionId) {
    throw createHttpError(400, 'transactionId es obligatorio.', 'validation_error');
  }
  if (!mutationId) {
    throw createHttpError(400, 'mutationId es obligatorio.', 'validation_error');
  }
  if (!idempotencyKey) {
    throw createHttpError(400, 'idempotencyKey es obligatorio.', 'validation_error');
  }

  const payload = {
    transactionId,
  };

  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.transaction.restore',
    scopeType: financeContext.contextType,
    scopeId: financeContext.contextType === 'personal' ? financeContext.personId : financeContext.householdId,
    targetId: transactionId,
    payload,
    expectedVersion,
    mutationId,
  });

  const { data, error } = await financeContext.client.rpc('finance_restore_transaction_v1', {
    p_transaction_id: transactionId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) {
    const isRlsViolation =
      error?.code === '42501' ||
      error?.code === 'PGRST301' ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

    if (isRlsViolation) {
      throw createHttpError(403, 'No tenes permiso para restaurar esta transaccion.', 'finance_transaction_restore_forbidden');
    }

    if (error?.code === 'P0008') {
      throw createHttpError(409, 'La operacion ya fue procesada con otros datos.', 'idempotency_conflict');
    }

    if (error?.code === 'P0009') {
      throw createHttpError(409, 'La operacion ya se esta procesando. Reintentá en unos segundos.', 'idempotency_in_flight');
    }

    if (['23514', '23502', '23503', '22P02', '22007'].includes(error?.code)) {
      throw createHttpError(400, 'Transaccion invalida para restaurar.', 'validation_error');
    }

    if (error?.message?.includes('finance_transaction_not_found')) {
      throw createHttpError(404, 'Transaccion no encontrada.', 'finance_transaction_not_found');
    }

    if (error?.message?.includes('finance_account_effect_not_found')) {
      throw createHttpError(500, 'Efecto de cuenta asociado no encontrado.', 'finance_account_effect_not_found');
    }

    if (error?.code === '23514' && error?.message?.includes('finance_transaction_dependent_on_transfer')) {
      throw createHttpError(409, 'No se puede restaurar una comision generada por Transferencia. La comision pertenece a su Transferencia propietaria.', 'finance_transaction_dependent_on_transfer');
    }

    if (error?.code === '23514' && error?.message?.includes('invalid_transaction_state_for_restore')) {
      throw createHttpError(409, 'La transaccion no esta en estado TRASHED.', 'invalid_transaction_state_for_restore');
    }

    const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
    httpError.details = error?.details;
    httpError.hint = error?.hint;
    throw httpError;
  }

  return { transaction: toDto(data) };
}

function toDto(row) {
  return {
    id: row.id,
    type: row.transaction_type,
    amount: Number(row.amount),
    currency: row.currency,
    financialContextType: row.financial_context_type,
    ownerPersonId: row.owner_person_id ?? null,
    householdId: row.household_id ?? null,
    date: row.transaction_date,
    description: row.description ?? null,
    notes: row.notes ?? null,
    categoryId: row.category_id ?? null,
    categoryLabelSnapshot: row.category_label_snapshot ?? null,
    status: row.status ?? 'ACTIVE',
    trashedAt: row.trashed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  restoreFinanceTransaction,
};
