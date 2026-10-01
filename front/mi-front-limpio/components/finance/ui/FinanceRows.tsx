import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon } from '../../../constants/icons';
import { useAppTheme } from '../../../context/AppThemeContext';
import { AppText, type AppTextTone } from '../../ui/AppText';
import { InteractivePressable } from '../../ui/InteractivePressable';
import {
  FINANCE_CHEVRON_SIZE,
  FINANCE_ICON_BOX,
  FINANCE_ICON_BOX_SMALL,
  FINANCE_ROW_DIVIDER_INSET,
  FINANCE_ROW_MIN_HEIGHT,
} from './financeTokens';

export type FinanceIconBoxProps = {
  children: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Canonical 40 (32 small) tonal icon box shared by all flat rows. */
export function FinanceIconBox({ children, small = false, style }: FinanceIconBoxProps) {
  const { colors, radius } = useAppTheme();
  const size = small ? FINANCE_ICON_BOX_SMALL : FINANCE_ICON_BOX;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: colors.surface.soft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function FinanceRowDivider({ inset }: { inset: number }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
        marginLeft: inset,
      }}
    />
  );
}

export type FinanceListRowProps = {
  title: string;
  subtitle?: string;
  /** Optional leading icon node — wrap it in FinanceIconBox for consistency. */
  icon?: React.ReactNode;
  /** Right-side amount/value/action. Strings render right-aligned. */
  value?: React.ReactNode | string;
  valueTone?: AppTextTone;
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  divider?: boolean;
  titleNumberOfLines?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — reusable flat-row grammar.
 *
 * Anatomy: optional icon | primary text | optional secondary text |
 * right-side amount/value/action | optional chevron | inset divider.
 *
 * Disabled: reduced-but-readable tokens, no press feedback, chevron in
 * muted (never an active-looking chevron). Long labels ellipsize; the
 * right side never pushes the title off-screen.
 */
export function FinanceListRow({
  title,
  subtitle,
  icon,
  value,
  valueTone = 'primary',
  chevron = false,
  onPress,
  disabled = false,
  divider = true,
  titleNumberOfLines = 1,
  accessibilityLabel,
  style,
  testID,
}: FinanceListRowProps) {
  const theme = useAppTheme();
  const { colors, motion, spacing } = theme;

  const titleTone: AppTextTone = disabled ? 'muted' : 'primary';
  const content = (
    <View
      style={[
        {
          minHeight: FINANCE_ROW_MIN_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingVertical: spacing[2],
        },
        style,
      ]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodySmall" weight="600" tone={titleTone} numberOfLines={titleNumberOfLines} ellipsizeMode="tail">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone={disabled ? 'muted' : 'tertiary'} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {typeof value === 'string' ? (
        <AppText
          variant="bodySmall"
          weight="700"
          tone={disabled ? 'muted' : valueTone}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ flexShrink: 1, textAlign: 'right' }}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
      {chevron ? (
        <HomePlusIcon
          name="chevron-forward-outline"
          size={FINANCE_CHEVRON_SIZE}
          color={disabled ? colors.text.muted : colors.text.tertiary}
        />
      ) : null}
    </View>
  );

  return (
    <View testID={testID}>
      {onPress && !disabled ? (
        <InteractivePressable
          onPress={onPress}
          haptic="light"
          pressScale={motion.scale.card}
          pressedOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
        >
          {content}
        </InteractivePressable>
      ) : (
        <View
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityState={disabled ? { disabled: true } : undefined}
          accessibilityLabel={accessibilityLabel}
        >
          {content}
        </View>
      )}
      {divider ? <FinanceRowDivider inset={icon ? FINANCE_ROW_DIVIDER_INSET : 0} /> : null}
    </View>
  );
}

export type FinanceSelectionRowProps = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  errorText?: string;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Stage 7A — selection-row grammar (forms).
 *
 * Label identity + selected value + chevron, flat/divider-based by default.
 * No rounded white capsule. States: normal / selected / placeholder /
 * disabled / error.
 */
export function FinanceSelectionRow({
  label,
  value,
  placeholder,
  onPress,
  disabled = false,
  errorText,
  accessibilityLabel,
  testID,
}: FinanceSelectionRowProps) {
  const theme = useAppTheme();
  const { colors, motion, spacing } = theme;
  const hasValue = Boolean(value);
  const displayValue = hasValue ? value : placeholder ?? 'Seleccionar';

  return (
    <View testID={testID}>
      <InteractivePressable
        onPress={onPress}
        disabled={disabled}
        haptic="light"
        pressScale={motion.scale.card}
        pressedOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${displayValue}`}
        accessibilityState={disabled ? { disabled: true } : undefined}
        style={{
          minHeight: FINANCE_ROW_MIN_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" tone={disabled ? 'muted' : 'secondary'} weight="700" numberOfLines={1}>
            {label}
          </AppText>
          <AppText
            variant="body"
            weight="600"
            tone={disabled ? 'muted' : errorText ? 'danger' : hasValue ? 'primary' : 'tertiary'}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayValue}
          </AppText>
        </View>
        <HomePlusIcon
          name="chevron-forward-outline"
          size={FINANCE_CHEVRON_SIZE}
          color={disabled ? colors.text.muted : colors.text.tertiary}
        />
      </InteractivePressable>
      <FinanceRowDivider inset={0} />
      {errorText ? (
        <AppText variant="caption" tone="danger" style={{ paddingTop: spacing[1] }}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

export type FinanceDisclosureRowProps = {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Stage 7A — disclosure-row grammar ("Más detalles" v).
 * Inline expand/collapse; content follows directly. Never opens a sheet.
 */
export function FinanceDisclosureRow({
  label,
  expanded,
  onToggle,
  disabled = false,
  children,
  accessibilityLabel,
  testID,
}: FinanceDisclosureRowProps) {
  const theme = useAppTheme();
  const { colors, motion, spacing } = theme;

  return (
    <View testID={testID}>
      <InteractivePressable
        onPress={onToggle}
        disabled={disabled}
        haptic="light"
        pressScale={motion.scale.card}
        pressedOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded, disabled: disabled === true ? true : undefined }}
        style={{
          minHeight: FINANCE_ROW_MIN_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingVertical: spacing[2],
        }}
      >
        <AppText variant="bodySmall" weight="600" tone={disabled ? 'muted' : 'primary'} style={{ flex: 1 }}>
          {label}
        </AppText>
        <HomePlusIcon
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={FINANCE_CHEVRON_SIZE}
          color={disabled ? colors.text.muted : colors.text.tertiary}
        />
      </InteractivePressable>
      <FinanceRowDivider inset={0} />
      {expanded ? <View style={{ paddingTop: spacing[3] }}>{children}</View> : null}
    </View>
  );
}
