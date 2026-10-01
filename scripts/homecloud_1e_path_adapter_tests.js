#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1E — Storage Path Adapter Contract Tests.
 *
 * Validates the canonical path contract:
 * - Exact path format: {household_id}/{content_id}/original|preview
 * - No semantic data in path
 * - UUID validation
 * - Parse round-trip
 */

const path = require('node:path');
const fs = require('node:fs');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

console.log('\n=== HC-1E STORAGE PATH ADAPTER CONTRACT TESTS ===\n');

const {
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
  getHomeCloudBucket,
  parseHomeCloudPath,
  assertValidUuid,
} = require('../backend/src/lib/homecloudStoragePaths');

const TEST_HOUSEHOLD = '123e4567-e89b-42d3-a456-426614174000';
const TEST_CONTENT = '123e4567-e89b-42d3-a456-426614174001';

// --- Contract: getHomeCloudOriginalPath ---
console.log('--- getHomeCloudOriginalPath ---');

const origPath = getHomeCloudOriginalPath(TEST_HOUSEHOLD, TEST_CONTENT);
record(
  origPath === `${TEST_HOUSEHOLD}/${TEST_CONTENT}/original`,
  'original path format is exact',
);

record(
  !origPath.includes('display_name'),
  'original path does not contain display_name',
);
record(
  !origPath.includes('filename'),
  'original path does not contain filename',
);
record(
  !origPath.includes('extension'),
  'original path does not contain extension',
);
record(
  !origPath.includes('role'),
  'original path does not contain role',
);
record(
  !origPath.includes('folder'),
  'original path does not contain folder',
);
record(
  !origPath.includes('album'),
  'original path does not contain album',
);
record(
  !origPath.includes('member'),
  'original path does not contain member',
);
record(
  !origPath.includes('lifecycle'),
  'original path does not contain lifecycle',
);

// --- Contract: getHomeCloudPreviewPath ---
console.log('\n--- getHomeCloudPreviewPath ---');

const prevPath = getHomeCloudPreviewPath(TEST_HOUSEHOLD, TEST_CONTENT);
record(
  prevPath === `${TEST_HOUSEHOLD}/${TEST_CONTENT}/preview`,
  'preview path format is exact',
);

record(
  !prevPath.includes('display_name'),
  'preview path does not contain display_name',
);
record(
  !prevPath.includes('role'),
  'preview path does not contain role',
);

// --- Contract: getHomeCloudBucket ---
console.log('\n--- getHomeCloudBucket ---');

record(
  getHomeCloudBucket('original') === 'homecloud-originals',
  'original variant maps to homecloud-originals bucket',
);
record(
  getHomeCloudBucket('preview') === 'homecloud-previews',
  'preview variant maps to homecloud-previews bucket',
);

try {
  getHomeCloudBucket('invalid');
  record(false, 'getHomeCloudBucket throws for unknown variant');
} catch (e) {
  record(true, 'getHomeCloudBucket throws for unknown variant');
}

// --- Contract: UUID validation ---
console.log('\n--- UUID validation ---');

try {
  assertValidUuid(TEST_HOUSEHOLD, 'householdId');
  record(true, 'valid UUID passes');
} catch (e) {
  record(false, 'valid UUID should pass');
}

try {
  assertValidUuid('not-a-uuid', 'test');
  record(false, 'invalid UUID should throw');
} catch (e) {
  record(true, 'invalid UUID throws');
}

try {
  assertValidUuid('', 'test');
  record(false, 'empty string should throw');
} catch (e) {
  record(true, 'empty string throws');
}

try {
  assertValidUuid(null, 'test');
  record(false, 'null should throw');
} catch (e) {
  record(true, 'null throws');
}

// --- Contract: parseHomeCloudPath ---
console.log('\n--- parseHomeCloudPath ---');

const parsedOrig = parseHomeCloudPath(`${TEST_HOUSEHOLD}/${TEST_CONTENT}/original`);
record(
  parsedOrig && parsedOrig.householdId === TEST_HOUSEHOLD && parsedOrig.contentId === TEST_CONTENT && parsedOrig.variant === 'original',
  'parseHomeCloudPath correctly parses original path',
);

const parsedPrev = parseHomeCloudPath(`${TEST_HOUSEHOLD}/${TEST_CONTENT}/preview`);
record(
  parsedPrev && parsedPrev.householdId === TEST_HOUSEHOLD && parsedPrev.contentId === TEST_CONTENT && parsedPrev.variant === 'preview',
  'parseHomeCloudPath correctly parses preview path',
);

record(
  parseHomeCloudPath('invalid') === null,
  'parseHomeCloudPath returns null for invalid format',
);
record(
  parseHomeCloudPath(`${TEST_HOUSEHOLD}/${TEST_CONTENT}/unknown`) === null,
  'parseHomeCloudPath returns null for unknown variant',
);
record(
  parseHomeCloudPath('not-a-uuid/also-not-uuid/original') === null,
  'parseHomeCloudPath returns null for invalid UUIDs',
);
record(
  parseHomeCloudPath('') === null,
  'parseHomeCloudPath returns null for empty string',
);
record(
  parseHomeCloudPath(null) === null,
  'parseHomeCloudPath returns null for null',
);

// --- Contract: Path stability across semantic changes ---
console.log('\n--- Path stability ---');

// Simulate the same content being moved/renamed/reclassified
const hh = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const cc = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

const path1 = getHomeCloudOriginalPath(hh, cc);
const path2 = getHomeCloudOriginalPath(hh, cc); // after rename
const path3 = getHomeCloudOriginalPath(hh, cc); // after folder move
const path4 = getHomeCloudOriginalPath(hh, cc); // after album add/remove
const path5 = getHomeCloudOriginalPath(hh, cc); // after FILE↔MEMORY reclassification
const path6 = getHomeCloudOriginalPath(hh, cc); // after trash/restore

record(path1 === path2 && path2 === path3 && path3 === path4 && path4 === path5 && path5 === path6,
  'Path remains stable across semantic changes (same IDs = same path)');

// Different content = different path
const diffPath = getHomeCloudOriginalPath(hh, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
record(path1 !== diffPath, 'Different contentId produces different path');

// Different household = different path
const diffHhPath = getHomeCloudOriginalPath('dddddddd-dddd-4ddd-8ddd-dddddddddddd', cc);
record(path1 !== diffHhPath, 'Different householdId produces different path');

// --- Summary ---
console.log(`\nHC1E_PATH_ADAPTER_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC1E_PATH_ADAPTER_TESTS=FAIL');
} else {
  console.log('HC1E_PATH_ADAPTER_TESTS=PASS');
}