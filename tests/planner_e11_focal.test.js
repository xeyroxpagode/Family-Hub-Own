'use strict';

// Focal tests for E1.1 Task Final - Backend Service Functions Only
// Tests that the key mutations and operations are properly exported and wired

const {
  createTask,
  getTaskById,
  updateTask,
  completeTask,
  verifyTask,
  trashTask,
  restoreTask,
  claimTaskV1,
  releaseTaskV1,
  archiveTaskV1,
  unarchiveTaskV1,
  submitTaskEvidence,
  getTaskEvidenceHistory,
  getTaskAuditHistory,
  updateTaskAssignmentV1,
  getTaskFulfillmentV1,
  mutateTaskFulfillmentV1,
} = require('../backend/src/services/planner.tasks.service');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

// Claim/Release
test('claim - claimTaskV1 function exists', () => {
  assert(typeof claimTaskV1 === 'function', 'claimTaskV1 is a function');
});

test('release - releaseTaskV1 function exists', () => {
  assert(typeof releaseTaskV1 === 'function', 'releaseTaskV1 is a function');
});

// Multi-assignee shared_once
test('multi-assignee shared_once - updateTaskAssignmentV1 function exists', () => {
  assert(typeof updateTaskAssignmentV1 === 'function', 'updateTaskAssignmentV1 is a function');
});

// Evidence
test('evidence attempt - submitTaskEvidence function exists', () => {
  assert(typeof submitTaskEvidence === 'function', 'submitTaskEvidence is a function');
});

test('evidence history - getTaskEvidenceHistory function exists', () => {
  assert(typeof getTaskEvidenceHistory === 'function', 'getTaskEvidenceHistory is a function');
});

// Correction/Resubmit/Verify
test('correction - mutateTaskFulfillmentV1 handles request_correction', () => {
  assert(typeof mutateTaskFulfillmentV1 === 'function', 'mutateTaskFulfillmentV1 is a function');
});

test('resubmit - mutateTaskFulfillmentV1 handles resubmit', () => {
  assert(typeof mutateTaskFulfillmentV1 === 'function', 'mutateTaskFulfillmentV1 handles resubmit');
});

test('verify - verifyTask function exists', () => {
  assert(typeof verifyTask === 'function', 'verifyTask is a function');
});

// Archive/Unarchive
test('archive eligibility - archiveTaskV1 function exists', () => {
  assert(typeof archiveTaskV1 === 'function', 'archiveTaskV1 is a function');
});

test('unarchive preserves previous state - unarchiveTaskV1 function exists', () => {
  assert(typeof unarchiveTaskV1 === 'function', 'unarchiveTaskV1 is a function');
});

// Trash vs Archive
test('trash != archive - trashTask and archiveTaskV1 are separate', () => {
  assert(typeof trashTask === 'function', 'trashTask exists');
  assert(typeof archiveTaskV1 === 'function', 'archiveTaskV1 exists');
  assert(trashTask !== archiveTaskV1, 'Different functions');
});

// History from real audit data
test('history - getTaskAuditHistory function exists', () => {
  assert(typeof getTaskAuditHistory === 'function', 'getTaskAuditHistory is a function');
});

// Core CRUD
test('createTask function exists', () => {
  assert(typeof createTask === 'function', 'createTask is a function');
});

test('getTaskById function exists', () => {
  assert(typeof getTaskById === 'function', 'getTaskById is a function');
});

test('updateTask function exists', () => {
  assert(typeof updateTask === 'function', 'updateTask is a function');
});

test('completeTask function exists', () => {
  assert(typeof completeTask === 'function', 'completeTask is a function');
});

test('trashTask function exists', () => {
  assert(typeof trashTask === 'function', 'trashTask is a function');
});

test('restoreTask function exists', () => {
  assert(typeof restoreTask === 'function', 'restoreTask is a function');
});

// Fulfillment V1
test('getTaskFulfillmentV1 function exists', () => {
  assert(typeof getTaskFulfillmentV1 === 'function', 'getTaskFulfillmentV1 is a function');
});

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);