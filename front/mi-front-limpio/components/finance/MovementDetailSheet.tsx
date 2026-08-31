import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceMovementDto, FinanceTransactionDetailDto } from '../../services/finance/financeMovements';
import type { FinanceActiveHousehold, FinanceContextType } from '../../services/finance/financeContext';
import { useEligiblePools } from '../../services/finance/financePoolEligibility';
import {
  assignExpenseToPoolClient,
  getExpensePoolAssignmentClient,
  unassignExpensePoolClient,
  type FinanceExpensePoolAssignmentResponse,
} from '../../services/finance/financePools';
import { parseMoneyInputText, type MoneyInputCurrencyCode, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppButton,
  AppText,
  DatePickerSheet,
  FormActionRow,
  InteractivePressable,
  formatHumanDate,
} from '../ui';
import { MoneyInput } from './MoneyInput';
import { PoolSelectorSheet } from './PoolSelectorSheet';

type SheetTitleConfig = {
  title: string;
  subtitle: string;
};

type MovementDetailSheetProps = {
  visible: boolean;
  movement: FinanceMovementDto | null;
  contextType: FinanceContextType;
  contextLabel: string;
  accessToken: string | null;
  personId: string | null;
  householdId: string | null;
  activeHousehold: FinanceActiveHousehold;
  onRequestClose: () => void;
  onTrashSuccess: () => void;
  onCorrectionIntent: (transactionId: string) => void;
  onRefundSuccess: () => void;
  onPoolAssignmentSuccess: () => void;
};

type DetailFlowStep =
  | 'detail'
  | 'recovery'
  | 'confirmTrash'
  | 'refundCreate'
  | 'refundSelect'
  | 'refundCorrect';

function getSheetTitleConfig(step: DetailFlowStep, contextLabel: string): SheetTitleConfig {
  switch (step) {
    case 'detail':
      return { title: 'Detalle del movimiento', subtitle: `Finanzas de ${contextLabel}` };
    case 'recovery':
      return { title: '¿Qué ocurrió?', subtitle: `Finanzas de ${contextLabel}` };
    case 'confirmTrash':
      return { title: '¿Enviar a Papelera?', subtitle: `Finanzas de ${contextLabel}` };
    case 'refundCreate':
      return { title: 'Me devolvieron', subtitle: `Finanzas de ${contextLabel}` };
    case 'refundSelect':
      return { title: '¿Cuál devolución?', subtitle: `Finanzas de ${contextLabel}` };
    case 'refundCorrect':
      return { title: 'Corregir devolución', subtitle: `Finanzas de ${contextLabel}` };
    default:
      return { title: 'Detalle del movimiento', subtitle: `Finanzas de ${contextLabel}` };
  }
}

function poolAssignmentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'finance_pool_archived':
        return 'Ese pozo está archivado. Elegí otro pozo activo.';
      case 'finance_pool_context_currency_mismatch':
        return 'Ese pozo no coincide con el contexto o la moneda del gasto.';
      case 'finance_expense_pool_account_required':
        return 'Este gasto necesita una cuenta para asignarle un pozo.';
      case 'finance_expense_pool_account_unknown':
        return 'La cuenta del gasto no tiene saldo establecido para asignar un pozo nuevo.';
      case 'finance_expense_not_found':
      case 'invalid_expense_state_for_pool_assignment':
        return 'Este gasto ya no está disponible para organizar.';
      case 'idempotency_conflict':
      case 'planner_idempotency_conflict':
        return 'La operación ya se intentó con otros datos. Cerrá y volvé a intentarlo.';
      default:
        return error.message;
    }
  }
  return 'No pudimos actualizar el pozo del gasto. Intenta de nuevo.';
}

export function MovementDetailSheet({
  visible,
  movement,
  contextType,
  contextLabel,
  accessToken,
  personId,
  householdId,
  activeHousehold,
  onRequestClose,
  onTrashSuccess,
  onCorrectionIntent,
  onRefundSuccess,
  onPoolAssignmentSuccess,
}: MovementDetailSheetProps) {
  const [step, setStep] = useState<DetailFlowStep>('detail');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceTransactionDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [trashMutationId, setTrashMutationId] = useState<string | null>(null);
  const [trashIdempotencyKey, setTrashIdempotencyKey] = useState<string | null>(null);
  const [refundMutationId, setRefundMutationId] = useState<string | null>(null);
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState<string | null>(null);
  const [refundAmountText, setRefundAmountText] = useState('');
  const [refundAmount, setRefundAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [refundDate, setRefundDate] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [poolAssignment, setPoolAssignment] = useState<FinanceExpensePoolAssignmentResponse | null>(null);
  const [poolAssignmentLoading, setPoolAssignmentLoading] = useState(false);
  const [poolSelectorOpen, setPoolSelectorOpen] = useState(false);
  const [poolRefreshNonce, setPoolRefreshNonce] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStep('detail');
      setError(null);
      setSubmitting(false);
      setTrashMutationId(null);
      setTrashIdempotencyKey(null);
      setRefundMutationId(null);
      setRefundIdempotencyKey(null);
      setRefundAmountText('');
      setRefundAmount(parseMoneyInputText('', 'ARS'));
      setRefundDate('');
      setSelectedRefundId(null);
      setDetail(null);
      setDetailLoading(false);
      setPoolAssignment(null);
      setPoolAssignmentLoading(false);
      setPoolSelectorOpen(false);
      setPoolRefreshNonce(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !movement || !accessToken) return;

    let cancelled = false;
    setDetailLoading(true);
    const load = async () => {
      try {
        const { getFinanceTransactionDetail } = await import('../../services/finance/financeMovements');
        const next = await getFinanceTransactionDetail({
          accessToken,
          contextType,
          transactionId: movement.id,
          contextScope: `finance-movement-detail:${movement.id}`,
        });
        if (!cancelled) setDetail(next);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, movement?.id, accessToken, contextType]);

  useEffect(() => {
    if (!visible || !movement || movement.transactionType !== 'expense' || !accessToken) {
      setPoolAssignment(null);
      setPoolAssignmentLoading(false);
      return;
    }

    let cancelled = false;
    const rootTransactionId = movement.rootTransactionId ?? movement.id;
    setPoolAssignmentLoading(true);

    getExpensePoolAssignmentClient({
      accessToken,
      contextType,
      rootTransactionId,
      contextScope: `finance-expense-pool-assignment:${contextType}:${rootTransactionId}:${poolRefreshNonce}`,
    })
      .then((next) => {
        if (cancelled) return;
        setPoolAssignment(next);
      })
      .catch(() => {
        if (cancelled) return;
        setPoolAssignment(null);
      })
      .finally(() => {
        if (!cancelled) setPoolAssignmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, movement?.id, movement?.rootTransactionId, movement?.transactionType, accessToken, contextType, poolRefreshNonce]);

  const currentForPool = detail ?? movement;
  const currentPoolAccountId = detail?.accountId ?? null;
  const currentPoolAccountType = detail?.accountType ?? null;
  const currentPoolAccountBalanceState = detail?.accountBalanceState ?? null;
  const currentPoolAssignment = poolAssignment?.assignment ?? null;
  const canAttemptPoolOrganization =
    visible
    && currentForPool?.transactionType === 'expense'
    && currentForPool.transferId === null
    && Boolean(currentPoolAccountId)
    && (
      currentPoolAccountType === 'CREDIT_CARD'
      || currentPoolAccountBalanceState === 'KNOWN'
      || currentPoolAssignment !== null
    );

  const poolOptionsState = useEligiblePools({
    accessToken,
    enabled: canAttemptPoolOrganization,
    contextType,
    transactionCurrency: currentForPool?.currency ?? 'ARS',
    activeHousehold,
  });

  const selectedPoolId = currentPoolAssignment?.poolId ?? null;
  const poolValueLabel = poolAssignmentLoading
    ? 'Actualizando'
    : currentPoolAssignment?.poolName ?? 'Sin pozo';
  const poolOrganizationDisabled = submitting || poolAssignmentLoading || !canAttemptPoolOrganization;

  useEffect(() => {
    if (step === 'confirmTrash' && !trashMutationId) {
      setTrashMutationId(generateMutationId());
      setTrashIdempotencyKey(createIdempotencyKey('finance.transaction.trash'));
    }
    if (step !== 'confirmTrash') {
      setTrashMutationId(null);
      setTrashIdempotencyKey(null);
    }
  }, [step, trashMutationId]);

  useEffect(() => {
    if ((step === 'refundCreate' || step === 'refundCorrect') && !refundMutationId) {
      setRefundMutationId(generateMutationId());
      setRefundIdempotencyKey(createIdempotencyKey(step === 'refundCreate' ? 'finance.refund.create' : 'finance.refund.correct'));
    }
    if (step !== 'refundCreate' && step !== 'refundCorrect') {
      setRefundMutationId(null);
      setRefundIdempotencyKey(null);
    }
  }, [step, refundMutationId]);

  const close = () => {
    if (submitting) return;
    if (step !== 'detail') {
      setStep('detail');
      setError(null);
      return;
    }
    onRequestClose();
  };

  const handleAlgoEstaMal = () => {
    setStep('recovery');
  };

  const handleLoAnoteMal = () => {
    if (!movement) return;
    onCorrectionIntent(movement.id);
    close();
  };

  const handleNuncaOcurrio = () => {
    setStep('confirmTrash');
  };

  const handlePoolSelect = async (pool: { id: string } | null) => {
    const current = currentForPool;
    if (!current || !accessToken || !personId || submitting) return;

    const rootTransactionId = current.rootTransactionId ?? current.id;
    const nextPoolId = pool?.id ?? null;
    if (nextPoolId === selectedPoolId) {
      setPoolSelectorOpen(false);
      return;
    }
    if (!nextPoolId && !selectedPoolId) {
      setPoolSelectorOpen(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (nextPoolId) {
        await assignExpenseToPoolClient({
          accessToken,
          contextType,
          currency: current.currency,
          expenseRootTransactionId: rootTransactionId,
          poolId: nextPoolId,
          personId,
          householdId,
          contextScope: `finance-expense-pool-assign:${contextType}:${rootTransactionId}`,
        });
      } else {
        await unassignExpensePoolClient({
          accessToken,
          contextType,
          currency: current.currency,
          expenseRootTransactionId: rootTransactionId,
          personId,
          householdId,
          contextScope: `finance-expense-pool-unassign:${contextType}:${rootTransactionId}`,
        });
      }

      setPoolSelectorOpen(false);
      setPoolRefreshNonce((value) => value + 1);
      poolOptionsState.refresh();
      onPoolAssignmentSuccess();
    } catch (err) {
      setError(poolAssignmentErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentForHandlers = detail ?? movement;
  const refundEvents = currentForHandlers?.refundEvents ?? [];
  const refundCurrency = (currentForHandlers?.currency ?? 'ARS') as MoneyInputCurrencyCode;
  const selectedRefundForHandlers = refundEvents.find((refund) => refund.id === selectedRefundId) ?? null;

  const resetRefundDraft = (mode: 'create' | 'correct', refundId?: string) => {
    const refund = refundId ? refundEvents.find((item) => item.id === refundId) : null;
    const amountText = refund?.amount ?? '';
    const date = refund?.effectiveDate ?? new Date().toISOString().slice(0, 10);
    setRefundAmountText(amountText);
    setRefundAmount(parseMoneyInputText(amountText, refundCurrency));
    setRefundDate(date);
    setSelectedRefundId(refund?.id ?? null);
    setError(null);
    setStep(mode === 'create' ? 'refundCreate' : 'refundCorrect');
  };

  const handleRefundCorrectionIntent = () => {
    if (refundEvents.length === 1) {
      resetRefundDraft('correct', refundEvents[0].id);
      return;
    }
    if (refundEvents.length > 1) {
      setStep('refundSelect');
    }
  };

  const handleConfirmTrash = async () => {
    if (!movement || !accessToken || !personId || submitting || !trashMutationId || !trashIdempotencyKey) return;

    setSubmitting(true);
    setError(null);

    try {
      const { trashFinanceTransaction } = await import('../../services/finance/financeMovements');
      await trashFinanceTransaction({
        accessToken,
        contextType,
        personId,
        householdId,
        transactionId: movement.id,
        mutationId: trashMutationId,
        idempotencyKey: trashIdempotencyKey,
      });
      onTrashSuccess();
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'finance_transaction_dependent_on_transfer') {
          setError('Este movimiento es una comisión generada por una Transferencia y no se puede enviar a Papelera por separado.');
        } else {
          setError(err.message);
        }
      } else {
        setError('No pudimos enviar el movimiento a Papelera. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRefund = async () => {
    if (!currentForHandlers || !accessToken || !personId || !refundMutationId || !refundIdempotencyKey || submitting || !refundAmount.isValid) return;
    if (!refundDate) {
      setError('Elegí la fecha de la devolución.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const service = await import('../../services/finance/financeMovements');
      if (step === 'refundCreate') {
        await service.createFinanceRefund({
          accessToken,
          contextType,
          personId,
          householdId,
          transactionId: currentForHandlers.id,
          amount: refundAmount.canonicalAmount ?? '',
          effectiveDate: refundDate,
          mutationId: refundMutationId,
          idempotencyKey: refundIdempotencyKey,
        });
      } else if (step === 'refundCorrect' && selectedRefundForHandlers) {
        await service.correctFinanceRefund({
          accessToken,
          contextType,
          personId,
          householdId,
          refundEventId: selectedRefundForHandlers.id,
          amount: refundAmount.canonicalAmount ?? '',
          effectiveDate: refundDate,
          mutationId: refundMutationId,
          idempotencyKey: refundIdempotencyKey,
        });
      }

      const { getFinanceTransactionDetail } = service;
      const next = await getFinanceTransactionDetail({
        accessToken,
        contextType,
        transactionId: currentForHandlers.id,
        contextScope: `finance-movement-detail-refund-refresh:${currentForHandlers.id}`,
      });
      setDetail(next);
      onRefundSuccess();
      setStep('detail');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No pudimos guardar la devolución. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !movement) return null;

  const current = detail ?? movement;
  const isExpense = current.transactionType === 'expense';
  const titleConfig = getSheetTitleConfig(step, contextLabel);

  const confirmTrashFooter = step === 'confirmTrash' ? (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Cancelar"
        onPress={() => setStep('recovery')}
        disabled={submitting}
        style={styles.footerButton}
      />
      <AppButton
        variant="danger"
        title="Enviar a Papelera"
        onPress={handleConfirmTrash}
        loading={submitting}
        disabled={submitting}
        style={styles.footerButton}
      />
    </View>
  ) : null;

  const refundFooter = step === 'refundCreate' || step === 'refundCorrect' ? (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Cancelar"
        onPress={() => setStep('detail')}
        disabled={submitting}
        style={styles.footerButton}
      />
      <AppButton
        title="Guardar"
        onPress={handleSaveRefund}
        loading={submitting}
        disabled={submitting || !refundAmount.isValid || !refundDate}
        style={styles.footerButton}
      />
    </View>
  ) : null;

  const footer = confirmTrashFooter ?? refundFooter;

  return (
    <ActionSheet
      visible={visible}
      title={titleConfig.title}
      subtitle={titleConfig.subtitle}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={footer}
    >
      <View style={styles.content}>
        {step === 'detail' && (
          <View style={styles.detailView}>
            {detailLoading ? (
              <AppText variant="caption" tone="tertiary">Actualizando detalle</AppText>
            ) : null}

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Tipo
              </AppText>
              <AppText variant="body" weight="800">
                {isExpense ? 'Gasto' : 'Ingreso'}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Monto
              </AppText>
              <AppText variant="title2" weight="800" tone={isExpense ? 'danger' : 'success'}>
                {formatFinanceAmount(current.amount, current.currency, {
                  sign: 'transaction',
                  transactionType: current.transactionType,
                })}
              </AppText>
            </View>

            {isExpense ? (
              <View style={styles.refundSummary}>
                <View style={styles.summaryLine}>
                  <AppText variant="bodySmall" tone="secondary" weight="700">Gastado</AppText>
                  <AppText variant="bodySmall" weight="800">{formatFinanceAmount(current.grossAmount ?? current.amount, current.currency, { sign: 'none' })}</AppText>
                </View>
                <View style={styles.summaryLine}>
                  <AppText variant="bodySmall" tone="secondary" weight="700">Devuelto</AppText>
                  <AppText variant="bodySmall" weight="800" tone="success">{formatFinanceAmount(current.totalRefunded ?? '0', current.currency, { sign: 'none' })}</AppText>
                </View>
                <View style={styles.summaryLine}>
                  <AppText variant="bodySmall" tone="secondary" weight="700">Gasto neto</AppText>
                  <AppText variant="body" weight="900">{formatFinanceAmount(current.netAmount ?? current.amount, current.currency, { sign: 'none' })}</AppText>
                </View>
              </View>
            ) : null}

            {isExpense ? (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Pozo
                </AppText>
                <AppText variant="body" weight="800" numberOfLines={1}>
                  {poolValueLabel}
                </AppText>
              </View>
            ) : null}

            {current.description ? (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Descripción
                </AppText>
                <AppText variant="body" numberOfLines={2}>{current.description}</AppText>
              </View>
            ) : null}

            {current.categoryLabelSnapshot ? (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Categoría
                </AppText>
                <AppText variant="body" numberOfLines={1}>{current.categoryLabelSnapshot}</AppText>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Fecha
              </AppText>
              <AppText variant="body" numberOfLines={1}>
                {new Date(current.transactionDate).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </AppText>
            </View>

            <View style={styles.divider} />

            {isExpense && current.transferId === null ? (
              <InteractivePressable
                onPress={() => resetRefundDraft('create')}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.refundEntry}
                accessibilityRole="button"
                accessibilityLabel={refundEvents.length === 0 ? 'Me devolvieron' : 'Agregar otra devolución'}
              >
                <HomePlusIcon name="arrow-undo-outline" size={20} color={colors.success.strong} />
                <AppText variant="body" weight="800" style={{ flex: 1 }}>
                  {refundEvents.length === 0 ? 'Me devolvieron' : 'Agregar otra devolución'}
                </AppText>
                <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
              </InteractivePressable>
            ) : null}

            {isExpense && refundEvents.length > 0 ? (
              <InteractivePressable
                onPress={handleRefundCorrectionIntent}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.refundCorrectionEntry}
                accessibilityRole="button"
                accessibilityLabel={refundEvents.length === 1 ? 'Corregir devolución' : 'Corregir una devolución'}
              >
                <HomePlusIcon name="create-outline" size={20} color={colors.terracotta[700]} />
                <AppText variant="body" weight="800" style={{ flex: 1 }}>
                  {refundEvents.length === 1 ? 'Corregir devolución' : 'Corregir una devolución'}
                </AppText>
                <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
              </InteractivePressable>
            ) : null}

            {isExpense && current.transferId === null ? (
              <React.Fragment>
                <InteractivePressable
                  onPress={() => setPoolSelectorOpen(true)}
                  disabled={poolOrganizationDisabled}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={styles.poolOrganizerEntry}
                  accessibilityRole="button"
                  accessibilityLabel="Organizar gasto por pozo"
                >
                  <HomePlusIcon name="albums-outline" size={20} color={colors.sage[700]} />
                  <AppText variant="body" weight="800" style={{ flex: 1 }}>
                    Organizar gasto
                  </AppText>
                  <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                </InteractivePressable>
                {!currentPoolAccountId ? (
                  <AppText variant="caption" tone="tertiary" style={styles.poolHint}>
                    Este gasto no tiene cuenta, por eso no puede consumir un pozo.
                  </AppText>
                ) : currentPoolAccountType !== 'CREDIT_CARD' && currentPoolAccountBalanceState !== 'KNOWN' && !currentPoolAssignment ? (
                  <AppText variant="caption" tone="tertiary" style={styles.poolHint}>
                    La cuenta del gasto no tiene saldo establecido para una asignación nueva.
                  </AppText>
                ) : null}
              </React.Fragment>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
                <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <InteractivePressable
              onPress={handleAlgoEstaMal}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryEntry}
              accessibilityRole="button"
              accessibilityLabel="Algo está mal"
            >
              <HomePlusIcon name="alert-circle-outline" size={20} color={colors.warning.strong} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Algo está mal
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
          </View>
        )}

        {step === 'refundSelect' && (
          <View style={styles.recoveryView}>
            {refundEvents.map((refund) => (
              <InteractivePressable
                key={refund.id}
                onPress={() => resetRefundDraft('correct', refund.id)}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.refundSelectRow}
                accessibilityRole="button"
                accessibilityLabel={`Devolución ${formatHumanDate(refund.effectiveDate)}`}
              >
                <AppText variant="bodySmall" weight="800" style={{ flex: 1 }}>
                  {formatHumanDate(refund.effectiveDate)}
                </AppText>
                <AppText variant="bodySmall" weight="900" tone="success">
                  {formatFinanceAmount(refund.amount, current.currency, { sign: 'none' })}
                </AppText>
              </InteractivePressable>
            ))}
          </View>
        )}

        {(step === 'refundCreate' || step === 'refundCorrect') && (
          <View style={styles.refundForm}>
            <MoneyInput
              label="Monto"
              value={refundAmountText}
              currency={refundCurrency}
              availableCurrencies={[refundCurrency]}
              onCurrencyChange={() => undefined}
              onValueChange={(next) => {
                setRefundAmountText(next.inputText);
                setRefundAmount(next);
                setError(null);
              }}
              errorText={refundAmount.status === 'invalid' ? 'Revisa el monto.' : undefined}
            />
            <FormActionRow
              label="Fecha"
              value={refundDate ? formatHumanDate(refundDate) : 'Elegir fecha'}
              onPress={() => setDatePickerOpen(true)}
              accessibilityLabel="Fecha de la devolución"
            />
            {error ? (
              <View style={styles.errorBox}>
                <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
                <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}
            <DatePickerSheet
              visible={datePickerOpen}
              value={refundDate}
              onClose={() => setDatePickerOpen(false)}
              onConfirm={(nextDate) => {
                setRefundDate(nextDate);
                setDatePickerOpen(false);
              }}
            />
          </View>
        )}

        {step === 'recovery' && (
          <View style={styles.recoveryView}>
            <AppText variant="body" style={styles.recoveryTitle}>
              ¿Qué ocurrió?
            </AppText>
            <InteractivePressable
              onPress={handleLoAnoteMal}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryOption}
              accessibilityRole="button"
              accessibilityLabel="Lo anoté mal"
            >
              <HomePlusIcon name="pencil-outline" size={20} color={colors.terracotta[700]} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Lo anoté mal
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            <AppText variant="caption" tone="tertiary" style={styles.recoveryHint}>
              El movimiento ocurrió, pero alguno de sus datos no es correcto.
            </AppText>
            <InteractivePressable
              onPress={handleNuncaOcurrio}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryOption}
              accessibilityRole="button"
              accessibilityLabel="Nunca ocurrió"
            >
              <HomePlusIcon name="trash-outline" size={20} color={colors.danger.strong} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Nunca ocurrió
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            <AppText variant="caption" tone="tertiary" style={styles.recoveryHint}>
              El movimiento dejará de afectar tus finanzas y podrás recuperarlo más adelante.
            </AppText>
          </View>
        )}

        {step === 'confirmTrash' && (
          <View style={styles.confirmView}>
            <AppText variant="body" style={styles.confirmTitle}>
              ¿Enviar a Papelera?
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
              Este movimiento dejará de afectar tus finanzas y podrás recuperarlo más adelante.
            </AppText>

            {error ? (
              <View style={styles.errorBox}>
                <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
                <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        <PoolSelectorSheet
          visible={poolSelectorOpen}
          title="Pozo del gasto"
          subtitle="Opcional"
          pools={poolOptionsState.pools}
          loading={poolOptionsState.loading}
          error={poolOptionsState.error}
          selectedPoolId={selectedPoolId}
          allowNone
          disabled={submitting}
          onRequestClose={() => setPoolSelectorOpen(false)}
          onSelect={handlePoolSelect}
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[2],
  },
  contentBounded: {
    flex: 1,
  },
  detailView: {
    gap: spacing[3],
  },
  detailRow: {
    gap: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
  },
  refundSummary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    padding: spacing[3],
    gap: spacing[2],
  },
  summaryLine: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  refundEntry: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success.base,
    backgroundColor: colors.success.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  refundCorrectionEntry: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  poolOrganizerEntry: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  poolHint: {
    textAlign: 'center',
  },
  refundSelectRow: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  refundForm: {
    gap: spacing[4],
  },
  recoveryEntry: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  recoveryView: {
    gap: spacing[3],
  },
  recoveryTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  recoveryOption: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
    backgroundColor: colors.danger.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  recoveryHint: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
  confirmView: {
    gap: spacing[3],
    alignItems: 'center',
  },
  confirmTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmMessage: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
    width: '100%',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    marginTop: spacing[2],
  },
  confirmButton: {
    flex: 1,
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
  errorButton: {
    width: '100%',
  },
  errorButtonInner: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerButton: {
    flex: 1,
  },
});
