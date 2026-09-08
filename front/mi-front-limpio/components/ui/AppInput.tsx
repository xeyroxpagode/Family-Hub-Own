import React, { useState } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from './AppText';

export type AppInputVariant = 'default' | 'large' | 'multiline' | 'search';

export type AppInputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  errorText?: string;
  variant?: AppInputVariant;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppInput({
  label,
  helperText,
  errorText,
  variant = 'default',
  editable = true,
  accessibilityLabel,
  multiline,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: AppInputProps) {
  const theme = useAppTheme();
  const { colors, componentSizes, radius, spacing, typography } = theme;
  const [focused, setFocused] = useState(false);
  const isMultiline = variant === 'multiline' || multiline;
  const hasError = Boolean(errorText);
  const isDisabled = editable === false;
  const variantHeights: Record<AppInputVariant, number> = {
    default: componentSizes.textFieldHeight,
    large: componentSizes.searchFieldHeight,
    multiline: 104,
    search: componentSizes.searchFieldHeight,
  };

  return (
    <View style={[{ gap: spacing[2] }, containerStyle]}>
      <AppText variant="caption" tone="secondary" weight="700">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        editable={editable}
        multiline={isMultiline}
        placeholderTextColor={colors.text.muted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          typography.body,
          {
            minHeight: variantHeights[variant],
            paddingHorizontal: spacing[4],
            paddingVertical: isMultiline ? spacing[3] : spacing[2],
            borderRadius: variant === 'search' ? radius.search : radius.md,
            borderWidth: focused ? 2 : 1,
            borderColor: hasError
              ? colors.danger.base
              : focused
                ? colors.brand
                : colors.border.default,
            backgroundColor: isDisabled ? colors.surface.muted : colors.surface.card,
            color: isDisabled ? colors.text.disabled : colors.text.primary,
            textAlignVertical: isMultiline ? 'top' : 'center',
          },
          inputStyle,
        ]}
        {...props}
      />
      {hasError ? (
        <AppText variant="caption" tone="danger">
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" tone="tertiary">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
