import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../../context/AppThemeContext';
import { AppButton } from '../../ui/AppButton';
import { financeSpacing } from './financeTokens';

export type FinanceFormFooterProps = {
  /** Primary CTA label (always present). */
  primaryTitle: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  loading?: boolean;
  /** Destructive confirmations render the primary CTA with the danger variant. */
  destructive?: boolean;
  /** Omit when cancel is not meaningful. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Top divider; disable only when the sheet already provides separation. */
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — ONE canonical form footer composition.
 *
 * Normal form: [Cancelar] [Primary CTA]. Confirmation/destructive:
 * [Cancelar] [Destructive CTA]. Single primary when cancel is meaningless.
 *
 * Button height = componentSizes.primaryButtonHeight (52) via AppButton
 * size="md". Disabled + loading states come from AppButton. Keyboard
 * reachability contract: focused input stays visible and the primary CTA
 * stays reachable (see README keyboard contract; sheets rely on the global
 * ActionSheet sizing + KeyboardAware patterns, unchanged in 7A).
 */
export function FinanceFormFooter({
  primaryTitle,
  onPrimary,
  primaryDisabled = false,
  loading = false,
  destructive = false,
  onCancel,
  cancelLabel = 'Cancelar',
  divided = true,
  style,
  testID,
}: FinanceFormFooterProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        {
          paddingTop: financeSpacing.titleContentGap,
          borderTopWidth: divided ? 1 : 0,
          borderTopColor: colors.border.subtle,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', gap: financeSpacing.footerGap }}>
        {onCancel ? (
          <View style={{ flex: 1 }}>
            <AppButton
              title={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              disabled={loading}
              accessibilityLabel={cancelLabel}
            />
          </View>
        ) : null}
        <View style={{ flex: onCancel ? 2 : 1 }}>
          <AppButton
            title={primaryTitle}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={loading}
            accessibilityLabel={primaryTitle}
          />
        </View>
      </View>
    </View>
  );
}
