import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { type ColorTokens, type TypographyVariant } from '../../constants/theme';
import { useAppTheme } from '../../context/AppThemeContext';

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

const getToneColors = (colors: ColorTokens): Record<AppTextTone, string> => ({
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
});

function fontFamilyForWeight(weight?: TextStyle['fontWeight']) {
  if (!weight) return null;
  const numericWeight = typeof weight === 'string' ? Number(weight) : weight;
  if (weight === 'bold' || numericWeight >= 700) return { fontFamily: 'DMSans_700Bold' };
  if (numericWeight >= 600) return { fontFamily: 'DMSans_600SemiBold' };
  if (numericWeight >= 500) return { fontFamily: 'DMSans_500Medium' };
  return { fontFamily: 'DMSans_400Regular' };
}

export function AppText({
  variant = 'body',
  tone = 'primary',
  align,
  weight,
  style,
  children,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();
  const toneColors = getToneColors(theme.colors);

  return (
    <Text
      {...props}
      style={[
        theme.typography[variant],
        { color: toneColors[tone], textAlign: align },
        fontFamilyForWeight(weight),
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
