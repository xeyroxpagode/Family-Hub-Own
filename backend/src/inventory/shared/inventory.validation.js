'use strict';
const { createHttpError } = require('../../lib/httpErrors');

const limit = (value, fallback, maximum = 100) => {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw createHttpError(400, `limit debe estar entre 1 y ${maximum}.`, 'validation_error');
  }
  return parsed;
};
const nullableUuid = (value) => value == null || value === '' ? null : String(value);
module.exports = { limit, nullableUuid };
