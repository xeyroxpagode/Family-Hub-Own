/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  listFinanceCategories,
  type FinanceCategoryDto,
  getFinanceTransactionDetail,
} from '../../services/finance/financeMovements';
import {
  buildTransactionCorrectionPayload,
  getTransactionCorrectionSaveBlocker,
  getTransactionCorrectionChanges,
  isTransactionCorrectionAccountSelectionInvalid,
  loadTransactionCorrectionDetail,
  transactionCorrectionAccountReviewLabel,
  transactionCorrectionCategoryReviewLabel,
  transactionCorrectionCanonicalDraftFromDraft,
  transactionCorrectionDraftFromOriginal,
  transactionCorrectionDetailErrorMessage,
  transactionCorrectionOriginalFromDetail,
  type TransactionCorrectionDetailPrefetch,
  type TransactionCorrectionOriginal,
} from '../../services/finance/transactionCorrectionDetailLoad';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import {
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppInput,
  AppText,
  DatePickerSheet,
  formatHumanDate,
} from '../ui';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';
import {
  FinanceDetailMetaRow,
  FinanceDetailSection,
  FinanceDisclosureRow,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceGroupedSurface,
  FinanceListRow,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';

type CorrectionStep = 'loading' | 'form' | 'review' | 'submitting' | 'error';

type TransactionCorrectionSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  personId: string | null;
  householdId: string | null;
  transactionId: string;
  prefetchedDetail: TransactionCorrectionDetailPrefetch | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

type ActivePicker =
  | 'date'
  | 'category'
  | 'account'
  | null;

const isExpense = (type: 'expense' | 'income') => type === 'expense';

export function TransactionCorrectionSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  personId,
  householdId,
  transactionId,
  prefetchedDetail,
  onRequestClose,
  onSuccess,
}: TransactionCorrectionSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const initialPrefetchedDetail =
    prefetchedDetail?.transactionId === transactionId &&
    prefetchedDetail.contextType === contextType
      ? prefetchedDetail.detail
      : null;
  const initialOriginalTransaction = initialPrefetchedDetail
    ? transactionCorrectionOriginalFromDetail(initialPrefetchedDetail)
    : null;
  const initialDraft = initialOriginalTransaction
    ? transactionCorrectionDraftFromOriginal(initialOriginalTransaction)
    : null;

  const [step, setStep] = useState<CorrectionStep>(initialOriginalTransaction ? 'form' : 'loading');
  const [error, setError] = useState<string | null>(null);

  const [amountText, setAmountText] = useState(initialDraft?.amountText ?? '');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => initialDraft?.amount ?? parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>(initialDraft?.currency ?? 'ARS');
  const [description, setDescription] = useState(initialDraft?.description ?? '');
  const [notes, setNotes] = useState(initialDraft?.notes ?? '');
  const [date, setDate] = useState(initialDraft?.date ?? '');
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialDraft?.selectedCategoryId ?? null);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string | null>(
    initialOriginalTransaction?.categoryLabelSnapshot ?? null,
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctionMutationId, setCorrectionMutationId] = useState<string | null>(null);
  const [correctionIdempotencyKey, setCorrectionIdempotencyKey] = useState<string | null>(null);

  const [expenseAccountId, setExpenseAccountId] = useState<string | null>(initialDraft?.expenseAccountId ?? null);
  const [incomeAccountId, setIncomeAccountId] = useState<string | null>(initialDraft?.incomeAccountId ?? null);

  const [originalTransaction, setOriginalTransaction] = useState<TransactionCorrectionOriginal | null>(initialOriginalTransaction);
  const [retryNonce, setRetryNonce] = useState(0);

  const expenseAccountPickerVisible = activePicker === 'account' && isExpense(originalTransaction?.transactionType ?? 'expense');
  const incomeAccountPickerVisible = activePicker === 'account' && !isExpense(originalTransaction?.transactionType ?? 'expense');
  const activeHouseholdForAccounts = useMemo(
    () => (householdId ? { id: householdId, name: contextLabel } : null),
    [contextLabel, householdId],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const expenseAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && step === 'form' && isExpense(originalTransaction?.transactionType ?? 'expense'),
    operation: 'expense',
    contextType,
    transactionCurrency: currency,
    activeHousehold: activeHouseholdForAccounts,
  });

  const incomeAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && step === 'form' && !isExpense(originalTransaction?.transactionType ?? 'expense'),
    operation: 'income',
    contextType,
    transactionCurrency: currency,
    activeHousehold: activeHouseholdForAccounts,
  });

  const selectedExpenseAccount = useMemo(
    () => expenseAccountsState.accounts.find((account) => account.id === expenseAccountId) ?? null,
    [expenseAccountId, expenseAccountsState.accounts],
  );
  const selectedIncomeAccount = useMemo(
    () => incomeAccountsState.accounts.find((account) => account.id === incomeAccountId) ?? null,
    [incomeAccountId, incomeAccountsState.accounts],
  );

  const fetchDetailRef = useRef(0);

  useEffect(() => {
    if (!visible || !accessToken) {
      setStep('loading');
      setOriginalTransaction(null);
      return;
    }
    if (step !== 'loading' && originalTransaction?.id === transactionId) {
      return;
    }

    const myFetchId = ++fetchDetailRef.current;
    setError(null);

    if (initialPrefetchedDetail) {
      setOriginalTransaction(transactionCorrectionOriginalFromDetail(initialPrefetchedDetail));
      setStep('form');
      return;
    }

    setStep('loading');

    loadTransactionCorrectionDetail({
      transactionId,
      contextType,
      prefetchedDetail,
      fetchDetail: () =>
        getFinanceTransactionDetail({
          accessToken,
          contextType,
          transactionId,
        }),
    })
      .then((tx) => {
        if (fetchDetailRef.current !== myFetchId) return;
        setOriginalTransaction(transactionCorrectionOriginalFromDetail(tx));
        setStep('form');
      })
      .catch((err: unknown) => {
        if (fetchDetailRef.current !== myFetchId) return;
        setError(transactionCorrectionDetailErrorMessage(err));
        setStep('error');
      });
  }, [visible, accessToken, contextType, transactionId, initialPrefetchedDetail, prefetchedDetail, retryNonce, step, originalTransaction?.id]);

  useEffect(() => {
    if (step !== 'form' || !originalTransaction) return;

    const draft = transactionCorrectionDraftFromOriginal(originalTransaction);
    setAmountText(draft.amountText);
    setAmount(draft.amount);
    setCurrency(draft.currency);
    setDescription(draft.description);
    setNotes(draft.notes);
    setDate(draft.date);
    setSelectedCategoryId(draft.selectedCategoryId);
    setSelectedCategoryLabel(originalTransaction.categoryLabelSnapshot ?? null);
    setExpenseAccountId(draft.expenseAccountId);
    setIncomeAccountId(draft.incomeAccountId);
    setSubmitError(null);
    setSubmitting(false);
    setCorrectionMutationId(null);
    setCorrectionIdempotencyKey(null);
    setNotesExpanded(false);
  }, [step, originalTransaction]);

  useEffect(() => {
    if (!visible || step !== 'form' || !originalTransaction || !accessToken) {
      setCategories([]);
      setCategoriesError(null);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    listFinanceCategories(accessToken, contextType, originalTransaction.transactionType)
      .then((payload) => {
        if (cancelled) return;
        const selectableCategories = payload.categories.filter(
          (category) => category.type === originalTransaction.transactionType && category.selectable,
        );
        setCategories(selectableCategories);
        const selected = selectableCategories.find((category) => category.id === selectedCategoryId);
        if (selected) setSelectedCategoryLabel(selected.label);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setCategoriesError('No pudimos cargar las categorias. Podes corregir sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, originalTransaction, visible, step]);

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const handleCurrencyChange = (nextCurrency: MoneyInputCurrencyCode) => {
    setCurrency(nextCurrency);
    setAmount(parseMoneyInputText(amountText, nextCurrency));
    setSubmitError(null);
  };

  const handleCancel = () => {
    onRequestClose();
  };

  const canonicalDraft = useMemo(() => {
    if (!originalTransaction) return null;
    return transactionCorrectionCanonicalDraftFromDraft(originalTransaction, {
      amountText,
      amount,
      currency,
      description,
      notes,
      date,
      selectedCategoryId,
      expenseAccountId,
      incomeAccountId,
    });
  }, [
    originalTransaction,
    amountText,
    amount,
    currency,
    description,
    notes,
    date,
    selectedCategoryId,
    expenseAccountId,
    incomeAccountId,
  ]);

  const currentAccount = originalTransaction && isExpense(originalTransaction.transactionType)
    ? selectedExpenseAccount
    : selectedIncomeAccount;
  const currentAccountsState = originalTransaction && isExpense(originalTransaction.transactionType)
    ? expenseAccountsState
    : incomeAccountsState;
  const accountSelectionInvalid = isTransactionCorrectionAccountSelectionInvalid({
    original: originalTransaction,
    draft: canonicalDraft,
    selectedAccountExists: Boolean(currentAccount),
    accountsLoading: currentAccountsState.loading,
    accountsError: currentAccountsState.error,
  });

  const changes = useMemo(() => {
    if (!originalTransaction || !canonicalDraft) return [];
    return getTransactionCorrectionChanges({
      original: originalTransaction,
      draft: canonicalDraft,
      formatAmount: (value, valueCurrency, transactionTypeValue) => formatFinanceAmount(value, valueCurrency, {
        sign: 'transaction',
        transactionType: transactionTypeValue,
      }),
      formatDate: formatHumanDate,
      categoryLabel: selectedCategory?.label ?? selectedCategoryLabel,
      accountLabel: currentAccount ? `${currentAccount.name} · ${currentAccount.currency}` : null,
    });
  }, [originalTransaction, canonicalDraft, selectedCategory, selectedCategoryLabel, currentAccount]);

  const hasChanges = changes.length > 0;
  const canSubmit = Boolean(accessToken) && amount.isValid && !accountSelectionInvalid;

  const submitForm = () => {
    if (!canSubmit || !hasChanges || !originalTransaction) return;
    Keyboard.dismiss();
    setSubmitError(null);

    setCorrectionMutationId(generateMutationId());
    setCorrectionIdempotencyKey(createIdempotencyKey('finance.transaction.correct'));
    setStep('review');
  };

  const handleReviewBack = () => {
    if (submitting) return;
    setCorrectionMutationId(null);
    setCorrectionIdempotencyKey(null);
    setStep('form');
  };

  const handleConfirm = async () => {
    const saveBlocker = getTransactionCorrectionSaveBlocker({
      submitting,
      mutationId: correctionMutationId,
      idempotencyKey: correctionIdempotencyKey,
      original: originalTransaction,
      draft: canonicalDraft,
      accessToken,
      personId,
      accountSelectionInvalid,
    });
    if (saveBlocker) {
      if (saveBlocker !== 'submitting') {
        setError('No pudimos preparar la correccion. Volve al formulario e intenta de nuevo.');
      }
      return;
    }

    if (
      !originalTransaction ||
      !canonicalDraft ||
      !accessToken ||
      !personId ||
      !correctionMutationId ||
      !correctionIdempotencyKey
    ) {
      setError('No pudimos preparar la corrección. Volvé al formulario e intentá de nuevo.');
      return;
    }

    const original = originalTransaction;
    const draft = canonicalDraft;
    const token = accessToken;
    const currentPersonId = personId;
    const mutationId = correctionMutationId;
    const idempotencyKey = correctionIdempotencyKey;

    setSubmitting(true);
    setError(null);
    setStep('submitting');

    try {
      const { correctFinanceTransaction } = await import('../../services/finance/financeMovements');
      const payload = buildTransactionCorrectionPayload(contextType, original, draft);
      await correctFinanceTransaction({
        accessToken: token,
        personId: currentPersonId,
        householdId,
        mutationId,
        idempotencyKey,
        ...payload,
      });
      onSuccess();
      handleCancel();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No pudimos corregir el movimiento. Intentá de nuevo.');
      }
      setSubmitting(false);
      setStep('form');
    }
  };

  const handleRetry = () => {
    setError(null);
    setOriginalTransaction(null);
    setStep('loading');
    setRetryNonce((current) => current + 1);
  };

  if (!visible) return null;

  const transactionType = originalTransaction?.transactionType ?? 'expense';

  const footer = step === 'form' ? (
    <FinanceFormFooter
      primaryTitle="Continuar"
      onPrimary={submitForm}
      onCancel={handleCancel}
      primaryDisabled={!canSubmit || !hasChanges}
      divided={false}
    />
  ) : step === 'review' ? (
    <FinanceFormFooter
      primaryTitle="Guardar corrección"
      onPrimary={handleConfirm}
      onCancel={handleReviewBack}
      cancelLabel="Volver"
      primaryDisabled={submitting || changes.length === 0}
      loading={submitting}
      divided={false}
    />
  ) : step === 'error' ? (
    <FinanceFormFooter
      primaryTitle="Reintentar"
      onPrimary={handleRetry}
      onCancel={handleCancel}
      divided={false}
    />
  ) : null;

  const loadingContent = (
    <View style={styles.loadingView}>
      <HomePlusIcon name="refresh-outline" size={32} color={colors.terracotta[700]} />
      <AppText variant="body" weight="800" style={styles.loadingTitle}>
        Cargando detalle del movimiento
      </AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.loadingMessage}>
        Por favor espera mientras obtenemos la información.
      </AppText>
    </View>
  );

  const errorContent = (
    <View style={styles.errorView}>
      <HomePlusIcon name="alert-circle-outline" size={32} color={colors.danger.strong} />
      <AppText variant="body" weight="800" style={styles.errorTitle}>
        No pudimos cargar el detalle
      </AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.errorMessage}>
        {error}
      </AppText>
    </View>
  );

  const formContent = originalTransaction ? (
    <View style={styles.sheetBody}>
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.form}
      >
        <FinanceDetailMetaRow
          label="Tipo"
          value={transactionType === 'expense' ? 'Gasto' : 'Ingreso'}
        />

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={handleAmountChange}
          onCurrencyChange={handleCurrencyChange}
          availableCurrencies={['ARS', 'USD', 'EUR']}
          disabled={false}
          errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
        />

        <AppInput
          label="Descripción (opcional)"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setSubmitError(null);
          }}
          placeholder={transactionType === 'expense' ? 'Supermercado, farmacia, alquiler' : 'Sueldo, venta, reintegro'}
          editable={true}
          returnKeyType="done"
        />

        <View style={styles.fieldGroup}>
          <FinanceSelectionRow
            label="Categoría"
            value={transactionCorrectionCategoryReviewLabel({
              original: originalTransaction,
              selectedCategoryId,
              selectedCategoryLabel: selectedCategory?.label ?? selectedCategoryLabel,
            }) ?? undefined}
            placeholder="Sin categoría"
            onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
            disabled={categoriesLoading}
            accessibilityLabel={`Elegir categoría de ${transactionType === 'expense' ? 'gasto' : 'ingreso'}`}
          />
          {categoriesError ? (
            <AppText variant="caption" tone="warning">
              {categoriesError}
            </AppText>
          ) : categoriesLoading ? (
            <AppText variant="caption" tone="tertiary">
              Cargando categorías
            </AppText>
          ) : null}
          {activePicker === 'category' ? (
            <FinanceGroupedSurface testID={`Categorías de ${transactionType === 'expense' ? 'gasto' : 'ingreso'}`}>
              <FinanceListRow
                title="Sin categoría"
                icon={
                  <HomePlusIcon
                    name={selectedCategoryId === null ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedCategoryId === null ? colors.terracotta[700] : colors.text.tertiary}
                  />
                }
                onPress={() => {
                  setSelectedCategoryId(null);
                  setSelectedCategoryLabel(null);
                  setActivePicker(null);
                }}
                accessibilityLabel="Sin categoría"
              />
              {categories.map((category, index) => {
                const selected = category.id === selectedCategoryId;
                return (
                  <FinanceListRow
                    key={category.id}
                    title={category.label}
                    titleNumberOfLines={2}
                    icon={
                      <HomePlusIcon
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                    }
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedCategoryLabel(category.label);
                      setActivePicker(null);
                    }}
                    divider={index < categories.length - 1}
                    accessibilityLabel={category.label}
                  />
                );
              })}
            </FinanceGroupedSurface>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <FinanceSelectionRow
            label="Cuenta"
            value={transactionCorrectionAccountReviewLabel({
              original: originalTransaction,
              selectedAccountId: canonicalDraft?.accountId ?? null,
              selectedAccountLabel: currentAccount ? `${currentAccount.name} · ${currentAccount.currency}` : null,
            }) ?? undefined}
            placeholder="Sin cuenta"
            onPress={() => setActivePicker('account')}
            disabled={transactionType === 'expense' ? expenseAccountsState.loading : incomeAccountsState.loading}
            accessibilityLabel={`Elegir cuenta para ${transactionType === 'expense' ? 'gasto' : 'ingreso'}`}
          />
          {(transactionType === 'expense' ? expenseAccountsState.error : incomeAccountsState.error) ? (
            <AppText variant="caption" tone="warning">
              {(transactionType === 'expense' ? expenseAccountsState.error : incomeAccountsState.error)!}
            </AppText>
          ) : accountSelectionInvalid ? (
            <AppText variant="caption" tone="warning">
              Elegí una cuenta compatible con la moneda o seleccioná Sin cuenta.
            </AppText>
          ) : null}
        </View>

        <FinanceSelectionRow
          label="Fecha"
          value={formatHumanDate(date)}
          onPress={() => setActivePicker('date')}
          disabled={false}
          accessibilityLabel={`Fecha ${formatHumanDate(date)}`}
        />

        <FinanceDisclosureRow
          label="Más detalles"
          expanded={notesExpanded}
          onToggle={() => setNotesExpanded((current) => !current)}
          accessibilityLabel="Más detalles"
        >
          <AppInput
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Detalle privado del movimiento"
            variant="multiline"
            editable={true}
            multiline
          />
        </FinanceDisclosureRow>

        {submitError ? (
          <FinanceErrorState level="form" message={submitError} />
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
        activeHousehold={householdId ? { id: householdId, name: contextLabel } : null}
        disabled={false}
        operationHint="expense"
        onRequestClose={() => setActivePicker(null)}
        onSelect={(account) => {
          setExpenseAccountId(account?.id ?? null);
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
        activeHousehold={householdId ? { id: householdId, name: contextLabel } : null}
        disabled={false}
        operationHint="income"
        onRequestClose={() => setActivePicker(null)}
        onSelect={(account) => {
          setIncomeAccountId(account?.id ?? null);
          setActivePicker(null);
        }}
      />
    </View>
  ) : null;

  const reviewContent = originalTransaction ? (
    <View style={styles.reviewContent}>
      {changes.length === 0 ? (
        <View style={styles.noChanges}>
          <HomePlusIcon name="checkmark-circle-outline" size={32} color={colors.success.strong} />
          <AppText variant="body" weight="800" style={styles.noChangesTitle}>
            Sin cambios
          </AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.noChangesMessage}>
            No hay diferencias para corregir.
          </AppText>
        </View>
      ) : (
        <FinanceDetailSection title="Se aplicarán los siguientes cambios">
          {changes.map((change, index) => (
            <FinanceDetailMetaRow
              key={index}
              label={change.label}
              value={`${change.oldValue} → ${change.newValue}`}
            />
          ))}
        </FinanceDetailSection>
      )}

      {error ? (
        <FinanceErrorState level="form" message={error} />
      ) : null}
    </View>
  ) : null;

  const content = step === 'loading'
    ? loadingContent
    : step === 'error'
    ? errorContent
    : step === 'form'
    ? formContent
    : step === 'review' || step === 'submitting'
    ? reviewContent
    : null;

  return (
    <ActionSheet
      visible={visible}
      title={step === 'loading' ? 'Cargando...' : step === 'review' || step === 'submitting' ? 'Revisá la corrección' : 'Corregir movimiento'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={handleCancel}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.LONG_FORM}
      footer={footer}
    >
      {content}
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { spacing } = theme;

  return StyleSheet.create({
  sheetBody: {
    flexShrink: 1,
    minHeight: 0,
    position: 'relative',
  },
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  loadingView: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  loadingTitle: {
    textAlign: 'center',
  },
  loadingMessage: {
    textAlign: 'center',
  },
  errorView: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    width: '100%',
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
  },
  reviewContent: {
    gap: spacing[4],
    paddingBottom: spacing[2],
  },
  noChanges: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  noChangesTitle: {
    textAlign: 'center',
  },
  noChangesMessage: {
    textAlign: 'center',
  },
  });
}
