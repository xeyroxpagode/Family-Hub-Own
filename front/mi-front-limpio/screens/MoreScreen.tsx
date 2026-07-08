import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../components/ui/AppScreen';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';

const MODULES = [
  {
    id: 'feed',
    label: 'Feed',
    description: 'Actividad del hogar',
    icon: 'chatbubbles',
    color: colors.terracotta[600],
    bg: colors.terracotta[50],
    screen: 'FeedFamiliar' as const,
    isDemo: true,
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Cosas del hogar',
    icon: 'archive',
    color: colors.sage[600],
    bg: colors.sage[50],
    screen: 'Inventory' as const,
    isDemo: false,
  },
];

export function MoreScreen() {
  const navigation = useNavigation<any>();

  const handleModulePress = (screen: string | null) => {
    if (!screen) {
      return;
    }
    navigation.navigate(screen);
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
                  { backgroundColor: module.bg },
                ]}
              >
                <HomePlusIcon name={module.icon as any} size={22} color={module.color} />
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
                <View style={styles.demoBadge}>
                  <AppText variant="micro" tone="warning" weight="700">
                    Demo
                  </AppText>
                </View>
              )}
              <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.tertiary} />
            </View>
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    marginRight: spacing[1],
  },
});
