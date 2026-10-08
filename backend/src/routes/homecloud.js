const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const capabilitiesController = require('../controllers/homecloud.capabilities.controller')
const storageController = require('../controllers/homecloud.storage.controller')
const readController = require('../controllers/homecloud.read.controller')
const intakeController = require('../controllers/homecloud.intake.controller')
const filesController = require('../controllers/homecloud.files.controller')
const lifecycleController = require('../controllers/homecloud.lifecycle.controller')

const router = express.Router()

router.use(authFinalMiddleware)

const homecloudCacheMiddleware = (req, res, next) => {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    })
  }
  next()
}

router.use(homecloudCacheMiddleware)

// HC-1D: capability projection for the active member+household.
// Read-only, scoped server-side.
router.get('/capabilities', capabilitiesController.getHomeCloudCapabilities)

// HC-1E: private content access via bounded signed URL.
// Requires homecloud.view capability (enforced in service).
// Query: variant=original|preview, optional ttl (seconds)
router.get('/content/:contentId/access', storageController.getHomeCloudContentAccess)

// HC-1F: Foundation Read Services

// Content: get by ID (protected, household-scoped, active-only)
// Returns safe discriminated DTO (File | Memory)
router.get('/content/:contentId', readController.getContentByIdController)

// Stage 4B.1: Memories read model (Memories Root / Timeline data source).
// Active memories only (role=memory, lifecycle=active), canonical Timeline
// order, stable limit/offset pagination, derived kind + album memberships.
// Query: limit, offset, year, albumId, query, kind
router.get('/memories', readController.listMemoriesController)

// Folders: list the whole household catalogue and get by ID
// (protected, household-scoped). The catalogue carries parent_folder_id so a
// client derives the tree from ONE read; it is not a listing surface.
router.get('/folders', readController.listFoldersController)
router.get('/folders/:folderId', readController.getFolderByIdController)

// Stage 3 canonical Files browser and organization APIs.
router.get('/files', filesController.browse)
router.post('/folders', filesController.createFolder)
router.patch('/folders/:folderId', filesController.renameFolder)
// Stage 2 Phase 1: reparent a folder. A dedicated verb rather than a name-shaped
// PATCH, because "where does this folder live" is not a display name and must
// not be reachable by passing an extra field to the rename body.
router.post('/folders/:folderId/move', filesController.moveFolder)
router.delete('/folders/:folderId', filesController.deleteFolder)
router.patch('/content/:contentId/file', filesController.updateFile)
// Files Core: personal Favorites. Idempotent toggle of ONE person's preference
// over ONE File. Requires homecloud.view (a personal retrieval preference is not
// organization); the household and the person are always server-resolved.
router.patch('/content/:contentId/favorite', filesController.setFavorite)

// Files Lifecycle V1: Trash / Restore / Purge (Product Truth sections 49-51).
// `homecloud.delete` covers destructive lifecycle actions; no new capability
// identifier exists. Trash and Restore are reversible and idempotent; the
// state machine authority is the database (20261007000000 lifecycle migration),
// and these endpoints never accept household or lifecycle values from clients.
router.post('/content/:contentId/trash', lifecycleController.trashContent)
router.post('/content/:contentId/restore', lifecycleController.restoreContent)
// Papelera listing: Files of this household in lifecycle='trashed' only.
// Query: limit, offset (same has-more probe pagination as /files).
router.get('/files/trash', lifecycleController.listTrash)

// Albums: list and get by ID (protected, household-scoped, active-only)
// Stable ordering by name
router.get('/albums', readController.listAlbumsController)
router.get('/albums/:albumId', readController.getAlbumByIdController)

// Album items primitive (protected, household-scoped)
 // Low-level repository primitive for Stage 4 composition
 router.get('/albums/:albumId/items', readController.getAlbumItemsController)

// HC-2A: Shared Upload/Intake Engine Foundation.
// register -> staging row (homecloud.contribute)
router.post('/register', intakeController.registerContentController)

// upload authorization -> single-object signed upload URL
router.post('/content/:contentId/upload', intakeController.authorizeUploadController)

// verify -> server confirms original exists (no finalize)
router.post('/content/:contentId/verify', intakeController.verifyContentController)

// finalize -> idempotent staging -> active (sets uploaded_at)
router.post('/content/:contentId/finalize', intakeController.finalizeContentController)

module.exports = router
