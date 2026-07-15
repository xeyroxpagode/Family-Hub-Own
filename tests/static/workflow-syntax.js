#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('../../front/mi-front-limpio/node_modules/yaml');
const { repositoryRoot } = require('../helpers/process');

const workflowDirectory = path.join(repositoryRoot, '.github/workflows');
const files = fs.readdirSync(workflowDirectory).filter((name) => /\.ya?ml$/.test(name));
if (!files.length) throw new Error('CI_WORKFLOW_FAILURE: no workflow files found');

for (const file of files) {
  const document = YAML.parse(fs.readFileSync(path.join(workflowDirectory, file), 'utf8'));
  if (!document || typeof document !== 'object') throw new Error(`CI_WORKFLOW_FAILURE: ${file} is not a mapping`);
  if (!document.jobs || typeof document.jobs !== 'object') throw new Error(`CI_WORKFLOW_FAILURE: ${file} has no jobs`);
}

console.log(`CI_WORKFLOW_SYNTAX: PASS (${files.length} workflow files)`);
