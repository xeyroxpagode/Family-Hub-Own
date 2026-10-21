import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';
import { useBottomChrome } from '../../context/BottomChromeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type AppToast = { id: string; message: string; kind?: 'success' | 'warning' | 'error' | 'info'; undoLabel?: string; onUndo?: () => void; actionLabel?: string; onAction?: () => void; durationMs?: number };
export type AppToastHostProps = { toast: AppToast | null; onDismiss: () => void; sheetOpen?: boolean; bottomOffset?: number };

export function AppToastHost({ toast, onDismiss, sheetOpen = false, bottomOffset }: AppToastHostProps) {
  const { radius, spacing } = useAppTheme();
  const reducedMotion = useReducedMotion();
  // The toast floats ABOVE the chrome that is currently visible, so the tab
  // bar can never cover it. Without a provider the legacy anchor is kept.
  const chrome = useBottomChrome();
  const anchor = bottomOffset ?? chrome.toastBottomAnchor;
  const [shown, setShown] = useState<AppToast | null>(null);
  const deferred = useRef<AppToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    if (sheetOpen) { if (toast) deferred.current = toast; return; }
    const next = deferred.current ?? toast;
    deferred.current = null;
    if (!next) return;
    if (timer.current) clearTimeout(timer.current);
    setShown(next);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: reducedMotion ? 0 : 150, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(onDismiss, next.durationMs ?? 8000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast, sheetOpen, reducedMotion, opacity, translateY, onDismiss]);

  useEffect(() => {
    if (toast || sheetOpen) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: reducedMotion ? 0 : 110, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 36, duration: reducedMotion ? 0 : 110, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setShown(null); });
  }, [toast, sheetOpen, reducedMotion, opacity, translateY]);

  if (!shown || sheetOpen) return null;
  const styles = createStyles(radius, spacing, anchor);
  return <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]} accessibilityLiveRegion="polite" role="status">
    <View style={styles.content}><AppText variant="bodySmall" weight="500" style={styles.message}>{shown.message}</AppText>
      {shown.onUndo ? <InteractivePressable style={styles.undo} onPress={() => { shown.onUndo?.(); onDismiss(); }} accessibilityRole="button" accessibilityLabel={shown.undoLabel ?? 'Deshacer'}>
        <AppText variant="bodySmall" weight="700" tone="inverse">{shown.undoLabel ?? 'Deshacer'}</AppText>
      </InteractivePressable> : shown.onAction ? <InteractivePressable style={styles.undo} onPress={() => { shown.onAction?.(); onDismiss(); }} accessibilityRole="button" accessibilityLabel={shown.actionLabel ?? 'Ver'}>
        <AppText variant="bodySmall" weight="700" tone="inverse">{shown.actionLabel ?? 'Ver'}</AppText>
      </InteractivePressable> : null}</View>
  </Animated.View>;
}

function createStyles(radius: { readonly lg: number }, spacing: Record<string, number>, bottom: number) {
  return StyleSheet.create({
    toast: { position: 'absolute', bottom, left: 16, right: 16, borderRadius: radius.lg, padding: 12, backgroundColor: '#1A1714', borderWidth: 1, borderColor: '#E7643F', elevation: 8 },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, message: { flex: 1, color: '#FFFFFF' },
    undo: { minHeight: 44, borderRadius: radius.lg, backgroundColor: '#E7643F', paddingHorizontal: spacing[3], alignItems: 'center', justifyContent: 'center' },
  });
}
