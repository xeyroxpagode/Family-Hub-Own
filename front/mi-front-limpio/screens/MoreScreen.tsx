import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../components/ui/AppScreen';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ActionSheet } from '../components/ui/ActionSheet';
import { AppButton } from '../components/ui/AppButton';
import { InteractivePressable } from '../components/ui/InteractivePressable';
import { HomePlusIcon } from '../constants/icons';
import { useAppTheme, useAppThemePreference } from '../context/AppThemeContext';
import type { ThemePreference } from '../constants/theme';

type IconName = React.ComponentProps<typeof HomePlusIcon>['name'];
type ModuleColor = 'terracotta' | 'sage' | 'sand';

const MODULES: {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  color: ModuleColor;
  screen: string;
  isDemo: boolean;
}[] = [
  {
    id: 'feed',
    label: 'Feed',
    description: 'Actividad del hogar',
    icon: 'chatbubbles',
    color: 'terracotta',
    screen: 'FeedFamiliar',
    isDemo: true,
  },
  {
    id: 'family',
    label: 'Familia',
    description: 'Personas, roles y accesos',
    icon: 'people',
    color: 'sage',
    screen: 'Family',
    isDemo: false,
  },
  {
    id: 'presence',
    label: 'Ubicación',
    description: 'Mapa familiar en vivo',
    icon: 'location',
    color: 'terracotta',
    screen: 'Presence',
    isDemo: false,
  },
  {
    id: 'finance',
    label: 'Finanzas',
    description: 'Personal y hogar',
    icon: 'wallet',
    color: 'sand',
    screen: 'Finance',
    isDemo: false,
  },
];

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

export function MoreScreen() {
  const navigation = useNavigation<any>();
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const { preference, setPreference } = useAppThemePreference();
  const styles = createStyles(theme);

  const [appearanceSheetVisible, setAppearanceSheetVisible] = useState(false);

  const handleModulePress = (screen: string | null) => {
    if (!screen) return;
    navigation.navigate(screen);
  };

  const handleAppearanceSelect = (value: ThemePreference) => {
    setPreference(value);
    setAppearanceSheetVisible(false);
  };

  const getColor = (name: ModuleColor) => {
    if (name === 'sage') return colors.sage[600];
    if (name === 'sand') return colors.sand[600];
    return colors.terracotta[600];
  };

  const getBg = (name: ModuleColor) => {
    if (name === 'sage') return colors.sage[50];
    if (name === 'sand') return colors.sand[50];
    return colors.terracotta[50];
  };

  const getAppearanceIcon = (value: ThemePreference): IconName => {
    const option = APPEARANCE_OPTIONS.find((o) => o.value === value);
    return option?.icon ?? 'phone-portrait-outline';
  };

  return (
    <AppScreen scroll bottomInset="tab" background="base">
      <View style={styles.header}>
        <AppText variant="title1">Más</AppText>
      </View>

      <View style={styles.modules}>
        {MODULES.map((module) => (
          <AppCard
            key={module.id}
            variant="default"
            padding="default"
            onPress={() => handleModulePress(module.screen)}
          >
            <View style={styles.moduleRow}>
              <View
                style={[
                  styles.moduleIcon,
                  { backgroundColor: getBg(module.color) },
                ]}
              >
                <HomePlusIcon name={module.icon} size={22} color={getColor(module.color)} />
              </View>
              <View style={styles.moduleInfo}>
                <AppText variant="body" weight="700">
                  {module.label}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {module.description}
                </AppText>
              </View>
              {module.isDemo && (
                <StatusBadge label="Demo" tone="warning" style={styles.demoBadge} />
              )}
              <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.tertiary} />
            </View>
          </AppCard>
        ))}

        {/* Apariencia entry */}
        <AppCard variant="default" padding="default">
          <InteractivePressable
            onPress={() => setAppearanceSheetVisible(true)}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.appearanceRow}
            accessibilityRole="button"
            accessibilityLabel="Apariencia"
            accessibilityHint="Cambia entre Sistema, Claro u Oscuro"
          >
            <View style={styles.appearanceIcon}>
              <HomePlusIcon
                name={getAppearanceIcon(preference)}
                size={22}
                color={colors.terracotta[600]}
              />
            </View>
            <View style={styles.moduleInfo}>
              <AppText variant="body" weight="700">Apariencia</AppText>
              <AppText variant="caption" tone="secondary">
                {APPEARANCE_OPTIONS.find((o) => o.value === preference)?.label ?? 'Sistema'}
              </AppText>
            </View>
            <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.tertiary} />
          </InteractivePressable>
        </AppCard>
      </View>

      <ActionSheet
        visible={appearanceSheetVisible}
        title="Apariencia"
        onRequestClose={() => setAppearanceSheetVisible(false)}
        size="content"
      >
        <View style={styles.appearanceSheetContent}>
          {APPEARANCE_OPTIONS.map((option) => (
            <InteractivePressable
              key={option.value}
              onPress={() => handleAppearanceSelect(option.value)}
              haptic="light"
              pressScale={motion.scale.card}
              style={[
                styles.appearanceOption,
                preference === option.value && styles.appearanceOptionSelected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === option.value }}
              accessibilityLabel={option.label}
            >
              <HomePlusIcon
                name={preference === option.value ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={preference === option.value ? colors.terracotta[700] : colors.text.tertiary}
              />
              <AppText variant="body" weight="700" style={styles.appearanceOptionLabel}>
                {option.label}
              </AppText>
            </InteractivePressable>
          ))}
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={() => setAppearanceSheetVisible(false)}
            style={styles.cancelButton}
          />
        </View>
      </ActionSheet>
    </AppScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    header: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: spacing[3],
      gap: spacing[1],
    },
    modules: {
      paddingHorizontal: spacing[5],
      paddingBottom: spacing[6],
      gap: spacing[3],
    },
    moduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    moduleIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moduleInfo: {
      flex: 1,
      gap: spacing[1],
    },
    demoBadge: {
      marginRight: spacing[1],
    },
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      minHeight: 44,
    },
    appearanceIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      backgroundColor: colors.terracotta[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    appearanceSheetContent: {
      gap: spacing[1],
      paddingHorizontal: spacing[2],
      paddingBottom: spacing[2],
    },
    appearanceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      minHeight: 48,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    appearanceOptionSelected: {
      backgroundColor: colors.surface.muted,
    },
    appearanceOptionLabel: {
      flex: 1,
    },
    cancelButton: {
      marginTop: spacing[2],
    },
  });
}
