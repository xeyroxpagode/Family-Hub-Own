/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  AppText,
  InteractivePressable,
  Skeleton,
} from '../ui';
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceIconAction,
  FinanceSection,
  FinanceUtilityRow,
} from './ui';
import { compareDecimalStrings, getAccountBalancePresentation } from '../../services/finance/accountDisplay';
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
  onOpenTrash: () => void;
  onPaymentPress: (payment: PaymentDueDto) => void;
  onCreditCardDuePress: (payment: PaymentDueDto) => void;
  onDirectCardPayment: (card: FinanceAccountDto) => void;
  onRefresh: () => void;
  refreshNonce?: number;
};

type CardAction = {
  card: FinanceAccountDto;
  primaryDue: PaymentDueDto | null;
  balanceDebtAmount: string | null;
};

type PaymentsSnapshot = {
  paymentDues: PaymentDueDto[];
  creditCards: FinanceAccountDto[];
};

const EMPTY_PAYMENT_DUES: PaymentDueDto[] = [];
const EMPTY_CREDIT_CARDS: FinanceAccountDto[] = [];

export function PaymentsList({
  accessToken,
  contextType,
  activeHousehold,
  onCreatePayment,
  onOpenTrash,
  onPaymentPress,
  onCreditCardDuePress,
  onDirectCardPayment,
  onRefresh,
  refreshNonce = 0,
}: PaymentsListProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, PaymentsSnapshot>>({});
  const scopeKey = `${contextType}:${contextType === 'household' ? activeHousehold?.id ?? 'none' : 'personal'}`;
  const snapshot = snapshots[scopeKey] ?? null;
  const paymentDues = snapshot?.paymentDues ?? EMPTY_PAYMENT_DUES;
  const creditCards = snapshot?.creditCards ?? EMPTY_CREDIT_CARDS;

  const loadPayments = useCallback(async () => {
    if (!accessToken) {
      setSnapshots({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const scope = `finance:payments:${scopeKey}`;
      const [duesResult, seriesResult, accountsResult] = await Promise.all([
        listPaymentDues({
          accessToken,
          contextType,
          contextScope: `${scope}:dues`,
        }),
        listPaymentSeries({
          accessToken,
          contextType,
          status: 'ACTIVE',
          contextScope: `${scope}:series`,
        }),
        listFinanceAccounts({
          accessToken,
          contextType,
          status: FINANCE_ACCOUNT_STATUSES.ACTIVE,
          contextScope: `${scope}:accounts`,
        }),
      ]);

      const seriesById = new Map(seriesResult.paymentSeries.map((series) => [series.id, series]));
      const nextPaymentDues = duesResult.paymentDues.map((due) => ({
        ...due,
        paymentSeries: due.paymentSeries ?? (due.paymentSeriesId ? seriesById.get(due.paymentSeriesId) ?? null : null),
      }));
      const nextCreditCards = accountsResult.accounts.filter((account) => account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
      setSnapshots((current) => ({
        ...current,
        [scopeKey]: {
          paymentDues: nextPaymentDues,
          creditCards: nextCreditCards,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar los pagos. Intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, contextType, scopeKey]);

  const handleRefresh = async () => {
    await loadPayments();
    onRefresh();
  };

  useEffect(() => {
    loadPayments();
  }, [loadPayments, refreshNonce]);

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

  const cardActions = useMemo<CardAction[]>(() => creditCards
    .map((card) => {
      const primaryDue = choosePrimaryCreditCardDue(creditCardDuesByCardId.get(card.id) ?? []);
      const balance = getAccountBalancePresentation(card);
      const balanceDebtAmount = !balance.isUnknown && balance.isDebt && balance.displayAmount && compareDecimalStrings(balance.displayAmount, '0') > 0
        ? balance.displayAmount
        : null;
      return { card, primaryDue, balanceDebtAmount };
    })
    .filter((action) => action.primaryDue || action.balanceDebtAmount), [creditCardDuesByCardId, creditCards]);

  const pendingGroups = [
    { key: 'overdue', label: 'Vencidos', payments: overdue },
    { key: 'today', label: 'Hoy', payments: today },
    { key: 'upcoming', label: 'Próximos', payments: upcoming },
  ].filter((group) => group.payments.length > 0);

  const hasAnyContent = cardActions.length > 0 || pendingGroups.length > 0;

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
      <FinanceErrorState
        level="full"
        message={error}
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FinanceUtilityRow
        left={
          <FinanceIconAction
            onPress={onOpenTrash}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Abrir Papelera de pagos"
          >
            <HomePlusIcon name="trash-outline" size={20} color={colors.text.secondary} />
          </FinanceIconAction>
        }
        right={
          <FinanceIconAction
            onPress={onCreatePayment}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Nuevo pago"
          >
            <HomePlusIcon name="add" size={24} color={colors.text.secondary} />
          </FinanceIconAction>
        }
      />

      {cardActions.length > 0 ? (
        <FinanceSection title="Tarjetas" divided={pendingGroups.length > 0}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.cardRail,
              cardActions.length === 1 && styles.singleCardRail,
            ]}
          >
            {cardActions.map((action) => (
              <CreditCardActionTile
                key={action.card.id}
                action={action}
                single={cardActions.length === 1}
                onDuePress={onCreditCardDuePress}
                onDirectPayment={onDirectCardPayment}
              />
            ))}
          </ScrollView>
        </FinanceSection>
      ) : null}

      {pendingGroups.length > 0 ? (
        <FinanceSection title="Pagos pendientes" divided={false}>
          <View style={styles.pendingGroups}>
            {pendingGroups.map((group) => (
              <View key={group.key} style={styles.pendingGroup}>
                <AppText variant="caption" tone="secondary" weight="800" style={styles.groupTitle}>
                  {group.label} · {group.payments.length}
                </AppText>
                <View style={styles.rows}>
                  {group.payments.map((payment, index) => (
                    <PaymentRow key={payment.id} payment={payment} isLast={index === group.payments.length - 1} onPress={() => onPaymentPress(payment)} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </FinanceSection>
      ) : null}

      {!hasAnyContent && !loading ? (
        <FinanceEmptyState
          level="domain"
          title="No tenés pagos pendientes"
          description="Cuando agregues uno, va a aparecer acá para que puedas seguirlo."
          icon={<HomePlusIcon name="receipt-outline" size={24} color={colors.text.tertiary} />}
          style={styles.globalEmpty}
        />
      ) : null}
    </View>
  );
}

function CreditCardActionTile({
  action,
  single,
  onDuePress,
  onDirectPayment,
}: {
  action: CardAction;
  single: boolean;
  onDuePress: (payment: PaymentDueDto) => void;
  onDirectPayment: (card: FinanceAccountDto) => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const { card, primaryDue, balanceDebtAmount } = action;
  const isPartial = primaryDue?.isPartiallyPaid && primaryDue.paidSoFar && primaryDue.remaining;
  const amount = primaryDue
    ? isPartial
      ? formatFinanceAmount(primaryDue.remaining!, primaryDue.currency, { sign: 'none' })
      : formatExpectedAmount(primaryDue.expectedAmountKnown, primaryDue.expectedAmount, primaryDue.currency)
    : formatFinanceAmount(balanceDebtAmount ?? '0', card.currency, { sign: 'none' });
  const eyebrow = primaryDue
    ? primaryDue.overdue
      ? 'Pago vencido'
      : isPartial
      ? 'Resta'
      : 'Próximo pago'
    : 'Deuda actual';
  const dueCopy = primaryDue
    ? formatDueDateHuman(primaryDue.dueDate, primaryDue.overdue)
    : 'Sin vencimiento pendiente';
  const actionLabel = isPartial ? 'Pagar restante' : 'Pagar';

  return (
    <InteractivePressable
      onPress={() => primaryDue ? onDuePress(primaryDue) : onDirectPayment(card)}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.cardTile, single && styles.cardTileSingle]}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${eyebrow}, ${amount}`}
    >
      <View style={styles.cardTileHeader}>
        <HomePlusIcon name="card-outline" size={18} color={colors.text.tertiary} />
        <AppText variant="bodySmall" weight="800" numberOfLines={1} style={styles.cardName}>
          {card.name}
        </AppText>
      </View>
      <View style={styles.cardTileBody}>
        <AppText variant="caption" tone={primaryDue?.overdue ? 'danger' : 'secondary'} weight="800" numberOfLines={1}>
          {eyebrow}
        </AppText>
        <AppText variant="title3" weight="900" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
          {amount}
        </AppText>
        {isPartial ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            Pagaste {formatFinanceAmount(primaryDue.paidSoFar!, primaryDue.currency, { sign: 'none' })}
          </AppText>
        ) : null}
        <AppText variant="caption" tone={primaryDue?.overdue ? 'danger' : 'secondary'} weight={primaryDue?.overdue ? '800' : '600'} numberOfLines={1}>
          {dueCopy}
        </AppText>
      </View>
      <View style={styles.cardTileAction}>
        <AppText variant="caption" weight="800" tone="brand">
          {actionLabel}
        </AppText>
        <HomePlusIcon name="chevron-forward-outline" size={14} color={colors.text.tertiary} />
      </View>
    </InteractivePressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    container: {
      gap: spacing[7],
    },
    loading: {
      gap: spacing[3],
    },
    cardRail: {
      gap: spacing[3],
      paddingRight: spacing[6],
    },
    singleCardRail: {
      paddingRight: 0,
    },
    cardTile: {
      width: 184,
      minHeight: 132,
      borderRadius: radius.lg,
      backgroundColor: colors.surface.soft,
      padding: spacing[3],
      justifyContent: 'space-between',
      gap: spacing[2],
    },
    cardTileSingle: {
      width: '100%',
    },
    cardTileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    cardName: {
      flex: 1,
      minWidth: 0,
    },
    cardTileBody: {
      gap: spacing[1],
    },
    cardTileAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    },
    pendingGroups: {
      gap: spacing[5],
    },
    pendingGroup: {
      gap: spacing[2],
    },
    groupTitle: {
      paddingHorizontal: spacing[1],
    },
    rows: {
      gap: 0,
    },
    globalEmpty: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[5],
    },
  });
}
