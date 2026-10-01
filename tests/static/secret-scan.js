#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { repositoryRoot } = require('../helpers/process');

const binaryExtensions = new Set([
  '.docx', '.gif', '.ico', '.jpeg', '.jpg', '.pdf', '.png', '.ttf', '.webp', '.woff', '.woff2', '.zip',
]);
const risks = [
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['service-role JWT', /service[_-]?role[^\r\n]{0,40}eyJ[A-Za-z0-9_-]{10,}/i],
  ['Bearer token', /Bearer\s+[A-Za-z0-9._-]{30,}/i],
];

function trackedFiles() {
  const result = spawnSync('git', [
    '-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z',
  ], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('git ls-files failed');
  return result.stdout.split('\0').filter(Boolean);
}

function hasRemoteCredentialUrl(content) {
  const matches = content.matchAll(/postgres(?:ql)?:\/\/([^\s:@]+):([^\s@]+)@([^\s/:]+)/gi);
  for (const match of matches) {
    const host = match[3].toLowerCase();
    if (!['127.0.0.1', 'localhost'].includes(host) && !match[0].includes('${')) return true;
  }
  return false;
}

const findings = [];
for (const relativePath of trackedFiles()) {
  if (binaryExtensions.has(path.extname(relativePath).toLowerCase())) continue;
  const absolutePath = path.join(repositoryRoot, relativePath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch {
    continue;
  }
  for (const [type, pattern] of risks) {
    if (pattern.test(content)) findings.push({ file: relativePath, type });
  }
  if (hasRemoteCredentialUrl(content)) findings.push({ file: relativePath, type: 'remote database credential URL' });
  if (/^\.env(?:\.|$)/.test(path.basename(relativePath)) && !relativePath.endsWith('.example')) {
    findings.push({ file: relativePath, type: 'tracked environment file' });
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`SECRET_RISK: ${finding.file} type=${finding.type} value=[REDACTED]`);
  console.error(`SECRET_SCAN: FAIL (${findings.length} file/type findings)`);
  process.exit(1);
}

console.log(`SECRET_SCAN: PASS (${trackedFiles().length} versionable paths inspected; values never printed)`);
