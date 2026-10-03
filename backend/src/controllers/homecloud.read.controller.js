'use strict';

const { getContentById, listFolders, getFolderById, listAlbums, getAlbumById, getAlbumMemberships, listMemories } = require('../services/homecloudReadService');
const { telemetry } = require('../config/telemetry');
const { sendApiError } = require('../lib/httpErrors');

/**
 * GET /api/homecloud/content/:contentId
 * Protected read: requires homecloud.view, household-scoped, active-only.
 * Returns safe content DTO (File or Memory discriminated union).
 */
const getContentByIdController = async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      const { createHttpError } = require('../lib/httpErrors');
      throw createHttpError(400, 'contentId es obligatorio', 'homecloud_missing_content_id');
    }

    const content = await getContentById(req, contentId);

    await telemetry.track('homecloud_content_get', { result: 'success', role: content.role }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ content });
  } catch (error) {
    await telemetry.track('homecloud_content_get', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/folders
 * Protected list: requires homecloud.view, household-scoped.
 * Returns array of folder DTOs.
 */
const listFoldersController = async (req, res) => {
  try {
    const folders = await listFolders(req);

    await telemetry.track('homecloud_folders_list', { result: 'success', count: folders.length }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ folders });
  } catch (error) {
    await telemetry.track('homecloud_folders_list', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/folders/:folderId
 * Protected get: requires homecloud.view, household-scoped.
 * Returns folder DTO.
 */
const getFolderByIdController = async (req, res) => {
  try {
    const { folderId } = req.params;

    if (!folderId) {
      const { createHttpError } = require('../lib/httpErrors');
      throw createHttpError(400, 'folderId es obligatorio', 'homecloud_missing_folder_id');
    }

    const folder = await getFolderById(req, folderId);

    await telemetry.track('homecloud_folder_get', { result: 'success' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ folder });
  } catch (error) {
    await telemetry.track('homecloud_folder_get', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/albums
 * Protected list: requires homecloud.view, household-scoped, active-only.
 * Returns array of album DTOs.
 */
const listAlbumsController = async (req, res) => {
  try {
    const albums = await listAlbums(req);

    await telemetry.track('homecloud_albums_list', { result: 'success', count: albums.length }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ albums });
  } catch (error) {
    await telemetry.track('homecloud_albums_list', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/albums/:albumId
 * Protected get: requires homecloud.view, household-scoped, active-only.
 * Returns album DTO.
 */
const getAlbumByIdController = async (req, res) => {
  try {
    const { albumId } = req.params;

    if (!albumId) {
      const { createHttpError } = require('../lib/httpErrors');
      throw createHttpError(400, 'albumId es obligatorio', 'homecloud_missing_album_id');
    }

    const album = await getAlbumById(req, albumId);

    await telemetry.track('homecloud_album_get', { result: 'success' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ album });
  } catch (error) {
    await telemetry.track('homecloud_album_get', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/albums/:albumId/items
 * Protected primitive: requires homecloud.view, household-scoped.
 * Returns album items with active content DTOs.
 * Low-level primitive for Stage 4 composition.
 */
const getAlbumItemsController = async (req, res) => {
  try {
    const { albumId } = req.params;

    if (!albumId) {
      const { createHttpError } = require('../lib/httpErrors');
      throw createHttpError(400, 'albumId es obligatorio', 'homecloud_missing_album_id');
    }

    const items = await getAlbumMemberships(req, albumId);

    await telemetry.track('homecloud_album_items_get', { result: 'success', count: items.length }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json({ items });
  } catch (error) {
    await telemetry.track('homecloud_album_items_get', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

/**
 * GET /api/homecloud/memories
 * STAGE 4B.1 Memories read model: requires homecloud.view, household-scoped.
 * Returns active Memories only (role=memory, lifecycle=active) in the canonical
 * Timeline order, with the derived kind and the Album memberships the UI needs.
 *
 * Query params (all optional): limit, offset, year, albumId, query, kind, order.
 * order defaults to 'timeline' (newest -> oldest); 'album' with albumId selects
 * the explicit Album presentation mode (oldest -> newest).
 */
const listMemoriesController = async (req, res) => {
  try {
    const { limit, offset, year, albumId, query, kind, order } = req.query ?? {};
    const result = await listMemories(req, { limit, offset, year, albumId, query, kind, order });

    await telemetry.track('homecloud_memories_list', {
      result: 'success',
      count: result.memories.length,
    }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});

    return res.status(200).json(result);
  } catch (error) {
    await telemetry.track('homecloud_memories_list', { result: 'failure' }, {
      requestId: req.requestId,
      mutationId: req.mutationId,
    }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

module.exports = {
  getContentByIdController,
  listFoldersController,
  getFolderByIdController,
  listAlbumsController,
  getAlbumByIdController,
  getAlbumItemsController,
  listMemoriesController,
};