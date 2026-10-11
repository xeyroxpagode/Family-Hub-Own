'use strict';

const { updateMemory } = require('../services/homecloudMemoryService');
const { sendApiError, createHttpError } = require('../lib/httpErrors');

const updateMemoryController = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!contentId) {
      throw createHttpError(400, 'contentId es obligatorio.', 'homecloud_missing_content_id');
    }
    const memory = await updateMemory(req, contentId, req.body ?? {});
    return res.status(200).json({ memory });
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = { updateMemoryController };
