import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
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
  type AuthMeMembership,
  type AuthSession,
} from '../services/api';
import { supabase } from '../supabase';
import { getAuthErrorMessage } from '../utils/authErrors';
import { markSessionActive, runSessionCleanup } from '../services/core/lifecycle';
import { stopLocationSharing } from '../services/presenceLocationSharing';
import { registerCurrentPushDevice, unregisterCurrentPushDevice } from '../services/pushNotifications';
import { runtimeTrace } from '../services/runtimeTrace';
import { shouldPreserveAuthMeAfterLoadFailure } from './authProjectionLifecycle';

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
  firstName: string;
  lastName: string;
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
  updateEmail: (email: string) => Promise<AuthActionResult>;
  refreshSession: () => Promise<AuthActionResult>;
  refetchMe: () => Promise<AuthMe | null>;
  replacePersonProjection: (person: AuthMe['person']) => void;
  replaceMembershipProjection: (membership: AuthMeMembership) => void;
  handleIncomingUrl: (url: string) => Promise<AuthActionResult>;
  clearPasswordRecovery: () => void;
  clearPendingJoinToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION — why `/api/auth/me`
 * is being loaded. Derived from the caller, never guessed by the callee:
 * - `initial`: first load of the provider lifecycle.
 * - `token_changed`: the session access token changed (this is the P1 path).
 * - `manual`: explicit user/dev action (sign-in, refetchMe, retry).
 * - `unknown`: a caller that does not declare a reason (defensive default).
 */
type AuthMeLoadReason = 'initial' | 'token_changed' | 'manual' | 'unknown';

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
  // Instrumentation-only mirrors. `authMeRef` is written through
  // `commitAuthMe` on every write, so it always holds the LAST COMMITTED value
  // (React state would still be one render behind when a trace needs it inside
  // the same turn, e.g. right after a failed load).
  const authMeRef = useRef<AuthMe | null>(authMe);
  const lastAccessTokenRef = useRef<string | null>(null);
  const loadedAccessTokenRef = useRef<string | null>(null);
  const hasLoadedAuthMeRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState ?? 'unknown');

  const applySession = useCallback((nextSession: Session | null) => {
    if (!isMountedRef.current) {
      return;
    }

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    lastAccessTokenRef.current = nextSession?.access_token ?? null;
  }, []);

  /** Single write path for `authMe` so the trace mirror can never drift. */
  const commitAuthMe = useCallback((nextAuthMe: AuthMe | null) => {
    authMeRef.current = nextAuthMe;
    setAuthMe(nextAuthMe);
  }, []);

  const clearAuthMe = useCallback(() => {
    authMeRequestIdRef.current += 1;
    commitAuthMe(null);
    setAuthMeError(null);
    setAuthMeLoading(false);
  }, [commitAuthMe]);

const loadAuthMe = useCallback(async (accessToken: string, reason: AuthMeLoadReason = 'unknown'): Promise<AuthMe | null> => {
    const requestId = authMeRequestIdRef.current + 1;
    authMeRequestIdRef.current = requestId;

    const hadExistingAuthMe = authMeRef.current !== null;
    const accessTokenChanged = loadedAccessTokenRef.current !== accessToken;
    hasLoadedAuthMeRef.current = true;

    runtimeTrace('auth_me_load_start', {
      reason,
      accessTokenChanged,
      hasExistingAuthMe: hadExistingAuthMe,
    });

    if (isMountedRef.current) {
      setAuthMeLoading(true);
      setAuthMeError(null);
    }

    const startedAt = Date.now();
    let ok = false;
    let errorCode: string | null = null;

    try {
      if (__DEV__) console.log('[Auth] loadAuthMe: calling GET /api/auth/me...');
      const nextAuthMe = await getAuthMe(accessToken);
      if (__DEV__) console.log('[Auth] loadAuthMe: OK, navigation.next:', nextAuthMe.navigation?.next);
      ok = true;
      loadedAccessTokenRef.current = accessToken;

      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        commitAuthMe(nextAuthMe);
      }

      return nextAuthMe;
    } catch (error) {
      errorCode = error instanceof ApiError
        ? error.code ?? (error.status ? `http_${error.status}` : 'api_error')
        : 'unexpected_error';

      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos cargar tu sesion de HomePlus.';

      if (__DEV__) console.log('[Auth] loadAuthMe: failed:', error instanceof Error ? error.message : String(error));

      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        if (shouldPreserveAuthMeAfterLoadFailure(hadExistingAuthMe)) {
          // Revalidation is stale-while-refresh: a transient /auth/me failure
          // does not destroy the last usable projection or its mounted tree.
          // Authentication invalidation still flows through SIGNED_OUT, which
          // clears both the session and projection via clearAuthMe().
          setAuthMeError(null);
        } else {
          commitAuthMe(null);
          setAuthMeError(message);
        }
      }

      return null;
    } finally {
      if (isMountedRef.current && authMeRequestIdRef.current === requestId) {
        setAuthMeLoading(false);
      }

      // `authMePreserved` answers the ONLY question the navigator gate cares
      // about: did this call leave an authMe in the state? It is false exactly
      // when a failed load nulled it (P3) or the provider was torn down; it is
      // true when a fresh authMe landed or when a stale response was discarded
      // and the previous one survived.
      runtimeTrace('auth_me_load_end', {
        ok,
        hadExistingAuthMe,
        authMePreserved: hadExistingAuthMe && authMeRef.current !== null,
        durationMs: Date.now() - startedAt,
        errorCode,
      });
    }
  }, [commitAuthMe]);

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

    return loadAuthMe(accessToken, 'manual');
  }, [clearAuthMe, loadAuthMe, session?.access_token]);

  const replacePersonProjection = useCallback((person: AuthMe['person']) => {
    const current = authMeRef.current;
    if (!current) return;
    commitAuthMe({ ...current, person });
  }, [commitAuthMe]);

  const replaceMembershipProjection = useCallback((membership: AuthMeMembership) => {
    const current = authMeRef.current;
    if (!current || !current.memberships.some((entry) => entry.id === membership.id)) return;
    commitAuthMe({
      ...current,
      memberships: current.memberships.map((entry) => entry.id === membership.id ? { ...entry, ...membership } : entry),
    });
  }, [commitAuthMe]);

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
      runtimeTrace('auth_state_change', {
        event,
        accessTokenChanged: (nextSession?.access_token ?? null) !== lastAccessTokenRef.current,
        hasSession: Boolean(nextSession),
        hasAuthMe: authMeRef.current !== null,
      });

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
            const from = appStateRef.current;
            appStateRef.current = state;
            const willStartAutoRefresh = state === 'active';

            runtimeTrace('app_state_change', {
              from,
              to: state,
              willStartAutoRefresh,
              willStopAutoRefresh: !willStartAutoRefresh,
            });

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

    markSessionActive();

    void loadAuthMe(accessToken, hasLoadedAuthMeRef.current ? 'token_changed' : 'initial');
  }, [clearAuthMe, loadAuthMe, session?.access_token]);

  // A token is device-scoped, while auth changes per account. Re-register an
  // already-authorized device after login/session restoration; this is an
  // idempotent backend upsert and never prompts for permission here.
  useEffect(() => {
    if (!session?.access_token) return;
    void registerCurrentPushDevice(session.access_token).catch(() => {
      if (__DEV__) console.warn('[Push] token.restore.failed');
    });
  }, [session?.access_token]);

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
      await loadAuthMe(response.session.access_token, 'manual');
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
    async ({ email, password, firstName, lastName }: SignUpParams): Promise<SignUpResult> => {
      try {
        if (__DEV__) console.log('[Auth] signUp: calling authRegister...');
        const response = await authRegister({
          email: normalizeEmail(email),
          password,
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
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
        await loadAuthMe(response.session.access_token, 'manual');
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

    // Stop native tracking and clear the household-visible state before the
    // access token is invalidated by sign-out.
    await stopLocationSharing({ accessToken: session?.access_token, disableRemote: true });
    await unregisterCurrentPushDevice(session?.access_token).catch(() => {});

    try {
      await authLogout(session?.access_token);
    } catch (error) {
      backendError = error instanceof ApiError
        ? error.message
        : 'No pudimos cerrar tu sesion en el servidor.';
    }

    // Global cleanup is domain-agnostic and idempotent. Registered domains
    // cancel requests and clear sensitive state without Auth importing them.
    await runSessionCleanup();

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
  }, [clearAuthMe, session]);

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

  const updateEmail = useCallback(async (email: string): Promise<AuthActionResult> => {
    const { error } = await supabase.auth.updateUser(
      { email: normalizeEmail(email) },
      { emailRedirectTo: getAuthRedirectUrl() },
    );

    if (error) {
      return {
        error: getAuthErrorMessage(
          error,
          'No pudimos iniciar el cambio de email. Intenta nuevamente.',
        ),
      };
    }

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
      updateEmail,
      refreshSession,
      refetchMe,
      replacePersonProjection,
      replaceMembershipProjection,
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
      replacePersonProjection,
      replaceMembershipProjection,
      refreshSession,
      resetPassword,
      session,
      signIn,
      signInWithApple,
      signInWithGoogle,
      signUp,
      signOut,
      updatePassword,
      updateEmail,
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
