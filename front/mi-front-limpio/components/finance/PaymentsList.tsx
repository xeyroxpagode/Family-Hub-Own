import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../ui';
import { listPaymentDues, listPaymentSeries, sortPaymentDuesForDisplay, groupPaymentDuesByStatus } from '../../services/finance/financePayments';
import { PaymentRow } from './PaymentRow';
import type { PaymentDueDto, PaymentSeriesDto } from '../../services/finance/financePayments';
import type { FinanceActiveHousehold, FinanceContextType } from '../../services/finance/financeContext';

type PaymentsListProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  activeHousehold: FinanceActiveHousehold;
  onCreatePayment: () => void;
  onPaymentPress: (payment: PaymentDueDto) => void;
  onRefresh: () => void;
};

const RECURRENCE_PRESETS = [
  { label: 'No se repite', value: null },
  { label: 'Cada semana', value: { unit: 'WEEK', count: 1 } },
  { label: 'Cada 2 semanas', value: { unit: 'WEEK', count: 2 } },
  { label: 'Cada mes', value: { unit: 'MONTH', count: 1 } },
  { label: 'Cada 2 meses', value: { unit: 'MONTH', count: 2 } },
  { label: 'Cada 3 meses', value: { unit: 'MONTH', count: 3 } },
  { label: 'Cada 6 meses', value: { unit: 'MONTH', count: 6 } },
  { label: 'Cada año', value: { unit: 'YEAR', count: 1 } },
];

export function PaymentsList({
  accessToken,
  contextType,
  activeHousehold,
  onCreatePayment,
  onPaymentPress,
  onRefresh,
}: PaymentsListProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDues, setPaymentDues] = useState<PaymentDueDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!accessToken) {
      setPaymentDues([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const [duesResult, seriesResult] = await Promise.all([
        listPaymentDues({
          accessToken,
          contextType,
        }),
        listPaymentSeries({
          accessToken,
          contextType,
          status: 'ACTIVE',
        }),
      ]);

      const seriesById = new Map(seriesResult.paymentSeries.map((series) => [series.id, series]));
      setPaymentDues(duesResult.paymentDues.map((due) => ({
        ...due,
        paymentSeries: due.paymentSeries ?? (due.paymentSeriesId ? seriesById.get(due.paymentSeriesId) ?? null : null),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar los pagos. Intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, contextType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    onRefresh();
  };

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const { overdue, upcoming, paid } = useMemo(
    () => groupPaymentDuesByStatus(sortPaymentDuesForDisplay(paymentDues)),
    [paymentDues],
  );

  const allDisplayed = [...overdue, ...upcoming, ...paid];

  if (loading && allDisplayed.length === 0) {
    return (
      <AppCard variant="quiet" padding="generous">
        <View style={styles.loading}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={14} />
          <Skeleton width="80%" height={14} />
        </View>
      </AppCard>
    );
  }

  if (error && allDisplayed.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar los pagos"
        description={error}
        onRetry={handleRefresh}
      />
    );
  }

  if (allDisplayed.length === 0) {
    return (
      <AppCard variant="quiet" padding="generous">
        <EmptyState
          title="No tenés pagos pendientes"
          description="Agregá tu primer pago para empezar a hacer seguimiento."
          illustration={<HomePlusIcon name="card-outline" size={30} color={colors.terracotta[600]} />}
          actionLabel="Agregar pago"
          onAction={onCreatePayment}
        />
      </AppCard>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="title3" weight="800">
          Pagos
        </AppText>
        <AppButton
          variant="icon"
          onPress={onCreatePayment}
          accessibilityLabel="Agregar pago"
          haptic="medium"
        >
          <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
        </AppButton>
      </View>

      {overdue.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" tone="danger" weight="800" style={styles.sectionTitle}>
            Necesitan atención ({overdue.length})
          </AppText>
          <AppCard variant="quiet" padding="default" style={styles.sectionCard}>
            {overdue.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} onPress={() => onPaymentPress(payment)} />
            ))}
          </AppCard>
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" tone="secondary" weight="800" style={styles.sectionTitle}>
            Próximos ({upcoming.length})
          </AppText>
          <AppCard variant="quiet" padding="default" style={styles.sectionCard}>
            {upcoming.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} onPress={() => onPaymentPress(payment)} />
            ))}
          </AppCard>
        </View>
      )}

      {paid.length > 0 && (
        <View style={styles.section}>
          <AppText variant="caption" tone="success" weight="800" style={styles.sectionTitle}>
            Pagados ({paid.length})
          </AppText>
          <AppCard variant="quiet" padding="default" style={styles.sectionCard}>
            {paid.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} onPress={() => onPaymentPress(payment)} />
            ))}
          </AppCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  loading: {
    gap: spacing[3],
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    paddingHorizontal: spacing[1],
  },
  sectionCard: {
    gap: 0,
  },
});
