const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const inviteLinksController = require('../controllers/inviteLinks.controller')

const householdInviteLinksRouter = express.Router({ mergeParams: true })
const householdJoinRequestsRouter = express.Router({ mergeParams: true })
const inviteLinksRouter = express.Router()

householdInviteLinksRouter.post('/', authFinalMiddleware, inviteLinksController.createInviteLink)
householdInviteLinksRouter.post(
  '/:invite_link_id/revoke',
  authFinalMiddleware,
  inviteLinksController.revokeInviteLink,
)
householdJoinRequestsRouter.get('/', authFinalMiddleware, inviteLinksController.listJoinRequests)
householdJoinRequestsRouter.post(
  '/:membership_id/approve',
  authFinalMiddleware,
  inviteLinksController.approveJoinRequest,
)
householdJoinRequestsRouter.post(
  '/:membership_id/reject',
  authFinalMiddleware,
  inviteLinksController.rejectJoinRequest,
)

inviteLinksRouter.post('/join', authFinalMiddleware, inviteLinksController.joinInviteLink)

module.exports = {
  householdInviteLinksRouter,
  householdJoinRequestsRouter,
  inviteLinksRouter,
}
