'use strict';

/**
 * HomeCloud Files — canonical `documentDate` contract.
 *
 * ONE pure contract for BOTH seams:
 *   - POST   /api/homecloud/register            (role=file)
 *   - PATCH  /api/homecloud/content/:id/file    (Files metadata update)
 *
 *   absent / undefined -> canonical absence (NULL); the update seam keeps the
 *                         field untouched because absence is decided by the
 *                         caller, not here
 *   null                -> canonical absence (NULL)
 *   "YYYY-MM-DD"        -> preserved verbatim, only when it is a REAL date
 *   anything else       -> 400 homecloud_invalid_document_date
 *
 * Validity is decided here, BEFORE any database call, so an invalid
 * `documentDate` never reaches the Postgres `date` column.
 */

const { createHttpError } = require('./httpErrors');

const DOCUMENT_DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Canonical user-facing rejection: the code and message both paths already used. */
function invalidDocumentDate() {
  return createHttpError(400, 'Fecha inválida.', 'homecloud_invalid_document_date');
}

/**
 * True only when the value is exactly `YYYY-MM-DD` AND year/month/day is a real
 * Gregorian calendar date.
 *
 * The calendar check reconstructs the date and compares the components, which is
 * what rejects `2026-02-30`: plain `new Date('2026-02-30')` (or any arithmetic
 * rollover) would silently accept it as March 2nd.
 */
function isCanonicalDocumentDate(value) {
  if (typeof value !== 'string') return false;
  const shape = DOCUMENT_DATE_SHAPE.exec(value);
  if (!shape) return false;
  const year = Number(shape[1]);
  const month = Number(shape[2]);
  const day = Number(shape[3]);
  // setUTCFullYear (not Date.UTC) so years below 100 are not remapped.
  const reconstructed = new Date(0);
  reconstructed.setUTCFullYear(year, month - 1, day);
  return reconstructed.getUTCFullYear() === year
    && reconstructed.getUTCMonth() === month - 1
    && reconstructed.getUTCDate() === day;
}

/**
 * Validate and normalize a client-supplied `documentDate`.
 *
 * @param {unknown} value raw client value
 * @returns {string|null} the same canonical "YYYY-MM-DD" string, or null
 * @throws {HttpError} 400 homecloud_invalid_document_date for every other input
 */
function normalizeDocumentDate(value) {
  if (value === undefined || value === null) return null;
  if (!isCanonicalDocumentDate(value)) throw invalidDocumentDate();
  return value;
}

module.exports = {
  DOCUMENT_DATE_SHAPE,
  isCanonicalDocumentDate,
  normalizeDocumentDate,
};
