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
      HomeTabs: 'home',
      JoinHousehold: 'join',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HouseholdProvider>
          <AppRefreshProvider>
            <NavigationContainer linking={linking}>
              <AppNavigator />
            </NavigationContainer>
          </AppRefreshProvider>
        </HouseholdProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
