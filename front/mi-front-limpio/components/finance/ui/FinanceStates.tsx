import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../../context/AppThemeContext';
import { AppText } from '../../ui/AppText';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { financeSpacing } from './financeTokens';

export type FinanceEmptyLevel = 'inline' | 'section' | 'domain';

export type FinanceEmptyStateProps = {
  level: FinanceEmptyLevel;
  description: string;
  title?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — empty-state grammar, exactly three levels.
 *
 * INLINE: one quiet line (e.g. "Todavía no hay ingresos para este período").
 * SECTION: icon 40 + title + copy + text action (e.g. spending limits block
 * with "Administrar >"). DOMAIN: full-surface empty only when the whole
 * domain surface is genuinely empty (reuses global EmptyState). No giant
 * empty cards for small absences.
 */
export function FinanceEmptyState({ level, description, title, icon, actionLabel, onAction, style, testID }: FinanceEmptyStateProps) {
  const { colors, radius } = useAppTheme();

  if (level === 'domain') {
    return (
      <EmptyState
        title={title ?? 'Nada por aquí todavía'}
        description={description}
        illustration={icon}
        actionLabel={actionLabel}
        onAction={onAction}
        style={style}
      />
    );
  }

  if (level === 'inline') {
    return (
      <View style={[{ paddingVertical: financeSpacing.titleContentGap }, style]} testID={testID}>
        <AppText variant="caption" tone="secondary" align="center">
          {description}
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: financeSpacing.sectionGap,
          paddingHorizontal: financeSpacing.surfaceInset,
          gap: financeSpacing.titleContentGap,
        },
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.surface.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      ) : null}
      {title ? (
        <AppText variant="bodySmall" weight="700" align="center">
          {title}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="secondary" align="center" style={{ maxWidth: 280 }}>
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <AppText variant="bodySmall" tone="brand" weight="600" onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          {actionLabel} {'>'}
        </AppText>
      ) : null}
    </View>
  );
}

export type FinanceErrorLevel = 'inline' | 'form' | 'refresh' | 'full';

export type FinanceErrorStateProps = {
  level: FinanceErrorLevel;
  message: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — error grammar, four presentation levels.
 *
 * INLINE_FIELD_ERROR: quiet danger caption under the field (see
 * FinanceFieldError). FORM/MUTATION_ERROR: soft danger surface via global
 * ErrorState. NON_DESTRUCTIVE_REFRESH_ERROR: must NOT imply the screen has
 * no data — copy states that last-known data is shown. FULL_LOAD_ERROR:
 * global ErrorState when nothing truthful can render.
 */
export function FinanceErrorState({ level, message, detail, onRetry, retryLabel = 'Intentar de nuevo', style, testID }: FinanceErrorStateProps) {
  if (level === 'inline') {
    return (
      <AppText variant="caption" tone="danger" accessibilityRole="alert" style={style} testID={testID}>
        {message}
      </AppText>
    );
  }

  if (level === 'refresh') {
    return (
      <ErrorState
        title="No pudimos actualizar la información"
        description={`${message} Mostramos los últimos datos disponibles.`}
        retryLabel={retryLabel}
        onRetry={onRetry}
        detail={detail}
        style={style}
      />
    );
  }

  return (
    <ErrorState
      title={level === 'full' ? 'No pudimos cargar esta información' : message}
      description={level === 'full' ? message : (detail ?? 'Revisa tu conexión o intenta de nuevo.')}
      retryLabel={retryLabel}
      onRetry={onRetry}
      detail={level === 'full' ? detail : undefined}
      style={style}
    />
  );
}

export function FinanceFieldError({ message, testID }: { message: string; testID?: string }) {
  return (
    <AppText variant="caption" tone="danger" accessibilityRole="alert" testID={testID}>
      {message}
    </AppText>
  );
}
