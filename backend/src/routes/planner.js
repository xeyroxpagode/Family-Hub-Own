const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const tasksController = require('../controllers/planner.tasks.controller')
const eventsController = require('../controllers/planner.events.controller')
const calendarController = require('../controllers/planner.calendar.controller')
const summaryController = require('../controllers/planner.summary.controller')
const goalsController = require('../controllers/planner.goals.controller')
const trashController = require('../controllers/planner.trash.controller')
const activityController = require('../controllers/planner.activity.controller')
const capabilitiesController = require('../controllers/planner.capabilities.controller')
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

module.exports = router
