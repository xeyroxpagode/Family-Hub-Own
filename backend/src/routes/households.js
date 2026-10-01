const express = require('express')
const authFinalMiddleware = require('../middleware/authFinalMiddleware')
const householdsController = require('../controllers/households.controller')

const router = express.Router()
const familyRouter = express.Router({ mergeParams: true })
const membersRouter = express.Router({ mergeParams: true })
const roleRequestsRouter = express.Router({ mergeParams: true })

const legacyInvitationFlowDisabled = (req, res) =>
  res.status(410).json({
    error: 'legacy_invitation_flow_disabled',
    message: 'Legacy invitations flow is disabled. Use invite links flow.',
  })

router.post('/', authFinalMiddleware, householdsController.createHousehold)
router.post(
  '/:household_id/members/:membership_id/finalize',
  authFinalMiddleware,
  householdsController.finalizeHouseholdMember,
)
router.post('/:household_id/set-active', authFinalMiddleware, householdsController.setActiveHousehold)
router.post('/:household_id/invitations', legacyInvitationFlowDisabled)

familyRouter.get('/', authFinalMiddleware, householdsController.getFamilyHub)

membersRouter.get('/', authFinalMiddleware, householdsController.getMembersList)
membersRouter.get('/:membership_id', authFinalMiddleware, householdsController.getMemberDetail)
membersRouter.patch(
  '/:membership_id/role',
  authFinalMiddleware,
  householdsController.updateMemberRole,
)

roleRequestsRouter.get('/', authFinalMiddleware, householdsController.listRoleRequests)
roleRequestsRouter.post('/', authFinalMiddleware, householdsController.createRoleRequest)
roleRequestsRouter.post(
  '/:request_id/approve',
  authFinalMiddleware,
  householdsController.approveRoleRequest,
)
roleRequestsRouter.post(
  '/:request_id/reject',
  authFinalMiddleware,
  householdsController.rejectRoleRequest,
)
roleRequestsRouter.post(
  '/:request_id/cancel',
  authFinalMiddleware,
  householdsController.cancelRoleRequest,
)

router.use('/:household_id/family', familyRouter)
router.use('/:household_id/members', membersRouter)
router.use('/:household_id/role-requests', roleRequestsRouter)

module.exports = router
