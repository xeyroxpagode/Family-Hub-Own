import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets, typography } from '../../constants/theme';
import { AppText, InteractivePressable } from '../ui';
import type { PaymentDueDto } from '../../services/finance/financePayments';
import { formatExpectedAmount, formatDueDateHuman, formatRecurrenceSummary, PAYMENT_KINDS } from '../../services/finance/financePayments';

type PaymentRowProps = {
  payment: PaymentDueDto;
  onPress: () => void;
  disabled?: boolean;
};

export const PaymentRow = memo(function PaymentRow({
  payment,
  onPress,
  disabled = false,
}: PaymentRowProps) {
  const overdue = payment.overdue && payment.status === 'PENDING';
  const isRecurring = Boolean(payment.paymentSeriesId);
  const isCreditCard = payment.kind === PAYMENT_KINDS.CREDIT_CARD;
  const amountLine = formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency);
  const dueDateText = formatDueDateHuman(payment.dueDate, overdue);

  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.card}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={buildAccessibilityLabel(payment)}
      accessibilityState={{ disabled }}
    >
      <View style={styles.content} pointerEvents="none">
        <View style={styles.mainCopy}>
          <AppText variant="body" weight="800" numberOfLines={1} style={styles.title}>
            {payment.title}
          </AppText>
          <View style={styles.detailsRow}>
            <AppText
              variant="bodySmall"
              weight={overdue || payment.status === 'PAID' ? '800' : '600'}
              tone={payment.status === 'PAID' ? 'success' : overdue ? 'danger' : 'secondary'}
              numberOfLines={1}
              style={styles.amount}
            >
              {amountLine}
            </AppText>
            <AppText
              variant="bodySmall"
              tone={overdue ? 'danger' : payment.status === 'PAID' ? 'success' : 'secondary'}
              weight="600"
              numberOfLines={1}
              style={styles.dueDate}
            >
              {dueDateText}
            </AppText>
          </View>
        </View>

        <View style={styles.badgesRow}>
          {isRecurring && payment.paymentSeries && (
            <AppText
              variant="caption"
              tone="secondary"
              weight="600"
              numberOfLines={1}
              style={styles.recurrenceBadge}
            >
              {formatRecurrenceSummary(payment.paymentSeries)}
            </AppText>
          )}

          {isCreditCard && (
            <AppText variant="caption" tone="primary" weight="700" style={styles.creditCardBadge}>
              Tarjeta de crédito
            </AppText>
          )}

          {payment.status === 'PAID' && (
            <AppText variant="caption" tone="success" weight="800" style={styles.paidBadge}>
              Pagado
            </AppText>
          )}

          {payment.status === 'CANCELLED' && (
            <AppText variant="caption" tone="tertiary" weight="600" style={styles.cancelledBadge}>
              Cancelado
            </AppText>
          )}
        </View>
      </View>
      <HomePlusIcon
        name="chevron-forward-outline"
        size={18}
        color={colors.text.tertiary}
        style={styles.chevron}
      />
    </InteractivePressable>
  );
});

function buildAccessibilityLabel(payment: PaymentDueDto): string {
  const parts = [payment.title];
  parts.push(formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency));
  parts.push(payment.status === 'PENDING' ? (payment.overdue ? 'Vencido' : 'Pendiente') : payment.status === 'PAID' ? 'Pagado' : 'Cancelado');
  if (payment.paymentSeriesId) parts.push('Recurrente');
  return parts.join(', ');
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    minWidth: 0,
  },
  mainCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  title: {
    maxWidth: '85%',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  amount: {
    maxWidth: '55%',
  },
  dueDate: {
    maxWidth: '45%',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  recurrenceBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[100],
  },
  creditCardBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.terracotta[50],
    borderWidth: 1,
    borderColor: colors.terracotta[300],
  },
  paidBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.success.soft,
    borderWidth: 1,
    borderColor: colors.success.base,
  },
  cancelledBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  chevron: {
    flexShrink: 0,
  },
});
