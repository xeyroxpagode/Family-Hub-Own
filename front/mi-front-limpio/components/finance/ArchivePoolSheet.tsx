import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppText,
  ActionSheet,
} from '../ui';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  archiveFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type ArchivePoolSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function ArchivePoolSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  onRequestClose,
  onSuccess,
}: ArchivePoolSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!accessToken || !pool || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-archive-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.archive',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: pool.id,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await archiveFinancePool({
        accessToken,
        contextType,
        currency,
        poolId: pool.id,
        mutationId,
        idempotencyKey,
        payloadHash,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_pool_balance_not_zero') {
        setError('Liberá o mové el saldo antes de archivar este pozo.');
      } else if (err?.code === 'finance_pool_has_current_expense_links') {
        setError('Este pozo todavía está asociado a gastos. Cambialos de pozo antes de archivarlo.');
      } else {
        setError(err?.message ?? 'No pudimos archivar el pozo. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !pool) return null;

  return (
    <ActionSheet
      visible={true}
      title={`Archivar ${pool.name}`}
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <View style={styles.warningCard}>
          <HomePlusIcon name="alert-circle-outline" size={28} color={colors.warning.strong} />
          <AppText variant="body" weight="700" style={styles.warningTitle}>
            ¿Archivar &quot;{pool.name}&quot;?
          </AppText>
          <AppText variant="caption" tone="secondary" style={styles.warningText}>
            El historial del pozo se conserva. No se eliminan gastos ni movimientos.
          </AppText>
        </View>

        <View style={styles.balanceInfo}>
          <AppText variant="caption" tone="secondary" weight="700">Saldo actual</AppText>
          <AppText
            variant="title3"
            weight="800"
            tone={pool.balance.startsWith('-') ? 'danger' : pool.balance === '0' ? 'primary' : 'success'}
          >
            {pool.balance} {currency}
          </AppText>
          {pool.balance !== '0' && !pool.balance.startsWith('-') && (
            <AppText variant="caption" tone="warning" weight="700" style={styles.balanceWarning}>
              El pozo tiene saldo positivo. Debés liberarlo o moverlo antes de archivar.
            </AppText>
          )}
          {pool.balance.startsWith('-') && (
            <AppText variant="caption" tone="danger" weight="700" style={styles.balanceWarning}>
              El pozo tiene saldo negativo. Debés agregarle dinero antes de archivar.
            </AppText>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={16} color={colors.danger.strong} />
            <AppText variant="caption" tone="danger" weight="700">{error}</AppText>
          </View>
        )}

        <View style={styles.buttonRow}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onRequestClose}
            disabled={submitting}
            style={styles.cancelButton}
          />
          <AppButton
            title="Archivar"
            variant="danger"
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.archiveButton}
          >
            {submitting && <HomePlusIcon name="refresh" size={20} color={colors.text.inverse} />}
          </AppButton>
        </View>
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
  warningCard: {
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.warning.soft,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  warningTitle: {
    textAlign: 'center',
  },
  warningText: {
    textAlign: 'center',
  },
  balanceInfo: {
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  balanceWarning: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.danger.soft,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
  },
  archiveButton: {
    flex: 1,
  },
});
