import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AbortError, ApiError } from '../../services/api';
import {
  archiveFinanceAccount,
  getFinanceAccountActivity,
  listCreditCardInstallmentPlans,
  unarchiveFinanceAccount,
  type FinanceAccountActivityDto,
  type FinanceAccountDto,
  type CreditCardInstallmentPlanDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  listPaymentDues,
  PAYMENT_DUE_STATUSES,
  PAYMENT_KINDS,
  formatDueDateHuman,
  formatExpectedAmount,
  type PaymentDueDto,
} from '../../services/finance/financePayments';
import {
  getAccountBalancePresentation,
  formatAccountPresentationAmount,
  formatCanonicalAmountForDisplay,
  compareDecimalStrings,
} from '../../services/finance/accountDisplay';
import { useAppTheme } from '../../context/AppThemeContext';
import { HomePlusIcon } from '../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  ErrorState,
  InteractivePressable,
  Skeleton,
} from '../ui';

const RECENT_ACTIVITY_LIMIT = 5;

const ACTIVITY_SIGN_BY_TYPE = {
  expense: '-',
  income: '+',
  transfer: '',
  refund: '+',
} as const;

export type AccountDetailSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  account: FinanceAccountDto | null;
  onRequestClose: () => void;
  onEdit: (account: FinanceAccountDto) => void;
  onPayCard: (account: FinanceAccountDto) => void;
  onPayDue: (payment: PaymentDueDto) => void;
  onChanged: (action?: 'archive' | 'unarchive') => void;
};

export function AccountDetailSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onEdit,
  onPayCard,
  onPayDue,
  onChanged,
}: AccountDetailSheetProps) {
  const theme = useAppTheme();
  const { colors, motion, touchTargets } = theme;
  const styles = createStyles(theme);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activity, setActivity] = useState<FinanceAccountActivityDto[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [cardDues, setCardDues] = useState<PaymentDueDto[]>([]);
  const [cardDuesLoading, setCardDuesLoading] = useState(false);
  const [cardDuesError, setCardDuesError] = useState<string | null>(null);
  const [installmentPlans, setInstallmentPlans] = useState<CreditCardInstallmentPlanDto[]>([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [installmentsExpanded, setInstallmentsExpanded] = useState(false);
  const activitySeqRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setOverflowOpen(false);
      setSubmitError(null);
      setSubmitting(false);
      setActivity([]);
      setActivityError(null);
      setActivityLoading(false);
      setCardDues([]);
      setCardDuesError(null);
      setCardDuesLoading(false);
      setInstallmentPlans([]);
      setInstallmentsLoading(false);
      setInstallmentsExpanded(false);
      return;
    }
    if (!accessToken || !account) {
      setActivity([]);
      return;
    }

    const mySeq = ++activitySeqRef.current;
    const controller = new AbortController();
    setActivityLoading(true);
    setActivityError(null);

    getFinanceAccountActivity(accessToken, account.id, contextType, {
      limit: RECENT_ACTIVITY_LIMIT,
      signal: controller.signal,
      contextScope: `finance-account-detail:${account.id}`,
    })
      .then((response) => {
        if (activitySeqRef.current !== mySeq) return;
        setActivity(response.activity);
        setActivityLoading(false);
      })
      .catch((error) => {
        if (activitySeqRef.current !== mySeq) return;
        if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) return;
        const message = error instanceof ApiError ? error.message : 'No pudimos cargar la actividad.';
        setActivityError(message);
        setActivityLoading(false);
      });

    if (account.accountType === 'CREDIT_CARD') {
      setCardDuesLoading(true);
      setCardDuesError(null);
      listPaymentDues({
        accessToken,
        contextType,
        kind: PAYMENT_KINDS.CREDIT_CARD,
        status: PAYMENT_DUE_STATUSES.PENDING,
        signal: controller.signal,
        contextScope: `finance-card-dues:${account.id}`,
      })
        .then((response) => {
          if (activitySeqRef.current !== mySeq) return;
          setCardDues(response.paymentDues.filter((due) => due.targetCreditCardAccountId === account.id));
          setCardDuesLoading(false);
        })
        .catch((error) => {
          if (activitySeqRef.current !== mySeq) return;
          if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) return;
          setCardDuesError(error instanceof ApiError ? error.message : 'No pudimos cargar los pagos de esta tarjeta.');
          setCardDuesLoading(false);
        });

      setInstallmentsLoading(true);
      listCreditCardInstallmentPlans(accessToken, account.id, contextType, {
        limit: 12,
        signal: controller.signal,
        contextScope: `finance-card-installments:${account.id}`,
      })
        .then((response) => {
          if (activitySeqRef.current !== mySeq) return;
          setInstallmentPlans(response.plans);
          setInstallmentsLoading(false);
        })
        .catch(() => {
          if (activitySeqRef.current !== mySeq) return;
          setInstallmentPlans([]);
          setInstallmentsLoading(false);
        });
    } else {
      setCardDues([]);
      setCardDuesLoading(false);
      setInstallmentPlans([]);
      setInstallmentsLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [visible, accessToken, account, contextType]);

  const presentation = account ? getAccountBalancePresentation(account) : null;
  const isArchived = account?.status === 'ARCHIVED';
  const isCreditCard = account?.accountType === 'CREDIT_CARD';
  const hasCardTiming = isCreditCard && account?.closingDay != null && account?.dueDay != null;
  const debtMagnitude = isCreditCard && presentation?.isDebt === true && presentation.displayAmount !== null
    ? presentation.displayAmount
    : null;
  const hasDebt = debtMagnitude !== null && /[1-9]/.test(debtMagnitude.replace('.', ''));
  const primaryDue = choosePrimaryCardDue(cardDues);
  const primaryDueRemaining = primaryDue?.remaining ?? (primaryDue?.expectedAmountKnown ? primaryDue.expectedAmount ?? null : null);
  const primaryDueHasRemaining = primaryDueRemaining !== null && compareDecimalStrings(primaryDueRemaining, '0') > 0;
  const futureInstallmentCount = installmentPlans.reduce((sum, plan) => sum + plan.futureInstallmentCount, 0);
  const futureInstallmentAmount = installmentPlans.reduce((sum, plan) => sum + Number(plan.futureAmount || 0), 0);

  const close = () => {
    if (submitting) return;
    if (overflowOpen) {
      setOverflowOpen(false);
      return;
    }
    setOverflowOpen(false);
    onRequestClose();
  };

  const handleArchive = async () => {
    if (submitting || !accessToken || !account) return;
    setSubmitError(null);
    setSubmitting(true);
    setOverflowOpen(false);
    try {
      await archiveFinanceAccount(accessToken, account.id, contextType);
      onChanged('archive');
      onRequestClose();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos archivar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnarchive = async () => {
    if (submitting || !accessToken || !account) return;
    setSubmitError(null);
    setSubmitting(true);
    setOverflowOpen(false);
    try {
      await unarchiveFinanceAccount(accessToken, account.id, contextType);
      onChanged('unarchive');
      onRequestClose();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos desarchivar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = isArchived ? (
    <View style={styles.footer}>
      <AppButton
        title="Desarchivar"
        onPress={() => void handleUnarchive()}
        loading={submitting}
        disabled={submitting}
        style={styles.footerButton}
      />
    </View>
  ) : undefined;

  return (
    <ActionSheet
      visible={visible}
      title={account?.name ?? 'Cuenta'}
      subtitle={account ? `${account.currency} · ${account.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'}` : undefined}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={footer}
    >
      <View style={styles.body}>
        {!isArchived ? (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <InteractivePressable
              onPress={() => setOverflowOpen((current) => !current)}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.icon}
              style={styles.overflowButton}
              accessibilityRole="button"
              accessibilityLabel="Mas opciones de la cuenta"
              accessibilityState={{ expanded: overflowOpen }}
            >
              <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary} />
            </InteractivePressable>
          </View>
        ) : null}

        {overflowOpen && !isArchived ? (
          <Pressable
            style={styles.overflowDismissLayer}
            onPress={() => setOverflowOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menu de cuenta"
          />
        ) : null}

        {overflowOpen && !isArchived ? (
          <View style={styles.overflowMenu} accessibilityRole="menu">
            <InteractivePressable
              onPress={() => { setOverflowOpen(false); if (account) onEdit(account); }}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.overflowItem}
              accessibilityRole="menuitem"
              accessibilityLabel="Editar cuenta"
            >
              <HomePlusIcon name="create-outline" size={20} color={colors.text.primary} />
              <AppText variant="body" weight="800">Editar</AppText>
            </InteractivePressable>
            <InteractivePressable
              onPress={() => void handleArchive()}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={[styles.overflowItem, styles.overflowItemDanger]}
              accessibilityRole="menuitem"
              accessibilityLabel="Archivar cuenta"
            >
              <HomePlusIcon name="archive-outline" size={20} color={colors.danger.strong} />
              <AppText variant="body" weight="800" tone="danger">Archivar</AppText>
            </InteractivePressable>
          </View>
        ) : null}

        {isArchived ? (
          <View style={styles.archivedBadge}>
            <HomePlusIcon name="archive-outline" size={16} color={colors.warning.strong} />
            <AppText variant="caption" tone="warning" weight="800">Cuenta archivada</AppText>
          </View>
        ) : null}

        {presentation ? (
          <View style={styles.balanceCard}>
            <AppText variant="caption" tone="secondary" weight="700">
              {presentation.label}
            </AppText>
            <AppText variant="title1" weight="800" numberOfLines={1}>
              {presentation.isUnknown
                ? presentation.unknownLabel
                : `${presentation.currency ?? ''} ${formatAccountPresentationAmount(presentation)}`.trim()}
            </AppText>
          </View>
        ) : null}

        {isCreditCard ? (
          hasCardTiming ? (
            <View style={styles.cardTimingCard}>
              <View style={styles.cardTimingItem}>
                <AppText variant="caption" tone="secondary" weight="700">Cierre</AppText>
                <AppText variant="body" weight="800">{account?.closingDay}</AppText>
              </View>
              <View style={styles.cardTimingDivider} />
              <View style={styles.cardTimingItem}>
                <AppText variant="caption" tone="secondary" weight="700">Vencimiento</AppText>
                <AppText variant="body" weight="800">{account?.dueDay}</AppText>
              </View>
            </View>
          ) : !isArchived ? (
            <InteractivePressable
              onPress={() => { if (account) onEdit(account); }}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.cardTimingMissing}
              accessibilityRole="button"
              accessibilityLabel="Configurar cierre y vencimiento"
            >
              <HomePlusIcon name="create-outline" size={18} color={colors.warning.strong} />
              <AppText variant="bodySmall" weight="800" tone="warning">Datos de tarjeta incompletos</AppText>
              <AppText variant="caption" tone="secondary" style={styles.cardTimingMissingAction}>Configurar cierre y vencimiento</AppText>
            </InteractivePressable>
          ) : null
        ) : null}

        {isCreditCard ? (
          <View style={styles.dueCard}>
            <View style={styles.dueHeaderRow}>
              <AppText variant="caption" tone="secondary" weight="800">PRÓXIMO PAGO</AppText>
              {cardDuesLoading ? <Skeleton width={72} height={12} /> : null}
            </View>
            {cardDuesError ? (
              <AppText variant="caption" tone="warning">{cardDuesError}</AppText>
            ) : primaryDue && primaryDueHasRemaining ? (
              <>
                <View style={styles.dueAmountRow}>
                  <AppText variant="title3" weight="800">
                    {formatExpectedAmount(true, primaryDueRemaining, primaryDue.currency)}
                  </AppText>
                  <AppText variant="bodySmall" tone={primaryDue.overdue ? 'danger' : 'secondary'} weight="700">
                    {formatDueDateHuman(primaryDue.dueDate, primaryDue.overdue)}
                  </AppText>
                </View>
                {primaryDue.isPartiallyPaid || compareDecimalStrings(primaryDue.paidSoFar ?? '0', '0') > 0 ? (
                  <AppText variant="caption" tone="secondary">
                    Pagaste {formatExpectedAmount(true, primaryDue.paidSoFar ?? '0', primaryDue.currency)} · Resta {formatExpectedAmount(true, primaryDueRemaining, primaryDue.currency)}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText variant="bodySmall" tone="secondary" weight="700">Sin pagos pendientes</AppText>
            )}
          </View>
        ) : null}

        {!isArchived && isCreditCard && primaryDue && primaryDueHasRemaining ? (
          <AppButton
            title={primaryDue.isPartiallyPaid ? 'Pagar restante' : 'Pagar tarjeta'}
            onPress={() => onPayDue(primaryDue)}
            disabled={submitting}
            leftSlot={<HomePlusIcon name="card-outline" size={18} color={colors.text.inverse} />}
          />
        ) : hasDebt && !isArchived ? (
          <AppButton
            title="Pagar tarjeta"
            onPress={() => { if (account) onPayCard(account); }}
            disabled={submitting}
            leftSlot={<HomePlusIcon name="card-outline" size={18} color={colors.text.inverse} />}
          />
        ) : null}

        {isCreditCard ? (
          <View style={styles.installmentsCard}>
            <InteractivePressable
              onPress={() => setInstallmentsExpanded((current) => !current)}
              disabled={installmentsLoading || installmentPlans.length === 0}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.installmentsHeader}
              accessibilityRole="button"
              accessibilityState={{ expanded: installmentsExpanded, disabled: installmentsLoading || installmentPlans.length === 0 }}
              accessibilityLabel="Próximas cuotas"
            >
              <View style={styles.installmentsCopy}>
                <AppText variant="caption" tone="secondary" weight="800">PRÓXIMAS CUOTAS</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {installmentsLoading
                    ? 'Cargando...'
                    : futureInstallmentCount > 0
                      ? `${futureInstallmentCount} cuotas · ${account?.currency ?? ''} ${formatCanonicalAmountForDisplay(String(futureInstallmentAmount))}`
                      : 'Sin cuotas futuras'}
                </AppText>
              </View>
              {installmentPlans.length > 0 ? (
                <HomePlusIcon name={installmentsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.text.tertiary} />
              ) : null}
            </InteractivePressable>
            {installmentsExpanded ? (
              <View style={styles.installmentsList}>
                {installmentPlans.slice(0, 4).map((plan) => (
                  <View key={plan.id} style={styles.installmentPlanRow}>
                    <View style={styles.installmentsCopy}>
                      <AppText variant="bodySmall" weight="800" numberOfLines={1}>{plan.purchaseTitle ?? 'Compra en cuotas'}</AppText>
                      <AppText variant="caption" tone="secondary">{plan.futureInstallmentCount} de {plan.installmentCount} cuotas futuras</AppText>
                    </View>
                    <AppText variant="bodySmall" weight="800" numberOfLines={1}>
                      {plan.currency} {formatCanonicalAmountForDisplay(plan.futureAmount)}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.activitySection}>
          <AppText variant="caption" tone="secondary" weight="800">ÚLTIMOS MOVIMIENTOS</AppText>
          {activityLoading && activity.length === 0 ? (
            <View style={styles.activityLoading}>
              <Skeleton width="62%" height={14} />
              <Skeleton width="48%" height={14} />
              <Skeleton width="74%" height={14} />
            </View>
          ) : activityError ? (
            <ErrorState title="No pudimos cargar los movimientos" description={activityError} />
          ) : activity.length === 0 ? (
            <EmptyState
              title="Sin movimientos todavía"
              description="Aparecerán acá los gastos, ingresos y transferencias que afecten a esta cuenta."
              illustration={<HomePlusIcon name="swap-vertical-outline" size={26} color={colors.terracotta[600]} />}
            />
          ) : (
            <AppCard variant="quiet" padding="default" style={styles.activityCard}>
              {activity.map((item, index) => (
                <View key={item.id} style={[styles.activityRow, index > 0 && styles.activityRowNotFirst]}>
                  <View style={styles.activityCopy}>
                    <AppText variant="bodySmall" weight="800" numberOfLines={1}>{item.title}</AppText>
                    {item.categoryLabelSnapshot ? (
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>{item.categoryLabelSnapshot}</AppText>
                    ) : null}
                  </View>
                  <AppText
                    variant="bodySmall"
                    weight="800"
                    tone={item.effectType === 'expense' || (item.effectType === 'transfer' && item.effectRole === 'TRANSFER_SOURCE') ? 'danger' : 'success'}
                    numberOfLines={1}
                    style={styles.activityAmount}
                  >
                    {formatActivityAmount(item)}
                  </AppText>
                </View>
              ))}
            </AppCard>
          )}
        </View>

        {submitError ? (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
            <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
          </View>
        ) : null}
      </View>
    </ActionSheet>
  );
}

function formatActivityAmount(item: FinanceAccountActivityDto): string {
  const sign = ACTIVITY_SIGN_BY_TYPE[item.operationTag] ?? '';
  const value = formatCanonicalAmountForDisplay(item.effectAmount);
  return `${sign}${value} ${item.currency}`.trim();
}

function choosePrimaryCardDue(dues: PaymentDueDto[]): PaymentDueDto | null {
  if (dues.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  return [...dues].sort((a, b) => {
    const aRank = a.overdue ? 0 : a.dueDate === today ? 1 : 2;
    const bRank = b.overdue ? 0 : b.dueDate === today ? 1 : 2;
    if (aRank !== bRank) return aRank - bRank;
    return a.dueDate.localeCompare(b.dueDate);
  })[0] ?? null;
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets } = theme;

  return StyleSheet.create({
  body: {
    gap: spacing[3],
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTargets.normal,
  },
  overflowButton: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowMenu: {
    position: 'absolute',
    top: touchTargets.normal + spacing[1],
    right: 0,
    width: 204,
    zIndex: 3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[2],
    gap: spacing[1],
  },
  overflowDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  overflowItem: {
    minHeight: touchTargets.normal,
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  overflowItemDanger: {
    backgroundColor: colors.danger.soft,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.warning.soft,
    alignSelf: 'flex-start',
  },
  balanceCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  cardTimingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
  cardTimingItem: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  cardTimingDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border.subtle,
  },
  cardTimingMissing: {
    borderRadius: radius.lg,
    backgroundColor: colors.warning.soft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  cardTimingMissingAction: {
    textDecorationLine: 'underline',
  },
  dueCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  dueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  dueAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  installmentsCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  installmentsHeader: {
    minHeight: 58,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  installmentsCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  installmentsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing[4],
  },
  installmentPlanRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  activitySection: {
    gap: spacing[2],
  },
  activityLoading: {
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  activityCard: {
    gap: 0,
  },
  activityRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  activityRowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  activityCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  activityAmount: {
    maxWidth: '46%',
    textAlign: 'right',
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
  });
}
