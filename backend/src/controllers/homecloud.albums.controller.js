'use strict';

/**
 * HomeCloud MO-A1 — Album organization mutation endpoints.
 *
 * Thin transport layer, following the canonical Files mutation controller:
 * it validates nothing itself and exposes no Album internals. Household
 * authority, capability enforcement and the DTO boundary all live in the
 * service.
 *
 * Capability: every endpoint here requires homecloud.organize.
 */

const albums = require('../services/homecloudAlbumService');
const { sendApiError } = require('../lib/httpErrors');

/** Answer 200 with one named DTO, or 204 with no body. */
const respond = (fn) => async (req, res) => {
  try {
    const value = await fn(req);
    if (value === undefined) return res.status(204).json(undefined);
    return res.status(200).json(value);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

/** POST /api/homecloud/albums */
const createAlbumController = respond(async (req) => ({
  album: await albums.createAlbum(req, req.body ?? {}),
}));

/** PATCH /api/homecloud/albums/:albumId */
const renameAlbumController = respond(async (req) => ({
  album: await albums.renameAlbum(req, req.params.albumId, req.body ?? {}),
}));

/** DELETE /api/homecloud/albums/:albumId -> 204 */
const deleteAlbumController = respond(async (req) => {
  await albums.deleteAlbum(req, req.params.albumId);
  return undefined;
});

/** POST /api/homecloud/albums/:albumId/items */
const addAlbumItemController = respond(async (req) => ({
  membership: await albums.addMemoryToAlbum(req, req.params.albumId, req.body ?? {}),
}));

/** DELETE /api/homecloud/albums/:albumId/items/:contentId -> 204 */
const removeAlbumItemController = respond(async (req) => {
  await albums.removeMemoryFromAlbum(req, req.params.albumId, req.params.contentId);
  return undefined;
});

module.exports = {
  createAlbumController,
  renameAlbumController,
  deleteAlbumController,
  addAlbumItemController,
  removeAlbumItemController,
};