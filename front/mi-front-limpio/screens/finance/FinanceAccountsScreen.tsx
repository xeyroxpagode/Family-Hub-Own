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
  AppCard,
  AppScreen,
  AppText,
  EmptyState,
  ErrorState,
  InteractivePressable,
  Skeleton,
  UndoToast,
} from '../../components/ui';
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
        <InteractivePressable
          onPress={onRequestClose}
          haptic="light"
          pressScale={motion.scale.icon}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver a Finanzas"
          hitSlop={8}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </InteractivePressable>
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
        <ErrorState title="No pudimos cargar las cuentas" description={error} onRetry={() => setRefreshNonce((n) => n + 1)} />
      ) : accounts.length === 0 && !showArchived ? (
        <View style={styles.empty}>
          <EmptyState
            title="Todavia no agregaste cuentas"
            description="Podes usar Finanzas sin cuentas. Si queres seguir tus saldos y como se mueve tu dinero, agrega una cuenta."
            illustration={<HomePlusIcon name="wallet-outline" size={32} color={colors.terracotta[600]} />}
          />
          <AppButton title="Agregar cuenta" onPress={() => setCreateVisible(true)} style={styles.emptyCta} />
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
            <View key={group.currency} style={styles.currencyGroup}>
              <AppText variant="caption" tone="secondary" weight="800" style={styles.currencyHeader}>
                {group.currency}
              </AppText>
              <AppCard variant="quiet" padding="default" style={styles.accountListCard}>
                {group.accounts.map((account, index) => (
                  <InteractivePressable
                    key={account.id}
                    onPress={() => handleDetailAccount(account)}
                    haptic="light"
                    pressScale={motion.scale.card}
                    style={[styles.accountRow, index > 0 && styles.accountRowNotFirst]}
                    accessibilityRole="button"
                    accessibilityLabel={formatAccountRowAccessibility(account)}
                  >
                    <View style={styles.accountInfo}>
                      <AppText variant="body" weight="800" numberOfLines={1}>{account.name}</AppText>
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {account.accountType === 'CREDIT_CARD' ? 'Tarjeta de credito' : 'Cuenta'} · {account.financialContextType === 'household' ? (activeHousehold?.name ?? 'Hogar') : 'Personal'}
                      </AppText>
                    </View>
                    <View style={styles.accountBalance}>
                      <AppText
                        variant="bodySmall"
                        weight="800"
                        tone={account.status === 'ARCHIVED' ? 'warning' : 'primary'}
                        numberOfLines={1}
                        style={styles.balanceAmount}
                      >
                        {formatAccountRowBalance(account)}
                      </AppText>
                    </View>
                    <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                  </InteractivePressable>
                ))}
              </AppCard>
            </View>
          ))}

          {showArchived ? (
            <View style={styles.archivedSection}>
              {grouped.flatMap((g) => g.accounts.filter((a) => a.status === 'ARCHIVED')).length === 0 ? (
                <EmptyState
                  title="Sin cuentas archivadas"
                  description="Las cuentas archivadas aparecen acá."
                  illustration={<HomePlusIcon name="archive-outline" size={24} color={colors.text.tertiary} />}
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
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.tab}
      style={styles.archivedLink}
      accessibilityRole="button"
      accessibilityLabel="Ver cuentas archivadas"
    >
      <HomePlusIcon name="archive-outline" size={16} color={colors.text.tertiary} />
      <AppText variant="caption" tone="secondary" weight="700">Ver cuentas archivadas</AppText>
      <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
    </InteractivePressable>
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
  const { colors, radius, spacing, touchTargets } = theme;

  return StyleSheet.create({
  content: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  backButton: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
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
  emptyCta: {
    alignSelf: 'flex-start',
  },
  list: {
    gap: spacing[4],
  },
  currencyGroup: {
    gap: spacing[2],
  },
  currencyHeader: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  accountListCard: {
    gap: 0,
  },
  accountRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  accountRowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  accountBalance: {
    maxWidth: '42%',
    alignItems: 'flex-end',
  },
  balanceAmount: {
    textAlign: 'right',
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
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  });
}
