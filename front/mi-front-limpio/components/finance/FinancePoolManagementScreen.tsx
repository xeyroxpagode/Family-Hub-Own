import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

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
} from '../ui';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import type { FinanceContextType } from '../../services/finance/financeContext';
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

type FinancePoolManagementScreenProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  onRequestClose: () => void;
};

function FinancePoolManagementSurface({
  accessToken,
  contextType,
  contextLabel,
  currency,
  onRequestClose,
}: FinancePoolManagementScreenProps) {
  const [summary, setSummary] = useState<FinancePoolSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [detailPool, setDetailPool] = useState<FinancePoolDto | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const readKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      readKeyRef.current = null;
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestKey = `${contextType}:${currency}:${refreshNonce}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setLoading(true);
    setError(null);

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
    ])
      .then(([summaryData, listData]) => {
        if (readKeyRef.current !== requestKey) return;
        setSummary({
          ...summaryData,
          pools: listData.pools,
        });
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (readKeyRef.current !== requestKey) return;
        setError('No pudimos cargar tus pozos. Intenta de nuevo.');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [accessToken, contextType, currency, refreshNonce]);

  const activePools = useMemo(() => summary?.pools.filter((p) => p.status === 'ACTIVE') ?? [], [summary]);
  const hasPools = activePools.length > 0;
  const allocationCoverageDeficit = String(summary?.allocationCoverageDeficit ?? '0');
  const hasAllocationCoverageDeficit =
    allocationCoverageDeficit !== '0' && !isZeroDecimalString(allocationCoverageDeficit);

  useEffect(() => {
    if (!summary) return;
    setDetailPool((currentPool) => {
      if (!currentPool) return currentPool;
      const updatedPool = summary.pools.find((pool) => pool.id === currentPool.id);
      if (updatedPool) return updatedPool;
      setDetailVisible(false);
      return null;
    });
  }, [summary]);

  const handleCreateSuccess = () => {
    setCreateVisible(false);
    setSuccessFeedback('Pozo creado');
    setRefreshNonce((n) => n + 1);
  };

  const handleDetailPool = (pool: FinancePoolDto) => {
    setDetailPool(pool);
    setDetailVisible(true);
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
        <AppText variant="title1" weight="800">Organización del dinero</AppText>
      </View>

      <View style={styles.currencyBadge}>
        <AppText variant="caption" tone="secondary" weight="700">{currency}</AppText>
      </View>

      {loading && !summary ? (
        <View style={styles.loading}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="80%" height={40} />
          <Skeleton width="60%" height={12} />
        </View>
      ) : error ? (
        <ErrorState title="No pudimos cargar tus pozos" description={error} onRetry={() => setRefreshNonce((n) => n + 1)} />
      ) : (
        <View style={styles.sections}>
          <AppCard variant="quiet" padding="generous">
            <View style={styles.moneyOverview}>
              <View style={styles.moneyRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Disponible conocido
                </AppText>
                <AppText variant="title3" weight="800">
                  {formatFinanceAmount(summary?.knownOrganizableNet ?? '0', currency, { sign: 'net' })}
                </AppText>
              </View>
              <View style={styles.moneyRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Sin asignar
                </AppText>
                <AppText variant="title3" weight="800">
                  {formatFinanceAmount(summary?.unassignedKnown ?? '0', currency, { sign: 'net' })}
                </AppText>
              </View>

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
            </View>
          </AppCard>

          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">Pozos activos</AppText>
            <AppButton
              variant="icon"
              onPress={() => setCreateVisible(true)}
              accessibilityLabel="Crear pozo"
              haptic="medium"
            >
              <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
            </AppButton>
          </View>

          {hasPools ? (
            <AppCard variant="quiet" padding="default">
              {activePools.map((pool, index) => (
                <InteractivePressable
                  key={pool.id}
                  onPress={() => handleDetailPool(pool)}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={[styles.poolRow, index > 0 && styles.poolRowNotFirst]}
                  accessibilityRole="button"
                  accessibilityLabel={`${pool.name}, saldo ${formatFinanceAmount(pool.balance, currency)}`}
                >
                  <View style={styles.poolInfo}>
                    <AppText variant="body" weight="800" numberOfLines={1}>{pool.name}</AppText>
                  </View>
                  <View style={styles.poolBalance}>
                    <AppText
                      variant="body"
                      weight="800"
                      tone={isZeroDecimalString(pool.balance) ? 'primary' : pool.balance.startsWith('-') ? 'danger' : 'success'}
                      numberOfLines={1}
                    >
                      {formatFinanceAmount(pool.balance, currency, { sign: pool.balance.startsWith('-') ? 'net' : 'none' })}
                    </AppText>
                    {pool.balance.startsWith('-') && (
                      <AppText variant="caption" tone="danger" weight="700">
                        Te excediste de lo reservado
                      </AppText>
                    )}
                  </View>
                  <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                </InteractivePressable>
              ))}
            </AppCard>
          ) : (
            <AppCard variant="quiet" padding="generous">
              <EmptyState
                title="Todavía no tenés pozos"
                description="Creá tu primer pozo para empezar a organizar tu dinero."
                illustration={<HomePlusIcon name="wallet-outline" size={32} color={colors.terracotta[600]} />}
              />
              <AppButton title="Crear pozo" onPress={() => setCreateVisible(true)} style={styles.emptyCta} />
            </AppCard>
          )}
        </View>
      )}

      <CreatePoolSheet
        visible={createVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        onRequestClose={() => setCreateVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      <PoolDetailSheet
        visible={detailVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={detailPool}
        pools={activePools}
        unassignedKnown={summary?.unassignedKnown ?? '0'}
        onRequestClose={() => { setDetailVisible(false); setDetailPool(null); }}
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
      currency={currency}
      onRequestClose={() => navigation.goBack()}
    />
  );
}

const styles = StyleSheet.create({
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
  currencyBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.terracotta[50],
    alignSelf: 'flex-start',
  },
  loading: {
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  sections: {
    gap: spacing[4],
  },
  moneyOverview: {
    gap: spacing[2],
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  poolRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  poolRowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  poolInfo: {
    flex: 1,
    minWidth: 0,
  },
  poolBalance: {
    alignItems: 'flex-end',
    gap: spacing[1],
    maxWidth: '40%',
  },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
});
