'use strict'

const { supabaseAdmin } = require('../config/supabase')

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/

const log = (event, details = {}) => {
  if (process.env.NODE_ENV !== 'production') console.log(`[Push] ${event}`, details)
}

const assertAdmin = () => {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY es necesaria para notificaciones push.')
  return supabaseAdmin
}

const isExpoPushToken = (value) => typeof value === 'string' && EXPO_TOKEN_PATTERN.test(value)

const registerDevice = async ({ authUserId, expoPushToken, platform }) => {
  if (!isExpoPushToken(expoPushToken)) {
    const error = new Error('El token de notificaciones no es válido.')
    error.statusCode = 422
    throw error
  }
  const admin = assertAdmin()
  const { error } = await admin.from('push_devices').upsert({
    auth_user_id: authUserId,
    expo_push_token: expoPushToken,
    platform: platform === 'ios' ? 'ios' : 'android',
    enabled: true,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' })
  if (error) throw error
  log('token.registered', { platform })
}

const unregisterDevice = async ({ authUserId, expoPushToken }) => {
  if (!isExpoPushToken(expoPushToken)) return
  const admin = assertAdmin()
  const { error } = await admin
    .from('push_devices')
    .delete()
    .eq('auth_user_id', authUserId)
    .eq('expo_push_token', expoPushToken)
  if (error) throw error
}

const plannerEnabledForUser = async (authUserId) => {
  const admin = assertAdmin()
  const { data, error } = await admin.auth.admin.getUserById(authUserId)
  if (error || !data.user) return false
  return data.user.user_metadata?.notification_prefs?.tareas !== false
}

const sendExpoMessages = async (messages) => {
  if (!messages.length) return { sent: 0 }
  log('send.started', { count: messages.length })
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`Expo Push respondió ${response.status}.`)

  const invalidTokens = messages.filter((_message, index) => body?.data?.[index]?.details?.error === 'DeviceNotRegistered')
  if (invalidTokens.length) {
    const admin = assertAdmin()
    await admin.from('push_devices').delete().in('expo_push_token', invalidTokens.map((message) => message.to))
  }
  log('send.success', { sent: messages.length, invalid: invalidTokens.length })
  return { sent: messages.length }
}

const notifyPlannerAssignment = async ({ context, taskId, taskTitle, assigneeMembershipIds }) => {
  const recipientMembershipIds = [...new Set(assigneeMembershipIds)].filter((id) => id && id !== context.membershipId)
  if (!recipientMembershipIds.length) return { sent: 0 }

  const admin = assertAdmin()
  const { data: memberships, error: membershipError } = await admin
    .from('household_members')
    .select('id, people!inner(auth_user_id)')
    .eq('household_id', context.householdId)
    .eq('status', 'active')
    .in('id', recipientMembershipIds)
  if (membershipError) throw membershipError

  const recipientUserIds = [...new Set((memberships ?? [])
    .map((membership) => {
      const person = Array.isArray(membership.people) ? membership.people[0] : membership.people
      return person?.auth_user_id
    })
    .filter((id) => typeof id === 'string' && id !== context.accountId))]
  if (!recipientUserIds.length) return { sent: 0 }

  const enabledUserIds = []
  for (const authUserId of recipientUserIds) {
    if (await plannerEnabledForUser(authUserId)) enabledUserIds.push(authUserId)
  }
  if (!enabledUserIds.length) return { sent: 0 }

  const { data: devices, error: devicesError } = await admin
    .from('push_devices')
    .select('expo_push_token')
    .eq('enabled', true)
    .in('auth_user_id', enabledUserIds)
  if (devicesError) throw devicesError

  log('planner.assignment', { taskId, recipients: enabledUserIds.length })
  return sendExpoMessages((devices ?? []).filter((device) => isExpoPushToken(device.expo_push_token)).map((device) => ({
    to: device.expo_push_token,
    sound: 'default',
    title: `${context.person.display_name ?? 'Alguien'} te asignó una tarea`,
    body: taskTitle,
    data: { kind: 'task_detail', entityId: taskId },
  })))
}

module.exports = { registerDevice, unregisterDevice, notifyPlannerAssignment, isExpoPushToken }
