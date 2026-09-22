const express = require('express');
const plansV1Controller = require('../controllers/planner.plans.v1.controller');

const router = express.Router();

router.get('/plans', plansV1Controller.listPlans);
router.post('/plans', plansV1Controller.createPlan);
router.get('/plans/:id', plansV1Controller.getPlanById);
router.patch('/plans/:id', plansV1Controller.updatePlan);
router.post('/plans/:id/transition', plansV1Controller.transitionPlan);
router.post('/plans/:id/trash', plansV1Controller.trashPlan);
router.post('/plans/:id/restore', plansV1Controller.restorePlan);
router.post('/plans/:id/unarchive', plansV1Controller.unarchivePlan);

module.exports = router;