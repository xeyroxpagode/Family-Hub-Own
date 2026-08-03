/**
 * Run `planner_reliability_http_e2e_repro_tests.js` from Node with the
 * diagnostics node modules (react-native) shimmed via tests/stubs and the
 * frontend base URL defaulted, so the reliability runtime can reach the
 * fetch mock instead of getting stuck in `retrying` with `api_url_missing`.
 */
'use strict';

process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://repro.local';

const path = require('node:path');
const repositoryRoot = path.resolve(__dirname, '..');
const stubsDir = path.join(repositoryRoot, 'tests', 'stubs');
const existing = (process.env.NODE_PATH ?? '').split(path.delimiter).filter(Boolean);
if (!existing.includes(stubsDir)) existing.push(stubsDir);
process.env.NODE_PATH = existing.join(path.delimiter);
// Module._initPaths picks up NODE_PATH at process start. In a later require
// hook we add the stubs to the resolver manually as a defensive safeguard.
const Module = require('module');
const originalResolve = Module._resolveFilename.bind(Module);
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolve(request, parent, isMain, options);
  } catch (error) {
    if (request === 'react-native' || request.startsWith('react-native/')) {
      return require.resolve(path.join(stubsDir, 'react-native', 'index.js'));
    }
    if (request === 'react' || request.startsWith('react/')) {
      return require.resolve(path.join(stubsDir, 'react', 'index.js'));
    }
    if (request === '@expo/vector-icons' || request.startsWith('@expo/')) {
      return require.resolve(path.join(stubsDir, '@expo', 'vector-icons', 'index.js'));
    }
    throw error;
  }
};

require(path.join(repositoryRoot, 'scripts', 'compiled-reliability-repro', 'scripts', 'planner_reliability_http_e2e_repro_tests.js'));
