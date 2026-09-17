import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import { formatFinanceDateGroupLabel } from '../../services/finance/financePeriod';
import type { FinanceTransferDetailDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppText,
  InteractivePressable,
  Skeleton,
} from '../ui';

type TransferDetailSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  transferId: string | null;
  onRequestClose: () => void;
};

export function TransferDetailSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  transferId,
  onRequestClose,
}: TransferDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceTransferDetailDto | null>(null);
  const transferIdRef = useRef(transferId);

  useEffect(() => {
    transferIdRef.current = transferId;
  }, [transferId]);

  const loadDetail = async () => {
    if (!accessToken || !transferIdRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const { getFinanceTransferDetail } = await import('../../services/finance/financeMovements');
      const next = await getFinanceTransferDetail({
        accessToken,
        contextType,
        transferId: transferIdRef.current,
      });
      setDetail(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar la transferencia';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && transferId) {
      loadDetail();
    } else {
      setDetail(null);
      setLoading(true);
      setError(null);
    }
  }, [visible, transferId, accessToken, contextType]);

  const close = () => {
    if (loading) return;
    onRequestClose();
  };

  const isCardPayment = detail?.destinationAccount.accountType === 'CREDIT_CARD';
  const isCrossCurrency = detail?.sourceCurrency !== detail?.destinationCurrency;

  if (!visible) return null;

  return (
    <ActionSheet
      visible={visible}
      title={isCardPayment ? 'Pago de tarjeta' : 'Transferencia'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={loading}
      size="content"
    >
      <>
        {loading ? (
          <View style={styles.loading}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="40%" height={14} />
          </View>
        ) : error ? (
          <View style={styles.error}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
            <InteractivePressable
              onPress={loadDetail}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
            >
              <AppText variant="bodySmall" weight="700" tone="brand">Reintentar</AppText>
            </InteractivePressable>
          </View>
        ) : detail ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                Fecha
              </AppText>
              <AppText variant="body" weight="700" style={styles.value}>
                {formatFinanceDateGroupLabel(detail.date)}
              </AppText>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.accountSection}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.sectionLabel}>
                Desde
              </AppText>
              <View style={styles.accountRow}>
                <View style={styles.accountInfo}>
                  <AppText variant="body" weight="800" numberOfLines={1}>
                    {detail.sourceAccount.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {detail.sourceAccount.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'}
                  </AppText>
                </View>
                <AppText variant="title3" weight="800" tone="primary" style={styles.amountValue}>
                  {formatFinanceAmount(detail.sourceAmount, detail.sourceCurrency, { sign: 'none' })}
                </AppText>
              </View>
            </View>

            <View style={styles.arrowRow}>
              <HomePlusIcon name="arrow-down-outline" size={20} color={colors.text.tertiary} />
            </View>

            <View style={styles.accountSection}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.sectionLabel}>
                Hacia
              </AppText>
              <View style={styles.accountRow}>
                <View style={styles.accountInfo}>
                  <AppText variant="body" weight="800" numberOfLines={1}>
                    {detail.destinationAccount.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {detail.destinationAccount.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'}
                  </AppText>
                </View>
                <AppText variant="title3" weight="800" tone="primary" style={styles.amountValue}>
                  {formatFinanceAmount(detail.destinationAmount, detail.destinationCurrency, { sign: 'none' })}
                </AppText>
              </View>
            </View>

            {detail.description && (
              <>
                <View style={styles.sectionDivider} />
                <View style={styles.detailRow}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                    Detalle
                  </AppText>
                  <AppText variant="body" numberOfLines={3} style={styles.value}>
                    {detail.description}
                  </AppText>
                </View>
              </>
            )}

            {detail.notes && (
              <>
                <View style={styles.sectionDivider} />
                <View style={styles.detailRow}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.label}>
                    Notas
                  </AppText>
                  <AppText variant="body" numberOfLines={3} style={styles.value}>
                    {detail.notes}
                  </AppText>
                </View>
              </>
            )}

            {detail.commission && detail.commission.amount && (
              <>
                <View style={styles.sectionDivider} />
                <View style={styles.commissionRow}>
                  <View style={styles.commissionInfo}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Comisión asociada
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      Se registra como gasto separado.
                    </AppText>
                  </View>
                  <AppText variant="body" weight="800" tone="danger">
                    {formatFinanceAmount(detail.commission.amount, detail.commission.currency ?? detail.sourceCurrency, { sign: 'none' })}
                  </AppText>
                </View>
              </>
            )}
          </ScrollView>
        ) : null}
      </>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  error: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  retryButton: {
    marginTop: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.terracotta[700],
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[2],
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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
  },
  sectionLabel: {
    marginBottom: spacing[2],
  },
  accountSection: {
    gap: spacing[2],
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  amountValue: {
    textAlign: 'right',
    minWidth: 0,
  },
  arrowRow: {
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.warning.soft,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  commissionInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});