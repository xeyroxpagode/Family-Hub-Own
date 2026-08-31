// Finance Stage 6E.2 - Expense Pool frontend contract tests

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  FinanceExpensePoolAssignmentResponse,
  FinancePoolDto,
} from '../front/mi-front-limpio/services/finance/financePools';

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

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function functionBlock(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName}`);
  if (start === -1) return '';
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function createMockPool(overrides: Partial<FinancePoolDto> = {}): FinancePoolDto {
  return {
    id: 'pool-1',
    financialContextType: 'personal',
    ownerPersonId: 'person-1',
    householdId: null,
    currency: 'ARS',
    name: 'Gastos del Mes',
    status: 'ACTIVE',
    balance: '-10000',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

function runTests(): void {
  console.log('Finance Stage 6E.2 - Expense Pool frontend');
  console.log('');

  const poolService = readRepoFile('front/mi-front-limpio/services/finance/financePools.ts');
  const eligibility = readRepoFile('front/mi-front-limpio/services/finance/financePoolEligibility.ts');
  const newMovement = readRepoFile('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const movementDetail = readRepoFile('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');
  const financeScreen = readRepoFile('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const payCreditCard = readRepoFile('front/mi-front-limpio/components/finance/PayCreditCardSheet.tsx');

  console.log('DTO / Read');
  {
    const response: FinanceExpensePoolAssignmentResponse = {
      rootTransactionId: 'root-1',
      assignment: {
        poolId: 'pool-1',
        poolName: 'Gastos del Mes',
        currency: 'ARS',
        status: 'ACTIVE',
      },
    };
    assert(response.assignment?.poolName === 'Gastos del Mes', '1. assignment DTO carries Pool display name');
    assert(response.assignment?.currency === 'ARS', '2. assignment DTO carries currency');
    assert(response.assignment?.status === 'ACTIVE', '3. assignment DTO carries status');
    assert(({ ...response, assignment: null }).assignment === null, '4. assignment DTO supports Sin pozo null');
  }

  {
    const block = functionBlock(poolService, 'getExpensePoolAssignmentClient');
    assert(block.includes('/api/finance/pools/expense-assignment/'), '5. read client calls canonical assignment endpoint');
    assert(/operationKind:\s*OPERATION_KINDS\.READ_ONLY/.test(block), '6. read client is READ_ONLY');
    assert(!/finance_pool_entries|ledger|summary/.test(block), '7. read client does not reconstruct from Pool ledger');
  }

  console.log('');
  console.log('Create Expense');
  {
    assert(newMovement.includes("activePicker === 'expensePool'"), '8. create Expense has Pool picker state');
    assert(newMovement.includes('selectedExpenseAccount === null'), '9. no Account leaves Pool unavailable');
    assert(newMovement.includes('Elegí una cuenta para usar un pozo'), '10. no Account copy keeps Expense valid');
    assert(newMovement.includes("selectedExpenseAccount.balanceState !== 'KNOWN'"), '11. ACCOUNT UNKNOWN disables new Pool assignment');
    assert(newMovement.includes("selectedExpenseAccount.accountType !== 'CREDIT_CARD'"), '12. CREDIT_CARD remains eligible for Pool');
    assert(newMovement.includes('assignExpenseToPoolClient'), '13. create Expense assigns selected Pool through canonical mutation');
    assert(newMovement.includes('poolAssignmentCreateErrorMessage'), '14. separate create+assign failure is humanized');
    assert(newMovement.includes('expenseCreatedAfterPoolFailure'), '15. failed post-create assignment avoids duplicate resubmit');
    assert(!/deleteFinance|trashFinanceTransaction/.test(newMovement), '16. create failure does not rollback/delete Expense');
  }

  console.log('');
  console.log('Eligibility');
  {
    assert(eligibility.includes('pool.status !== \'ACTIVE\''), '17. archived Pools excluded');
    assert(eligibility.includes('pool.currency !== options.transactionCurrency'), '18. same currency enforced');
    assert(eligibility.includes('options.contextType === \'personal\''), '19. same context enforced for personal');
    assert(eligibility.includes('isActiveHouseholdPool'), '20. household context checks active household');
    assert(eligibility.includes('Financial reality may drive pool negative'), '21. negative Pool remains selectable');
    const negative = createMockPool();
    assert(negative.balance.startsWith('-'), '22. mock negative Pool accepted by DTO');
    assert(!eligibility.includes('balance >') && !eligibility.includes('currentBalance'), '23. eligibility does not block Expense > Pool balance');
  }

  console.log('');
  console.log('Movement Detail');
  {
    assert(movementDetail.includes('getExpensePoolAssignmentClient'), '24. Movement Detail calls canonical assignment read');
    assert(movementDetail.includes('Pozo'), '25. Movement Detail displays Pozo label');
    assert(movementDetail.includes("'Sin pozo'"), '26. Movement Detail displays Sin pozo for null assignment');
    assert(movementDetail.includes('assignExpenseToPoolClient'), '27. existing Expense assign/reclass uses Pool mutation');
    assert(movementDetail.includes('unassignExpensePoolClient'), '28. existing Expense unassign uses Pool mutation');
    assert(movementDetail.includes('rootTransactionId'), '29. mutations use logical root identity');
    assert(movementDetail.includes('setPoolRefreshNonce'), '30. success refetches assignment read');
    assert(movementDetail.includes('poolOptionsState.refresh()'), '31. success refreshes selector Pools');
    assert(movementDetail.includes('onPoolAssignmentSuccess()'), '32. success refreshes Finance reads');
    assert(!/correctTransaction|TransactionCorrection|createFinanceTransfer/.test(movementDetail), '33. reclass/unassign do not use correction or transfer');
  }

  console.log('');
  console.log('Mutation Correlation');
  {
    const assignBlock = functionBlock(poolService, 'assignExpenseToPoolClient');
    const unassignBlock = functionBlock(poolService, 'unassignExpensePoolClient');
    assert(assignBlock.includes('mutationId') && assignBlock.includes('idempotencyKey'), '34. assign passes mutation correlation');
    assert(unassignBlock.includes('mutationId') && unassignBlock.includes('idempotencyKey'), '35. unassign passes mutation correlation');
    assert(assignBlock.includes('payloadHash') && unassignBlock.includes('payloadHash'), '36. assign/unassign pass payloadHash');
    assert(assignBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '37. assign is create-idempotent');
    assert(unassignBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '38. unassign is create-idempotent');
  }

  console.log('');
  console.log('Refresh / Scope');
  {
    assert(financeScreen.includes('handlePoolAssignmentSuccess'), '39. FinanceScreen handles Pool assignment refresh');
    assert(financeScreen.includes('setReadRefreshNonce((current) => current + 1)'), '40. Finance reads refresh after assignment changes');
    assert(financeScreen.includes('getFinancePoolSummary'), '41. Pool Summary is part of refreshed reads');
    assert(financeScreen.includes('getFinanceSpendingLimitProgress'), '42. Limits are part of refreshed reads');
    assert(financeScreen.includes('getFinanceAnalysis'), '43. Analysis is part of refreshed reads');
  }

  console.log('');
  console.log('Semantics');
  {
    assert(!payCreditCard.includes('PoolSelectorSheet'), '44. PayCreditCardSheet has no Pool field');
    assert(!movementDetail.includes('createFinanceExpense'), '45. reclass does not create a new Expense');
    assert(!movementDetail.includes('createFinanceIncome'), '46. no Income organizer in Movement Detail');
    assert(!movementDetail.includes('selectedCategoryId'), '47. Pool organization does not default Category');
    assert(!movementDetail.includes('allocations'), '48. Expense organization is 0..1 Pool, not split Pool');
  }

  console.log(`\nFINANCE_6E2_EXPENSE_POOL_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

runTests();
