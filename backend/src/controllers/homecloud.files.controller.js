'use strict';
const files = require('../services/homecloudFilesService');
const { sendApiError } = require('../lib/httpErrors');
const respond = (fn, key) => async (req, res) => { try { const value = await fn(req); return res.status(key === 'deleted' ? 204 : 200).json(key === 'deleted' ? undefined : { [key]: value }); } catch (error) { return sendApiError(res, error, req); } };
module.exports = {
  browse: respond(req => files.browseFiles(req, req.query), 'browser'),
  createFolder: respond(req => files.createFolder(req, req.body?.name, req.body?.parentFolderId), 'folder'),
  renameFolder: respond(req => files.renameFolder(req, req.params.folderId, req.body?.name), 'folder'),
  // Stage 2 Phase 1. `parentFolderId` is read ONLY from the body here and the
  // service passes it to the transactional database function, which validates the
  // parent server-side. A missing key means "move to the root".
  moveFolder: respond(req => files.moveFolder(req, req.params.folderId, req.body?.parentFolderId), 'folder'),
  deleteFolder: respond(async req => { await files.deleteFolder(req, req.params.folderId); return null; }, 'deleted'),
  updateFile: respond(req => files.updateFile(req, req.params.contentId, req.body ?? {}), 'file'),
  setFavorite: respond(req => files.setFileFavorite(req, req.params.contentId, req.body?.isFavorite), 'favorite'),
};
