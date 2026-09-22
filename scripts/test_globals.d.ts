declare const __DEV__: boolean;
declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  exit(code?: number): never;
};
declare function require(moduleName: string): any;

declare module 'react' {
  export function createElement(type: any, props: any, ...children: any[]): any;
  export const Fragment: Symbol;
  export default {
    createElement: typeof createElement,
    Fragment: typeof Fragment,
  };
}

declare module 'react-native' {
  export const Platform: { OS: string };
  export const View: any;
  export const Text: any;
  export const TouchableOpacity: any;
  export const Pressable: any;
  export const ScrollView: any;
  export const SafeAreaView: any;
  export const StyleSheet: any;
  export const ActivityIndicator: any;
  export const Alert: any;
  export const Image: any;
  export const Switch: any;
  export const TextInput: any;
  export const RefreshControl: any;
  export const Keyboard: any;
  export const useColorScheme: () => 'light' | 'dark';
  export const useWindowDimensions: () => { width: number; height: number };
  export type StyleProp<T> = T;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;
}

declare module '@expo/vector-icons' {
  export const Ionicons: any;
}

declare module 'expo-crypto' {
  export function randomUUID(): string;
}

declare module 'expo-linking' {
  export const createURL: (path: string, queryParams?: Record<string, string>) => string;
}

declare module 'expo-web-browser' {
  export const openAuthSessionAsync: (url: string, redirectUrl: string) => Promise<{ type: string; url?: string }>;
}

declare module 'expo-apple-authentication' {
  export const signInAsync: (options: any) => Promise<any>;
}

declare module 'expo-haptics' {
  export const impactAsync: (style: any) => Promise<void>;
  export const ImpactFeedbackStyle: { Light: string; Medium: string; Heavy: string };
}

declare module '@react-native-async-storage/async-storage' {
  export const getItem: (key: string) => Promise<string | null>;
  export const setItem: (key: string, value: string) => Promise<void>;
  export const removeItem: (key: string) => Promise<void>;
  export const getAllKeys: () => Promise<string[]>;
}

declare module '@supabase/supabase-js' {
  export const createClient: (url: string, key: string, options?: any) => any;
  export type SupabaseClient = any;
  export type User = any;
  export type Session = any;
  export type AuthError = any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaView: any;
  export const useSafeAreaInsets: () => { top: number; bottom: number; left: number; right: number };
}

declare module 'react-native-keyboard-aware-scroll-view' {
  export const KeyboardAwareScrollView: any;
}

declare module '@react-navigation/native' {
  export const useNavigation: () => any;
  export const useRoute: () => any;
  export const useFocusEffect: (callback: () => void | (() => void)) => void;
  export const useIsFocused: () => boolean;
}

declare module 'react-native-gesture-handler' {
  export const GestureDetector: any;
}