import React, { useEffect } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, radius, spacing, shadows } from '../../constants/theme';
import { AppText } from '../ui';

export type FamilySnackbarType = 'success' | 'error' | 'info';
export type FamilyLottieSlot =
  | 'invite_created'
  | 'role_updated'
  | 'member_removed'
  | 'request_approved'
  | 'link_revoked'
  | 'request_rejected'
  | 'role_rejected'
  | 'role_request_cancelled';

type FamilySnackbarProps = {
  visible: boolean;
  type: FamilySnackbarType;
  message: string;
  detail?: string;
  lottieSlot?: FamilyLottieSlot;
  duration?: number;
  onDismiss?: () => void;
};

const TYPE_META: Record<FamilySnackbarType, { icon: HomePlusIconName; color: string; soft: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success.strong, soft: colors.success.soft },
  error: { icon: 'alert-circle', color: colors.danger.strong, soft: colors.danger.soft },
  info: { icon: 'information-circle', color: colors.info.text, soft: colors.info.soft },
};

export const FamilySnackbar: React.FC<FamilySnackbarProps> = ({
  visible,
  type,
  message,
  detail,
  lottieSlot,
  duration = 2400,
  onDismiss,
}) => {
  const translateY = React.useRef(new Animated.Value(24)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const meta = TYPE_META[type];

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(24);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 16,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, opacity, translateY, visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={() => onDismiss?.()}>
      <Pressable style={styles.backdrop} onPress={() => onDismiss?.()}>
        <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
            <HomePlusIcon name={meta.icon} size={20} color={meta.color} />
          </View>

          {/* TODO Lottie: render animation for lottieSlot when assets/support are available. */}
          {lottieSlot ? null : null}

          <View style={styles.content}>
            <AppText variant="bodySmall" weight="700" numberOfLines={2}>
              {message}
            </AppText>
            {detail ? (
              <AppText variant="caption" tone="secondary" numberOfLines={3}>
                {detail}
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
    justifyContent: 'flex-end',
    padding: spacing[4],
    backgroundColor: 'transparent',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    paddingRight: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.elevated,
    ...shadows.floating,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
});
