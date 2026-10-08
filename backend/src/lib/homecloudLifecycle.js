'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 authority.
 *
 * The lifecycle state machine is enforced in the DATABASE (the transactional
 * `homecloud_trash_content` / `homecloud_restore_content` /
 * `homecloud_start_purge` RPCs plus the CHECK constraints of
 * 20261007000000_homecloud_files_lifecycle_v1.sql), because only the database
 * can be the final authority against a direct write, a stale client and a
 * concurrent transaction. This module's only job is to turn what the database
 * decided into the typed HTTP failures the product contract promises, and to
 * never weaken a decision.
 *
 * Every token here is raised by the database with that exact message, so a 4xx
 * answer always names the invariant that refused the write rather than a
 * generic failure. `homecloud_purge_snapshot_invalid` is deliberately absent:
 * it can only be produced by internal corruption and stays a 500.
 */
const { createHttpError } = require('./httpErrors');

const LIFECYCLE_FAILURES = Object.freeze({
  homecloud_content_not_found: {
    statusCode: 404,
    message: 'Contenido no encontrado.',
  },
  // Staging content is an unfinished upload, not trashable content: intake
  // orphan cleanup owns staging. Distinguished from purging so the surface can
  // explain the refusal instead of offering a restore that cannot exist.
  homecloud_content_not_active: {
    statusCode: 409,
    message: 'El archivo todavía se está subiendo.',
  },
  homecloud_content_not_trashed: {
    statusCode: 409,
    message: 'El archivo no está en la papelera.',
  },
  // The irreversible boundary: once purge has been confirmed and started,
  // Trash/Restore must answer a typed refusal, never a silent race.
  homecloud_content_purging: {
    statusCode: 409,
    message: 'El archivo se está eliminando definitivamente.',
  },
  homecloud_purge_duplicate: {
    statusCode: 409,
    message: 'Ya hay una eliminación definitiva en curso para este archivo.',
  },
});

function lifecycleFailure(error, fallbackCode) {
  const token = typeof error?.message === 'string'
    ? Object.keys(LIFECYCLE_FAILURES).find((code) => error.message.includes(code))
    : null;
  if (token) {
    const { statusCode, message } = LIFECYCLE_FAILURES[token];
    return createHttpError(statusCode, message, token);
  }
  return createHttpError(500, error?.message ?? 'No se pudo modificar el ciclo de vida del contenido.', fallbackCode);
}

module.exports = { LIFECYCLE_FAILURES, lifecycleFailure };
