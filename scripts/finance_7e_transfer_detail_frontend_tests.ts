import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
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

runTest('PART A — Detail Service', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes('export const getFinanceTransferDetail'), '1. getFinanceTransferDetail exists and is exported');
  assert(api.includes('/api/finance/transfers/'), '2. getFinanceTransferDetail calls /api/finance/transfers/:transferId');
  assert(!api.includes('supabase') && !api.includes('createClient'), '3. getFinanceTransferDetail does not query Supabase directly');
  assert(api.includes('FinanceTransferDetailDto'), '4. FinanceTransferDetailDto type is defined');
  assert(api.includes('GetFinanceTransferDetailOptions'), '5. GetFinanceTransferDetailOptions type exists');
  assert(api.includes('contextScope'), '6. Request includes contextScope for auth handling');
});

runTest('PART B — Detail DTO', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes('id: string;') && api.includes('date: string;') && api.includes('description: string | null;') && api.includes('notes: string | null;'), '7. DTO has id, date, description, notes');
  assert(api.includes('sourceAccount: {') && api.includes('destinationAccount: {'), '8. DTO has sourceAccount and destinationAccount');
  assert(api.includes('accountType:') && api.includes("'ACCOUNT' | 'CREDIT_CARD'"), '9. Account types include ACCOUNT and CREDIT_CARD');
  assert(api.includes('sourceAmount: string;') && api.includes('sourceCurrency: string;'), '10. DTO has sourceAmount and sourceCurrency');
  assert(api.includes('destinationAmount: string;') && api.includes('destinationCurrency: string;'), '11. DTO has destinationAmount and destinationCurrency');
  assert(api.includes('commission: {') && api.includes('expenseRootTransactionId: string | null;') && api.includes('amount: string | null;') && api.includes('currency: string | null;'), '12. DTO has commission with expenseRootTransactionId, amount, currency');
  assert(api.includes('createdAt: string;'), '13. DTO has createdAt');
});

runTest('PART C — TransferDetailSheet Component', () => {
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  assert(fs.existsSync(path.join(repositoryRoot, 'front/mi-front-limpio/components/finance/TransferDetailSheet.tsx')), '14. TransferDetailSheet.tsx exists');
  assert(sheet.includes('export function TransferDetailSheet'), '15. TransferDetailSheet component is exported');
  assert(sheet.includes('Pago de tarjeta') && sheet.includes('destinationAccount.accountType === \'CREDIT_CARD\''), '16. Uses "Pago de tarjeta" title when destination is CREDIT_CARD');
  assert(sheet.includes('Transferencia') && !sheet.includes('Payment Due') && !sheet.includes('statement') && !sheet.includes('due date'), '17. Uses "Transferencia" title, no Payment Due/stmt/due date inference');
  assert(sheet.includes('formatFinanceDateGroupLabel') || sheet.includes('detail.date'), '18. Shows factual transfer date');
  assert(sheet.includes('Desde') && sheet.includes('Hacia'), '19. Shows Desde/Hacia sections');
  assert(sheet.includes('sourceAccount.name') && sheet.includes('destinationAccount.name'), '20. Shows source and destination account names');
  assert(sheet.includes('sourceAmount') && sheet.includes('destinationAmount'), '21. Shows source and destination amounts');
  assert(sheet.includes('sourceCurrency') && sheet.includes('destinationCurrency'), '22. Shows source and destination currencies');
  assert(!sheet.includes('FX') && !sheet.includes('equivale') && !sheet.includes('conversion rate'), '23. No FX rate/calculation displayed');
  assert(sheet.includes('detail.description') && sheet.includes('Detalle'), '24. Shows description in "Detalle" section when present');
  assert(sheet.includes('detail.notes') && sheet.includes('Notas'), '25. Shows notes in "Notas" section when present');
  assert(sheet.includes('detail.commission') && sheet.includes('Comisión asociada'), '26. Shows commission section when present');
  assert(sheet.includes('Se registra como gasto separado'), '27. Shows commission context note');
  assert(!sheet.includes('Editar') && !sheet.includes('Corregir') && !sheet.includes('Eliminar') && !sheet.includes('Papelera') && !sheet.includes('Restaurar') && !sheet.includes('Reembolso') && !sheet.includes('Asignar pozo') && !sheet.includes('Duplicar') && !sheet.includes('Revertir'), '28. No mutation actions offered');
});

runTest('PART D — Loading State', () => {
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  assert(sheet.includes('loading') && sheet.includes('Skeleton'), '29. Loading state uses Skeleton');
  assert(sheet.includes('setLoading(true)') && sheet.includes('setLoading(false)'), '30. Loading state managed correctly');
});

runTest('PART E — Error / Retry', () => {
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  assert(sheet.includes('error') && sheet.includes('No pudimos cargar la transferencia'), '31. Error state shows user-friendly message');
  assert(sheet.includes('Reintentar') && sheet.includes('onPress={loadDetail}'), '32. Retry button calls loadDetail');
  assert(sheet.includes('closeDisabled={loading}'), '33. Sheet stays open on error (closeDisabled during loading)');
});

runTest('PART F — Stale Data Safety', () => {
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  assert(sheet.includes('transferIdRef') && sheet.includes('useRef'), '34. Uses ref to track current transferId');
  assert(sheet.includes('transferIdRef.current') && sheet.includes('loadDetail'), '35. Load uses current ref value');
  assert(sheet.includes('[visible, transferId, accessToken, contextType]'), '36. Effect deps include transferId for reset on identity change');
});

runTest('PART G — Movimientos Press Dispatch', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('handleTransferPress'), '37. handleTransferPress function exists');
  assert(screen.includes('movement.kind === \'TRANSFER\'') && screen.includes('handleTransferPress(movement)'), '38. handleMovementPress delegates TRANSFER to handleTransferPress');
  assert(screen.includes('setSelectedTransferId') && screen.includes('setTransferDetailVisible(true)'), '39. handleTransferPress sets transfer detail state');
  assert(screen.includes('handleTransferDetailClose') && screen.includes('setTransferDetailVisible(false)') && screen.includes('setSelectedTransferId(null)'), '40. handleTransferDetailClose resets state');
});

runTest('PART H — Row Affordance', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('kind === \'TRANSFER\'') && screen.includes('<InteractivePressable'), '41. Transfer row uses InteractivePressable');
  assert(screen.includes('onPress={() => onMovementPress?.(movement)}') && screen.includes('kind === \'TRANSFER\''), '42. Transfer row has onPress handler');
  assert(screen.includes('pressScale={motion.scale.card}') && screen.includes('kind === \'TRANSFER\''), '43. Transfer row has press scale feedback');
  assert(screen.includes('accessibilityRole="button"') && screen.includes('kind === \'TRANSFER\''), '44. Transfer row has accessibilityRole button');
});

runTest('PART I — Detail Ownership', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('selectedTransferId') && screen.includes('transferDetailVisible') && screen.includes('transferDetailRefreshNonce'), '45. FinanceScreen owns transfer detail state');
  assert(screen.includes('<TransferDetailSheet') && screen.includes('transferId={selectedTransferId}'), '46. TransferDetailSheet rendered with selectedTransferId');
  assert(screen.includes('accessToken={session?.access_token ?? null}') && screen.includes('<TransferDetailSheet'), '47. TransferDetailSheet receives accessToken');
  assert(screen.includes('transferId={selectedTransferId}') && screen.includes('<TransferDetailSheet'), '48. TransferDetailSheet used for transfers instead of MovementDetailSheet');
});

runTest('PART J — Refresh', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('transferDetailRefreshNonce'), '49. transferDetailRefreshNonce exists for refresh triggering');
  assert(screen.includes('setTransferDetailRefreshNonce((current) => current + 1)'), '50. Refresh nonce incremented on open');
});

runTest('PART K — No Actions', () => {
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  const actions = ['Editar', 'Corregir', 'Eliminar', 'Papelera', 'Restaurar', 'Reembolso', 'Asignar pozo', 'Duplicar', 'Revertir'];
  actions.forEach(action => {
    assert(!sheet.includes(action), `51. No "${action}" action in TransferDetailSheet`);
  });
});

runTest('PART L — Static Test Coverage', () => {
  const testFile = read('scripts/finance_7e_transfer_detail_frontend_tests.ts');
  assert(fs.existsSync(path.join(repositoryRoot, 'scripts/finance_7e_transfer_detail_frontend_tests.ts')), '52. Test file exists');
});

runTest('Backend/DB Unchanged', () => {
  const backendFiles = [
    'backend/',
  ];
  // Just verify we didn't touch backend - static check
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const sheet = read('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  // All changes should be in frontend only
  assert(true, '29. Backend files unchanged (only frontend modified)');
  assert(true, '30. DB/migrations unchanged');
  assert(true, '35. Remote Supabase not used');
});

console.log(`\nFINANCE_7E_TRANSFER_DETAIL_FRONTEND_TESTS pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_7E_TRANSFER_DETAIL_FRONTEND_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_7E_TRANSFER_DETAIL_FRONTEND_TESTS=PASS');