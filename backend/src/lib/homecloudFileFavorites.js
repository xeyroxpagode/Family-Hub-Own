'use strict';

/**
 * HomeCloud Files Core — PERSONAL FAVORITES read/mutation query contract.
 *
 * A File is shared Household content; a Favorite is a personal retrieval
 * preference of ONE person. Everything here exists to keep that distinction
 * mechanical: the caller is always identified by the SERVER-RESOLVED
 * `personId`, never by anything the client sends, and the filter is always a SQL
 * predicate so it happens BEFORE pagination.
 */

const { createHttpError } = require('./httpErrors');

/**
 * The `favoritesOnly` filter is an INNER JOIN against the caller's own
 * preference rows. It is the same PostgREST mechanism the Memories read already
 * uses for its Album filter (`homecloudReadService.js`), so the filter is a
 * database predicate: a page can never be silently short because a row was
 * discarded after the fact.
 */
const FAVORITES_ONLY_EMBED = 'homecloud_file_favorites!inner(content_id)';

/** Columns the isFavorite projection reads. One read for the WHOLE page. */
const FAVORITE_PROJECTION_FIELDS = 'content_id';

const TRUTHY = new Set(['true', '1', 'yes', 'on']);

/**
 * `favoritesOnly` is an optional query parameter, so it arrives as a STRING.
 * Anything that is not an explicit affirmative is OFF: an absent, empty or
 * unrecognised value must never silently narrow a household's file list.
 */
function normalizeFavoritesOnly(value) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

/**
 * The select list for the Files read. The embed is added ONLY when the filter is
 * requested: an ordinary browse stays a plain single-table read.
 */
function favoritesSelect(contentFields, favoritesOnly) {
  return favoritesOnly ? `${contentFields}, ${FAVORITES_ONLY_EMBED}` : contentFields;
}

/**
 * The mutation intent. It must be an explicit boolean: a missing or malformed
 * body is ordinary invalid input and is a typed 400, never a guess that happens
 * to toggle the wrong way.
 */
function assertFavoriteIntent(value) {
  if (value === true || value === false) return value;
  throw createHttpError(400, 'Indicá si querés agregar o quitar el archivo de favoritos.', 'homecloud_favorite_invalid');
}

module.exports = {
  FAVORITES_ONLY_EMBED,
  FAVORITE_PROJECTION_FIELDS,
  normalizeFavoritesOnly,
  favoritesSelect,
  assertFavoriteIntent,
};
