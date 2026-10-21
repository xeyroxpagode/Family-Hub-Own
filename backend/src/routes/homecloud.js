const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const capabilitiesController = require('../controllers/homecloud.capabilities.controller')
const storageController = require('../controllers/homecloud.storage.controller')
const readController = require('../controllers/homecloud.read.controller')
const intakeController = require('../controllers/homecloud.intake.controller')
const filesController = require('../controllers/homecloud.files.controller')
const lifecycleController = require('../controllers/homecloud.lifecycle.controller')
const officeController = require('../controllers/homecloud.office.controller')
const albumsController = require('../controllers/homecloud.albums.controller')
const memoryController = require('../controllers/homecloud.memory.controller')
const contentStatesController = require('../controllers/homecloud.contentstates.controller')

const router = express.Router()

// OFFICE-1: entrega autorizada del documento al DocServer (bearer de sesión).
// Vive ANTES del middleware de auth a propósito: el DocServer descarga
// server-to-server sin credencial de usuario; la única credencial es el
// download token scoped a la sesión, creada bajo household + capability.
router.get('/office/:sessionId/document', officeController.serveOfficeDocument)

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

// S8-03: canonical batch read of the HomeCloud File lifecycle.
// Owned by HomeCloud; consumed by the Assets <-> HomeCloud integration so the
// Assets domain never reads public.homecloud_contents on its own.
// Body: { ids: [uuid] } (max 200). Household-scoped: an id of another
// household answers exactly like a nonexistent id (no disclosure).
// Registered BEFORE the /content/:contentId/* routes so the literal
// "contents" segment is never captured by a parameter.
router.post('/contents/states', contentStatesController.listContentStatesController)

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
router.post('/memories/:contentId/trash', lifecycleController.trashMemoryController)
router.post('/memories/:contentId/restore', lifecycleController.restoreMemoryController)
router.delete('/memories/:contentId', lifecycleController.purgeMemoryController)
router.post('/memories/purge-all', lifecycleController.purgeAllMemoriesController)

// ST-3: Memory metadata corrections (semantic date, caption, resurfacing
// hiding, HOUSEHOLD_SHARED favorite). Requires homecloud.organize.
router.patch('/memories/:contentId', memoryController.updateMemoryController)

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
// PURGE: irreversible physical deletion. Requires body { confirm: true };
// answers { contentId, operationId, status } and processes asynchronously
// through the durable purge worker (Storage API only, crash-safe, retried).
router.post('/content/:contentId/purge', lifecycleController.purgeContent)

// Office Viewer V1 (OFFICE-1: DOCX/DOC read-only). Sesiones cortas,
// firmadas con JWT, sin write-back. Requiere homecloud.view.
router.post('/content/:contentId/office-session', officeController.createOfficeSession)
router.delete('/office-session/:sessionId', officeController.revokeOfficeSession)

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
