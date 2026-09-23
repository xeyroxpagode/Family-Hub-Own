import React from 'react';
import { type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { InteractivePressable, type InteractionHaptic } from '../../ui/InteractivePressable';
import { FINANCE_HIT_TARGET } from './financeTokens';

export type FinanceIconActionProps = Omit<PressableProps, 'children' | 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: InteractionHaptic;
};

/** Finance icon-only action with an invisible 44px target. */
export function FinanceIconAction({ children, style, haptic = 'none', ...props }: FinanceIconActionProps) {
  return (
    <InteractivePressable
      {...props}
      haptic={haptic}
      pressedOpacity={0.68}
      accessibilityRole="button"
      style={[
        {
          width: FINANCE_HIT_TARGET,
          height: FINANCE_HIT_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        style,
      ]}
    >
      {children}
    </InteractivePressable>
  );
}
