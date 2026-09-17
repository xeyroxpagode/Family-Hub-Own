import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { ApiError } from '../../services/api';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  getPaymentDueDetail,
  cancelPaymentDue,
  cancelPaymentSeries,
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
} from '../../services/finance/financePayments';
import {
  ActionSheet,
  AppButton,
  AppText,
  InteractivePressable,
  formatHumanDate,
} from '../ui';

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
  onRefresh,
}: PaymentDetailSheetProps) {
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

  const loadDetail = async () => {
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
  };

  useEffect(() => {
    if (visible && paymentId) {
      loadDetail();
    } else {
      setPayment(null);
      setSeries(null);
      setLoading(true);
    }
  }, [visible, paymentId, accessToken, contextType, refreshNonce]);

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
      if (isActiveRecurring && cancelScope === 'series' && series) {
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
  const isActiveRecurring = Boolean(series && series.status === PAYMENT_SERIES_STATUSES.ACTIVE);
  const showEdit = pending;
  const showCancel = pending;
  const amountLine = expectedAmountDisplay;

  if (!visible) return null;

  return (
    <ActionSheet
      visible={visible}
      title={payment?.title ?? 'Detalle del pago'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={loading || deleting}
      size="content"
    >
      <>
        {loading ? (
          <View style={styles.loading}>
            <AppText variant="bodySmall" tone="tertiary">Cargando...</AppText>
          </View>
        ) : error ? (
          <View style={styles.error}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
            <AppButton title="Reintentar" variant="primary" size="sm" onPress={loadDetail} style={styles.retryButton} />
          </View>
        ) : payment ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <View style={styles.statusBadgeContainer}>
                <AppText
                  variant="caption"
                  weight="800"
                  tone={
                    paid ? 'success' : overdue ? 'danger' : cancelled ? 'tertiary' : 'primary'
                  }
                  style={styles.statusBadge}
                >
                  {paid ? 'Pagado' : overdue ? 'Vencido' : cancelled ? 'Cancelado' : 'Pendiente'}
                </AppText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                Monto esperado
              </AppText>
              <AppText variant="title3" weight="800" tone={payment?.expectedAmountKnown ? 'primary' : 'secondary'} style={styles.value}>
                {amountLine}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                Vencimiento
              </AppText>
              <AppText variant="body" weight="700" tone={overdue ? 'danger' : 'primary'} style={styles.value}>
                {dueDateDisplay}
              </AppText>
            </View>

            {payment?.categoryId && (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                  Categoría
                </AppText>
                <AppText variant="body" style={styles.value}>
                  {payment.category?.label ?? 'Categoría'}
                </AppText>
              </View>
            )}

            {series && (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                  Recurrencia
                </AppText>
                <AppText variant="body" weight="600" tone="secondary" style={styles.value}>
                  {formatRecurrenceSummary(series)}
                </AppText>
              </View>
            )}

            {payment?.kind === PAYMENT_KINDS.CREDIT_CARD && payment.targetCreditCard && (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                  Tarjeta
                </AppText>
                <AppText variant="body" weight="700" tone="primary" style={styles.value}>
                  {payment.targetCreditCard.name}
                </AppText>
              </View>
            )}

            {paid && (
              <View>
                <View style={styles.divider} />
                <AppText variant="caption" tone="secondary" weight="700" style={styles.sectionLabel}>
                  Detalle del pago registrado
                </AppText>
                <View style={styles.detailRow}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                    Monto real
                  </AppText>
                  <AppText variant="title3" weight="800" tone="success" style={styles.value}>
                    {payment.actualAmount} {payment.currency}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                    Fecha de pago
                  </AppText>
                  <AppText variant="body" style={styles.value}>
                    {formatHumanDate(payment.actualDate ?? '')}
                  </AppText>
                </View>
                {payment.kind === PAYMENT_KINDS.CREDIT_CARD && payment.actualAccountId && (
                  <View style={styles.detailRow}>
                    <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                      Pagado desde
                    </AppText>
                    <AppText variant="body" style={styles.value}>
                      {payment.actualAccount?.name ?? 'Cuenta de origen'}
                    </AppText>
                  </View>
                )}
                {payment.kind === PAYMENT_KINDS.NORMAL && payment.actualCategoryId && (
                  <View style={styles.detailRow}>
                    <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                      Categoría
                    </AppText>
                    <AppText variant="body" style={styles.value}>
                      {payment.actualCategory?.label ?? 'Categoría'}
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {cancelled && (
              <View>
                <View style={styles.divider} />
                <AppText variant="caption" tone="tertiary" weight="700" style={styles.sectionLabel}>
                  Este pago fue cancelado y no genera obligación.
                </AppText>
              </View>
            )}

            {!paid && !cancelled && (
              <View style={styles.actions}>
                {showRegisterNormal && (
                  <AppButton
                    title="Registrar pago"
                    variant="primary"
                    onPress={handleRegister}
                    style={styles.primaryAction}
                  />
                )}
                {showRegisterCreditCard && (
                  <AppButton
                    title="Pagar tarjeta"
                    variant="primary"
                    onPress={handleRegister}
                    style={styles.primaryAction}
                  />
                )}
                <View style={styles.secondaryActions}>
                  {showEdit && (
                    <AppButton
                      title="Editar"
                      variant="secondary"
                      onPress={handleEdit}
                      size="sm"
                    />
                  )}
                  {showCancel && (
                    <AppButton
                      title="Cancelar"
                      variant="danger"
                      onPress={handleCancel}
                      size="sm"
                    />
                  )}
                </View>
              </View>
            )}

            {paid && payment.expenseRootTransactionId && (
              <View style={styles.actions}>
                <AppButton
                  title="Ver movimiento"
                  variant="secondary"
                  onPress={() => {
                    // Navigation to movement detail would go here
                    // For now, close and let parent handle navigation
                  }}
                />
              </View>
            )}
          </ScrollView>
        ) : null}

        <ActionSheet
          visible={actionSheetVisible}
          title="Cancelar pago"
          onRequestClose={closeActionSheet}
          closeDisabled={deleting}
          size="content"
        >
          <View style={styles.confirmContent}>
            {isActiveRecurring ? (
              <View style={styles.cancelScopeGroup}>
                <AppText variant="bodySmall" weight="800">¿Qué querés cancelar?</AppText>
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
              </View>
            ) : (
              <AppText variant="bodySmall" tone="secondary">
                Este pago dejará de estar pendiente.
              </AppText>
            )}
            <AppButton
              title={isActiveRecurring ? 'Confirmar cancelación' : 'Cancelar pago'}
              variant="danger"
              onPress={confirmDelete}
              loading={deleting}
            />
            <AppButton title="Volver" variant="ghost" onPress={closeActionSheet} disabled={deleting} />
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

const styles = StyleSheet.create({
  loading: {
    padding: spacing[6],
    alignItems: 'center',
  },
  error: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  retryButton: {
    marginTop: spacing[2],
  },
  content: {
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  statusBadge: {
    minWidth: 90,
    minHeight: 28,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.terracotta[50],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  divider: {
    marginVertical: spacing[2],
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  sectionLabel: {
    marginBottom: spacing[2],
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
