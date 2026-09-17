import React, { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextInput } from '../components/AuthTextInput';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { authErrorHaptic, authSuccessHaptic } from '../utils/haptics';

type Props = NativeStackScreenProps<AuthStackParamList, 'P01Registro'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getSignupErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('already')
    || normalized.includes('registr')
    || normalized.includes('existe')
    || normalized.includes('uso')
  ) {
    return 'Este correo ya está en uso.';
  }

  if (normalized.includes('password') || normalized.includes('contrasena')) {
    return 'La contraseña necesita al menos 8 caracteres.';
  }

  if (
    normalized.includes('network')
    || normalized.includes('fetch')
    || normalized.includes('conectar')
    || normalized.includes('servidor')
  ) {
    return 'No pudimos conectarnos. Probá de nuevo en unos segundos.';
  }

  return 'No pudimos crear tu cuenta. Revisa los datos e intenta nuevamente.';
};

export const P01Registro = ({ navigation }: Props) => {
  const { signUp } = useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearMessages = () => {
    if (errorMessage) {
      setErrorMessage(null);
    }

    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const submitSignup = async () => {
    if (loading) {
      return;
    }

    Keyboard.dismiss();

    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNombre) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Ingresa tu nombre para crear tu cuenta.');
      return;
    }

    if (!trimmedEmail) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Ingresa tu correo para crear la cuenta.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Ingresá un correo válido.');
      return;
    }

    if (!password.trim()) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('Ingresá una contraseña para continuar.');
      return;
    }

    if (password.length < 8) {
      setSuccessMessage(null);
      void authErrorHaptic();
      setErrorMessage('La contraseña necesita al menos 8 caracteres.');
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

    const result = await signUp({
      nombre: trimmedNombre,
      email: trimmedEmail,
      password,
    });

    if (result.error) {
      void authErrorHaptic();
      setErrorMessage(getSignupErrorMessage(result.error));
      setLoading(false);
      return;
    }

    void authSuccessHaptic();

    if (result.needsEmailConfirmation) {
      setSuccessMessage(
        'Tu cuenta fue creada. Revisá tu correo para confirmar el acceso antes de iniciar sesión.',
      );
      setPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <AuthScreenLayout screenIndicator="01 - REGISTRO" presentation="premium">
      <View style={styles.header}>
        <AppLogo size={70} rounded style={styles.logo} />
        <Text style={styles.title}>Crea tu espacio familiar</Text>
        <Text style={styles.subtitle}>
          Empeza con tu cuenta y despues vas a poder crear o unirte a un hogar.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthTextInput
          label="Tu nombre"
          placeholder="Valeria"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          blurOnSubmit={false}
          editable={!loading}
          value={nombre}
          onChangeText={(value) => {
            clearMessages();
            setNombre(value);
          }}
          onSubmitEditing={() => emailInputRef.current?.focus()}
        />

        <AuthTextInput
          ref={emailInputRef}
          label="Email"
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          editable={!loading}
          value={email}
          onChangeText={(value) => {
            clearMessages();
            setEmail(value);
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />

        <AuthTextInput
          ref={passwordInputRef}
          label="Contraseña"
          placeholder="Minimo 8 caracteres"
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
          placeholder="Repetí tu contraseña"
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
          onSubmitEditing={() => void submitSignup()}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => void submitSignup()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Crear cuenta"
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Ir a login"
        >
          <Text style={styles.linkText}>¿Ya tenés cuenta? Iniciá sesión</Text>
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
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#A86B45', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
