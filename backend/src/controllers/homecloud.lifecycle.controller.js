'use strict';

/**
 * HomeCloud unified lifecycle controller (Files + Memories).
 *
 * Thin transport layer only: identity, capability and state authority all
 * live in the services (and beyond them, in the database RPCs).
 * Files lifecycle V1 (trash/restore/list/purge) keeps the canonical Files
 * response envelope; Memories lifecycle keeps its own controllers.
 * Each lane fans out to its own service authority:
 * homecloudLifecycle.service (Files) vs homecloudLifecycleService (Memories).
 */
const filesLifecycle = require('../services/homecloudLifecycle.service');
const memoriesLifecycle = require('../services/homecloudLifecycleService');
const { sendApiError, createHttpError } = require('../lib/httpErrors');

const respond = (fn, key) => async (req, res) => {
  try {
    const value = await fn(req);
    return res.status(200).json({ [key]: value });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

function requireContentId(req) {
  const { contentId } = req.params;
  if (!contentId) {
    throw createHttpError(400, 'contentId es obligatorio.', 'homecloud_missing_content_id');
  }
  return contentId;
}

const trashMemoryController = async (req, res) => {
  try {
    const memory = await memoriesLifecycle.trashMemory(req, requireContentId(req));
    return res.status(200).json({ memory });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreMemoryController = async (req, res) => {
  try {
    const memory = await memoriesLifecycle.restoreMemory(req, requireContentId(req));
    return res.status(200).json({ memory });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const purgeMemoryController = async (req, res) => {
  try {
    await memoriesLifecycle.purgeMemory(req, requireContentId(req));
    return res.status(204).json(undefined);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const purgeAllMemoriesController = async (req, res) => {
  try {
    const result = await memoriesLifecycle.purgeAllTrashedMemories(req);
    const status = result.failed > 0 ? 207 : 200;
    return res.status(status).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  // TRASH one File (idempotent; refuses staging and purging).
  trashContent: respond(req => filesLifecycle.trashFileContent(req, req.params.contentId), 'file'),
  // RESTORE one File (idempotent; refuses purging).
  restoreContent: respond(req => filesLifecycle.restoreFileContent(req, req.params.contentId), 'file'),
  // LIST the household's trashed Files (has-more probe pagination).
  listTrash: respond(req => filesLifecycle.listTrashedFiles(req, req.query), 'trash'),
  // PURGE one File (irreversible; requires confirm: true; asynchronous durable processing).
  purgeContent: respond(req => filesLifecycle.purgeFileContent(req, req.params.contentId, req.body?.confirm), 'purge'),
  trashMemoryController,
  restoreMemoryController,
  purgeMemoryController,
  purgeAllMemoriesController,
};
