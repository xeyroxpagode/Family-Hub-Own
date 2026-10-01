#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { repositoryRoot } = require('../helpers/process');

const roots = ['backend', 'scripts', 'tests'];
const excluded = new Set(['node_modules', 'compiled', 'coverage', 'test-results']);
const files = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

for (const root of roots) visit(path.join(repositoryRoot, root));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`BACKEND_AND_TEST_SYNTAX: PASS (${files.length} JavaScript files)`);
