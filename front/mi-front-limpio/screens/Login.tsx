import React, { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AppLogo } from '../components/AppLogo';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextInput } from '../components/AuthTextInput';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { authErrorHaptic, authSuccessHaptic } from '../utils/haptics';
//import googleLogo from '../assets/google-logo.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getLoginErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('network')
    || normalized.includes('fetch')
    || normalized.includes('conectar')
    || normalized.includes('servidor')
  ) {
    return 'No pudimos conectarnos. Probá de nuevo en unos segundos.';
  }

  return 'No pudimos iniciar sesión. Revisá tu correo y contraseña.';
};

const getGoogleErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('network')
    || normalized.includes('fetch')
    || normalized.includes('conectar')
  ) {
    return 'No pudimos conectarnos. Probá de nuevo en unos segundos.';
  }

  if (
    normalized.includes('cancelled')
    || normalized.includes('cancel')
  ) {
    return null;
  }

  return 'No pudimos iniciar sesión con Google. Intentá nuevamente.';
};

export const LoginScreen = ({ navigation }: Props) => {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const clearError = () => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

const submitLogin = async () => {
    if (loading) {
      return;
    }

    Keyboard.dismiss();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      void authErrorHaptic();
      setErrorMessage('Ingresa tu correo para continuar.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      void authErrorHaptic();
      setErrorMessage('Ingresá un correo válido.');
      return;
    }

    if (!password.trim()) {
      void authErrorHaptic();
      setErrorMessage('Ingresá tu contraseña para continuar.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await signIn({
      email: trimmedEmail,
      password,
    });

    if (result.error) {
      void authErrorHaptic();
      setErrorMessage(getLoginErrorMessage(result.error));
    } else {
      void authSuccessHaptic();
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage(null);
    setGoogleLoading(true);

    const result = await signInWithGoogle();

    if (result.error) {
      const errorMessage = getGoogleErrorMessage(result.error);
      if (errorMessage) {
        void authErrorHaptic();
        setErrorMessage(errorMessage);
      }
    }

    setGoogleLoading(false);
  };

  const handleAppleSignIn = async () => {
    if (appleLoading || !appleAvailable) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage(null);
    setAppleLoading(true);

    try {
      const result = await signInWithApple();

      if (result.error) {
        const normalized = result.error.toLowerCase();
        if (
          normalized.includes('dispositivo') ||
          normalized.includes('disponible') ||
          normalized.includes('solo')
        ) {
          setAppleAvailable(false);
        } else {
          void authErrorHaptic();
          setErrorMessage('No pudimos iniciar sesion con Apple. Intenta nuevamente.');
        }
      }
    } finally {
      setAppleLoading(false);
    }
  };

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync().then((available) => {
        setAppleAvailable(available);
      }).catch(() => {
        setAppleAvailable(false);
      });
    }
  }, []);

  return (
    <AuthScreenLayout screenIndicator="01 - LOGIN" centerContent presentation="premium">
      <View style={styles.header}>
        <AppLogo size={70} rounded style={styles.logo} />
        <Text style={styles.title}>Entra a tu hogar</Text>
        <Text style={styles.subtitle}>
          Organiza tareas, eventos y momentos familiares desde un solo lugar.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthTextInput
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
            clearError();
            setEmail(value);
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />

        <AuthTextInput
          ref={passwordInputRef}
          label="Contraseña"
          placeholder="Tu contraseña"
          isPasswordField
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          editable={!loading}
          value={password}
          onChangeText={(value) => {
            clearError();
            setPassword(value);
          }}
          onSubmitEditing={() => void submitLogin()}
        />

{errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => void submitLogin()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={() => void handleGoogleSignIn()}
          disabled={googleLoading || loading}
          accessibilityRole="button"
          accessibilityLabel="Continuar con Google"
        >
          <View style={styles.googleIcon}>
  <Text style={{ fontWeight: '800', fontSize: 16 }}>G</Text>
</View>
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={loading || googleLoading}
          accessibilityRole="button"
          accessibilityLabel="Recuperar contraseña"
        >
          <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
</TouchableOpacity>

        {Platform.OS === 'ios' && appleAvailable ? (
          <TouchableOpacity
            style={[styles.appleButton, appleLoading && styles.buttonDisabled]}
            onPress={() => void handleAppleSignIn()}
            disabled={appleLoading || loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Apple"
          >
            <View style={styles.appleButtonContent}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButtonNative}
                onPress={() => void handleAppleSignIn()}
              />
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('P01Registro')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Ir a registro"
        >
          <Text style={styles.linkText}>No tenes cuenta? Crea tu espacio familiar</Text>
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
  forgotButton: { marginTop: 16, alignItems: 'center' },
  forgotText: { color: '#6B6560', fontSize: 14, fontWeight: '600' },
  linkButton: { marginTop: 24, alignItems: 'center' },
linkText: { color: '#A86B45', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  googleButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E8E3DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  googleIcon: {
    position: 'absolute',
    left: 20,
    width: 20,
    height: 20,
  },
  googleButtonText: { color: '#1A1714', fontSize: 15, fontWeight: '600' },
  appleButton: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  appleButtonContent: {
    width: '100%',
    alignItems: 'center',
  },
  appleButtonNative: {
    width: '100%',
    height: 48,
  },
});
