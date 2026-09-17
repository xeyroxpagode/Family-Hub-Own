'use strict';

/**
 * Temporary G0.3.1 compatibility wrapper.
 *
 * Remove after all external imports have migrated to mutationContracts for
 * header parsing or plannerIdempotencyAdapter for Planner persistence.
 */
module.exports = require('./plannerIdempotencyAdapter');
