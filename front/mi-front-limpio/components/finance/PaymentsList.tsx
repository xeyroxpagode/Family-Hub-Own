/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  AppText,
  ErrorState,
  InteractivePressable,
  Skeleton,
} from '../ui';
import { compareDecimalStrings, formatAccountPresentationAmount, getAccountBalancePresentation } from '../../services/finance/accountDisplay';
import { FINANCE_ACCOUNT_STATUSES, FINANCE_ACCOUNT_TYPES, listFinanceAccounts, type FinanceAccountDto } from '../../services/finance/financeAccounts';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  choosePrimaryCreditCardDue,
  formatDueDateHuman,
  formatExpectedAmount,
  groupPaymentDuesByStatus,
  isPaymentPending,
  listPaymentDues,
  listPaymentSeries,
  PAYMENT_KINDS,
  sortPaymentDuesForDisplay,
} from '../../services/finance/financePayments';
import { PaymentRow } from './PaymentRow';
import type { PaymentDueDto } from '../../services/finance/financePayments';
import type { FinanceActiveHousehold, FinanceContextType } from '../../services/finance/financeContext';

type PaymentsListProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  activeHousehold: FinanceActiveHousehold;
  onCreatePayment: () => void;
  onPaymentPress: (payment: PaymentDueDto) => void;
  onCreditCardDuePress: (payment: PaymentDueDto) => void;
  onDirectCardPayment: (card: FinanceAccountDto) => void;
  onRefresh: () => void;
};

export function PaymentsList({
  accessToken,
  contextType,
  onCreatePayment,
  onPaymentPress,
  onCreditCardDuePress,
  onDirectCardPayment,
  onRefresh,
}: PaymentsListProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDues, setPaymentDues] = useState<PaymentDueDto[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceAccountDto[]>([]);

  const loadPayments = useCallback(async () => {
    if (!accessToken) {
      setPaymentDues([]);
      setCreditCards([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [duesResult, seriesResult, accountsResult] = await Promise.all([
        listPaymentDues({
          accessToken,
          contextType,
        }),
        listPaymentSeries({
          accessToken,
          contextType,
          status: 'ACTIVE',
        }),
        listFinanceAccounts({
          accessToken,
          contextType,
          status: FINANCE_ACCOUNT_STATUSES.ACTIVE,
        }),
      ]);

      const seriesById = new Map(seriesResult.paymentSeries.map((series) => [series.id, series]));
      setPaymentDues(duesResult.paymentDues.map((due) => ({
        ...due,
        paymentSeries: due.paymentSeries ?? (due.paymentSeriesId ? seriesById.get(due.paymentSeriesId) ?? null : null),
      })));
      setCreditCards(accountsResult.accounts.filter((account) => account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar los pagos. Intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, contextType]);

  const handleRefresh = async () => {
    await loadPayments();
    onRefresh();
  };

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const { overdue, today, upcoming } = useMemo(
    () => groupPaymentDuesByStatus(sortPaymentDuesForDisplay(paymentDues.filter((due) => due.kind === PAYMENT_KINDS.NORMAL))),
    [paymentDues],
  );

  const creditCardDuesByCardId = useMemo(() => {
    const map = new Map<string, PaymentDueDto[]>();
    paymentDues
      .filter((due) => due.kind === PAYMENT_KINDS.CREDIT_CARD && due.targetCreditCardAccountId && isPaymentPending(due))
      .forEach((due) => {
        const cardId = due.targetCreditCardAccountId!;
        map.set(cardId, [...(map.get(cardId) ?? []), due]);
      });
    return map;
  }, [paymentDues]);

  const hasAnyContent = creditCards.length > 0 || overdue.length > 0 || today.length > 0 || upcoming.length > 0;

  if (loading && !hasAnyContent) {
    return (
      <View style={styles.loading}>
        <Skeleton width="42%" height={18} />
        <Skeleton width="78%" height={14} />
        <Skeleton width="64%" height={14} />
      </View>
    );
  }

  if (error && !hasAnyContent) {
    return (
      <ErrorState
        title="No pudimos cargar los pagos"
        description={error}
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <View style={styles.container}>
      <PaymentSection title="Tarjetas" emptyCopy={creditCards.length === 0 ? 'Sin tarjetas con pagos pendientes' : null}>
        {creditCards.map((card, index) => {
          const primaryDue = choosePrimaryCreditCardDue(creditCardDuesByCardId.get(card.id) ?? []);
          return (
            <CreditCardPaymentRow
              key={card.id}
              card={card}
              primaryDue={primaryDue}
              isLast={index === creditCards.length - 1}
              onDuePress={onCreditCardDuePress}
              onDirectPayment={onDirectCardPayment}
            />
          );
        })}
      </PaymentSection>

      <PaymentSection title="Vencidos" emptyCopy={overdue.length === 0 ? 'Nada vencido' : null}>
        {overdue.map((payment, index) => (
          <PaymentRow key={payment.id} payment={payment} isLast={index === overdue.length - 1} onPress={() => onPaymentPress(payment)} />
        ))}
      </PaymentSection>

      <PaymentSection title="Hoy" emptyCopy={today.length === 0 ? 'Nada para hoy' : null}>
        {today.map((payment, index) => (
          <PaymentRow key={payment.id} payment={payment} isLast={index === today.length - 1} onPress={() => onPaymentPress(payment)} />
        ))}
      </PaymentSection>

      <PaymentSection title="Próximos" emptyCopy={upcoming.length === 0 ? 'Sin pagos próximos' : null}>
        {upcoming.map((payment, index) => (
          <PaymentRow key={payment.id} payment={payment} isLast={index === upcoming.length - 1} onPress={() => onPaymentPress(payment)} />
        ))}
      </PaymentSection>

      <InteractivePressable
        onPress={onCreatePayment}
        haptic="medium"
        pressScale={motion.scale.card}
        style={styles.footerAction}
        accessibilityRole="button"
        accessibilityLabel="Agregar pago"
      >
        <AppText variant="bodySmall" weight="800" tone="brand">
          Agregar pago
        </AppText>
        <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
      </InteractivePressable>
    </View>
  );
}

function PaymentSection({
  title,
  emptyCopy,
  children,
}: {
  title: string;
  emptyCopy: string | null;
  children: React.ReactNode;
}) {
  const styles = createStyles(useAppTheme());

  return (
    <View style={styles.section}>
      <AppText variant="title3" weight="800" style={styles.sectionTitle}>
        {title}
      </AppText>
      {emptyCopy ? (
        <AppText variant="bodySmall" tone="secondary" style={styles.emptyCopy}>
          {emptyCopy}
        </AppText>
      ) : (
        <View style={styles.rows}>
          {children}
        </View>
      )}
    </View>
  );
}

function CreditCardPaymentRow({
  card,
  primaryDue,
  isLast,
  onDuePress,
  onDirectPayment,
}: {
  card: FinanceAccountDto;
  primaryDue: PaymentDueDto | null;
  isLast: boolean;
  onDuePress: (payment: PaymentDueDto) => void;
  onDirectPayment: (card: FinanceAccountDto) => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const balance = getAccountBalancePresentation(card);
  const isZeroBalance = !balance.isUnknown && balance.displayAmount !== null && compareDecimalStrings(balance.displayAmount, '0') === 0;
  const balanceLabel = balance.isUnknown
    ? balance.unknownLabel
    : isZeroBalance
    ? 'Sin deuda actual'
    : balance.isDebt
    ? `Deuda actual ${formatFinanceAmount(balance.displayAmount ?? '0', card.currency, { sign: 'none' })}`
    : balance.isCreditEdgePositive
    ? `Saldo a favor ${formatFinanceAmount(balance.displayAmount ?? '0', card.currency, { sign: 'none' })}`
    : 'Sin deuda actual';
  const canPayDirect = !primaryDue && balance.isDebt && !isZeroBalance && !balance.isUnknown && balance.displayAmount !== null;
  const actionLabel = primaryDue
    ? primaryDue.isPartiallyPaid
      ? 'Pagar restante'
      : 'Pagar'
    : canPayDirect
    ? 'Pagar'
    : null;
  const dueCopy = primaryDue
    ? `${formatExpectedAmount(primaryDue.expectedAmountKnown, primaryDue.expectedAmount, primaryDue.currency)} · ${formatDueDateHuman(primaryDue.dueDate, primaryDue.overdue)}`
    : card.dueDay
    ? `Vence día ${card.dueDay}`
    : null;

  return (
    <>
      <InteractivePressable
        onPress={() => primaryDue ? onDuePress(primaryDue) : canPayDirect ? onDirectPayment(card) : undefined}
        disabled={!primaryDue && !canPayDirect}
        haptic="light"
        pressScale={motion.scale.card}
        style={styles.cardRow}
        accessibilityRole="button"
        accessibilityState={{ disabled: !primaryDue && !canPayDirect }}
        accessibilityLabel={`${card.name}, ${balanceLabel}`}
      >
        <HomePlusIcon name="card-outline" size={18} color={colors.text.tertiary} />
        <View style={styles.cardCopy}>
          <AppText variant="body" weight="800" numberOfLines={1}>
            {card.name}
          </AppText>
          <AppText variant="bodySmall" tone={balance.isDebt && !isZeroBalance ? 'danger' : balance.isCreditEdgePositive ? 'success' : 'secondary'} weight="700" numberOfLines={1}>
            {balance.isUnknown || isZeroBalance ? balanceLabel : balance.label === 'Deuda actual' ? `${balance.label} ${formatAccountPresentationAmount(balance)} ${card.currency}` : balanceLabel}
          </AppText>
          {primaryDue && primaryDue.paidSoFar && primaryDue.remaining ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              Pagaste {formatFinanceAmount(primaryDue.paidSoFar, primaryDue.currency, { sign: 'none' })} · Resta {formatFinanceAmount(primaryDue.remaining, primaryDue.currency, { sign: 'none' })}
            </AppText>
          ) : dueCopy ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {dueCopy}
            </AppText>
          ) : null}
        </View>
        {actionLabel ? (
          <View style={styles.cardAction}>
            <AppText variant="caption" weight="800" tone="brand">
              {actionLabel}
            </AppText>
            <HomePlusIcon name="chevron-forward-outline" size={14} color={colors.text.tertiary} />
          </View>
        ) : null}
      </InteractivePressable>
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
  container: {
    gap: spacing[8],
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
  rows: {
    gap: 0,
  },
  emptyCopy: {
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[2],
  },
  footerAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingVertical: spacing[3],
  },
  cardRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[3],
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  cardAction: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: spacing[7],
    marginRight: spacing[1],
  },
  });
}
