import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppInput, AppText, DatePickerSheet, FilterChip, FormActionRow } from '../ui';
import { spacing } from '../../constants/theme';
import {
  semanticDateDraftError,
  setSemanticDatePrecision,
  type SemanticDateDraft,
} from '../../services/homecloud/homecloudSemanticDate';
import type { CapturePrecision } from '../../services/homecloud/homecloudUploadTypes';

const PRECISIONS: readonly { value: CapturePrecision; label: string }[] = [
  { value: 'exact', label: 'Fecha exacta' },
  { value: 'month_year', label: 'Mes y año' },
  { value: 'year', label: 'Sólo año' },
  { value: 'unknown', label: 'Sin fecha' },
];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'] as const;

export function MemorySemanticDateFields({ value, onChange, disabled = false }: {
  value: SemanticDateDraft;
  onChange: (value: SemanticDateDraft) => void;
  disabled?: boolean;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const error = semanticDateDraftError(value);

  return (
    <View style={styles.container}>
      <AppText variant="caption" tone="secondary" weight="700">{'Cuándo fue'}</AppText>
      <View style={styles.precisions} accessibilityRole="radiogroup" accessibilityLabel="Precisión de la fecha">
        {PRECISIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={value.precision === option.value}
            disabled={disabled}
            onPress={() => onChange(setSemanticDatePrecision(value, option.value, today))}
          />
        ))}
      </View>

      {value.precision === 'exact' ? (
        <>
          <FormActionRow
            label="Fecha"
            value={value.exactDate || 'Elegir fecha'}
            disabled={disabled}
            onPress={() => setDatePickerOpen(true)}
          />
          <DatePickerSheet
            visible={datePickerOpen}
            value={value.exactDate || today}
            onClose={() => setDatePickerOpen(false)}
            onConfirm={(exactDate) => {
              const [year, month] = exactDate.split('-').map(Number);
              onChange({ ...value, exactDate, exactCapturedAt: null, year: String(year), month });
              setDatePickerOpen(false);
            }}
          />
        </>
      ) : null}

      {value.precision === 'month_year' ? (
        <View style={styles.partialFields}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.months}>
            {MONTHS.map((month, index) => (
              <FilterChip
                key={month}
                label={month}
                selected={value.month === index + 1}
                disabled={disabled}
                onPress={() => onChange({ ...value, month: index + 1 })}
              />
            ))}
          </ScrollView>
          <AppInput
            label="Año"
            value={value.year}
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(year) => onChange({ ...value, year: year.replace(/\D/g, '') })}
          />
        </View>
      ) : null}

      {value.precision === 'year' ? (
        <AppInput
          label="Año"
          value={value.year}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={4}
          onChangeText={(year) => onChange({ ...value, year: year.replace(/\D/g, '') })}
        />
      ) : null}
      {error && value.precision !== 'unknown' ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3] },
  precisions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  partialFields: { gap: spacing[3] },
  months: { gap: spacing[2], paddingRight: spacing[4] },
});
