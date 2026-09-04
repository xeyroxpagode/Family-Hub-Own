import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../components/AppLogo';

export const AuthLoadingScreen = () => {
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
        <AppLogo size={82} rounded style={styles.logo} />
        <Text style={styles.title}>Preparando tu hogar...</Text>
        <Text style={styles.subtitle}>
          Estamos cargando tu espacio familiar.
        </Text>
        <ActivityIndicator color="#E7643F" size="small" style={styles.loader} />
      </Animated.View>
      <Text style={styles.screenIndicator}>AUTH - BOOTSTRAP</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFAF8' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    marginBottom: 22,
    shadowColor: '#241F1C',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1714', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#6B6560', textAlign: 'center', lineHeight: 22 },
  loader: { marginTop: 24 },
  screenIndicator: {
    fontSize: 10,
    color: '#B8AEA4',
    textAlign: 'center',
    paddingBottom: 24,
    letterSpacing: 1,
  },
});
