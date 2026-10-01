import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PrivateStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { joinHouseholdByToken } from '../services/invitations';
import { AppLogo } from '../components/AppLogo';

type Props = NativeStackScreenProps<PrivateStackParamList, 'JoinHousehold'>;

type Status = 'loading' | 'success' | 'error';

export const JoinHouseholdScreen = ({ route }: Props) => {
  const { token } = route.params;
  const { user, clearPendingJoinToken, refetchMe, signOut } = useAuth();
  const { reload } = useHousehold();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const didRun = useRef(false);

  const handleSignOut = async () => {
    await clearPendingJoinToken();
    await signOut();
  };

  useEffect(() => {
    if (didRun.current || !user) return;
    didRun.current = true;

    const processJoin = async () => {
      const { error } = await joinHouseholdByToken(token);

      if (error) {
        setErrorMessage(error);
        setStatus('error');
        // Clear the token even on error to avoid being stuck in a loop.
        // User already member or token expired — no point retrying automatically.
        await clearPendingJoinToken();
        return;
      }

      await clearPendingJoinToken();
      await refetchMe();
      await reload();
      // Navigation resolves automatically: PrivateNavigator re-renders
      // because pendingJoinToken is now null and currentHousehold is set.
      setStatus('success');
    };

    void processJoin();
  }, [user, token, clearPendingJoinToken, reload]);

  const handleDismissError = async () => {
    // clearPendingJoinToken already called on error, just trigger household reload
    // so PrivateNavigator can decide where to send the user.
    await refetchMe();
    await reload();
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E7643F" style={{ marginBottom: 20 }} />
          <Text style={styles.loadingTitle}>Uniéndote al hogar...</Text>
          <Text style={styles.loadingSubtitle}>Esto tomará solo un momento.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLogo size={56} rounded />
          <Text style={styles.successTitle}>Solicitud enviada</Text>
          <Text style={styles.successSubtitle}>El coordinador tiene que aprobar tu acceso.</Text>
          <ActivityIndicator size="small" color="#7C9E7A" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  const isAlreadyMember = errorMessage.includes('Ya sos miembro');
  const isExpired = errorMessage.includes('expiró');
  const isSessionError = errorMessage.includes('sesion') || errorMessage.includes('token') || errorMessage.includes('401');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <AppLogo size={48} rounded />
        <Text style={styles.errorTitle}>
          {isAlreadyMember ? 'Ya sos parte de este hogar' : 'No pudimos procesar la invitación'}
        </Text>
        <View style={styles.errorCard}>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          {isExpired && (
            <Text style={styles.errorHint}>
              Pedile al coordinador que genere una nueva invitacion.
            </Text>
          )}
          {isSessionError && (
            <Text style={styles.errorHint}>
              Puede ser un problema de sesion. Probá cerrando sesion e intentando de nuevo.
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => void handleDismissError()}
          accessibilityRole="button"
        >
          <Text style={styles.continueBtnText}>
            {isAlreadyMember ? 'Ir a mi hogar →' : 'Volver al inicio →'}
          </Text>
        </TouchableOpacity>
        {isSessionError && (
          <TouchableOpacity
            style={[styles.continueBtn, { marginTop: 12, backgroundColor: '#E7643F' }]}
            onPress={() => void handleSignOut()}
            accessibilityRole="button"
          >
            <Text style={styles.continueBtnText}>Volver a iniciar sesion →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFAF5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Loading
  loadingTitle: { fontSize: 22, fontWeight: '700', color: '#1C1C1C', textAlign: 'center', marginBottom: 8 },
  loadingSubtitle: { fontSize: 15, color: '#6B6B6B', textAlign: 'center' },

  // Success
  successEmoji: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1C', textAlign: 'center', marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: '#6B6B6B', textAlign: 'center' },

  // Error

  errorTitle: { fontSize: 22, fontWeight: '700', color: '#1C1C1C', textAlign: 'center', marginBottom: 16 },
  errorCard: {
    backgroundColor: '#FFF3EE',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#E7643F',
    marginBottom: 24,
  },
  errorMessage: { fontSize: 15, color: '#1C1C1C', lineHeight: 22 },
  errorHint: { fontSize: 13, color: '#6B6B6B', marginTop: 8, lineHeight: 20 },

  // CTA
  continueBtn: {
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: '80%',
    alignItems: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
