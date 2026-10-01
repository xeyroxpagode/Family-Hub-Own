const express = require('express')

const router = express.Router()

const legacyInvitationFlowDisabled = (req, res) =>
  res.status(410).json({
    error: 'legacy_invitation_flow_disabled',
    message: 'Legacy invitations flow is disabled. Use invite links flow.',
  })

router.post('/validate', legacyInvitationFlowDisabled)

module.exports = router
