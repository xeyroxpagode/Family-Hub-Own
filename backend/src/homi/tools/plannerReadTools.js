'use strict';

/**
 * HomePlus Homi Tool Layer — Planner read tool catalog (T07-S3).
 *
 * Pure metadata module. It declares the canonical READ-only Planner tool
 * definitions derived from the current HomePlus Planner read surface.
 *
 * It performs no I/O: it imports no route, no controller, no business
 * operation module, no HTTP client, no database driver and no transport.
 * It also declares no execution, binding or dispatch entry point. Tool
 * execution belongs to a later slice.
 *
 * Every tool acts on the authenticated active household. The effective
 * identity is supplied by the authoritative context boundary, so no tool
 * argument may carry an actor, household, membership, role or credential
 * field.
 *
 * Backing current HomePlus read operations (route → controller → operation):
 *   planner.tasks.list     → Planner task listing read
 *   planner.tasks.get      → Planner task read by identifier
 *   planner.events.list    → Planner event listing read
 *   planner.events.get     → Planner event read by identifier
 *   planner.calendar.get   → Planner calendar read
 *   planner.summary.get    → Planner home summary read
 *   planner.attention.get  → Planner attention read
 *   planner.search.query   → Planner global search read
 */

const { HOMI_TOOL_CONTRACT_VERSION } = require('../toolContract');

const TOOL_VERSION = '1.0.0';
const READ_RISK_FLAGS = Object.freeze(['READ_ONLY']);

/**
 * Canonical Planner task status set, as defined by the current backend
 * Planner constants.
 */
const TASK_STATUSES = Object.freeze([
  'pending',
  'awaiting_verification',
  'verified',
  'completed',
  'cancelled',
]);

/**
 * Canonical Planner event status set, as defined by the current backend
 * Planner constants.
 */
const EVENT_STATUSES = Object.freeze(['scheduled', 'cancelled']);

/**
 * Canonical Planner calendar views supported by the current calendar read.
 */
const CALENDAR_VIEWS = Object.freeze(['day', 'week', 'month']);

/**
 * Calendar view values, kept as a plain array because JSON Schema `enum`
 * must contain JSON values.
 */
const CALENDAR_VIEW_ENUM = Object.freeze(Array.from(CALENDAR_VIEWS));

const TASK_STATUS_ENUM = Object.freeze(Array.from(TASK_STATUSES));
const EVENT_STATUS_ENUM = Object.freeze(Array.from(EVENT_STATUSES));

/** Date-only (`YYYY-MM-DD`) shape used by the Planner due-date filters. */
const DATE_ONLY_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

/**
 * Stable Planner task DTO projection.
 *
 * The current task listing/read returns the canonical task row enriched
 * with its members. Only the stable public fields are described here; the
 * DTO keeps additional fields beyond this projection.
 */
const TASK_DTO_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    status: { type: 'string' },
    priority: { type: 'string' },
    template_key: { type: ['string', 'null'] },
    category: { type: ['string', 'null'] },
    due_date: { type: ['string', 'null'] },
    due_time: { type: ['string', 'null'] },
    requires_verification: { type: 'boolean' },
    assigned_to_member_id: { type: ['string', 'null'] },
    created_by_member_id: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    version: { type: 'integer' },
    archived_at: { type: ['string', 'null'] },
  },
  required: ['id', 'title', 'status'],
});

/**
 * Stable Planner event DTO projection.
 */
const EVENT_DTO_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    status: { type: 'string' },
    starts_at: { type: 'string' },
    ends_at: { type: ['string', 'null'] },
    all_day: { type: 'boolean' },
    location_name: { type: ['string', 'null'] },
    recurrence: { type: 'string' },
    created_by_member_id: { type: ['string', 'null'] },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    version: { type: 'integer' },
  },
  required: ['id', 'title', 'starts_at'],
});

/**
 * Canonical Planner calendar item projection.
 */
const CALENDAR_ITEM_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: true,
  properties: {
    type: { type: 'string' },
    id: { type: 'string' },
    occurrence_id: { type: 'string' },
    title: { type: 'string' },
    description: { type: ['string', 'null'] },
    starts_at: { type: 'string' },
    ends_at: { type: ['string', 'null'] },
    all_day: { type: 'boolean' },
    location_name: { type: ['string', 'null'] },
    recurrence: { type: 'string' },
    is_recurring_occurrence: { type: 'boolean' },
    is_override: { type: 'boolean' },
    status: { type: 'string' },
  },
  required: ['id', 'title', 'starts_at'],
});

/**
 * Canonical Planner task listing read.
 *
 * Backed by the current task listing read, whose canonical filters are the
 * task status, the cancelled/archived lifecycle switches, the due-date
 * window (`from`/`to`, date only) and the result limit.
 *
 * The ownership selector (`assigned_to_member_id`) and the plan relation
 * selector (`goal_id`) are deliberately not exposed: ownership is an
 * authorization concern and the plan relation is out of this catalog.
 */
const PLANNER_TASKS_LIST = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.tasks.list',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'List Planner tasks visible to the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: {
        type: 'string',
        enum: TASK_STATUS_ENUM,
        description: 'Restrict the list to a single canonical task status.',
      },
      includeCancelled: {
        type: 'boolean',
        description: 'Include cancelled tasks. Defaults to false.',
      },
      includeArchived: {
        type: 'boolean',
        description: 'Include archived tasks. Defaults to false.',
      },
      from: {
        type: 'string',
        pattern: DATE_ONLY_PATTERN,
        description: 'Earliest due date (YYYY-MM-DD) included in the result.',
      },
      to: {
        type: 'string',
        pattern: DATE_ONLY_PATTERN,
        description: 'Latest due date (YYYY-MM-DD) included in the result.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of tasks to return. Defaults to 100.',
      },
    },
    required: [],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      tasks: {
        type: 'array',
        items: TASK_DTO_SCHEMA,
      },
    },
    required: ['tasks'],
  },
});

/**
 * Canonical Planner task read by identifier.
 */
const PLANNER_TASKS_GET = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.tasks.get',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Get one Planner task visible to the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      taskId: {
        type: 'string',
        minLength: 1,
        description: 'Canonical identifier of the Planner task to read.',
      },
    },
    required: ['taskId'],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      task: TASK_DTO_SCHEMA,
    },
    required: ['task'],
  },
});

/**
 * Canonical Planner event listing read.
 *
 * Backed by the current event listing read, whose canonical filters are the
 * visibility window (`from`/`to`, ISO-8601 instants), the event status, the
 * cancelled and recurring switches. The current read applies a default
 * window of the next 30 days when no window is given, so an empty input is
 * valid and returns the visible recent window.
 */
const PLANNER_EVENTS_LIST = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.events.list',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'List Planner events visible to the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      from: {
        type: 'string',
        minLength: 1,
        description: 'ISO-8601 lower bound of the visibility window. Defaults to now.',
      },
      to: {
        type: 'string',
        minLength: 1,
        description: 'ISO-8601 upper bound of the visibility window. Defaults to 30 days from now.',
      },
      status: {
        type: 'string',
        enum: EVENT_STATUS_ENUM,
        description: 'Restrict the list to a single canonical event status.',
      },
      includeCancelled: {
        type: 'boolean',
        description: 'Include cancelled events. Defaults to false.',
      },
      includeRecurring: {
        type: 'boolean',
        description: 'Include recurring events. Defaults to true.',
      },
    },
    required: [],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      events: {
        type: 'array',
        items: EVENT_DTO_SCHEMA,
      },
    },
    required: ['events'],
  },
});

/**
 * Canonical Planner event read by identifier.
 */
const PLANNER_EVENTS_GET = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.events.get',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Get one Planner event visible to the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      eventId: {
        type: 'string',
        minLength: 1,
        description: 'Canonical identifier of the Planner event to read.',
      },
    },
    required: ['eventId'],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      event: EVENT_DTO_SCHEMA,
    },
    required: ['event'],
  },
});

/**
 * Canonical Planner calendar read.
 *
 * Backed by the current calendar read, whose only query semantics are the
 * view (`day`, `week`, `month`) and the reference date (`YYYY-MM-DD`).
 * Both have current defaults, so an empty input is valid.
 */
const PLANNER_CALENDAR_GET = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.calendar.get',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Get the Planner calendar view for the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      view: {
        type: 'string',
        enum: CALENDAR_VIEW_ENUM,
        description: 'Calendar granularity: day, week or month. Defaults to day.',
      },
      date: {
        type: 'string',
        pattern: DATE_ONLY_PATTERN,
        description: 'Reference date (YYYY-MM-DD) of the calendar view. Defaults to today.',
      },
    },
    required: [],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      view: { type: 'string', enum: CALENDAR_VIEW_ENUM },
      date: { type: 'string' },
      range: {
        type: 'object',
        additionalProperties: true,
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['from', 'to'],
      },
      items: {
        type: 'array',
        items: CALENDAR_ITEM_SCHEMA,
      },
    },
    required: ['view', 'date', 'range', 'items'],
  },
});

/**
 * Canonical Planner home summary read.
 *
 * The current summary read takes no business input, so the input object is
 * an empty strict object.
 */
const PLANNER_SUMMARY_GET = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.summary.get',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Get the Planner home summary for the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
    required: [],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      household_id: { type: 'string' },
      projection_version: { type: 'string' },
      generated_at: { type: 'string' },
      counts: {
        type: 'object',
        additionalProperties: true,
        properties: {
          tasks: { type: 'integer' },
          events: { type: 'integer' },
          goals: { type: 'integer' },
        },
        required: ['tasks', 'events', 'goals'],
      },
      tasks: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
      },
      events: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
      },
      goal: { type: ['object', 'null'], additionalProperties: true },
      partial_errors: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
      },
    },
    required: ['projection_version', 'generated_at', 'counts', 'tasks', 'events', 'partial_errors'],
  },
});

/**
 * Canonical Planner attention read.
 *
 * Backed by the current attention read. The only supported read input is
 * the result limit; the aggregated payment source selectors are internal
 * to that read and are not exposed.
 */
const PLANNER_ATTENTION_GET = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.attention.get',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Get the Planner attention items pending for the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of attention items to return. Defaults to 50.',
      },
    },
    required: [],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      projectionVersion: { type: 'string' },
      context: { type: 'string' },
      generatedAt: { type: 'string' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            attentionId: { type: 'string' },
            dedupeKey: { type: 'string' },
            entityType: { type: 'string' },
            entityId: { type: 'string' },
            title: { type: 'string' },
            summary: { type: 'string' },
            reason: { type: 'string' },
            severity: { type: 'string' },
            createdAt: { type: ['string', 'null'] },
            updatedAt: { type: ['string', 'null'] },
            unresolved: { type: 'boolean' },
            priorityScore: { type: 'integer' },
          },
          required: ['attentionId', 'entityType', 'entityId', 'reason'],
        },
      },
    },
    required: ['projectionVersion', 'generatedAt', 'limit', 'total', 'items'],
  },
});

/**
 * Canonical Planner search read.
 *
 * Backed by the current search read. The tool-facing field is `query`; the
 * current transport reads the search term from the `q` query parameter, so
 * the binding layer maps `query` to that parameter.
 *
 * The search context switch is an internal package selector and is not
 * exposed.
 */
const PLANNER_SEARCH_QUERY = Object.freeze({
  contractVersion: HOMI_TOOL_CONTRACT_VERSION,
  id: 'planner.search.query',
  version: TOOL_VERSION,
  domain: 'planner',
  description: 'Search Planner content visible to the authenticated active household.',
  kind: 'READ',
  riskFlags: READ_RISK_FLAGS,
  confirmation: 'NEVER',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search term matched against the visible Planner content.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of results per entity group. Defaults to 30.',
      },
    },
    required: ['query'],
  },
  outputSchema: {
    type: 'object',
    additionalProperties: true,
    properties: {
      projectionVersion: { type: 'string' },
      context: { type: 'string' },
      query: { type: 'string' },
      generatedAt: { type: 'string' },
      limit: { type: 'integer' },
      total: { type: 'integer' },
      groups: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {
            entityType: { type: 'string' },
            label: { type: 'string' },
            results: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
          required: ['entityType', 'results'],
        },
      },
    },
    required: ['projectionVersion', 'query', 'generatedAt', 'limit', 'total', 'groups'],
  },
});

/**
 * The complete production Planner read catalog of this slice.
 *
 * Exactly eight READ-only definitions. The array is frozen so the catalog
 * cannot be mutated after import.
 */
const PLANNER_READ_TOOL_DEFINITIONS = Object.freeze([
  PLANNER_TASKS_LIST,
  PLANNER_TASKS_GET,
  PLANNER_EVENTS_LIST,
  PLANNER_EVENTS_GET,
  PLANNER_CALENDAR_GET,
  PLANNER_SUMMARY_GET,
  PLANNER_ATTENTION_GET,
  PLANNER_SEARCH_QUERY,
]);

module.exports = {
  PLANNER_READ_TOOL_DEFINITIONS,
  PLANNER_READ_TOOL_IDS: Object.freeze(PLANNER_READ_TOOL_DEFINITIONS.map((tool) => tool.id)),
  TASK_STATUSES,
  EVENT_STATUSES,
  CALENDAR_VIEWS,
};
