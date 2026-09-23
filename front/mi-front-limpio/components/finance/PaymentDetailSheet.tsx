/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  getPaymentDueDetail,
  cancelPaymentDue,
  cancelPaymentSeries,
  skipPaymentDue,
  type PaymentDueDto,
  type PaymentSeriesDto,
  PAYMENT_KINDS,
  PAYMENT_SERIES_STATUSES,
  formatExpectedAmount,
  formatDueDateHuman,
  formatRecurrenceSummary,
  isPaymentOverdue,
  isPaymentPending,
  isPaymentPaid,
  isPaymentCancelled,
  isPaymentSkipped,
} from '../../services/finance/financePayments';
import {
  ActionSheet,
  AppButton,
  AppText,
  InteractivePressable,
  formatHumanDate,
} from '../ui';
import {
  FinanceDetailHeader,
  FinanceDetailMetaRow,
  FinanceDetailSection,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceListRow,
  FinanceSemanticSurface,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';
import { compareDecimalStrings } from '../../services/finance/accountDisplay';

type PaymentDetailSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  paymentId: string | null;
  refreshNonce?: number;
  onRequestClose: () => void;
  onRegisterPayment: (payment: PaymentDueDto) => void;
  onRegisterCreditCardPayment: (payment: PaymentDueDto) => void;
  onEditPayment: (payment: PaymentDueDto) => void;
  onOpenMovement: (payment: PaymentDueDto) => void;
  onRefresh: () => void;
};

export function PaymentDetailSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  paymentId,
  refreshNonce = 0,
  onRequestClose,
  onRegisterPayment,
  onRegisterCreditCardPayment,
  onEditPayment,
  onOpenMovement,
  onRefresh,
}: PaymentDetailSheetProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentDueDto | null>(null);
  const [series, setSeries] = useState<PaymentSeriesDto | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [cancelScope, setCancelScope] = useState<'single' | 'series'>('single');
  const [deleting, setDeleting] = useState(false);
  const paymentIdRef = useRef(paymentId);

  useEffect(() => {
    paymentIdRef.current = paymentId;
  }, [paymentId]);

  const loadDetail = useCallback(async () => {
    if (!accessToken || !paymentId) return;

    try {
      setLoading(true);
      setError(null);
      const detail = await getPaymentDueDetail({
        accessToken,
        contextType,
        dueId: paymentId,
      });
      setPayment(detail.paymentDue);
      setSeries(detail.paymentDue.paymentSeries ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar el detalle del pago.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, contextType, paymentId]);

  useEffect(() => {
    if (visible && paymentId) {
      loadDetail();
    } else {
      setPayment(null);
      setSeries(null);
      setLoading(true);
    }
  }, [visible, paymentId, accessToken, contextType, refreshNonce, loadDetail]);

  const handleRegister = () => {
    if (payment) {
      if (payment.kind === PAYMENT_KINDS.CREDIT_CARD) {
        onRegisterCreditCardPayment(payment);
      } else {
        onRegisterPayment(payment);
      }
      closeActionSheet();
    }
  };

  const handleEdit = () => {
    if (payment) {
      onEditPayment(payment);
      closeActionSheet();
    }
  };

  const handleOpenMovement = () => {
    if (payment) {
      onOpenMovement(payment);
    }
  };

  const handleCancel = () => {
    if (payment) {
      setCancelScope('single');
      setActionSheetVisible(true);
    }
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setCancelScope('single');
  };

  const confirmDelete = async () => {
    if (!payment || !accessToken) return;
    setDeleting(true);
    try {
      if (isActiveRecurring && cancelScope === 'single') {
        await skipPaymentDue(accessToken, contextType, payment.id);
      } else if (isActiveRecurring && cancelScope === 'series' && series) {
        await cancelPaymentSeries(accessToken, contextType, series.id);
      } else {
        await cancelPaymentDue(accessToken, contextType, payment.id);
      }
      closeActionSheet();
      onRefresh();
      onRequestClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No pudimos cancelar.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const close = () => {
    if (loading || deleting) return;
    onRequestClose();
  };

  const overdue = payment ? isPaymentOverdue(payment) : false;
  const pending = payment ? isPaymentPending(payment) : false;
  const paid = payment ? isPaymentPaid(payment) : false;
  const cancelled = payment ? isPaymentCancelled(payment) : false;
  const skipped = payment ? isPaymentSkipped(payment) : false;

  const expectedAmountDisplay = useMemo(
    () => payment ? formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency) : '',
    [payment],
  );

  const dueDateDisplay = useMemo(
    () => payment ? formatDueDateHuman(payment.dueDate, overdue) : '',
    [payment, overdue],
  );

  const showRegisterNormal = pending && payment?.kind === PAYMENT_KINDS.NORMAL;
  const showRegisterCreditCard = pending && payment?.kind === PAYMENT_KINDS.CREDIT_CARD;
  const creditCardRemaining = payment?.remaining ?? (payment?.expectedAmountKnown ? payment.expectedAmount ?? null : null);
  const creditCardPaidSoFar = payment?.paidSoFar ?? '0';
  const creditCardHasSettlementProgress = payment?.kind === PAYMENT_KINDS.CREDIT_CARD && compareDecimalStrings(creditCardPaidSoFar, '0') > 0;
  const showCreditCardProgress = payment?.kind === PAYMENT_KINDS.CREDIT_CARD && creditCardRemaining !== null;
  const isActiveRecurring = Boolean(series && series.status === PAYMENT_SERIES_STATUSES.ACTIVE);
  const showEdit = pending && !creditCardHasSettlementProgress;
  const showCancel = pending && !creditCardHasSettlementProgress;
  const amountLine = expectedAmountDisplay;
  const isCreditCard = payment?.kind === PAYMENT_KINDS.CREDIT_CARD;
  const paidAmountText = payment?.actualAmount
    ? formatExpectedAmount(true, payment.actualAmount, payment.currency)
    : 'Monto por definir';
  const canOpenMovement = Boolean(
    paid && payment && payment.actualAmount && (
      (payment.kind === PAYMENT_KINDS.NORMAL && payment.expenseRootTransactionId)
      || (payment.kind === PAYMENT_KINDS.CREDIT_CARD && payment.transferId)
    ),
  );
  const headerAmount = paid ? paidAmountText : amountLine;
  const headerSupporting = paid && payment
    ? `Pagado el ${formatHumanDate(payment.actualDate ?? '')}`
    : dueDateDisplay;
  const statusLabel = paid
    ? 'Pagado'
    : skipped
    ? 'Saltado'
    : cancelled
    ? 'Cancelado'
    : overdue
    ? 'Vencido'
    : 'Pendiente';
  const statusTone = paid
    ? 'success'
    : overdue
    ? 'danger'
    : cancelled || skipped
    ? 'tertiary'
    : 'primary';

  if (!visible) return null;

  return (
    <ActionSheet
      visible={visible}
      title={payment?.title ?? 'Detalle del pago'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={loading || deleting}
      size={FINANCE_SHEET_SIZE_POLICY.DETAIL}
    >
      <>
        {loading ? (
          <View style={styles.loading}>
            <AppText variant="bodySmall" tone="tertiary">Cargando...</AppText>
          </View>
        ) : error ? (
          <View style={styles.error}>
            <FinanceErrorState
              level="full"
              message={error}
              onRetry={loadDetail}
            />
          </View>
        ) : payment ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <FinanceDetailHeader
              title={payment.title}
              subtitle={isCreditCard ? 'Resumen de tarjeta' : 'Pago'}
              amount={headerAmount}
              amountTone={overdue ? 'danger' : 'primary'}
              supporting={headerSupporting}
            />

            <FinanceDetailMetaRow label="Estado" value={statusLabel} valueTone={statusTone} />
            <FinanceDetailMetaRow
              label="Vencimiento"
              value={dueDateDisplay}
              valueTone={overdue && pending ? 'danger' : 'primary'}
            />
            {payment.categoryId ? (
              <FinanceDetailMetaRow label="Categoría" value={payment.category?.label ?? 'Categoría'} />
            ) : null}
            {series ? (
              <FinanceDetailMetaRow label="Repetición" value={formatRecurrenceSummary(series)} />
            ) : null}
            {isCreditCard && payment.targetCreditCard ? (
              <FinanceDetailMetaRow label="Tarjeta" value={payment.targetCreditCard.name} />
            ) : null}

            {showCreditCardProgress ? (
              <FinanceSemanticSurface tone="neutral" testID="finance-card-due-progress">
                <FinanceDetailMetaRow label="Pagado" value={formatExpectedAmount(true, creditCardPaidSoFar, payment.currency)} valueTone="success" />
                <FinanceDetailMetaRow label="Restante" value={formatExpectedAmount(true, creditCardRemaining, payment.currency)} />
              </FinanceSemanticSurface>
            ) : null}

            {paid ? (
              <FinanceDetailSection title="Pago registrado">
                <FinanceDetailMetaRow label="Esperado" value={expectedAmountDisplay} />
                <FinanceDetailMetaRow label="Pagado" value={paidAmountText} valueTone="success" />
                <FinanceDetailMetaRow label="Pagado el" value={formatHumanDate(payment.actualDate ?? '')} />
                {payment.actualAccount ? (
                  <FinanceDetailMetaRow label="Cuenta" value={payment.actualAccount.name} />
                ) : null}
                {!isCreditCard && payment.actualCategory ? (
                  <FinanceDetailMetaRow label="Categoría del gasto" value={payment.actualCategory.label} />
                ) : null}
              </FinanceDetailSection>
            ) : null}

            {skipped ? (
              <FinanceSemanticSurface tone="neutral">
                <AppText variant="caption" tone="secondary">
                  Esta ocurrencia fue omitida y no generó gasto. La serie sigue activa.
                </AppText>
              </FinanceSemanticSurface>
            ) : null}

            {cancelled ? (
              <FinanceSemanticSurface tone="neutral">
                <AppText variant="caption" tone="secondary">
                  Este pago fue cancelado y no genera obligación.
                </AppText>
              </FinanceSemanticSurface>
            ) : null}

            {!paid && !cancelled && !skipped ? (
              <View style={styles.actions}>
                {showRegisterNormal ? (
                  <AppButton
                    title="Registrar pago"
                    variant="primary"
                    onPress={handleRegister}
                    style={styles.primaryAction}
                  />
                ) : null}
                {showRegisterCreditCard ? (
                  <AppButton
                    title={payment.isPartiallyPaid ? 'Pagar restante' : 'Pagar tarjeta'}
                    variant="primary"
                    onPress={handleRegister}
                    style={styles.primaryAction}
                  />
                ) : null}
                <View style={styles.secondaryActions}>
                  {showEdit ? (
                    <AppButton
                      title="Editar"
                      variant="secondary"
                      onPress={handleEdit}
                      size="sm"
                    />
                  ) : null}
                  {showCancel ? (
                    <AppButton
                      title={isActiveRecurring ? 'Omitir' : 'Cancelar'}
                      variant="danger"
                      onPress={handleCancel}
                      size="sm"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}

            {creditCardHasSettlementProgress && pending ? (
              <AppText variant="caption" tone="tertiary" style={styles.lockNote}>
                Podés pagar lo restante, pero no editarlo ni cancelarlo.
              </AppText>
            ) : null}

            {canOpenMovement ? (
              <FinanceListRow
                title="Ver movimiento"
                chevron
                divider={false}
                onPress={handleOpenMovement}
                accessibilityLabel="Ver movimiento asociado a este pago"
              />
            ) : null}
          </ScrollView>
        ) : null}

        <ActionSheet
          visible={actionSheetVisible}
          title={isActiveRecurring ? 'Omitir o cancelar' : 'Cancelar pago'}
          onRequestClose={closeActionSheet}
          closeDisabled={deleting}
          size={FINANCE_SHEET_SIZE_POLICY.CONFIRMATION}
          footer={(
            <FinanceFormFooter
              primaryTitle={isActiveRecurring
                ? (cancelScope === 'single' ? 'Omitir este pago' : 'Cancelar los siguientes')
                : 'Cancelar pago'}
              onPrimary={confirmDelete}
              destructive
              onCancel={closeActionSheet}
              cancelLabel="Volver"
              loading={deleting}
              divided={false}
            />
          )}
        >
          <View style={styles.confirmContent}>
            {isActiveRecurring ? (
              <View style={styles.cancelScopeGroup}>
                <AppText variant="bodySmall" weight="800">¿Qué querés hacer?</AppText>
                <ScopeOption
                  selected={cancelScope === 'single'}
                  label="Solo este pago"
                  onPress={() => setCancelScope('single')}
                  disabled={deleting}
                />
                <ScopeOption
                  selected={cancelScope === 'series'}
                  label="Este y los siguientes"
                  onPress={() => setCancelScope('series')}
                  disabled={deleting}
                />
                <AppText variant="caption" tone="tertiary">
                  {cancelScope === 'single'
                    ? 'No genera gasto. La serie continúa con los próximos pagos.'
                    : 'La serie deja de generar pagos. Los pagos ya registrados no se modifican.'}
                </AppText>
              </View>
            ) : (
              <AppText variant="bodySmall" tone="secondary">
                Este pago dejará de estar pendiente.
              </AppText>
            )}
          </View>
        </ActionSheet>
      </>
    </ActionSheet>
  );
}

function ScopeOption({
  selected,
  label,
  onPress,
  disabled,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.scopeOption, selected && styles.scopeOptionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <HomePlusIcon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={selected ? colors.terracotta[700] : colors.text.tertiary}
      />
      <AppText variant="bodySmall" weight="800" style={styles.scopeOptionLabel}>
        {label}
      </AppText>
    </InteractivePressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
  loading: {
    padding: spacing[6],
    alignItems: 'center',
  },
  error: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  content: {
    gap: spacing[3],
  },
  actions: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  primaryAction: {
    marginBottom: spacing[2],
  },
  secondaryActions: {
    gap: spacing[2],
  },
  lockNote: {
    marginTop: spacing[1],
  },
  confirmContent: {
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  cancelScopeGroup: {
    gap: spacing[2],
  },
  scopeOption: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  scopeOptionSelected: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  scopeOptionLabel: {
    flex: 1,
    minWidth: 0,
  },
  });
}
