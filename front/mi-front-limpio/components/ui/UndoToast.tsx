import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';

type UndoToastProps = {
  visible: boolean;
  message: string;
  tone?: 'success' | 'error';
  onUndo?: () => void;
  onDismiss: () => void;
  duration?: number;
};

export function UndoToast({ visible, message, tone = 'success', onUndo, onDismiss, duration = 5000 }: UndoToastProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      setOpacity(1);
      const timer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => onDismiss(), 300);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
  }, [visible, duration, onDismiss]);

  if (!visible && opacity === 0) return null;

  return (
    <View
      style={[
        styles.toastContainer,
        { opacity, transform: [{ translateY: opacity * 0 - 20 }] },
      ]}
    >
      <View style={styles.toastContent}>
        {onUndo ? null : (
          <View style={styles.successIcon}>
            <HomePlusIcon name={tone === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={tone === 'success' ? colors.success.strong : colors.danger.strong} />
          </View>
        )}
        <AppText variant="bodySmall" tone={tone === 'success' ? 'success' : 'danger'} weight="700" style={styles.toastMessage}>
          {message}
        </AppText>
        {onUndo ? (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => {
              onUndo();
              onDismiss();
            }}
          >
            <AppText variant="micro" weight="800" style={styles.undoText}>
              Deshacer
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing[4],
    right: spacing[4],
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.shadow2,
  },
  successIcon: {
    marginRight: spacing[2],
  },
  toastMessage: {
    flex: 1,
    color: colors.text.primary,
  },
  undoButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
    backgroundColor: colors.terracotta[500],
  },
  undoText: {
    color: colors.text.inverse,
  },
});
