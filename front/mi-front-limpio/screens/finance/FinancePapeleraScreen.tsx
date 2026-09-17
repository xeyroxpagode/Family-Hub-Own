import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AbortError, ApiError } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import { formatFinanceDateGroupLabel } from '../../services/finance/financePeriod';
import { financeContextLabel, financeContextViewState } from '../../services/finance/financeContext';
import {
  listFinanceTrash,
  type FinanceTrashMovementDto,
  type ListFinanceTrashResponse,
} from '../../services/finance/financeMovements';
import { AppScreen, AppText, AppCard, EmptyState, ErrorState, InteractivePressable, Skeleton } from '../../components/ui';
import { TrashMovementDetailSheet } from '../../components/finance/TrashMovementDetailSheet';
import type { MoreStackParamList } from '../../navigation/types';

type FinancePapeleraScreenRouteProp = RouteProp<MoreStackParamList, 'FinancePapelera'>;

type FinancePapeleraReadState = {
  key: string | null;
  loading: boolean;
  error: string | null;
  movements: ListFinanceTrashResponse | null;
};

const EMPTY_READ_STATE: FinancePapeleraReadState = {
  key: null,
  loading: false,
  error: null,
  movements: null,
};

function groupMovementsByTrashedDate(movements: FinanceTrashMovementDto[]) {
  const groups: { date: string; movements: FinanceTrashMovementDto[] }[] = [];
  const indexByDate = new Map<string, number>();

  movements.forEach((movement) => {
    const dateOnly = movement.trashedAt.split('T')[0];
    const existingIndex = indexByDate.get(dateOnly);
    if (existingIndex === undefined) {
      indexByDate.set(dateOnly, groups.length);
      groups.push({ date: dateOnly, movements: [movement] });
      return;
    }
    groups[existingIndex].movements.push(movement);
  });

  return groups;
}

function safeFinanceReadError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar la Papelera. Intenta de nuevo.';
}

export function FinancePapeleraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FinancePapeleraScreenRouteProp>();
  const { session, authMe } = useAuth();
  const { currentHousehold, loading: householdLoading } = useHousehold();
  const selectedContext = route.params.contextType;
  const [readState, setReadState] = useState<FinancePapeleraReadState>(EMPTY_READ_STATE);
  const [readRefreshNonce, setReadRefreshNonce] = useState(0);
  const [selectedTrashMovement, setSelectedTrashMovement] = useState<FinanceTrashMovementDto | null>(null);
  const [trashDetailVisible, setTrashDetailVisible] = useState(false);
  const readKeyRef = useRef<string | null>(null);
  const activeHousehold = currentHousehold
    ? { id: currentHousehold.id, name: currentHousehold.nombre }
    : null;
  const contextLabel = financeContextLabel(selectedContext, activeHousehold, householdLoading);
  const viewState = financeContextViewState(selectedContext, activeHousehold, householdLoading);
  const readReady = Boolean(session?.access_token) && (
    viewState === 'personal_ready' || viewState === 'household_ready'
  );

  useEffect(() => {
    if (!readReady || !session?.access_token) {
      readKeyRef.current = null;
      setReadState(EMPTY_READ_STATE);
      return;
    }

    const requestKey = `${selectedContext}:${selectedContext === 'household' ? activeHousehold?.id ?? 'none' : 'personal'}:trash`;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setReadState((current) => ({
      key: requestKey,
      loading: true,
      error: null,
      movements: current.key === requestKey ? current.movements : null,
    }));

    const readOptions = {
      accessToken: session.access_token,
      contextType: selectedContext,
      signal: controller.signal,
      contextScope: `finance:papelera:${requestKey}`,
    };

    listFinanceTrash(readOptions)
      .then((movements) => {
        if (readKeyRef.current !== requestKey) return;
        setReadState({
          key: requestKey,
          loading: false,
          error: null,
          movements,
        });
      })
      .catch((error) => {
        if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) return;
        if (readKeyRef.current !== requestKey) return;
        setReadState((current) => ({
          key: current.key,
          loading: false,
          error: safeFinanceReadError(error),
          movements: current.key === requestKey ? current.movements : null,
        }));
      });

    return () => {
      controller.abort();
    };
  }, [readReady, selectedContext, activeHousehold?.id, readRefreshNonce, session?.access_token]);

  const handleVisibleBack = () => {
    navigation.goBack();
  };

  const retryReads = () => {
    setReadRefreshNonce((current) => current + 1);
  };

  const handleTrashMovementPress = (movement: FinanceTrashMovementDto) => {
    setSelectedTrashMovement(movement);
    setTrashDetailVisible(true);
  };

  const handleTrashDetailClose = () => {
    setTrashDetailVisible(false);
    setSelectedTrashMovement(null);
  };

  const handleTrashRestoreSuccess = () => {
    setReadRefreshNonce((current) => current + 1);
    handleTrashDetailClose();
  };

  const movements = readState.movements?.movements ?? [];
  const groups = groupMovementsByTrashedDate(movements);

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
          onPress={handleVisibleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </InteractivePressable>
        <View style={styles.headerText}>
          <AppText variant="title1" accessibilityRole="header">
            Papelera
          </AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {viewState === 'loading' ? (
        <AppCard variant="quiet" padding="generous">
          <View style={styles.loadingBlock}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="92%" height={14} />
            <Skeleton width="54%" height={14} />
          </View>
        </AppCard>
      ) : null}

      {viewState === 'household_unavailable' ? (
        <AppCard variant="warning" padding="generous">
          <EmptyState
            title="Contexto de hogar no disponible"
            description="Personal sigue disponible. Finanzas no elige ni cambia el hogar global."
            illustration={<HomePlusIcon name="shield-checkmark-outline" size={30} color={colors.warning.strong} />}
          />
        </AppCard>
      ) : null}

      {readState.loading && movements.length === 0 ? (
        <AppCard variant="quiet" padding="generous">
          <View style={styles.loadingBlock}>
            <Skeleton width="42%" height={16} />
            <Skeleton width="76%" height={18} />
            <Skeleton width="58%" height={14} />
          </View>
        </AppCard>
      ) : null}

      {readState.error && movements.length === 0 ? (
        <ErrorState
          title="No pudimos cargar la Papelera"
          description={readState.error}
          onRetry={retryReads}
        />
      ) : null}

      {groups.length === 0 && !readState.loading && !readState.error ? (
        <AppCard variant="quiet" padding="generous">
          <EmptyState
            title="Papelera vacía"
            description="Los movimientos que envíes a Papelera aparecerán acá."
            illustration={<HomePlusIcon name="trash-outline" size={30} color={colors.terracotta[600]} />}
          />
        </AppCard>
      ) : (
        groups.map((group) => (
          <View key={group.date} style={styles.movementGroup}>
            <AppText variant="caption" tone="secondary" weight="800" style={styles.groupDate}>
              {formatFinanceDateGroupLabel(group.date)}
            </AppText>
            <AppCard variant="quiet" padding="default" style={styles.movementListCard}>
              {group.movements.map((movement) => (
                <InteractivePressable
                  key={movement.id}
                  onPress={() => handleTrashMovementPress(movement)}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={styles.movementRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Movimiento en Papelera: ${movement.transactionType === 'expense' ? 'Gasto' : 'Ingreso'} ${formatFinanceAmount(movement.amount, movement.currency, { sign: 'transaction', transactionType: movement.transactionType })}`}
                >
                  <View style={styles.movementCopy}>
                    <AppText variant="body" weight="800" numberOfLines={1}>
                      {movement.transactionType === 'expense' ? 'Gasto' : 'Ingreso'}
                    </AppText>
                    {movement.description ? (
                      <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>
                        {movement.description}
                      </AppText>
                    ) : null}
                    {movement.categoryLabelSnapshot ? (
                      <AppText variant="caption" tone="secondary" numberOfLines={1}>
                        {movement.categoryLabelSnapshot}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText
                    variant="bodySmall"
                    tone={movement.transactionType === 'expense' ? 'danger' : 'success'}
                    weight="800"
                    style={styles.movementAmount}
                    numberOfLines={1}
                  >
                    {formatFinanceAmount(movement.amount, movement.currency, {
                      sign: 'transaction',
                      transactionType: movement.transactionType,
                    })}
                  </AppText>
                </InteractivePressable>
              ))}
            </AppCard>
          </View>
        ))
      )}

      <TrashMovementDetailSheet
        visible={trashDetailVisible}
        movement={selectedTrashMovement}
        contextType={selectedContext}
        contextLabel={contextLabel}
        accessToken={session?.access_token ?? null}
        personId={authMe?.person?.id ?? null}
        householdId={selectedContext === 'household' ? activeHousehold?.id ?? null : null}
        onRequestClose={handleTrashDetailClose}
        onRestoreSuccess={handleTrashRestoreSuccess}
      />
    </AppScreen>
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
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  headerSpacer: {
    width: touchTargets.normal,
  },
  loadingBlock: {
    gap: spacing[3],
  },
  movementGroup: {
    gap: spacing[2],
  },
  groupDate: {
    marginHorizontal: spacing[2],
  },
  movementListCard: {
    gap: 0,
  },
  movementRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  movementCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  movementAmount: {
    maxWidth: '42%',
    textAlign: 'right',
  },
});