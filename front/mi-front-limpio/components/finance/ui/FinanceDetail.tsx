import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, type AppTextTone } from '../../ui/AppText';
import { FinanceIconBox } from './FinanceRows';
import { financeSpacing } from './financeTokens';

export type FinanceDetailHeaderProps = {
  title: string;
  subtitle?: string;
  amount?: string;
  amountTone?: AppTextTone;
  supporting?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — detail IDENTITY + PRIMARY STATE block.
 * Identity (icon/title/subtitle), then the primary amount, then one
 * supporting line. Ordering is the contract; heights vary per domain.
 */
export function FinanceDetailHeader({ title, subtitle, amount, amountTone = 'primary', supporting, icon, style, testID }: FinanceDetailHeaderProps) {
  return (
    <View style={[{ gap: financeSpacing.contentActionGap }, style]} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {icon ? <FinanceIconBox>{icon}</FinanceIconBox> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="title3" weight="700" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {amount ? (
        <AppText variant="title1" weight="800" tone={amountTone} numberOfLines={1}>
          {amount}
        </AppText>
      ) : null}
      {supporting ? (
        <AppText variant="bodySmall" tone="secondary">
          {supporting}
        </AppText>
      ) : null}
    </View>
  );
}

export type FinanceDetailSectionProps = {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Stage 7A — SUPPORTING BREAKDOWN / METADATA block inside a detail. */
export function FinanceDetailSection({ title, children, style, testID }: FinanceDetailSectionProps) {
  return (
    <View style={[{ gap: financeSpacing.titleContentGap }, style]} testID={testID}>
      {title ? (
        <AppText variant="bodySmall" weight="700" tone="secondary">
          {title}
        </AppText>
      ) : null}
      <View style={{ gap: financeSpacing.contentActionGap }}>{children}</View>
    </View>
  );
}

export type FinanceDetailMetaRowProps = {
  label: string;
  value: string;
  valueTone?: AppTextTone;
  testID?: string;
};

/**
 * Stage 7A — READ_ONLY metadata row. Metadata, not a fake disabled input:
 * no press feedback, no chevron, no input boundary.
 */
export function FinanceDetailMetaRow({ label, value, valueTone = 'primary', testID }: FinanceDetailMetaRowProps) {
  return (
    <View
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
      }}
      testID={testID}
    >
      <AppText variant="caption" tone="secondary" weight="700" style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="600" tone={valueTone} numberOfLines={2} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
