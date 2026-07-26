const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const tasksController = require('../controllers/planner.tasks.controller')
const eventsController = require('../controllers/planner.events.controller')
const eventsV1Controller = require('../controllers/planner.events.v1.controller')
const calendarController = require('../controllers/planner.calendar.controller')
const summaryController = require('../controllers/planner.summary.controller')
const goalsController = require('../controllers/planner.goals.controller')
const plansController = require('../controllers/planner.plans.controller')
const trashController = require('../controllers/planner.trash.controller')
const activityController = require('../controllers/planner.activity.controller')
const capabilitiesController = require('../controllers/planner.capabilities.controller')
const presetsDraftsRouter = require('./planner.presets-drafts')
const { plannerObservabilityMiddleware } = require('../lib/plannerObservability')

const router = express.Router()

router.use(authFinalMiddleware)

const plannerCacheMiddleware = (req, res, next) => {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    })
  }
  next()
}

router.use(plannerCacheMiddleware)
router.use(plannerObservabilityMiddleware)

// G0.2: capability projection for the active member+household.
// Read-only, scoped server-side.
router.get('/capabilities', capabilitiesController.getPlannerCapabilities)

router.get('/activity', activityController.listActivity)

router.get('/trash', trashController.getTrash)

router.get('/plans/legacy-compatibility-report', plansController.getLegacyCompatibilityReport)
router.get('/plans/:id', plansController.getPlanGraph)
router.get('/plans', plansController.listPlans)
router.post('/plans', plansController.writePlanGraph)
router.post('/plans/:id/mutations', plansController.writePlanGraph)

router.get('/v1/tasks/:taskId/fulfillment', tasksController.getTaskFulfillmentV1)
router.put('/v1/tasks/:taskId/assignment', tasksController.updateTaskAssignmentV1)
router.post('/v1/tasks/:taskId/claim', tasksController.claimTaskV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/complete', tasksController.completeTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/verify', tasksController.verifyTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/request-correction', tasksController.requestTaskCorrectionV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/resubmit', tasksController.resubmitTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/revert', tasksController.revertTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/reopen', tasksController.reopenTaskFulfillmentV1)

router.get('/tasks/:id', tasksController.getTaskById)
router.get('/tasks', tasksController.listTasks)
router.post('/tasks', tasksController.createTask)
router.patch('/tasks/:id', tasksController.updateTask)
router.delete('/tasks/:id', tasksController.cancelTask)
router.post('/tasks/:id/trash', tasksController.trashTask)
router.post('/tasks/:id/restore', tasksController.restoreTask)
router.post('/tasks/:id/reactivate', tasksController.reactivateTask)
router.post('/tasks/:id/complete', tasksController.completeTask)
router.post('/tasks/:id/verify', tasksController.verifyTask)

router.get('/v1/events/:id', eventsV1Controller.getEventV1)
router.get('/v1/events', eventsV1Controller.listEventsV1)
router.post('/v1/events', eventsV1Controller.createEventV1)
router.post('/v1/events/:id/mutations', eventsV1Controller.mutateEventV1)
router.post('/v1/events/:id/participants/mutations', eventsV1Controller.mutateParticipantV1)

router.get('/events/:id', eventsController.getEventById)
router.get('/events', eventsController.listEvents)
router.post('/events', eventsController.createEvent)
router.patch('/events/:id', eventsController.updateEvent)
router.delete('/events/:id', eventsController.cancelEvent)
router.post('/events/:id/trash', eventsController.trashEvent)
router.post('/events/:id/restore', eventsController.restoreEvent)
router.post('/events/:id/reactivate', eventsController.reactivateEvent)
router.post('/events/:id/occurrences/override', eventsController.createOccurrenceOverride)

router.get('/calendar', calendarController.getCalendar)
router.get('/summary', summaryController.getSummary)

router.get('/goals', goalsController.listGoals)
router.post('/goals', goalsController.createGoal)
router.get('/goals/:id', goalsController.getGoalById)
router.patch('/goals/:id', goalsController.updateGoal)
router.delete('/goals/:id', goalsController.deleteGoal)
router.post('/goals/:id/trash', goalsController.trashGoal)
router.post('/goals/:id/restore', goalsController.restoreGoal)
router.post('/goals/:id/complete', goalsController.completeGoal)
router.post('/goals/:id/close', goalsController.closeGoal)
router.post('/goals/:id/reopen', goalsController.reopenGoal)
router.post('/goals/:id/fail', goalsController.failGoal)

router.get('/goals/:goalId/milestones', goalsController.listMilestones)
router.post('/goals/:goalId/milestones', goalsController.createMilestone)
router.patch('/goals/:goalId/milestones/:milestoneId', goalsController.updateMilestone)
router.delete('/goals/:goalId/milestones/:milestoneId', goalsController.deleteMilestone)
router.post('/goals/:goalId/milestones/:milestoneId/trash', goalsController.trashMilestone)
router.post('/goals/:goalId/milestones/:milestoneId/restore', goalsController.restoreMilestone)

router.use(presetsDraftsRouter)

module.exports = router
