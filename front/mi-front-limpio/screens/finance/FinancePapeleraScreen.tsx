/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
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
import { AppScreen, AppText, AppCard, EmptyState, Skeleton } from '../../components/ui';
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceIconAction,
  FinanceIconBox,
  FinanceListRow,
} from '../../components/finance/ui';
import { getFinanceCategoryPresentationByLabel } from '../../services/finance/financeCategories';
import { TrashMovementDetailSheet } from '../../components/finance/TrashMovementDetailSheet';
import type { MoreStackParamList } from '../../navigation/types';

function trashToneColor(colors: ReturnType<typeof useAppTheme>['colors'], tone: string): string {
  if (tone === 'terracotta') return colors.terracotta[600];
  if (tone === 'sage') return colors.sage[600];
  if (tone === 'sand') return colors.sand[600];
  if (tone === 'info') return colors.info.text;
  return colors.text.tertiary;
}

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
    const dateOnly = (movement.trashedAt ?? movement.transactionDate).split('T')[0];
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
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
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
        <FinanceIconAction
          onPress={handleVisibleBack}
          accessibilityLabel="Volver"
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </FinanceIconAction>
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
        <FinanceErrorState
          level="full"
          message={readState.error}
          onRetry={retryReads}
        />
      ) : null}

      {groups.length === 0 && !readState.loading && !readState.error ? (
        <FinanceEmptyState
          level="section"
          title="Papelera vacía"
          description="Los movimientos que envíes a Papelera aparecerán acá."
          icon={<HomePlusIcon name="trash-outline" size={20} color={colors.text.tertiary} />}
        />
      ) : (
        groups.map((group) => (
          <View key={group.date} style={styles.movementGroup}>
            <AppText variant="caption" tone="secondary" weight="800" style={styles.groupDate}>
              {formatFinanceDateGroupLabel(group.date)}
            </AppText>
            <View>
              {group.movements.map((movement, index) => {
                if (movement.kind === 'TRANSFER') {
                  const isCrossCurrency = movement.sourceCurrency !== movement.destinationCurrency;
                  const value = isCrossCurrency
                    ? `${formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} → ${formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency, { sign: 'none' })}`
                    : formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' });
                  return (
                    <FinanceListRow
                      key={movement.id}
                      title="Transferencia"
                      subtitle={`${movement.sourceAccount.name} → ${movement.destinationAccount.name}`}
                      icon={
                        <FinanceIconBox>
                          <HomePlusIcon name="swap-horizontal-outline" size={18} color={colors.text.tertiary} />
                        </FinanceIconBox>
                      }
                      value={value}
                      chevron
                      divider={index < group.movements.length - 1}
                      onPress={() => handleTrashMovementPress(movement)}
                      accessibilityLabel={`Transferencia en Papelera: ${movement.sourceAccount.name} a ${movement.destinationAccount.name}, ${value}`}
                    />
                  );
                }
                const presentation = getFinanceCategoryPresentationByLabel(movement.categoryLabelSnapshot);
                const typeLabel = movement.transactionType === 'expense' ? 'Gasto' : 'Ingreso';
                const title = movement.description?.trim() ? movement.description.trim() : typeLabel;
                const subtitle = movement.categoryLabelSnapshot
                  ? `${typeLabel} · ${movement.categoryLabelSnapshot}`
                  : typeLabel;
                return (
                  <FinanceListRow
                    key={movement.id}
                    title={title}
                    subtitle={subtitle}
                    icon={
                      <FinanceIconBox>
                        <HomePlusIcon
                          name={presentation.iconKey}
                          size={18}
                          color={trashToneColor(colors, presentation.tone)}
                        />
                      </FinanceIconBox>
                    }
                    value={formatFinanceAmount(movement.amount, movement.currency, {
                      sign: 'transaction',
                      transactionType: movement.transactionType,
                    })}
                    valueTone={movement.transactionType === 'expense' ? 'danger' : 'success'}
                    chevron
                    divider={index < group.movements.length - 1}
                    onPress={() => handleTrashMovementPress(movement)}
                    accessibilityLabel={`Movimiento en Papelera: ${typeLabel} ${formatFinanceAmount(movement.amount, movement.currency, { sign: 'transaction', transactionType: movement.transactionType })}`}
                  />
                );
              })}
            </View>
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

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { spacing, touchTargets } = theme;

  return StyleSheet.create({
  content: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
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
  });
}
