import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  ActionSheet,
} from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  archiveFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  FinanceDetailMetaRow,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceSemanticSurface,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

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
  const { colors } = useAppTheme();
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

  const isBalanceNegative = pool.balance.startsWith('-');
  const isBalanceZero = pool.balance === '0';

  return (
    <ActionSheet
      visible={true}
      title={`Archivar ${pool.name}`}
      onRequestClose={onRequestClose}
      size={FINANCE_SHEET_SIZE_POLICY.CONFIRMATION}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <FinanceSemanticSurface tone="warning">
          <View style={{ alignItems: 'center', gap: financeSpacing.titleContentGap }}>
            <HomePlusIcon name="alert-circle-outline" size={28} color={colors.warning.strong} />
            <AppText variant="body" weight="700" align="center" numberOfLines={2}>
              ¿Archivar &quot;{pool.name}&quot;?
            </AppText>
            <AppText variant="caption" tone="secondary" align="center">
              El historial del pozo se conserva. No se eliminan gastos ni movimientos.
            </AppText>
          </View>
        </FinanceSemanticSurface>

        <View style={{ gap: financeSpacing.contentActionGap }}>
          <FinanceDetailMetaRow
            label="Saldo actual"
            value={formatFinanceAmount(pool.balance, currency, { sign: 'net' })}
            valueTone={isBalanceNegative ? 'danger' : isBalanceZero ? 'primary' : 'success'}
          />
          {!isBalanceZero && !isBalanceNegative && (
            <AppText variant="caption" tone="warning" weight="700" align="center">
              El pozo tiene saldo positivo. Debés liberarlo o moverlo antes de archivar.
            </AppText>
          )}
          {isBalanceNegative && (
            <AppText variant="caption" tone="danger" weight="700" align="center">
              El pozo tiene saldo negativo. Debés agregarle dinero antes de archivar.
            </AppText>
          )}
        </View>

        {error && (
          <FinanceErrorState level="form" message={error} />
        )}

        <FinanceFormFooter
          onCancel={onRequestClose}
          primaryTitle="Archivar"
          onPrimary={handleSubmit}
          loading={submitting}
          destructive
        />
      </View>
    </ActionSheet>
  );
}
