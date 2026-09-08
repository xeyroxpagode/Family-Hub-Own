import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { AppText, InteractivePressable } from '../ui';
import {
  DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS,
  isMoneyInputCurrency,
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';

export type MoneyInputProps = {
  value: string;
  currency: MoneyInputCurrencyCode;
  onValueChange: (next: MoneyInputParseResult) => void;
  onCurrencyChange: (currency: MoneyInputCurrencyCode) => void;
  label?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  availableCurrencies?: readonly MoneyInputCurrencyCode[];
  allowZero?: boolean;
  allowNegative?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export const MoneyInput = memo(function MoneyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  label = 'Monto',
  helperText,
  errorText,
  disabled = false,
  availableCurrencies = DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS,
  allowZero = false,
  allowNegative = false,
  containerStyle,
  testID,
}: MoneyInputProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createMoneyInputStyles(theme);
  const [currencyExpanded, setCurrencyExpanded] = useState(false);
  const parseOptions = useMemo(() => ({ allowNegative }), [allowNegative]);
  const parsed = useMemo(() => parseMoneyInputText(value, currency, parseOptions), [currency, value, parseOptions]);
  const visibleCurrencies = useMemo(
    () => {
      const filtered = availableCurrencies.filter((candidate) => isMoneyInputCurrency(candidate));
      if (isMoneyInputCurrency(currency) && !filtered.includes(currency)) {
        return [currency, ...filtered];
      }
      return filtered;
    },
    [availableCurrencies, currency],
  );
  const parsedIsZero = parsed.status === 'zero';
  const parsedValid = parsed.isValid || (parsedIsZero && allowZero);
  const hasError = Boolean(errorText) || parsed.status === 'invalid' || (parsedIsZero && !allowZero);
  const helper = errorText ?? (parsedIsZero && !allowZero ? 'El monto debe ser mayor que cero.' : helperText);

  const handleTextChange = (nextText: string) => {
    onValueChange(parseMoneyInputText(nextText, currency, parseOptions));
  };

  const chooseCurrency = (nextCurrency: MoneyInputCurrencyCode) => {
    if (!isMoneyInputCurrency(nextCurrency)) return;
    onCurrencyChange(nextCurrency);
    setCurrencyExpanded(false);
  };

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View style={styles.headerRow}>
        <AppText variant="caption" tone="secondary" weight="700">
          {label}
        </AppText>
        <AppText variant="caption" tone={parsedValid ? 'success' : 'tertiary'}>
          {parsedValid ? parsed.displayText : 'Sin monto valido'}
        </AppText>
      </View>

      <View style={[styles.field, hasError && styles.fieldError, disabled && styles.fieldDisabled]}>
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          editable={!disabled}
          keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
          inputMode="decimal"
          returnKeyType="done"
          placeholder="0"
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.terracotta[500]}
          style={styles.amountInput}
          accessibilityLabel="Monto de dinero"
          accessibilityHint="Ingresa una magnitud positiva. Usa coma o punto para decimales."
        />
        <InteractivePressable
          onPress={() => setCurrencyExpanded((current) => !current)}
          disabled={disabled}
          haptic="light"
          pressScale={motion.scale.tab}
          style={styles.currencyButton}
          accessibilityRole="button"
          accessibilityState={{ expanded: currencyExpanded }}
          accessibilityLabel={`Moneda ${currency}`}
          accessibilityHint="Cambia la moneda del monto sin convertir el valor"
        >
          <AppText variant="bodySmall" weight="800">
            {currency}
          </AppText>
          <HomePlusIcon
            name={currencyExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={16}
            color={colors.text.tertiary}
          />
        </InteractivePressable>
      </View>

      {currencyExpanded ? (
        <View style={styles.currencyOptions} accessibilityLabel="Seleccionar moneda">
          {visibleCurrencies.map((candidate) => {
            const selected = candidate === currency;
            return (
              <InteractivePressable
                key={candidate}
                onPress={() => chooseCurrency(candidate)}
                haptic="light"
                pressScale={motion.scale.tab}
                style={[styles.currencyOption, selected && styles.currencyOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={candidate}
              >
                <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                  {candidate}
                </AppText>
              </InteractivePressable>
            );
          })}
        </View>
      ) : null}

      {helper ? (
        <AppText variant="caption" tone={hasError ? 'danger' : 'tertiary'}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

function createMoneyInputStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets, typography } = theme;

  return StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  headerRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  field: {
    minHeight: 76,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[4],
    paddingRight: spacing[2],
    gap: spacing[2],
  },
  fieldError: {
    borderColor: colors.danger.base,
    backgroundColor: colors.danger.soft,
  },
  fieldDisabled: {
    opacity: 0.58,
  },
  amountInput: {
    ...typography.title1,
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[3],
    color: colors.text.primary,
  },
  currencyButton: {
    minWidth: 86,
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  currencyOptions: {
    minHeight: touchTargets.normal,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  currencyOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  currencyOptionSelected: {
    backgroundColor: colors.terracotta[600],
  },
  });
}
