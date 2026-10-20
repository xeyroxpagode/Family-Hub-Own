'use strict';

/**
 * HomePlus Homi Tool Layer — Planner READ handlers (T07-S4).
 *
 * These are the executable adapters of the eight production Planner READ tool
 * definitions of T07-S3. They are NOT part of the tool registry: the registry
 * stays metadata only and the binding map of `toolBindings.js` owns the
 * executable side.
 *
 * Every handler:
 *   - reuses the current Planner service authority of the matching read;
 *   - mirrors the authorization of the current Planner controller of that
 *     read, so the Homi surface never grants more than the HomePlus surface;
 *   - adapts the tool arguments to the exact parameter shape of that service;
 *   - returns the service payload unchanged.
 *
 * A handler NEVER:
 *   - performs an internal HTTP call to the Planner routes;
 *   - touches the data layer directly;
 *   - accepts an actor, household, membership or role argument;
 *   - mutates anything.
 *
 * The business service modules are resolved lazily, at execution time, so the
 * Homi module graph never forces a runtime credential configuration at import
 * time.
 */

const { assertUuid } = require('../../lib/httpErrors');
const { resolveCapabilities, assertCapability } = require('../../lib/plannerCapabilities');

/**
 * The canonical "task not found" outcome of the current Planner task read.
 *
 * The current Planner task route guards the identifier with the same status,
 * message and code, so a malformed identifier is indistinguishable from an
 * absent one.
 */
const TASK_NOT_FOUND = Object.freeze({
  status: 404,
  message: 'Tarea no encontrada.',
  code: 'task_not_found',
});

/**
 * Resolve the business service modules of this slice.
 *
 * The require calls are lazy on purpose: the Homi module graph must be
 * importable without any runtime configuration, a tool must only load the
 * service it actually uses, and a test may inject its own doubles through
 * `createPlannerReadHandlers`.
 *
 * @returns {object} the business service modules, resolved on access
 */
function defaultPlannerServices() {
  return {
    get tasks() {
      return require('../../services/planner.tasks.service');
    },
    get events() {
      return require('../../services/planner.events.service');
    },
    get calendar() {
      return require('../../services/planner.calendar.service');
    },
    get summary() {
      return require('../../services/planner.summary.service');
    },
    get attention() {
      return require('../../services/planner.attention.service');
    },
    get search() {
      return require('../../services/planner.search.service');
    },
  };
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/**
 * Build the query object of a Planner read.
 *
 * Only the keys that the caller actually supplied are copied. The current
 * Planner reads distinguish an absent filter from an explicit one, so an
 * absent key must stay absent.
 *
 * @param {object} args the validated tool arguments
 * @param {string[]} fields the accepted argument names
 * @returns {object} the service query object
 */
function pickDefined(args, fields) {
  const query = {};

  for (const field of fields) {
    if (hasOwn(args, field) && args[field] !== undefined) {
      query[field] = args[field];
    }
  }

  return query;
}

/**
 * Resolve the capability projection of the canonical HomePlus context.
 *
 * Mirrors the projection the current Planner controllers build from the
 * canonical context.
 *
 * @param {object} context the canonical HomePlus context
 * @returns {object} the capability projection
 */
function buildCapabilities(context) {
  return resolveCapabilities({
    role: context?.membership?.role,
    membershipStatus: context?.membership?.status,
    household: context?.household,
  });
}

/**
 * Build the executable Planner READ handlers.
 *
 * @param {object} [services] the business service modules (dependency
 *   injection). When omitted the production modules are resolved lazily.
 * @returns {object} a frozen map of tool id to handler
 */
function createPlannerReadHandlers(services) {
  const injected = services && typeof services === 'object' ? services : null;
  const resolveServices = () => (injected ?? defaultPlannerServices());

  return Object.freeze({
    'planner.tasks.list': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().tasks;

      // The canonical task listing read reads the cancelled, archived and
      // ownership selectors from its snake case query object. The Homi tool
      // exposes the canonical filters only: the ownership selector and the
      // plan relation are never forwarded.
      const query = pickDefined(args, ['status', 'from', 'to', 'limit']);
      if (hasOwn(args, 'includeCancelled')) {
        query.include_cancelled = args.includeCancelled;
      }
      if (hasOwn(args, 'includeArchived')) {
        query.include_archived = args.includeArchived;
      }

      return service.listTasks(context, query);
    },

    'planner.tasks.get': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().tasks;

      // The canonical task route guards the identifier before it reaches the
      // data layer. The same guard is applied here so a malformed identifier
      // is indistinguishable from an absent task.
      assertUuid(args.taskId, TASK_NOT_FOUND);

      return service.getTaskById(context, args.taskId);
    },

    'planner.events.list': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().events;

      const query = pickDefined(args, ['from', 'to', 'status']);
      if (hasOwn(args, 'includeCancelled')) {
        query.include_cancelled = args.includeCancelled;
      }
      if (hasOwn(args, 'includeRecurring')) {
        query.include_recurring = args.includeRecurring;
      }

      return service.listEvents(context, query);
    },

    'planner.events.get': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().events;

      return service.getEventById(context, args.eventId);
    },

    'planner.calendar.get': async (context, args) => {
      // The current canonical calendar read does not assert a capability of
      // its own. The Homi adapter inherits that authority as it is instead
      // of introducing a divergent authorization rule.
      const service = resolveServices().calendar;

      const query = pickDefined(args, ['view', 'date']);

      return service.getCalendar(context, query);
    },

    'planner.summary.get': async (context, args, execution) => {
      const capabilities = resolveCapabilities({
        role: context?.role,
        membershipStatus: context?.membership?.status ?? 'active',
        household: context?.household,
      });
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().summary;

      return service.getSummary(context, { requestId: execution?.requestId ?? null });
    },

    'planner.attention.get': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');

      const service = resolveServices().attention;

      const options = pickDefined(args, ['limit']);

      return service.listAttention(context, options);
    },

    'planner.search.query': async (context, args) => {
      const capabilities = buildCapabilities(context);
      assertCapability(capabilities, 'planner.view');
      assertCapability(capabilities, 'planner.search');

      const service = resolveServices().search;

      // The current canonical search transport reads the search term from the
      // `q` query parameter (see planner.search.controller.js). The tool
      // field `query` is mapped explicitly onto that transport field, and the
      // transport field is the one handed to the business service.
      const transport = { q: args.query };

      // The internal package selector of the search read is not exposed: the
      // service resolves its own default package.
      const options = { query: transport.q };
      if (hasOwn(args, 'limit')) {
        options.limit = args.limit;
      }

      return service.searchActive(context, options);
    },
  });
}

module.exports = {
  TASK_NOT_FOUND,
  createPlannerReadHandlers,
  defaultPlannerServices,
};
