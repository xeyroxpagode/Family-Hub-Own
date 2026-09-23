import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_ACCOUNT_STATUSES,
  listFinanceAccounts,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { getAccountBalancePresentation, formatAccountPresentationAmount } from '../../services/finance/accountDisplay';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  getFinancePoolSummary,
  listFinancePools,
  type FinancePoolDto,
  type FinancePoolSummaryResponse,
} from '../../services/finance/financePools';
import type { MoreStackParamList } from '../../navigation/types';
import { PoolDetailSheet } from './PoolDetailSheet';
import { CreatePoolSheet } from './CreatePoolSheet';
import { AccountFormSheet } from './AccountFormSheet';
import { AccountDetailSheet } from './AccountDetailSheet';
import { AccountEditSheet } from './AccountEditSheet';
import { DirectCreditCardPaymentSheet } from './DirectCreditCardPaymentSheet';
import { PayCreditCardSheet } from './PayCreditCardSheet';
import type { PaymentDueDto } from '../../services/finance/financePayments';

import {
  AppScreen,
  AppText,
  Skeleton,
  UndoToast,
} from '../ui';
import {
  FinanceDetailMetaRow,
  FinanceDisclosureRow,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceIconAction,
  FinanceGroupedSurface,
  FinanceListRow,
  FinanceSection,
  FinanceSemanticSurface,
  financeSpacing,
} from './ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';

type FinancePoolManagementScreenProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  activeHousehold: { id: string; name: string } | null;
  currency: string;
  onRequestClose: () => void;
};

function FinancePoolManagementSurface({
  accessToken,
  contextType,
  contextLabel,
  activeHousehold,
  currency,
  onRequestClose,
}: FinancePoolManagementScreenProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);

  const [summary, setSummary] = useState<FinancePoolSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolDetailVisible, setPoolDetailVisible] = useState(false);
  const [createPoolVisible, setCreatePoolVisible] = useState(false);
  const [createAccountVisible, setCreateAccountVisible] = useState(false);
  const [createAccountType, setCreateAccountType] = useState<FinanceAccountDto['accountType']>(FINANCE_ACCOUNT_TYPES.ACCOUNT);
  const [detailPool, setDetailPool] = useState<FinancePoolDto | null>(null);
  const [accountDetailVisible, setAccountDetailVisible] = useState(false);
  const [accountEditVisible, setAccountEditVisible] = useState(false);
  const [detailAccount, setDetailAccount] = useState<FinanceAccountDto | null>(null);
  const [payCardAccount, setPayCardAccount] = useState<FinanceAccountDto | null>(null);
  const [payCardDue, setPayCardDue] = useState<PaymentDueDto | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const readKeyRef = useRef<string | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<FinanceAccountDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  // Archived accounts (P14): reachable recovery path from Organización.
  // Reuses the existing list + AccountDetailSheet (unarchive); no second manager.
  const [archivedAccounts, setArchivedAccounts] = useState<FinanceAccountDto[]>([]);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  // Fetch summary + pools + accounts
  useEffect(() => {
    if (!accessToken) {
      readKeyRef.current = null;
      void Promise.resolve().then(() => {
        setSummary(null);
        setAccounts([]);
        setArchivedAccounts([]);
        setLoading(false);
        setAccountsLoading(false);
        setError(null);
        setAccountsError(null);
      });
      return;
    }

    const requestKey = `${contextType}:${currency}:${refreshNonce}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    void Promise.resolve().then(() => {
      if (readKeyRef.current !== requestKey) return;
      setLoading(true);
      setAccountsLoading(true);
      setError(null);
      setAccountsError(null);
    });

    Promise.all([
      getFinancePoolSummary({
        accessToken,
        contextType,
        currency,
        signal: controller.signal,
        contextScope: `finance-pool-mgmt-summary:${requestKey}`,
      }),
      listFinancePools({
        accessToken,
        contextType,
        currency,
        signal: controller.signal,
        contextScope: `finance-pool-mgmt-list:${requestKey}`,
      }),
      listFinanceAccounts({
        accessToken,
        contextType,
        includeArchived: false,
        signal: controller.signal,
        contextScope: `finance-pool-mgmt-accounts:${requestKey}`,
      }),
      // Archived recovery count/surface (P14). A failure here must not break
      // the whole screen: fall back to hiding the archived path.
      listFinanceAccounts({
        accessToken,
        contextType,
        includeArchived: true,
        status: FINANCE_ACCOUNT_STATUSES.ARCHIVED,
        signal: controller.signal,
        contextScope: `finance-pool-mgmt-archived:${requestKey}`,
      }).catch(() => ({ accounts: [] as FinanceAccountDto[] })),
    ])
      .then(([summaryData, listData, accountsData, archivedData]) => {
        if (readKeyRef.current !== requestKey) return;
        setSummary({
          ...summaryData,
          pools: listData.pools,
        });
        setAccounts(accountsData.accounts);
        setArchivedAccounts(archivedData.accounts);
        setLoading(false);
        setAccountsLoading(false);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (readKeyRef.current !== requestKey) return;
        setError('No pudimos cargar la organización. Intenta de nuevo.');
        setAccountsError('No pudimos cargar las cuentas. Intenta de nuevo.');
        setLoading(false);
        setAccountsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [accessToken, contextType, currency, refreshNonce]);

  const activePools = useMemo(() => summary?.pools.filter((p) => p.status === 'ACTIVE') ?? [], [summary]);
  const hasPools = activePools.length > 0;

  // Split accounts by type
  const activeAccounts = useMemo(() =>
    accounts.filter((a) => a.status === FINANCE_ACCOUNT_STATUSES.ACTIVE), [accounts]
  );
  const assetAccounts = useMemo(() =>
    activeAccounts.filter((a) => a.accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT), [activeAccounts]
  );
  const creditCards = useMemo(() =>
    activeAccounts.filter((a) => a.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD), [activeAccounts]
  );

  const allocationCoverageDeficit = String(summary?.allocationCoverageDeficit ?? '0');
  const hasAllocationCoverageDeficit =
    allocationCoverageDeficit !== '0' && !isZeroDecimalString(allocationCoverageDeficit);

  const visibleDetailPool = useMemo(() => {
    if (!detailPool) return null;
    return summary?.pools.find((pool) => pool.id === detailPool.id) ?? detailPool;
  }, [detailPool, summary]);
  const visibleDetailAccount = useMemo(() => {
    if (!detailAccount) return null;
    return accounts.find((account) => account.id === detailAccount.id) ?? detailAccount;
  }, [accounts, detailAccount]);
  const contextState = contextType === 'personal' ? 'personal_ready' : activeHousehold ? 'household_ready' : 'household_unavailable';

  const handleCreatePoolSuccess = () => {
    setCreatePoolVisible(false);
    setSuccessFeedback('Pozo creado');
    setRefreshNonce((n) => n + 1);
  };

  const handleCreateAccountSuccess = (created: FinanceAccountDto) => {
    setCreateAccountVisible(false);
    setSuccessFeedback(created.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? 'Tarjeta creada' : 'Cuenta creada');
    setRefreshNonce((n) => n + 1);
  };

  const handleDetailPool = (pool: FinancePoolDto) => {
    setDetailPool(pool);
    setPoolDetailVisible(true);
  };

  const handleDetailAccount = (account: FinanceAccountDto) => {
    setDetailAccount(account);
    setAccountDetailVisible(true);
  };

  const handleDetailChanged = () => {
    setRefreshNonce((n) => n + 1);
  };

  const handleArchiveSuccess = () => {
    setSuccessFeedback('Pozo archivado');
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
        <AppText variant="title1" weight="800">Organización del dinero</AppText>
      </View>

      <View style={styles.currencyBadge}>
        <AppText variant="caption" tone="secondary" weight="700">{currency}</AppText>
      </View>

      {(loading || accountsLoading) && !summary ? (
        <View style={styles.loading}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="80%" height={40} />
          <Skeleton width="60%" height={12} />
        </View>
      ) : error || accountsError ? (
        <FinanceErrorState
          level="full"
          message={error ?? accountsError ?? 'Error desconocido'}
          onRetry={() => setRefreshNonce((n) => n + 1)}
        />
      ) : (
        <View style={styles.sections}>
          {/* Resumen financiero organizable */}
          <FinanceSemanticSurface tone="neutral">
            <FinanceDetailMetaRow
              label="Disponible conocido"
              value={formatFinanceAmount(summary?.knownOrganizableNet ?? '0', currency, { sign: 'net' })}
            />
            <FinanceDetailMetaRow
              label="Organizado"
              value={formatFinanceAmount(summary?.poolNetPosition ?? '0', currency, { sign: 'net' })}
            />
            <FinanceDetailMetaRow
              label="Sin asignar"
              value={formatFinanceAmount(summary?.unassignedKnown ?? '0', currency, { sign: 'net' })}
            />

            {(summary?.unknownAccountCount ?? 0) > 0 && (
              <View style={styles.coverageNotice}>
                <HomePlusIcon name="information-circle-outline" size={14} color={colors.warning.strong} />
                <AppText variant="caption" tone="secondary">
                  Hay {summary!.unknownAccountCount} cuenta{summary!.unknownAccountCount > 1 ? 's' : ''} con saldo sin establecer.
                </AppText>
              </View>
            )}

            {hasAllocationCoverageDeficit && (
              <View style={styles.deficitWarning}>
                <HomePlusIcon name="alert-circle-outline" size={14} color={colors.warning.strong} />
                <AppText variant="caption" tone="secondary">
                  Tenés {formatFinanceAmount(allocationCoverageDeficit, '', { sign: 'none' })} organizados por encima del respaldo conocido.
                </AppText>
              </View>
            )}
          </FinanceSemanticSurface>

          <FinanceSection
            title="Cuentas"
            actionLabel="+ Agregar cuenta"
            onAction={() => { setCreateAccountType(FINANCE_ACCOUNT_TYPES.ACCOUNT); setCreateAccountVisible(true); }}
          >
            {accountsLoading ? (
              <GroupedSkeleton />
            ) : assetAccounts.length > 0 ? (
              <FinanceGroupedSurface>
                {assetAccounts.map((account, index, list) => (
                  <FinanceListRow
                    key={account.id}
                    title={account.name}
                    subtitle={`Cuenta · ${formatEntityContext(account.financialContextType, contextLabel)}`}
                    value={formatAccountBalance(account, currency)}
                    chevron
                    onPress={() => handleDetailAccount(account)}
                    divider={index < list.length - 1}
                    accessibilityLabel={`Abrir cuenta ${account.name}, ${formatAccountBalance(account, currency)}`}
                  />
                ))}
              </FinanceGroupedSurface>
            ) : (
              <FinanceEmptyState level="inline" description="Todavía no tenés cuentas" />
            )}
            {archivedAccounts.length > 0 ? (
              <FinanceDisclosureRow
                label={`Ver archivadas · ${archivedAccounts.length}`}
                expanded={archivedExpanded}
                onToggle={() => setArchivedExpanded((current) => !current)}
              >
                <FinanceGroupedSurface>
                  {archivedAccounts.map((account, index, list) => (
                    <FinanceListRow
                      key={account.id}
                      title={account.name}
                      subtitle={`${account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? 'Tarjeta' : 'Cuenta'} · ${formatEntityContext(account.financialContextType, contextLabel)}`}
                      value="Archivada"
                      valueTone="warning"
                      chevron
                      onPress={() => handleDetailAccount(account)}
                      divider={index < list.length - 1}
                      accessibilityLabel={`Abrir cuenta archivada ${account.name}`}
                    />
                  ))}
                </FinanceGroupedSurface>
              </FinanceDisclosureRow>
            ) : null}
          </FinanceSection>

          <FinanceSection
            title="Tarjetas"
            actionLabel="+ Agregar tarjeta"
            onAction={() => { setCreateAccountType(FINANCE_ACCOUNT_TYPES.CREDIT_CARD); setCreateAccountVisible(true); }}
          >
            {accountsLoading ? (
              <GroupedSkeleton />
            ) : creditCards.length > 0 ? (
              <FinanceGroupedSurface>
                {creditCards.map((card, index, list) => (
                  <FinanceListRow
                    key={card.id}
                    title={card.name}
                    subtitle={card.dueDay ? `Vence día ${card.dueDay}` : formatEntityContext(card.financialContextType, contextLabel)}
                    value={formatCardBalance(card, currency)}
                    valueTone={getCardTone(card)}
                    chevron
                    onPress={() => handleDetailAccount(card)}
                    divider={index < list.length - 1}
                    accessibilityLabel={`Abrir tarjeta ${card.name}, ${formatCardBalance(card, currency)}`}
                  />
                ))}
              </FinanceGroupedSurface>
            ) : (
              <FinanceEmptyState level="inline" description="Todavía no tenés tarjetas" />
            )}
          </FinanceSection>

          <FinanceSection
            title="Pozos"
            actionLabel="+ Crear pozo"
            onAction={() => setCreatePoolVisible(true)}
            divided={false}
          >
            {hasPools ? (
              <FinanceGroupedSurface>
                {activePools.map((pool, index, list) => (
                  <FinanceListRow
                    key={pool.id}
                    title={pool.name}
                    subtitle={pool.balance.startsWith('-') ? 'Te excediste de lo reservado' : 'Organizado'}
                    value={formatFinanceAmount(pool.balance, currency, { sign: pool.balance.startsWith('-') ? 'net' : 'none' })}
                    valueTone={isZeroDecimalString(pool.balance) ? 'primary' : pool.balance.startsWith('-') ? 'danger' : 'success'}
                    chevron
                    onPress={() => handleDetailPool(pool)}
                    divider={index < list.length - 1}
                    accessibilityLabel={`Abrir pozo ${pool.name}, saldo ${formatFinanceAmount(pool.balance, currency)}`}
                  />
                ))}
              </FinanceGroupedSurface>
            ) : (
              <FinanceEmptyState level="inline" description="Todavía no tenés pozos" />
            )}
          </FinanceSection>
        </View>
      )}

      <CreatePoolSheet
        visible={createPoolVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        onRequestClose={() => setCreatePoolVisible(false)}
        onSuccess={handleCreatePoolSuccess}
      />

      <AccountFormSheet
        key={createAccountType}
        visible={createAccountVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        initialAccountType={createAccountType}
        onRequestClose={() => setCreateAccountVisible(false)}
        onSuccess={handleCreateAccountSuccess}
      />

      <AccountDetailSheet
        visible={accountDetailVisible}
        accessToken={accessToken}
        contextType={contextType}
        account={visibleDetailAccount}
        onRequestClose={() => { setAccountDetailVisible(false); setDetailAccount(null); }}
        onEdit={(account: FinanceAccountDto) => { setAccountDetailVisible(false); setAccountEditVisible(true); setDetailAccount(account); }}
        onPayCard={(account: FinanceAccountDto) => { setAccountDetailVisible(false); setDetailAccount(null); setPayCardAccount(account); }}
        onPayDue={(payment) => { setAccountDetailVisible(false); setDetailAccount(null); setPayCardDue(payment); }}
        onChanged={(action) => {
          setSuccessFeedback(action === 'unarchive' ? 'Cuenta desarchivada' : 'Cuenta archivada');
          handleDetailChanged();
        }}
      />

      <AccountEditSheet
        visible={accountEditVisible}
        accessToken={accessToken}
        contextType={contextType}
        account={detailAccount}
        onRequestClose={() => setAccountEditVisible(false)}
        onSuccess={(account: FinanceAccountDto) => {
          setDetailAccount(account);
          setAccountEditVisible(false);
          setSuccessFeedback(account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? 'Tarjeta actualizada' : 'Cuenta actualizada');
          handleDetailChanged();
        }}
      />

      <DirectCreditCardPaymentSheet
        visible={payCardAccount !== null}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        contextState={contextState}
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
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        contextState={contextState}
        activeHousehold={activeHousehold}
        payment={payCardDue}
        onRequestClose={() => setPayCardDue(null)}
        onSuccess={() => {
          setPayCardDue(null);
          setSuccessFeedback('Pago registrado');
          handleDetailChanged();
        }}
      />

      <PoolDetailSheet
        visible={poolDetailVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={visibleDetailPool}
        pools={activePools}
        unassignedKnown={summary?.unassignedKnown ?? '0'}
        onRequestClose={() => { setPoolDetailVisible(false); setDetailPool(null); }}
        onSuccess={handleDetailChanged}
        onArchiveSuccess={handleArchiveSuccess}
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

function GroupedSkeleton() {
  const styles = createStyles(useAppTheme());

  return (
    <View style={styles.groupedSkeleton}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="42%" height={14} />
    </View>
  );
}

function formatEntityContext(contextType: FinanceContextType, contextLabel: string): string {
  if (contextType === 'personal') return 'Personal';
  return contextLabel === 'Actualizando contexto' ? 'Hogar' : contextLabel;
}

function formatAccountBalance(account: FinanceAccountDto, currency: string): string {
  const presentation = getAccountBalancePresentation(account);
  if (presentation.isUnknown) return presentation.unknownLabel;
  return `${presentation.currency ?? currency} ${formatAccountPresentationAmount(presentation)}`;
}

function formatCardBalance(card: FinanceAccountDto, currency: string): string {
  const presentation = getAccountBalancePresentation(card);
  if (presentation.isUnknown) return presentation.unknownLabel;
  return `${presentation.label} ${presentation.currency ?? currency} ${formatAccountPresentationAmount(presentation)}`;
}

function getCardTone(card: FinanceAccountDto): 'primary' | 'danger' | 'success' {
  if (card.balanceState === 'UNKNOWN') return 'primary';
  const balance = card.currentBalance ?? '0';
  if (balance.startsWith('-')) return 'danger';
  if (isZeroDecimalString(balance)) return 'primary';
  return 'success';
}

export function FinancePoolManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'FinancePoolManagement'>>();
  const { session } = useAuth();
  const { currentHousehold, loading, reloading } = useHousehold();

  const contextType = route.params.contextType;
  const currency = route.params.currency;

  const activeHousehold = currentHousehold
    ? { id: currentHousehold.id, name: currentHousehold.nombre }
    : null;

  const contextLabel = contextType === 'personal'
    ? 'Personal'
    : loading || reloading
    ? 'Actualizando contexto'
    : activeHousehold?.name ?? 'Contexto no disponible';

  return (
    <FinancePoolManagementSurface
      accessToken={session?.access_token ?? null}
      contextType={contextType}
      contextLabel={contextLabel}
      activeHousehold={activeHousehold}
      currency={currency}
      onRequestClose={() => navigation.goBack()}
    />
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    content: {
      gap: spacing[4],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    currencyBadge: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      borderRadius: radius.pill,
      backgroundColor: colors.surface.soft,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      alignSelf: 'flex-start',
    },
    loading: {
      paddingVertical: spacing[4],
      gap: spacing[2],
    },
    sections: {
      gap: financeSpacing.sectionGap,
    },
    coverageNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginTop: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: colors.warning.soft,
    },
    deficitWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginTop: spacing[2],
      padding: spacing[3],
      borderRadius: radius.md,
      backgroundColor: colors.warning.soft,
    },
    groupedSkeleton: {
      minHeight: 58,
      justifyContent: 'center',
      gap: spacing[2],
    },
  });
}
