import React from 'react';
import { Image } from 'react-native';
import type { ImageStyle } from 'react-native';

type AppLogoProps = {
  size?: number;
  rounded?: boolean;
  style?: ImageStyle;
};

export const AppLogo = ({ size = 40, rounded = false, style }: AppLogoProps) => {
  return (
    <Image
      source={require('../assets/icons/icon.png')}
      style={[
        { width: size, height: size },
        rounded && { borderRadius: size / 2 },
        style,
      ]}
      resizeMode="contain"
      accessibilityLabel="HomePlus"
    />
  );
};
