import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { AbortError, ApiError } from '../../services/api';
import {
  FINANCE_ACCOUNT_STATUSES,
  listFinanceAccounts,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType, FinanceActiveHousehold } from '../../services/finance/financeContext';
import { getAccountBalancePresentation, formatAccountPresentationAmount } from '../../services/finance/accountDisplay';
import { useAppTheme } from '../../context/AppThemeContext';
import { HomePlusIcon } from '../../constants/icons';
import {
  AppButton,
  AppScreen,
  AppText,
  InteractivePressable,
  Skeleton,
  UndoToast,
} from '../../components/ui';
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceGroupedSurface,
  FinanceIconBox,
  FinanceIconAction,
  FinanceListRow,
  financeSpacing,
} from '../../components/finance/ui';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import type { MoreStackParamList } from '../../navigation/types';
import { AccountFormSheet } from '../../components/finance/AccountFormSheet';
import { AccountDetailSheet } from '../../components/finance/AccountDetailSheet';
import { AccountEditSheet } from '../../components/finance/AccountEditSheet';
import { DirectCreditCardPaymentSheet } from '../../components/finance/DirectCreditCardPaymentSheet';
import { PayCreditCardSheet } from '../../components/finance/PayCreditCardSheet';
import type { PaymentDueDto } from '../../services/finance/financePayments';

const CURRENCY_ORDER = ['ARS', 'USD', 'EUR'];

function currencySortKey(currency: string): number {
  const idx = CURRENCY_ORDER.indexOf(currency);
  return idx >= 0 ? idx : 100 + currency.localeCompare('ZZZ');
}

export type FinanceAccountsScreenProps = {
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  activeHousehold: FinanceActiveHousehold;
  onRequestClose: () => void;
};

function FinanceAccountsSurface({
  accessToken,
  contextType,
  contextLabel,
  activeHousehold,
  onRequestClose,
}: FinanceAccountsScreenProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [accounts, setAccounts] = useState<FinanceAccountDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [detailAccount, setDetailAccount] = useState<FinanceAccountDto | null>(null);
  const [payCardAccount, setPayCardAccount] = useState<FinanceAccountDto | null>(null);
  const [payCardDue, setPayCardDue] = useState<PaymentDueDto | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const readKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      readKeyRef.current = null;
      setAccounts([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestKey = `${contextType}:${contextType === 'household' ? activeHousehold?.id ?? 'none' : 'personal'}:${refreshNonce}:${showArchived}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setLoading(true);
    setError(null);

    listFinanceAccounts({
      accessToken,
      contextType,
      includeArchived: showArchived,
      status: showArchived ? FINANCE_ACCOUNT_STATUSES.ARCHIVED : undefined,
      signal: controller.signal,
      contextScope: `finance-accounts-screen:${requestKey}`,
    })
      .then((response) => {
        if (readKeyRef.current !== requestKey) return;
        setAccounts(response.accounts);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) return;
        if (readKeyRef.current !== requestKey) return;
        setError(error instanceof ApiError ? error.message : 'No pudimos cargar las cuentas.');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [accessToken, contextType, activeHousehold?.id, refreshNonce, showArchived]);

  const grouped = useMemo(() => {
    const groups: { currency: string; accounts: FinanceAccountDto[] }[] = [];
    const map = new Map<string, FinanceAccountDto[]>();

    for (const account of accounts) {
      const existing = map.get(account.currency) ?? [];
      existing.push(account);
      map.set(account.currency, existing);
    }

    for (const [currency, list] of map.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      groups.push({ currency, accounts: list });
    }

    groups.sort((a, b) => currencySortKey(a.currency) - currencySortKey(b.currency));
    return groups;
  }, [accounts]);
  const isEmptyActiveList = accounts.length === 0 && !showArchived && !loading && !error;

  const handleCreateSuccess = (created: FinanceAccountDto) => {
    setCreateVisible(false);
    setSuccessFeedback(created.accountType === 'CREDIT_CARD' ? 'Tarjeta creada' : 'Cuenta creada');
    setRefreshNonce((n) => n + 1);
  };

  const handleDetailAccount = (account: FinanceAccountDto) => {
    setDetailAccount(account);
    setDetailVisible(true);
  };

  const handleDetailChanged = () => {
    setRefreshNonce((n) => n + 1);
  };

  const handleAccountLifecycleChanged = (action?: 'archive' | 'unarchive') => {
    if (action === 'unarchive') {
      setShowArchived(false);
    }
    setRefreshNonce((n) => n + 1);
  };

  return (
    <AppScreen
      scroll
      bottomInset="tab"
      background="base"
      safeAreaEdges={['right', 'bottom', 'left']}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <FinanceIconAction
          onPress={onRequestClose}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Volver a Finanzas"
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </FinanceIconAction>
        <AppText variant="title1" weight="800">Cuentas</AppText>
      </View>

      <View style={styles.contextBadge}>
        <AppText variant="caption" tone="secondary" weight="700">Finanzas de</AppText>
        <AppText variant="bodySmall" weight="800">{contextLabel}</AppText>
      </View>

      {loading && accounts.length === 0 ? (
        <View style={styles.loading}>
          <Skeleton width="58%" height={16} />
          <Skeleton width="72%" height={12} />
        </View>
      ) : error ? (
        <FinanceErrorState level="full" message={error} onRetry={() => setRefreshNonce((n) => n + 1)} />
      ) : accounts.length === 0 && !showArchived ? (
        <View style={styles.empty}>
          <FinanceEmptyState
            level="section"
            title="Todavia no agregaste cuentas"
            description="Podes usar Finanzas sin cuentas. Si queres seguir tus saldos y como se mueve tu dinero, agrega una cuenta."
            icon={<HomePlusIcon name="wallet-outline" size={20} color={colors.text.tertiary} />}
            actionLabel="Agregar cuenta"
            onAction={() => setCreateVisible(true)}
          />
          <ArchivedAccountsLink onPress={() => setShowArchived(true)} />
        </View>
      ) : (
        <View style={styles.list}>
          {showArchived ? (
            <View style={styles.archivedHeader}>
              <AppText variant="caption" tone="secondary" weight="800">ARCHIVADAS</AppText>
              <InteractivePressable
                onPress={() => setShowArchived(false)}
                haptic="light"
                pressScale={motion.scale.tab}
                style={styles.archivedToggle}
              >
                <AppText variant="caption" tone="secondary" weight="700">Ocultar archivadas</AppText>
              </InteractivePressable>
            </View>
          ) : null}

          {grouped.map((group) => (
            <FinanceGroupedSurface key={group.currency} title={group.currency}>
              {group.accounts.map((account, index, list) => (
                <FinanceListRow
                  key={account.id}
                  title={account.name}
                  subtitle={`${account.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'} · ${account.financialContextType === 'household' ? (activeHousehold?.name ?? 'Hogar') : 'Personal'}`}
                  value={formatAccountRowBalance(account)}
                  valueTone={account.status === 'ARCHIVED' ? 'warning' : 'primary'}
                  chevron
                  onPress={() => handleDetailAccount(account)}
                  divider={index < list.length - 1}
                  accessibilityLabel={formatAccountRowAccessibility(account)}
                />
              ))}
            </FinanceGroupedSurface>
          ))}

          {showArchived ? (
            <View style={styles.archivedSection}>
              {grouped.flatMap((g) => g.accounts.filter((a) => a.status === 'ARCHIVED')).length === 0 ? (
                <FinanceEmptyState
                  level="section"
                  title="Sin cuentas archivadas"
                  description="Las cuentas archivadas aparecen acá."
                  icon={<HomePlusIcon name="archive-outline" size={20} color={colors.text.tertiary} />}
                />
              ) : null}
            </View>
          ) : (
            <ArchivedAccountsLink onPress={() => setShowArchived(true)} />
          )}
        </View>
      )}

      {!showArchived && !isEmptyActiveList ? (
        <AppButton
          title="Agregar cuenta"
          size="sm"
          variant="secondary"
          leftSlot={<HomePlusIcon name="add" size={18} color={colors.terracotta[700]} />}
          onPress={() => setCreateVisible(true)}
          disabled={loading}
          style={styles.addButton}
        />
      ) : null}

      <AccountFormSheet
        visible={createVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        onRequestClose={() => setCreateVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      <AccountDetailSheet
        visible={detailVisible}
        accessToken={accessToken}
        contextType={contextType}
        account={detailAccount}
        onRequestClose={() => { setDetailVisible(false); setDetailAccount(null); }}
        onEdit={(acc: FinanceAccountDto) => { setDetailVisible(false); setEditVisible(true); setDetailAccount(acc); }}
        onPayCard={(acc: FinanceAccountDto) => { setDetailVisible(false); setDetailAccount(null); setPayCardAccount(acc); }}
        onPayDue={(payment) => { setDetailVisible(false); setDetailAccount(null); setPayCardDue(payment); }}
        onChanged={handleAccountLifecycleChanged}
      />

      <AccountEditSheet
        visible={editVisible}
        accessToken={accessToken}
        contextType={contextType}
        account={detailAccount}
        onRequestClose={() => setEditVisible(false)}
        onSuccess={(acc: FinanceAccountDto) => { setEditVisible(false); handleDetailChanged(); }}
      />

      <DirectCreditCardPaymentSheet
        visible={payCardAccount !== null}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        contextState={contextType === 'personal' ? 'personal_ready' : activeHousehold ? 'household_ready' : 'household_unavailable'}
        activeHousehold={activeHousehold}
        card={payCardAccount}
        onRequestClose={() => setPayCardAccount(null)}
        onSuccess={() => {
          setPayCardAccount(null);
          setSuccessFeedback('Tarjeta pagada');
          handleDetailChanged();
        }}
      />

      <PayCreditCardSheet
        visible={payCardDue !== null}
        accessToken={accessToken ?? null}
        contextType={contextType}
        contextLabel={contextLabel}
        contextState={contextType === 'personal' ? 'personal_ready' : activeHousehold ? 'household_ready' : 'household_unavailable'}
        activeHousehold={activeHousehold}
        payment={payCardDue}
        onRequestClose={() => setPayCardDue(null)}
        onSuccess={() => {
          setPayCardDue(null);
          setSuccessFeedback('Pago registrado');
          handleDetailChanged();
        }}
      />

      <UndoToast
        visible={Boolean(successFeedback)}
        message={successFeedback ?? ''}
        duration={2000}
        onDismiss={() => setSuccessFeedback(null)}
      />
    </AppScreen>
  );
}

function ArchivedAccountsLink({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();
  const { colors } = theme;

  return (
    <FinanceListRow
      title="Ver cuentas archivadas"
      icon={(
        <FinanceIconBox small>
          <HomePlusIcon name="archive-outline" size={16} color={colors.text.tertiary} />
        </FinanceIconBox>
      )}
      chevron
      onPress={onPress}
      divider={false}
      accessibilityLabel="Ver cuentas archivadas"
    />
  );
}

function formatAccountRowBalance(account: FinanceAccountDto): string {
  if (account.status === FINANCE_ACCOUNT_STATUSES.ARCHIVED) return 'Archivada';
  const presentation = getAccountBalancePresentation(account);
  if (presentation.isUnknown) return presentation.unknownLabel;
  const amount = formatAccountPresentationAmount(presentation);
  if (presentation.isCreditCard && presentation.isDebt) return `Deuda ${amount}`;
  if (presentation.isCreditEdgePositive) return `Saldo a favor ${amount}`;
  return `${account.currency} ${amount}`;
}

function formatAccountRowAccessibility(account: FinanceAccountDto): string {
  const presentation = getAccountBalancePresentation(account);
  if (account.status === FINANCE_ACCOUNT_STATUSES.ARCHIVED) return `Abrir cuenta archivada ${account.name}`;
  if (presentation.isUnknown) return `Abrir cuenta ${account.name}. ${presentation.unknownLabel}`;
  return `Abrir cuenta ${account.name}. ${presentation.label} ${account.currency} ${formatAccountPresentationAmount(presentation)}`;
}

export function FinanceAccountsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'FinanceAccounts'>>();
  const { session } = useAuth();
  const { currentHousehold, loading, reloading } = useHousehold();
  const activeHousehold = useMemo<FinanceActiveHousehold>(() => {
    if (!currentHousehold) return null;
    return {
      id: currentHousehold.id,
      name: currentHousehold.nombre,
    };
  }, [currentHousehold]);
  const contextLabel = route.params.contextType === 'personal'
    ? 'Personal'
    : loading || reloading
      ? 'Actualizando contexto'
      : activeHousehold?.name ?? 'Contexto no disponible';

  return (
    <FinanceAccountsSurface
      accessToken={session?.access_token ?? null}
      contextType={route.params.contextType}
      contextLabel={contextLabel}
      activeHousehold={activeHousehold}
      onRequestClose={() => navigation.goBack()}
    />
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
  content: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loading: {
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  empty: {
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  list: {
    gap: financeSpacing.sectionGap,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  archivedSection: {
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[3],
  },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archivedToggle: {
    paddingVertical: spacing[1],
  },
  });
}
