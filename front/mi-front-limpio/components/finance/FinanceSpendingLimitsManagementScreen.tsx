/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  AppButton,
  AppScreen,
  AppText,
  ErrorState,
  InteractivePressable,
  Skeleton,
  UndoToast,
} from '../ui';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  FinanceEmptyState,
  FinanceIconBox,
  FinanceListRow,
  FinanceIconAction,
  FinancePeriodNavigator,
  FinanceSection,
  FinanceSegmented,
  FinanceUtilityRow,
  FINANCE_ACTION_ICON_SIZE,
  financeSpacing,
} from './ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  listFinanceSpendingLimits,
  getFinanceSpendingLimitProgress,
  cancelFinanceSpendingLimit,
  type FinanceSpendingLimitDto,
  type FinanceSpendingLimitProgressDto,
  type FinanceSpendingLimitPeriodType,
  type FinanceSpendingLimitCancelScope,
} from '../../services/finance/financeSpendingLimits';
import { shiftFinanceMonth } from '../../services/finance/financePeriod';
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
  onManageCategories: () => void;
};

const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

function formatPeriodHuman(periodType: FinanceSpendingLimitPeriodType, period: string): string {
  if (periodType === 'MONTHLY') {
    const [year, month] = period.split('-').map(Number);
    if (year && month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return period;
  }
  return period;
}

function getGeneralLimitProgress(
  overallLimits: FinanceSpendingLimitDto[],
  progressById: Map<string, FinanceSpendingLimitProgressDto>
): { limit: FinanceSpendingLimitDto; progress: FinanceSpendingLimitProgressDto } | null {
  if (overallLimits.length === 0) return null;
  const limit = overallLimits[0];
  const progress = progressById.get(limit.id);
  if (!progress) return null;
  return { limit, progress };
}

function FinanceSpendingLimitsManagementSurface({
  accessToken,
  contextType,
  contextLabel,
  currency,
  basePeriod,
  onRequestClose,
  onManageCategories,
}: FinanceSpendingLimitsManagementScreenProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [limits, setLimits] = useState<FinanceSpendingLimitDto[] | null>(null);
  const [progress, setProgress] = useState<FinanceSpendingLimitProgressDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [detailLimit, setDetailLimit] = useState<FinanceSpendingLimitProgressDto | null>(null);
  const [editLimit, setEditLimit] = useState<FinanceSpendingLimitDto | null>(null);
  const [createScopeType, setCreateScopeType] = useState<'OVERALL' | 'CATEGORY'>('OVERALL');
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedPeriodType, setSelectedPeriodType] = useState<FinanceSpendingLimitPeriodType>('MONTHLY');
  const [displayPeriod, setDisplayPeriod] = useState<string>(basePeriod);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const readKeyRef = useRef<string | null>(null);

  // Initialize displayPeriod from basePeriod
  useEffect(() => {
    setDisplayPeriod(basePeriod);
  }, [basePeriod]);

  const periodType = selectedPeriodType;

  useEffect(() => {
    if (!accessToken) {
      readKeyRef.current = null;
      setLimits(null);
      setProgress(null);
      setLoading(false);
      setListError(null);
      return;
    }

    const requestKey = `${contextType}:${currency}:${periodType}:${displayPeriod}:${refreshNonce}`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setLoading(true);
    setListError(null);

    Promise.all([
      listFinanceSpendingLimits({
        accessToken,
        contextType,
        currency,
        periodType,
        period: displayPeriod,
        signal: controller.signal,
        contextScope: `finance-spending-limits-mgmt-list:${requestKey}`,
      }),
      getFinanceSpendingLimitProgress({
        accessToken,
        contextType,
        currency,
        periodType,
        period: displayPeriod,
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
  }, [accessToken, contextType, currency, periodType, displayPeriod, refreshNonce]);

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

  const handleCancelLimit = async (
    limit: FinanceSpendingLimitProgressDto,
    requestedScope: FinanceSpendingLimitCancelScope,
  ) => {
    if (!accessToken) return;

    setIsCancelling(true);
    setCancelError(null);

    const controller = new AbortController();
    const cancelRequestKey = `${contextType}:${currency}:${periodType}:${refreshNonce}`;

    try {
      const { generateMutationId } = await import('../../services/api');
      const { hashIdempotencyRequestV2 } = await import('../../services/finance/idempotency');

      const mutationId = generateMutationId();
      const idempotencyKey = `spending-limit-cancel-${mutationId}`;
      const isOneOff = limit.recurrenceType === 'ONE_OFF';
      const cancelScope: FinanceSpendingLimitCancelScope = isOneOff ? 'ONE_OFF' : requestedScope;
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

  const overallLimits = activeLimits.filter((l) => l.scopeType === 'OVERALL');
  const categoryLimits = activeLimits.filter((l) => l.scopeType === 'CATEGORY');

  const generalLimitData = getGeneralLimitProgress(overallLimits, progressById);

  const hasAnyLimits = overallLimits.length > 0 || categoryLimits.length > 0;

  const movePeriod = (direction: 'previous' | 'next') => {
    setDisplayPeriod((current) => {
      if (periodType === 'MONTHLY') return shiftFinanceMonth(current, direction);
      const year = Number(current.slice(0, 4));
      const nextYear = Number.isFinite(year) ? year + (direction === 'next' ? 1 : -1) : new Date().getFullYear();
      return String(nextYear);
    });
  };

  const changePeriodType = (nextType: FinanceSpendingLimitPeriodType) => {
    setSelectedPeriodType(nextType);
    setDisplayPeriod((current) => nextType === 'MONTHLY'
      ? (current.includes('-') ? current : `${current}-01`)
      : current.slice(0, 4));
  };

  const openCreateGeneral = () => {
    setCreateScopeType('OVERALL');
    setCreateVisible(true);
  };

  const openCreateCategory = () => {
    setCreateScopeType('CATEGORY');
    setCreateVisible(true);
  };

  const renderGeneralSurface = () => {
    if (generalLimitData) {
      const { limit, progress } = generalLimitData;
      const spent = progress.spent;
      const limitAmount = limit.amount;
      const percentUsed = Number(progress.percentUsed);
      const status = progress.status;
      const remaining = progress.remaining;
      const overBy = progress.overBy;
      const isOver = status === 'OVER';
      const isAt = status === 'AT';

      return (
        <FinanceSection title="General">
          <InteractivePressable
            onPress={() => handleDetailLimit(limit)}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.generalSurface}
            accessibilityRole="button"
            accessibilityLabel={`Límite general, ${formatFinanceAmount(spent, currency)} de ${formatFinanceAmount(limitAmount, currency)}`}
          >
          <View style={styles.generalProgress}>
            {!isOver ? (
              <>
                <View style={styles.generalValues}>
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Gastaste
                    </AppText>
                    <AppText variant="title2" weight="800">
                      {formatFinanceAmount(spent, currency)}
                    </AppText>
                  </View>
                  <View style={styles.generalDivider} />
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      de
                    </AppText>
                    <AppText variant="title2" weight="800">
                      {formatFinanceAmount(limitAmount, currency)}
                    </AppText>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(percentUsed, 100)}%`, backgroundColor: isAt ? colors.warning.strong : colors.terracotta[600] },
                    ]}
                  />
                </View>
                <View style={styles.generalRemaining}>
                  <AppText variant="body" weight="700" tone={isAt ? 'warning' : 'success'}>
                    Te quedan {formatFinanceAmount(remaining, currency, { sign: 'none' })}
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.generalValues}>
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Gastaste
                    </AppText>
                    <AppText variant="title2" weight="800" tone="danger">
                      {formatFinanceAmount(spent, currency)}
                    </AppText>
                  </View>
                  <View style={styles.generalDivider} />
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Límite
                    </AppText>
                    <AppText variant="title2" weight="800">
                      {formatFinanceAmount(limitAmount, currency)}
                    </AppText>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: '100%', backgroundColor: colors.danger.strong },
                    ]}
                  />
                </View>
                <View style={styles.generalRemaining}>
                  <AppText variant="body" weight="700" tone="danger">
                    Superaste el límite por {formatFinanceAmount(overBy, currency, { sign: 'none' })}
                  </AppText>
                </View>
              </>
            )}
          </View>
        </InteractivePressable>
        </FinanceSection>
      );
    }

    // No general limit: el Header + sigue siendo owner de crear; la acción
    // de sección 7A reutiliza el mismo destino sin duplicar CTA.
    return (
      <FinanceSection title="General" actionLabel="Definir límite general" onAction={openCreateGeneral}>
        <AppText variant="body" tone="secondary" style={styles.quietCopy}>
          Todavía no definiste un límite general.
        </AppText>
      </FinanceSection>
    );
  };

  const renderCategoryLimitRow = (limit: FinanceSpendingLimitDto, index: number, total: number) => {
    const p = progressById.get(limit.id);
    if (!p) return null;

    const spent = p.spent;
    const limitAmount = limit.amount;
    const status = p.status;
    const remaining = p.remaining;
    const overBy = p.overBy;
    const isOver = status === 'OVER';
    const isAt = status === 'AT';

    const categoryLabel = limit.categoryLabelSnapshot ?? 'Categoría';

    // Try to match native category by label
    const slug = categoryLabel
      .trim()
      .toLocaleLowerCase('es-AR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const LABEL_PRESENTATION: Record<string, { iconKey: string; tone: string }> = {
      alimentacion: { iconKey: 'restaurant-outline', tone: 'terracotta' },
      vivienda: { iconKey: 'home-outline', tone: 'sand' },
      servicios_y_facturas: { iconKey: 'receipt-outline', tone: 'info' },
      transporte: { iconKey: 'car-outline', tone: 'info' },
      salud: { iconKey: 'medkit-outline', tone: 'sage' },
      educacion: { iconKey: 'school-outline', tone: 'sand' },
      compras: { iconKey: 'bag-outline', tone: 'terracotta' },
      ocio: { iconKey: 'ticket-outline', tone: 'terracotta' },
      suscripciones: { iconKey: 'repeat-outline', tone: 'info' },
      mascotas: { iconKey: 'paw-outline', tone: 'sand' },
      impuestos_y_tasas: { iconKey: 'document-text-outline', tone: 'sand' },
      comisiones_e_intereses: { iconKey: 'card-outline', tone: 'info' },
    };

    const matched = LABEL_PRESENTATION[slug];
    const iconKey = matched?.iconKey ?? 'pricetag-outline';
    const tone = matched?.tone ?? 'neutral';

    const getToneColor = (tone: string) => {
      switch (tone) {
        case 'terracotta': return colors.terracotta[600];
        case 'sage': return colors.sage[600];
        case 'sand': return colors.sand[600];
        case 'info': return colors.info.text;
        default: return colors.text.tertiary;
      }
    };

    // Fila autoridad 7A: icono | título | subtítulo (gastado de límite) |
    // verdad derecha (restante/superado) | chevron | divisor inset.
    // La barra de progreso vive en la superficie General; aquí el estado
    // viaja en tonos + textos (misma información, sin rediseño de producto).
    return (
      <FinanceListRow
        key={limit.id}
        title={categoryLabel}
        subtitle={`${formatFinanceAmount(spent, currency, { sign: 'none' })} de ${formatFinanceAmount(limitAmount, currency, { sign: 'none' })}`}
        value={
          isOver
            ? `Superaste por ${formatFinanceAmount(overBy, currency, { sign: 'none' })}`
            : `Te quedan ${formatFinanceAmount(remaining, currency, { sign: 'none' })}`
        }
        valueTone={isOver ? 'danger' : isAt ? 'warning' : 'success'}
        icon={
          <FinanceIconBox>
            <HomePlusIcon
              name={iconKey as any}
              size={FINANCE_ACTION_ICON_SIZE}
              color={isOver ? colors.danger.strong : isAt ? colors.warning.strong : getToneColor(tone)}
            />
          </FinanceIconBox>
        }
        chevron
        divider={index < total - 1}
        onPress={() => handleDetailLimit(limit)}
        accessibilityLabel={`${categoryLabel}, ${formatFinanceAmount(spent, currency)} de ${formatFinanceAmount(limitAmount, currency)}`}
      />
    );
  };

  const renderEmptyState = () => (
    <FinanceEmptyState
      level="section"
      icon={<HomePlusIcon name="wallet-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.terracotta[600]} />}
      title="No definiste límites de gasto todavía."
      description="Usalos como referencia de cuánto querés gastar, sin bloquear tus movimientos."
      actionLabel="Administrar categorías"
      onAction={onManageCategories}
    />
  );

  const renderCategoryAbsent = () => {
    if (overallLimits.length > 0 && categoryLimits.length === 0) {
      return (
        <FinanceSection
          title="Por categoría"
          actionLabel="Agregar límite por categoría"
          onAction={openCreateCategory}
          divided={false}
        >
          <AppText variant="body" tone="secondary" style={styles.quietCopy}>
            Todavía no definiste límites por categoría.
          </AppText>
        </FinanceSection>
      );
    }
    return null;
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
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver a Finanzas"
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </FinanceIconAction>
        <AppText variant="title1" weight="800">Límites de gasto</AppText>
        <AppButton
          variant="icon"
          onPress={openCreateGeneral}
          accessibilityLabel="Crear límite"
          haptic="medium"
          style={styles.headerIconButton}
        >
          <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
        </AppButton>
      </View>

      <FinanceUtilityRow
        left={
          <AppText variant="caption" tone="secondary" weight="700">
            {currency}
          </AppText>
        }
        center={<FinancePeriodNavigator
          label={formatPeriodHuman(periodType, displayPeriod)}
          onPrevious={() => movePeriod('previous')}
          onNext={() => movePeriod('next')}
          previousAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes anterior' : 'Año anterior'}
          nextAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes siguiente' : 'Año siguiente'}
        />}
      />

      <FinanceSegmented
        variant="compact"
        distribution="equal"
        value={periodType}
        options={[
          { value: 'MONTHLY', label: 'Mensual', accessibilityLabel: 'Mensual' },
          { value: 'YEARLY', label: 'Anual', accessibilityLabel: 'Anual' },
        ]}
        onChange={changePeriodType}
      />

      {loading && !limits ? (
        <View style={styles.loading}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="80%" height={60} />
          <Skeleton width="60%" height={12} />
        </View>
      ) : listError ? (
        <ErrorState title="No pudimos cargar tus límites" description={listError} onRetry={() => setRefreshNonce((n) => n + 1)} />
      ) : (
        <View style={styles.sections}>
          {!hasAnyLimits ? renderEmptyState() : (
            <>
              {renderGeneralSurface()}

              {categoryLimits.length > 0 ? (
                <FinanceSection title="Por categoría" divided={false}>
                  {categoryLimits.map((limit, index) => renderCategoryLimitRow(limit, index, categoryLimits.length))}
                </FinanceSection>
              ) : renderCategoryAbsent()}

              <InteractivePressable
                onPress={onManageCategories}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.manageCategoriesRow}
                accessibilityRole="button"
                accessibilityLabel="Administrar categorías"
              >
                <AppText variant="body" weight="800" tone="brand">
                  Administrar categorías
                </AppText>
                <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
              </InteractivePressable>
            </>
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
        initialScopeType={createScopeType}
        initialPeriodType={periodType}
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
      onManageCategories={() => navigation.navigate('FinanceCategoryManagement', {
        contextType,
        currency,
      })}
    />
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets } = theme;
  return StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  backButton: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButton: {
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  loading: {
    paddingVertical: spacing[4],
    gap: spacing[2],
    alignItems: 'center',
  },
  sections: {
    gap: financeSpacing.sectionGap,
  },
  generalSurface: {
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.surface.soft,
  },
  quietCopy: {
    paddingVertical: spacing[1],
  },
  generalProgress: {
    gap: spacing[2],
  },
  generalValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[3],
  },
  generalValue: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  generalDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.subtle,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  generalRemaining: {
    paddingTop: spacing[1],
  },
  manageCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
}
