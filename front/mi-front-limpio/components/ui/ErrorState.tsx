import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  detail?: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({
  title = 'No pudimos cargar esta informacion',
  description = 'Revisa tu conexion o intenta de nuevo.',
  retryLabel = 'Intentar de nuevo',
  onRetry,
  secondaryActionLabel,
  onSecondaryAction,
  detail,
  style,
}: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          padding: spacing[5],
          borderRadius: radius.md,
          backgroundColor: colors.danger.soft,
          borderWidth: 1,
          borderColor: colors.danger.base,
          gap: spacing[4],
        },
        style,
      ]}
    >
      <View style={{ gap: spacing[2] }}>
        <AppText variant="title3" tone="danger">
          {title}
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {description}
        </AppText>
        {detail ? (
          <AppText variant="caption" tone="tertiary">
            {detail}
          </AppText>
        ) : null}
      </View>
      {onRetry ? (
        <AppButton
          title={retryLabel}
          variant="danger"
          onPress={onRetry}
          accessibilityLabel={retryLabel}
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <AppButton
          title={secondaryActionLabel}
          variant="ghost"
          onPress={onSecondaryAction}
          accessibilityLabel={secondaryActionLabel}
        />
      ) : null}
    </View>
  );
}
