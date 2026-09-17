import React, { useCallback, useState } from 'react';
import { Alert, Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { AppAvatar } from './AppAvatar';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type AccountSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  onOpenProfile: () => void;
};

type AccountMenuRowProps = {
  icon: Parameters<typeof HomePlusIcon>[0]['name'];
  label: string;
  description: string;
  onPress: () => void;
};

function AccountMenuRow({ icon, label, description, onPress }: AccountMenuRowProps) {
  return (
    <InteractivePressable
      onPress={onPress}
      style={styles.menuRow}
      accessibilityLabel={`${label}. ${description}`}
      haptic="light"
    >
      <View style={styles.menuIcon}>
        <HomePlusIcon name={icon} size={20} color={colors.sage[600]} />
      </View>
      <View style={styles.menuCopy}>
        <AppText variant="bodySmall" weight="700">{label}</AppText>
        <AppText variant="caption" tone="tertiary">{description}</AppText>
      </View>
      <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.muted} />
    </InteractivePressable>
  );
}

export function AccountSheet({ visible, onRequestClose, onOpenProfile }: AccountSheetProps) {
  const { authMe, user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);
  const dragY = React.useRef(new Animated.Value(0)).current;

  const handlePanResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6,
    onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 96 || gesture.vy > 0.9) {
        onRequestClose();
        dragY.setValue(0);
        return;
      }
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
  }), [dragY, onRequestClose]);

  const name = authMe?.person?.display_name ?? user?.user_metadata?.display_name ?? user?.email ?? 'Usuario';
  const email = user?.email ?? 'Sin email disponible';
  const avatarUrl = authMe?.person?.avatar_url ?? null;

  const showUnavailable = useCallback((title: string) => {
    Alert.alert(title, 'Esta configuración todavía no está disponible en HomePlus.');
  }, []);

  const handleOpenProfile = useCallback(() => {
    onRequestClose();
    onOpenProfile();
  }, [onOpenProfile, onRequestClose]);

  const confirmSignOut = useCallback(async () => {
    setSigningOut(true);
    const result = await signOut();
    setSigningOut(false);

    if (result.error) {
      Alert.alert('No pudimos cerrar sesión', result.error);
    }
  }, [signOut]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      'Vas a salir de HomePlus en este dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void confirmSignOut() },
      ],
    );
  }, [confirmSignOut]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.overlay}
        onPress={onRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar menú de cuenta"
      >
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[3], transform: [{ translateY: dragY }] }]} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} {...handlePanResponder.panHandlers} />
          <View style={styles.accountHeader}>
            <AppAvatar imageUrl={avatarUrl} name={name} size="lg" />
            <View style={styles.accountCopy}>
              <AppText variant="title3" weight="800" numberOfLines={1}>{name}</AppText>
              <AppText variant="bodySmall" tone="tertiary" numberOfLines={1}>{email}</AppText>
            </View>
            <AppButton
              variant="icon"
              size="sm"
              onPress={onRequestClose}
              accessibilityLabel="Cerrar menú de cuenta"
            >
              <HomePlusIcon name="close" size={20} color={colors.text.secondary} />
            </AppButton>
          </View>

          <View style={styles.menu}>
            <AccountMenuRow
              icon="person-outline"
              label="Mi perfil"
              description="Nombre, foto y datos personales"
              onPress={handleOpenProfile}
            />
            <View style={styles.divider} />
            <AccountMenuRow
              icon="notifications-outline"
              label="Notificaciones"
              description="Preferencias y avisos"
              onPress={() => showUnavailable('Notificaciones')}
            />
            <View style={styles.divider} />
            <AccountMenuRow
              icon="shield-checkmark-outline"
              label="Privacidad y seguridad"
              description="Cuenta y contraseña"
              onPress={() => showUnavailable('Privacidad y seguridad')}
            />
          </View>

          <InteractivePressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={styles.signOutRow}
            accessibilityLabel="Cerrar sesión"
            haptic="light"
          >
            <HomePlusIcon name="log-out-outline" size={20} color={colors.danger.base} />
            <AppText variant="bodySmall" weight="700" style={{ color: colors.danger.base }}>
              {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </AppText>
          </InteractivePressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.surface.overlay,
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    ...shadows.sheet,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[3],
  },
  accountHeader: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  accountCopy: {
    flex: 1,
    gap: spacing[1],
  },
  menu: {
    paddingHorizontal: spacing[5],
  },
  menuRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage[50],
  },
  menuCopy: {
    flex: 1,
    gap: spacing[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
    backgroundColor: colors.border.subtle,
  },
  signOutRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[2],
    marginLeft: spacing[5],
    paddingVertical: spacing[2],
    paddingRight: spacing[3],
  },
});
