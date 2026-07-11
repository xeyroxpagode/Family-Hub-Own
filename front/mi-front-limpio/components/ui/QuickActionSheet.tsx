import React, { useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, shadows } from '../../constants/theme';

export type QuickActionSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  onNavigate: (screen: 'CreateTask' | 'CreateEvent' | 'CreateGoal', params?: any) => void;
};

export function QuickActionSheet({ visible, onRequestClose, onNavigate }: QuickActionSheetProps) {
  const insets = useSafeAreaInsets();

  const openCreateTask = useCallback(() => {
    if (__DEV__) console.log('[QuickActions] pressed: Crear tarea');
    onNavigate('CreateTask');
  }, [onNavigate]);

  const openCreateEvent = useCallback(() => {
    if (__DEV__) console.log('[QuickActions] pressed: Crear evento');
    onNavigate('CreateEvent');
  }, [onNavigate]);

  const openCreateGoal = useCallback(() => {
    if (__DEV__) console.log('[QuickActions] pressed: Crear meta');
    onNavigate('CreateGoal');
  }, [onNavigate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerContent}>
              <AppText variant="title3" weight="800">
                Crear
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                Acciones rápidas para tu hogar
              </AppText>
            </View>
            <AppButton
              variant="ghost"
              size="sm"
              onPress={onRequestClose}
              title="Cerrar"
            />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing[4] }]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={openCreateTask}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.86 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Crear tarea"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.terracotta[50] }]}>
                <HomePlusIcon name="checkbox-outline" size={22} color={colors.terracotta[600]} />
              </View>
              <View style={styles.actionInfo}>
                <AppText variant="body" weight="700">
                  Nueva tarea
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Asigná una tarea al hogar
                </AppText>
              </View>
              <HomePlusIcon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              onPress={openCreateEvent}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.86 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Crear evento"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.sage[50] }]}>
                <HomePlusIcon name="calendar-outline" size={22} color={colors.sage[600]} />
              </View>
              <View style={styles.actionInfo}>
                <AppText variant="body" weight="700">
                  Nuevo evento
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Agendá algo en el calendario
                </AppText>
              </View>
              <HomePlusIcon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              onPress={openCreateGoal}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.86 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Crear meta"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.info.soft }]}>
                <HomePlusIcon name="flag" size={22} color={colors.info.text} />
              </View>
              <View style={styles.actionInfo}>
                <AppText variant="body" weight="700">
                  Nueva meta
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Creá una meta para tu hogar
                </AppText>
              </View>
              <HomePlusIcon name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 32, 26, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    height: '70%',
    ...shadows.sheet,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: spacing[3],
  },
  headerContent: {
    flex: 1,
    gap: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    gap: spacing[2],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing[3],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
    gap: spacing[1],
  },
});