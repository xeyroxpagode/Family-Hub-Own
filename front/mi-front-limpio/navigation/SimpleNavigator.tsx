import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SimpleHomeScreen } from '../screens/simple/SimpleHomeScreen';
import {
  SimpleAgendaScreen,
  SimpleCallsScreen,
  SimpleFamilyScreen,
  SimpleMedicationScreen,
  SimpleModuleEntryScreen,
  SimpleMoreScreen,
  SimpleSettingsScreen,
  SimpleSosScreen,
} from '../screens/simple/SimpleDestinationScreens';

export type SimpleStackParamList = {
  SimpleHome: undefined;
  SimpleFamily: undefined;
  SimpleMedication: undefined;
  SimpleAgenda: undefined;
  SimpleCalls: undefined;
  SimpleMore: undefined;
  SimpleSettings: undefined;
  SimpleSos: undefined;
  SimpleModuleEntry: { moduleId: string; title: string };
};

const Stack = createNativeStackNavigator<SimpleStackParamList>();

/** A presentation shell only: domains, auth and stores remain shared. */
export function SimpleNavigator() {
  return <Stack.Navigator initialRouteName="SimpleHome" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="SimpleHome" component={SimpleHomeScreen} />
    <Stack.Screen name="SimpleFamily" component={SimpleFamilyScreen} />
    <Stack.Screen name="SimpleMedication" component={SimpleMedicationScreen} />
    <Stack.Screen name="SimpleAgenda" component={SimpleAgendaScreen} />
    <Stack.Screen name="SimpleCalls" component={SimpleCallsScreen} />
    <Stack.Screen name="SimpleMore" component={SimpleMoreScreen} />
    <Stack.Screen name="SimpleSettings" component={SimpleSettingsScreen} />
    <Stack.Screen name="SimpleSos" component={SimpleSosScreen} />
    <Stack.Screen name="SimpleModuleEntry" component={SimpleModuleEntryScreen} />
  </Stack.Navigator>;
}
