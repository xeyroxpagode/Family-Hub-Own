import 'react-native-url-polyfill/auto'; // Parche necesario para que las URLs de Supabase no rompan en React Native
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// En Expo, las variables del .env tienen que empezar sí o sí con EXPO_PUBLIC_
const normalizeEnvValue = (value: string | undefined) =>
  value?.trim().replace(/^['"]+|['"]+$/g, '') ?? '';

const supabaseUrl = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl) {
  throw new Error(
    'Falta EXPO_PUBLIC_SUPABASE_URL. Configurala en front/mi-front-limpio/.env antes de iniciar la app.',
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Falta EXPO_PUBLIC_SUPABASE_ANON_KEY. Configurala en front/mi-front-limpio/.env antes de iniciar la app.',
  );
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[Supabase] init: URL:', supabaseUrl, '(anonKey omitted)');
}

const isNative = Platform.OS !== 'web';

// Singleton persistente entre recargas de Metro HMR.
// Sin esto, cada hot-reload crea un GoTrueClient nuevo sin sesión, mientras
// el viejo conserva la sesión → requests REST usan el nuevo (sin JWT) → RLS 42501.
const GLOBAL_KEY = '__familyhub_supabase_client__';
const GLOBAL_CONFIG_KEY = '__familyhub_supabase_client_config__';
const globalAny = global as Record<string, unknown>;
const currentConfig = `${supabaseUrl}|${supabaseAnonKey}`;

if (!globalAny[GLOBAL_KEY] || globalAny[GLOBAL_CONFIG_KEY] !== currentConfig) {
  globalAny[GLOBAL_KEY] = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      ...(isNative ? { storage: AsyncStorage } : {}),
      ...(isNative ? { lock: processLock } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  globalAny[GLOBAL_CONFIG_KEY] = currentConfig;
}

export const supabase = globalAny[GLOBAL_KEY] as ReturnType<typeof createClient<Database>>;
