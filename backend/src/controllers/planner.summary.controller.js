'use strict'

/**
 * Planner V1 — M8 Home Summary controller.
 *
 * Read-only endpoint. Does NOT require `X-Mutation-Id`, `Idempotency-Key`
 * or `If-Match`. Uses the canonical HomePlus error envelope for global
 * failures. Emits planner telemetry events (`planner_summary_loaded`,
 * `planner_summary_partial` when sections failed, `planner_summary_failed`
 * on global failure) with only allowlisted technical properties — no titles,
 * no ids, no household/person payloads.
 */

const { getPlannerContext } = require('../services/planner.context.service')
const summaryService = require('../services/planner.summary.service')
const { sendApiError } = require('../lib/httpErrors')
const {
  assertCapability,
  resolveCapabilities,
} = require('../lib/plannerCapabilities')
const { telemetry } = require('../config/telemetry')

const countBucket = (value) => {
  if (value === 0) return '0'
  if (value <= 3) return '1-3'
  if (value <= 10) return '4-10'
  return '11+'
}

const latencyBucket = (ms) => {
  if (ms < 100) return '<100ms'
  if (ms < 300) return '100-300ms'
  if (ms < 1000) return '300ms-1s'
  return '>1s'
}

const getSummary = async (req, res) => {
  const startedAt = Date.now()
  const requestId = req.requestId ?? null

  try {
    const context = await getPlannerContext(req)
    const capabilities = resolveCapabilities({
      role: context.role,
      membershipStatus: context.membership?.status ?? 'active',
      household: context.household,
    })

    // The summary endpoint is protected by the planner.view capability. We
    // deny-safe here so a member with no planner access still receives a
    // 403 envelope instead of a partial summary.
    assertCapability(capabilities, 'planner.view')

    const payload = await summaryService.getSummary(context, { requestId })

    const elapsedMs = Date.now() - startedAt
    const hasPartial = Array.isArray(payload.partial_errors) && payload.partial_errors.length > 0

    if (hasPartial) {
      await telemetry.track(
        'planner_summary_partial',
        {
          result: 'partial',
          failed_sections: payload.partial_errors.map((entry) => entry.section).join(','),
          task_count_bucket: countBucket(Array.isArray(payload.tasks) ? payload.tasks.length : 0),
          event_count_bucket: countBucket(Array.isArray(payload.events) ? payload.events.length : 0),
          goal_count_bucket: countBucket(payload.goal ? 1 : 0),
          latency_bucket: latencyBucket(elapsedMs),
        },
        { requestId },
      ).catch(() => {})
    } else {
      await telemetry.track(
        'planner_summary_loaded',
        {
          result: 'success',
          has_partial_errors: false,
          task_count_bucket: countBucket(Array.isArray(payload.tasks) ? payload.tasks.length : 0),
          event_count_bucket: countBucket(Array.isArray(payload.events) ? payload.events.length : 0),
          goal_count_bucket: countBucket(payload.goal ? 1 : 0),
          latency_bucket: latencyBucket(elapsedMs),
        },
        { requestId },
      ).catch(() => {})
    }

    return res.status(200).json(payload)
  } catch (error) {
    const elapsedMs = Date.now() - startedAt
    await telemetry.track(
      'planner_summary_failed',
      {
        result: 'failure',
        error_code: error?.code ?? 'internal_error',
        latency_bucket: latencyBucket(elapsedMs),
      },
      { requestId },
    ).catch(() => {})

    return sendApiError(res, error, req)
  }
}

module.exports = {
  getSummary,
}
