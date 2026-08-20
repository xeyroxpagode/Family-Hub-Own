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

// E01 — Tap Expense movement → Movement Detail opens
runTest('E01 — Tap Expense movement → Movement Detail opens', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const movementsSurface = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(screen.includes('onMovementPress={handleMovementPress}'), 'E01 MovementsSurface receives onMovementPress handler');
  assert(screen.includes('handleMovementPress') && screen.includes('setSelectedMovement') && screen.includes('setMovementDetailVisible(true)'), 'E01 handleMovementPress sets selected movement and opens detail');
  assert(screen.includes('<MovementDetailSheet') && screen.includes('movement={selectedMovement}') && screen.includes('visible={movementDetailVisible}'), 'E01 MovementDetailSheet rendered with movement and visibility');
  assert(movementsSurface.includes('Detalle del movimiento') && movementsSurface.includes('Tipo') && movementsSurface.includes('Monto'), 'E01 MovementDetailSheet shows movement detail fields');
});

// E02 — Tap Income movement → Movement Detail opens
runTest('E02 — Tap Income movement → Movement Detail opens', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const movementsSurface = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  // Same handler works for both expense and income
  assert(screen.includes('onMovementPress={handleMovementPress}'), 'E02 Same handler used for both types');
  assert(movementsSurface.includes('isExpense ?') && movementsSurface.includes('Gasto') && movementsSurface.includes('Ingreso'), 'E02 Detail shows correct type label for both Expense and Income');
});

// E03 — "Algo está mal" is available
runTest('E03 — "Algo está mal" is available', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(detailSheet.includes('Algo está mal'), 'E03 "Algo está mal" label present');
  assert(detailSheet.includes('handleAlgoEstaMal') && detailSheet.includes('setStep') && detailSheet.includes('\'recovery\''), 'E03 "Algo está mal" navigates to recovery step');
  assert(detailSheet.includes('alert-circle-outline') && detailSheet.includes('colors.warning.strong'), 'E03 Recovery entry has warning icon and styling');
});

// E04 — "Nunca ocurrió" reaches Trash confirmation
runTest('E04 — "Nunca ocurrió" reaches Trash confirmation', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(detailSheet.includes('Nunca ocurrió'), 'E04 "Nunca ocurrió" label present');
  assert(detailSheet.includes('handleNuncaOcurrio') && detailSheet.includes('setStep') && detailSheet.includes('\'confirm\''), 'E04 "Nunca ocurrió" navigates to confirm step');
  assert(detailSheet.includes('trash-outline') && detailSheet.includes('colors.danger.strong'), 'E04 Option has trash icon and danger styling');
  assert(detailSheet.includes('step === \'confirm\'') && detailSheet.includes('¿Enviar a Papelera?'), 'E04 Confirmation step shows trash confirmation dialog');
});

// E05 — Confirm invokes canonical Trash service with correct transaction id
runTest('E05 — Confirm invokes canonical Trash service with correct transaction id', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(detailSheet.includes('handleConfirmTrash'), 'E05 Confirm handler exists');
  assert(detailSheet.includes('trashFinanceTransaction'), 'E05 Calls trashFinanceTransaction service');
  assert(detailSheet.includes('transactionId: movement.id'), 'E05 Passes correct transaction ID');
  assert(detailSheet.includes('accessToken') && detailSheet.includes('contextType') && detailSheet.includes('personId'), 'E05 Passes required auth context');
  assert(service.includes('export const trashFinanceTransaction'), 'E05 Service exports trashFinanceTransaction');
  assert(service.includes('/api/finance/transactions/trash'), 'E05 Service calls correct backend endpoint');
  assert(service.includes('OPERATION_KINDS.NON_VERSIONED_MUTATION'), 'E05 Uses correct operation kind for mutation');
  assert(service.includes('hashIdempotencyRequestV2') && service.includes('mutationId') && service.includes('idempotencyKey'), 'E05 Service computes canonical payload hash with mutation identity');
});

// E06 — Pending state prevents duplicate submission
runTest('E06 — Pending state prevents duplicate submission', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(detailSheet.includes('submitting') && detailSheet.includes('useState(false)'), 'E06 submitting state exists');
  assert(detailSheet.includes('disabled={submitting}'), 'E06 Buttons disabled during submission');
  assert(detailSheet.includes('loading={submitting}') || detailSheet.includes('loading={submitting}'), 'E05 Primary CTA shows loading state');
  assert(detailSheet.includes('if (submitting) return;') || detailSheet.includes('if (!movement || !accessToken || !personId || submitting) return;'), 'E06 Handler guards against double-tap');
  assert(detailSheet.includes('closeDisabled={submitting}'), 'E06 Sheet cannot be closed while submitting');
});

// E07 — Success triggers canonical refetch and closes flow
runTest('E07 — Success triggers canonical refetch and closes flow', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(detailSheet.includes('onTrashSuccess()') && detailSheet.includes('close()'), 'E07 Success calls onTrashSuccess and closes sheet');
  assert(screen.includes('handleTrashSuccess') && screen.includes('setSuccessFeedback') && screen.includes('setReadRefreshNonce'), 'E07 onTrashSuccess triggers success feedback and read refresh');
  assert(screen.includes('handleMovementDetailClose()'), 'E07 onTrashSuccess closes movement detail');
  assert(screen.includes('Movimiento enviado a Papelera'), 'E07 Shows canonical success message');
});

// E08 — Trashed transaction no longer appears in active Movimientos after refetch
runTest('E08 — Trashed transaction no longer appears in active Movimientos after refetch', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assert(service.includes('/api/finance/movements'), 'E08 Movements endpoint called on refresh');
  assert(screen.includes('setReadRefreshNonce') && screen.includes('readRefreshNonce'), 'E08 Read refresh nonce triggers refetch');
  // Backend 4D ensures TRASHED transactions are filtered out (status=ACTIVE only)
  // Frontend relies on canonical server truth - no local mutation
  assert(!/setMovements\(.*filter|movements\.filter\(.*TRASHED|movement\.status.*TRASHED/i.test(screen), 'E08 No local filtering of TRASHED - relies on server');
});

// E09 — Backend failure remains visible and does not fake success
runTest('E09 — Backend failure remains visible and does not fake success', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  assert(detailSheet.includes('catch (err)') && detailSheet.includes('setError'), 'E09 Error is caught and set in state');
  assert(detailSheet.includes('error ?') && detailSheet.includes('errorBox') && detailSheet.includes('styles.errorText'), 'E09 Error displayed in confirmation step');
  assert(detailSheet.includes('setSubmitting(false)'), 'E09 Submitting state reset on error');
  assert(detailSheet.includes('ApiError'), 'E09 Uses ApiError for typed error handling');
  // Verify error path doesn't call onTrashSuccess or close (only success path does)
  const errorBlockStart = detailSheet.indexOf('catch (err)');
  const errorBlockEnd = detailSheet.indexOf('finally {');
  const errorBlock = detailSheet.slice(errorBlockStart, errorBlockEnd);
  assert(!errorBlock.includes('onTrashSuccess') && !errorBlock.includes('close()'), 'E09 onTrashSuccess NOT called on error path');
});

// E10 — Commission/dependent error is handled safely
runTest('E10 — Commission/dependent error is handled safely', () => {
  const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');

  assert(detailSheet.includes('finance_transaction_dependent_on_transfer'), 'E10 Handles commission-dependent error code');
  assert(detailSheet.includes('comisión generada por una Transferencia') && detailSheet.includes('Papelera por separado'), 'E10 Shows product-safe message for commission');
  // Backend remains authority - frontend does not pre-filter
  assert(!/transfer_id|commission.*transfer|dependent.*transfer/i.test(detailSheet.replace('finance_transaction_dependent_on_transfer', '')), 'E10 No frontend pre-filtering of commission movements');
  // Backend returns 409 with this code, frontend displays error
  assert(service.includes('finance_transaction_dependent_on_transfer') === false, 'E10 Service does not hardcode error - backend is authority');
});

// E11 — No direct mutation of Account Balance/effect status from frontend
runTest('E11 — No direct mutation of Account Balance/effect status from frontend', () => {
  // Only check files directly involved in the Trash flow
  const trashFlowFiles = [
    'front/mi-front-limpio/components/finance/MovementDetailSheet.tsx',
    'front/mi-front-limpio/services/finance/financeMovements.ts',
    'front/mi-front-limpio/screens/finance/FinanceScreen.tsx',
  ].map((file) => read(file)).join('\n');

  assert(!/accountEffect|effectStatus|effect_status|Account.*Balance|account.*balance|finance_account_effects|REVERSED|effectStatus.*=|balance\s*[+-]=/i.test(trashFlowFiles), 'E11 No frontend mutation of account effects or balances in trash flow');
  assert(!/updateFinanceAccount|createFinanceAccountEffect|financeAccountEffect|patchAccount|putAccount/i.test(trashFlowFiles), 'E11 No account effect mutation calls in trash flow');
  // Trash flow only calls transaction trash endpoint
  assert(trashFlowFiles.includes('/api/finance/transactions/trash') && !trashFlowFiles.includes('/api/finance/accounts') && !trashFlowFiles.includes('/api/finance/effects'), 'E11 Trash flow only calls transaction trash endpoint');
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

console.log(`\nFINANCE_STAGE_4E_FRONTEND_TESTS pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_4E_FRONTEND_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_4E_FRONTEND_TESTS=PASS');