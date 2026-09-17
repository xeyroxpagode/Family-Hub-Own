import {
  buildSimpleAccessibilityLabel,
  getSimpleActionGridColumns,
  getSimpleHorizontalPadding,
} from '../front/mi-front-limpio/components/simple/simpleLayout';

let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed += 1; }
}

function main() {
  assert(getSimpleActionGridColumns(390, 1) === 2, 'standard viewport keeps the two-column quick-action grid');
  assert(getSimpleActionGridColumns(320, 1) === 1, 'narrow viewport uses a readable single-column grid');
  assert(getSimpleActionGridColumns(430, 1.2) === 1, 'enlarged system text uses a readable single-column grid');
  assert(getSimpleHorizontalPadding(320) === 12, 'compact viewport reduces only horizontal gutter');
  assert(getSimpleHorizontalPadding(390) === 16, 'standard viewport keeps the default gutter');
  assert(getSimpleHorizontalPadding(700) === 20, 'wide viewport gains an appropriate gutter');
  assert(
    buildSimpleAccessibilityLabel('Medicamentos', '1 pendiente hoy', 'Importante') === 'Medicamentos. 1 pendiente hoy. Importante',
    'action labels announce title, metadata and status once',
  );

  if (failed > 0) process.exitCode = 1;
}

main();
