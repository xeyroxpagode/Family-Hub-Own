import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from './AppText';
import { AppAvatar } from './AppAvatar';
import { HomePlusIcon } from '../../constants/icons';
import { StatusBadge } from './StatusBadge';

export type AppTopBarProps = {
  personName: string;
  personAvatarUrl?: string | null;
  householdName: string;
  householdRole: string;
  onAvatarPress?: () => void;
  onHouseholdPress?: () => void;
  showChevron?: boolean;
  rightSlot?: React.ReactNode;
};

function getRoleDisplay(role: string): { label: string } {
  const roleLower = role.toLowerCase();
  const mapping: Record<string, { label: string }> = {
    coordinator: { label: 'Coordinador' },
    coordinador: { label: 'Coordinador' },
    adult: { label: 'Adulto' },
    adulto: { label: 'Adulto' },
    adolescent: { label: 'Adolescente' },
    adolescente: { label: 'Adolescente' },
    senior: { label: 'Adulto mayor' },
    adulto_mayor: { label: 'Adulto mayor' },
    child: { label: 'Niño' },
    guest: { label: 'Invitado' },
  };
  return mapping[roleLower] ?? { label: role };
}

export function AppTopBar({
  personName,
  personAvatarUrl,
  householdName,
  householdRole,
  onAvatarPress,
  onHouseholdPress,
  showChevron = true,
  rightSlot,
}: AppTopBarProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const roleInfo = getRoleDisplay(householdRole);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.leftSection}>
        <AppAvatar
          imageUrl={personAvatarUrl}
          name={personName}
          size="md"
          showBorder
          onPress={onAvatarPress}
          accessibilityLabel={`Abrir perfil de ${personName}`}
        />
      </View>

      <Pressable
        onPress={onHouseholdPress}
        style={({ pressed }) => [
          styles.centerSection,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Cambiar hogar: ${householdName}`}
      >
        <View style={styles.householdInfo}>
          <View style={styles.householdRow}>
            <AppText variant="bodySmall" weight="700" style={styles.householdName}>
              {householdName}
            </AppText>
            {showChevron && (
              <HomePlusIcon name="chevron-down-outline" size={16} color={colors.text.tertiary} style={styles.chevron} />
            )}
          </View>
          <StatusBadge label={roleInfo.label} tone="brand" icon="ribbon-outline" />
        </View>
      </Pressable>

      <View style={styles.rightSection}>
        {rightSlot ? (
          <View style={styles.rightSlot}>{rightSlot}</View>
        ) : (
          <View style={styles.rightPlaceholder} />
        )}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  householdInfo: {
    alignItems: 'center',
    gap: spacing[1],
  },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  householdName: {
    color: colors.text.primary,
  },
  chevron: {
    opacity: 0.7,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rightPlaceholder: {
    width: 44,
  },
  });
}
