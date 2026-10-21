#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'delete-cap-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'delete-cap-service';

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../backend/src/lib/homecloudCapabilities');
const lifecycleSource = read('backend/src/services/homecloudLifecycleService.js');
const routesSource = read('backend/src/routes/homecloud.js');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('\n=== HOMECLOUD DELETE CAPABILITY ENFORCEMENT TESTS ===\n');

for (const [role, expected] of Object.entries({
  coordinator: true,
  adult: true,
  adolescent: false,
  child: false,
  senior: false,
  guest: false,
})) {
  const caps = resolveHomeCloudCapabilities({ role, membershipStatus: 'active', household: { config: {} } });
  record(caps['homecloud.delete'] === expected, `${role} delete capability = ${expected}`);
  try {
    assertHomeCloudCapability(caps, 'homecloud.delete');
    record(expected === true, `${role} purge gate ${expected ? 'allows' : 'denies'}`);
  } catch (error) {
    record(
      expected === false && error.statusCode === 403 && error.code === 'homecloud_forbidden',
      `${role} purge gate denies with homecloud_forbidden`,
    );
  }
}

for (const [role, expected] of Object.entries({
  coordinator: true,
  adult: true,
  adolescent: true,
  child: false,
  senior: true,
  guest: false,
})) {
  const caps = resolveHomeCloudCapabilities({ role, membershipStatus: 'active', household: { config: {} } });
  record(caps['homecloud.contribute'] === expected, `${role} contribute capability = ${expected}`);
}

record(
  /async function purgeMemory[\s\S]*contextWithCapability\(req, 'homecloud\.delete'\)/.test(lifecycleSource),
  'single-memory purge is gated server-side by homecloud.delete',
);
record(
  /async function purgeAllTrashedMemories[\s\S]*contextWithCapability\(req, 'homecloud\.delete'\)/.test(lifecycleSource),
  'purge-all is gated server-side by homecloud.delete',
);
record(
  /async function trashMemory[\s\S]*contextWithCapability\(req, 'homecloud\.contribute'\)/.test(lifecycleSource)
    && /async function restoreMemory[\s\S]*contextWithCapability\(req, 'homecloud\.contribute'\)/.test(lifecycleSource),
  'trash and restore are gated server-side by homecloud.contribute',
);
record(
  !/adult|coordinator|senior|adolescent|child|guest/.test(lifecycleSource.replace(/\/\*[\s\S]*?\*\//g, '')),
  'lifecycle service does not infer permissions from role names',
);
record(
  routesSource.includes("router.delete('/memories/:contentId', lifecycleController.purgeMemoryController)")
    && routesSource.includes("router.post('/memories/purge-all', lifecycleController.purgeAllMemoriesController)"),
  'destructive routes are routed only through lifecycle controllers',
);

console.log(`\nHOMECLOUD_DELETE_CAPABILITY_ENFORCEMENT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HOMECLOUD_DELETE_CAPABILITY_ENFORCEMENT_TESTS=FAIL');
} else {
  console.log('HOMECLOUD_DELETE_CAPABILITY_ENFORCEMENT_TESTS=PASS');
}
