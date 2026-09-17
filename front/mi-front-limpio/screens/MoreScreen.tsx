import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../components/ui/AppScreen';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { InteractivePressable } from '../components/ui/InteractivePressable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';

const MODULES = [
  {
    id: 'feed',
    label: 'Actividad',
    description: 'Actividad del hogar',
    icon: 'chatbubbles',
    color: colors.terracotta[600],
    bg: colors.terracotta[50],
    screen: 'FeedFamiliar' as const,
    isDemo: true,
  },
  {
    id: 'finance',
    label: 'Finanzas',
    description: 'Saldos, pagos y movimientos',
    icon: 'wallet',
    color: colors.terracotta[600],
    bg: colors.terracotta[50],
    screen: 'Finance' as const,
    isDemo: false,
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Compras y lo que falta en casa',
    icon: 'archive',
    color: colors.sage[600],
    bg: colors.sage[50],
    screen: 'Inventory' as const,
    isDemo: false,
  },
];

export function MoreScreen() {
  const navigation = useNavigation<any>();

  const handleModulePress = (screen: string | null | undefined) => {
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
        <AppCard variant="quiet" padding="compact">
          {MODULES.map((module, index) => (
            <React.Fragment key={module.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <InteractivePressable
                onPress={() => handleModulePress(module.screen)}
                style={styles.modulePressable}
                accessibilityLabel={`Abrir ${module.label}`}
              >
                <View style={styles.moduleRow}>
                  <View style={[styles.moduleIcon, { backgroundColor: module.bg }]}>
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
                  {module.isDemo ? <StatusBadge label="Demo" tone="warning" style={styles.demoBadge} /> : null}
                  <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.tertiary} />
                </View>
              </InteractivePressable>
            </React.Fragment>
          ))}
        </AppCard>
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
  },
  modulePressable: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: 56,
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
});
