import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { resolvePrivateTreeDecision } from '../context/authProjectionLifecycle';
import type { AuthStackParamList, PrivateStackParamList } from './types';
import { P00Splash } from '../screens/Splash';
import { AuthLoadingScreen } from '../screens/AuthLoading';
import { P01Registro } from '../screens/Registro';
import { P02CrearGrupo } from '../screens/CrearGrupo';
import { P03InvitarPersonas } from '../screens/InvitarPersonas';
import { JoinHouseholdScreen } from '../screens/JoinHousehold';
import { LoginScreen } from '../screens/Login';
import { ForgotPasswordScreen } from '../screens/ForgotPassword';
import { UpdatePasswordScreen } from '../screens/UpdatePassword';
import { StandardShell } from './StandardShell';
import { PlannerReliabilityRuntimeOwner } from '../components/planner/PlannerReliabilityRuntimeOwner';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FeedFamiliarScreen } from '../screens/feed/FeedFamiliarScreen';
import { HomeCloudFileIntakeDevScreen } from '../screens/HomeCloudFileIntakeDevScreen';
import { ExperienceSelectorScreen } from '../screens/ExperienceSelectorScreen';
import { ExperienceResolver } from './ExperienceResolver';
import { useExperience } from '../context/ExperienceContext';
import { runtimeTrace } from '../services/runtimeTrace';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const PrivateStack = createNativeStackNavigator<PrivateStackParamList>();

/** Pantalla de error cuando no se pudo cargar el hogar (error de DB/red) */
const HouseholdErrorScreen = () => {
  const { refetchMe } = useAuth();
  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>⚠️</Text>
      <Text style={errStyles.title}>No pudimos cargar tu hogar</Text>
      <Text style={errStyles.subtitle}>
        Puede ser un problema de conexión o de configuración.{'\n'}
        Revisá tu conexión a internet e intentá de nuevo.
      </Text>
      <TouchableOpacity style={errStyles.btn} onPress={() => void refetchMe()}>
        <Text style={errStyles.btnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
};

const AuthMeErrorScreen = () => {
  const { authMeError, refetchMe, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>!</Text>
      <Text style={errStyles.title}>No pudimos cargar tu cuenta</Text>
      <Text style={errStyles.subtitle}>
        {authMeError ?? 'Puede ser una sesion vencida o un problema de conexion.'}{'\n'}
        Revisa tu conexion o cerrá sesion e intentá de nuevo.
      </Text>
      <TouchableOpacity style={errStyles.btn} onPress={() => void refetchMe()}>
        <Text style={errStyles.btnText}>Reintentar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={errStyles.secondaryBtn} onPress={() => void handleSignOut()}>
        <Text style={errStyles.secondaryBtnText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
};

const WaitingApprovalScreen = () => {
  const { refetchMe, signOut } = useAuth();

  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>...</Text>
      <Text style={errStyles.title}>Esperando aprobacion</Text>
      <Text style={errStyles.subtitle}>
        Tu solicitud de ingreso fue enviada. Vas a poder entrar al hogar cuando el coordinator la apruebe.
      </Text>
      <TouchableOpacity style={errStyles.btn} onPress={() => void refetchMe()}>
        <Text style={errStyles.btnText}>Actualizar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={errStyles.secondaryBtn} onPress={() => void signOut()}>
        <Text style={errStyles.secondaryBtnText}>Cerrar sesion o cambiar cuenta</Text>
      </TouchableOpacity>
    </View>
  );
};

const HouseholdSelectionFallbackScreen = () => {
  const { refetchMe, signOut } = useAuth();

  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>...</Text>
      <Text style={errStyles.title}>Elegir hogar</Text>
      <Text style={errStyles.subtitle}>
        Tu cuenta tiene membresia activa, pero todavia falta seleccionar o setear el hogar activo en frontend.
      </Text>
      <TouchableOpacity style={errStyles.btn} onPress={() => void refetchMe()}>
        <Text style={errStyles.btnText}>Actualizar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={errStyles.secondaryBtn} onPress={() => void signOut()}>
        <Text style={errStyles.secondaryBtnText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
};

const AccessSuspendedFallbackScreen = () => {
  const { refetchMe, signOut } = useAuth();

  return (
    <View style={errStyles.container}>
      <Text style={errStyles.icon}>!</Text>
      <Text style={errStyles.title}>Acceso suspendido</Text>
      <Text style={errStyles.subtitle}>
        Tu acceso al hogar no esta activo. Actualiza el estado o inicia sesion con otra cuenta.
      </Text>
      <TouchableOpacity style={errStyles.btn} onPress={() => void refetchMe()}>
        <Text style={errStyles.btnText}>Actualizar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={errStyles.secondaryBtn} onPress={() => void signOut()}>
        <Text style={errStyles.secondaryBtnText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
};

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:      { fontSize: 56, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: '700', color: '#1C1C1C', textAlign: 'center', marginBottom: 12 },
  subtitle:  { fontSize: 15, color: '#6B6B6B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn:       { backgroundColor: '#E7643F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  btnText:   { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { marginTop: 14, paddingVertical: 12, paddingHorizontal: 24 },
  secondaryBtnText: { color: '#6B6B6B', fontSize: 15, fontWeight: '600' },
});

const getInitialPrivateRoute = (
  authMe: ReturnType<typeof useAuth>['authMe'],
): keyof PrivateStackParamList => {
  const next = authMe?.navigation?.next;

  if (authMe?.active_household && (next === 'home' || next === 'household_onboarding')) {
    return 'ExperienceShell';
  }

  if (next === 'pending_approval') {
    return 'PendingApprovalFallback';
  }

  if (next === 'access_suspended') {
    return 'AccessSuspendedFallback';
  }

  if (
    next === 'select_household'
    || next === 'set_active_household'
    || next === 'repair_active_household'
  ) {
    return 'HouseholdSelectionFallback';
  }

  return 'P02CrearGrupo';
};

/**
 * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION
 *
 * Transparent lifetime probe for the private tree. It renders NOTHING extra
 * (a fragment), so the mounted navigator and the runtime owner above it keep
 * exactly the same position in the tree; it exists only to prove, with a
 * stable per-mount id, whether the whole private stack really disappears and
 * to correlate that instant with the auth events that precede it.
 *
 * `initialPrivateRoute` is a dependency on purpose: `PrivateStack.Navigator`
 * is keyed by it, so a route change really does tear the stack down and mount
 * a new one — the probe must report that pair.
 */
let nextPrivateStackInstanceId = 1;

const PrivateStackInstance = ({
  initialPrivateRoute,
  children,
}: {
  initialPrivateRoute: keyof PrivateStackParamList;
  children: React.ReactNode;
}) => {
  const [instanceId] = useState(() => `private-stack-${nextPrivateStackInstanceId++}`);

  useEffect(() => {
    runtimeTrace('private_stack_mount', { instanceId, initialPrivateRoute });

    return () => {
      runtimeTrace('private_stack_unmount', { instanceId, initialPrivateRoute });
    };
  }, [instanceId, initialPrivateRoute]);

  return <>{children}</>;
};

const PrivateNavigator = () => {
  const { authMe, authMeLoading, authMeError, pendingJoinToken } = useAuth();
  const { ready: experienceReady, setupCompleted } = useExperience();
  const initialPrivateRoute = getInitialPrivateRoute(authMe);

  /**
   * HOMECLOUD_STAGE_A_GALLERY_AUTH_TRIGGER_INSTRUMENTATION — the global gate.
   *
   * `decision` is the single render policy used by the conditional below, so
   * it can be read as "what is mounted right now".
   * The shared decision policy deliberately distinguishes initial resolution
   * from background revalidation so a valid private tree is never replaced.
   */
  const decision = resolvePrivateTreeDecision({
    authMeLoading,
    hasAuthMe: authMe !== null,
    hasAuthMeError: authMeError !== null,
    experienceReady,
  });

  const tracedDecisionRef = useRef<string | null>(null);

  useEffect(() => {
    if (tracedDecisionRef.current === decision) return;
    tracedDecisionRef.current = decision;

    runtimeTrace('private_navigator_gate', {
      authMeLoading,
      hasAuthMe: authMe !== null,
      hasAuthMeError: authMeError !== null,
      experienceReady,
      navigationNext: authMe?.navigation?.next ?? null,
      decision,
    });
  }, [authMe, authMeError, authMeLoading, decision, experienceReady]);

  if (decision === 'auth_loading') return <AuthLoadingScreen />;

  // Error real cargando el hogar (no es "sin hogar") — mostrar pantalla de reintento
  if (decision === 'auth_me_error') {
    return <AuthMeErrorScreen />;
  }

  // The account-scoped preference is hydrated before the shell mounts, so a
  // saved Simple experience never flashes the Standard navigation first.
  if (decision === 'experience_loading') return <AuthLoadingScreen />;

  // Pending join token takes priority: process the invitation before anything else
  if (pendingJoinToken) {
    return (
      <PlannerReliabilityRuntimeOwner ownerSurface="AppShellPrivate-PendingJoin">
      <PrivateStack.Navigator screenOptions={{ headerShown: false }}>
        <PrivateStack.Screen
          name="JoinHousehold"
          component={JoinHouseholdScreen}
          initialParams={{ token: pendingJoinToken }}
        />
        <PrivateStack.Screen name="ExperienceShell" component={ExperienceResolver} />
        <PrivateStack.Screen name="HomeTabs" component={StandardShell} />
        <PrivateStack.Screen name="PendingApprovalFallback" component={WaitingApprovalScreen} />
        <PrivateStack.Screen name="HouseholdSelectionFallback" component={HouseholdSelectionFallbackScreen} />
        <PrivateStack.Screen name="AccessSuspendedFallback" component={AccessSuspendedFallbackScreen} />
      </PrivateStack.Navigator>
      </PlannerReliabilityRuntimeOwner>
    );
  }

  if (initialPrivateRoute === 'ExperienceShell' && !setupCompleted) {
    return (
      <PlannerReliabilityRuntimeOwner ownerSurface="AppShellPrivate-ExperienceSelector">
        <ExperienceSelectorScreen />
      </PlannerReliabilityRuntimeOwner>
    );
  }

// Navigator aplanado: todos los screens siempre registrados.
  // initialRouteName solo aplica en el primer mount; cambios posteriores de
  // currentHousehold NO resetean el stack, permitiendo que navigate/replace
  // post-creación permanezca en P03InvitarPersonas sin ser pisado.
  // S2: the Reliability runtime Owner is mounted ONCE here, above every
  // PrivateStack.Screen (HomeTabs, Profile, FeedFamiliar and the
  // various Fallbacks). It is *not* keyed by household — owner detects
  // scope changes itself via its readiness effect and disposes+reopens
  // deterministically. Keying it by household would force a full unmount
  // on every switch (which would dispose the runtime TWICE: once via
  // React unmount cleanup, once because we pass to a new key).
  return (
    <PlannerReliabilityRuntimeOwner ownerSurface="AppShellPrivate">
    <PrivateStackInstance initialPrivateRoute={initialPrivateRoute}>
    <PrivateStack.Navigator
      key={initialPrivateRoute}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialPrivateRoute}
    >
      <PrivateStack.Screen name="ExperienceShell" component={ExperienceResolver} />
      <PrivateStack.Screen name="HomeTabs" component={StandardShell} />
      <PrivateStack.Screen name="P02CrearGrupo" component={P02CrearGrupo} />
      <PrivateStack.Screen name="P03InvitarPersonas" component={P03InvitarPersonas} />
      <PrivateStack.Screen name="JoinHousehold" component={JoinHouseholdScreen} />
      <PrivateStack.Screen name="PendingApprovalFallback" component={WaitingApprovalScreen} />
      <PrivateStack.Screen name="HouseholdSelectionFallback" component={HouseholdSelectionFallbackScreen} />
      <PrivateStack.Screen name="AccessSuspendedFallback" component={AccessSuspendedFallbackScreen} />
      <PrivateStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <PrivateStack.Screen name="FeedFamiliar" component={FeedFamiliarScreen} />
      {__DEV__ && <PrivateStack.Screen name="HomeCloudFileIntakeDev" component={HomeCloudFileIntakeDevScreen} />}
    </PrivateStack.Navigator>
    </PrivateStackInstance>
    </PlannerReliabilityRuntimeOwner>
  );
};

export const AppNavigator = () => {
  const { initialized, loading, session, isPasswordRecovery } = useAuth();

  if (!initialized || loading) return <AuthLoadingScreen />;

  if (isPasswordRecovery) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
      </AuthStack.Navigator>
    );
  }

  if (session) return <PrivateNavigator />;

  return (
    <AuthStack.Navigator initialRouteName="P00Splash" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="P00Splash" component={P00Splash} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="P01Registro" component={P01Registro} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
    </AuthStack.Navigator>
  );
};
