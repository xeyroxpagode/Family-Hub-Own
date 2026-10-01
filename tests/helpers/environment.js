'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('../../backend/node_modules/dotenv');
const { executable, repositoryRoot } = require('./process');

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const DEFAULT_FILES = [
  '.env.test.local',
  '.env.local',
  'backend/.env.test.local',
  'backend/.env.local',
  'backend/.env',
];

function redact(value) {
  if (value === undefined || value === null || value === '') return '[EMPTY]';
  const text = String(value);
  if (text.length < 8) return '[REDACTED]';
  return `${text.slice(0, 2)}…${text.slice(-2)} [REDACTED]`;
}

function applyParsed(parsed, introduced) {
  for (const [name, value] of Object.entries(parsed)) {
    if (process.env[name] === undefined) {
      process.env[name] = value;
      introduced.add(name);
    }
  }
}

function loadLocalSupabaseStatus(introduced) {
  const result = spawnSync(executable('supabase'), ['status', '-o', 'env'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (result.status !== 0) return false;
  const parsed = dotenv.parse(result.stdout || '');
  const mapped = {
    SUPABASE_URL: parsed.API_URL,
    SUPABASE_ANON_KEY: parsed.ANON_KEY || parsed.PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY || parsed.SECRET_KEY,
    LOCAL_DATABASE_URL: parsed.DB_URL,
  };
  applyParsed(Object.fromEntries(Object.entries(mapped).filter(([, value]) => value)), introduced);
  return true;
}

function loadTestEnvironment(options = {}) {
  const required = options.required || [];
  const introduced = new Set();
  const loadedFiles = [];

  for (const relativePath of options.files || DEFAULT_FILES) {
    const absolutePath = path.resolve(repositoryRoot, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const parsed = dotenv.parse(fs.readFileSync(absolutePath));
    applyParsed(parsed, introduced);
    loadedFiles.push(relativePath);
  }

  let missing = required.filter((name) => !process.env[name]);
  if (missing.length && options.allowSupabaseStatus !== false) {
    loadLocalSupabaseStatus(introduced);
    missing = required.filter((name) => !process.env[name]);
  }
  if (missing.length) {
    throw new Error(`RUNTIME_REQUIRED: missing environment variables: ${missing.join(', ')}`);
  }

  return {
    loadedFiles,
    cleanup() {
      for (const name of introduced) delete process.env[name];
      introduced.clear();
    },
  };
}

function requireLocalUrl(name = 'SUPABASE_URL') {
  const raw = process.env[name];
  if (!raw) throw new Error(`RUNTIME_REQUIRED: ${name} is missing`);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`ENVIRONMENT_FAILURE: ${name} is not a valid URL`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`ENVIRONMENT_FAILURE: ${name} must target local Supabase; received ${redact(raw)}`);
  }
  return url;
}

module.exports = { loadTestEnvironment, redact, requireLocalUrl };
