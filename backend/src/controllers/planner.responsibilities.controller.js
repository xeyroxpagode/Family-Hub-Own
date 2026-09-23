'use strict'

const { getPlannerContext } = require('../services/planner.context.service')
const service = require('../services/planner.responsibilities.service')
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities')
const { requireMutationId, parseRequiredExpectedVersion } = require('../lib/plannerMutationContracts')
const { requireIdempotencyKey } = require('../lib/plannerIdempotencyAdapter')
const { sendApiError } = require('../lib/httpErrors')

const capabilities = (context) => resolveCapabilities({ role: context.membership?.role, membershipStatus: context.membership?.status, household: context.household })
const run = (handler) => async (req, res) => {
  try {
    const context = await getPlannerContext(req)
    assertCapability(capabilities(context), 'planner.view')
    return await handler(req, res, context)
  } catch (error) { return sendApiError(res, error, req) }
}

const list = run(async (req, res, context) => res.status(200).json(await service.listResponsibilities(context, req.query ?? {})))
const get = run(async (req, res, context) => res.status(200).json(await service.getResponsibility(context, req.params.id)))
const create = run(async (req, res, context) => {
  assertCapability(capabilities(context), 'task.create_household')
  return res.status(201).json(await service.createResponsibility(context, req.body ?? {}))
})
const update = run(async (req, res, context) => res.status(200).json(await service.updateResponsibility(context, req.params.id, req.body ?? {}, parseRequiredExpectedVersion(req))))
const lifecycle = (value) => run(async (req, res, context) => res.status(200).json(await service.setLifecycle(context, req.params.id, value, parseRequiredExpectedVersion(req))))
const replaceCurrentAssignee = run(async (req, res, context) => {
  const mutationId = requireMutationId(req)
  const payload = await service.replaceCurrentAssignee(context, req.params.id, req.body ?? {}, parseRequiredExpectedVersion(req), {
    requestId: req.requestId, mutationId, idempotencyKey: requireIdempotencyKey(req), operation: 'planner.responsibilities.current_task.replace_assignee',
  })
  res.set('X-Mutation-Id', mutationId)
  return res.status(200).json(payload)
})

module.exports = {
  archive: lifecycle('archived'), create, get, list, pause: lifecycle('paused'),
  replaceCurrentAssignee, restore: lifecycle('active'), resume: lifecycle('active'),
  trash: lifecycle('trashed'), unarchive: lifecycle('active'), update,
}
