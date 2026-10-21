'use strict'

// Idempotent worker entrypoint. Schedule daily; active/current submissions are
// excluded by the database claim function regardless of upload age.
require('dotenv').config()
const { purgeExpiredEvidence } = require('../src/services/planner.task-evidence.service')

purgeExpiredEvidence(Number(process.env.PLANNER_EVIDENCE_PURGE_BATCH || 100))
  .then((result) => { process.stdout.write(`${JSON.stringify(result)}\n`) })
  .catch((error) => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1 })
