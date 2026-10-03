const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const capabilitiesController = require('../controllers/homecloud.capabilities.controller')
const storageController = require('../controllers/homecloud.storage.controller')
const readController = require('../controllers/homecloud.read.controller')
const intakeController = require('../controllers/homecloud.intake.controller')
const filesController = require('../controllers/homecloud.files.controller')
const albumsController = require('../controllers/homecloud.albums.controller')

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
// Active memories only (role=memory, lifecycle=active), stable limit/offset
// pagination, derived kind + album memberships.
// Query: limit, offset, year, albumId, query, kind, order
// `order` defaults to the global Timeline (newest -> oldest); `order=album`
// with `albumId` selects the EXPLICIT Album presentation mode (oldest -> newest).
router.get('/memories', readController.listMemoriesController)

// Folders: list and get by ID (protected, household-scoped)
// No lifecycle on folders; stable ordering by name
router.get('/folders', readController.listFoldersController)
router.get('/folders/:folderId', readController.getFolderByIdController)

// Stage 3 canonical Files browser and organization APIs.
router.get('/files', filesController.browse)
router.post('/folders', filesController.createFolder)
router.patch('/folders/:folderId', filesController.renameFolder)
router.delete('/folders/:folderId', filesController.deleteFolder)
router.patch('/content/:contentId/file', filesController.updateFile)

// Albums: list and get by ID (protected, household-scoped, active-only)
// Stable ordering by name
router.get('/albums', readController.listAlbumsController)
router.get('/albums/:albumId', readController.getAlbumByIdController)

// MO-A1 Album organization mutations (require homecloud.organize).
// An Album is a shared ORGANIZATION over Memories: none of these endpoints
// creates, modifies, trashes or purges a Memory, and DELETE is a HARD delete of
// the grouping only (membership rows disappear through the FK cascade).
router.post('/albums', albumsController.createAlbumController)
router.patch('/albums/:albumId', albumsController.renameAlbumController)
router.delete('/albums/:albumId', albumsController.deleteAlbumController)
router.post('/albums/:albumId/items', albumsController.addAlbumItemController)
router.delete('/albums/:albumId/items/:contentId', albumsController.removeAlbumItemController)

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
