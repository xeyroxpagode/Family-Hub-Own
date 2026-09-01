import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  ActionSheet,
  InteractivePressable,
} from '../ui';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import type { FinanceSpendingLimitProgressDto } from '../../services/finance/financeSpendingLimits';

type SpendingLimitDetailSheetProps = {
  visible: boolean;
  limit: FinanceSpendingLimitProgressDto | null;
  currency: string;
  onRequestClose: () => void;
  onEdit: (limit: FinanceSpendingLimitProgressDto) => void;
  onCancel: (limit: FinanceSpendingLimitProgressDto) => Promise<void>;
  cancelError?: string | null;
  isCancelling?: boolean;
};

const STATUS_LABELS: Record<'UNDER' | 'AT' | 'OVER', string> = {
  UNDER: 'Dentro del límite',
  AT: 'En el límite',
  OVER: 'Superado',
};

const STATUS_TONES: Record<'UNDER' | 'AT' | 'OVER', 'success' | 'warning' | 'danger'> = {
  UNDER: 'success',
  AT: 'warning',
  OVER: 'danger',
};

const SCOPE_LABELS = {
  OVERALL: 'General',
  CATEGORY: 'Categoría',
};

const PERIOD_LABELS = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

const RECURRENCE_LABELS = {
  ONE_OFF: 'Una vez',
  RECURRING: 'Recurrente',
};

export function SpendingLimitDetailSheet({
  visible,
  limit,
  currency,
  onRequestClose,
  onEdit,
  onCancel,
  cancelError,
  isCancelling,
}: SpendingLimitDetailSheetProps) {
  if (!visible || !limit) return null;

  const isOver = limit.status === 'OVER';
  const isAt = limit.status === 'AT';
  const statusTone = STATUS_TONES[limit.status];

  return (
    <ActionSheet
      visible={true}
      title="Detalle del límite"
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <AppCard variant="quiet" padding="default" style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <AppText variant="title3" weight="800">{limit.categoryLabelSnapshot ?? 'General'}</AppText>
            <View style={styles.statusBadge}>
              <AppText variant="caption" weight="800" tone={statusTone}>
                {STATUS_LABELS[limit.status]}
              </AppText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary" weight="700">Alcance</AppText>
            <AppText variant="body">{SCOPE_LABELS[limit.scopeType]}</AppText>
          </View>

          {limit.scopeType === 'CATEGORY' && limit.categoryId && (
            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">Categoría</AppText>
              <AppText variant="body">{limit.categoryLabelSnapshot}</AppText>
            </View>
          )}

          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary" weight="700">Período</AppText>
            <AppText variant="body">{PERIOD_LABELS[limit.periodType]} ({limit.period})</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary" weight="700">Repetición</AppText>
            <AppText variant="body">{RECURRENCE_LABELS[limit.recurrenceType]}</AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={styles.progressLabel}>
                <AppText variant="caption" tone="secondary" weight="700">Gastado</AppText>
                <AppText variant="title3" weight="800" tone={isOver ? 'danger' : isAt ? 'warning' : 'primary'}>
                  {formatFinanceAmount(limit.spent, currency)}
                </AppText>
              </View>
              <View style={styles.progressLabel}>
                <AppText variant="caption" tone="secondary" weight="700">Límite</AppText>
                <AppText variant="title3" weight="800">{formatFinanceAmount(limit.amount, currency)}</AppText>
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressLabel}>
                <AppText variant="caption" tone="secondary" weight="700">
                  {isOver ? 'Excedido por' : 'Disponible'}
                </AppText>
                <AppText
                  variant="title3"
                  weight="800"
                  tone={isOver ? 'danger' : isAt ? 'warning' : 'success'}
                >
                  {formatFinanceAmount(isOver ? limit.overBy : limit.remaining, currency, { sign: 'none' })}
                </AppText>
              </View>
              <View style={styles.progressLabel}>
                <AppText variant="caption" tone="secondary" weight="700">Uso</AppText>
                <AppText
                  variant="title3"
                  weight="800"
                  tone={isOver ? 'danger' : isAt ? 'warning' : 'secondary'}
                >
                  {Number(limit.percentUsed).toFixed(0)}%
                </AppText>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(Number(limit.percentUsed), 100)}%`, backgroundColor: isOver ? colors.danger.strong : isAt ? colors.warning.strong : colors.terracotta[600] },
                ]}
              />
            </View>

            {isOver && limit.overBy !== '0' && !isZeroDecimalString(limit.overBy) && (
              <AppText variant="body" tone="danger" weight="700" style={styles.overText}>
                Superaste el límite por {formatFinanceAmount(limit.overBy, currency, { sign: 'none' })}
              </AppText>
            )}
          </View>
        </AppCard>

        <View style={styles.buttonGroup}>
          <AppButton
            title="Editar límite"
            variant="secondary"
            onPress={() => onEdit(limit)}
            style={styles.actionButton}
          />
          <AppButton
            title="Cancelar límite"
            variant="danger"
            onPress={() => onCancel(limit)}
            disabled={isCancelling}
            style={styles.dangerButton}
          >
            {isCancelling && <HomePlusIcon name="refresh" size={20} color={colors.text.inverse} />}
          </AppButton>
        </View>

        {cancelError && (
          <AppText variant="caption" tone="danger" style={styles.cancelErrorText}>
            {cancelError}
          </AppText>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  detailCard: {
    gap: spacing[3],
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    minHeight: 24,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
  },
  progressSection: {
    gap: spacing[2],
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  progressLabel: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
    marginTop: spacing[1],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  overText: {
    marginTop: spacing[1],
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionButton: {
    flex: 1,
  },
  dangerButton: {
    flex: 1,
  },
  cancelErrorText: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
});