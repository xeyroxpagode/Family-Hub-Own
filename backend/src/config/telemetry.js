'use strict';

const {
  createConsoleTelemetrySink,
  createNoopTelemetrySink,
  createTelemetry,
  createTelemetryCatalog,
} = require('../lib/telemetry');
const { CORE_TELEMETRY_EVENTS } = require('../constants/coreTelemetryEvents');
const { PLANNER_TELEMETRY_EVENTS } = require('../constants/plannerTelemetryEvents');

const telemetryCatalog = createTelemetryCatalog();
telemetryCatalog.register(CORE_TELEMETRY_EVENTS);
telemetryCatalog.register(PLANNER_TELEMETRY_EVENTS);

const telemetrySink = process.env.HOMEPLUS_TELEMETRY_SINK === 'console'
  ? createConsoleTelemetrySink()
  : createNoopTelemetrySink();
const telemetry = createTelemetry({ catalog: telemetryCatalog, sink: telemetrySink });

module.exports = { telemetry, telemetryCatalog };
