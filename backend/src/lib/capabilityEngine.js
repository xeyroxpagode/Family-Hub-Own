'use strict';

const { createHttpError } = require('./httpErrors');

function createCapabilityCatalog(capabilities) {
  const unique = [...new Set(capabilities ?? [])];
  if (unique.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new TypeError('Capability names must be non-empty strings.');
  }
  return Object.freeze(unique);
}

function projectCapabilities(catalog, resolver) {
  return Object.fromEntries(catalog.map((capability) => [capability, resolver(capability) === true]));
}

function hasCapability(projection, capability) {
  return Boolean(projection && typeof projection === 'object' && projection[capability] === true);
}

function assertCapability(projection, capability, options = {}) {
  if (hasCapability(projection, capability)) return;
  throw createHttpError(
    options.statusCode ?? 403,
    options.message ?? 'No tenés permiso para realizar esta acción.',
    options.code ?? 'capability_forbidden',
    { capability: capability ?? null },
  );
}

module.exports = {
  createCapabilityCatalog,
  projectCapabilities,
  hasCapability,
  assertCapability,
};
