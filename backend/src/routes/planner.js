const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const tasksController = require('../controllers/planner.tasks.controller')
const eventsController = require('../controllers/planner.events.controller')
const eventsV1Controller = require('../controllers/planner.events.v1.controller')
const calendarController = require('../controllers/planner.calendar.controller')
const summaryController = require('../controllers/planner.summary.controller')
const searchController = require('../controllers/planner.search.controller')
const attentionController = require('../controllers/planner.attention.controller')
const goalsController = require('../controllers/planner.goals.controller')
const plansController = require('../controllers/planner.plans.controller')
const trashController = require('../controllers/planner.trash.controller')
const activityController = require('../controllers/planner.activity.controller')
const capabilitiesController = require('../controllers/planner.capabilities.controller')
const schedulesController = require('../controllers/planner.schedules.controller')
const responsibilitiesController = require('../controllers/planner.responsibilities.controller')
const eventSeriesController = require('../controllers/planner.event-series.controller')
const presetsDraftsRouter = require('./planner.presets-drafts')
const plansV1Router = require('./planner.v1')
const { plannerObservabilityMiddleware } = require('../lib/plannerObservability')
const { requireUuidParams } = require('../middleware/requireUuidParams')

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

router.get('/responsibilities', responsibilitiesController.list)
router.post('/responsibilities/materialize-due', responsibilitiesController.materializeDue)
// `materialize-range` is a LITERAL segment, but `router.use('/event-series/:id')`
// would match it (`:id` = 'materialize-range'). Express matches in registration
// order, so the concrete route MUST be registered before the `:id` guards or the
// guard swallows it.
router.post('/event-series/materialize-range', eventSeriesController.materializeRange)

// Path params that address a row. A malformed value is answered like an absent
// one (same status/message/code) so a deep link always terminates in a terminal
// state and never leaks existence or a raw driver SQLSTATE.
// The path list is REQUIRED: a bare `router.use(fn)` runs before Express matches
// a route, so `req.params` would be empty and the guard would silently do
// nothing.
router.use(
  [
    '/event-series/:id',
    '/event-series/:id/pause',
    '/event-series/:id/resume',
    '/event-series/:id/trash',
    '/event-series/:id/restore',
  ],
  requireUuidParams(['id'], {
    status: 404,
    message: 'Horario no encontrado.',
    code: 'event_series_not_found',
  }),
);
router.get('/event-series', eventSeriesController.list)
router.post('/event-series', eventSeriesController.create)
router.get('/event-series/:id', eventSeriesController.get)
router.patch('/event-series/:id', eventSeriesController.update)
router.post('/event-series/:id/pause', eventSeriesController.pause)
router.post('/event-series/:id/resume', eventSeriesController.resume)
router.post('/event-series/:id/trash', eventSeriesController.trash)
router.post('/event-series/:id/restore', eventSeriesController.restore)
router.post('/responsibilities', responsibilitiesController.create)
router.get('/responsibilities/:id', responsibilitiesController.get)
router.patch('/responsibilities/:id', responsibilitiesController.update)
router.post('/responsibilities/:id/pause', responsibilitiesController.pause)
router.post('/responsibilities/:id/resume', responsibilitiesController.resume)
router.post('/responsibilities/:id/archive', responsibilitiesController.archive)
router.post('/responsibilities/:id/unarchive', responsibilitiesController.unarchive)
router.post('/responsibilities/:id/trash', responsibilitiesController.trash)
router.post('/responsibilities/:id/restore', responsibilitiesController.restore)
router.post('/responsibilities/:id/current-task/replace-assignee', responsibilitiesController.replaceCurrentAssignee)

// G0.2: capability projection for the active member+household.
// Read-only, scoped server-side.
router.get('/capabilities', capabilitiesController.getPlannerCapabilities)

router.get('/activity', activityController.listActivity)

router.get('/trash', trashController.getTrash)
router.get('/search', searchController.searchPlanner)

router.get('/attention', attentionController.getAttention)

router.get('/schedules', schedulesController.listSchedules)
router.post('/schedules', schedulesController.createSchedule)
router.patch('/schedules/:id', schedulesController.updateSchedule)
router.delete('/schedules/:id', schedulesController.deleteSchedule)
router.get('/schedules/privacy', schedulesController.getMyPrivacy)
router.put('/schedules/privacy', schedulesController.updateMyPrivacy)

router.get('/plans/legacy-compatibility-report', plansController.getLegacyCompatibilityReport)
router.post('/plans/:id/structure', plansController.applyPlanStructureChangeset)
router.get('/plans/:id', plansController.getPlanGraph)
router.get('/plans', plansController.listPlans)
router.post('/plans', plansController.writePlanGraph)
router.post('/plans/:id/mutations', plansController.writePlanGraph)

router.get('/v1/tasks/:taskId/fulfillment', tasksController.getTaskFulfillmentV1)
router.put('/v1/tasks/:taskId/assignment', tasksController.updateTaskAssignmentV1)
router.post('/v1/tasks/:taskId/claim', tasksController.claimTaskV1)
router.post('/v1/tasks/:taskId/release', tasksController.releaseTaskV1)
router.post('/v1/tasks/:taskId/archive', tasksController.archiveTaskV1)
router.post('/v1/tasks/:taskId/unarchive', tasksController.unarchiveTaskV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/complete', tasksController.completeTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/verify', tasksController.verifyTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/request-correction', tasksController.requestTaskCorrectionV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/resubmit', tasksController.resubmitTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/revert', tasksController.revertTaskFulfillmentV1)
router.post('/v1/tasks/:taskId/fulfillments/:fulfillmentId/reopen', tasksController.reopenTaskFulfillmentV1)

// Path params that address a row on the legacy Task surface. A malformed value
// is answered like an absent one (same status/message/code) so a deep link
// always terminates in a terminal state and never leaks existence.
router.use(
  ['/tasks/:id/evidence/artifacts/:artifactId/authorize', '/tasks/:id/evidence/artifacts/:artifactId/confirm', '/tasks/:id/evidence/artifacts/:artifactId/cancel', '/tasks/:id/evidence/media/:artifactId/access', '/tasks/:id/evidence/submissions/:fulfillmentId', '/tasks/:id/evidence/submissions/:fulfillmentId/:submissionId/review'],
  requireUuidParams(['id', 'fulfillmentId', 'artifactId', 'submissionId'], {
    status: 404,
    message: 'Tarea no encontrada.',
    code: 'task_not_found',
  }),
);
router.use(
  ['/tasks/:id', '/tasks/:id/evidence', '/tasks/:id/evidence/:fulfillmentId', '/tasks/:id/audit', '/v1/tasks/:taskId', '/v1/tasks/:taskId/fulfillments/:fulfillmentId'],
  requireUuidParams(['id', 'taskId', 'fulfillmentId'], {
    status: 404,
    message: 'Tarea no encontrada.',
    code: 'task_not_found',
  }),
);

router.post('/tasks/:id/evidence/artifacts', tasksController.registerTaskEvidenceArtifact)
router.post('/tasks/:id/evidence/artifacts/:artifactId/authorize', tasksController.authorizeTaskEvidenceArtifact)
router.post('/tasks/:id/evidence/artifacts/:artifactId/confirm', tasksController.confirmTaskEvidenceArtifact)
router.post('/tasks/:id/evidence/artifacts/:artifactId/cancel', tasksController.cancelTaskEvidenceArtifact)
router.get('/tasks/:id/evidence/media/:artifactId/access', tasksController.getTaskEvidenceMediaAccess)
router.post('/tasks/:id/evidence/submissions/:fulfillmentId', tasksController.submitTaskEvidenceV2)
router.post('/tasks/:id/evidence/submissions/:fulfillmentId/:submissionId/review', tasksController.reviewTaskEvidenceV2)
router.get('/tasks/:id/evidence/submissions', tasksController.getTaskEvidenceHistoryV2)

router.post('/tasks/:id/evidence/:fulfillmentId', tasksController.submitTaskEvidence)
router.get('/tasks/:id/evidence', tasksController.getTaskEvidenceHistory)
router.get('/tasks/:id/audit', tasksController.getTaskAuditHistory)

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

router.use(
  [
    '/goals/:goalId/milestones',
    '/goals/:goalId/milestones/:milestoneId',
    '/goals/:goalId/milestones/:milestoneId/trash',
    '/goals/:goalId/milestones/:milestoneId/restore',
  ],
  requireUuidParams(['goalId', 'milestoneId'], {
    status: 404,
    message: 'Meta no encontrada.',
    code: 'goal_not_found',
  }),
);

router.get('/goals/:goalId/milestones', goalsController.listMilestones)
router.post('/goals/:goalId/milestones', goalsController.createMilestone)
router.patch('/goals/:goalId/milestones/:milestoneId', goalsController.updateMilestone)
router.delete('/goals/:goalId/milestones/:milestoneId', goalsController.deleteMilestone)
router.post('/goals/:goalId/milestones/:milestoneId/trash', goalsController.trashMilestone)
router.post('/goals/:goalId/milestones/:milestoneId/restore', goalsController.restoreMilestone)

router.use(presetsDraftsRouter)
router.use('/v1', plansV1Router)

module.exports = router
