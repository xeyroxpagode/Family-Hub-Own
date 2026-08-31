import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AbortError, ApiError } from '../../services/api';
import {
  archiveFinanceAccount,
  getFinanceAccountActivity,
  unarchiveFinanceAccount,
  type FinanceAccountActivityDto,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  getAccountBalancePresentation,
  formatAccountPresentationAmount,
  formatCanonicalAmountForDisplay,
} from '../../services/finance/accountDisplay';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
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
  onAnchorBalance: (account: FinanceAccountDto) => void;
  onCorrectBalance: (account: FinanceAccountDto) => void;
  onChanged: (action?: 'archive' | 'unarchive') => void;
};

export function AccountDetailSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onEdit,
  onAnchorBalance,
  onCorrectBalance,
  onChanged,
}: AccountDetailSheetProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activity, setActivity] = useState<FinanceAccountActivityDto[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const activitySeqRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setOverflowOpen(false);
      setSubmitError(null);
      setSubmitting(false);
      setActivity([]);
      setActivityError(null);
      setActivityLoading(false);
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

    return () => {
      controller.abort();
    };
  }, [visible, accessToken, account, contextType]);

  const presentation = account ? getAccountBalancePresentation(account) : null;
  const isArchived = account?.status === 'ARCHIVED';

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
            {presentation?.isUnknown ? (
              <InteractivePressable
                onPress={() => { setOverflowOpen(false); if (account) onAnchorBalance(account); }}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.overflowItem}
                accessibilityRole="menuitem"
                accessibilityLabel="Establecer saldo"
              >
                <HomePlusIcon name="analytics-outline" size={20} color={colors.text.primary} />
                <AppText variant="body" weight="800">Establecer saldo</AppText>
              </InteractivePressable>
            ) : (
              <InteractivePressable
                onPress={() => { setOverflowOpen(false); if (account) onCorrectBalance(account); }}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.overflowItem}
                accessibilityRole="menuitem"
                accessibilityLabel="Corregir saldo"
              >
                <HomePlusIcon name="swap-horizontal-outline" size={20} color={colors.text.primary} />
                <AppText variant="body" weight="800">Corregir saldo</AppText>
              </InteractivePressable>
            )}
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

const styles = StyleSheet.create({
  body: {
    flex: 1,
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
