/**
 * S5-B — O35 history invalidation unit check (compiled con tsconfig.test.json).
 * Verifica que getInvalidationKeys incluye history keys tras archive,
 * unarchive, trash, restore y lifecycle status (ambas formas de kind).
 */
import { assetsCache } from '../front/mi-front-limpio/services/assets/assetsCache';
import { assetsKeys } from '../front/mi-front-limpio/services/assets/assetsKeys';

const scope = { householdId: '00000000-0000-0000-0000-000000000001' } as const;
const entityId = '00000000-0000-0000-0000-000000000002';

const cases: { label: string; mutation: Parameters<typeof assetsCache.getInvalidationKeys>[0] }[] = [
  { label: 'archive', mutation: { kind: 'asset', action: 'archive', entityId } },
  { label: 'unarchive (lifecycle action)', mutation: { kind: 'asset', action: 'lifecycle', entityId } },
  { label: 'trash', mutation: { kind: 'asset', action: 'trash_restore', entityId } },
  { label: 'setLifecycleStatus (lifecycle kind)', mutation: { kind: 'lifecycle', action: 'lifecycle', entityId } },
];

let pass = 0;
let fail = 0;
const archiveHistoryKey = JSON.stringify(assetsKeys.history(scope, entityId, 'archive'));
const trashHistoryKey = JSON.stringify(assetsKeys.history(scope, entityId, 'trash'));

for (const { label, mutation } of cases) {
  const keys = assetsCache.getInvalidationKeys(mutation, scope).map((k) => JSON.stringify(k));
  const hasArchive = keys.includes(archiveHistoryKey);
  const hasTrash = keys.includes(trashHistoryKey);
  if (hasArchive && hasTrash) { pass += 1; console.log(`PASS: ${label} invalida history (archive+trash)`); }
  else { fail += 1; console.log(`FAIL: ${label} NO invalida history (archive=${hasArchive} trash=${hasTrash})`); }
}

const unrelated = assetsCache.getInvalidationKeys({ kind: 'care', action: 'create', entityId }, scope).map((k) => JSON.stringify(k));
const unrelatedClean = !unrelated.includes(archiveHistoryKey) && !unrelated.includes(trashHistoryKey);
if (unrelatedClean) { pass += 1; console.log('PASS: care create NO invalida history (invalidación dirigida)'); }
else { fail += 1; console.log('FAIL: care create invalida history (invalidación excesiva)'); }

console.log(`ASSETS_HISTORY_INVALIDATION pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
