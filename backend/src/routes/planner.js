const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const tasksController = require('../controllers/planner.tasks.controller')
const eventsController = require('../controllers/planner.events.controller')
const calendarController = require('../controllers/planner.calendar.controller')
const summaryController = require('../controllers/planner.summary.controller')
const goalsController = require('../controllers/planner.goals.controller')

const router = express.Router()

router.use(authFinalMiddleware)

router.get('/tasks', tasksController.listTasks)
router.post('/tasks', tasksController.createTask)
router.patch('/tasks/:id', tasksController.updateTask)
router.delete('/tasks/:id', tasksController.cancelTask)
router.post('/tasks/:id/complete', tasksController.completeTask)
router.post('/tasks/:id/verify', tasksController.verifyTask)

router.get('/events', eventsController.listEvents)
router.post('/events', eventsController.createEvent)
router.patch('/events/:id', eventsController.updateEvent)
router.delete('/events/:id', eventsController.cancelEvent)
router.post('/events/:id/occurrences/override', eventsController.createOccurrenceOverride)

router.get('/calendar', calendarController.getCalendar)
router.get('/summary', summaryController.getSummary)

router.get('/goals', goalsController.listGoals)
router.post('/goals', goalsController.createGoal)
router.get('/goals/:id', goalsController.getGoalById)
router.patch('/goals/:id', goalsController.updateGoal)
router.delete('/goals/:id', goalsController.deleteGoal)
router.post('/goals/:id/complete', goalsController.completeGoal)
router.post('/goals/:id/fail', goalsController.failGoal)

router.get('/goals/:goalId/milestones', goalsController.listMilestones)
router.post('/goals/:goalId/milestones', goalsController.createMilestone)
router.patch('/goals/:goalId/milestones/:milestoneId', goalsController.updateMilestone)
router.delete('/goals/:goalId/milestones/:milestoneId', goalsController.deleteMilestone)

module.exports = router
