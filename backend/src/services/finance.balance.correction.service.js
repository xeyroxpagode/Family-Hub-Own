'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_ACCOUNT_BALANCE_STATES,
  FINANCE_ACCOUNT_STATUSES,
} = require('../constants/finance.constants');
const {
  getAccountForMutation,
  toDto,
  normalizeEffectiveDate,
  normalizeDecimalText,
  assertResolvedFinanceContext,
  assertNoAuthorityInjection,
} = require('./finance.account.service');

const PROTECTED_PAYLOAD_FIELDS = Object.freeze([
  'currency',
  'accountType',
  'account_type',
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function assertNoProtectedPayloadFields(body = {}) {
  for (const field of PROTECTED_PAYLOAD_FIELDS) {
    if (hasOwn(body, field)) {
      throw createHttpError(400, `Finance Account no acepta mutar ${field}.`, 'protected_finance_account_field');
    }
  }
}

async function correctAccountBalance(financeContext, accountId, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoProtectedPayloadFields(body);

  const correctedBalance = normalizeDecimalText(body.correctedBalance ?? body.corrected_balance);
  const effectiveDate = normalizeEffectiveDate(body.effectiveDate ?? body.effective_date);

  const current = await getAccountForMutation(financeContext, accountId);

  if (current.status !== FINANCE_ACCOUNT_STATUSES.ACTIVE) {
    throw createHttpError(409, 'No se puede corregir saldo de una cuenta archivada.', 'finance_account_archived');
  }

  if (current.balance_state !== FINANCE_ACCOUNT_BALANCE_STATES.KNOWN) {
    throw createHttpError(409, 'Solo cuentas con saldo conocido (KNOWN) pueden corregirse. Cuentas UNKNOWN usan initial Anchor.', 'finance_account_balance_state_unknown');
  }

  const { data, error } = await financeContext.client.rpc('finance_correct_account_balance_v1', {
    p_account_id: current.id,
    p_corrected_balance: correctedBalance,
    p_effective_date: effectiveDate,
    p_created_by_person_id: financeContext.personId,
  });

  if (error) {
    if (error.message?.includes('finance_account_archived')) {
      throw createHttpError(409, 'No se puede corregir saldo de una cuenta archivada.', 'finance_account_archived');
    }
    if (error.message?.includes('finance_account_balance_state_unknown')) {
      throw createHttpError(409, 'Solo cuentas KNOWN admiten corrección de saldo.', 'finance_account_balance_state_unknown');
    }
    if (error.message?.includes('finance_account_correction_backdated_rejected')) {
      throw createHttpError(409, 'La fecha de corrección no puede ser anterior al último Anchor.', 'finance_account_correction_backdated_rejected');
    }
    if (error.message?.includes('finance_account_not_found')) {
      throw createHttpError(404, 'Cuenta Finance no encontrada.', 'finance_account_not_found');
    }
    if (error.code === '42501' || error.message?.includes('finance_account_owner_authority_forbidden')) {
      throw createHttpError(403, 'No tenes permiso para corregir esta cuenta.', 'finance_account_forbidden');
    }
    throw createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  }

  return { account: await toDto(financeContext.client, data), outcome: 'corrected' };
}

module.exports = {
  correctAccountBalance,
};
