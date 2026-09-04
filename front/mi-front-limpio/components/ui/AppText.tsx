import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '../../constants/theme';

export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'brand'
  | 'inverse'
  | 'danger'
  | 'warning'
  | 'success'
  | 'info';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: AppTextTone;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
};

const toneColors: Record<AppTextTone, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  muted: colors.text.muted,
  brand: colors.brand,
  inverse: colors.text.inverse,
  danger: colors.danger.text,
  warning: colors.warning.text,
  success: colors.success.text,
  info: colors.info.text,
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  align,
  weight,
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        typography[variant],
        { color: toneColors[tone], textAlign: align },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
