const { sendApiError } = require('../lib/httpErrors');

// Canonical textual UUID form (braced/upper/mixed spellings tolerated, same as
// Postgres) so a casing difference is never treated as malformed.
const UUID_RE = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

/**
 * Validate uuid path params BEFORE they reach a driver.
 *
 * Why this exists: an unvalidated `:id` makes PostgREST/Postgres raise on the
 * uuid cast, which surfaces as a 500 carrying the raw SQLSTATE (`22P02`). That
 * is wrong twice — it tells the client "server broke" instead of "that id is not
 * addressable", and the raw driver code is an implementation leak.
 *
 * `notFound` is the SAME status/message/code the resource already uses for an
 * absent row, so a malformed id is indistinguishable from a missing one: no
 * existence signal, and deep links always terminate in a terminal state.
 *
 * IMPORTANT (Express): `req.params` is only populated for a MATCHED route or a
 * mount path. A bare `router.use(fn)` runs before matching and therefore sees an
 * empty `req.params` — silently validating nothing. Always pass the paths, or
 * call this INSIDE a handler / via `router.param`.
 *
 * Usage:
 *   router.use(['/tasks/:id', '/tasks/:id/evidence'], requireUuidParams(['id'], nf))
 *   const handler = [requireUuidParams(['id'], nf), controller] // per-route
 */
const requireUuidParams = (names, notFound = {}) => (req, res, next) => {
  for (const name of names) {
    const value = req.params[name];
    if (value === undefined) continue;
    if (!UUID_RE.test(String(value).trim())) {
      return sendApiError(
        res,
        Object.assign(
          new Error(notFound.message ?? 'Recurso no encontrado.'),
          { statusCode: notFound.status ?? 404, code: notFound.code ?? 'not_found' },
        ),
        req,
      );
    }
  }
  return next();
};

module.exports = { requireUuidParams, UUID_RE };