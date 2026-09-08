import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { type ColorTokens } from '../../constants/theme';
import { useAppTheme } from '../../context/AppThemeContext';
import { AppText, type AppTextTone } from './AppText';

export type StatusBadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  icon?: HomePlusIconName;
  style?: StyleProp<ViewStyle>;
};

const getToneMap = (colors: ColorTokens): Record<StatusBadgeTone, { bg: string; fg: string; textTone: AppTextTone }> => ({
  neutral: { bg: colors.surface.soft, fg: colors.text.tertiary, textTone: 'tertiary' },
  brand: { bg: colors.brandSoft, fg: colors.brand, textTone: 'brand' },
  success: { bg: colors.success.soft, fg: colors.success.base, textTone: 'success' },
  warning: { bg: colors.warning.soft, fg: colors.warning.base, textTone: 'warning' },
  danger: { bg: colors.danger.soft, fg: colors.danger.base, textTone: 'danger' },
  info: { bg: colors.info.soft, fg: colors.info.base, textTone: 'info' },
});

export function StatusBadge({ label, tone = 'neutral', icon, style }: StatusBadgeProps) {
  const theme = useAppTheme();
  const { colors, radius, spacing } = theme;
  const visual = getToneMap(colors)[tone];

  return (
    <View
      style={[
        {
          minHeight: 28,
          paddingHorizontal: spacing[2],
          borderRadius: radius.full,
          backgroundColor: visual.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[1],
        },
        style,
      ]}
    >
      {icon ? <HomePlusIcon name={icon} size={14} color={visual.fg} /> : null}
      <AppText variant="micro" tone={visual.textTone} weight="600">
        {label}
      </AppText>
    </View>
  );
}
