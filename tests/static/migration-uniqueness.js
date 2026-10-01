#!/usr/bin/env node
'use strict';

/**
 * Migration Uniqueness Guard
 *
 * Ensures no two migration files in supabase/migrations share the same version prefix.
 * A migration version is the prefix before the first underscore.
 *
 * Fails if duplicate version prefixes are detected.
 */

const fs = require('node:fs');
const path = require('node:path');
const { repositoryRoot } = require('../helpers/process');

function main() {
  const migrationsDir = path.join(repositoryRoot, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  const versionMap = new Map();
  const duplicates = [];

  for (const file of files) {
    const match = file.match(/^(\d+)_.*\.sql$/);
    if (!match) continue;
    const version = match[1];
    if (versionMap.has(version)) {
      duplicates.push({ version, first: versionMap.get(version), second: file });
    } else {
      versionMap.set(version, file);
    }
  }

  if (duplicates.length > 0) {
    console.error('MIGRATION_UNIQUENESS_GUARD=FAIL');
    console.error(`Found ${duplicates.length} duplicate migration version(s):`);
    for (const dup of duplicates) {
      console.error(`  Version ${dup.version}:`);
      console.error(`    ${dup.first}`);
      console.error(`    ${dup.second}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`MIGRATION_UNIQUENESS_GUARD=PASS (${versionMap.size} unique versions)`);
}

main();