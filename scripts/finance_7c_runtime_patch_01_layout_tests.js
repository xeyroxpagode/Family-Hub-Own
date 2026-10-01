'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  'front/mi-front-limpio/components/finance/NewMovementSheet.tsx',
  'front/mi-front-limpio/components/finance/TransactionCorrectionSheet.tsx',
];

for (const relativePath of files) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const sheetBody = source.match(/sheetBody:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
  assert.match(source, /size=\{FINANCE_SHEET_SIZE_POLICY\.LONG_FORM\}/, `${relativePath} uses LONG_FORM`);
  assert.match(source, /KeyboardAwareScrollView/, `${relativePath} keeps keyboard-aware scrolling`);
  assert.match(sheetBody, /flexShrink:\s*1/, `${relativePath} contributes intrinsic height and may shrink`);
  assert.match(sheetBody, /minHeight:\s*0/, `${relativePath} allows bounded overflow`);
  assert.doesNotMatch(sheetBody, /flex:\s*1/, `${relativePath} does not collapse under an intrinsic parent`);
  assert.doesNotMatch(sheetBody, /(?:height|minHeight):\s*(?:600|650|700)/, `${relativePath} has no magic forced height`);
}

const movement = fs.readFileSync(path.join(root, files[0]), 'utf8');
assert.match(movement, /value:\s*'expense'/, 'Gasto mode remains present');
assert.match(movement, /value:\s*'income'/, 'Ingreso mode remains present');
assert.match(movement, /value:\s*'transfer'/, 'Transferir mode remains present');
assert.match(movement, /commissionMode === 'custom'/, 'commission OFF/ON content remains in the same scroll body');
assert.match(movement, /contentContainerStyle=\{styles\.form\}/, 'form content remains content-driven');

console.log('finance_7c_runtime_patch_01_layout_tests: PASS');
