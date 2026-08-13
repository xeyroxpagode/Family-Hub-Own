'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_FUNDING_RELATIONSHIPS,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_SOURCE_TYPES,
} = require('../constants/finance.constants');

const TRUSTED_FINANCE_SOURCE = Symbol('trustedFinanceSource');

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

function trustedSource(payload) {
  return Object.freeze(Object.defineProperty(payload, TRUSTED_FINANCE_SOURCE, {
    value: true,
    enumerable: false,
  }));
}

function noTrackedFinanceSource() {
  return trustedSource({
    sourceType: FINANCE_SOURCE_TYPES.NONE,
    tracked: false,
  });
}

function personalFinanceSourceFromContext(financeContext) {
  assertResolvedFinanceContext(financeContext);
  if (financeContext.contextType !== FINANCE_CONTEXT_TYPES.PERSONAL) {
    throw createHttpError(
      400,
      'La fuente personal debe derivarse de un Financial Context personal resuelto.',
      'invalid_finance_source_context',
    );
  }

  return trustedSource({
    sourceType: FINANCE_SOURCE_TYPES.PERSONAL,
    tracked: true,
    personId: financeContext.personId,
  });
}

function householdFinanceSourceFromContext(financeContext) {
  assertResolvedFinanceContext(financeContext);
  if (financeContext.contextType !== FINANCE_CONTEXT_TYPES.HOUSEHOLD) {
    throw createHttpError(
      400,
      'La fuente household debe derivarse de un Financial Context household resuelto.',
      'invalid_finance_source_context',
    );
  }

  return trustedSource({
    sourceType: FINANCE_SOURCE_TYPES.HOUSEHOLD,
    tracked: true,
    householdId: financeContext.householdId,
  });
}

function normalizeSource(source) {
  if (source === undefined || source === null) return noTrackedFinanceSource();
  if (!source || source[TRUSTED_FINANCE_SOURCE] !== true) {
    throw createHttpError(
      400,
      'Finance Source no confiable: la fuente debe derivarse de autoridad server-side resuelta.',
      'untrusted_finance_source_reference',
    );
  }
  return source;
}

function householdDisclosureFor(relationship) {
  if (relationship === FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD) {
    return Object.freeze({
      fundingRelationship: FINANCE_FUNDING_RELATIONSHIPS.PERSONAL_FUNDED,
    });
  }

  if (relationship === FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_HOUSEHOLD_CONTEXT) {
    return Object.freeze({
      fundingRelationship: FINANCE_FUNDING_RELATIONSHIPS.HOUSEHOLD_FUNDED,
    });
  }

  return Object.freeze({
    fundingRelationship: FINANCE_FUNDING_RELATIONSHIPS.NONE,
  });
}

function boundaryResult(financialContext, source, relationship) {
  return Object.freeze({
    allowed: true,
    relationship,
    sourceType: source.sourceType,
    financialContextType: financialContext.contextType,
    financialAttribution: Object.freeze({
      contextType: financialContext.contextType,
      personId: financialContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? financialContext.personId : null,
      householdId: financialContext.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? financialContext.householdId : null,
    }),
    disclosure: Object.freeze({
      household: householdDisclosureFor(relationship),
    }),
  });
}

function resolveFinanceSourceContextBoundary({ financialContext, source } = {}) {
  assertResolvedFinanceContext(financialContext);
  const trusted = normalizeSource(source);

  if (trusted.sourceType === FINANCE_SOURCE_TYPES.NONE) {
    return boundaryResult(
      financialContext,
      trusted,
      FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE,
    );
  }

  if (trusted.sourceType === FINANCE_SOURCE_TYPES.PERSONAL) {
    if (trusted.personId !== financialContext.personId) {
      throw createHttpError(
        403,
        'La fuente personal pertenece a otra persona.',
        'finance_personal_source_owner_mismatch',
      );
    }

    if (financialContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
      return boundaryResult(
        financialContext,
        trusted,
        FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_PERSONAL_CONTEXT,
      );
    }

    return boundaryResult(
      financialContext,
      trusted,
      FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD,
    );
  }

  if (trusted.sourceType === FINANCE_SOURCE_TYPES.HOUSEHOLD) {
    if (financialContext.contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
      throw createHttpError(
        403,
        'El dinero household-funded no puede ocultarse como hecho financiero personal.',
        'finance_household_source_personal_context_forbidden',
      );
    }

    if (trusted.householdId !== financialContext.householdId) {
      throw createHttpError(
        403,
        'La fuente household no pertenece al Household activo resuelto.',
        'finance_household_source_mismatch',
      );
    }

    return boundaryResult(
      financialContext,
      trusted,
      FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_HOUSEHOLD_CONTEXT,
    );
  }

  throw createHttpError(400, 'Finance Source type invalido.', 'invalid_finance_source_type');
}

module.exports = {
  noTrackedFinanceSource,
  personalFinanceSourceFromContext,
  householdFinanceSourceFromContext,
  resolveFinanceSourceContextBoundary,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_SOURCE_TYPES,
};
