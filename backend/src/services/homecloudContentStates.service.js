'use strict';

/**
 * HOMePLUS HomeCloud — S8-03: Content states (canonical File lifecycle read).
 *
 * Authority: S6 INTEGRATION FREEZE (HomeCloud owns the File).
 *
 * WHY THIS SERVICE EXISTS
 * -----------------------
 * The Assets <-> HomeCloud integration needs ONE honest answer about a File:
 * does it exist in MY household, and what is its lifecycle right now?
 *
 * Assets MUST NOT answer that question by itself:
 *   - it MUST NOT read public.homecloud_contents directly (frontend AND
 *     backend integration MUST go through the canonical HomeCloud path),
 *   - it MUST NOT duplicate the HomeCloud validation rules,
 *   - it MUST NOT be able to distinguish "another Household's File" from
 *     "no File at all" (no disclosure).
 *
 * So HomeCloud exposes exactly one primitive here, and BOTH the public batch
 * endpoint (POST /api/homecloud/contents/states) and the Assets integration
 * use it. There is no second implementation of the same rule.
 *
 * SCOPE
 * -----
 * This service answers FILE states. public.homecloud_contents also stores
 * Memories (role='memory'); a Memory is NOT an attachable File, so a Memory id
 * is reported exactly like an unknown id (exists=false). That keeps the DTO
 * honest without inventing a "role" field the frozen DTO does not have.
 *
 * LIFECYCLE PROJECTION
 * --------------------
 * The HomeCloud lifecycle domain is: staging | active | trashed | purging.
 * The states DTO exposes it verbatim (plus null when the row does not exist).
 * The Assets READ MODEL is the one that maps it to the Assets state set
 * (available | trashed | purging | missing) — see assets.files.service.js.
 *
 * NO DISCLOSURE
 * -------------
 * A row that belongs to another household is invisible here: the query is
 * household-scoped, so it answers exists=false / lifecycle=null / all metadata
 * null, exactly like an id that never existed. No name, no type, no size and
 * no lifecycle of a foreign File is ever projected.
 */

const { supabaseAdmin } = require('../config/supabase');
const { createHttpError } = require('../lib/httpErrors');

/** Maximum number of ids accepted by one batch call. */
const MAX_CONTENT_STATES_IDS = 200;

/**
 * The only columns this service ever reads.
 *
 * original_storage_path / preview_storage_path / note / caption are NOT read:
 * the DTO boundary must never be able to leak a storage path.
 */
const CONTENT_STATES_FIELDS = [
  'id',
  'household_id',
  'lifecycle',
  'display_name',
  'mime_type',
  'extension',
  'size_bytes',
  'document_date',
].join(', ');

/** Canonical textual UUID form (same tolerance as lib/httpErrors.assertUuid). */
const UUID_RE = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

/**
 * Validate and normalize the `ids` payload of the batch endpoint.
 *
 * Contract (S8-03): the body is `{ ids: [uuid] }`, at most 200 entries.
 * Anything else is a 400 `validation_error`: a malformed batch is a
 * deterministic client mistake, never a partial success.
 *
 * @param {unknown} rawIds
 * @returns {string[]} unique, lower-case uuids in first-seen order
 */
function normalizeContentStatesIds(rawIds) {
  if (!Array.isArray(rawIds)) {
    throw createHttpError(400, 'ids debe ser un arreglo de identificadores.', 'validation_error', {
      field: 'ids',
    });
  }
  if (rawIds.length > MAX_CONTENT_STATES_IDS) {
    throw createHttpError(
      400,
      `ids admite como máximo ${MAX_CONTENT_STATES_IDS} identificadores.`,
      'validation_error',
      { field: 'ids', max: MAX_CONTENT_STATES_IDS },
    );
  }
  const unique = [];
  const seen = new Set();
  for (const raw of rawIds) {
    if (typeof raw !== 'string' || !UUID_RE.test(raw.trim())) {
      throw createHttpError(400, 'ids contiene un identificador inválido.', 'validation_error', {
        field: 'ids',
      });
    }
    const normalized = raw.trim().replace(/^\{|\}$/g, '').toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

/**
 * Empty projection used for every id that does not resolve to a File of THIS
 * household. It is byte-identical for "never existed" and "another household",
 * so no existence signal crosses the boundary.
 */
function absentContentState(id) {
  return {
    id,
    exists: false,
    lifecycle: null,
    display_name: null,
    mime_type: null,
    extension: null,
    size_bytes: null,
    document_date: null,
  };
}

/**
 * Read the lifecycle state of the given Files of ONE household.
 *
 * @param {object} args
 * @param {string} args.householdId the caller's ACTIVE household (server-derived)
 * @param {string[]} args.ids normalized uuids (see normalizeContentStatesIds)
 * @returns {Promise<object[]>} one projection per requested id, in request order
 */
async function listContentStates({ householdId, ids }) {
  const requested = Array.isArray(ids) ? ids : [];
  if (requested.length === 0) return [];

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend no configurado.', 'homecloud_backend_unavailable');
  }

  const { data, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select(CONTENT_STATES_FIELDS)
    .eq('household_id', householdId)
    .eq('role', 'file')
    .in('id', requested);

  if (error) {
    throw createHttpError(500, 'No se pudo leer el estado de los archivos.', 'homecloud_content_states_failed');
  }

  const byId = new Map();
  for (const row of data ?? []) {
    byId.set(String(row.id).toLowerCase(), row);
  }

  return requested.map((id) => {
    const row = byId.get(id);
    if (!row) return absentContentState(id);
    return {
      id: row.id,
      exists: true,
      lifecycle: row.lifecycle ?? null,
      display_name: row.display_name ?? null,
      mime_type: row.mime_type ?? null,
      extension: row.extension ?? null,
      size_bytes: row.size_bytes ?? null,
      document_date: row.document_date ?? null,
    };
  });
}

/**
 * Single-file convenience over listContentStates.
 *
 * @param {object} args
 * @param {string} args.householdId
 * @param {string} args.contentId
 * @returns {Promise<object>} the content state projection
 */
async function getContentState({ householdId, contentId }) {
  const [state] = await listContentStates({ householdId, ids: [contentId] });
  return state ?? absentContentState(contentId);
}

module.exports = {
  MAX_CONTENT_STATES_IDS,
  CONTENT_STATES_FIELDS,
  normalizeContentStatesIds,
  listContentStates,
  getContentState,
};
