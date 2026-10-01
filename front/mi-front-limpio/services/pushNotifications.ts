import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushDevice, unregisterPushDevice } from './api';

const DEVICE_TOKEN_KEY = 'homeplus.pushDeviceToken.v1';

const log = (event: string, details: Record<string, unknown> = {}) => {
  if (__DEV__) console.log(`[Push] ${event}`, details);
};

const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

export async function registerCurrentPushDevice(accessToken: string): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return false;

  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await registerPushDevice(accessToken, token, Platform.OS);
  await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
  log('token.registered', { platform: Platform.OS });
  return true;
}

export async function unregisterCurrentPushDevice(accessToken: string | null | undefined): Promise<void> {
  if (!accessToken) return;
  const token = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) return;
  try {
    await unregisterPushDevice(accessToken, token);
  } finally {
    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
  }
}
