import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  AppCard,
  AppScreen,
  AppText,
  EmptyState,
  ErrorState,
  InteractivePressable,
  Skeleton,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { useHousehold } from '../../context/HouseholdContext';
import {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TAB_LABELS,
  FINANCE_TABS,
  financeContextLabel,
  financeContextViewState,
  financeSelectorOptions,
  selectFinanceContext,
  selectFinanceTab,
  type FinanceContextType,
  type FinanceTabKey,
} from '../../services/finance/financeContext';

const TAB_EMPTY_COPY: Record<FinanceTabKey, { title: string; description: string; icon: React.ComponentProps<typeof HomePlusIcon>['name'] }> = {
  resumen: {
    title: 'Sin informacion financiera todavia',
    description: 'Este espacio se va a completar cuando existan gastos, ingresos y saldos reales.',
    icon: 'pie-chart-outline',
  },
  movimientos: {
    title: 'Sin movimientos registrados',
    description: 'Los gastos e ingresos llegan en la siguiente etapa. Esta vista queda lista sin inventar datos.',
    icon: 'swap-vertical-outline',
  },
  pagos: {
    title: 'Sin pagos configurados',
    description: 'Los pagos esperados se integran en su etapa propia. Por ahora no hay obligaciones simuladas.',
    icon: 'card-outline',
  },
};

const selectorLayoutAnimation = {
  duration: motion.normal,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export function FinanceScreen() {
  const navigation = useNavigation<any>();
  const { currentHousehold, loading, reloading, householdError } = useHousehold();
  const [selectedContext, setSelectedContext] = useState<FinanceContextType>(FINANCE_CONTEXT_TYPES.PERSONAL);
  const [selectedTab, setSelectedTab] = useState<FinanceTabKey>('resumen');
  const [selectorExpanded, setSelectorExpanded] = useState(false);
  const allowVisibleBackExit = useRef(false);

  const contextLoading = loading || reloading;
  const activeHousehold = useMemo(() => {
    if (!currentHousehold) return null;
    return {
      id: currentHousehold.id,
      name: currentHousehold.nombre,
    };
  }, [currentHousehold]);
  const selectorOptions = useMemo(() => financeSelectorOptions(activeHousehold), [activeHousehold]);
  const contextLabel = financeContextLabel(selectedContext, activeHousehold, contextLoading);
  const viewState = financeContextViewState(selectedContext, activeHousehold, contextLoading);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('beforeRemove', (event: { preventDefault: () => void }) => {
      if (allowVisibleBackExit.current) {
        allowVisibleBackExit.current = false;
        return;
      }
      if (!selectorExpanded) return;
      event.preventDefault();
      LayoutAnimation.configureNext(selectorLayoutAnimation);
      setSelectorExpanded(false);
    });

    return unsubscribe;
  }, [navigation, selectorExpanded]);

  const animateSelectorLayout = () => {
    LayoutAnimation.configureNext(selectorLayoutAnimation);
  };

  const expandSelector = () => {
    animateSelectorLayout();
    setSelectorExpanded(true);
  };

  const collapseSelector = () => {
    animateSelectorLayout();
    setSelectorExpanded(false);
  };

  const toggleSelector = () => {
    if (selectorExpanded) {
      collapseSelector();
      return;
    }
    expandSelector();
  };

  const handleVisibleBack = () => {
    allowVisibleBackExit.current = true;
    navigation.goBack();
  };

  const chooseContext = (nextContext: FinanceContextType) => {
    animateSelectorLayout();
    setSelectedContext((current) => selectFinanceContext(current, nextContext));
    setSelectorExpanded(false);
  };

  const emptyCopy = TAB_EMPTY_COPY[selectedTab];

  return (
    <AppScreen
      scroll
      bottomInset="tab"
      background="base"
      safeAreaEdges={['right', 'bottom', 'left']}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable
            onPress={handleVisibleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver a Mas"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          <AppText variant="title1" accessibilityRole="header">
            Finanzas
          </AppText>
        </View>
      </View>

      <View style={styles.selectorArea}>
        <View style={styles.contextCard}>
          <InteractivePressable
            onPress={toggleSelector}
            disabled={contextLoading}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.contextHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: selectorExpanded }}
            accessibilityLabel={`Finanzas de ${contextLabel}`}
            accessibilityHint="Cambia entre finanzas personales y el hogar activo"
          >
            <View style={styles.contextIcon}>
              <HomePlusIcon
                name={selectedContext === FINANCE_CONTEXT_TYPES.PERSONAL ? 'person-outline' : 'home-outline'}
                size={20}
                color={colors.terracotta[700]}
              />
            </View>
            <View style={styles.contextCopy}>
              <AppText variant="caption" tone="secondary">
                Finanzas de
              </AppText>
              <AppText variant="body" weight="800" numberOfLines={1}>
                {contextLabel}
              </AppText>
            </View>
            <HomePlusIcon
              name={selectorExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.text.tertiary}
            />
          </InteractivePressable>

          {selectorExpanded ? (
            <View style={styles.expandedArea}>
              <View style={styles.contextDivider} />
              <View style={styles.contextOptions}>
                {selectorOptions.map((option) => {
                  const selected = option.contextType === selectedContext && (
                    option.contextType === FINANCE_CONTEXT_TYPES.PERSONAL || activeHousehold !== null
                  );
                  return (
                    <InteractivePressable
                      key={option.contextType}
                      onPress={() => chooseContext(option.contextType)}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={styles.contextOption}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.label}
                    >
                      <HomePlusIcon
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800" style={styles.contextOptionLabel} numberOfLines={1}>
                        {option.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {contextLoading ? (
          <View style={styles.loadingRow}>
            <Skeleton width={120} height={12} />
            <AppText variant="caption" tone="tertiary">
              Actualizando Current
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {FINANCE_TABS.map((tab) => {
          const selected = tab === selectedTab;
          return (
            <InteractivePressable
              key={tab}
              onPress={() => setSelectedTab((current) => selectFinanceTab(current, tab))}
              haptic="light"
              pressScale={motion.scale.tab}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={FINANCE_TAB_LABELS[tab]}
            >
              <AppText
                variant="bodySmall"
                weight="800"
                tone={selected ? 'inverse' : 'secondary'}
                numberOfLines={1}
              >
                {FINANCE_TAB_LABELS[tab]}
              </AppText>
            </InteractivePressable>
          );
        })}
      </View>

      {householdError ? (
        <ErrorState title="No pudimos actualizar Current" description={householdError} />
      ) : null}

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

      {viewState === 'personal_ready' || viewState === 'household_ready' ? (
        <AppCard variant="quiet" padding="generous">
          <EmptyState
            title={emptyCopy.title}
            description={emptyCopy.description}
            illustration={<HomePlusIcon name={emptyCopy.icon} size={30} color={colors.terracotta[600]} />}
          />
        </AppCard>
      ) : null}
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
  selectorArea: {
    gap: spacing[2],
  },
  contextCard: {
    minHeight: 64,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  contextHeader: {
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  expandedArea: {
    overflow: 'hidden',
  },
  contextDivider: {
    height: 1,
    marginHorizontal: spacing[4],
    backgroundColor: colors.border.subtle,
  },
  contextOptions: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  contextOption: {
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextOptionLabel: {
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  tabs: {
    minHeight: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.muted,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  tabSelected: {
    backgroundColor: colors.terracotta[600],
  },
  loadingBlock: {
    gap: spacing[3],
  },
});
