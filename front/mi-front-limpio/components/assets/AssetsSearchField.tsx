import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

export type AssetsSearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

/**
 * Búsqueda Root: alto 48, icono 18–20, texto 16, clear con hitbox 44.
 * El debounce remoto (180–250 ms) lo aplica la pantalla: este campo
 * responde inmediato visualmente.
 */
export function AssetsSearchField({
  value,
  onChangeText,
  placeholder = 'Buscar por nombre',
}: AssetsSearchFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconSlot}>
        <HomePlusIcon name="search-outline" size={18} color={colors.text.tertiary} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        style={styles.input}
        accessibilityLabel="Buscar activos"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          hitSlop={8}
          style={styles.clear}
        >
          <HomePlusIcon name="close" size={18} color={colors.text.tertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  iconSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing[2],
    color: colors.text.primary,
  },
  clear: {
    width: 44,
    height: 44,
    marginRight: -spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
