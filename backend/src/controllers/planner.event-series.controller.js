'use strict'
const { getPlannerContext } = require('../services/planner.context.service')
const service = require('../services/planner.event-series.service')
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities')
const { parseRequiredExpectedVersion } = require('../lib/plannerMutationContracts')
const { requireMutationId } = require('../lib/mutationContracts')
const { requireIdempotencyKey, withIdempotency, hashIdempotencyRequest } = require('../lib/plannerIdempotencyAdapter')
const { sendApiError } = require('../lib/httpErrors')
const capabilities = (context) => resolveCapabilities({ role: context.membership?.role, membershipStatus: context.membership?.status, household: context.household })
const run = (handler) => async (req,res) => { try { const context = await getPlannerContext(req); assertCapability(capabilities(context), 'planner.view'); return await handler(req,res,context) } catch (error) { return sendApiError(res,error,req) } }
async function materializeRange(req,res) {
  try {
    const context = await getPlannerContext(req)
    assertCapability(resolveCapabilities({ role: context.membership?.role, membershipStatus: context.membership?.status, household: context.household }), 'event.create_household')
    return res.status(200).json(await service.materializeRange(context, req.body ?? {}))
  } catch (error) { return sendApiError(res,error,req) }
}
const list = run(async (req,res,context) => res.status(200).json(await service.list(context, req.query ?? {})))
const get = run(async (req,res,context) => res.status(200).json(await service.get(context, req.params.id)))
// Create is a mutation, so it takes the same idempotency contract as every
// other Planner mutation. Without it, replaying the same `Idempotency-Key`
// created a SECOND Series row (frozen: one retry must never duplicate).
const create = run(async (req,res,context) => {
  assertCapability(capabilities(context), 'event.create_household')
  const mutationId = requireMutationId(req)
  const idempotencyKey = requireIdempotencyKey(req)
  res.set('X-Mutation-Id', mutationId)
  const result = await withIdempotency(
    context,
    {
      idempotencyKey,
      mutationId,
      requestId: req.requestId,
      operation: 'planner.event-series.create',
      successStatus: 201,
      req,
      // The reserve RPC requires a request hash, so a replay with the SAME key
      // but a DIFFERENT body is rejected instead of silently returning the old
      // row.
      requestHash: hashIdempotencyRequest({
        method: 'POST',
        operation: 'planner.event-series.create',
        body: req.body ?? {},
      }),
    },
    () => service.create(context, req.body ?? {}),
  )
  return res.status(result.status).json(result.body)
})
const update = run(async (req,res,context) => res.status(200).json(await service.update(context, req.params.id, req.body ?? {}, parseRequiredExpectedVersion(req))))
const lifecycle = (action) => run(async (req,res,context) => res.status(200).json(await service.lifecycle(context, req.params.id, action, parseRequiredExpectedVersion(req))))
module.exports = { create, get, lifecycle, list, materializeRange, pause: lifecycle('pause'), resume: lifecycle('resume'), restore: lifecycle('restore'), trash: lifecycle('trash'), update }
