import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { AppRefreshProvider } from './context/AppRefreshContext';
import { AppNavigator } from './navigation/AppNavigator';
import type { RootStackParamList } from './navigation/types';
import { registerLifecycleHandlers } from './services/registerLifecycleHandlers';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { CoreNetworkRecoveryBridge } from './components/CoreNetworkRecoveryBridge';

registerLifecycleHandlers();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      P00Splash: '',
      Login: 'login',
      P01Registro: 'registro',
      ForgotPassword: 'forgot-password',
      UpdatePassword: 'auth/callback',
      P02CrearGrupo: 'crear-grupo',
      P03InvitarPersonas: 'invitar/:householdId',
      HomeTabs: {
        path: 'home',
        screens: {
          PlannerTab: {
            path: 'planner',
            screens: {
              PlannerHome: '',
              // Deep-link paths for detail screens under the PlannerTab stack.
              // Entity IDs are validated as UUIDs before any request.
              // Household is resolved server-side from the authenticated context.
              // An entity belonging to another household results in deny/not-found.
              TaskDetail: 'tasks/:entityId',
              EventDetail: 'events/:entityId',
              GoalDetail: 'goals/:entityId',
              PlannerSearch: 'search',
            },
          },
        },
      },
      JoinHousehold: 'join',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HouseholdProvider>
          <FeatureFlagsProvider>
            <AppRefreshProvider>
              <CoreNetworkRecoveryBridge />
              <NavigationContainer linking={linking}>
                <AppNavigator />
              </NavigationContainer>
            </AppRefreshProvider>
          </FeatureFlagsProvider>
        </HouseholdProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
