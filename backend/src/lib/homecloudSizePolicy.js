'use strict';

const POLICY_ENV_KEY = 'HOMECLOUD_MAX_UPLOAD_BYTES';

function getHomeCloudMaxUploadBytes(env = process.env) {
  const raw = env[POLICY_ENV_KEY];
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new Error(`${POLICY_ENV_KEY} must be a positive integer byte limit`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${POLICY_ENV_KEY} must be a positive safe integer byte limit`);
  }
  return value;
}

function assertHomeCloudAcceptedSize(sizeBytes, env = process.env) {
  const limit = getHomeCloudMaxUploadBytes(env);
  if (sizeBytes > limit) {
    const { createHttpError } = require('./httpErrors');
    throw createHttpError(
      413,
      'El archivo supera el tamaño máximo permitido por esta instalación.',
      'file_too_large',
      { limitBytes: limit, sizeBytes },
    );
  }
  return limit;
}

module.exports = { POLICY_ENV_KEY, getHomeCloudMaxUploadBytes, assertHomeCloudAcceptedSize };
