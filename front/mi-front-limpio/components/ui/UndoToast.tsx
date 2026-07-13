import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors } from '../../constants/theme';

type UndoToastProps = {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
};

export function UndoToast({ visible, message, onUndo, onDismiss, duration = 5000 }: UndoToastProps) {
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
        <AppText variant="bodySmall" tone="success" weight="700" style={styles.toastMessage}>
          {message}
        </AppText>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastMessage: {
    flex: 1,
    color: colors.text.primary,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.terracotta[500],
  },
  undoText: {
    color: colors.text.inverse,
  },
});