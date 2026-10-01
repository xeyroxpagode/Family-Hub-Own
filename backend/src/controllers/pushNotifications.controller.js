'use strict'

const { registerDevice, unregisterDevice } = require('../services/pushNotifications.service')

const register = async (req, res) => {
  try {
    await registerDevice({
      authUserId: req.user.id,
      expoPushToken: req.body?.expo_push_token,
      platform: req.body?.platform,
    })
    return res.status(204).send()
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message ?? 'No pudimos registrar este dispositivo.' })
  }
}

const unregister = async (req, res) => {
  try {
    await unregisterDevice({ authUserId: req.user.id, expoPushToken: req.body?.expo_push_token })
    return res.status(204).send()
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({ error: error.message ?? 'No pudimos quitar este dispositivo.' })
  }
}

module.exports = { register, unregister }
