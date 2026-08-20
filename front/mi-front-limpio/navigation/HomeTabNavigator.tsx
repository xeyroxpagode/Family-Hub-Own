import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, ActivityIndicator, Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { HomeTabParamList, MoreStackParamList, PlannerStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { HomeCoordinador } from '../screens/home/HomeCoordinador';
import { HomeAdulto } from '../screens/home/HomeAdulto';
import { HomeAdolescente } from '../screens/home/HomeAdolescente';
import { HomeAdultoMayor } from '../screens/home/HomeAdultoMayor';
import { FamilyScreen } from '../screens/FamilyScreen';
import { FinanceScreen } from '../screens/finance/FinanceScreen';
import { InventarioScreen } from '../screens/inventory/InventarioScreen';
import { PlannerScreen } from '../screens/planner/PlannerScreen';
import { CreateTaskScreen } from '../screens/planner/CreateTaskScreen';
import { EditTaskScreen } from '../screens/planner/EditTaskScreen';
import { CreateEventScreen } from '../screens/planner/CreateEventScreen';
import { EditEventScreen } from '../screens/planner/EditEventScreen';
import { CreateGoalScreen } from '../screens/planner/CreateGoalScreen';
import { PlannerPlanStructureEditScreen } from '../screens/planner/PlannerPlanStructureEditScreen';
import { PlannerPlanDetailScreen } from '../screens/planner/PlannerPlanDetailScreen';
import { PlannerTrashScreen } from '../screens/planner/PlannerTrashScreen';
import { PlannerSearchScreen } from '../screens/planner/PlannerSearchScreen';
import { PlannerAttentionActivityScreen } from '../screens/planner/PlannerAttentionActivityScreen';
import { TaskDetailScreen } from '../screens/planner/TaskDetailScreen';
import { EventDetailScreen } from '../screens/planner/EventDetailScreen';
import {
  PlannerDraftRecoveryRoute,
  PlannerDraftResumeRoute,
  PlannerPresetCreateRoute,
  PlannerPresetDetailRoute,
  PlannerPresetDraftsTrashRoute,
  PlannerPresetEditRoute,
  PlannerPresetLibraryRoute,
} from '../components/planner/presets/PlannerPresetDraftsIntegrationRoutes';
import { MoreScreen } from '../screens/MoreScreen';
import { FinanceAccountsScreen } from '../screens/finance/FinanceAccountsScreen';
import { FinancePapeleraScreen } from '../screens/finance/FinancePapeleraScreen';
import { APP_ICONS, HomePlusIcon } from '../constants/icons';
import { AppTopBar, HouseholdSwitcherSheet, InteractivePressable } from '../components/ui';
import { PlannerSheetProvider, usePlannerSheet } from '../context/PlannerSheetContext';
import { PlannerSheetHost } from '../components/planner/PlannerSheetHost';
import { PlannerDeepLinkProvider } from '../services/planner/plannerDeepLinkProvider';
import { fetchPlannerAttentionRequest } from '../services/planner/plannerAttentionClient';
import { GLOBAL_SURFACE_GATES_OFF } from '../services/planner/globalSurfaceTypes';
import { colors, motion, spacing } from '../constants/theme';

const Tab = createBottomTabNavigator<HomeTabParamList>();
const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function AttentionTopBarButton({ accessToken, householdId, navigation }: {
  accessToken: string | null;
  householdId: string | null;
  navigation: any;
}) {
  const [count, setCount] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!GLOBAL_SURFACE_GATES_OFF.attention.enabled || !accessToken || !householdId) {
      setCount(0);
      return;
    }
    const controller = new AbortController();
    const sequence = ++requestSeq.current;
    void fetchPlannerAttentionRequest({
      accessToken,
      limit: 100,
      signal: controller.signal,
      timeoutMs: 8000,
      contextScope: `planner-attention-badge:${householdId}`,
    }).then((response) => {
      if (sequence !== requestSeq.current || controller.signal.aborted) return;
      setCount(response.items.length);
    }).catch(() => {
      if (sequence !== requestSeq.current || controller.signal.aborted) return;
      setCount(0);
    });
    return () => controller.abort();
  }, [accessToken, householdId]);

  if (!GLOBAL_SURFACE_GATES_OFF.attention.enabled) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('HomeTabs', {
        screen: 'PlannerTab',
        params: {
          screen: 'PlannerAttentionActivity',
          params: { source: 'planner', returnTo: 'previous' },
        },
      })}
      style={({ pressed }) => [styles.attentionButton, pressed && styles.attentionButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Abrir Atención y actividad, ${count} asuntos sin resolver` : 'Abrir Atención y actividad'}
      hitSlop={8}
    >
      <HomePlusIcon name="notifications-outline" size={22} color={colors.text.primary} />
      {count > 0 ? (
        <View style={styles.attentionBadge} accessibilityLabel={`${count} asuntos sin resolver`}>
          <Animated.Text style={styles.attentionBadgeText}>{count > 99 ? '99+' : String(count)}</Animated.Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const TabIcon = ({
  iconKey,
  focused,
}: {
  iconKey: keyof typeof APP_ICONS.bottomTabs;
  focused: boolean;
}) => {
  const iconName = APP_ICONS.bottomTabs[iconKey];
  const iconColor = '#FFF8EA';
  const scale = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.06 : 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);
  
  return (
    <View style={styles.tabIconContainer}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <HomePlusIcon
          name={iconName}
          size={28}
          color={iconColor}
          style={{
            backgroundColor: focused ? 'rgba(255,248,234,0.22)' : 'transparent',
            borderRadius: 16,
            padding: 4,
          }}
        />
      </Animated.View>
    </View>
  );
};

function HomeScreen() {
  const { currentRole, loading, reloading } = useHousehold();

  if (loading || reloading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.terracotta[600]} />
      </View>
    );
  }

  if (currentRole === 'coordinador')  return <HomeCoordinador />;
  if (currentRole === 'adulto')       return <HomeAdulto />;
  if (currentRole === 'adolescente')  return <HomeAdolescente />;
  if (currentRole === 'adulto_mayor') return <HomeAdultoMayor />;

  return <HomeCoordinador />;
}

function PlannerStackScreen() {
  return (
    <PlannerStack.Navigator initialRouteName="PlannerHome" screenOptions={{ headerShown: false }}>
      <PlannerStack.Screen name="PlannerHome" component={PlannerScreen} />
      <PlannerStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <PlannerStack.Screen name="EditTask" component={EditTaskScreen} />
      <PlannerStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <PlannerStack.Screen name="EditEvent" component={EditEventScreen} />
      <PlannerStack.Screen name="CreateGoal" component={CreateGoalScreen} />
      <PlannerStack.Screen name="EditGoal" component={PlannerPlanStructureEditScreen} />
      <PlannerStack.Screen name="GoalDetail" component={PlannerPlanDetailScreen} />
      <PlannerStack.Screen name="PlannerTrash" component={PlannerTrashScreen} />
      <PlannerStack.Screen name="PlannerPresetLibrary" component={PlannerPresetLibraryRoute} />
      <PlannerStack.Screen name="PlannerPresetDetail" component={PlannerPresetDetailRoute} />
      <PlannerStack.Screen name="PlannerPresetCreate" component={PlannerPresetCreateRoute} />
      <PlannerStack.Screen name="PlannerPresetEdit" component={PlannerPresetEditRoute} />
      <PlannerStack.Screen name="PlannerDraftRecovery" component={PlannerDraftRecoveryRoute} />
      <PlannerStack.Screen name="PlannerDraftResume" component={PlannerDraftResumeRoute} />
      <PlannerStack.Screen name="PlannerPresetDraftsTrash" component={PlannerPresetDraftsTrashRoute} />
      <PlannerStack.Screen name="PlannerSearch" component={PlannerSearchScreen} />
      <PlannerStack.Screen name="PlannerAttentionActivity" component={PlannerAttentionActivityScreen} />
      <PlannerStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <PlannerStack.Screen name="EventDetail" component={EventDetailScreen} />
    </PlannerStack.Navigator>
  );
}

function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Family" component={FamilyScreen} />
      <MoreStack.Screen name="Finance" component={FinanceScreen} />
      <MoreStack.Screen name="FinanceAccounts" component={FinanceAccountsScreen} />
      <MoreStack.Screen name="FinancePapelera" component={FinancePapeleraScreen} />
    </MoreStack.Navigator>
  );
}

function TabBarButton({ children, style, ...props }: any) {
  return (
    <InteractivePressable
      {...props}
      style={[styles.tabBarButton, style]}
      haptic="light"
      pressScale={motion.scale.tab}
      pressedOpacity={0.92}
    >
      {children}
    </InteractivePressable>
  );
}

function QuickActionPlaceholder() {
  return null;
}

function QuickActionTabButton({ children, style, ...props }: any) {
  const { openActions } = usePlannerSheet();

  return (
    <InteractivePressable
      {...props}
      onPress={openActions}
      style={[styles.tabBarButton, style]}
      haptic="medium"
      pressScale={motion.scale.icon}
      pressedOpacity={0.94}
      accessibilityRole="button"
      accessibilityLabel="Acciones rapidas"
    >
      {children}
    </InteractivePressable>
  );
}

function QuickActionTabIcon() {
  return (
    <View style={styles.quickActionSlot}>
      <View style={styles.quickActionButton}>
        <HomePlusIcon name="add" size={26} color={colors.text.inverse} />
      </View>
    </View>
  );
}

export function HomeTabNavigator() {
  const { session, authMe } = useAuth();
  const { currentRole, currentHousehold } = useHousehold();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);

  const personName = authMe?.person?.display_name ?? 'Usuario';
  const personAvatarUrl = authMe?.person?.avatar_url ?? null;
  const householdName = authMe?.active_household?.name ?? 'Hogar';
  const householdRole = authMe?.memberships?.find(m => m.household_id === authMe?.active_household?.id)?.role ?? 'adult';

  const handleAvatarPress = useCallback(() => {
    navigation.navigate('ProfileScreen');
  }, [navigation]);

  const handleHouseholdPress = useCallback(() => {
    setShowHouseholdSwitcher(true);
  }, []);

  const isAdultoMayor = currentRole === 'adulto_mayor';
  const tabBarBg = colors.terracotta[500];
  const tabBarContentHeight = isAdultoMayor ? 76 : 68;

  // S2: The Reliability runtime Owner is mounted ONCE in `PrivateNavigator`
  // (AppNavigator) above this `HomeTabNavigator`, so it covers HomeTabs,
  // Quick Actions, Profile and the fallback screens. It survives tab screen
  // unmounts (e.g. navigating away from PlannerTab) and does NOT depend on
  // PlannerScreen mounting. We deliberately do NOT key anything by household
  // here: the Owner detects household changes itself.

  return (
    <View style={styles.container}>
      <AppTopBar
        personName={personName}
        personAvatarUrl={personAvatarUrl}
        householdName={householdName}
        householdRole={householdRole}
        onAvatarPress={handleAvatarPress}
        onHouseholdPress={handleHouseholdPress}
        rightSlot={(
          <AttentionTopBarButton
            accessToken={session?.access_token ?? null}
            householdId={currentHousehold?.id ?? authMe?.active_household?.id ?? null}
            navigation={navigation}
          />
        )}
      />

      <PlannerDeepLinkProvider>
        <PlannerSheetProvider>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: {
              backgroundColor: tabBarBg,
              borderTopColor: 'rgba(255,248,234,0.18)',
              borderTopWidth: 1,
              height: tabBarContentHeight + insets.bottom,
              paddingTop: 0,
              paddingBottom: insets.bottom,
            },
            tabBarItemStyle: {
              height: tabBarContentHeight,
              paddingVertical: spacing[1],
            },
            tabBarButton: (props) => <TabBarButton {...props} />,
          }}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon
                  iconKey="home"
                  focused={focused}
                />
              ),
              tabBarAccessibilityLabel: 'Inicio',
            }}
          />

          <Tab.Screen
            name="InventoryTab"
            component={InventarioScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon
                  iconKey="inventory"
                  focused={focused}
                />
              ),
              tabBarAccessibilityLabel: 'Inventario',
            }}
          />

          <Tab.Screen
            name="QuickActionTab"
            component={QuickActionPlaceholder}
            listeners={{
              tabPress: (event) => {
                event.preventDefault();
              },
            }}
            options={{
              tabBarIcon: () => <QuickActionTabIcon />,
              tabBarButton: (props) => <QuickActionTabButton {...props} />,
              tabBarAccessibilityLabel: 'Acciones rapidas',
            }}
          />

          <Tab.Screen
            name="PlannerTab"
            component={PlannerStackScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon
                  iconKey="planner"
                  focused={focused}
                />
              ),
              tabBarAccessibilityLabel: 'Calendario',
            }}
          />

          <Tab.Screen
            name="MoreTab"
            component={MoreStackScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon
                  iconKey="more"
                  focused={focused}
                />
              ),
              tabBarAccessibilityLabel: 'Más',
            }}
          />
        </Tab.Navigator>

        {/* M3: Single sheet host — replaces both QuickActionSheet Modal and
            the legacy compat-bridge Modal in PlannerScreen. */}
        <PlannerSheetHost />
      </PlannerSheetProvider>
      </PlannerDeepLinkProvider>

      <HouseholdSwitcherSheet
        visible={showHouseholdSwitcher}
        onRequestClose={() => setShowHouseholdSwitcher(false)}
        accessToken={session?.access_token ?? null}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  tabIconContainer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    minWidth: 0,
  },
  tabBarButton: {
    flex: 1,
    minWidth: 0,
  },
  quickActionSlot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -8 }],
  },
  quickActionButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.terracotta[600],
    borderWidth: 2,
    borderColor: 'rgba(255,248,234,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow.floating,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  attentionButtonPressed: {
    backgroundColor: colors.surface.soft,
  },
  attentionBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.terracotta[600],
  },
  attentionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
