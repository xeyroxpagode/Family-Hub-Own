#!/usr/bin/env node
'use strict';

/**
 * HOMECLOUD ST-3 PATCH / FAVORITES CONTRACT — deterministic backend+frontend
 * field guards. Behavioral where pure (validators); structural where the code
 * lives in declarations (routes, service scoping, SQL migration, DTO mapper).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'st3-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'st3-service';

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return; }
  failCount += 1; console.error(`  FAIL: ${message}`);
}

async function check(message, fn) {
  try { await fn(); record(true, message); } catch (error) { record(false, `${message} :: ${error.message}`); }
}

async function main() {
  console.log('\n=== HOMECLOUD ST-3 MEMORY PATCH + FAVORITES CONTRACT ===\n');

  const routes = require('../backend/src/routes/homecloud');
  const validator = require('../backend/src/lib/homecloudIntakeValidation');
  const memoryServiceSource = read('backend/src/services/homecloudMemoryService.js');
  const lifecycleSource = read('backend/src/services/homecloudLifecycleService.js');
  const mapperSource = read('backend/src/lib/homecloudMappers.js');
  const readServiceSource = read('backend/src/services/homecloudReadService.js');
  const migration = read('supabase/migrations/20261007000000_homecloud_memories_favorite_v1.sql');
  const p2Foundation = read('scripts/homecloud_p2_memories_foundation_tests.ts');

  const routeTable = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  await check('PATCH /memories/:contentId is registered exactly once', () => {
    assert.equal(routeTable.filter((entry) => entry === 'PATCH /memories/:contentId').length, 1);
  });

  await check('updateMemory requires homecloud.organize and never delete/contribute', () => {
    assert.match(memoryServiceSource, /assertHomeCloudCapability\(capabilities, 'homecloud\.organize'\)/);
    assert.ok(!memoryServiceSource.includes("'homecloud.delete'"));
    assert.ok(!memoryServiceSource.includes("'homecloud.contribute'"));
  });

  await check('updateMemory is household-scoped and active-memory-only', () => {
    assert.match(memoryServiceSource, /\.eq\('household_id', context\.householdId\)/);
    assert.match(memoryServiceSource, /\.eq\('role', 'memory'\)/);
    assert.match(memoryServiceSource, /\.eq\('lifecycle', 'active'\)/);
  });

  await check('updateMemory never writes lifecycle/uploaded_at/household/storage fields', () => {
    assert.ok(!/update\.lifecycle/.test(memoryServiceSource));
    assert.ok(!/update\.uploaded_at/.test(memoryServiceSource));
    assert.ok(!/update\.household/.test(memoryServiceSource));
    assert.ok(!/update\.original_storage_path/.test(memoryServiceSource));
    assert.ok(!/update\.preview_storage_path/.test(memoryServiceSource));
  });

  await check('full exact payload derives year/month and accepts all allowed fields', () => {
    const patch = validator.validateMemoryPatchPayload({
      capturePrecision: 'exact',
      capturedAt: '2024-01-12T00:00:00.000Z',
      caption: 'Cena',
      hiddenFromResurfacing: false,
      favorite: true,
    });
    assert.equal(patch.capturePrecision, 'exact');
    assert.equal(patch.capturedAt, '2024-01-12T00:00:00.000Z');
    assert.equal(patch.capturedYear, 2024);
    assert.equal(patch.capturedMonth, 1);
    assert.equal(patch.caption, 'Cena');
    assert.equal(patch.favorite, true);
  });

  await check('month_year and year partials are accepted with their components only', () => {
    const monthYear = validator.validateMemoryPatchPayload({ capturePrecision: 'month_year', capturedYear: 2023, capturedMonth: 10 });
    assert.deepEqual(monthYear, { capturedAt: null, capturedYear: 2023, capturedMonth: 10, capturePrecision: 'month_year' });
    const year = validator.validateMemoryPatchPayload({ capturePrecision: 'year', capturedYear: 1999 });
    assert.deepEqual(year, { capturedAt: null, capturedYear: 1999, capturedMonth: null, capturePrecision: 'year' });
    const unknown = validator.validateMemoryPatchPayload({ capturePrecision: 'unknown' });
    assert.deepEqual(unknown, { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' });
  });

  await check('exact WITHOUT capturedAt is rejected (partial -> exact needs an explicit day)', () => {
    assert.throws(() => validator.validateMemoryPatchPayload({ capturePrecision: 'exact' }), /exact.*requires|requiere/i);
    assert.throws(() => validator.validateMemoryPatchPayload({ capturePrecision: 'exact', capturedYear: 2024, capturedMonth: 1 }), /exact/i);
  });

  await check('no code path invents a day: exact with client-supplied components is rejected', () => {
    assert.throws(
      () => validator.validateMemoryPatchPayload({ capturePrecision: 'exact', capturedAt: '2024-02-03T00:00:00.000Z', capturedYear: 2024 }),
      /derivan/,
    );
  });

  await check('forbidden fields are rejected by the PATCH contract', () => {
    for (const field of ['lifecycle', 'uploaded_at', 'uploadedAt', 'household_id', 'householdId', 'folder_id', 'folderId', 'role', 'mimeType', 'sizeBytes', 'original_storage_path', 'preview_storage_path', 'uploadedByMemberId']) {
      try {
        validator.validateMemoryPatchPayload({ [field]: 'x' });
        assert.fail(`expected forbidden field rejection for ${field}`);
      } catch (error) {
        assert.equal(error.code, 'homecloud_forbidden_update_field', `${field} should be forbidden_update_field, got ${error.code}`);
      }
    }
  });

  await check('unknown properties are rejected', () => {
    try {
      validator.validateMemoryPatchPayload({ caption: 'x', whatever: 1 });
      assert.fail('expected unknown-field rejection');
    } catch (error) {
      assert.equal(error.code, 'homecloud_unknown_update_field');
    }
  });

  await check('favorite must be a boolean; caption must be string|null', () => {
    try { validator.validateMemoryPatchPayload({ favorite: 'yes' }); assert.fail('favorite should reject non-boolean'); } catch (error) { assert.equal(error.code, 'homecloud_invalid_favorite'); }
    try { validator.validateMemoryPatchPayload({ caption: 3 }); assert.fail('caption should reject non-string'); } catch (error) { assert.equal(error.code, 'homecloud_invalid_caption'); }
    assert.equal(validator.validateMemoryPatchPayload({ favorite: false }).favorite, false);
    assert.equal(validator.validateMemoryPatchPayload({ caption: null }).caption, null);
  });

  await check('migration is the smallest additive one: favorite boolean NOT NULL DEFAULT false', () => {
    assert.match(migration, /add column if not exists favorite boolean not null default false/);
    assert.ok(!migration.includes('is_favorite'));
    assert.ok(!migration.includes('alter column'));
    assert.ok(!migration.includes('drop'));
  });

  await check('read DTO and mapper project favorite; read model selects it', () => {
    assert.match(mapperSource, /favorite: row\.favorite === true/);
    assert.match(readServiceSource, /'favorite'/);
  });

  await check('lifecycle mutations preserve favorite (never rewrite it)', () => {
    const trashBody = lifecycleSource.match(/async function trashMemory[\s\S]*?async function restoreMemory/)?.[0] ?? '';
    const restoreBody = lifecycleSource.match(/async function restoreMemory[\s\S]*?async function purgeTrashedMemoryById/)?.[0] ?? '';
    assert.ok(!trashBody.includes('favorite'));
    assert.ok(!restoreBody.includes('favorite'));
  });

  await check('canonical contract renders is_favorite nowhere in intake validation, semantic date, picker or p2 foundation', () => {
    for (const [label, source] of [
      ['intake-validation', read('backend/src/lib/homecloudIntakeValidation.js')],
      ['semantic-date', read('front/mi-front-limpio/services/homecloud/homecloudSemanticDate.ts')],
      ['memory-picker', read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts')],
      ['p2-foundation', p2Foundation],
    ]) {
      assert.doesNotMatch(source, /\bis_favorite\b\s*[:=]/, `${label} must never name is_favorite as a field`);
    }
  });

  console.log(`\nHOMECLOUD_ST3_PATCH_FAVORITES_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exitCode = 1;
  else console.log('HOMECLOUD_ST3_PATCH_FAVORITES_TESTS=PASS');
}

main();
