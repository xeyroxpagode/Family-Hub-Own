'use strict';

const express = require('express');
const presetsController = require('../controllers/planner.presets.controller');
const draftsController = require('../controllers/planner.drafts.controller');

const router = express.Router();

router.get('/presets', presetsController.listPresets);
router.post('/presets', presetsController.createPreset);
router.get('/presets/:id', presetsController.getPreset);
router.patch('/presets/:id', presetsController.updatePresetMetadata);
router.post('/presets/:id/revisions', presetsController.startRevision);
router.get('/presets/:id/revisions', presetsController.listRevisionHistory);
router.post('/presets/:id/trash', presetsController.trashPreset);
router.post('/presets/:id/restore', presetsController.restorePreset);
router.get('/presets/:id/prepare', presetsController.prepareApplicationPayload);
router.get('/preset-revisions/:revisionId', presetsController.getRevision);
router.patch('/preset-revisions/:revisionId', presetsController.updateRevisionDraft);
router.post('/preset-revisions/:revisionId/publish', presetsController.publishRevision);

router.get('/drafts/recover', draftsController.recoverDraft);
router.get('/drafts', draftsController.listDrafts);
router.post('/drafts/autosave', draftsController.autosaveDraft);
router.get('/drafts/:id', draftsController.getDraft);
router.post('/drafts/:id/discard', draftsController.discardDraft);
router.post('/drafts/:id/trash', draftsController.trashDraft);
router.post('/drafts/:id/restore', draftsController.restoreDraft);
router.get('/drafts/:id/prepare', draftsController.prepareActivationPayload);

module.exports = router;
