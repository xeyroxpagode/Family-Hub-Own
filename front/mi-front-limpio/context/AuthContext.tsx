import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import {
  ApiError,
  authLogin,
  authLogout,
  authRegister,
  getAuthMe,
  type AuthMe,
  type AuthSession,
} from '../services/api';
import { supabase } from '../supabase';
import { getAuthErrorMessage } from '../utils/authErrors';

WebBrowser.maybeCompleteAuthSession();

const PENDING_JOIN_KEY = 'pendingJoinToken';

type AuthActionResult = {
  error: string | null;
};

type SignUpResult = AuthActionResult & {
  needsEmailConfirmation: boolean;
};

type SignInParams = {
  email: string;
  password: string;
};

type SignUpParams = {
  email: string;
  password: string;
  nombre: string;
};

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  authMe: AuthMe | null;
  authMeLoading: boolean;
  authMeError: string | null;
  isPasswordRecovery: boolean;
  pendingJoinToken: string | null;
  signIn: (params: SignInParams) => Promise<AuthActionResult>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signInWithApple: () => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  refreshSession: () => Promise<AuthActionResult>;
  refetchMe: () => Promise<AuthMe | null>;
  handleIncomingUrl: (url: string) => Promise<AuthActionResult>;
  clearPasswordRecovery: () => void;
  clearPendingJoinToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CALLBACK_PATH = 'auth/callback';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getFirstValue = (value: string | string[] | null | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const getAuthRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);

const parseAuthUrl = (url: string) => {
  const normalizedUrl = url.includes('#') ? url.replace('#', '?') : url;
  const { path, queryParams } = Linking.parse(normalizedUrl);

  const accessToken = getFirstValue(queryParams?.access_token);
  const refreshToken = getFirstValue(queryParams?.refresh_token);
  const code = getFirstValue(queryParams?.code);
  const type = getFirstValue(queryParams?.type);
  const errorCode = getFirstValue(queryParams?.error_code);
  const errorDescription = getFirstValue(queryParams?.error_description);

  return {
    path: path ?? '',
    queryParams: queryParams ?? {},
    accessToken,
    refreshToken,
    code,
    type,
    errorCode,
    errorDescription,
    hasAuthParams: Boolean(accessToken || refreshToken || code || errorCode || errorDescription),
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [authMe, setAuthMe] = useState<AuthMe | null>(null);
  const [authMeLoading, setAuthMeLoading] = useState(false);
  const [authMeError, setAuthMeError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [pendingJoinToken, setPendingJoinToken] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const authMeRequestIdRef = useRef(0);

  const applySession = useCallback((nextSession: Session | null) => {
    if (!isMountedRef.current) {
      return;
    }

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const clearAuthMe = useCallback(() => {
    authMeRequestIdRef.current += 1;
    setAuthMe(null);
    setAuthMeError(null);
    setAuthMeLoading(false);
  }, []);

const loadAuthMe = useCallback(async (accessToken: string): Promise<AuthMe | null> => {
    const requestId = authMeRequestIdRef.current + 1;
    authMeRequestIdRef.current = requestId;

    if (isMountedRef.current) {
      setAuthMeLoading(true);
      setAuthMeError(null);
    }

    try {
      if (__DEV__) console.log('[Auth] loadAuthMe: calling GET /api/auth/me...');
      const nextAuthMe = await getAuthMe(accessToken);
      if (__DEV__) console.log('[Auth] loadAuthMe: OK, navigation.next:', nextAuthMe.navigation?.next);

      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        setAuthMe(nextAuthMe);
      }

      return nextAuthMe;
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos cargar tu sesion de HomePlus.';

      if (__DEV__) console.log('[Auth] loadAuthMe: failed:', error instanceof Error ? error.message : String(error));

      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        setAuthMe(null);
        setAuthMeError(message);
      }

      return null;
    } finally {
      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        setAuthMeLoading(false);
      }
    }
  }, []);

const persistBackendSession = useCallback(
    async (backendSession: AuthSession): Promise<AuthActionResult> => {
      if (!backendSession.access_token || !backendSession.refresh_token) {
        return {
          error: 'El backend no devolvio una sesion valida. Intenta nuevamente.',
        };
      }

      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: backendSession.access_token,
          refresh_token: backendSession.refresh_token,
        });

        if (error) {
          if (__DEV__) console.log('[Auth] setSession error:', error.message, 'code:', (error as any)?.code);
          return {
            error: getAuthErrorMessage(
              error,
              'No pudimos guardar tu sesion en este dispositivo. Intenta nuevamente.',
            ),
          };
        }

        if (__DEV__) console.log('[Auth] setSession OK, user:', data.session?.user?.id);
        applySession(data.session);
        return { error: null };
      } catch (caught) {
        if (__DEV__) console.log('[Auth] setSession network error:', caught instanceof Error ? caught.message : String(caught));
        return {
          error: 'No pudimos conectar para guardar tu sesion. Revisa la conexion e intenta nuevamente.',
        };
      }
    },
    [applySession],
  );

  const refreshSession = useCallback(async (): Promise<AuthActionResult> => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos recuperar tu sesion actual. Intenta nuevamente.',
        ),
      };
    }

    applySession(data.session);
    return { error: null };
  }, [applySession]);

  const refetchMe = useCallback(async (): Promise<AuthMe | null> => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      clearAuthMe();
      return null;
    }

    return loadAuthMe(accessToken);
  }, [clearAuthMe, loadAuthMe, session?.access_token]);

  const handleIncomingUrl = useCallback(
    async (url: string): Promise<AuthActionResult> => {
      const { path, accessToken, refreshToken, code, type, errorCode, errorDescription, hasAuthParams, queryParams } =
        parseAuthUrl(url);

      // Handle invitation join link: homeplus://join?token=xxx
      const joinToken = getFirstValue(queryParams?.token);
      if ((path === 'join' || path === '/join') && joinToken) {
        if (isMountedRef.current) setPendingJoinToken(joinToken);
        await AsyncStorage.setItem(PENDING_JOIN_KEY, joinToken);
        return { error: null };
      }

      if (!hasAuthParams) {
        return { error: null };
      }

      if (errorCode || errorDescription) {
        return {
          error: getAuthErrorMessage(
            errorDescription ?? errorCode,
            'No pudimos procesar el enlace recibido. Solicita uno nuevo.',
          ),
        };
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          return {
            error: getAuthErrorMessage(
              error,
              'No pudimos validar el enlace de acceso. Solicita uno nuevo.',
            ),
          };
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          return {
            error: getAuthErrorMessage(
              error,
              'No pudimos abrir tu sesion desde el enlace. Solicita uno nuevo.',
            ),
          };
        }
      }

      if (type === 'recovery') {
        setIsPasswordRecovery(true);
      }

      await refreshSession();
      return { error: null };
    },
    [refreshSession],
  );

  useEffect(() => {
    isMountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
      }

      setLoading(false);
      setInitialized(true);
    });

    const appStateSubscription =
      Platform.OS !== 'web'
        ? AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              supabase.auth.startAutoRefresh();
            } else {
              supabase.auth.stopAutoRefresh();
            }
          })
        : null;

    if (Platform.OS !== 'web') {
      supabase.auth.startAutoRefresh();
    }

    const bootstrapAuth = async () => {
      try {
        // Only check initial URL for OAuth callbacks when app starts from cold
        // React Navigation will handle subsequent URL events via its linking config
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          const { path, accessToken, refreshToken, code, type, errorCode, errorDescription, hasAuthParams } =
            parseAuthUrl(initialUrl);

          if (hasAuthParams) {
            if (errorCode || errorDescription) {
              console.warn('[AuthContext] OAuth error:', errorDescription);
            } else if (code) {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                console.warn('[AuthContext] Code exchange error:', error.message);
              }
            } else if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) {
                console.warn('[AuthContext] Set session error:', error.message);
              }
            }

            if (type === 'recovery') {
              setIsPasswordRecovery(true);
            }
          }
        }

        await refreshSession();

        // Restore any pending join token that survived an app restart
        const storedToken = await AsyncStorage.getItem(PENDING_JOIN_KEY);
        if (storedToken && isMountedRef.current) {
          setPendingJoinToken(storedToken);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();

      if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
    };
  }, [applySession, handleIncomingUrl, refreshSession]);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      clearAuthMe();
      return;
    }

    void loadAuthMe(accessToken);
  }, [clearAuthMe, loadAuthMe, session?.access_token]);

const signIn = useCallback(async ({ email, password }: SignInParams): Promise<AuthActionResult> => {
    try {
      if (__DEV__) console.log('[Auth] signIn: calling authLogin...');
      const response = await authLogin({
        email: normalizeEmail(email),
        password,
      });
      if (__DEV__) console.log('[Auth] signIn: authLogin OK, has session:', Boolean(response.session));

      const persistResult = await persistBackendSession(response.session);

      if (persistResult.error) {
        return persistResult;
      }

      if (__DEV__) console.log('[Auth] signIn: setSession OK, loading authMe...');
      await loadAuthMe(response.session.access_token);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof ApiError
          ? error.message
          : 'No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente.',
      };
    }
  }, [loadAuthMe, persistBackendSession]);

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    const redirectUrl = getAuthRedirectUrl();

    if (!redirectUrl || redirectUrl.startsWith('file://')) {
      return {
        error: 'Configuración de autenticación inválida. Contacta al soporte.',
      };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos iniciar sesion con Google. Intenta nuevamente.',
        ),
      };
    }

    if (!data?.url) {
      return {
        error: 'No pudimos iniciar el flujo de Google. Intenta nuevamente.',
      };
    }

    if (data.url.startsWith('file://')) {
      return {
        error: 'Error interno en el flujo de Google. Intenta nuevamente.',
      };
    }

    if (!data.url.startsWith('https://')) {
      return {
        error: 'Error interno en el flujo de Google. Intenta nuevamente.',
      };
    }

    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (browserResult.type === 'cancel') {
      return { error: null };
    }

    if (browserResult.type === 'dismiss') {
      return { error: null };
    }

    if (browserResult.type === 'success' && browserResult.url) {
      const { code, accessToken, refreshToken, errorCode, errorDescription } = parseAuthUrl(browserResult.url);

      if (errorCode || errorDescription) {
        return {
          error: errorDescription || 'Error al autenticar con Google.',
        };
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          return {
            error: getAuthErrorMessage(
              exchangeError,
              'No pudimos completar el inicio de sesion con Google.',
            ),
          };
        }
      } else if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          return {
            error: getAuthErrorMessage(
              setSessionError,
              'No pudimos completar el inicio de sesion con Google.',
            ),
          };
        }
      }

      await refreshSession();
      return { error: null };
    }

    return {
      error: 'No pudimos completar el inicio de sesion con Google. Intenta nuevamente.',
    };
  }, [refreshSession]);

  const signInWithApple = useCallback(async (): Promise<AuthActionResult> => {
    if (Platform.OS !== 'ios') {
      return {
        error: 'El inicio de sesion con Apple solo esta disponible en iOS.',
      };
    }

    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (!isAvailable) {
        return {
          error: 'El inicio de sesion con Apple no esta disponible en este dispositivo.',
        };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (!credential.identityToken) {
        return {
          error: 'No se recibio el token de identidad de Apple. Intenta nuevamente.',
        };
      }

      // TODO: Si Apple devuelve fullName.email, sincronizar con backend en futuro perfil
      // Apple solo devuelve email/fullName la primera vez, no depender obligatoriamente
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.warn('[AppleOAuth] Supabase error:', error);
        return {
          error: getAuthErrorMessage(
            error,
            'No pudimos completar el inicio de sesion con Apple.',
          ),
        };
      }

      await refreshSession();
      return { error: null };
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED') {
        return { error: null };
      }

      console.warn('[AppleOAuth] Error:', error);
      return {
        error: 'No pudimos iniciar sesion con Apple. Intenta nuevamente.',
      };
    }
  }, [refreshSession]);

const signUp = useCallback(
    async ({ email, password, nombre }: SignUpParams): Promise<SignUpResult> => {
      try {
        if (__DEV__) console.log('[Auth] signUp: calling authRegister...');
        const response = await authRegister({
          email: normalizeEmail(email),
          password,
          display_name: nombre.trim(),
        });
        if (__DEV__) console.log('[Auth] signUp: authRegister OK, has session:', Boolean(response.session));

        if (!response.session) {
          clearAuthMe();
          return {
            error: null,
            needsEmailConfirmation: response.requires_email_confirmation,
          };
        }

        const persistResult = await persistBackendSession(response.session);

        if (persistResult.error) {
          return {
            error: persistResult.error,
            needsEmailConfirmation: false,
          };
        }

        if (__DEV__) console.log('[Auth] signUp: setSession OK, loading authMe...');
        await loadAuthMe(response.session.access_token);
        return {
          error: null,
          needsEmailConfirmation: false,
        };
      } catch (error) {
        return {
          error: error instanceof ApiError
            ? error.message
            : 'No pudimos crear tu cuenta. Verifica tus datos e intenta nuevamente.',
          needsEmailConfirmation: false,
        };
      }
    },
    [clearAuthMe, loadAuthMe, persistBackendSession],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    let backendError: string | null = null;

    try {
      await authLogout(session?.access_token);
    } catch (error) {
      backendError = error instanceof ApiError
        ? error.message
        : 'No pudimos cerrar tu sesion en el servidor.';
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });

    setIsPasswordRecovery(false);
    clearAuthMe();

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos limpiar tu sesion local. Intenta nuevamente.',
        ),
      };
    }

    return { error: backendError };
  }, [clearAuthMe, session?.access_token]);

  const resetPassword = useCallback(async (email: string): Promise<AuthActionResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: getAuthRedirectUrl(),
    });

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos enviar el enlace de recuperacion. Intenta nuevamente.',
        ),
      };
    }

    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthActionResult> => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos actualizar tu contrasena. Solicita un nuevo enlace e intenta nuevamente.',
        ),
      };
    }

    setIsPasswordRecovery(false);
    return { error: null };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const clearPendingJoinToken = useCallback(async () => {
    setPendingJoinToken(null);
    await AsyncStorage.removeItem(PENDING_JOIN_KEY);
  }, []);

const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      loading,
      initialized,
      authMe,
      authMeLoading,
      authMeError,
      isPasswordRecovery,
      pendingJoinToken,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      resetPassword,
      updatePassword,
      refreshSession,
      refetchMe,
      handleIncomingUrl,
      clearPasswordRecovery,
      clearPendingJoinToken,
    }),
[
      clearPasswordRecovery,
      clearPendingJoinToken,
      handleIncomingUrl,
      authMe,
      authMeError,
      authMeLoading,
      initialized,
      isPasswordRecovery,
      loading,
      pendingJoinToken,
      refetchMe,
      refreshSession,
      resetPassword,
      session,
      signIn,
      signInWithApple,
      signInWithGoogle,
      signUp,
      signOut,
      updatePassword,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
};
