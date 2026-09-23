import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  ActionSheet,
  AppButton,
  AppText,
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
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceGroupedSurface,
  FinanceListRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';

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
}: AccountSelectorProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const groups: AccountSelectorGroup[] = useMemo(
    () => groupAccountsByContext(accounts, activeHousehold),
    [accounts, activeHousehold],
  );

  const handleChoose = (account: FinanceAccountDto | null) => {
    if (disabled) return;
    onSelect(account);
  };

  const renderRadioIcon = (selected: boolean) => (
    <HomePlusIcon
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={20}
      color={selected ? colors.terracotta[700] : colors.text.tertiary}
    />
  );

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

  const showList = !loading && !error && (accounts.length > 0 || allowNone);

  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={disabled}
      size={FINANCE_SHEET_SIZE_POLICY.PICKER_CATALOG}
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
          <FinanceErrorState level="full" message={error} />
        ) : accounts.length === 0 && !allowNone ? (
          <View style={styles.empty}>
            <FinanceEmptyState
              level="section"
              title="No hay cuentas disponibles"
              description="Agregá una cuenta para usar esta operación."
              icon={<HomePlusIcon name="wallet-outline" size={20} color={colors.text.tertiary} />}
            />
            {onCreateAccount ? (
              <FinanceListRow
                title={createAccountLabel}
                icon={<HomePlusIcon name="add-circle-outline" size={20} color={colors.terracotta[700]} />}
                onPress={disabled ? undefined : onCreateAccount}
                disabled={disabled}
                divider={false}
                accessibilityLabel={createAccountLabel}
              />
            ) : null}
          </View>
        ) : showList ? (
          <View style={styles.list} accessibilityRole="list">
            {allowNone ? (
              <FinanceGroupedSurface>
                <FinanceListRow
                  title={noneLabel}
                  subtitle="La operación se registra sin afectar saldos"
                  icon={renderRadioIcon(selectedAccountId === null)}
                  onPress={() => handleChoose(null)}
                  disabled={disabled}
                  divider={false}
                  accessibilityLabel={noneLabel}
                />
              </FinanceGroupedSurface>
            ) : null}

            {groups.length === 0 && allowNone ? (
              <View style={styles.noAccountsHint}>
                <AppText variant="caption" tone="tertiary">
                  Todavía no agregaste cuentas. Podés continuar sin cuenta.
                </AppText>
              </View>
            ) : null}

            {groups.map((group) => (
              <FinanceGroupedSurface key={group.key} title={group.contextLabel}>
                {group.accounts.map((account, index) => {
                  const presentation = getAccountBalancePresentation(account);
                  const subtitle = presentation.isUnknown
                    ? presentation.unknownLabel
                    : `${presentation.label} ${presentation.currency ?? ''} ${formatAccountPresentationAmount(presentation)}`.trim();
                  return (
                    <FinanceListRow
                      key={account.id}
                      title={account.name}
                      subtitle={subtitle}
                      value={account.currency}
                      valueTone="secondary"
                      icon={renderRadioIcon(account.id === selectedAccountId)}
                      onPress={() => handleChoose(account)}
                      disabled={disabled}
                      divider={index < group.accounts.length - 1}
                      accessibilityLabel={`${account.name}, ${account.currency}, ${subtitle}${account.id === selectedAccountId ? ', seleccionada' : ''}`}
                    />
                  );
                })}
              </FinanceGroupedSurface>
            ))}

            {onCreateAccount ? (
              <FinanceListRow
                title={createAccountLabel}
                icon={<HomePlusIcon name="add-circle-outline" size={20} color={colors.terracotta[700]} />}
                onPress={disabled ? undefined : onCreateAccount}
                disabled={disabled}
                divider={false}
                accessibilityLabel={createAccountLabel}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { spacing } = theme;

  return StyleSheet.create({
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
  list: {
    gap: spacing[3],
    paddingBottom: spacing[4],
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
}
