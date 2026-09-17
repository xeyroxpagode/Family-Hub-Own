import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  createFinanceExpense,
  createFinanceIncome,
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
import {
  assignExpenseToPoolClient,
  distributeIncomeToPoolsClient,
  getCategoryPoolDefaultClient,
} from '../../services/finance/financePools';
import {
  createFinanceTransfer,
  buildTransferPayloadSignature,
  useStableTransferMutationIdentity,
} from '../../services/finance/financeTransfers';
import type { FinanceAccountDto } from '../../services/finance/financeAccounts';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import { useEligiblePools } from '../../services/finance/financePoolEligibility';
import {
  addDecimalStrings,
  compareDecimalStrings,
  subtractDecimalStrings,
  formatAccountPresentationAmount,
  formatCanonicalAmountForDisplay,
  getAccountBalancePresentation,
} from '../../services/finance/accountDisplay';
import {
  DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS,
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  DatePickerSheet,
  FormActionRow,
  InteractivePressable,
  formatHumanDate,
} from '../ui';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';
import { PoolSelectorSheet } from './PoolSelectorSheet';

type FinanceOperationKind = 'expense' | 'income' | 'transfer';

type NewMovementSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  contextState: FinanceContextViewState;
  activeHousehold: FinanceActiveHousehold;
  personId: string | null;
  householdId: string | null;
  onRequestClose: () => void;
  onSuccess: (operation: FinanceOperationKind) => void;
};

type ActivePicker =
  | 'date'
  | 'category'
  | 'expenseAccount'
  | 'incomeAccount'
  | 'expensePool'
  | 'transferSource'
  | 'transferDestination'
  | null;

const todayDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isExpense = (operation: FinanceOperationKind) => operation === 'expense';
const isIncome = (operation: FinanceOperationKind) => operation === 'income';
const isTransfer = (operation: FinanceOperationKind) => operation === 'transfer';

const NONE_AMOUNT = '';

function formatDecimalWithSeparator(value: string): string {
  return formatCanonicalAmountForDisplay(value);
}

type TransferPreview = {
  sourceLabel: string;
  destinationLabel: string;
};

function computeTransferPreview(args: {
  sourceAccount: FinanceAccountDto | null;
  destinationAccount: FinanceAccountDto | null;
  amount: MoneyInputParseResult;
  destinationAmount: MoneyInputParseResult;
  commission: MoneyInputParseResult;
  commissionMode: 'none' | 'custom';
  crossCurrency: boolean;
}): TransferPreview | null {
  const { sourceAccount, destinationAccount, amount, commission, commissionMode, crossCurrency, destinationAmount } = args;
  if (!sourceAccount || !destinationAccount) return null;
  if (!amount.technicalValue) return null;

  const sourceAmountText = amount.technicalValue.amount;
  const commissionAmountText = commissionMode === 'custom' && commission.technicalValue ? commission.technicalValue.amount : '0';
  const presentation = getAccountBalancePresentationSafe(sourceAccount);
  const destPresentation = getAccountBalancePresentationSafe(destinationAccount);

  const sourceBeforeAfterLabel = computeBeforeAfter({
    account: sourceAccount,
    presentation,
    currency: sourceAccount.currency,
    debitAmount: addDecimalStrings(sourceAmountText, commissionAmountText),
    isDebit: true,
  });
  const destinationBeforeAfterLabel = computeBeforeAfter({
    account: destinationAccount,
    presentation: destPresentation,
    currency: destinationAccount.currency,
    creditAmount: crossCurrency && destinationAmount.technicalValue ? destinationAmount.technicalValue.amount : sourceAmountText,
    isDebit: false,
  });
  return {
    sourceLabel: sourceBeforeAfterLabel,
    destinationLabel: destinationBeforeAfterLabel,
  };
}

function computeBeforeAfter(args: {
  account: FinanceAccountDto;
  presentation: { isUnknown: boolean; isCreditCard: boolean; isDebt: boolean; displayAmount: string | null } | null;
  currency: string;
  debitAmount?: string;
  creditAmount?: string;
  isDebit: boolean;
}): string {
  const { presentation, currency, isDebit } = args;
  if (!presentation || presentation.isUnknown) {
    const op = isDebit ? 'Saldo no establecido' : 'Saldo no establecido';
    const amount = isDebit ? args.debitAmount : args.creditAmount;
    return `${op}\n${isDebit ? '-' : '+'} ${currency} ${formatDecimalWithSeparator(amount ?? '0')}`;
  }
  const currentSigned = args.account.currentBalance ?? '0';
  const amount = isDebit ? args.debitAmount ?? '0' : args.creditAmount ?? '0';
  const newSigned = isDebit
    ? subtractDecimalStrings(currentSigned, amount)
    : addDecimalStrings(currentSigned, amount);
  const oldDisplay = formatAccountPresentationAmount(getAccountBalancePresentation(args.account));
  const nextDisplay = formatAccountPresentationAmount(getAccountBalancePresentation({
    ...args.account,
    balanceState: 'KNOWN',
    currentBalance: newSigned,
  }));
  return `${oldDisplay} ${currency} → ${nextDisplay} ${currency}`;
}

function getAccountBalancePresentationSafe(account: FinanceAccountDto) {
  if (account.balanceState !== 'KNOWN' || account.currentBalance === null) {
    return { isUnknown: true, isCreditCard: account.accountType === 'CREDIT_CARD', isDebt: false, displayAmount: null };
  }
  const canonical = account.currentBalance;
  const isNegative = canonical.startsWith('-');
  if (account.accountType === 'CREDIT_CARD') {
    if (isNegative || canonical === '0' || /^0+(\.0+)?$/.test(canonical)) {
      return { isUnknown: false, isCreditCard: true, isDebt: true, displayAmount: isNegative ? canonical.slice(1) : canonical };
    }
    return { isUnknown: false, isCreditCard: true, isDebt: false, displayAmount: canonical };
  }
  return { isUnknown: false, isCreditCard: false, isDebt: isNegative, displayAmount: canonical };
}

function poolAssignmentCreateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'finance_pool_archived':
        return 'Gasto registrado, pero ese pozo está archivado. Podés organizarlo desde el detalle con un pozo activo.';
      case 'finance_pool_context_currency_mismatch':
        return 'Gasto registrado, pero el pozo no coincide con el contexto o la moneda.';
      case 'finance_expense_pool_account_required':
        return 'Gasto registrado, pero necesita una cuenta para consumir un pozo.';
      case 'finance_expense_pool_account_unknown':
        return 'Gasto registrado, pero la cuenta no tiene saldo establecido para asignar un pozo.';
      case 'idempotency_conflict':
      case 'planner_idempotency_conflict':
        return 'Gasto registrado, pero la asignación del pozo quedó en conflicto. Revisalo desde el detalle.';
      default:
        return `Gasto registrado, pero no pudimos asignar el pozo: ${error.message}`;
    }
  }
  return 'Gasto registrado, pero no pudimos asignar el pozo. Podés organizarlo desde el detalle.';
}

export function NewMovementSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  activeHousehold,
  personId,
  householdId,
  onRequestClose,
  onSuccess,
}: NewMovementSheetProps) {
  const [operation, setOperation] = useState<FinanceOperationKind>('expense');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayDateOnly);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expenseCreatedAfterPoolFailure, setExpenseCreatedAfterPoolFailure] = useState(false);
  const contextKeyRef = useRef(`${contextType}:${contextLabel}`);

  const [expenseAccountId, setExpenseAccountId] = useState<string | null>(null);
  const [incomeAccountId, setIncomeAccountId] = useState<string | null>(null);
  const [expensePoolId, setExpensePoolId] = useState<string | null>(null);

  // Category → Pool suggested default state (Stage 6E.4)
  const [categoryPoolDefault, setCategoryPoolDefault] = useState<{ poolId: string | null; poolName: string | null } | null>(null);
  const [userTouchedPool, setUserTouchedPool] = useState(false);

  // Income pool distribution state
  const [incomePoolAllocations, setIncomePoolAllocations] = useState<{ poolId: string; amount: string }[]>([]);
  const [incomePoolOrganizerOpen, setIncomePoolOrganizerOpen] = useState(false);

  const [transferSource, setTransferSource] = useState<FinanceAccountDto | null>(null);
  const [transferDestination, setTransferDestination] = useState<FinanceAccountDto | null>(null);
  const [transferAmountText, setTransferAmountText] = useState('');
  const [transferAmount, setTransferAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [destinationAmountText, setDestinationAmountText] = useState('');
  const [destinationAmount, setDestinationAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [commissionMode, setCommissionMode] = useState<'none' | 'custom'>('none');
  const [commissionText, setCommissionText] = useState('');
  const [commission, setCommission] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));

  const expenseAccountPickerVisible = activePicker === 'expenseAccount';
  const incomeAccountPickerVisible = activePicker === 'incomeAccount';
  const expensePoolPickerVisible = activePicker === 'expensePool';
  const transferSourcePickerVisible = activePicker === 'transferSource';
  const transferDestinationPickerVisible = activePicker === 'transferDestination';

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';

  useEffect(() => {
    if (!visible) return;
    setDate(todayDateOnly());
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const nextKey = `${contextType}:${contextLabel}`;
    if (contextKeyRef.current !== nextKey) {
      contextKeyRef.current = nextKey;
      setSelectedCategoryId(null);
      setCategories([]);
      setCategoriesError(null);
      setSubmitError(null);
      setExpensePoolId(null);
      setCategoryPoolDefault(null);
      setUserTouchedPool(false);
    }
  }, [contextLabel, contextType, visible]);

  useEffect(() => {
    if (!visible || !isExpense(operation) || !accessToken || contextUnavailable) {
      setCategories([]);
      setSelectedCategoryId(null);
      setCategoriesError(null);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    listFinanceExpenseCategories(accessToken, contextType)
      .then((payload) => {
        if (cancelled) return;
        const selectableCategories = payload.categories.filter(
          (category) => category.type === 'expense' && category.selectable,
        );
        setCategories(selectableCategories);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setSelectedCategoryId(null);
        setCategoriesError('No pudimos cargar las categorias. Podes registrar sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, operation, visible]);

  // Fetch category pool default when category changes (Stage 6E.4)
  useEffect(() => {
    if (!visible || !isExpense(operation) || !accessToken || contextUnavailable || !selectedCategoryId) {
      setCategoryPoolDefault(null);
      setUserTouchedPool(false);
      return;
    }

    let cancelled = false;
    getCategoryPoolDefaultClient({
      accessToken,
      contextType,
      categoryId: selectedCategoryId,
      currency,
      contextScope: `finance-category-pool-default:${contextType}:${selectedCategoryId}:${currency}`,
    })
      .then((next) => {
        if (cancelled) return;
        setCategoryPoolDefault({ poolId: next.poolId, poolName: next.poolName });
        // Auto-apply suggestion only if user hasn't explicitly touched pool field
        if (next.poolId && !userTouchedPool) {
          setExpensePoolId(next.poolId);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCategoryPoolDefault({ poolId: null, poolName: null });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, currency, operation, selectedCategoryId, userTouchedPool, visible]);

  const expenseAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isExpense(operation),
    operation: 'expense',
    contextType,
    transactionCurrency: currency,
    activeHousehold,
  });

  const selectedExpenseAccount = useMemo(
    () => expenseAccountsState.accounts.find((account) => account.id === expenseAccountId) ?? null,
    [expenseAccountId, expenseAccountsState.accounts],
  );

  const expensePoolsState = useEligiblePools({
    accessToken,
    enabled: visible && isExpense(operation) && selectedExpenseAccount !== null,
    contextType,
    transactionCurrency: currency,
    activeHousehold,
  });

  const incomeAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isIncome(operation),
    operation: 'income',
    contextType,
    transactionCurrency: currency,
    activeHousehold,
  });

  const transferSourceAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isTransfer(operation),
    operation: 'transfer-source',
    contextType,
    transactionCurrency: null,
    activeHousehold,
  });

  const transferDestinationAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isTransfer(operation) && transferSource !== null,
    operation: 'transfer-destination',
    contextType,
    transactionCurrency: null,
    activeHousehold,
  });

  const selectedIncomeAccount = useMemo(
    () => incomeAccountsState.accounts.find((account) => account.id === incomeAccountId) ?? null,
    [incomeAccountId, incomeAccountsState.accounts],
  );
  const selectedExpensePool = useMemo(
    () => expensePoolsState.pools.find((pool) => pool.id === expensePoolId) ?? null,
    [expensePoolId, expensePoolsState.pools],
  );

  // Income pool eligibility: same context, same currency, ACTIVE pools
  // Only enabled when an eligible income account is selected (KNOWN balance, not CREDIT_CARD)
  const incomePoolEligible = Boolean(
    selectedIncomeAccount &&
    selectedIncomeAccount.balanceState === 'KNOWN' &&
    selectedIncomeAccount.accountType !== 'CREDIT_CARD'
  );

  const incomePoolsState = useEligiblePools({
    accessToken,
    enabled: visible && isIncome(operation) && incomePoolEligible,
    contextType,
    transactionCurrency: currency,
    activeHousehold,
  });

  const transferCrossCurrency =
    transferSource !== null
    && transferDestination !== null
    && transferSource.currency !== transferDestination.currency;
  const transferCurrency: MoneyInputCurrencyCode = transferSource?.currency ?? 'ARS';

  const transferSignature = buildTransferPayloadSignature({
    sourceAccount: transferSource?.id ?? '',
    destinationAccount: transferDestination?.id ?? '',
    sourceAmount: transferAmount.technicalValue?.amount ?? '',
    destinationAmount: transferCrossCurrency
      ? (destinationAmount.technicalValue?.amount ?? '')
      : (transferAmount.technicalValue?.amount ?? ''),
    commissionAmount: commissionMode === 'custom' ? (commission.technicalValue?.amount ?? '') : '',
    date,
  });
  const transferIdentity = useStableTransferMutationIdentity(transferSignature);

  const transferPreview = useMemo(() => computeTransferPreview({
    sourceAccount: transferSource,
    destinationAccount: transferDestination,
    amount: transferAmount,
    destinationAmount,
    commission,
    commissionMode,
    crossCurrency: transferCrossCurrency,
  }), [transferSource, transferDestination, transferAmount, destinationAmount, commission, commissionMode, transferCrossCurrency]);

  const hasValidTransferSource = transferSource !== null && transferSource.accountType === 'ACCOUNT';
  const transferSourceTotalDebit = transferAmount.technicalValue
    ? addDecimalStrings(
      transferAmount.technicalValue.amount,
      commissionMode === 'custom' && commission.technicalValue ? commission.technicalValue.amount : '0',
    )
    : null;
  const transferSourceBalanceInsufficient =
    transferSource?.balanceState === 'KNOWN' &&
    transferSource.currentBalance !== null &&
    transferSourceTotalDebit !== null &&
    compareDecimalStrings(transferSource.currentBalance, transferSourceTotalDebit) < 0;

  const canSubmit = isTransfer(operation)
    ? Boolean(accessToken) && !contextUnavailable && !submitting &&
      hasValidTransferSource &&
      Boolean(transferDestination) &&
      (transferSource?.id ?? '') !== transferDestination?.id &&
      transferAmount.isValid &&
      (!transferCrossCurrency || destinationAmount.isValid) &&
      (commissionMode === 'none' || (commissionMode === 'custom' && commission.isValid))
    : Boolean(accessToken) && !contextUnavailable && amount.isValid && !submitting && !expenseCreatedAfterPoolFailure;

const resetDraft = () => {
    setOperation('expense');
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setDescription('');
    setNotesExpanded(false);
    setNotes('');
    setDate(todayDateOnly());
    setCategories([]);
    setSelectedCategoryId(null);
    setCategoriesError(null);
    setActivePicker(null);
    setSubmitError(null);
    setSubmitting(false);
    setExpenseCreatedAfterPoolFailure(false);
    setExpenseAccountId(null);
    setIncomeAccountId(null);
    setExpensePoolId(null);
    setCategoryPoolDefault(null);
    setUserTouchedPool(false);
    setIncomePoolAllocations([]);
    setIncomePoolOrganizerOpen(false);
    setTransferSource(null);
    setTransferDestination(null);
    setTransferAmountText('');
    setTransferAmount(parseMoneyInputText('', 'ARS'));
    setDestinationAmountText('');
    setDestinationAmount(parseMoneyInputText('', 'ARS'));
    setCommissionMode('none');
    setCommissionText('');
    setCommission(parseMoneyInputText('', 'ARS'));
  };

  const close = () => {
    if (submitting) return;
    resetDraft();
    onRequestClose();
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const handleCurrencyChange = (nextCurrency: MoneyInputCurrencyCode) => {
    setCurrency(nextCurrency);
    setAmount(parseMoneyInputText(amountText, nextCurrency));
    setSubmitError(null);
    setExpensePoolId(null);
    setCategoryPoolDefault(null);
    setUserTouchedPool(false);
    // Clear income pool allocations when currency changes
    setIncomePoolAllocations([]);
  };

  const resetTransferDependentState = () => {
    setTransferSource(null);
    setTransferDestination(null);
    setTransferAmountText('');
    setTransferAmount(parseMoneyInputText('', 'ARS'));
    setDestinationAmountText('');
    setDestinationAmount(parseMoneyInputText('', 'ARS'));
    setCommissionMode('none');
    setCommissionText('');
    setCommission(parseMoneyInputText('', 'ARS'));
  };

  const chooseOperation = (nextOperation: FinanceOperationKind) => {
    setOperation(nextOperation);
    setSubmitError(null);
    setActivePicker(null);
    if (nextOperation !== 'expense') {
      setSelectedCategoryId(null);
      setNotesExpanded(false);
      setNotes('');
    }
    if (nextOperation !== 'transfer') {
      resetTransferDependentState();
    }
  };

  const handleSelectTransferSource = (account: FinanceAccountDto | null) => {
    setTransferSource(account);
    if (account) {
      setTransferAmount(parseMoneyInputText(NONE_AMOUNT, account.currency));
      setTransferAmountText(NONE_AMOUNT);
    }
    setActivePicker(null);
    if (account) {
      if (transferDestination && account.currency !== transferDestination.currency) {
        setTransferDestination(null);
        setDestinationAmount(parseMoneyInputText('', 'ARS'));
        setDestinationAmountText('');
      }
      if (commission.technicalValue) {
        setCommission(parseMoneyInputText(commissionText, account.currency));
      }
    }
  };

  const handleSelectTransferDestination = (account: FinanceAccountDto | null) => {
    setTransferDestination(account);
    if (account && transferCrossCurrency) {
      setDestinationAmount(parseMoneyInputText(NONE_AMOUNT, account.currency));
      setDestinationAmountText(NONE_AMOUNT);
    }
    setActivePicker(null);
  };

  const handleTransferAmountChange = (next: MoneyInputParseResult) => {
    setTransferAmountText(next.inputText);
    setTransferAmount(next);
    setSubmitError(null);
  };

  const handleDestinationAmountChange = (next: MoneyInputParseResult) => {
    setDestinationAmountText(next.inputText);
    setDestinationAmount(next);
    setSubmitError(null);
  };

  const handleCommissionChange = (next: MoneyInputParseResult) => {
    setCommissionText(next.inputText);
    setCommission(next);
    setSubmitError(null);
  };

  const setCommissionNone = () => {
    setCommissionMode('none');
    setCommissionText('');
    setCommission(parseMoneyInputText('', transferCurrency));
    setSubmitError(null);
  };

  const setCommissionCustom = () => {
    setCommissionMode('custom');
    setCommission(parseMoneyInputText(commissionText, transferCurrency));
    setSubmitError(null);
  };

  const submitExpenseOrIncome = async () => {
    if (submitting) return;
    Keyboard.dismiss();
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesion no esta disponible. Volve a iniciar sesion.');
      return;
    }
    if (contextUnavailable) {
      setSubmitError('El contexto financiero cambio o no esta disponible. Cerralo y volve a abrirlo.');
      return;
    }
    if (!amount.technicalValue) {
      setSubmitError('Ingresa un monto mayor que cero.');
      return;
    }

    // Validate income pool allocations
    if (isIncome(operation) && incomePoolAllocations.length > 0) {
      if (!incomeAccountId) {
        setSubmitError('Elegí una cuenta para organizar el ingreso en pozos.');
        return;
      }
      if (selectedIncomeAccount?.balanceState !== 'KNOWN' || selectedIncomeAccount?.accountType === 'CREDIT_CARD') {
        setSubmitError('La cuenta del ingreso debe tener saldo conocido y no ser tarjeta de crédito para organizar en pozos.');
        return;
      }
      // Validate each allocation
      for (const allocation of incomePoolAllocations) {
        if (!allocation.amount || isNaN(Number(allocation.amount)) || Number(allocation.amount) <= 0) {
          setSubmitError('Cada pozo debe tener un monto mayor que cero.');
          return;
        }
      }
      // Validate total doesn't exceed income amount
      const incomeAmt = Number(amount.technicalValue.amount);
      let allocatedTotal = 0;
      for (const allocation of incomePoolAllocations) {
        allocatedTotal += Number(allocation.amount);
      }
      if (allocatedTotal > incomeAmt) {
        setSubmitError('La suma de los montos organizados no puede superar el monto del ingreso.');
        return;
      }
      // Validate no duplicate pools
      const poolIds = incomePoolAllocations.map(a => a.poolId);
      if (new Set(poolIds).size !== poolIds.length) {
        setSubmitError('No se puede repetir el mismo pozo en la distribución.');
        return;
      }
    }

    const payload = {
      amount: amount.technicalValue.amount,
      currency,
      contextType,
      date,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(isExpense(operation) && selectedCategoryId ? { category: selectedCategoryId } : {}),
      ...(isExpense(operation) && notes.trim() ? { notes: notes.trim() } : {}),
      ...(isExpense(operation) && expenseAccountId ? { account: expenseAccountId } : {}),
      ...(isIncome(operation) && incomeAccountId ? { account: incomeAccountId } : {}),
    };

    const submittedOperation = operation;

    setSubmitting(true);
    try {
      if (isExpense(submittedOperation)) {
        const expenseResponse = await createFinanceExpense(accessToken, payload);
        // For a new expense, the transaction ID is the root transaction ID
        const expenseRootId = expenseResponse.transaction.id;

        if (expensePoolId && expenseAccountId && personId) {
          try {
            await assignExpenseToPoolClient({
              accessToken,
              contextType,
              currency,
              expenseRootTransactionId: expenseRootId,
              poolId: expensePoolId,
              personId,
              householdId,
            });
          } catch (poolError) {
            console.warn('Pool assignment failed:', poolError);
            setExpenseCreatedAfterPoolFailure(true);
            setExpensePoolId(null);
            setSubmitError(poolAssignmentCreateErrorMessage(poolError));
            onSuccess(submittedOperation);
            return;
          }
        }
      } else if (isIncome(submittedOperation)) {
        const incomeResponse = await createFinanceIncome(accessToken, payload);
        const incomeRootId = incomeResponse.transaction.id;

        // Distribute to pools if allocations exist
        if (incomePoolAllocations.length > 0 && incomeAccountId && personId) {
          try {
            await distributeIncomeToPoolsClient({
              accessToken,
              contextType,
              currency,
              incomeRootTransactionId: incomeRootId,
              allocations: incomePoolAllocations.map(a => ({ poolId: a.poolId, amount: a.amount })),
              personId,
              householdId,
            });
          } catch (poolError) {
            console.warn('Income pool distribution failed:', poolError);
            // Income remains created, surface error but don't delete income
            const message = poolError instanceof ApiError
              ? poolError.message
              : 'Ingreso registrado, pero no pudimos organizar los pozos. Podés hacerlo desde el detalle.';
            setSubmitError(message);
            onSuccess(submittedOperation);
            return;
          }
        }
      }
      resetDraft();
      onRequestClose();
      onSuccess(submittedOperation);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos registrar el movimiento. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    if (submitting) return;
    Keyboard.dismiss();
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesion no esta disponible. Volve a iniciar sesion.');
      return;
    }
    if (!transferSource || transferSource.accountType !== 'ACCOUNT') {
      setSubmitError('Elegí una cuenta de origen de tipo Cuenta.');
      return;
    }
    if (!transferDestination) {
      setSubmitError('Elegí una cuenta de destino.');
      return;
    }
    if (transferSource.id === transferDestination.id) {
      setSubmitError('Elegí cuentas distintas.');
      return;
    }
    if (!transferAmount.isValid) {
      setSubmitError('Revisa el monto a transferir.');
      return;
    }
    if (transferCrossCurrency && !destinationAmount.isValid) {
      setSubmitError('Revisa el monto de destino.');
      return;
    }
if (commissionMode === 'custom' && !commission.isValid) {
      setSubmitError('Revisa la comision.');
      return;
    }

    const canonicalSourceAmount = transferAmount.technicalValue!.amount;
    const payload = {
      sourceAccount: transferSource.id,
      destinationAccount: transferDestination.id,
      sourceAmount: canonicalSourceAmount,
      destinationAmount: transferCrossCurrency ? destinationAmount.technicalValue?.amount ?? null : canonicalSourceAmount,
      date,
      description: description.trim() || null,
      notes: null,
      commissionAmount: commissionMode === 'custom' ? commission.technicalValue?.amount ?? null : null,
      contextType,
    };

    setSubmitting(true);
    try {
      await createFinanceTransfer(accessToken, payload, transferIdentity);
      resetDraft();
      onRequestClose();
      onSuccess('transfer');
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos registrar la transferencia.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (isTransfer(operation)) {
      void submitTransfer();
    } else {
      void submitExpenseOrIncome();
    }
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton
        title={operation === 'expense' ? 'Registrar gasto' : operation === 'income' ? 'Registrar ingreso' : 'Transferir'}
        onPress={submit}
        loading={submitting}
        disabled={!canSubmit}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title="Nuevo movimiento"
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      footer={footer}
    >
      <View style={styles.sheetBody}>
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={40}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
        >
          <View style={styles.operationSelector} accessibilityRole="tablist">
            {(['expense', 'income', 'transfer'] as const).map((candidate) => {
              const selected = candidate === operation;
              return (
                <InteractivePressable
                  key={candidate}
                  onPress={() => chooseOperation(candidate)}
                  disabled={submitting}
                  haptic="light"
                  pressScale={motion.scale.tab}
                  style={[styles.operationOption, selected && styles.operationOptionSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={candidate === 'expense' ? 'Gasto' : candidate === 'income' ? 'Ingreso' : 'Transferencia'}
                >
                  <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                    {candidate === 'expense' ? 'Gasto' : candidate === 'income' ? 'Ingreso' : 'Transferir'}
                  </AppText>
                </InteractivePressable>
              );
            })}
          </View>

          {isTransfer(operation) ? (
            <React.Fragment>
              <View style={styles.fieldGroup}>
                <FormActionRow
                  label="Sale de"
                  value={transferSource ? `${transferSource.name} · ${transferSource.currency}` : 'Elegir cuenta'}
                  onPress={() => setActivePicker('transferSource')}
                  disabled={submitting}
                  accessibilityLabel={transferSource ? `Cuenta origen ${transferSource.name} ${transferSource.currency}` : 'Elegir cuenta de origen (no se permite tarjeta de credito)'}
                />
                <AppText variant="caption" tone="tertiary">
                  Solo cuentas de tipo Cuenta. Tarjetas de crédito no pueden ser origen.
                </AppText>
              </View>

              <View style={styles.fieldGroup}>
                <FormActionRow
                  label="Llega a"
                  value={transferDestination ? `${transferDestination.name} · ${transferDestination.currency}` : 'Elegir cuenta'}
                  onPress={() => setActivePicker('transferDestination')}
                  disabled={submitting || !transferSource}
                  accessibilityLabel={transferDestination ? `Cuenta destino ${transferDestination.name} ${transferDestination.currency}` : 'Elegir cuenta de destino (se permiten tarjetas de credito)'}
                />
              </View>

                {transferSource && transferDestination && transferSource.id === transferDestination.id ? (
                  <View style={styles.warnBox}>
                    <HomePlusIcon name="alert-circle-outline" size={18} color={colors.warning.strong} />
                    <AppText variant="bodySmall" tone="warning">Elegí dos cuentas distintas.</AppText>
                  </View>
                ) : null}

                {!transferCrossCurrency ? (
                  <MoneyInput
                    value={transferAmountText}
                    currency={transferCurrency}
                    onValueChange={handleTransferAmountChange}
                    onCurrencyChange={() => undefined}
                    availableCurrencies={[transferCurrency]}
                    label="Monto"
                    helperText="Magnitud positiva, sin convertir monedas."
                    disabled={submitting || !transferSource}
                    errorText={transferAmount.status === 'invalid' ? 'Revisa el monto.' : undefined}
                  />
                ) : (
                  <View style={styles.fieldGroup}>
                    <MoneyInput
                      value={transferAmountText}
                      currency={transferSource?.currency ?? 'ARS'}
                      onValueChange={handleTransferAmountChange}
                      onCurrencyChange={() => undefined}
                      availableCurrencies={[transferSource?.currency ?? 'ARS']}
                      label="Sale"
                      helperText="Monto en la moneda de origen."
                      disabled={submitting}
                      errorText={transferAmount.status === 'invalid' ? 'Revisa el monto.' : undefined}
                    />
                    <MoneyInput
                      value={destinationAmountText}
                      currency={transferDestination?.currency ?? 'ARS'}
                      onValueChange={handleDestinationAmountChange}
                      onCurrencyChange={() => undefined}
                      availableCurrencies={[transferDestination?.currency ?? 'ARS']}
                      label="Llega"
                      helperText="Monto declarado en la moneda de destino. No mostramos ni calculamos tipo de cambio."
                      disabled={submitting}
                      errorText={destinationAmount.status === 'invalid' ? 'Revisa el monto.' : undefined}
                    />
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <AppText variant="caption" tone="secondary" weight="700">Comisión</AppText>
                  <View style={styles.commissionMode}>
                    <InteractivePressable
                      onPress={setCommissionNone}
                      disabled={submitting}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={[styles.commissionOption, commissionMode === 'none' && styles.commissionOptionSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: commissionMode === 'none' }}
                      accessibilityLabel="Sin comisión"
                    >
                      <HomePlusIcon
                        name={commissionMode === 'none' ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={commissionMode === 'none' ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800">Ninguna</AppText>
                    </InteractivePressable>
                    <InteractivePressable
                      onPress={setCommissionCustom}
                      disabled={submitting || !transferSource}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={[styles.commissionOption, commissionMode === 'custom' && styles.commissionOptionSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: commissionMode === 'custom' }}
                      accessibilityLabel="Ingresar comisión (moneda de origen, sin categoría ni cuenta adicional)"
                    >
                      <HomePlusIcon
                        name={commissionMode === 'custom' ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={commissionMode === 'custom' ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800">Agregar comisión</AppText>
                    </InteractivePressable>
                  </View>
                  {commissionMode === 'custom' && transferSource ? (
                    <MoneyInput
                      value={commissionText}
                      currency={transferSource.currency}
                      onValueChange={handleCommissionChange}
                      onCurrencyChange={() => undefined}
                      availableCurrencies={[transferSource.currency]}
                      label="Monto de comisión"
                      helperText="Se registra como Expense (Comisiones e intereses) en la cuenta de origen. No te pedimos categoría ni cuenta aparte."
                      disabled={submitting}
                      errorText={commission.status === 'invalid' ? 'Revisa el monto.' : undefined}
                    />
                  ) : null}
                </View>

                <AppInput
                  label="Descripción (opcional)"
                  value={description}
                  onChangeText={(text) => { setDescription(text); setSubmitError(null); }}
                  placeholder="Transferencia, ahorro, pago..."
                  editable={!submitting}
                  returnKeyType="done"
                />

                {transferPreview ? (
                  <View style={styles.preview} accessibilityRole="summary">
                    <AppText variant="caption" tone="secondary" weight="800">Resumen</AppText>
                    <View style={styles.previewRow}>
                      <AppText variant="bodySmall" weight="700" numberOfLines={1}>Origen</AppText>
                      <AppText variant="bodySmall" weight="800" tone="primary" numberOfLines={2} style={styles.previewValue}>
                        {transferPreview.sourceLabel}
                      </AppText>
                    </View>
                    <View style={styles.previewRow}>
                      <AppText variant="bodySmall" weight="700" numberOfLines={1}>Destino</AppText>
                      <AppText variant="bodySmall" weight="800" tone="primary" numberOfLines={2} style={styles.previewValue}>
                        {transferPreview.destinationLabel}
                      </AppText>
                    </View>
                  </View>
                ) : null}

                {transferSourceBalanceInsufficient ? (
                  <View style={styles.warnBox}>
                    <HomePlusIcon name="alert-circle-outline" size={18} color={colors.warning.strong} />
                    <AppText variant="bodySmall" tone="warning" style={styles.errorInline}>
                      Saldo insuficiente para cubrir transferencia y comision.
                    </AppText>
                  </View>
                ) : null}
              </React.Fragment>
          ) : (
            <React.Fragment>
              <MoneyInput
                value={amountText}
                currency={currency}
                onValueChange={handleAmountChange}
                onCurrencyChange={handleCurrencyChange}
                availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
                disabled={submitting}
                errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
                helperText="Magnitud positiva, sin convertir monedas."
                testID="finance-new-movement-money-input"
              />

              <AppInput
                label="Descripcion (opcional)"
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setSubmitError(null);
                }}
                placeholder={operation === 'expense' ? 'Supermercado, farmacia, alquiler' : 'Sueldo, venta, reintegro'}
                editable={!submitting}
                returnKeyType="done"
              />
            </React.Fragment>
          )}

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              <FormActionRow
                label="Categoria"
                value={selectedCategory?.label ?? 'Sin categoria'}
                onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
                disabled={submitting || categoriesLoading}
                accessibilityLabel="Elegir categoria de gasto"
              />
              {categoriesError ? (
                <AppText variant="caption" tone="warning">
                  {categoriesError}
                </AppText>
              ) : categoriesLoading ? (
                <AppText variant="caption" tone="tertiary">
                  Cargando categorias
                </AppText>
              ) : null}
              {activePicker === 'category' ? (
                <View style={styles.categoryPicker} accessibilityLabel="Categorias de gasto">
                  <InteractivePressable
                    onPress={() => {
                      setSelectedCategoryId(null);
                      setActivePicker(null);
                    }}
                    haptic="light"
                    pressScale={motion.scale.card}
                    style={[styles.categoryOption, selectedCategoryId === null && styles.categoryOptionSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedCategoryId === null }}
                    accessibilityLabel="Sin categoria"
                  >
                    <HomePlusIcon
                      name={selectedCategoryId === null ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedCategoryId === null ? colors.terracotta[700] : colors.text.tertiary}
                    />
                    <AppText variant="bodySmall" weight="800">
                      Sin categoria
                    </AppText>
                  </InteractivePressable>
                  {categories.map((category) => {
                    const selected = category.id === selectedCategoryId;
                    return (
                      <InteractivePressable
                        key={category.id}
                        onPress={() => {
                          setSelectedCategoryId(category.id);
                          setActivePicker(null);
                        }}
                        haptic="light"
                        pressScale={motion.scale.card}
                        style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={category.label}
                      >
                        <HomePlusIcon
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={selected ? colors.terracotta[700] : colors.text.tertiary}
                        />
                        <AppText variant="bodySmall" weight="800" numberOfLines={1} style={styles.categoryLabel}>
                          {category.label}
                        </AppText>
                      </InteractivePressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              <FormActionRow
                label="Cuenta"
                value={selectedExpenseAccount ? `${selectedExpenseAccount.name} · ${selectedExpenseAccount.currency}` : 'Sin cuenta'}
                onPress={() => setActivePicker('expenseAccount')}
                disabled={submitting || expenseAccountsState.loading}
                accessibilityLabel="Elegir cuenta para gasto"
              />
              {expenseAccountsState.error ? (
                <AppText variant="caption" tone="warning">
                  {expenseAccountsState.error}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              {selectedExpenseAccount === null ? (
                <View style={styles.poolFieldDisabled}>
                  <FormActionRow
                    label="Pozo"
                    value="Elegí una cuenta para usar un pozo"
                    onPress={() => {}}
                    disabled={true}
                    accessibilityLabel="Pozo no disponible sin cuenta"
                  />
                  <AppText variant="caption" tone="tertiary">
                    Seleccioná una cuenta para poder asignar un pozo.
                  </AppText>
                </View>
              ) : selectedExpenseAccount.balanceState !== 'KNOWN' && selectedExpenseAccount.accountType !== 'CREDIT_CARD' ? (
                <View style={styles.poolFieldDisabled}>
                  <FormActionRow
                    label="Pozo"
                    value="Esta cuenta no tiene un saldo establecido"
                    onPress={() => {}}
                    disabled={true}
                    accessibilityLabel="Pozo no disponible para cuenta con saldo desconocido"
                  />
                  <AppText variant="caption" tone="tertiary">
                    El pozo requiere una cuenta con saldo conocido.
                  </AppText>
                </View>
              ) : (
                <FormActionRow
                  label="Pozo"
                  value={selectedExpensePool ? `${selectedExpensePool.name} · ${selectedExpensePool.balance} ${selectedExpensePool.currency}` : 'Sin pozo'}
                  onPress={() => setActivePicker('expensePool')}
                  disabled={submitting || expensePoolsState.loading || expensePoolsState.pools.length === 0}
                  accessibilityLabel={selectedExpensePool ? `Pozo ${selectedExpensePool.name}` : 'Elegir pozo para el gasto'}
                />
              )}
              {!userTouchedPool && categoryPoolDefault?.poolId && selectedExpensePool && categoryPoolDefault.poolId === selectedExpensePool.id && (
                <AppText variant="caption" tone="secondary">
                  Sugerido por {selectedCategory?.label ?? 'categoria'}
                </AppText>
              )}
              {expensePoolsState.error ? (
                <AppText variant="caption" tone="warning">
                  {expensePoolsState.error}
                </AppText>
              ) : expensePoolsState.pools.length === 0 && selectedExpenseAccount !== null && selectedExpenseAccount.balanceState === 'KNOWN' ? (
                <AppText variant="caption" tone="tertiary">
                  No tenés pozos activos.
                </AppText>
              ) : null}
            </View>
          ) : null}

          {isIncome(operation) ? (
            <React.Fragment>
              <View style={styles.fieldGroup}>
                <FormActionRow
                  label="Cuenta"
                  value={selectedIncomeAccount ? `${selectedIncomeAccount.name} · ${selectedIncomeAccount.currency}` : 'Sin cuenta'}
                  onPress={() => setActivePicker('incomeAccount')}
                  disabled={submitting || incomeAccountsState.loading}
                  accessibilityLabel="Elegir cuenta para ingreso"
                />
                {incomeAccountsState.error ? (
                  <AppText variant="caption" tone="warning">
                    {incomeAccountsState.error}
                  </AppText>
                ) : null}
              </View>

              {/* Income Pool Organizer */}
              <View style={styles.fieldGroup}>
                {selectedIncomeAccount === null ? (
                <View style={styles.poolFieldDisabled}>
                  <FormActionRow
                    label="Organizar ingreso"
                    value="Elegí una cuenta con saldo conocido para organizar este ingreso"
                    onPress={() => {}}
                    disabled={true}
                    accessibilityLabel="Organizar ingreso no disponible sin cuenta"
                  />
                </View>
              ) : selectedIncomeAccount.balanceState !== 'KNOWN' || selectedIncomeAccount.accountType === 'CREDIT_CARD' ? (
                <View style={styles.poolFieldDisabled}>
                  <FormActionRow
                    label="Organizar ingreso"
                    value="Esta cuenta no tiene un saldo establecido"
                    onPress={() => {}}
                    disabled={true}
                    accessibilityLabel="Organizar ingreso no disponible para cuenta con saldo desconocido"
                  />
                  <AppText variant="caption" tone="tertiary">
                    La organización en pozos requiere una cuenta de dinero con saldo conocido.
                  </AppText>
                </View>
              ) : (
                <React.Fragment>
                  <InteractivePressable
                    onPress={() => setIncomePoolOrganizerOpen((current) => !current)}
                    disabled={submitting}
                    haptic="light"
                    pressScale={motion.scale.card}
                    style={styles.incomePoolOrganizerTrigger}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: incomePoolOrganizerOpen }}
                    accessibilityLabel="Organizar ingreso"
                  >
                    <View style={styles.incomePoolOrganizerTriggerContent}>
                      <HomePlusIcon name="albums-outline" size={20} color={colors.sage[700]} />
                      <AppText variant="bodySmall" weight="800">
                        Organizar ingreso
                      </AppText>
                    </View>
                    <HomePlusIcon
                      name={incomePoolOrganizerOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </InteractivePressable>

                  {incomePoolOrganizerOpen && (
                    <View style={styles.incomePoolOrganizerContent}>
                      {incomePoolsState.loading ? (
                        <AppText variant="caption" tone="tertiary">Cargando pozos...</AppText>
                      ) : incomePoolsState.error ? (
                        <AppText variant="caption" tone="warning">{incomePoolsState.error}</AppText>
                      ) : incomePoolsState.pools.length === 0 ? (
                        <AppText variant="caption" tone="tertiary">No tenés pozos activos para este contexto y moneda.</AppText>
                      ) : (
                        <React.Fragment>
                          {incomePoolAllocations.length === 0 ? (
                            <AppText variant="caption" tone="tertiary" style={styles.incomePoolEmptyHint}>
                              Agregá un pozo para empezar a organizar el ingreso.
                            </AppText>
                          ) : null}

                          {incomePoolAllocations.map((allocation, index) => (
                            <View key={allocation.poolId} style={styles.incomePoolAllocationRow}>
                              <View style={styles.incomePoolAllocationPool}>
                                <AppText variant="bodySmall" weight="700" numberOfLines={1}>
                                  {incomePoolsState.pools.find(p => p.id === allocation.poolId)?.name ?? 'Pozo'}
                                </AppText>
                                <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                  {incomePoolsState.pools.find(p => p.id === allocation.poolId)?.balance ?? '0'} {currency}
                                </AppText>
                              </View>
                              <MoneyInput
                                value={allocation.amount}
                                currency={currency}
                                onValueChange={(next) => {
                                  const newAllocations = [...incomePoolAllocations];
                                  newAllocations[index] = { ...allocation, amount: next.technicalValue?.amount ?? '' };
                                  setIncomePoolAllocations(newAllocations);
                                  setSubmitError(null);
                                }}
                                onCurrencyChange={() => undefined}
                                availableCurrencies={[currency]}
                                disabled={submitting}
                                errorText={allocation.amount && (isNaN(Number(allocation.amount)) || Number(allocation.amount) <= 0) ? 'Revisa el monto.' : undefined}
                                label="Monto"
                                testID={`finance-income-pool-allocation-${index}`}
                              />
                              <InteractivePressable
                                onPress={() => {
                                  const newAllocations = incomePoolAllocations.filter((_, i) => i !== index);
                                  setIncomePoolAllocations(newAllocations);
                                  setSubmitError(null);
                                }}
                                disabled={submitting}
                                haptic="light"
                                pressScale={motion.scale.card}
                                style={styles.incomePoolRemoveButton}
                                accessibilityLabel="Quitar pozo"
                              >
                                <HomePlusIcon name="trash-outline" size={18} color={colors.danger.strong} />
                              </InteractivePressable>
                            </View>
                          ))}

                          <InteractivePressable
                            onPress={() => {
                              const availablePools = incomePoolsState.pools.filter(
                                p => !incomePoolAllocations.some(a => a.poolId === p.id)
                              );
                              if (availablePools.length > 0) {
                                const newAllocation = { poolId: availablePools[0].id, amount: '' };
                                setIncomePoolAllocations([...incomePoolAllocations, newAllocation]);
                              }
                            }}
                            disabled={submitting || incomePoolsState.pools.length <= incomePoolAllocations.length}
                            haptic="light"
                            pressScale={motion.scale.card}
                            style={styles.incomePoolAddButton}
                            accessibilityLabel="Agregar pozo"
                          >
                            <HomePlusIcon name="add-outline" size={18} color={colors.terracotta[700]} />
                            <AppText variant="bodySmall" weight="800">Agregar pozo</AppText>
                          </InteractivePressable>
                        </React.Fragment>
                      )}

                      {/* Live summary */}
                      {incomePoolAllocations.length > 0 && (
                        <View style={styles.incomePoolSummary}>
                          <View style={styles.incomePoolSummaryRow}>
                            <AppText variant="caption" tone="secondary" weight="700">Ingreso</AppText>
                            <AppText variant="bodySmall" weight="800" tone="primary">
                              {formatCanonicalAmountForDisplay(amount.technicalValue?.amount ?? '0')} {currency}
                            </AppText>
                          </View>
                          <View style={styles.incomePoolSummaryRow}>
                            <AppText variant="caption" tone="secondary" weight="700">Organizado</AppText>
                            <AppText variant="bodySmall" weight="800" tone="success">
                              {(() => {
                                let total = '0';
                                for (const a of incomePoolAllocations) {
                                  if (a.amount && !isNaN(Number(a.amount))) {
                                    total = String(Number(total) + Number(a.amount));
                                  }
                                }
                                return formatCanonicalAmountForDisplay(total);
                              })()} {currency}
                            </AppText>
                          </View>
                          <View style={styles.incomePoolSummaryRow}>
                            <AppText variant="caption" tone="secondary" weight="700">Sin asignar</AppText>
                            <AppText variant="bodySmall" weight="800" tone={(() => {
                              const incomeAmt = Number(amount.technicalValue?.amount ?? '0');
                              let allocated = 0;
                              for (const a of incomePoolAllocations) {
                                if (a.amount && !isNaN(Number(a.amount))) {
                                  allocated += Number(a.amount);
                                }
                              }
                              return allocated > incomeAmt ? 'danger' : 'tertiary';
                            })()}>
                              {(() => {
                                const incomeAmt = Number(amount.technicalValue?.amount ?? '0');
                                let allocated = 0;
                                for (const a of incomePoolAllocations) {
                                  if (a.amount && !isNaN(Number(a.amount))) {
                                    allocated += Number(a.amount);
                                  }
                                }
                                const remaining = incomeAmt - allocated;
                                return formatCanonicalAmountForDisplay(String(Math.max(0, remaining)));
                              })()} {currency}
                            </AppText>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </React.Fragment>
              )}
            </View>
          </React.Fragment>
        ) : null}

          {!isTransfer(operation) ? (
            <View style={styles.contextSummary}>
              <HomePlusIcon
                name={contextType === 'personal' ? 'person-outline' : 'home-outline'}
                size={18}
                color={colors.sage[700]}
              />
              <View style={styles.contextSummaryText}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Contexto financiero
                </AppText>
                <AppText variant="bodySmall" weight="800" numberOfLines={1}>
                  {contextLabel}
                </AppText>
              </View>
            </View>
          ) : null}

          <FormActionRow
            label="Fecha"
            value={formatHumanDate(date)}
            onPress={() => setActivePicker('date')}
            disabled={submitting}
            accessibilityLabel={`Fecha ${formatHumanDate(date)}`}
          />

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              <InteractivePressable
                onPress={() => setNotesExpanded((current) => !current)}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.moreDetails}
                accessibilityRole="button"
                accessibilityState={{ expanded: notesExpanded }}
                accessibilityLabel="Mas detalles"
              >
                <AppText variant="bodySmall" weight="800">
                  Mas detalles
                </AppText>
                <HomePlusIcon
                  name={notesExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={18}
                  color={colors.text.tertiary}
                />
              </InteractivePressable>
              {notesExpanded ? (
                <AppInput
                  label="Notas (opcional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Detalle privado del gasto"
                  variant="multiline"
                  editable={!submitting}
                  multiline
                />
              ) : null}
            </View>
          ) : null}

          {submitError ? (
            <View style={styles.errorBox}>
              <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
              <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                {submitError}
              </AppText>
            </View>
          ) : null}
        </KeyboardAwareScrollView>

        <DatePickerSheet
          visible={activePicker === 'date'}
          value={date}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => {
            setDate(nextDate);
            setActivePicker(null);
          }}
        />

        <AccountSelector
          visible={expenseAccountPickerVisible}
          title="Cuenta del gasto"
          subtitle="Opcional"
          accounts={expenseAccountsState.accounts}
          loading={expenseAccountsState.loading}
          error={expenseAccountsState.error}
          selectedAccountId={expenseAccountId}
          allowNone
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="expense"
          onRequestClose={() => setActivePicker(null)}
          onSelect={(account) => {
            setExpenseAccountId(account?.id ?? null);
            const accountCanUsePool =
              account !== null
              && (account.balanceState === 'KNOWN' || account.accountType === 'CREDIT_CARD');
            setExpensePoolId(
              !userTouchedPool && accountCanUsePool && categoryPoolDefault?.poolId
                ? categoryPoolDefault.poolId
                : null,
            );
            setUserTouchedPool(false);
            setActivePicker(null);
          }}
        />

        <AccountSelector
          visible={incomeAccountPickerVisible}
          title="Cuenta del ingreso"
          subtitle="Opcional"
          accounts={incomeAccountsState.accounts}
          loading={incomeAccountsState.loading}
          error={incomeAccountsState.error}
          selectedAccountId={incomeAccountId}
          allowNone
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="income"
          onRequestClose={() => setActivePicker(null)}
          onSelect={(account) => {
            setIncomeAccountId(account?.id ?? null);
            // Clear income pool allocations when account changes
            setIncomePoolAllocations([]);
            setActivePicker(null);
          }}
        />

        <AccountSelector
          visible={transferSourcePickerVisible}
          title="Cuenta de origen"
          subtitle="Solo cuentas de tipo Cuenta"
          accounts={transferSourceAccountsState.accounts}
          loading={transferSourceAccountsState.loading}
          error={transferSourceAccountsState.error}
          selectedAccountId={transferSource?.id ?? null}
          allowNone={false}
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="transfer-source"
          onRequestClose={() => setActivePicker(null)}
          onSelect={handleSelectTransferSource}
          onCreateAccount={() => setActivePicker(null)}
        />

        <AccountSelector
          visible={transferDestinationPickerVisible}
          title="Cuenta de destino"
          subtitle="Cuentas o tarjetas de crédito (excepto la de origen)"
          accounts={transferDestinationAccountsState.accounts.filter((a) => a.id !== transferSource?.id)}
          loading={transferDestinationAccountsState.loading}
          error={transferDestinationAccountsState.error}
          selectedAccountId={transferDestination?.id ?? null}
          allowNone={false}
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="transfer-destination"
          onRequestClose={() => setActivePicker(null)}
          onSelect={handleSelectTransferDestination}
          onCreateAccount={() => setActivePicker(null)}
        />

        <PoolSelectorSheet
          visible={expensePoolPickerVisible}
          title="Pozo del gasto"
          subtitle="Opcional"
          pools={expensePoolsState.pools}
          loading={expensePoolsState.loading}
          error={expensePoolsState.error}
          selectedPoolId={expensePoolId}
          allowNone
          disabled={submitting}
          onRequestClose={() => setActivePicker(null)}
          onSelect={(pool) => {
            setExpensePoolId(pool?.id ?? null);
            setUserTouchedPool(true);
            setActivePicker(null);
          }}
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
    position: 'relative',
  },
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  operationSelector: {
    minHeight: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.muted,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  operationOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  operationOptionSelected: {
    backgroundColor: colors.terracotta[600],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  categoryPicker: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing[2],
    gap: spacing[1],
  },
  categoryOption: {
    minHeight: 44,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryOptionSelected: {
    backgroundColor: colors.terracotta[50],
  },
  categoryLabel: {
    flex: 1,
    minWidth: 0,
  },
  noAccountsBlock: {
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  commissionMode: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  commissionOption: {
    flex: 1,
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  commissionOptionSelected: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  preview: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  previewValue: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  warnBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.warning.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  contextSummary: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextSummaryText: {
    flex: 1,
    minWidth: 0,
  },
  moreDetails: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  errorInline: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  footerButton: {
    flex: 1,
  },
  poolFieldDisabled: {
    gap: spacing[1],
  },
  incomePoolOrganizerTrigger: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incomePoolOrganizerTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  incomePoolOrganizerContent: {
    gap: spacing[3],
    paddingTop: spacing[1],
  },
  incomePoolAllocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  incomePoolAllocationPool: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0],
  },
  incomePoolRemoveButton: {
    minHeight: touchTargets.normal,
    minWidth: touchTargets.normal,
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  incomePoolAddButton: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
    backgroundColor: colors.terracotta[50],
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  incomePoolEmptyHint: {
    textAlign: 'center',
    marginVertical: spacing[2],
  },
  incomePoolSummary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.sage[50],
    padding: spacing[3],
    gap: spacing[1],
  },
  incomePoolSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
});
