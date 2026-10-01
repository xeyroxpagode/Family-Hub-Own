const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const previousTsExtension = Module._extensions['.ts'];
Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

(async () => {
  try {
  const preferences = require(path.join(__dirname, '..', 'services', 'experiencePreferences.ts'));
  const layout = require(path.join(__dirname, '..', 'components', 'simple', 'simpleLayout.ts'));

  assert.deepEqual(
    preferences.parseExperiencePreferences({ version: 1, mode: 'simple', setupCompleted: true }),
    { version: 1, mode: 'simple', setupCompleted: true },
  );
  assert.equal(preferences.parseExperiencePreferences({ version: 1, mode: 'advanced', setupCompleted: true }), null);

  const values = new Map();
  const store = preferences.createExperiencePreferencesStore({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  });
  await store.save('account-a', { version: 1, mode: 'simple', setupCompleted: true });
  await store.save('account-b', { version: 1, mode: 'standard', setupCompleted: true });
  assert.equal((await store.load('account-a')).mode, 'simple');
  assert.equal((await store.load('account-b')).mode, 'standard');
  assert.notEqual(
    preferences.__testBuildExperienceStorageKey('account-a'),
    preferences.__testBuildExperienceStorageKey('account-b'),
  );

  assert.equal(layout.getSimpleActionGridColumns(359, 1), 1);
  assert.equal(layout.getSimpleActionGridColumns(390, 1), 2);
  assert.equal(layout.getSimpleActionGridColumns(390, 1.2), 1);
  assert.equal(layout.getSimpleHorizontalPadding(320), 12);
  assert.equal(layout.getSimpleHorizontalPadding(700), 20);
  assert.equal(layout.buildSimpleAccessibilityLabel('Familia', '3 integrantes', 'Nuevo'), 'Familia. 3 integrantes. Nuevo');

    console.log('Experience Mode contracts: PASS');
  } finally {
    Module._extensions['.ts'] = previousTsExtension;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
