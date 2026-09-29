'use strict';

const { createHttpError } = require('./httpErrors');

function normalizeHomeCloudSignedUrlTtl(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw createHttpError(400, 'ttl inválido.', 'homecloud_invalid_ttl');
  }
  if (typeof value === 'string' && value.trim() === '') {
    throw createHttpError(400, 'ttl inválido.', 'homecloud_invalid_ttl');
  }
  const ttl = Number(value);
  if (!Number.isFinite(ttl) || !Number.isInteger(ttl) || ttl <= 0) {
    throw createHttpError(400, 'ttl inválido.', 'homecloud_invalid_ttl');
  }
  return ttl;
}

module.exports = { normalizeHomeCloudSignedUrlTtl };
