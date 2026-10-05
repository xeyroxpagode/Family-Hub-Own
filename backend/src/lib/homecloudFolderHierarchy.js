'use strict';

/**
 * HomeCloud Files — Stage 2 / Phase 1 — NESTED FOLDER HIERARCHY authority.
 *
 * The hierarchy invariants are enforced in the DATABASE (the
 * `trg_homecloud_folders_hierarchy_invariants` trigger plus the transactional
 * `homecloud_*` RPCs), because only the database can be the final authority
 * against a direct write, a stale client and a concurrent transaction. This
 * module's only job is to turn what the database decided into the typed HTTP
 * failures the product contract promises, and to never weaken a decision.
 *
 * Every token here is raised by the database with that exact message, so a
 * 4xx answer always names the invariant that refused the write rather than a
 * generic failure.
 */
const { createHttpError } = require('./httpErrors');

/**
 * Typed failures for hierarchy mutations.
 *
 * `homecloud_folder_promotion_conflict` deliberately shares 409 with the name
 * conflict: from the caller's point of view both mean "the destination name is
 * already taken", and both are resolved by choosing a different destination.
 * They stay separate codes so a surface can tell "you named it twice" from
 * "deleting that folder would collide with an existing one".
 */
const FOLDER_HIERARCHY_FAILURES = Object.freeze({
  homecloud_folder_cycle: {
    statusCode: 409,
    message: 'No se puede mover una carpeta dentro de sí misma.',
  },
  // A corrupt or absurdly deep chain is NOT a cycle the member caused, so it is
  // reported distinctly instead of being blurred into "you tried to move a folder
  // into itself". It is still a refusal, never a partial write.
  homecloud_folder_hierarchy_too_deep: {
    statusCode: 409,
    message: 'No se puede modificar la carpeta: la jerarquía es demasiado profunda o está dañada.',
  },
  // A parent that belongs to ANOTHER household is answered with exactly the same
  // 404 as an unknown parent, on purpose. Answering differently would turn this
  // endpoint into an oracle: any member could probe a folder id and learn that it
  // exists in a household they are not part of. This matches the existing
  // Stage 1 convention (a foreign folder read, rename or delete is
  // `homecloud_folder_not_found`), so the hierarchy adds no new leak surface.
  homecloud_folder_parent_household: {
    statusCode: 404,
    message: 'Carpeta no encontrada.',
    publicCode: 'homecloud_folder_not_found',
  },
  homecloud_folder_not_found: {
    statusCode: 404,
    message: 'Carpeta no encontrada.',
  },
  homecloud_folder_name_conflict: {
    statusCode: 409,
    message: 'Ya existe una carpeta con ese nombre.',
  },
  homecloud_folder_promotion_conflict: {
    statusCode: 409,
    message: 'No se puede eliminar la carpeta: ya existe otra con ese nombre en el destino.',
  },
});

const POSTGREST_UNIQUE_VIOLATION = '23505';

/**
 * The database is the final authority for sibling uniqueness, so a 23505 raised
 * on a folder write is a real duplicate, never an internal fault. Any other
 * failure stays a 500 rather than being dressed up as a typed 4xx.
 */
function folderHierarchyFailure(error, fallbackCode) {
  const token = typeof error?.message === 'string'
    ? Object.keys(FOLDER_HIERARCHY_FAILURES).find((code) => error.message.includes(code))
    : null;
  if (token) {
    const { statusCode, message, publicCode } = FOLDER_HIERARCHY_FAILURES[token];
    return createHttpError(statusCode, message, publicCode || token);
  }
  if (error?.code === POSTGREST_UNIQUE_VIOLATION) {
    return createHttpError(409, FOLDER_HIERARCHY_FAILURES.homecloud_folder_name_conflict.message, 'homecloud_folder_name_conflict');
  }
  return createHttpError(500, error?.message ?? 'No se pudo modificar la carpeta.', fallbackCode);
}

module.exports = { FOLDER_HIERARCHY_FAILURES, folderHierarchyFailure };