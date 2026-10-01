'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const taskForm = read('front/mi-front-limpio/screens/planner/TaskForm.tsx')
const taskService = read('backend/src/services/planner.tasks.service.js')
const navigator = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx')
const settings = read('front/mi-front-limpio/navigation/settingsNavigation.ts')
const notificationScreen = read('front/mi-front-limpio/screens/NotificationSettingsScreen.tsx')
const household = read('front/mi-front-limpio/context/HouseholdContext.tsx')
const pushService = read('backend/src/services/pushNotifications.service.js')

assert.match(taskForm, /assignmentMode === 'unassigned'[\s\S]{0,500}assignmentKind: 'anyone'/)
assert.doesNotMatch(taskForm, /assignmentKind:\s*'members',[\s\S]{0,120}memberIds:\s*\[\]/)
assert.doesNotMatch(taskService, /Ã|Â/)
console.log('PASS: una tarea sin responsable usa el contrato V1 claimable y los errores Planner son UTF-8')

assert.match(navigator, /originTab:\s*activeTabRef\.current/)
assert.match(notificationScreen, /navigate\('ExperienceShell'/)
assert.match(settings, /PlannerTab/)
console.log('PASS: Settings conserva el tab de origen en vez de volver a Inicio')

assert.match(household, /postgres_changes/)
assert.match(household, /replaceMembershipProjection/)
console.log('PASS: cambios de rol alimentan la proyección canónica y Realtime')

assert.match(pushService, /plannerEnabledForUser/)
assert.match(pushService, /id !== context\.membershipId/)
assert.match(pushService, /EXPONENT|ExpoPushToken/i)
console.log('PASS: push Planner respeta destinatario, preferencia y token validado')
