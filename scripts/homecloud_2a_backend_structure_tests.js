#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2A — Backend structure/contract tests.
 *
 * Validates the intake service, controller, routes, migration and boundaries are
 * wired correctly and match the frozen Product Truth (no structural reads).
 */

const path = require('node:path');
const fs = require('node:fs');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

console.log('\n=== HC-2A BACKEND STRUCTURE TESTS ===\n');

const svc = read('backend/src/services/homecloudIntakeService.js');
const ctrl = read('backend/src/controllers/homecloud.intake.controller.js');
const routes = read('backend/src/routes/homecloud.js');
const validation = read('backend/src/lib/homecloudIntakeValidation.js');
const migration = read('supabase/migrations/20260910000005_homecloud_intake_engine_foundation_v1_1.sql');

// --- register ---
record(svc.includes('function registerHomeCloudContent'), 'service exposes registerHomeCloudContent');
record(svc.includes('requireHomeCloudContribute'), 'register requires homecloud.contribute');
record(svc.includes('getHomeCloudContext'), 'register resolves canonical context server-side');
record(svc.includes("lifecycle: 'staging'"), 'register inserts lifecycle=staging');
record(svc.includes('uploaded_at: null'), 'register inserts uploaded_at=NULL');
record(svc.includes('getHomeCloudOriginalPath'), 'register uses canonical original path');

// --- write authorization ---
record(svc.includes('authorizeHomeCloudOriginalUpload'), 'service exposes upload authorization');
record(svc.includes('createSignedUploadUrl'), 'upload authorization uses signed upload URL (single-object)');
record(svc.includes('.eq(\'lifecycle\', \'staging\')') || svc.includes("lifecycle !== 'staging'"), 'upload authorization restricted to staging');
record(svc.includes('content.household_id !== context.householdId'), 'upload authorization enforces household isolation');

// --- verify ---
record(svc.includes('verifyHomeCloudOriginal'), 'service exposes verify');
record(svc.includes('.list('), 'verify stats object via storage listing (existence)');

// --- finalize ---
record(svc.includes('finalizeHomeCloudContent'), 'service exposes finalize');
record(svc.includes('verifyHomeCloudOriginal'), 'finalize verifies original before activating');
record(svc.includes("lifecycle: 'active'"), 'finalize sets lifecycle=active');
record(svc.includes('uploaded_at: now'), 'finalize sets uploaded_at at finalize time');
record(svc.includes(".eq('lifecycle', 'staging')"), 'finalize guarded UPDATE prevents double-finalize');

// --- no client household trust ---
record(!svc.includes('body.household_id') && !svc.includes('body.householdId'), 'register never trusts client household_id');

// --- no broad storage write policy ---
record(!migration.includes('to authenticated') && !migration.includes('to anon') && !migration.includes('create policy'), 'migration does not grant broad client storage write policies');

// --- migration: idempotency ---
record(migration.includes('intake_request_id'), 'migration adds intake_request_id column');
record(migration.includes('unique index'), 'migration adds unique index for idempotency');
record(migration.includes('where intake_request_id is not null'), 'unique index is partial (nullable ids allowed)');
record(migration.includes('household_id, intake_request_id'), 'idempotency scoped per-Household');

// --- routes ---
record(routes.includes("router.post('/register'"), 'route for register');
record(routes.includes("router.post('/content/:contentId/upload'"), 'route for upload authorization');
record(routes.includes("router.post('/content/:contentId/verify'"), 'route for verify');
record(routes.includes("router.post('/content/:contentId/finalize'"), 'route for finalize');

// --- controller ---
record(ctrl.includes('registerContentController'), 'controller exposes register');
record(ctrl.includes('authorizeUploadController'), 'controller exposes upload auth');
record(ctrl.includes('verifyContentController'), 'controller exposes verify');
record(ctrl.includes('finalizeContentController'), 'controller exposes finalize');

// --- validation boundary ---
record(validation.includes("FORBIDDEN_REGISTER_FIELDS"), 'validation defines forbidden client fields');
record(validation.includes('homecloud_memory_mime_invalid') || svc.includes('homecloud_memory_mime_invalid'), 'memory MIME rule enforced');
record(validation.includes('isMemoryMediaMime'), 'validation has memory media MIME helper');

// --- error model (no storage internal leaks) ---
record(!svc.includes('service_role_key') && !svc.includes('serviceRoleKey'), 'service never references service role key');
record(ctrl.includes('sendApiError'), 'controller uses canonical sendApiError envelope');

console.log(`\nHC2A_BACKEND_STRUCTURE_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('HC2A_BACKEND_STRUCTURE_TESTS=FAIL'); }
else { console.log('HC2A_BACKEND_STRUCTURE_TESTS=PASS'); }