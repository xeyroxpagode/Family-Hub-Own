import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppText,
  ActionSheet,
  InteractivePressable,
} from '../ui';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  FinanceDetailHeader,
  FinanceDetailMetaRow,
  FinanceDetailSection,
  FinanceFormFooter,
  FinanceIconBox,
  FINANCE_ACTION_ICON_SIZE,
} from './ui';
import { HomePlusIcon } from '../../constants/icons';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceSpendingLimitProgressDto } from '../../services/finance/financeSpendingLimits';

type SpendingLimitDetailSheetProps = {
  visible: boolean;
  limit: FinanceSpendingLimitProgressDto | null;
  currency: string;
  onRequestClose: () => void;
  onEdit: (limit: FinanceSpendingLimitProgressDto) => void;
  onCancel: (limit: FinanceSpendingLimitProgressDto, scope: 'ONE_OFF' | 'THIS_PERIOD' | 'THIS_AND_FOLLOWING') => Promise<void>;
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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatPeriodHuman(periodType: string, period: string): string {
  if (periodType === 'MONTHLY') {
    const [year, month] = period.split('-').map(Number);
    if (year && month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return period;
  }
  return period;
}

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
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const [cancelMode, setCancelMode] = useState(false);
  if (!visible || !limit) return null;
  const styles = createStyles(theme);

  const isOver = limit.status === 'OVER';
  const isAt = limit.status === 'AT';
  const statusTone = STATUS_TONES[limit.status];
  const isGeneral = limit.scopeType !== 'CATEGORY';

  return (
    <ActionSheet
      visible={true}
      title={cancelMode ? 'Cancelar límite' : limit.categoryLabelSnapshot ?? 'General'}
      onRequestClose={() => {
        if (cancelMode) {
          setCancelMode(false);
          return;
        }
        onRequestClose();
      }}
      size="content"
    >
      <View style={styles.content}>
        {cancelMode ? (
          <>
            <AppText variant="body" tone="secondary">
              {limit.recurrenceType === 'ONE_OFF'
                ? `Este límite dejará de aplicarse en ${formatPeriodHuman(limit.periodType, limit.period).toLocaleLowerCase('es-AR')}. Tus movimientos existentes no cambian.`
                : 'Preservaremos el historial. Elegí desde cuándo deja de aplicarse.'}
            </AppText>
            {limit.recurrenceType === 'ONE_OFF' ? (
              <FinanceFormFooter
                primaryTitle="Cancelar límite"
                destructive
                onPrimary={() => onCancel(limit, 'ONE_OFF')}
                loading={isCancelling}
                onCancel={() => setCancelMode(false)}
                cancelLabel="Volver"
                divided={false}
              />
            ) : (
              <View style={styles.choiceList}>
                <InteractivePressable
                  onPress={() => onCancel(limit, 'THIS_PERIOD')}
                  disabled={isCancelling}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={styles.choiceRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Solo ${formatPeriodHuman(limit.periodType, limit.period)}`}
                >
                  <AppText variant="body" weight="800">
                    Solo {formatPeriodHuman(limit.periodType, limit.period).toLocaleLowerCase('es-AR')}
                  </AppText>
                </InteractivePressable>
                <InteractivePressable
                  onPress={() => onCancel(limit, 'THIS_AND_FOLLOWING')}
                  disabled={isCancelling}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={styles.choiceRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatPeriodHuman(limit.periodType, limit.period)} y los próximos`}
                >
                  <AppText variant="body" weight="800">
                    {formatPeriodHuman(limit.periodType, limit.period)} y los próximos
                  </AppText>
                </InteractivePressable>
              </View>
            )}
            {cancelError ? (
              <AppText variant="caption" tone="danger" style={styles.cancelErrorText}>
                {cancelError}
              </AppText>
            ) : null}
          </>
        ) : (
          <>
        <FinanceDetailHeader
          title={limit.categoryLabelSnapshot ?? 'General'}
          subtitle={`Límite · ${limit.currency}`}
          amount={formatFinanceAmount(limit.amount, currency)}
          amountTone={statusTone}
          supporting={STATUS_LABELS[limit.status]}
          icon={
            <FinanceIconBox>
              <HomePlusIcon
                name={isGeneral ? 'wallet-outline' : 'pricetag-outline'}
                size={FINANCE_ACTION_ICON_SIZE}
                color={isOver ? colors.danger.strong : isAt ? colors.warning.strong : colors.terracotta[600]}
              />
            </FinanceIconBox>
          }
        />

        <View style={styles.progressSection}>
          {!isOver ? (
            <>
              <View style={styles.progressRow}>
                <View style={styles.progressLabel}>
                  <AppText variant="caption" tone="secondary" weight="700">Gastaste</AppText>
                  <AppText variant="title3" weight="800">{formatFinanceAmount(limit.spent, currency)}</AppText>
                </View>
                <View style={styles.progressLabel}>
                  <AppText variant="caption" tone="secondary" weight="700">de</AppText>
                  <AppText variant="title3" weight="800">{formatFinanceAmount(limit.amount, currency)}</AppText>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(Number(limit.percentUsed), 100)}%`, backgroundColor: isAt ? colors.warning.strong : colors.terracotta[600] },
                  ]}
                />
              </View>

              <View style={styles.remainingRow}>
                <AppText variant="body" weight="700" tone={isAt ? 'warning' : 'success'}>
                  Te quedan {formatFinanceAmount(limit.remaining, currency, { sign: 'none' })}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.progressRow}>
                <View style={styles.progressLabel}>
                  <AppText variant="caption" tone="secondary" weight="700">Gastaste</AppText>
                  <AppText variant="title3" weight="800" tone="danger">{formatFinanceAmount(limit.spent, currency)}</AppText>
                </View>
                <View style={styles.progressLabel}>
                  <AppText variant="caption" tone="secondary" weight="700">Límite</AppText>
                  <AppText variant="title3" weight="800">{formatFinanceAmount(limit.amount, currency)}</AppText>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: '100%', backgroundColor: colors.danger.strong },
                  ]}
                />
              </View>

              <View style={styles.remainingRow}>
                <AppText variant="body" weight="700" tone="danger">
                  Superaste el límite por {formatFinanceAmount(limit.overBy, currency, { sign: 'none' })}
                </AppText>
              </View>
            </>
          )}
        </View>

        {/* P27: gastado/restante viven en el progreso; Alcance/Categoría no se
            restauran porque la identidad del header ya lo dice. */}
        <FinanceDetailSection title="Detalle">
          <FinanceDetailMetaRow label="Período" value={formatPeriodHuman(limit.periodType, limit.period)} />
          <FinanceDetailMetaRow
            label="Se repite"
            value={
              limit.recurrenceType === 'RECURRING'
                ? limit.periodType === 'MONTHLY' ? 'Mensualmente' : 'Anualmente'
                : 'No'
            }
          />
        </FinanceDetailSection>

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
            onPress={() => setCancelMode(true)}
            disabled={isCancelling}
            style={styles.dangerButton}
          />
        </View>

        {cancelError && (
          <AppText variant="caption" tone="danger" style={styles.cancelErrorText}>
            {cancelError}
          </AppText>
        )}
          </>
        )}
      </View>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;
  return StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  progressSection: {
    gap: spacing[2],
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[3],
  },
  progressLabel: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing[1],
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingRow: {
    paddingTop: spacing[1],
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  choiceList: {
    gap: spacing[1],
  },
  choiceRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
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
}
