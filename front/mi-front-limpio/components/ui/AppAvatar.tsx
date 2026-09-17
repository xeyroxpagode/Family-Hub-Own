import React from 'react';
import { Image, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, touchTargets } from '../../constants/theme';
import { AppText } from './AppText';

export type AppAvatarSize = 'sm' | 'md' | 'lg';

export type AppAvatarProps = Omit<PressableProps, 'children' | 'style'> & {
  imageUrl?: string | null;
  name: string;
  size?: AppAvatarSize;
  showBorder?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizeStyles: Record<AppAvatarSize, { width: number; height: number; fontSize: number; borderWidth: number }> = {
  sm: { width: 36, height: 36, fontSize: 12, borderWidth: 2 },
  md: { width: 44, height: 44, fontSize: 15, borderWidth: 2 },
  lg: { width: 64, height: 64, fontSize: 22, borderWidth: 3 },
};

const AVATAR_BG_COLORS = [
  colors.terracotta[500],
  'rgb(107,79,232)',
  colors.sage[500],
  colors.sand[500],
  'rgb(229,115,115)',
  'rgb(100,181,246)',
  colors.terracotta[400],
  colors.sage[400],
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

export function AppAvatar({
  imageUrl,
  name,
  size = 'md',
  showBorder = false,
  disabled,
  onPress,
  accessibilityLabel,
  style,
}: AppAvatarProps) {
  const { width, height, fontSize, borderWidth } = sizeStyles[size];
  const isDisabled = Boolean(disabled);
  const initials = getInitials(name);
  const bg = getAvatarBg(name);

  const avatarContent = (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: showBorder ? borderWidth : 0,
          borderColor: colors.border.default,
          overflow: 'hidden',
        },
        !isDisabled ? shadows.card : null,
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', borderRadius: radius.pill }}
          resizeMode="cover"
        />
      ) : (
        <AppText variant="body" tone="inverse" weight="800" style={{ fontSize }}>
          {initials}
        </AppText>
      )}
    </View>
  );

  if (!onPress || isDisabled) {
    return avatarContent;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          overflow: 'hidden',
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {avatarContent}
    </Pressable>
  );
}