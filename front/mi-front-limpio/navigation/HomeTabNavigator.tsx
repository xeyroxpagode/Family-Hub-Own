import React, { useState, useCallback } from 'react';
import { Animated, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { HomeTabParamList, PlannerStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { HomeCoordinador } from '../screens/home/HomeCoordinador';
import { HomeAdulto } from '../screens/home/HomeAdulto';
import { HomeAdolescente } from '../screens/home/HomeAdolescente';
import { HomeAdultoMayor } from '../screens/home/HomeAdultoMayor';
import { FamilyScreen } from '../screens/FamilyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PlannerScreen } from '../screens/planner/PlannerScreen';
import { CreateTaskScreen } from '../screens/planner/CreateTaskScreen';
import { EditTaskScreen } from '../screens/planner/EditTaskScreen';
import { CreateEventScreen } from '../screens/planner/CreateEventScreen';
import { EditEventScreen } from '../screens/planner/EditEventScreen';
import { CreateGoalScreen } from '../screens/planner/CreateGoalScreen';
import { EditGoalScreen } from '../screens/planner/EditGoalScreen';
import { GoalDetailScreen } from '../screens/planner/GoalDetailScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { APP_ICONS, HomePlusIcon } from '../constants/icons';
import { AppTopBar, HouseholdSwitcherSheet, QuickActionSheet, CenterTabButton } from '../components/ui';
import { colors, spacing } from '../constants/theme';

const Tab = createBottomTabNavigator<HomeTabParamList>();
const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();

const AddTabPlaceholder = () => null;

const TabIcon = ({
  iconKey,
  label,
  focused,
}: {
  iconKey: keyof typeof APP_ICONS.bottomTabs;
  label: string;
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
          size={24}
          color={iconColor}
          style={{
            backgroundColor: focused ? 'rgba(255,248,234,0.22)' : 'transparent',
            borderRadius: 12,
            padding: 2,
          }}
        />
      </Animated.View>
      <Animated.Text
        style={{
          fontSize: 9,
          marginTop: 2,
          fontWeight: focused ? '700' : '400',
          color: focused ? '#FFF8EA' : 'rgba(255,248,234,0.76)',
        }}
      >
        {label}
      </Animated.Text>
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#FFF8EA',
            marginTop: 2,
          }}
        />
      )}
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
    <PlannerStack.Navigator screenOptions={{ headerShown: false }}>
      <PlannerStack.Screen name="PlannerHome" component={PlannerScreen} />
      <PlannerStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <PlannerStack.Screen name="EditTask" component={EditTaskScreen} />
      <PlannerStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <PlannerStack.Screen name="EditEvent" component={EditEventScreen} />
      <PlannerStack.Screen name="CreateGoal" component={CreateGoalScreen} />
      <PlannerStack.Screen name="EditGoal" component={EditGoalScreen} />
      <PlannerStack.Screen name="GoalDetail" component={GoalDetailScreen} />
    </PlannerStack.Navigator>
  );
}

function FamilyStackScreen() {
  return <FamilyScreen />;
}

function MoreStackScreen() {
  return <MoreScreen />;
}

export function HomeTabNavigator() {
  const { session, authMe } = useAuth();
  const { currentRole } = useHousehold();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

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

  const handleQuickActionPress = useCallback(() => {
    setShowQuickActions(true);
  }, []);

  const isAdultoMayor = currentRole === 'adulto_mayor';
  const tabBarBg = colors.terracotta[500];
  const tabBarHeight = isAdultoMayor ? 84 : 72;
  const bottomPadding = Math.max(insets.bottom, spacing[3]);

  const quickActionNavigate = useCallback((
    screen: keyof PlannerStackParamList,
    params?: PlannerStackParamList[keyof PlannerStackParamList]
  ) => {
    // Nested navigation from PrivateStack -> HomeTabs -> PlannerTab -> PlannerStack screen
    navigation.navigate('HomeTabs', { 
      screen: 'PlannerTab', 
      params: { screen, params } 
    });
    setShowQuickActions(false);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AppTopBar
        personName={personName}
        personAvatarUrl={personAvatarUrl}
        householdName={householdName}
        householdRole={householdRole}
        onAvatarPress={handleAvatarPress}
        onHouseholdPress={handleHouseholdPress}
      />

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopColor: 'rgba(255,248,234,0.18)',
            borderTopWidth: 1,
            height: tabBarHeight + insets.bottom,
            paddingBottom: bottomPadding,
            paddingTop: 8,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconKey="home"
                label="Inicio"
                focused={focused}
              />
            ),
          }}
        />

        <Tab.Screen
          name="PeopleTab"
          component={FamilyStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconKey="people"
                label="Familia"
                focused={focused}
              />
            ),
          }}
        />

        <Tab.Screen
          name="AddTab"
          component={AddTabPlaceholder}
          options={{
            tabBarButton: () => <CenterTabButton onPress={handleQuickActionPress} />,
          }}
        />

        <Tab.Screen
          name="PlannerTab"
          component={PlannerStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconKey="planner"
                label="Planner"
                focused={focused}
              />
            ),
          }}
        />

        <Tab.Screen
          name="MoreTab"
          component={MoreStackScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconKey="more"
                label="Más"
                focused={focused}
              />
            ),
          }}
        />
      </Tab.Navigator>

      <HouseholdSwitcherSheet
        visible={showHouseholdSwitcher}
        onRequestClose={() => setShowHouseholdSwitcher(false)}
        accessToken={session?.access_token ?? null}
      />

      <QuickActionSheet
        visible={showQuickActions}
        onRequestClose={() => setShowQuickActions(false)}
        onNavigate={quickActionNavigate}
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
    paddingTop: 6,
    minWidth: 48,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
});