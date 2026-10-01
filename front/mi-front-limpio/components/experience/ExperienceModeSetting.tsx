import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppCard, AppText, InteractivePressable } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, touchTargets } from '../../constants/theme';
import { useExperience, type ExperienceMode } from '../../context/ExperienceContext';

const OPTIONS: { mode: ExperienceMode; title: string; description: string; icon: React.ComponentProps<typeof HomePlusIcon>['name'] }[] = [
  { mode: 'standard', title: 'Estándar', description: 'Navegación completa', icon: 'grid-outline' },
  { mode: 'simple', title: 'Simple', description: 'Menos pasos y accesos grandes', icon: 'checkmark-circle-outline' },
];

/** Shared Settings surface. It owns no state; ExperienceContext is the only authority. */
export function ExperienceModeSetting() {
  const { experienceMode, setExperienceMode } = useExperience();
  const navigation = useNavigation<any>();

  const selectExperienceMode = (nextMode: ExperienceMode) => {
    if (nextMode === experienceMode) return;

    // Update the reactive source first. The resolver will mount the matching
    // shell immediately; this reset only removes the Settings route that
    // belongs to the previous shell.
    setExperienceMode(nextMode);

    let currentNavigation: any = navigation;
    while (currentNavigation) {
      const state = currentNavigation.getState?.();
      if (state?.routeNames?.includes('ExperienceShell')) {
        currentNavigation.reset({ index: 0, routes: [{ name: 'ExperienceShell' }] });
        return;
      }
      currentNavigation = currentNavigation.getParent?.();
    }
  };

  return (
    <AppCard variant="default" padding="default" style={styles.card}>
      <AppText variant="caption" weight="700" tone="secondary" style={styles.eyebrow}>Interfaz</AppText>
      <AppText variant="bodySmall" tone="secondary">Elegí cómo querés usar HomePlus. Tus datos y permisos no cambian.</AppText>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = experienceMode === option.mode;
          return <InteractivePressable
            key={option.mode}
            onPress={() => selectExperienceMode(option.mode)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Interfaz ${option.title}. ${selected ? 'Seleccionada' : 'No seleccionada'}`}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <View style={styles.icon}><HomePlusIcon name={option.icon} size={21} color={selected ? '#E7643F' : colors.text.secondary} /></View>
            <View style={styles.copy}><AppText variant="body" weight="800">{option.title}</AppText><AppText variant="bodySmall" tone="secondary">{option.description}</AppText></View>
            <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
          </InteractivePressable>;
        })}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[3] },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  options: { gap: spacing[2] },
  option: { minHeight: touchTargets.senior, flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.md, padding: spacing[3] },
  optionSelected: { borderColor: '#E7643F', backgroundColor: '#FFE3DA' },
  icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0EB' },
  copy: { flex: 1, gap: spacing[1] },
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.text.tertiary, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#E7643F' },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: '#E7643F' },
});
