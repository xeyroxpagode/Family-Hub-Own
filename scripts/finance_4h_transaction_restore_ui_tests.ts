import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(repositoryRoot, rel), 'utf8');
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// H01 — Tap trashed Expense → recovery detail opens
runTest('H01 — Tap trashed Expense → recovery detail opens', () => {
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(papeleraScreen.includes('handleTrashMovementPress'), 'H01 Papelera screen has handler for trash movement press');
  assert(papeleraScreen.includes('setSelectedTrashMovement') && papeleraScreen.includes('setTrashDetailVisible(true)'), 'H01 Handler sets selected movement and opens detail');
  assert(papeleraScreen.includes('<TrashMovementDetailSheet') && papeleraScreen.includes('movement={selectedTrashMovement}') && papeleraScreen.includes('visible={trashDetailVisible}'), 'H01 TrashMovementDetailSheet rendered with movement and visibility');
  assert(trashDetailSheet.includes('Detalle del movimiento') && trashDetailSheet.includes('Tipo') && trashDetailSheet.includes('Monto'), 'H01 TrashMovementDetailSheet shows movement detail fields');
  assert(trashDetailSheet.includes('isExpense ?') && trashDetailSheet.includes('Gasto') && trashDetailSheet.includes('Ingreso'), 'H01 Detail shows correct type label for both Expense and Income');
});

// H02 — Tap trashed Income → recovery detail opens
runTest('H02 — Tap trashed Income → recovery detail opens', () => {
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  // Same handler works for both expense and income
  assert(papeleraScreen.includes('onPress={() => handleTrashMovementPress(movement)}'), 'H02 Same handler used for both types');
  assert(trashDetailSheet.includes('isExpense ?') && trashDetailSheet.includes('Gasto') && trashDetailSheet.includes('Ingreso'), 'H02 Detail shows correct type label for both Expense and Income');
});

// H03 — Restore action exists
runTest('H03 — Restore action exists', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('Restaurar movimiento'), 'H03 "Restaurar movimiento" label present in detail step');
  assert(trashDetailSheet.includes('handleRestore') && trashDetailSheet.includes('setStep') && trashDetailSheet.includes('\'confirm\''), 'H03 "Restaurar movimiento" navigates to confirm step');
  assert(trashDetailSheet.includes('refresh-outline') && trashDetailSheet.includes('colors.success.strong'), 'H03 Restore entry has success icon and styling');
});

// H04 — Restore confirmation opens
runTest('H04 — Restore confirmation opens', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('step === \'confirm\'') && trashDetailSheet.includes('¿Restaurar movimiento?'), 'H04 Confirmation step shows restore confirmation dialog');
  assert(trashDetailSheet.includes('El movimiento volverá a afectar tus finanzas'), 'H04 Confirmation shows product-safe message');
  assert(trashDetailSheet.includes('Cancelar') && trashDetailSheet.includes('Restaurar'), 'H04 Confirmation has Cancel and Restore CTAs');
});

// H05 — Confirm calls accepted 4G Restore endpoint
runTest('H05 — Confirm calls accepted 4G Restore endpoint', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(trashDetailSheet.includes('handleConfirmRestore'), 'H05 Confirm handler exists');
  assert(trashDetailSheet.includes('restoreFinanceTransaction'), 'H05 Calls restoreFinanceTransaction service');
  assert(trashDetailSheet.includes('transactionId: movement.id'), 'H05 Passes correct transaction ID');
  assert(trashDetailSheet.includes('accessToken') && trashDetailSheet.includes('contextType') && trashDetailSheet.includes('personId'), 'H05 Passes required auth context');
  assert(service.includes('export const restoreFinanceTransaction'), 'H05 Service exports restoreFinanceTransaction');
  assert(service.includes('/api/finance/transactions/restore'), 'H05 Service calls correct backend endpoint');
  assert(service.includes('OPERATION_KINDS.NON_VERSIONED_MUTATION'), 'H05 Uses correct operation kind for mutation');
  assert(service.includes('hashIdempotencyRequestV2') && service.includes('mutationId') && service.includes('idempotencyKey'), 'H05 Service computes canonical payload hash with mutation identity');
});

// H06 — Request includes correct transactionId
runTest('H06 — Request includes correct transactionId', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(service.includes('transactionId'), 'H06 Service payload includes transactionId');
  assert(trashDetailSheet.includes('transactionId: movement.id'), 'H06 Detail sheet passes movement.id as transactionId');
});

// H07 — Request includes current canonical contextType
runTest('H07 — Request includes current canonical contextType', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');

  assert(service.includes('contextType'), 'H07 Service includes contextType in request body');
  assert(trashDetailSheet.includes('contextType'), 'H07 Detail sheet passes contextType to service');
  assert(papeleraScreen.includes('contextType={selectedContext}'), 'H07 Papelera screen passes selectedContext to detail sheet');
});

// H08 — Same open intent retry preserves mutationId
runTest('H08 — Same open intent retry preserves mutationId', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('restoreMutationId') && trashDetailSheet.includes('useState<string | null>(null)'), 'H08 restoreMutationId state exists');
  assert(trashDetailSheet.includes('step === \'confirm\' && !restoreMutationId') && trashDetailSheet.includes('setRestoreMutationId(generateMutationId())'), 'H08 mutationId generated ONCE when entering confirm step');
  assert(trashDetailSheet.includes('step !== \'confirm\'') && trashDetailSheet.includes('setRestoreMutationId(null)'), 'H08 mutationId cleared when leaving confirm step');
  assert(!trashDetailSheet.includes('generateMutationId()') || trashDetailSheet.match(/generateMutationId\(\)/g)?.length === 1, 'H08 generateMutationId called only once per intent');
});

// H09 — Same open intent retry preserves idempotencyKey
runTest('H09 — Same open intent retry preserves idempotencyKey', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('restoreIdempotencyKey') && trashDetailSheet.includes('useState<string | null>(null)'), 'H09 restoreIdempotencyKey state exists');
  assert(trashDetailSheet.includes('setRestoreIdempotencyKey(createIdempotencyKey') && trashDetailSheet.includes('finance.transaction.restore'), 'H09 idempotencyKey generated ONCE with correct operation');
  assert(trashDetailSheet.includes('step !== \'confirm\'') && trashDetailSheet.includes('setRestoreIdempotencyKey(null)'), 'H09 idempotencyKey cleared when leaving confirm step');
});

// H10 — Same canonical retry preserves payloadHash
runTest('H10 — Same canonical retry preserves payloadHash', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(service.includes('hashIdempotencyRequestV2'), 'H10 Service uses hashIdempotencyRequestV2');
  assert(service.includes('operation: \'finance.transaction.restore\''), 'H10 Hash includes correct operation');
  assert(service.includes('scopeType: contextType'), 'H10 Hash includes scopeType from context');
  assert(service.includes('scopeId'), 'H10 Hash includes scopeId');
  assert(service.includes('targetId: transactionId'), 'H10 Hash includes targetId');
  assert(service.includes('payload'), 'H10 Hash includes payload');
  assert(service.includes('expectedVersion: null'), 'H10 Hash includes expectedVersion');
  assert(service.includes('mutationId'), 'H10 Hash includes mutationId');
  // payloadHash is computed inside service using stable inputs (mutationId, idempotencyKey from same intent)
  assert(service.includes('mutationId') && service.includes('idempotencyKey'), 'H10 Service receives stable mutationId and idempotencyKey from caller');
});

// H11 — New Restore intent gets new identity
runTest('H11 — New Restore intent gets new identity', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  // When step changes from detail -> confirm, new IDs generated
  // When step changes back to detail, IDs cleared
  // Next time entering confirm, NEW IDs generated
  assert(trashDetailSheet.includes('if (step === \'confirm\' && !restoreMutationId)'), 'H11 New mutationId generated for each new confirm entry');
  assert(trashDetailSheet.includes('if (step !== \'confirm\')'), 'H11 IDs cleared when leaving confirm');
  assert(trashDetailSheet.includes('setRestoreMutationId(null)') && trashDetailSheet.includes('setRestoreIdempotencyKey(null)'), 'H11 Both IDs reset for new intent');
});

// H12 — Pending state prevents double submit
runTest('H12 — Pending state prevents double submit', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('submitting') && trashDetailSheet.includes('useState(false)'), 'H12 submitting state exists');
  assert(trashDetailSheet.includes('disabled={submitting}'), 'H12 Buttons disabled during submission');
  assert(trashDetailSheet.includes('loading={submitting}'), 'H12 Primary CTA shows loading state');
  assert(trashDetailSheet.includes('if (!movement || !accessToken || !personId || submitting') && trashDetailSheet.includes('return'), 'H12 Handler guards against double-tap');
  assert(trashDetailSheet.includes('closeDisabled={submitting}'), 'H12 Sheet cannot be closed while submitting');
});

// H13 — Success closes flow and triggers canonical refresh
runTest('H13 — Success closes flow and triggers canonical refresh', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');

  assert(trashDetailSheet.includes('onRestoreSuccess()') && trashDetailSheet.includes('close()'), 'H13 Success calls onRestoreSuccess and closes sheet');
  assert(papeleraScreen.includes('handleTrashRestoreSuccess') && papeleraScreen.includes('setReadRefreshNonce'), 'H13 onRestoreSuccess triggers read refresh');
  assert(papeleraScreen.includes('handleTrashDetailClose()'), 'H13 onRestoreSuccess closes detail sheet');
  // Success feedback is handled by the existing UndoToast pattern in FinanceScreen, but Papelera may need its own
  // For now verify the flow closes properly
});

// H14 — Papelera refetch removes restored movement
runTest('H14 — Papelera refetch removes restored movement', () => {
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(papeleraScreen.includes('setReadRefreshNonce') && papeleraScreen.includes('readRefreshNonce'), 'H14 Read refresh nonce triggers refetch');
  assert(service.includes('/api/finance/trash'), 'H14 Papelera endpoint called on refresh');
  // Backend 4G ensures restored transactions are no longer TRASHED (status=ACTIVE)
  // Frontend relies on canonical server truth - no local mutation
  assert(!/setMovements\(.*filter|movements\.filter\(.*TRASHED|movement\.status.*TRASHED/i.test(papeleraScreen), 'H14 No local filtering of TRASHED - relies on server');
});

// H15 — Normal Movimientos refetch allows restored movement to return
runTest('H15 — Normal Movimientos refetch allows restored movement to return', () => {
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  // The restore success triggers readRefreshNonce which affects Papelera
  // FinanceScreen has its own readRefreshNonce for Movimientos
  assert(financeScreen.includes('setReadRefreshNonce') && financeScreen.includes('readRefreshNonce'), 'H15 Movimientos has refresh mechanism');
  assert(service.includes('/api/finance/movements'), 'H15 Movements endpoint called on refresh');
  // Backend 4G ensures restored transactions appear in ACTIVE movements
  // Frontend relies on canonical server truth
});

// H16 — Account/summary truth is refetched, not locally fabricated
runTest('H16 — Account/summary truth is refetched, not locally fabricated', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  const papeleraScreen = read('front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  // Verify no local mutation of account balance, effect status, or transaction status
  assert(!/transaction\.status\s*=|effectStatus\s*=|effect_status\s*=|balance\s*[+-]=|accountBalance\s*[+-]=/i.test(trashDetailSheet), 'H16 No local mutation of transaction/effect/account state in detail sheet');
  assert(!/accountEffect|effectStatus|effect_status|Account.*Balance|account.*balance|finance_account_effects|REVERSED|ACTIVE.*=|balance\s*[+-]=/i.test(trashDetailSheet), 'H16 No account effect mutation in detail sheet');
  // Papelera and FinanceScreen rely on server truth via refresh
  assert(papeleraScreen.includes('setReadRefreshNonce') && financeScreen.includes('setReadRefreshNonce'), 'H16 Uses canonical refetch for truth');
});

// H17 — Backend error remains visible and does not fake success
runTest('H17 — Backend error remains visible and does not fake success', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');

  assert(trashDetailSheet.includes('catch (err)') && trashDetailSheet.includes('setError'), 'H17 Error is caught and set in state');
  assert(trashDetailSheet.includes('error ?') && trashDetailSheet.includes('errorBox') && trashDetailSheet.includes('styles.errorText'), 'H17 Error displayed in confirmation step');
  assert(trashDetailSheet.includes('setSubmitting(false)'), 'H17 Submitting state reset on error');
  assert(trashDetailSheet.includes('ApiError'), 'H17 Uses ApiError for typed error handling');
  // Verify error path doesn't call onRestoreSuccess or close (only success path does)
  const errorBlockStart = trashDetailSheet.indexOf('catch (err)');
  const errorBlockEnd = trashDetailSheet.indexOf('finally {');
  const errorBlock = trashDetailSheet.slice(errorBlockStart, errorBlockEnd);
  assert(!errorBlock.includes('onRestoreSuccess') && !errorBlock.includes('close()'), 'H17 onRestoreSuccess NOT called on error path');
});

// H18 — Commission/dependent Restore rejection handled safely
runTest('H18 — Commission/dependent Restore rejection handled safely', () => {
  const trashDetailSheet = read('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(trashDetailSheet.includes('finance_transaction_dependent_on_transfer'), 'H18 Handles commission-dependent error code');
  assert(trashDetailSheet.includes('comisión generada por una Transferencia') && trashDetailSheet.includes('propietaria'), 'H18 Shows product-safe message for commission');
  // Backend remains authority - frontend does not pre-filter
  assert(!/transfer_id|commission.*transfer|dependent.*transfer/i.test(trashDetailSheet.replace('finance_transaction_dependent_on_transfer', '')), 'H18 No frontend pre-filtering of commission movements');
  // Backend returns 409 with this code, frontend displays error
  assert(service.includes('finance_transaction_dependent_on_transfer') === false, 'H18 Service does not hardcode error - backend is authority');
});

// H19 — No direct frontend mutation of transaction/effect/account state
runTest('H19 — No direct frontend mutation of transaction/effect/account state', () => {
  // Only check files directly involved in the Restore flow
  const restoreFlowFiles = [
    'front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx',
    'front/mi-front-limpio/services/finance/financeMovements.ts',
    'front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx',
  ].map((file) => read(file)).join('\n');

  assert(!/accountEffect|effectStatus|effect_status|Account.*Balance|account.*balance|finance_account_effects|REVERSED|effectStatus.*=|balance\s*[+-]=/i.test(restoreFlowFiles), 'H19 No frontend mutation of account effects or balances in restore flow');
  assert(!/updateFinanceAccount|createFinanceAccountEffect|financeAccountEffect|patchAccount|putAccount|transaction\.status\s*=/i.test(restoreFlowFiles), 'H19 No account effect or transaction status mutation calls in restore flow');
  // Restore flow only calls transaction restore endpoint
  assert(restoreFlowFiles.includes('/api/finance/transactions/restore') && !restoreFlowFiles.includes('/api/finance/accounts') && !restoreFlowFiles.includes('/api/finance/effects'), 'H19 Restore flow only calls transaction restore endpoint');
});

function listFiles(dir: string): string[] {
  const full = path.join(repositoryRoot, dir);
  if (!fs.existsSync(full)) return [];
  const entries = fs.readdirSync(full, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(rel);
    return [rel];
  });
}

console.log(`\nFINANCE_STAGE_4H_FRONTEND_TESTS pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_4H_TRANSACTION_RESTORE_UI_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_4H_TRANSACTION_RESTORE_UI_TESTS=PASS');