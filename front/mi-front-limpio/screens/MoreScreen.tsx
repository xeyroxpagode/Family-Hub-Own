import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
    id: 'homecloud',
    label: 'HomeCloud',
    description: 'Archivos del hogar',
    icon: 'cloud-outline',
    color: colors.info.base,
    bg: colors.info.soft,
    screen: 'HomeCloud' as const,
    isDemo: false,
  },
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

  // QA/dev-only WEB automation hook: browser automation can reach dev-only
  // preview routes (e.g. InventoryV2Preview) through a global callback.
  //
  // It is WEB-ONLY ON PURPOSE. React Native native defines `window` as an
  // alias of the RN global object, which exposes no DOM EventTarget API, so
  // `window.addEventListener` is `undefined` and calling it crashes the
  // screen on iOS/Android. Native never installs, reads or cleans up this
  // hook, and the visible QA entry below stays reachable on every platform.
  React.useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web') {
      return;
    }
    const target = globalThis as unknown as Record<string, unknown>;
    target.__hpMoreDevNavigate = (screen: string) => navigation.navigate(screen);
    const openPreviewFromHash = () => {
      if (globalThis.location?.hash === '#inventory-v2-preview') {
        navigation.navigate('InventoryV2Preview');
      }
    };
    globalThis.addEventListener('hashchange', openPreviewFromHash);
    openPreviewFromHash();
    return () => {
      delete target.__hpMoreDevNavigate;
      globalThis.removeEventListener('hashchange', openPreviewFromHash);
    };
  }, [navigation]);

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

      {__DEV__ ? (
        <View style={styles.devSection}>
          <View style={styles.devHeader}>
            <AppText variant="caption" tone="secondary" weight="700">
              QA / Desarrollo
            </AppText>
          </View>
          <AppCard variant="quiet" padding="compact">
            <InteractivePressable
              onPress={() => navigation.navigate('InventoryV2Preview')}
              style={styles.modulePressable}
              accessibilityLabel="Abrir Inventario V2 (QA / Desarrollo)"
            >
              <View style={styles.moduleRow}>
                <View style={[styles.moduleIcon, { backgroundColor: colors.info.soft }]}>
                  <HomePlusIcon name="construct-outline" size={22} color={colors.info.base} />
                </View>
                <View style={styles.moduleInfo}>
                  <AppText variant="body" weight="700">
                    Inventario V2
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    Preview de Productos y Compras
                  </AppText>
                </View>
                <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.tertiary} />
              </View>
            </InteractivePressable>
          </AppCard>
        </View>
      ) : null}

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
  devSection: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  devHeader: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
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
