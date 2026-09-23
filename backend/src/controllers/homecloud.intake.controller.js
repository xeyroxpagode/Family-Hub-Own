'use strict';

const {
  registerHomeCloudContent,
  authorizeHomeCloudOriginalUpload,
  verifyHomeCloudOriginal,
  finalizeHomeCloudContent,
} = require('../services/homecloudIntakeService');
const { telemetry } = require('../config/telemetry');
const { sendApiError, createHttpError } = require('../lib/httpErrors');

/**
 * POST /api/homecloud/register
 * Create a semantic staging content row. Requires homecloud.contribute.
 */
const registerContentController = async (req, res) => {
  try {
    const content = await registerHomeCloudContent(req, req.body ?? {});
    await telemetry.track('homecloud_register', { result: 'success', role: content.role }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return res.status(201).json({ content });
  } catch (error) {
    await telemetry.track('homecloud_register', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * POST /api/homecloud/content/:contentId/upload
 * Issue single-object signed upload authorization for staging original.
 */
const authorizeUploadController = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!contentId) {
      throw createHttpError(400, 'contentId es obligatorio', 'homecloud_missing_content_id');
    }
    const auth = await authorizeHomeCloudOriginalUpload(req, contentId);
    await telemetry.track('homecloud_upload_authorized', { result: 'success' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return res.status(200).json(auth);
  } catch (error) {
    await telemetry.track('homecloud_upload_authorized', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * POST /api/homecloud/content/:contentId/verify
 * Verify original object exists at canonical path (does not finalize).
 */
const verifyContentController = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!contentId) {
      throw createHttpError(400, 'contentId es obligatorio', 'homecloud_missing_content_id');
    }
    const result = await verifyHomeCloudOriginal(req, contentId);
    await telemetry.track('homecloud_verify', { result: result.verified ? 'success' : 'incomplete' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return res.status(200).json(result);
  } catch (error) {
    await telemetry.track('homecloud_verify', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * POST /api/homecloud/content/:contentId/finalize
 * Idempotent staging -> active transition (sets uploaded_at).
 */
const finalizeContentController = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!contentId) {
      throw createHttpError(400, 'contentId es obligatorio', 'homecloud_missing_content_id');
    }
    const content = await finalizeHomeCloudContent(req, contentId);
    await telemetry.track('homecloud_finalize', { result: 'success', role: content.role }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return res.status(200).json({ content });
  } catch (error) {
    await telemetry.track('homecloud_finalize', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

module.exports = {
  registerContentController,
  authorizeUploadController,
  verifyContentController,
  finalizeContentController,
};