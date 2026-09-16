'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter');
const { FINANCE_CONTEXT_TYPES } = require('../constants/finance.constants');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function assertNoAuthorityInjection(body = {}) {
  const forbidden = {
    personId: 'finance_person_id_forbidden',
    ownerPersonId: 'finance_owner_person_id_forbidden',
    householdId: 'finance_household_id_forbidden',
    membershipId: 'finance_membership_id_forbidden',
  };
  for (const [field, code] of Object.entries(forbidden)) {
    if (hasOwn(body, field) && body[field] !== undefined && body[field] !== null) {
      throw createHttpError(400, `Finance no acepta ${field} arbitrario.`, code);
    }
  }
}

function accountIdFrom(value, code) {
  const accountId = typeof value === 'string'
    ? value
    : (value && typeof value === 'object' ? value.id ?? value.accountId ?? value.account_id ?? null : null);
  if (!accountId || typeof accountId !== 'string' || !UUID_RE.test(accountId)) {
    throw createHttpError(400, 'Account invalida.', code);
  }
  return accountId;
}

function toDto(row) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
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
    status: row.status,
    trashedAt: row.trashed_at ?? null,
    correctedFromTransactionId: row.corrected_from_transaction_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByPersonId: row.created_by_person_id,
  };
}

async function correctTransaction(financeContext, body = {}) {
  assertNoAuthorityInjection(body);

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

  const correctedAmount = body.amount !== undefined ? body.amount : null;
  const correctedCurrency = body.currency !== undefined ? normalizeOptionalText(body.currency) : null;
  const correctedDate = body.transactionDate ?? body.transaction_date;
  const correctedDescription = body.description !== undefined ? normalizeOptionalText(body.description) : undefined;
  const correctedCategoryId = body.categoryId ?? body.category_id;
  const correctedAccountId = body.accountId ?? body.account_id;
  const correctedNotes = body.notes !== undefined ? normalizeOptionalText(body.notes) : undefined;

  const clearDescription = body.clearDescription ?? body.clear_description ?? false;
  const clearCategory = body.clearCategory ?? body.clear_category ?? false;
  const clearAccount = body.clearAccount ?? body.clear_account ?? false;
  const clearNotes = body.clearNotes ?? body.clear_notes ?? false;

  const payload = {
    transactionId,
    amount: correctedAmount,
    currency: correctedCurrency,
    transactionDate: correctedDate,
    description: correctedDescription ?? (clearDescription ? null : undefined),
    categoryId: correctedCategoryId,
    accountId: correctedAccountId,
    notes: correctedNotes ?? (clearNotes ? null : undefined),
    clearDescription,
    clearCategory,
    clearAccount,
    clearNotes,
    expectedVersion,
  };

  const scopeType = financeContext.contextType;
  const scopeId = scopeType === FINANCE_CONTEXT_TYPES.PERSONAL ? financeContext.personId : financeContext.householdId;

  const payloadHash = hashIdempotencyRequestV2({
    operation: 'finance.transaction.correct',
    scopeType,
    scopeId,
    targetId: transactionId,
    payload,
    expectedVersion,
    mutationId,
  });

  const rpcParams = {
    p_transaction_id: transactionId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: financeContext.personId,
    p_amount: correctedAmount,
    p_currency: correctedCurrency,
    p_transaction_date: correctedDate ?? null,
    p_description: correctedDescription ?? null,
    p_category_id: correctedCategoryId ?? null,
    p_account_id: correctedAccountId ? accountIdFrom(correctedAccountId, 'finance_account_invalid_for_correction') : null,
    p_notes: correctedNotes ?? null,
    p_clear_description: clearDescription,
    p_clear_category: clearCategory,
    p_clear_account: clearAccount,
    p_clear_notes: clearNotes,
  };

  const { data, error } = await financeContext.client.rpc('finance_correct_transaction_v1', rpcParams);

  if (error) {
    const isRlsViolation =
      error?.code === '42501' ||
      error?.code === 'PGRST301' ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

    if (isRlsViolation || error?.message?.includes('finance_transaction_owner_authority_forbidden')) {
      throw createHttpError(403, 'No tenes permiso para corregir esta transaccion.', 'finance_transaction_correct_forbidden');
    }

    if (error?.code === '00000' && error?.message === 'replay') {
      const replayData = data;
      return { transaction: toDto(replayData), outcome: 'replay' };
    }

    if (error?.code === 'P0008') {
      throw createHttpError(409, 'La operacion ya fue procesada con otros datos.', 'idempotency_conflict');
    }

    if (error?.code === 'P0009') {
      throw createHttpError(409, 'La operacion ya se esta procesando. Reintentá en unos segundos.', 'idempotency_in_flight');
    }

    if (error?.code === '23514') {
      const msg = error?.message ?? '';
      if (msg.includes('finance_transaction_not_found')) {
        throw createHttpError(404, 'Transaccion no encontrada.', 'finance_transaction_not_found');
      }
      if (msg.includes('invalid_transaction_state_for_correction')) {
        throw createHttpError(409, 'La transaccion no esta en estado ACTIVA.', 'invalid_transaction_state_for_correction');
      }
      if (msg.includes('finance_transaction_dependent_on_transfer')) {
        throw createHttpError(409, 'No se puede corregir una comision generada por Transferencia. La comision pertenece a su Transferencia propietaria.', 'finance_transaction_dependent_on_transfer');
      }
      if (msg.includes('invalid_correction_amount')) {
        throw createHttpError(400, 'El monto corregido debe ser positivo.', 'invalid_correction_amount');
      }
      if (msg.includes('invalid_correction_currency')) {
        throw createHttpError(400, 'Moneda invalida.', 'invalid_correction_currency');
      }
      if (msg.includes('finance_category_not_found_or_deleted')) {
        throw createHttpError(400, 'Categoria no encontrada o eliminada.', 'finance_category_not_found_or_deleted');
      }
      if (msg.includes('finance_category_label_empty')) {
        throw createHttpError(400, 'Etiqueta de categoria vacia.', 'finance_category_label_empty');
      }
      if (msg.includes('finance_account_invalid_for_correction')) {
        throw createHttpError(409, 'La cuenta no es valida para esta correccion (debe existir, estar ACTIVA, coincidir la moneda y ser accesible).', 'finance_account_invalid_for_correction');
      }
      if (msg.includes('finance_account_effect_not_found')) {
        throw createHttpError(500, 'Efecto de cuenta asociado no encontrado.', 'finance_account_effect_not_found');
      }
      if (msg.includes('finance_refund_total_exceeds_expense_amount')) {
        throw createHttpError(409, 'El gasto corregido no puede quedar por debajo de lo ya devuelto.', 'finance_refund_total_exceeds_expense_amount');
      }
      if (msg.includes('finance_refund_date_before_expense_date')) {
        throw createHttpError(409, 'La fecha corregida del gasto no puede quedar despues de una devolucion registrada.', 'finance_refund_date_before_expense_date');
      }
    }

    if (['23502', '23503', '22P02', '22007'].includes(error?.code)) {
      throw createHttpError(400, 'Correccion invalida.', 'validation_error');
    }

    const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
    httpError.details = error?.details;
    httpError.hint = error?.hint;
    throw httpError;
  }

  return { transaction: toDto(data), outcome: 'created' };
}

module.exports = {
  correctTransaction,
};
