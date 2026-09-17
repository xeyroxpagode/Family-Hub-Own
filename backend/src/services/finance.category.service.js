'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CATEGORY_KINDS,
  FINANCE_CATEGORY_TYPES,
  FINANCE_CONTEXT_TYPES,
  isValidFinanceCategoryType,
} = require('../constants/finance.constants');

const FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT = Object.freeze({
  ownerStage: '2C',
  requiredTransactionFields: Object.freeze(['category_id', 'category_label_snapshot']),
  renameRule: 'category_rename_must_not_rewrite_historical_snapshot',
  deleteRule: 'category_delete_must_not_delete_historical_facts',
});

const FORBIDDEN_CATEGORY_AUTHORITY_FIELDS = Object.freeze([
  'personId',
  'ownerPersonId',
  'owner_person_id',
  'householdId',
  'household_id',
  'membershipId',
  'membership_id',
  'contextId',
  'financialContextId',
]);

const FORBIDDEN_CREATE_FIELDS = Object.freeze([
  'id',
  'nativeKey',
  'native_key',
  'categoryKind',
  'category_kind',
  'deletedAt',
  'deleted_at',
  'archivedAt',
  'archived_at',
  'restoredAt',
  'restored_at',
]);

const FORBIDDEN_UPDATE_FIELDS = Object.freeze([
  ...FORBIDDEN_CREATE_FIELDS,
  'type',
  'categoryType',
  'category_type',
  'contextType',
  'context_type',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function throwSupabaseError(error) {
  const isRlsViolation =
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para acceder a esta categoria Finance.', 'finance_category_forbidden');
  }

  const httpError = createHttpError(500, error?.message ?? 'Error interno.', error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
}

function assertNoAuthorityInjection(payload = {}) {
  for (const field of FORBIDDEN_CATEGORY_AUTHORITY_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null) {
      throw createHttpError(
        400,
        `Finance Category no acepta ${field} arbitrario como autoridad de ownership.`,
        'finance_category_owner_authority_forbidden',
      );
    }
  }
}

function assertNoForbiddenFields(payload = {}, fields, code) {
  for (const field of fields) {
    if (hasOwn(payload, field)) {
      throw createHttpError(
        400,
        `Finance Category no acepta mutar ${field}.`,
        code,
      );
    }
  }
}

function normalizeCategoryType(value) {
  if (!isValidFinanceCategoryType(value)) {
    throw createHttpError(
      400,
      'Category type invalido. Debe ser expense o income.',
      'invalid_finance_category_type',
    );
  }

  return value;
}

function normalizeLabel(value) {
  const label = normalizeString(value);
  if (!label) {
    throw createHttpError(400, 'label es obligatorio.', 'invalid_finance_category_label');
  }

  return label;
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

function isCategoryInContext(row, financeContext) {
  if (row.category_kind === FINANCE_CATEGORY_KINDS.NATIVE) return true;

  if (financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return row.context_type === FINANCE_CONTEXT_TYPES.PERSONAL &&
      row.owner_person_id === financeContext.personId;
  }

  return row.context_type === FINANCE_CONTEXT_TYPES.HOUSEHOLD &&
    row.household_id === financeContext.householdId;
}

function toDto(row) {
  return {
    id: row.id,
    kind: row.category_kind,
    type: row.category_type,
    nativeKey: row.native_key ?? null,
    label: row.label,
    contextType: row.context_type ?? null,
    selectable: row.deleted_at === null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortCategories(left, right) {
  const typeDiff = left.category_type.localeCompare(right.category_type);
  if (typeDiff !== 0) return typeDiff;

  if (left.category_kind !== right.category_kind) {
    return left.category_kind === FINANCE_CATEGORY_KINDS.NATIVE ? -1 : 1;
  }

  const sortDiff = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
  if (sortDiff !== 0) return sortDiff;

  return left.label.localeCompare(right.label);
}

async function listFinanceCategories(financeContext, query = {}) {
  assertResolvedFinanceContext(financeContext);
  const type = query.type ? normalizeCategoryType(query.type) : null;

  const { data, error } = await financeContext.client
    .from('finance_categories')
    .select('*')
    .is('deleted_at', null);

  if (error) throwSupabaseError(error);

  const categories = (data ?? [])
    .filter((row) => isCategoryInContext(row, financeContext))
    .filter((row) => !type || row.category_type === type)
    .sort(sortCategories)
    .map(toDto);

  return { categories };
}

async function getCategoryForMutation(financeContext, categoryId) {
  assertResolvedFinanceContext(financeContext);

  const { data, error } = await financeContext.client
    .from('finance_categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data || !isCategoryInContext(data, financeContext)) {
    throw createHttpError(404, 'Categoria Finance no encontrada.', 'finance_category_not_found');
  }

  return data;
}

function assertCustomMutable(row, operation) {
  if (row.category_kind === FINANCE_CATEGORY_KINDS.NATIVE) {
    throw createHttpError(
      409,
      `Las categorias nativas no pueden ${operation}.`,
      'native_finance_category_immutable',
    );
  }
}

async function createFinanceCategory(financeContext, body = {}) {
  assertResolvedFinanceContext(financeContext);
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, FORBIDDEN_CREATE_FIELDS, 'protected_finance_category_field');

  const type = normalizeCategoryType(body.type ?? body.category_type);
  const label = normalizeLabel(body.label);
  const payload = {
    category_kind: FINANCE_CATEGORY_KINDS.CUSTOM,
    category_type: type,
    label,
    context_type: financeContext.contextType,
    owner_person_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL
      ? financeContext.personId
      : null,
    household_id: financeContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD
      ? financeContext.householdId
      : null,
    created_by_person_id: financeContext.personId,
    updated_by_person_id: financeContext.personId,
    sort_order: 1000,
  };

  const { data, error } = await financeContext.client
    .from('finance_categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) throwSupabaseError(error);
  return { category: toDto(data) };
}

async function updateFinanceCategory(financeContext, categoryId, body = {}) {
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, FORBIDDEN_UPDATE_FIELDS, 'protected_finance_category_field');

  const current = await getCategoryForMutation(financeContext, categoryId);
  assertCustomMutable(current, 'editarse');

  if (!hasOwn(body, 'label')) {
    return { category: toDto(current), outcome: 'noop' };
  }

  const label = normalizeLabel(body.label);
  const { data, error } = await financeContext.client
    .from('finance_categories')
    .update({
      label,
      updated_by_person_id: financeContext.personId,
    })
    .eq('id', current.id)
    .eq('category_kind', FINANCE_CATEGORY_KINDS.CUSTOM)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data) {
    throw createHttpError(404, 'Categoria Finance no encontrada.', 'finance_category_not_found');
  }

  return { category: toDto(data), outcome: 'updated' };
}

async function deleteFinanceCategory(financeContext, categoryId, body = {}) {
  assertNoAuthorityInjection(body);
  assertNoForbiddenFields(body, ['archivedAt', 'archived_at', 'restore', 'restoredAt', 'restored_at'], 'finance_category_archive_not_supported');

  const current = await getCategoryForMutation(financeContext, categoryId);
  assertCustomMutable(current, 'eliminarse');

  if (current.deleted_at !== null) {
    return { category: toDto(current), outcome: 'noop' };
  }

  const { data, error } = await financeContext.client
    .from('finance_categories')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by_person_id: financeContext.personId,
    })
    .eq('id', current.id)
    .eq('category_kind', FINANCE_CATEGORY_KINDS.CUSTOM)
    .select('*')
    .maybeSingle();

  if (error) throwSupabaseError(error);
  if (!data) {
    throw createHttpError(404, 'Categoria Finance no encontrada.', 'finance_category_not_found');
  }

  return { category: toDto(data), outcome: 'deleted' };
}

module.exports = {
  FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT,
  listFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  deleteFinanceCategory,
  FINANCE_CATEGORY_TYPES,
};
