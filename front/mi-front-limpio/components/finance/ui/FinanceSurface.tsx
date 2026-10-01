import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type ColorTokens } from '../../../constants/theme';
import { useAppTheme } from '../../../context/AppThemeContext';
import { AppText } from '../../ui/AppText';
import { financeSpacing } from './financeTokens';

export type FinanceSemanticTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function semanticBackground(colors: ColorTokens, tone: FinanceSemanticTone): string {
  switch (tone) {
    case 'brand':
      return colors.brandSoft;
    case 'success':
      return colors.success.soft;
    case 'warning':
      return colors.warning.soft;
    case 'danger':
      return colors.danger.soft;
    case 'info':
      return colors.info.soft;
    case 'neutral':
    default:
      return colors.surface.soft;
  }
}

export type FinanceSemanticSurfaceProps = {
  tone?: FinanceSemanticTone;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — SOFT_SEMANTIC_SURFACE.
 *
 * Exactly one coherent important truth (current balance, current debt,
 * general spending limit, important warning). Tonal background first, no
 * strong decorative border, extremely limited shadow (none here).
 */
export function FinanceSemanticSurface({ tone = 'neutral', children, style, testID }: FinanceSemanticSurfaceProps) {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          backgroundColor: semanticBackground(colors, tone),
          padding: financeSpacing.surfaceInset,
          gap: financeSpacing.contentActionGap,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

export type FinanceGroupedSurfaceProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — GROUPED_SURFACE.
 *
 * A real grouped collection (accounts, credit cards, pool action group).
 * Single container, flat rows inside (FinanceListRow carries inset
 * dividers). Never nest a semantic surface inside another surface unless
 * the hierarchy is genuinely nested.
 */
export function FinanceGroupedSurface({ title, subtitle, children, style, bodyStyle, testID }: FinanceGroupedSurfaceProps) {
  const { borders, colors, radius, spacing } = useAppTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          backgroundColor: colors.surface.card,
          borderWidth: borders.card.borderWidth,
          borderColor: borders.card.borderColor,
          paddingVertical: spacing[1],
          paddingHorizontal: financeSpacing.surfaceInset,
        },
        style,
      ]}
      testID={testID}
    >
      {title ? (
        <View style={{ paddingTop: spacing[3], gap: 2 }}>
          <AppText variant="bodySmall" weight="700">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={bodyStyle}>{children}</View>
    </View>
  );
}
