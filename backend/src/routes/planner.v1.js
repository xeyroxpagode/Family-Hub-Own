const express = require('express');
const plansV1Controller = require('../controllers/planner.plans.v1.controller');
const { requireUuidParams } = require('../middleware/requireUuidParams');

const router = express.Router();

// Path params that address a row. A malformed value is answered exactly like an
// absent one: same status, same code, same message. Without this the driver
// raises on `uuid` cast and the deep link surfaces a 500 (or, worse, a
// distinguishable error that leaks existence).
//
// The path list is REQUIRED: a bare `router.use(fn)` runs before Express matches
// a route, so `req.params` would still be empty and the guard would be a no-op.
// Every route below is listed explicitly so a new route cannot silently skip it.
const UUID_PATHS = [
  '/plans/:id',
  '/plans/:id/transition',
  '/plans/:id/trash',
  '/plans/:id/restore',
  '/plans/:id/unarchive',
  '/plans/:id/readiness',
  '/plans/:id/components',
  '/plans/:id/measurements',
  '/plans/:id/measurements/trash',
  '/plans/:id/measurements/:measurementId',
  '/plans/:id/measurements/:measurementId/history',
  '/plans/:id/measurements/:measurementId/trash',
  '/plans/:id/measurements/:measurementId/restore',
  '/plans/:id/events/:eventId/link',
  '/plans/:id/events/:eventId/unlink',
];

router.use(
  UUID_PATHS,
  requireUuidParams(['id', 'measurementId', 'eventId'], {
    status: 404,
    message: 'Plan no encontrado.',
    code: 'plan_not_found',
  }),
);

router.get('/plans', plansV1Controller.listPlans);
router.post('/plans', plansV1Controller.createPlan);
router.get('/plans/:id', plansV1Controller.getPlanById);
router.patch('/plans/:id', plansV1Controller.updatePlan);
router.post('/plans/:id/transition', plansV1Controller.transitionPlan);
router.post('/plans/:id/trash', plansV1Controller.trashPlan);
router.post('/plans/:id/restore', plansV1Controller.restorePlan);
router.post('/plans/:id/unarchive', plansV1Controller.unarchivePlan);
router.get('/plans/:id/readiness', plansV1Controller.getPlanReadiness);
router.get('/plans/:id/components', plansV1Controller.getPlanComponents);
router.get('/plans/:id/measurements', plansV1Controller.listMeasurements);
router.get('/plans/:id/measurements/trash', plansV1Controller.listTrashedMeasurements);
router.post('/plans/:id/measurements', plansV1Controller.createMeasurement);
router.get('/plans/:id/measurements/:measurementId/history', plansV1Controller.listMeasurementHistory);
router.patch('/plans/:id/measurements/:measurementId', plansV1Controller.updateMeasurement);
router.post('/plans/:id/measurements/:measurementId/trash', plansV1Controller.trashMeasurement);
router.post('/plans/:id/measurements/:measurementId/restore', plansV1Controller.restoreMeasurement);
router.post('/plans/:id/events/:eventId/link', plansV1Controller.linkEvent);
router.post('/plans/:id/events/:eventId/unlink', plansV1Controller.unlinkEvent);

module.exports = router;
module.exports.UUID_PATHS = UUID_PATHS;
