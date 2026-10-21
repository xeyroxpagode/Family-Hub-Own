/**
 * HOMePLUS Assets — F0 Foundation. Avatar canónico por Profile.
 *
 * Root: 40. Detail: 44–48. Ícono 18–20 ink (el naranja es marca/acción,
 * no color de íconos). Fondo Elevated, borde Border. Sin reducción
 * tipográfica: el avatar es fijo, el nombre hace wrap.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors } from '../../constants/theme';
import type { AssetProfile } from '../../services/assets';

export const ASSET_PROFILE_ICON: Record<AssetProfile, HomePlusIconName> = {
  STANDARD: 'cube-outline',
  VEHICLE: 'car-outline',
  PET: 'paw-outline',
  PROPERTY: 'home-outline',
};

export type AssetAvatarSize = 'root' | 'detail';

const AVATAR_DIAMETER: Record<AssetAvatarSize, number> = {
  root: 40,
  detail: 48,
};

export type AssetAvatarProps = {
  profile: AssetProfile;
  size?: AssetAvatarSize;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function AssetAvatar({
  profile,
  size = 'root',
  style,
  accessibilityLabel,
}: AssetAvatarProps) {
  const diameter = AVATAR_DIAMETER[size];
  return (
    <View
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 3,
          backgroundColor: colors.surface.soft,
          borderWidth: 1,
          borderColor: colors.border.default,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `Ícono de ${profile.toLowerCase()}`}
    >
      <HomePlusIcon name={ASSET_PROFILE_ICON[profile]} size={20} color={colors.text.secondary} />
    </View>
  );
}
