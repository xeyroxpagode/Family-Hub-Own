'use strict';

/**
 * HOMePLUS Assets — A3.1 + A3.2 Canonical Asset API (controller).
 *
 * Thin transport adapter: every rule lives in the service. The service may
 * return either a plain body (reads) or an explicit { status, body } outcome
 * (mutations, including idempotent replays, which replay the originally
 * stored status). Errors cross the canonical envelope via sendApiError.
 */

const assetsService = require('../services/assets.service');
const assetsPlannerService = require('../services/assets.planner.service');
const { sendApiError } = require('../lib/httpErrors');

async function dispatch(req, res, fn, fallbackStatus = 200) {
  try {
    const result = await fn();
    const status = result && Number.isInteger(result.status) && result.body && typeof result.body === 'object'
      ? result.status
      : fallbackStatus;
    const body = result && result.body && typeof result.body === 'object' ? result.body : result;
    return res.status(status).json(body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = {
  getAssetsCapabilities: (req, res) =>
    dispatch(req, res, () => assetsService.getAssetsCapabilities(req)),
  createAsset: (req, res) => dispatch(req, res, () => assetsService.createAsset(req, req.body ?? {}), 201),
  listAssets: (req, res) => dispatch(req, res, () => assetsService.listAssets(req, req.query ?? {})),
  getAssetById: (req, res) => dispatch(req, res, () => assetsService.getAssetById(req, req.params?.assetId)),
  updateAssetName: (req, res) =>
    dispatch(req, res, () => assetsService.updateAssetName(req, req.params?.assetId, req.body ?? {})),
  updateAssetIdentity: (req, res) =>
    dispatch(req, res, () => assetsService.updateAssetIdentity(req, req.params?.assetId, req.body ?? {})),
  setAssetCategory: (req, res) =>
    dispatch(req, res, () => assetsService.setAssetCategory(req, req.params?.assetId, req.body ?? {})),
  listCategories: (req, res) => dispatch(req, res, () => assetsService.listCategories(req)),
  createCategory: (req, res) =>
    dispatch(req, res, () => assetsService.createCategory(req, req.body ?? {}), 201),
  deleteCategory: (req, res) =>
    dispatch(req, res, () => assetsService.deleteCategory(req, req.params?.categoryId)),
  setAssetResponsible: (req, res) =>
    dispatch(req, res, () => assetsService.setAssetResponsible(req, req.params?.assetId, req.body ?? {})),
  setAssetHolder: (req, res) =>
    dispatch(req, res, () => assetsService.setAssetHolder(req, req.params?.assetId, req.body ?? {})),
  setAssetPlacement: (req, res) =>
    dispatch(req, res, () => assetsService.setAssetPlacement(req, req.params?.assetId, req.body ?? {})),
  changeAssetProfile: (req, res) =>
    dispatch(req, res, () => assetsService.changeAssetProfile(req, req.params?.assetId, req.body ?? {})),
  setAssetLifecycleStatus: (req, res) =>
    dispatch(req, res, () => assetsService.setAssetLifecycleStatus(req, req.params?.assetId, req.body ?? {})),
  archiveAsset: (req, res) =>
    dispatch(req, res, () => assetsService.archiveAsset(req, req.params?.assetId, req.body ?? {})),
  unarchiveAsset: (req, res) =>
    dispatch(req, res, () => assetsService.unarchiveAsset(req, req.params?.assetId, req.body ?? {})),
  getArchiveHistory: (req, res) =>
    dispatch(req, res, () => assetsService.getArchiveHistory(req, req.params?.assetId)),
  trashAsset: (req, res) =>
    dispatch(req, res, () => assetsService.trashAsset(req, req.params?.assetId, req.body ?? {})),
  restoreAsset: (req, res) =>
    dispatch(req, res, () => assetsService.restoreAsset(req, req.params?.assetId, req.body ?? {})),
  getTrashHistory: (req, res) =>
    dispatch(req, res, () => assetsService.getTrashHistory(req, req.params?.assetId)),
  createAssetRecord: (req, res) =>
    dispatch(req, res, () => assetsService.createAssetRecord(req, req.body ?? {}), 201),
  listHouseholdRecords: (req, res) =>
    dispatch(req, res, () => assetsService.listHouseholdRecords(req, req.query ?? {})),
  getAssetRecordById: (req, res) =>
    dispatch(req, res, () => assetsService.getAssetRecordById(req, req.params?.recordId)),
  listAssetRecords: (req, res) =>
    dispatch(req, res, () => assetsService.listAssetRecords(req, req.params?.assetId, req.query ?? {})),
  linkRecordToAsset: (req, res) =>
    dispatch(req, res, () => assetsService.linkRecordToAsset(req, req.params?.recordId, req.body ?? {})),
  unlinkRecordFromAsset: (req, res) =>
    dispatch(req, res, () => assetsService.unlinkRecordFromAsset(req, req.params?.recordId, req.body ?? {})),
  correctAssetRecord: (req, res) =>
    dispatch(req, res, () => assetsService.correctAssetRecord(req, req.params?.recordId, req.body ?? {})),
  correctAssetRecordPeriod: (req, res) =>
    dispatch(req, res, () => assetsService.correctAssetRecordPeriod(req, req.params?.recordId, req.params?.periodId, req.body ?? {})),
  renewAssetRecord: (req, res) =>
    dispatch(req, res, () => assetsService.renewAssetRecord(req, req.params?.recordId, req.body ?? {})),
  removeAssetRecord: (req, res) =>
    dispatch(req, res, () => assetsService.removeAssetRecord(req, req.params?.recordId, req.body ?? {})),
  restoreAssetRecord: (req, res) =>
    dispatch(req, res, () => assetsService.restoreAssetRecord(req, req.params?.recordId, req.body ?? {})),
  createManualCare: (req, res) =>
    dispatch(req, res, () => assetsService.createManualCare(req, req.body ?? {}), 201),
  getManualCareById: (req, res) =>
    dispatch(req, res, () => assetsService.getManualCareById(req, req.params?.careId)),
  listAssetCare: (req, res) =>
    dispatch(req, res, () => assetsService.listAssetCare(req, req.params?.assetId, req.query ?? {})),
  correctManualCare: (req, res) =>
    dispatch(req, res, () => assetsService.correctManualCare(req, req.params?.careId, req.body ?? {})),
  removeManualCare: (req, res) =>
    dispatch(req, res, () => assetsService.removeManualCare(req, req.params?.careId, req.body ?? {})),
  restoreManualCare: (req, res) =>
    dispatch(req, res, () => assetsService.restoreManualCare(req, req.params?.careId)),
  // S7-03 / S7-04 — integracion Assets <-> Planner.
  createAssetPlannerItem: async (req, res) => {
    try {
      const result = await assetsPlannerService.createAssetPlannerItem(req, req.params?.assetId, req.body ?? {});
      // Eco del mutation id para correlacion (mismo contrato que Planner).
      const mutationId = req.get?.('X-Mutation-Id');
      if (mutationId) res.set('X-Mutation-Id', mutationId);
      return res.status(201).json(result);
    } catch (error) {
      return sendApiError(res, error, req);
    }
  },
  listAssetPlannerItems: (req, res) =>
    dispatch(req, res, () => assetsPlannerService.listAssetPlannerItems(req, req.params?.assetId, req.query ?? {})),
};

