import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import type {
  PlannerReliabilityConflictContent,
  PlannerReliabilityVisualSummary,
} from '../../services/planner/reliability/frontendExperience';
import type {
  PlannerVisualActionKind,
  PlannerVisualStateDescriptor,
} from '../../services/planner/plannerVisualStates';

export type PlannerReliabilityActionHandlers = {
  readonly onRetry?: () => void;
  readonly onReview?: () => void;
  readonly onDismiss?: () => void;
  readonly onRefetch?: () => void;
  readonly onClose?: () => void;
};

export type PlannerReliabilityStatusProps = {
  readonly descriptor: PlannerVisualStateDescriptor;
  readonly label?: string;
  readonly compact?: boolean;
  readonly style?: StyleProp<ViewStyle>;
} & PlannerReliabilityActionHandlers;

const iconByDescriptor: Record<PlannerVisualStateDescriptor['icon'], HomePlusIconName> = {
  check: 'checkmark-circle',
  clock: 'time',
  cloud: 'cloud',
  cloud_off: 'cloud-offline',
  sync: 'sync',
  warning: 'alert-circle',
  info: 'information-circle',
  lock: 'lock-closed',
  review: 'document-text',
};

const toneByEmphasis: Record<PlannerVisualStateDescriptor['emphasis'], { bg: string; border: string; fg: string }> = {
  quiet: { bg: colors.surface.soft, border: colors.border.subtle, fg: colors.text.tertiary },
  subtle: { bg: colors.info.soft, border: colors.border.default, fg: colors.info.text },
  notice: { bg: colors.warning.soft, border: colors.warning.base, fg: colors.warning.strong },
  strong: { bg: colors.danger.soft, border: colors.danger.base, fg: colors.danger.text },
};

export function PlannerReliabilityCompactIndicator({
  descriptor,
  label,
  style,
}: PlannerReliabilityStatusProps) {
  const tone = toneByEmphasis[descriptor.emphasis];
  return (
    <View
      accessibilityRole={descriptor.role === 'alert' ? 'alert' : 'text'}
      accessibilityLiveRegion={descriptor.liveRegion === 'none' ? 'none' : descriptor.liveRegion}
      accessibilityLabel={descriptor.accessibilityLabel}
      style={[
        {
          minHeight: 32,
          minWidth: 32,
          paddingHorizontal: label ? spacing[2] : 0,
          borderRadius: radius.xs,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing[1],
        },
        style,
      ]}
    >
      <HomePlusIcon name={iconByDescriptor[descriptor.icon]} size={16} color={tone.fg} />
      {label ? (
        <AppText variant="caption" tone="secondary" weight="700" numberOfLines={2}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function PlannerReliabilityInlineFormState(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="inline" />;
}

export function PlannerReliabilityContextBanner(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="banner" />;
}

export function PlannerReliabilityUncertainResultCard(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="card" forceAction="review" />;
}

export function PlannerReliabilityRetryingState(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="inline" forceAction="review" />;
}

export function PlannerReliabilityOfflinePendingState(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="inline" forceAction="retry" />;
}

export function PlannerReliabilityTransientConfirmation(props: PlannerReliabilityStatusProps) {
  return <ReliabilityBox {...props} variant="inline" forceAction="dismiss" />;
}

export function PlannerReliabilityOperationSummary({
  summary,
  handlers,
  style,
}: {
  readonly summary: PlannerReliabilityVisualSummary;
  readonly handlers?: PlannerReliabilityActionHandlers;
  readonly style?: StyleProp<ViewStyle>;
}) {
  return (
    <PlannerReliabilityInlineFormState
      descriptor={summary.descriptor}
      label={summary.safeOperationSummary}
      style={style}
      {...handlers}
    />
  );
}

export function PlannerReliabilityConflictCard({
  content,
  onReview,
  onRetry,
  onDismiss,
  style,
}: {
  readonly content: PlannerReliabilityConflictContent;
  readonly onReview?: () => void;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
  readonly style?: StyleProp<ViewStyle>;
}) {
  const descriptor: PlannerVisualStateDescriptor = {
    ...contentDescriptor,
    message: content.safeMessage,
  };
  return (
    <ReliabilityBox
      descriptor={descriptor}
      label={content.entityLabel}
      variant="card"
      style={style}
      onReview={onReview}
      onRetry={content.retryIntent ? onRetry : undefined}
      onDismiss={content.discardIntent ? onDismiss : undefined}
    >
      <View style={{ gap: spacing[1] }}>
        <AppText variant="caption" tone="secondary">{content.localVersionLabel}</AppText>
        <AppText variant="caption" tone="secondary">{content.remoteVersionLabel}</AppText>
        {content.refetchPending ? (
          <AppText variant="caption" tone="warning">Actualización pendiente.</AppText>
        ) : null}
      </View>
    </ReliabilityBox>
  );
}

function ReliabilityBox({
  descriptor,
  label,
  compact,
  style,
  children,
  forceAction,
  onRetry,
  onReview,
  onDismiss,
  onRefetch,
  onClose,
  variant,
}: PlannerReliabilityStatusProps & {
  readonly children?: React.ReactNode;
  readonly forceAction?: PlannerVisualActionKind;
  readonly variant: 'inline' | 'banner' | 'card';
}) {
  const tone = toneByEmphasis[descriptor.emphasis];
  const primary = forceAction ?? descriptor.primaryAction;
  const secondary = forceAction ? descriptor.secondaryAction : descriptor.secondaryAction;
  const content = (
    <>
      <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' }}>
        <View
          style={{
            minWidth: 28,
            minHeight: 28,
            borderRadius: radius.xs,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.card,
          }}
        >
          <HomePlusIcon name={iconByDescriptor[descriptor.icon]} size={16} color={tone.fg} />
        </View>
        <View style={{ flex: 1, gap: spacing[1] }}>
          <AppText variant="caption" tone="primary" weight="700" numberOfLines={compact ? 2 : undefined}>
            {label ?? descriptor.title}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={compact ? 2 : undefined}>
            {descriptor.message}
          </AppText>
          {children}
        </View>
      </View>
      <ActionRow
        primary={primary}
        secondary={secondary}
        handlers={{ onRetry, onReview, onDismiss, onRefetch, onClose }}
      />
    </>
  );

  return (
    <View
      accessibilityRole={descriptor.role === 'alert' ? 'alert' : 'text'}
      accessibilityLiveRegion={descriptor.liveRegion === 'none' ? 'none' : descriptor.liveRegion}
      accessibilityLabel={descriptor.accessibilityLabel}
      style={[
        {
          borderRadius: radius.xs,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          padding: variant === 'inline' ? spacing[2] : spacing[3],
          gap: spacing[2],
        },
        variant === 'banner' ? { marginHorizontal: spacing[4] } : null,
        style,
      ]}
    >
      {content}
    </View>
  );
}

function ActionRow({
  primary,
  secondary,
  handlers,
}: {
  readonly primary: PlannerVisualActionKind;
  readonly secondary: PlannerVisualActionKind;
  readonly handlers: PlannerReliabilityActionHandlers;
}) {
  const primaryButton = buttonForAction(primary, handlers, 'primary');
  const secondaryButton = buttonForAction(secondary, handlers, 'secondary');
  if (!primaryButton && !secondaryButton) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'flex-end' }}>
      {secondaryButton}
      {primaryButton}
    </View>
  );
}

function buttonForAction(
  action: PlannerVisualActionKind,
  handlers: PlannerReliabilityActionHandlers,
  priority: 'primary' | 'secondary',
) {
  const config = resolveAction(action, handlers);
  if (!config) return null;
  return (
    <AppButton
      key={`${priority}:${action}`}
      title={config.label}
      variant={priority === 'primary' ? 'secondary' : 'ghost'}
      size="sm"
      onPress={config.onPress}
      accessibilityLabel={config.label}
    />
  );
}

function resolveAction(action: PlannerVisualActionKind, handlers: PlannerReliabilityActionHandlers) {
  switch (action) {
    case 'retry':
      return handlers.onRetry ? { label: 'Reintentar', onPress: handlers.onRetry } : null;
    case 'review':
      return handlers.onReview ? { label: 'Revisar', onPress: handlers.onReview } : null;
    case 'dismiss':
      return handlers.onDismiss ? { label: 'Ocultar', onPress: handlers.onDismiss } : null;
    case 'refetch':
      return handlers.onRefetch ? { label: 'Actualizar', onPress: handlers.onRefetch } : null;
    case 'close':
      return handlers.onClose ? { label: 'Cerrar', onPress: handlers.onClose } : null;
    default:
      return null;
  }
}

const contentDescriptor: PlannerVisualStateDescriptor = {
  kind: 'conflicted',
  role: 'alert',
  title: 'Revisión necesaria',
  message: 'Revisá los cambios antes de continuar.',
  emphasis: 'strong',
  attention: 'high',
  icon: 'warning',
  primaryAction: 'review',
  secondaryAction: 'retry',
  accessibilityLabel: 'Revisión necesaria. Revisá los cambios antes de continuar.',
  reduceMotion: 'fade_only',
  disappearsWhen: 'manual_review',
  preservesContent: true,
  liveRegion: 'assertive',
  blocksInteraction: true,
  blocksNewActions: true,
  canRetry: true,
};
