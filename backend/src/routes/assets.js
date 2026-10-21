'use strict';

/**
 * HOMePLUS Assets — A3.1–A3.3 Canonical Asset API + A4.1–A4.4 Asset Records (routes).
 *
 *   POST   /api/assets                      create (assets.contribute, Idempotency-Key)
 *   GET    /api/assets                      list normal corpus (assets.view)
 *   GET    /api/assets/capabilities         capability projection of the active
 *                                          member + household (assets.*)
 *   GET    /api/assets/:assetId             one authorized Asset with context (assets.view)
 *   PATCH  /api/assets/:assetId             edit Name only (assets.contribute, If-Match)
 *   PATCH  /api/assets/:assetId/identity   edit identity metadata: brand/model/serial/identifiers
 *                                          (assets.contribute, expected_identity, Idempotency-Key optional)
 *   PATCH  /api/assets/:assetId/category   assign/change/clear Category 0..1 (assets.contribute)
 *   GET    /api/assets/categories          household category catalog: stored + suggested (assets.view)
 *   POST   /api/assets/categories          create (or resolve) one household category
 *                                          (assets.contribute, Idempotency-Key)
 *   DELETE /api/assets/categories/:categoryId  remove one category; referencing Assets resolve to
 *                                          uncategorized (assets.contribute, Idempotency-Key)
 *   PATCH  /api/assets/:assetId/responsible  set/change/clear Responsible (assets.contribute)
 *   PATCH  /api/assets/:assetId/holder       set/change/clear Holder (assets.contribute)
 *   PATCH  /api/assets/:assetId/placement    set/change/clear Placement (assets.contribute)
 *   PATCH  /api/assets/:assetId/profile      structural Profile change (assets.manage)
 *   PATCH  /api/assets/:assetId/lifecycle   ACTIVE <-> INACTIVE ordinary transition (assets.contribute,
 *                                          expected_lifecycle_status, Idempotency-Key optional)
 *   POST   /api/assets/:assetId/archive     ACTIVE/INACTIVE -> ARCHIVED with optional disposition
 *                                          (assets.manage, Idempotency-Key required)
 *   POST   /api/assets/:assetId/unarchive   ARCHIVED -> exact previous operational state, never a
 *                                          silent fallback (assets.manage, Idempotency-Key required)
 *   GET    /api/assets/:assetId/archive-history  append-only archive episodes (assets.view)
 *   POST   /api/assets/:assetId/trash     ANY lifecycle -> recoverable TRASH, preserves
 *                                          identity/context/Records/Care/history intact
 *                                          (assets.manage, Idempotency-Key required)
 *   POST   /api/assets/:assetId/restore   TRASH -> exact previous logical lifecycle, never a
 *                                          silent fallback (assets.manage, Idempotency-Key required)
 *   GET    /api/assets/:assetId/trash-history  append-only trash episodes (assets.view)
 *   POST   /api/assets/records               create canonical Asset Record (assets.contribute, Idempotency-Key)
 *   GET    /api/assets/records/:recordId     one authorized ACTIVE Record with shared projection (assets.view)
 *   GET    /api/assets/:assetId/records      Records related to one Asset (assets.view, ?scope=active|removed)
 *   PATCH  /api/assets/records/:recordId     correct Record metadata (assets.contribute, Idempotency-Key)
 *   PATCH  /api/assets/records/:recordId/periods/:periodId  correct validity period (assets.contribute, Idempotency-Key)
 *   POST   /api/assets/records/:recordId/renew  partial/total Renewal (assets.contribute, Idempotency-Key)
 *   POST   /api/assets/records/:recordId/remove   recoverable Remove of the canonical Record (assets.manage, Idempotency-Key)
 *   POST   /api/assets/records/:recordId/restore  restore the same Record (assets.manage, Idempotency-Key)
 *   POST   /api/assets/care                  create manual Care Record (assets.contribute, Idempotency-Key)
 *   GET    /api/assets/care/:careId          one authorized ACTIVE Care Record (assets.view)
 *   GET    /api/assets/:assetId/care          Care Records of one Asset (assets.view, ?scope=active|removed)
 *   PATCH  /api/assets/care/:careId           correct manual Care (assets.contribute, Idempotency-Key, expected_updated_at)
 *   POST   /api/assets/care/:careId/remove    recoverable Remove of manual Care (assets.manage, Idempotency-Key)
 *   POST   /api/assets/care/:careId/restore   restore the same Care Record (assets.manage, Idempotency-Key)
 *   POST   /api/assets/files/link             attach an existing HomeCloud File to an
 *                                          Asset/Record/Care (assets.contribute + homecloud.view,
 *                                          Idempotency-Key)
 *   POST   /api/assets/files/unlink           detach that File (relation only; the HomeCloud File
 *                                          is NEVER deleted, trashed or purged)
 *   GET    /api/assets/:assetId/files         Files attached to one Asset (assets.view + homecloud.view)
 *   GET    /api/assets/records/:recordId/files  Files attached to one Record (assets.view + homecloud.view)
 *   GET    /api/assets/care/:careId/files     Files attached to one Care Record (assets.view + homecloud.view)
 *
 * A3.2 dimension routes are separate per dimension on purpose: a single
 * catch-all PATCH would invite blind cross-dimension overwrites (§13, §56).
 * The A3.3 Profile change is its own structural endpoint because it needs
 * assets.manage and atomic dependency validation (§43, §57).
 * A4.1 Record routes and A5.1 Care routes are registered BEFORE
 * /:assetId so the literal /records and /care segments are never
 * captured by the :assetId parameter.
 */

const express = require('express');
const authFinalMiddleware = require('../middleware/authFinalMiddleware');
const controller = require('../controllers/assets.controller');

const router = express.Router();

router.use(authFinalMiddleware);

// Authorized reads are user-scoped data: never cached by intermediaries.
const assetsCacheMiddleware = (req, res, next) => {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
  }
  next();
};

router.use(assetsCacheMiddleware);

router.post('/', controller.createAsset);
router.post('/records', controller.createAssetRecord);
router.post('/care', controller.createManualCare);
router.post('/categories', controller.createCategory);
router.post('/care/:careId/remove', controller.removeManualCare);
router.post('/care/:careId/restore', controller.restoreManualCare);
router.post('/records/:recordId/link', controller.linkRecordToAsset);
router.post('/records/:recordId/unlink', controller.unlinkRecordFromAsset);
router.post('/records/:recordId/renew', controller.renewAssetRecord);
router.post('/records/:recordId/remove', controller.removeAssetRecord);
router.post('/records/:recordId/restore', controller.restoreAssetRecord);
// S8-02 — Assets <-> HomeCloud: attach / detach a HomeCloud File.
// The literal "files" segment is registered BEFORE /:assetId so it is never
// captured as an asset id.
router.post('/files/link', controller.linkAssetFile);
router.post('/files/unlink', controller.unlinkAssetFile);
router.post('/:assetId/archive', controller.archiveAsset);
router.post('/:assetId/unarchive', controller.unarchiveAsset);
router.post('/:assetId/trash', controller.trashAsset);
router.post('/:assetId/restore', controller.restoreAsset);
router.patch('/records/:recordId', controller.correctAssetRecord);
router.patch('/records/:recordId/periods/:periodId', controller.correctAssetRecordPeriod);
router.patch('/care/:careId', controller.correctManualCare);
router.get('/', controller.listAssets);
router.get('/categories', controller.listCategories);
// Capability projection for the active member + household. The backend stays
// the authority; the client uses it only to hide/disable controls (§43).
// The literal segment is registered BEFORE /:assetId so it is never captured
// as an asset id.
router.get('/capabilities', controller.getAssetsCapabilities);
// BG-02: Household-wide shareable Record discovery (literal segment must be
// registered before /:assetId so it is never captured as an asset id).
router.get('/records', controller.listHouseholdRecords);
router.get('/records/:recordId', controller.getAssetRecordById);
router.get('/care/:careId', controller.getManualCareById);
// S8-02 — the File relations of one owner. These are two/three segment
// paths, so they can never collide with the single-segment /:assetId.
router.get('/records/:recordId/files', controller.listAssetRecordFiles);
router.get('/care/:careId/files', controller.listAssetCareFiles);
router.get('/:assetId', controller.getAssetById);
router.get('/:assetId/files', controller.listAssetFiles);
router.get('/:assetId/records', controller.listAssetRecords);
router.get('/:assetId/care', controller.listAssetCare);
router.get('/:assetId/archive-history', controller.getArchiveHistory);
router.get('/:assetId/trash-history', controller.getTrashHistory);
// S7-03 / S7-04 — integracion Assets <-> Planner. El segmento literal
// "planner-items" va DESPUES de /:assetId porque tiene dos segmentos: nunca
// puede ser capturado como un assetId (a diferencia de /capabilities).
router.get('/:assetId/planner-items', controller.listAssetPlannerItems);
router.post('/:assetId/planner-items', controller.createAssetPlannerItem);
router.patch('/:assetId', controller.updateAssetName);
router.patch('/:assetId/lifecycle', controller.setAssetLifecycleStatus);
router.patch('/:assetId/identity', controller.updateAssetIdentity);
router.patch('/:assetId/category', controller.setAssetCategory);
router.patch('/:assetId/responsible', controller.setAssetResponsible);
router.patch('/:assetId/holder', controller.setAssetHolder);
router.patch('/:assetId/placement', controller.setAssetPlacement);
router.patch('/:assetId/profile', controller.changeAssetProfile);
router.delete('/categories/:categoryId', controller.deleteCategory);

module.exports = router;
