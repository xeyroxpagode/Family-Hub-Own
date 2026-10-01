import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCard, AppScreen, AppText } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing, touchTargets } from '../constants/theme';
import { useExperience, type ExperienceMode } from '../context/ExperienceContext';

const OPTIONS: Array<{
  mode: ExperienceMode;
  title: string;
  description: string;
  tags: string[];
  icon: React.ComponentProps<typeof HomePlusIcon>['name'];
}> = [
  {
    mode: 'standard',
    title: 'Experiencia estándar',
    description: 'Acceso completo a todos los módulos permitidos.',
    tags: ['Calendario', 'Finanzas', 'Inventario', 'Actividad'],
    icon: 'grid-outline',
  },
  {
    mode: 'simple',
    title: 'Experiencia simple',
    description: 'Menos pasos, botones grandes y accesos directos.',
    tags: ['Familia', 'Medicamentos', 'Mi agenda', 'Llamadas', 'SOS'],
    icon: 'checkmark-circle-outline',
  },
];

export function ExperienceSelectorScreen() {
  const { setExperienceMode } = useExperience();

  return (
    <AppScreen scroll padded centered background="base" bottomInset="none" contentContainerStyle={styles.content}>
      <View style={styles.brandMark} accessible accessibilityLabel="HomePlus">
        <AppText variant="title2" tone="inverse" weight="800">H+</AppText>
      </View>
      <AppText variant="title1" weight="800" align="center" style={styles.title}>
        ¿Cómo querés usar{`\n`}HomePlus?
      </AppText>
      <AppText variant="body" tone="secondary" align="center" style={styles.subtitle}>
        Podés cambiar esto después desde Configuración.
      </AppText>

      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <AppCard
            key={option.mode}
            padding="generous"
            onPress={() => setExperienceMode(option.mode, { completeSetup: true })}
            accessibilityLabel={`Elegir ${option.title}`}
            style={option.mode === 'simple' ? styles.simpleCard : styles.standardCard}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, option.mode === 'simple' ? styles.simpleIcon : styles.standardIcon]}>
                <HomePlusIcon name={option.icon} size={26} color={option.mode === 'simple' ? colors.text.inverse : colors.text.primary} />
              </View>
              <View style={styles.optionCopy}>
                <AppText variant="title3" weight="800">{option.title}</AppText>
                <AppText variant="bodySmall" tone="secondary">{option.description}</AppText>
              </View>
            </View>
            <View style={styles.tags}>
              {option.tags.map((tag) => (
                <View key={tag} style={styles.tag}><AppText variant="micro" tone={option.mode === 'simple' ? 'brand' : 'secondary'}>{tag}</AppText></View>
              ))}
            </View>
            {option.mode === 'simple' ? (
              <View style={styles.simpleBenefit}>
                <View style={styles.bullet} />
                <AppText variant="bodySmall" tone="secondary">Botones grandes · Texto claro · Sin gestos ocultos</AppText>
              </View>
            ) : null}
          </AppCard>
        ))}
      </View>
      <AppButton
        title="Continuar con la experiencia estándar"
        variant="ghost"
        onPress={() => setExperienceMode('standard', { completeSetup: true })}
        accessibilityLabel="Continuar con la experiencia estándar"
        style={{ minHeight: touchTargets.senior }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', paddingVertical: spacing[8] },
  brandMark: { width: 64, height: 64, borderRadius: radius.xl, backgroundColor: '#E7643F', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing[6] },
  title: { lineHeight: 34 },
  subtitle: { marginTop: spacing[3], marginBottom: spacing[8], paddingHorizontal: spacing[3] },
  options: { gap: spacing[4], width: '100%', marginBottom: spacing[5] },
  standardCard: { borderColor: '#DED5CB', borderWidth: 2 },
  simpleCard: { backgroundColor: '#FFE3DA', borderColor: '#F5B5A3', borderWidth: 2 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  optionIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  standardIcon: { backgroundColor: '#1A1714' },
  simpleIcon: { backgroundColor: '#E7643F' },
  optionCopy: { flex: 1, gap: spacing[1] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[4] },
  tag: { backgroundColor: '#FFFFFFB8', borderRadius: radius.pill, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  simpleBenefit: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[4] },
  bullet: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: '#E7643F' },
});
