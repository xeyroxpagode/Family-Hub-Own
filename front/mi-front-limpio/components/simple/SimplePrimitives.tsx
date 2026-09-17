import React, { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAvatar, AppButton, AppCard, AppText, InteractivePressable, Skeleton } from '../ui';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, radius, spacing, touchTargets } from '../../constants/theme';
import { buildSimpleAccessibilityLabel } from './simpleLayout';

type SimpleHeaderProps = {
  name?: string;
  avatarUrl?: string | null;
  householdName?: string;
  title?: string;
  onMore?: () => void;
  onBackHome?: () => void;
  action?: ReactNode;
};

export function SimpleHeader({
  name,
  avatarUrl,
  householdName,
  title,
  onMore,
  onBackHome,
  action,
}: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const isHomeHeader = Boolean(name);
  const headingRef = useRef<View>(null);
  const focusedOnce = useRef(false);
  const headingLabel = isHomeHeader
    ? `Hola, ${(name ?? 'Usuario').split(' ')[0]}. ${householdName ?? 'Tu hogar'}`
    : title ?? 'Inicio';

  useEffect(() => {
    if (focusedOnce.current) return;
    const node = findNodeHandle(headingRef.current);
    if (!node) return;
    focusedOnce.current = true;
    const timer = setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 120);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top + spacing[3], spacing[6]) }]}>
      {isHomeHeader ? (
        <>
          <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={headingLabel} style={styles.headerIdentity}>
            <View accessible={false} importantForAccessibility="no"><AppAvatar name={name ?? 'Usuario'} imageUrl={avatarUrl} size="md" /></View>
            <View style={styles.headerCopy}>
              <AppText variant="title3" weight="800" numberOfLines={1}>Hola, {(name ?? 'Usuario').split(' ')[0]}</AppText>
              <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>{householdName ?? 'Tu hogar'}</AppText>
            </View>
          </View>
          {onMore ? (
            <InteractivePressable onPress={onMore} style={styles.headerAction} accessibilityLabel="Abrir más funciones" accessibilityRole="button" haptic="light">
              <HomePlusIcon name="grid-outline" size={22} color={colors.text.secondary} />
            </InteractivePressable>
          ) : action}
        </>
      ) : (
        <>
          {onBackHome ? <SimpleBackHome onPress={onBackHome} compact /> : null}
          <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={headingLabel} style={styles.headerTitle}>
            <AppText variant="title3" weight="800">{title}</AppText>
          </View>
          {action ? <View style={styles.headerActionSlot}>{action}</View> : null}
        </>
      )}
    </View>
  );
}

export function SimpleBackHome({ onPress, compact = false }: { onPress: () => void; compact?: boolean }) {
  return (
    <InteractivePressable
      onPress={onPress}
      style={[styles.back, compact && styles.backCompact]}
      accessibilityLabel="Volver a Inicio"
      accessibilityRole="button"
      haptic="light"
    >
      <HomePlusIcon name="chevron-back-outline" size={24} color={colors.terracotta[700]} />
      <AppText variant="body" weight="700" style={styles.backText}>Inicio</AppText>
    </InteractivePressable>
  );
}

/** Backwards-compatible alias while existing Simple screens migrate. */
export const SimpleBackToHome = SimpleBackHome;

export function SimpleSectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <AppText variant="caption" tone="secondary" weight="800" style={styles.sectionLabel}>{title}</AppText>
      {actionLabel && onAction ? (
        <InteractivePressable onPress={onAction} style={styles.sectionAction} accessibilityLabel={actionLabel} accessibilityRole="button">
          <AppText variant="bodySmall" weight="700" style={styles.sectionActionText}>{actionLabel}</AppText>
        </InteractivePressable>
      ) : null}
    </View>
  );
}

const actionTones = {
  neutral: { backgroundColor: '#F4F0EB', color: colors.text.secondary },
  brand: { backgroundColor: '#FFE3DA', color: colors.terracotta[700] },
  sage: { backgroundColor: '#E6F3EC', color: '#2D7A51' },
  lilac: { backgroundColor: '#F2E9F8', color: '#7B3F98' },
} as const;

export function SimpleActionCard({
  title,
  subtitle,
  icon,
  tone = 'neutral',
  badge,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
}: {
  title: string;
  subtitle: string;
  icon: HomePlusIconName;
  tone?: keyof typeof actionTones;
  badge?: string;
  disabled?: boolean;
  /** Lets a parent gracefully degrade a 2-column grid when text is enlarged. */
  fullWidth?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const selectedTone = actionTones[tone];
  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityLabel={buildSimpleAccessibilityLabel(title, subtitle, badge)}
      accessibilityHint={disabled ? 'No disponible' : 'Abrir'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      haptic="light"
      style={[styles.actionCard, fullWidth && styles.actionCardFullWidth, disabled && styles.disabled, style]}
    >
      <View accessible={false} importantForAccessibility="no" style={[styles.actionIcon, { backgroundColor: selectedTone.backgroundColor }]}>
        <HomePlusIcon name={icon} size={27} color={selectedTone.color} />
      </View>
      <View style={styles.actionCopy}>
        <AppText variant="body" weight="800" style={styles.actionTitle}>{title}</AppText>
        <AppText variant="bodySmall" tone="secondary" numberOfLines={2} ellipsizeMode="tail">{subtitle}</AppText>
      </View>
      {badge ? <View accessible={false} style={styles.badge}><AppText variant="caption" weight="800" style={styles.badgeText}>{badge}</AppText></View> : null}
    </InteractivePressable>
  );
}

export function SimpleListRow({
  title,
  subtitle,
  icon,
  badge,
  trailing = 'chevron',
  disabled = false,
  onPress,
  embedded = false,
  style,
}: {
  title: string;
  subtitle?: string;
  icon: HomePlusIconName;
  badge?: string;
  trailing?: 'chevron' | 'none' | ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const label = buildSimpleAccessibilityLabel(title, subtitle, badge);
  const renderedTrailing = trailing === 'chevron'
    ? <HomePlusIcon name="chevron-forward-outline" size={22} color={colors.text.tertiary} />
    : trailing === 'none' ? null : trailing;
  const rowContent = (
    <>
      <View accessible={false} importantForAccessibility="no" style={styles.listIcon}><HomePlusIcon name={icon} size={24} color={colors.text.secondary} /></View>
      <View style={styles.listCopy}>
        <AppText variant="body" weight="800">{title}</AppText>
        {subtitle ? <AppText variant="bodySmall" tone="secondary" numberOfLines={2} ellipsizeMode="tail">{subtitle}</AppText> : null}
      </View>
      {badge ? <View accessible={false} style={styles.badge}><AppText variant="caption" weight="800" style={styles.badgeText}>{badge}</AppText></View> : null}
      <View accessible={false} importantForAccessibility="no">{renderedTrailing}</View>
    </>
  );
  const rowStyle = [styles.listRow, embedded && styles.listRowEmbedded, disabled && styles.disabled, style];

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={rowStyle}>
        {rowContent}
      </View>
    );
  }

  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityLabel={label}
      accessibilityHint={disabled ? 'No disponible' : 'Abrir'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      haptic="light"
      style={rowStyle}
    >
      {rowContent}
    </InteractivePressable>
  );
}

const statusTones = {
  neutral: { backgroundColor: '#FFFFFF', borderColor: '#DED5CB', iconBackground: '#F4F0EB', iconColor: colors.text.secondary },
  primarySoft: { backgroundColor: '#FFE3DA', borderColor: '#F5B5A3', iconBackground: '#FFFFFF', iconColor: colors.terracotta[700] },
  attention: { backgroundColor: '#FFF3D8', borderColor: '#E8BE69', iconBackground: '#FFFFFF', iconColor: '#8A5A00' },
  success: { backgroundColor: '#E6F3EC', borderColor: '#A8D5BB', iconBackground: '#FFFFFF', iconColor: '#2D7A51' },
} as const;

export function SimpleStatusCard({
  title,
  subtitle,
  icon,
  tone = 'neutral',
  trailing = 'chevron',
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  icon: HomePlusIconName;
  tone?: keyof typeof statusTones;
  trailing?: 'chevron' | 'none' | ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const selectedTone = statusTones[tone];
  const label = buildSimpleAccessibilityLabel(title, subtitle);
  const renderedTrailing = trailing === 'chevron'
    ? <HomePlusIcon name="chevron-forward-outline" size={22} color={selectedTone.iconColor} />
    : trailing === 'none' ? null : trailing;
  const content = (
    <>
      <View accessible={false} importantForAccessibility="no" style={[styles.statusIcon, { backgroundColor: selectedTone.iconBackground }]}>
        <HomePlusIcon name={icon} size={27} color={selectedTone.iconColor} />
      </View>
      <View style={styles.listCopy}>
        <AppText variant="bodyLarge" weight="800">{title}</AppText>
        {subtitle ? <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      <View accessible={false} importantForAccessibility="no">{renderedTrailing}</View>
    </>
  );

  return (
    <AppCard style={[styles.statusCard, { backgroundColor: selectedTone.backgroundColor, borderColor: selectedTone.borderColor }, style]} padding="compact">
      {onPress ? (
        <InteractivePressable
          onPress={onPress}
          accessible
          accessibilityLabel={label}
          accessibilityHint="Abrir"
          accessibilityRole="button"
          haptic="light"
          style={styles.statusPressable}
        >
          {content}
        </InteractivePressable>
      ) : <View accessible accessibilityLabel={label} style={styles.statusPressable}>{content}</View>}
    </AppCard>
  );
}

export function SimplePrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: HomePlusIconName;
}) {
  return (
    <AppButton
      title={title}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      size="lg"
      accessibilityLabel={loading ? `${title}. Cargando` : title}
      style={styles.primaryButton}
      leftSlot={icon ? <HomePlusIcon name={icon} size={22} color="#FFFFFF" /> : undefined}
    />
  );
}

export function SimpleEmergencyButton({
  onPress,
  label = 'Ayuda / SOS',
  disabled = false,
  loading = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.emergencyButton, (disabled || loading) && styles.disabled]}
      accessibilityLabel={`${label}. Pedir ayuda rápidamente`}
      accessibilityHint="La confirmación de emergencia se pedirá en el próximo paso cuando esté disponible"
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      haptic="medium"
    >
      <View accessible={false} importantForAccessibility="no" style={styles.emergencyLeading}>
        {loading ? <ActivityIndicator color="#A83E25" /> : <HomePlusIcon name="alert-circle-outline" size={27} color="#A83E25" />}
      </View>
      <View style={styles.listCopy}>
        <AppText variant="body" weight="800" style={styles.emergencyText}>{label}</AppText>
        <AppText variant="bodySmall" tone="secondary">Pedí ayuda de forma rápida</AppText>
      </View>
      <View accessible={false} importantForAccessibility="no"><HomePlusIcon name="chevron-forward-outline" size={22} color="#A83E25" /></View>
    </InteractivePressable>
  );
}

export function SimpleEmptyState({ icon = 'sunny-outline', title, description, actionLabel, onAction }: {
  icon?: HomePlusIconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AppCard padding="default" style={styles.stateCard}>
      <View accessible accessibilityLabel={buildSimpleAccessibilityLabel(title, description)} style={styles.stateCopy}>
        <View accessible={false} importantForAccessibility="no"><HomePlusIcon name={icon} size={34} color={colors.text.tertiary} /></View>
        <AppText variant="bodyLarge" weight="800" align="center">{title}</AppText>
        {description ? <AppText variant="bodySmall" tone="secondary" align="center">{description}</AppText> : null}
      </View>
      {actionLabel && onAction ? <SimplePrimaryButton title={actionLabel} onPress={onAction} /> : null}
    </AppCard>
  );
}

export function SimpleLoadingState({ label = 'Cargando' }: { label?: string }) {
  return (
    <AppCard padding="default" style={styles.stateCard}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} style={styles.stateCopy}>
        <View accessible={false} importantForAccessibility="no"><ActivityIndicator size="large" color="#A83E25" /></View>
        <AppText variant="body" weight="700" align="center">{label}</AppText>
        <View accessible={false} importantForAccessibility="no" style={styles.loadingLines}><Skeleton height={14} /><Skeleton height={14} width="72%" /></View>
      </View>
    </AppCard>
  );
}

export function SimpleErrorState({ title = 'No pudimos cargar esta información', description, retryLabel = 'Reintentar', onRetry }: {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <AppCard padding="default" style={styles.stateCard}>
      <View accessible accessibilityRole="alert" accessibilityLabel={buildSimpleAccessibilityLabel(title, description)} style={styles.stateCopy}>
        <View accessible={false} importantForAccessibility="no"><HomePlusIcon name="alert-circle-outline" size={34} color="#A83E25" /></View>
        <AppText variant="bodyLarge" weight="800" align="center">{title}</AppText>
        {description ? <AppText variant="bodySmall" tone="secondary" align="center">{description}</AppText> : null}
      </View>
      {onRetry ? <SimplePrimaryButton title={retryLabel} onPress={onRetry} /> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: '#DED5CB', backgroundColor: '#FCFBF9' },
  headerIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  headerTitle: { flex: 1, minWidth: 0 },
  headerAction: { width: touchTargets.senior, height: touchTargets.senior, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0EB' },
  headerActionSlot: { minWidth: touchTargets.normal, alignItems: 'flex-end' },
  back: { minHeight: touchTargets.senior, flexDirection: 'row', alignItems: 'center', gap: spacing[1], alignSelf: 'flex-start', paddingRight: spacing[3] },
  backCompact: { minHeight: touchTargets.normal + spacing[1], paddingRight: 0 },
  backText: { color: colors.terracotta[700] },
  sectionTitleRow: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { letterSpacing: 0.7 },
  sectionAction: { minHeight: touchTargets.normal + spacing[1], justifyContent: 'center', paddingHorizontal: spacing[2] },
  sectionActionText: { color: colors.terracotta[700] },
  actionCard: { width: '47.5%', flexGrow: 0, flexShrink: 1, minWidth: 0, minHeight: 152, backgroundColor: '#FFFFFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#DED5CB', padding: spacing[3], gap: spacing[2], justifyContent: 'flex-start' },
  actionCardFullWidth: { width: '100%', minHeight: touchTargets.senior + spacing[12] },
  actionIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  actionTitle: { letterSpacing: -0.15 },
  primaryButton: { backgroundColor: colors.terracotta[700], borderColor: colors.terracotta[700] },
  listRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: '#FFFFFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#DED5CB', padding: spacing[3] },
  listRowEmbedded: { minHeight: touchTargets.senior + 4, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: spacing[1] },
  listIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F0EB' },
  listCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  badge: { maxWidth: '34%', borderRadius: radius.pill, backgroundColor: '#F4F0EB', paddingHorizontal: spacing[2], paddingVertical: 3 },
  badgeText: { color: colors.text.secondary },
  statusCard: { minHeight: 84 },
  statusPressable: { minHeight: touchTargets.senior, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  statusIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  emergencyButton: { minHeight: touchTargets.senior + spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: '#FFE3DA', borderRadius: radius.lg, borderWidth: 1, borderColor: '#F5B5A3', padding: spacing[3] },
  emergencyLeading: { width: 32, alignItems: 'center', justifyContent: 'center' },
  emergencyText: { color: '#A83E25' },
  stateCard: { gap: spacing[3], paddingVertical: spacing[6] },
  stateCopy: { alignItems: 'center', gap: spacing[3] },
  loadingLines: { width: '100%', gap: spacing[2], marginTop: spacing[1] },
  disabled: { opacity: 0.55 },
});
