import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { AppLogo } from '../components/AppLogo';

type Props = NativeStackScreenProps<AuthStackParamList, 'P00Splash'> & {
  loading?: boolean;
};

export const P00Splash = ({ navigation, loading = false }: Props) => {
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [fadeValue]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeValue }]}>
        <View style={styles.iconContainer}>
          <AppLogo size={88} rounded style={styles.logo} />
        </View>
        
        <Text style={styles.title}>HomePlus</Text>
        <Text style={styles.subtitle}>
          {loading
            ? 'Estamos cargando tu espacio familiar.'
            : 'Tu casa, más organizada.'}
        </Text>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#E7643F" size="small" />
            <Text style={styles.loaderText}>Preparando tu hogar...</Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation?.navigate('P01Registro')}
          accessibilityRole="button"
          accessibilityLabel="Crear cuenta"
        >
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
          accessibilityLabel="Entrar a mi hogar"
        >
          <Text style={styles.secondaryButtonText}>Entrar a mi hogar</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Privado, simple y pensado para tu familia.</Text>
        <Text style={styles.screenIndicator}>00 - SPLASH</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFAF8' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconContainer: { marginBottom: 24 },
  logo: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { fontSize: 34, fontWeight: '700', color: '#1A1714', marginBottom: 10 },
  subtitle: { fontSize: 17, color: '#4A4540', textAlign: 'center', lineHeight: 24 },
  loaderContainer: { marginTop: 24, alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 13, color: '#6B6560' },
  footer: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  primaryButton: { backgroundColor: '#E7643F', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, marginBottom: 24 },
  secondaryButtonText: { color: '#6B6560', fontSize: 15, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#8A8178', marginBottom: 16, textAlign: 'center' },
  screenIndicator: { fontSize: 10, color: '#B8AEA4', textTransform: 'uppercase', letterSpacing: 1 },
});
