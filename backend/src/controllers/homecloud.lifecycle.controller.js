'use strict';

const lifecycle = require('../services/homecloudLifecycleService');
const { sendApiError, createHttpError } = require('../lib/httpErrors');

function requireContentId(req) {
  const { contentId } = req.params;
  if (!contentId) {
    throw createHttpError(400, 'contentId es obligatorio.', 'homecloud_missing_content_id');
  }
  return contentId;
}

const trashMemoryController = async (req, res) => {
  try {
    const memory = await lifecycle.trashMemory(req, requireContentId(req));
    return res.status(200).json({ memory });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreMemoryController = async (req, res) => {
  try {
    const memory = await lifecycle.restoreMemory(req, requireContentId(req));
    return res.status(200).json({ memory });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const purgeMemoryController = async (req, res) => {
  try {
    await lifecycle.purgeMemory(req, requireContentId(req));
    return res.status(204).json(undefined);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const purgeAllMemoriesController = async (req, res) => {
  try {
    const result = await lifecycle.purgeAllTrashedMemories(req);
    const status = result.failed > 0 ? 207 : 200;
    return res.status(status).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  trashMemoryController,
  restoreMemoryController,
  purgeMemoryController,
  purgeAllMemoriesController,
};
