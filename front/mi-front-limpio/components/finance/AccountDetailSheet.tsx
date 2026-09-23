import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  AppText,
  InteractivePressable,
  Skeleton,
} from '../ui';
import {
  FinanceDetailHeader,
  FinanceDetailMetaRow,
  FinanceDetailSection,
  FinanceDisclosureRow,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceGroupedSurface,
  FinanceListRow,
  FinanceSemanticSurface,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';

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
  const { colors, motion } = theme;
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) {
      void Promise.resolve().then(() => {
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
      });
      return;
    }
    if (!accessToken || !account) {
      void Promise.resolve().then(() => setActivity([]));
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const presentation = account ? getAccountBalancePresentation(account) : null;
  const isArchived = account?.status === 'ARCHIVED';
  const isCreditCard = account?.accountType === 'CREDIT_CARD';
  const hasCardTiming = isCreditCard && account?.closingDay != null && account?.dueDay != null;
  const debtMagnitude = isCreditCard && presentation?.isDebt === true && presentation.displayAmount !== null
    ? presentation.displayAmount
    : null;
  const hasDebt = debtMagnitude !== null && /[1-9]/.test(debtMagnitude.replace('.', ''));
  // Presentación visual 7B (dominio intacto): la tarjeta en cero muestra
  // "Sin deuda actual" como soporte; nunca se infiere "Al día".
  const isZeroDebt =
    isCreditCard &&
    presentation !== null &&
    !presentation.isUnknown &&
    presentation.isDebt === true &&
    presentation.displayAmount !== null &&
    compareDecimalStrings(presentation.displayAmount, '0') === 0;
  const primaryDue = choosePrimaryCardDue(cardDues);
  const primaryDueRemaining = primaryDue?.remaining ?? (primaryDue?.expectedAmountKnown ? primaryDue.expectedAmount ?? null : null);
  const primaryDueHasRemaining = primaryDueRemaining !== null && compareDecimalStrings(primaryDueRemaining, '0') > 0;
  const futureInstallmentCount = installmentPlans.reduce((sum, plan) => sum + plan.futureInstallmentCount, 0);
  const futureInstallmentAmount = installmentPlans.reduce((sum, plan) => sum + Number(plan.futureAmount || 0), 0);
  const displayedActivity = useMemo(() => {
    if (!isCreditCard) return activity;
    return activity.filter((item) => item.effectType === 'expense' || item.effectType === 'refund');
  }, [activity, isCreditCard]);

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
      subtitle={account ? `${account.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'} · ${contextType === 'personal' ? 'Personal' : 'Hogar'}` : undefined}
      onRequestClose={close}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.DETAIL}
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

        {presentation && account ? (
          <FinanceSemanticSurface tone="neutral">
            <FinanceDetailHeader
              title={account.name}
              subtitle={`${account.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'} · ${contextType === 'personal' ? 'Personal' : 'Hogar'}`}
              amount={
                presentation.isUnknown
                  ? presentation.unknownLabel
                  : `${presentation.currency ?? ''} ${formatAccountPresentationAmount(presentation)}`.trim()
              }
              amountTone={
                presentation.isUnknown || (!isCreditCard && !presentation.isCreditEdgePositive)
                  ? 'primary'
                  : presentation.isCreditEdgePositive
                    ? 'success'
                    : isZeroDebt
                      ? 'primary'
                      : 'danger'
              }
              supporting={isZeroDebt ? 'Sin deuda actual' : undefined}
              icon={
                <HomePlusIcon
                  name={isCreditCard ? 'card-outline' : 'wallet-outline'}
                  size={20}
                  color={colors.text.secondary}
                />
              }
            />
          </FinanceSemanticSurface>
        ) : null}

        {isCreditCard ? (
          hasCardTiming ? (
            <FinanceDetailSection title="Datos de la tarjeta">
              <FinanceDetailMetaRow label="Día de cierre" value={`Día ${account?.closingDay}`} />
              <FinanceDetailMetaRow label="Día de vencimiento" value={`Día ${account?.dueDay}`} />
            </FinanceDetailSection>
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
          <FinanceDetailSection title="Próximo pago">
            <View style={styles.dueHeaderRow}>
              {cardDuesLoading ? <Skeleton width={72} height={12} /> : null}
            </View>
            {cardDuesError ? (
              <AppText variant="caption" tone="warning">{cardDuesError}</AppText>
            ) : primaryDue && primaryDueHasRemaining ? (
              <>
                <View style={styles.dueAmountRow}>
                  <AppText variant="title3" weight="800" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.dueAmount}>
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
          </FinanceDetailSection>
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
          installmentsLoading ? (
            <Skeleton width="64%" height={14} />
          ) : installmentPlans.length > 0 ? (
            <FinanceDisclosureRow
              label={`Otros pagos pendientes · ${futureInstallmentCount}`}
              expanded={installmentsExpanded}
              onToggle={() => setInstallmentsExpanded((current) => !current)}
              accessibilityLabel="Próximas cuotas"
            >
              <AppText variant="caption" tone="secondary">
                {account?.currency ?? ''} {formatCanonicalAmountForDisplay(String(futureInstallmentAmount))}
              </AppText>
              <FinanceGroupedSurface>
                {installmentPlans.slice(0, 4).map((plan, index, list) => (
                  <FinanceListRow
                    key={plan.id}
                    title={plan.purchaseTitle ?? 'Compra en cuotas'}
                    subtitle={`${plan.futureInstallmentCount} de ${plan.installmentCount} cuotas futuras`}
                    value={`${plan.currency} ${formatCanonicalAmountForDisplay(plan.futureAmount)}`}
                    divider={index < list.length - 1}
                  />
                ))}
              </FinanceGroupedSurface>
            </FinanceDisclosureRow>
          ) : (
            <FinanceEmptyState level="inline" description="Sin cuotas futuras" />
          )
        ) : null}

        <FinanceDetailSection title={isCreditCard ? 'Compras recientes' : 'Movimientos recientes'}>
          {activityLoading && displayedActivity.length === 0 ? (
            <View style={styles.activityLoading}>
              <Skeleton width="62%" height={14} />
              <Skeleton width="48%" height={14} />
              <Skeleton width="74%" height={14} />
            </View>
          ) : activityError ? (
            <FinanceErrorState level="full" message={activityError} />
          ) : displayedActivity.length === 0 ? (
            <FinanceEmptyState
              level="section"
              title={isCreditCard ? 'Sin compras recientes' : 'Sin movimientos todavía'}
              description={isCreditCard ? 'Los pagos de tarjeta viven en Pagos, no en esta lista de compras.' : 'Aparecerán acá los gastos, ingresos y transferencias que afecten a esta cuenta.'}
              icon={<HomePlusIcon name={isCreditCard ? 'card-outline' : 'swap-vertical-outline'} size={20} color={colors.text.tertiary} />}
            />
          ) : (
            <FinanceGroupedSurface>
              {displayedActivity.map((item, index, list) => (
                <FinanceListRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.categoryLabelSnapshot ?? undefined}
                  value={formatActivityAmount(item)}
                  valueTone={item.effectType === 'expense' || (item.effectType === 'transfer' && item.effectRole === 'TRANSFER_SOURCE') ? 'danger' : 'success'}
                  divider={index < list.length - 1}
                />
              ))}
            </FinanceGroupedSurface>
          )}
        </FinanceDetailSection>

        {submitError ? (
          <FinanceErrorState level="form" message={submitError} />
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
  dueAmount: {
    flex: 1,
    minWidth: 0,
  },
  activityLoading: {
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  footer: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
  });
}
