'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 controller (Trash / Restore / Purge).
 *
 * Thin transport layer only: identity, capability and state authority all
 * live in the service (and beyond it, in the database RPCs). The response
 * envelope follows the canonical Files controller grammar.
 */
const lifecycle = require('../services/homecloudLifecycle.service');
const { sendApiError } = require('../lib/httpErrors');

const respond = (fn, key) => async (req, res) => {
  try {
    const value = await fn(req);
    return res.status(200).json({ [key]: value });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  // TRASH one File (idempotent; refuses staging and purging).
  trashContent: respond(req => lifecycle.trashFileContent(req, req.params.contentId), 'file'),
  // RESTORE one File (idempotent; refuses purging).
  restoreContent: respond(req => lifecycle.restoreFileContent(req, req.params.contentId), 'file'),
  // LIST the household's trashed Files (has-more probe pagination).
  listTrash: respond(req => lifecycle.listTrashedFiles(req, req.query), 'trash'),
};
