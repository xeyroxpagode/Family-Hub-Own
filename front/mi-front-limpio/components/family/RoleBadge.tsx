import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import type { Role } from '../../services/family';
import { AppText } from '../ui';

export type RoleBadgeRole = Role | 'pending';
export type RoleBadgeSize = 'compact' | 'regular';

type RoleMeta = {
  label: string;
  description: string;
  capability: string;
  icon: HomePlusIconName;
};

export const ROLE_UI: Record<RoleBadgeRole, RoleMeta> = {
  coordinator: {
    label: 'Coordinador',
    description: 'Administra el hogar',
    capability: 'Invita, aprueba y cambia roles',
    icon: 'shield-checkmark',
  },
  adult: {
    label: 'Adulto',
    description: 'Participa en la organización',
    capability: 'Crea tareas, eventos y colabora',
    icon: 'person-circle',
  },
  adolescent: {
    label: 'Adolescente',
    description: 'Participa con límites',
    capability: 'Ve y completa tareas propias',
    icon: 'person-outline',
  },
  child: {
    label: 'Niño',
    description: 'Acceso supervisado',
    capability: 'Acciones definidas por adultos',
    icon: 'happy-outline',
  },
  senior: {
    label: 'Adulto mayor',
    description: 'Miembro familiar',
    capability: 'Acceso simple al hogar',
    icon: 'person',
  },
  guest: {
    label: 'Invitado',
    description: 'Acceso limitado',
    capability: 'Solo lo permitido',
    icon: 'person-add',
  },
  pending: {
    label: 'Esperando aprobación',
    description: 'Todavía no forma parte del hogar',
    capability: 'Sin acceso hasta aprobación',
    icon: 'time-outline',
  },
};

const FALLBACK_ROLE: RoleBadgeRole = 'guest';

export const getRoleLabel = (role?: string | null) =>
  ROLE_UI[(role as RoleBadgeRole) in ROLE_UI ? (role as RoleBadgeRole) : FALLBACK_ROLE].label;

export const getRoleDescription = (role?: string | null) =>
  ROLE_UI[(role as RoleBadgeRole) in ROLE_UI ? (role as RoleBadgeRole) : FALLBACK_ROLE].description;

export const getRoleCapability = (role?: string | null) =>
  ROLE_UI[(role as RoleBadgeRole) in ROLE_UI ? (role as RoleBadgeRole) : FALLBACK_ROLE].capability;

export const getRoleIcon = (role?: string | null) =>
  ROLE_UI[(role as RoleBadgeRole) in ROLE_UI ? (role as RoleBadgeRole) : FALLBACK_ROLE].icon;

type RoleBadgeProps = {
  role?: string | null;
  size?: RoleBadgeSize;
  style?: StyleProp<ViewStyle>;
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'compact', style }) => {
  const isRegular = size === 'regular';

  return (
    <View style={[styles.badge, isRegular && styles.regularBadge, style]}>
      <HomePlusIcon
        name={getRoleIcon(role)}
        size={isRegular ? 16 : 13}
        color={colors.terracotta[700]}
      />
      <AppText variant={isRegular ? 'caption' : 'micro'} weight="700" tone="primary" numberOfLines={1}>
        {getRoleLabel(role)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.terracotta[100],
    backgroundColor: colors.terracotta[50],
  },
  regularBadge: {
    minHeight: 34,
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
});
