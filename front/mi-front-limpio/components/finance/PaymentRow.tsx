import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { AppText, InteractivePressable } from '../ui';
import type { PaymentDueDto } from '../../services/finance/financePayments';
import { formatExpectedAmount, formatDueDateHuman, formatRecurrenceSummary, PAYMENT_KINDS } from '../../services/finance/financePayments';
import { compareDecimalStrings } from '../../services/finance/accountDisplay';

type PaymentRowProps = {
  payment: PaymentDueDto;
  onPress: () => void;
  disabled?: boolean;
  isLast?: boolean;
};

export const PaymentRow = memo(function PaymentRow({
  payment,
  onPress,
  disabled = false,
  isLast = false,
}: PaymentRowProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const overdue = payment.overdue && payment.status === 'PENDING';
  const isRecurring = Boolean(payment.paymentSeriesId);
  const isCreditCard = payment.kind === PAYMENT_KINDS.CREDIT_CARD;
  const amountLine = formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency);
  const remaining = payment.remaining ?? (payment.expectedAmountKnown ? payment.expectedAmount ?? null : null);
  const showProgress = isCreditCard && remaining !== null && compareDecimalStrings(payment.paidSoFar ?? '0', '0') > 0;
  const dueDateText = formatDueDateHuman(payment.dueDate, overdue);
  const stateText = payment.status === 'PAID'
    ? 'Pagado'
    : payment.status === 'CANCELLED'
    ? payment.paymentSeriesId
      ? 'Saltado'
      : 'Cancelado'
    : overdue
    ? 'Vencido'
    : 'Pendiente';

  return (
    <React.Fragment>
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
            <AppText
              variant="bodySmall"
              tone={overdue ? 'danger' : payment.status === 'PAID' ? 'success' : 'secondary'}
              weight={overdue || payment.status === 'PAID' ? '800' : '600'}
              numberOfLines={1}
            >
              {dueDateText}
            </AppText>
            {showProgress ? (
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                Pagaste {formatExpectedAmount(true, payment.paidSoFar ?? '0', payment.currency)} · Resta {formatExpectedAmount(true, remaining, payment.currency)}
              </AppText>
            ) : isRecurring && payment.paymentSeries ? (
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {formatRecurrenceSummary(payment.paymentSeries)}
              </AppText>
            ) : null}
          </View>

          <View style={styles.amountColumn}>
            <AppText
              variant="bodySmall"
              weight="800"
              tone={payment.status === 'PAID' ? 'success' : overdue ? 'danger' : 'primary'}
              numberOfLines={1}
              style={styles.amount}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {amountLine}
            </AppText>
            <AppText
              variant="caption"
              tone={payment.status === 'PAID' ? 'success' : overdue ? 'danger' : 'secondary'}
              weight="800"
              numberOfLines={1}
            >
              {stateText}
            </AppText>
          </View>
        </View>
        <HomePlusIcon
          name={isCreditCard ? 'card-outline' : 'chevron-forward-outline'}
          size={18}
          color={colors.text.tertiary}
          style={styles.chevron}
        />
      </InteractivePressable>
      {!isLast ? <View style={styles.divider} /> : null}
    </React.Fragment>
  );
});

function buildAccessibilityLabel(payment: PaymentDueDto): string {
  const parts = [payment.title];
  parts.push(formatExpectedAmount(payment.expectedAmountKnown, payment.expectedAmount, payment.currency));
  parts.push(payment.status === 'PENDING' ? (payment.overdue ? 'Vencido' : 'Pendiente') : payment.status === 'PAID' ? 'Pagado' : 'Cancelado');
  if (payment.paymentSeriesId) parts.push('Recurrente');
  return parts.join(', ');
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
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
  amountColumn: {
    alignItems: 'flex-end',
    gap: spacing[1],
    maxWidth: '42%',
  },
  amount: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  chevron: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: spacing[7],
    marginRight: spacing[1],
  },
  });
}
