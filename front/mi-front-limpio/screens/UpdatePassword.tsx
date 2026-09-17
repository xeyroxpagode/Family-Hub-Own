import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppLogo } from '../components/AppLogo';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextInput } from '../components/AuthTextInput';
import { useAuth } from '../context/AuthContext';
import { authErrorHaptic, authSuccessHaptic } from '../utils/haptics';

export const UpdatePasswordScreen = () => {
  const { updatePassword } = useAuth();
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    Animated.sequence([
      Animated.timing(successScale, {
        toValue: 1.03,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(successScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successMessage, successScale]);

  const clearMessages = () => {
    if (errorMessage) {
      setErrorMessage(null);
    }

    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (loading) {
      return;
    }

    Keyboard.dismiss();

    if (!password.trim()) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Ingresá una nueva contraseña.');
      return;
    }

    if (password.length < 6) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('La contraseña necesita al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await updatePassword(password);

    if (result.error) {
      void authErrorHaptic();
      setErrorMessage('No pudimos actualizar tu contraseña. Solicitá un nuevo enlace e intentá nuevamente.');
    } else {
      void authSuccessHaptic();
      setSuccessMessage('Contraseña actualizada.');
      setPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <AuthScreenLayout screenIndicator="AUTH - UPDATE PASSWORD" centerContent presentation="premium">
      <View style={styles.header}>
        <AppLogo size={70} rounded style={styles.logo} />
        <Text style={styles.title}>Nueva contraseña</Text>
        <Text style={styles.subtitle}>
          Elegí una clave nueva para volver a entrar a tu hogar.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthTextInput
          label="Nueva contraseña"
          placeholder="Minimo 6 caracteres"
          isPasswordField
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          blurOnSubmit={false}
          editable={!loading}
          value={password}
          onChangeText={(value) => {
            clearMessages();
            setPassword(value);
          }}
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
        />

        <AuthTextInput
          ref={confirmPasswordInputRef}
          label="Confirmar contraseña"
          placeholder="Repetí tu nueva contraseña"
          isPasswordField
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          editable={!loading}
          value={confirmPassword}
          onChangeText={(value) => {
            clearMessages();
            setConfirmPassword(value);
          }}
          onSubmitEditing={() => void handleUpdatePassword()}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? (
          <Animated.View style={{ transform: [{ scale: successScale }] }}>
            <Text style={styles.successText}>{successMessage}</Text>
          </Animated.View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => void handleUpdatePassword()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Guardar nueva contraseña"
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Actualizando...' : 'Guardar contraseña'}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { marginBottom: 18 },
  title: { fontSize: 27, fontWeight: '700', color: '#1A1714', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B6560', textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  errorText: {
    color: '#A85050',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    backgroundColor: '#F5E2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    color: '#558563',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    backgroundColor: '#E1EFE5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#E7643F',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
