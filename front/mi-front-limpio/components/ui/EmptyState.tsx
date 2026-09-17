import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

export type EmptyStateProps = {
  title: string;
  description: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title,
  description,
  illustration,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
          gap: spacing[4],
        },
        style,
      ]}
    >
      {illustration ? (
        <View
          style={{
            minHeight: 72,
            minWidth: 72,
            borderRadius: radius.xxl,
            backgroundColor: colors.sand[50],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {illustration}
        </View>
      ) : null}
      <View style={{ gap: spacing[2], alignItems: 'center' }}>
        <AppText variant="title3" align="center">
          {title}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          {description}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} accessibilityLabel={actionLabel} />
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
