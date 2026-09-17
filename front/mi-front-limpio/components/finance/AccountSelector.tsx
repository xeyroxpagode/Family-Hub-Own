import React, { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import {
  ActionSheet,
  AppButton,
  AppText,
  EmptyState,
  InteractivePressable,
  Skeleton,
} from '../ui';
import {
  getAccountBalancePresentation,
  formatAccountPresentationAmount,
} from '../../services/finance/accountDisplay';
import type {
  AccountOperation,
  AccountSelectorGroup,
} from '../../services/finance/financeAccountEligibility';
import { groupAccountsByContext } from '../../services/finance/financeAccountEligibility';
import type { FinanceAccountDto } from '../../services/finance/financeAccounts';
import type { FinanceActiveHousehold } from '../../services/finance/financeContext';

export type AccountSelectorProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  accounts: FinanceAccountDto[];
  loading?: boolean;
  error?: string | null;
  selectedAccountId: string | null;
  allowNone: boolean;
  noneLabel?: string;
  activeHousehold: FinanceActiveHousehold;
  disabled?: boolean;
  onRequestClose: () => void;
  onSelect: (account: FinanceAccountDto | null) => void;
  /**
   * Optional empty-state CTA used by Transfer flows when there are no eligible
   * accounts at all ("Agregar cuenta", H26). When provided, renders instead of
   * the bare empty hint.
   */
  onCreateAccount?: () => void;
  createAccountLabel?: string;
  /**
   * Hint for screen readers about which operation this selector is serving.
   */
  operationHint?: AccountOperation;
};

const DEFAULT_NONE_LABEL = 'Sin cuenta';

export function AccountSelector({
  visible,
  title,
  subtitle,
  accounts,
  loading = false,
  error = null,
  selectedAccountId,
  allowNone,
  noneLabel = DEFAULT_NONE_LABEL,
  activeHousehold,
  disabled = false,
  onRequestClose,
  onSelect,
  onCreateAccount,
  createAccountLabel = 'Agregar cuenta',
  operationHint,
}: AccountSelectorProps) {
  const groups: AccountSelectorGroup[] = useMemo(
    () => groupAccountsByContext(accounts, activeHousehold),
    [accounts, activeHousehold],
  );

  const handleChoose = (account: FinanceAccountDto | null) => {
    if (disabled) return;
    onSelect(account);
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton
        title="Cancelar"
        variant="ghost"
        onPress={onRequestClose}
        disabled={disabled}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={disabled}
      footer={footer}
    >
      <View style={styles.body}>
        {loading && accounts.length === 0 ? (
          <View style={styles.loading}>
            <Skeleton width="62%" height={14} />
            <Skeleton width="48%" height={14} />
            <Skeleton width="74%" height={14} />
          </View>
        ) : error ? (
          <EmptyState
            title="No pudimos cargar las cuentas"
            description={error}
          />
        ) : accounts.length === 0 && !allowNone ? (
          <View style={styles.empty}>
            <EmptyState
              title="No hay cuentas disponibles"
              description="Agregá una cuenta para usar esta operación."
              illustration={<HomePlusIcon name="wallet-outline" size={28} color={colors.terracotta[600]} />}
            />
            {onCreateAccount ? (
              <AppButton
                title={createAccountLabel}
                onPress={onCreateAccount}
                disabled={disabled}
                style={styles.emptyCta}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.list} accessibilityRole="list">
            {allowNone ? (
              <Fragment>
                <SelectorRow
                  accessibilityLabel={noneLabel}
                  accessibilityHint={operationHint ? `Sin cuenta para ${operationHint}` : undefined}
                  selected={selectedAccountId === null}
                  title={noneLabel}
                  subtitle="La operación se registra sin afectar saldos"
                  disabled={disabled}
                  onPress={() => handleChoose(null)}
                />
                <View style={styles.separator} />
              </Fragment>
            ) : null}

            {groups.length === 0 && allowNone ? (
              <View style={styles.noAccountsHint}>
                <AppText variant="caption" tone="tertiary">
                  Todavía no agregaste cuentas. Podés continuar sin cuenta.
                </AppText>
              </View>
            ) : null}

            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <AppText
                  variant="caption"
                  tone="secondary"
                  weight="800"
                  style={styles.groupHeader}
                  accessibilityRole="header"
                >
                  {group.contextLabel}
                </AppText>
                <View style={styles.groupList}>
                  {group.accounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      selected={account.id === selectedAccountId}
                      disabled={disabled}
                      onPress={() => handleChoose(account)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

function AccountRow({
  account,
  selected,
  disabled,
  onPress,
}: {
  account: FinanceAccountDto;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const presentation = getAccountBalancePresentation(account);
  const subtitle = presentation.isUnknown
    ? presentation.unknownLabel
    : `${presentation.label} ${presentation.currency ?? ''} ${formatAccountPresentationAmount(presentation)}`.trim();
  return (
    <SelectorRow
      accessibilityLabel={`${account.name}, ${account.currency}, ${subtitle}`}
      selected={selected}
      title={account.name}
      subtitle={subtitle}
      rightLabel={account.currency}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

function SelectorRow({
  accessibilityLabel,
  accessibilityHint,
  selected,
  title,
  subtitle,
  rightLabel,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  accessibilityHint?: string;
  selected: boolean;
  title: string;
  subtitle: string;
  rightLabel?: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <HomePlusIcon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.terracotta[700] : colors.text.tertiary}
      />
      <View style={styles.rowText}>
        <AppText variant="body" weight="800" numberOfLines={1}>
          {rightLabel ? `${title}` : title}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {rightLabel ? (
        <AppText variant="bodySmall" weight="800" tone="secondary" style={styles.rowRightLabel} numberOfLines={1}>
          {rightLabel}
        </AppText>
      ) : null}
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  loading: {
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  empty: {
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  emptyCta: {
    alignSelf: 'flex-start',
  },
  list: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  group: {
    gap: spacing[2],
  },
  groupHeader: {
    paddingHorizontal: spacing[1],
    paddingTop: spacing[1],
  },
  groupList: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: touchTargets.normal + 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  rowSelected: {
    backgroundColor: colors.terracotta[50],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  rowRightLabel: {
    maxWidth: '24%',
    textAlign: 'right',
  },
  separator: {
    height: 1,
    marginVertical: spacing[2],
    marginHorizontal: spacing[2],
    backgroundColor: colors.border.subtle,
  },
  noAccountsHint: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
  },
  footer: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
});
