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
  listFinanceSpendingLimits,
  getFinanceSpendingLimitProgress,
  cancelFinanceSpendingLimit,
  type FinanceSpendingLimitDto,
  type FinanceSpendingLimitProgressDto,
  type FinanceSpendingLimitScopeType,
  type FinanceSpendingLimitPeriodType,
  type FinanceSpendingLimitRecurrenceType,
  type FinanceSpendingLimitCancelScope,
} from '../../services/finance/financeSpendingLimits';
import type { MoreStackParamList } from '../../navigation/types';
import { SpendingLimitSheet } from './SpendingLimitSheet';
import { SpendingLimitDetailSheet } from './SpendingLimitDetailSheet';

type FinanceSpendingLimitsManagementScreenProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  basePeriod: string;
  onRequestClose: () => void;
};

function FinanceSpendingLimitsManagementSurface({
  accessToken,
  contextType,
  contextLabel,
  currency,
  basePeriod,
  onRequestClose,
}: FinanceSpendingLimitsManagementScreenProps) {
  const [limits, setLimits] = useState<FinanceSpendingLimitDto[] | null>(null);
  const [progress, setProgress] = useState<FinanceSpendingLimitProgressDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [detailLimit, setDetailLimit] = useState<FinanceSpendingLimitProgressDto | null>(null);
  const [editLimit, setEditLimit] = useState<FinanceSpendingLimitDto | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedPeriodType, setSelectedPeriodType] = useState<FinanceSpendingLimitPeriodType>('MONTHLY');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const readKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      readKeyRef.current = null;
      setLimits(null);
      setProgress(null);
      setLoading(false);
      setListError(null);
      return;
    }

    const derivedPeriod = selectedPeriodType === 'YEARLY' && basePeriod
      ? basePeriod.slice(0, 4)
      : basePeriod;

    const requestKey = `${contextType}:${currency}:${selectedPeriodType}:${derivedPeriod}:${refreshNonce}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setLoading(true);
    setListError(null);

    Promise.all([
      listFinanceSpendingLimits({
        accessToken,
        contextType,
        currency,
        periodType: selectedPeriodType,
        period: derivedPeriod,
        signal: controller.signal,
        contextScope: `finance-spending-limits-mgmt-list:${requestKey}`,
      }),
      getFinanceSpendingLimitProgress({
        accessToken,
        contextType,
        currency,
        periodType: selectedPeriodType,
        period: derivedPeriod,
        signal: controller.signal,
        contextScope: `finance-spending-limits-mgmt-progress:${requestKey}`,
      }),
    ])
      .then(([limitsData, progressData]) => {
        if (readKeyRef.current !== requestKey) return;
        setLimits(limitsData.limits);
        setProgress(progressData.limits);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (readKeyRef.current !== requestKey) return;
        setListError('No pudimos cargar tus límites. Intenta de nuevo.');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [accessToken, contextType, currency, selectedPeriodType, refreshNonce]);

  const activeLimits = useMemo(() => limits ?? [], [limits]);

  const progressById = useMemo(() => {
    const map = new Map<string, FinanceSpendingLimitProgressDto>();
    (progress ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [progress]);

  useEffect(() => {
    if (!progress) return;
    setDetailLimit((currentLimit) => {
      if (!currentLimit) return currentLimit;
      const updatedLimit = progressById.get(currentLimit.id);
      if (updatedLimit) return updatedLimit;
      setDetailVisible(false);
      return null;
    });
  }, [progress, progressById]);

  const handleCreateSuccess = () => {
    setCreateVisible(false);
    setSuccessFeedback('Límite creado');
    setRefreshNonce((n) => n + 1);
  };

  const handleEditSuccess = () => {
    setEditVisible(false);
    setEditLimit(null);
    setSuccessFeedback('Límite actualizado');
    setRefreshNonce((n) => n + 1);
  };

  const handleDetailLimit = (limit: FinanceSpendingLimitDto) => {
    const progressData = progressById.get(limit.id);
    if (progressData) {
      setDetailLimit(progressData);
      setDetailVisible(true);
      setCancelError(null);
    }
  };

  const handleEditLimit = (limit: FinanceSpendingLimitDto) => {
    setEditLimit(limit);
    setEditVisible(true);
  };

  const handleCancelLimit = async (limit: FinanceSpendingLimitProgressDto) => {
    if (!accessToken) return;

    setIsCancelling(true);
    setCancelError(null);

    const controller = new AbortController();
    const cancelRequestKey = `${contextType}:${currency}:${selectedPeriodType}:${refreshNonce}`;

    try {
      const { generateMutationId } = await import('../../services/api');
      const { hashIdempotencyRequestV2 } = await import('../../services/finance/idempotency');

      const mutationId = generateMutationId();
      const idempotencyKey = `spending-limit-cancel-${mutationId}`;
      const isOneOff = limit.recurrenceType === 'ONE_OFF';
      const cancelScope: FinanceSpendingLimitCancelScope = isOneOff ? 'ONE_OFF' : 'THIS_AND_FOLLOWING';
      const payload = { id: limit.id, period: limit.period, cancelScope };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.spendingLimit.cancel',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: limit.id,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await cancelFinanceSpendingLimit({
        accessToken,
        contextType,
        input: payload,
        mutationId,
        idempotencyKey,
        payloadHash,
        signal: controller.signal,
        contextScope: `finance-spending-limits-mgmt-cancel:${cancelRequestKey}`,
      });

      setSuccessFeedback('Límite cancelado');
      setRefreshNonce((n) => n + 1);
      setDetailVisible(false);
      setDetailLimit(null);
    } catch (err: any) {
      setCancelError(err?.message ?? 'No pudimos cancelar el límite. Intenta de nuevo.');
    } finally {
      setIsCancelling(false);
    }
  };

  const openCreateGeneral = () => {
    setCreateVisible(true);
  };

  const openCreateCategory = () => {
    setCreateVisible(true);
  };

  const renderLimitCard = (limit: FinanceSpendingLimitDto) => {
    const p = progressById.get(limit.id);
    const spent = p?.spent ?? '0';
    const limitAmount = limit.amount;
    const percentUsed = p ? Number(p.percentUsed) : 0;
    const status = p?.status ?? 'UNDER';
    const overBy = p?.overBy ?? '0';
    const isOver = status === 'OVER';
    const isAt = status === 'AT';

    const label = limit.categoryLabelSnapshot ?? 'General';
    const scopeBadge = limit.scopeType === 'OVERALL' ? 'General' : 'Categoría';
    const periodLabel = selectedPeriodType === 'MONTHLY' ? 'Mensual' : 'Anual';
    const recurrenceLabel = limit.recurrenceType === 'RECURRING' ? 'Recurrente' : 'Una vez';

    return (
      <InteractivePressable
        key={limit.id}
        onPress={() => handleDetailLimit(limit)}
        haptic="light"
        pressScale={motion.scale.card}
        style={[styles.limitRow, styles.limitRowNotFirst]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatFinanceAmount(spent, currency)} de ${formatFinanceAmount(limitAmount, currency)}`}
      >
        <View style={styles.limitInfo}>
          <View style={styles.limitHeader}>
            <AppText variant="body" weight="800" numberOfLines={1}>{label}</AppText>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.scopeBadge}>
              {scopeBadge}
            </AppText>
          </View>
          <View style={styles.limitMeta}>
            <AppText variant="caption" tone="secondary">
              {periodLabel} · {recurrenceLabel}
            </AppText>
          </View>
          {p && (
            <View style={styles.limitProgress}>
              <View style={styles.limitValues}>
                <AppText
                  variant="caption"
                  weight="700"
                  tone={isOver ? 'danger' : isAt ? 'warning' : 'secondary'}
                >
                  {formatFinanceAmount(spent, currency, { sign: 'none' })} de{' '}
                  {formatFinanceAmount(limitAmount, currency, { sign: 'none' })}
                </AppText>
                <AppText
                  variant="caption"
                  weight="800"
                  tone={isOver ? 'danger' : isAt ? 'warning' : 'secondary'}
                >
                  {percentUsed.toFixed(0)}%
                </AppText>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(percentUsed, 100)}%`, backgroundColor: isOver ? colors.danger.strong : isAt ? colors.warning.strong : colors.terracotta[600] },
                  ]}
                />
              </View>
              {isOver && overBy !== '0' && !isZeroDecimalString(overBy) && (
                <AppText variant="caption" tone="danger" weight="700" style={styles.overText}>
                  Te pasaste {formatFinanceAmount(overBy, currency, { sign: 'none' })}
                </AppText>
              )}
            </View>
          )}
        </View>
        <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
      </InteractivePressable>
    );
  };

  const overallLimits = activeLimits.filter((l) => l.scopeType === 'OVERALL');
  const categoryLimits = activeLimits.filter((l) => l.scopeType === 'CATEGORY');

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
        <AppText variant="title1" weight="800">Límites de gasto</AppText>
      </View>

      <View style={styles.currencyBadge}>
        <AppText variant="caption" tone="secondary" weight="700">{currency}</AppText>
      </View>

      <View style={styles.periodSelector}>
        {(['MONTHLY', 'YEARLY'] as FinanceSpendingLimitPeriodType[]).map((type) => (
          <InteractivePressable
            key={type}
            onPress={() => setSelectedPeriodType(type)}
            haptic="light"
            pressScale={motion.scale.tab}
            style={[
              styles.periodButton,
              selectedPeriodType === type && styles.periodButtonSelected,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedPeriodType === type }}
            accessibilityLabel={type === 'MONTHLY' ? 'Mensual' : 'Anual'}
          >
            <AppText variant="bodySmall" weight="800" tone={selectedPeriodType === type ? 'inverse' : 'secondary'}>
              {type === 'MONTHLY' ? 'Mensual' : 'Anual'}
            </AppText>
          </InteractivePressable>
        ))}
      </View>

      {loading && !limits ? (
        <View style={styles.loading}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="80%" height={40} />
          <Skeleton width="60%" height={12} />
        </View>
      ) : listError ? (
        <ErrorState title="No pudimos cargar tus límites" description={listError} onRetry={() => setRefreshNonce((n) => n + 1)} />
      ) : (
        <View style={styles.sections}>
          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">General</AppText>
            <AppButton
              variant="icon"
              onPress={openCreateGeneral}
              accessibilityLabel="Crear límite general"
              haptic="medium"
            >
              <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
            </AppButton>
          </View>

          {overallLimits.length > 0 ? (
            <AppCard variant="quiet" padding="default">
              {overallLimits.map((limit, index) => (
                <View key={limit.id} style={[styles.limitRow, index > 0 && styles.limitRowNotFirst]}>
                  {renderLimitCard(limit)}
                </View>
              ))}
            </AppCard>
          ) : (
            <AppCard variant="quiet" padding="generous">
              <EmptyState
                title="Sin límites generales"
                description="Creá un límite general para controlar tu gasto total del período."
                illustration={<HomePlusIcon name="wallet-outline" size={32} color={colors.terracotta[600]} />}
              />
            </AppCard>
          )}

          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">Categorías</AppText>
            <AppButton
              variant="icon"
              onPress={openCreateCategory}
              accessibilityLabel="Crear límite por categoría"
              haptic="medium"
            >
              <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
            </AppButton>
          </View>

          {categoryLimits.length > 0 ? (
            <AppCard variant="quiet" padding="default">
              {categoryLimits.map((limit, index) => (
                <View key={limit.id} style={[styles.limitRow, index > 0 && styles.limitRowNotFirst]}>
                  {renderLimitCard(limit)}
                </View>
              ))}
            </AppCard>
          ) : (
            <AppCard variant="quiet" padding="generous">
              <EmptyState
                title="Sin límites por categoría"
                description="Creá límites para categorías específicas como Alimentación o Transporte."
                illustration={<HomePlusIcon name="pricetag-outline" size={32} color={colors.terracotta[600]} />}
              />
            </AppCard>
          )}
        </View>
      )}

      <SpendingLimitSheet
        visible={createVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        basePeriod={basePeriod}
        mode="create"
        initialScopeType={overallLimits.length > 0 && categoryLimits.length === 0 ? 'OVERALL' : 'CATEGORY'}
        initialPeriodType={selectedPeriodType}
        initialData={null}
        onRequestClose={() => setCreateVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      <SpendingLimitSheet
        visible={editVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        basePeriod={basePeriod}
        mode="edit"
        initialData={editLimit}
        onRequestClose={() => { setEditVisible(false); setEditLimit(null); }}
        onSuccess={handleEditSuccess}
      />

      <SpendingLimitDetailSheet
        visible={detailVisible}
        limit={detailLimit}
        currency={currency}
        onRequestClose={() => { setDetailVisible(false); setDetailLimit(null); setCancelError(null); }}
        onEdit={handleEditLimit}
        onCancel={handleCancelLimit}
        cancelError={cancelError}
        isCancelling={isCancelling}
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

export function FinanceSpendingLimitsManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'FinanceSpendingLimitsManagement'>>();
  const { session } = useAuth();
  const { currentHousehold, loading, reloading } = useHousehold();

  const contextType = route.params.contextType;
  const currency = route.params.currency;
  const basePeriod = route.params.period;

  const activeHousehold = currentHousehold
    ? { id: currentHousehold.id, name: currentHousehold.nombre }
    : null;

  const contextLabel = contextType === 'personal'
    ? 'Personal'
    : loading || reloading
    ? 'Actualizando contexto'
    : activeHousehold?.name ?? 'Contexto no disponible';

  return (
    <FinanceSpendingLimitsManagementSurface
      accessToken={session?.access_token ?? null}
      contextType={contextType}
      contextLabel={contextLabel}
      currency={currency}
      basePeriod={basePeriod}
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
  periodSelector: {
    minHeight: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.muted,
    flexDirection: 'row',
    padding: spacing[1],
    gap: spacing[1],
  },
  periodButton: {
    flex: 1,
    minHeight: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  periodButtonSelected: {
    backgroundColor: colors.terracotta[600],
  },
  loading: {
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  sections: {
    gap: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  limitRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  limitRowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  limitInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  scopeBadge: {
    minWidth: 64,
    minHeight: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  limitMeta: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  limitProgress: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  limitValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  overText: {
    marginTop: spacing[1],
  },
});