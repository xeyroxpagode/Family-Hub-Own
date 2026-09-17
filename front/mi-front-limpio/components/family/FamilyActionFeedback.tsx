import React, { useEffect } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, radius, spacing, shadows } from '../../constants/theme';

export type FeedbackType = 'success' | 'error' | 'info';

export type FamilyActionFeedbackProps = {
  visible: boolean;
  type: FeedbackType;
  title: string;
  description?: string;
  lottieSlot?: string;
  duration?: number;
  onDismiss?: () => void;
};

export const FamilyActionFeedback: React.FC<FamilyActionFeedbackProps> = ({
  visible,
  type,
  title,
  description,
  lottieSlot,
  duration = 2500,
  onDismiss,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.92);
      
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.96,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onDismiss) {
            onDismiss();
          }
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss, opacity, scale]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'info':
        return 'i';
      default:
        return '✓';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success.soft;
      case 'error':
        return colors.danger.soft;
      case 'info':
        return colors.info.soft;
      default:
        return colors.success.soft;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return colors.success.base;
      case 'error':
        return colors.danger.base;
      case 'info':
        return colors.info.base;
      default:
        return colors.success.base;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return colors.success.strong;
      case 'error':
        return colors.danger.strong;
      case 'info':
        return colors.info.text;
      default:
        return colors.success.strong;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => {}}>
      <Pressable style={styles.backdrop} onPress={() => onDismiss?.()}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() }]}>
            <AppText variant="title3" weight="700" tone={type === 'error' ? 'danger' : type === 'info' ? 'primary' : 'success'}>
              {getIcon()}
            </AppText>
          </View>

          {/* TODO Lottie: replace FeedbackVisual with animation for lottieSlot when assets are available */}
          {/* Example usage: lottieSlot="role_updated" | "invite_created" | "member_removed" | "request_approved" */}

          <View style={styles.content}>
            <AppText variant="title3" weight="700" style={styles.title}>
              {title}
            </AppText>
            {description ? (
              <AppText variant="bodySmall" tone="secondary" style={styles.description}>
                {description}
              </AppText>
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  card: {
    backgroundColor: colors.background.base,
    borderRadius: radius.xl,
    padding: spacing[5],
    minWidth: 280,
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing[4],
    ...shadows.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  content: {
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: '90%',
  },
});