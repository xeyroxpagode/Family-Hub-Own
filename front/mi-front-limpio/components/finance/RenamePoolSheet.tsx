import React, { useState, useEffect } from 'react';
import { View, Keyboard } from 'react-native';

import {
  AppInput,
  ActionSheet,
} from '../ui';
import {
  renameFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';
import {
  FinanceDetailMetaRow,
  FinanceFormFooter,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

type RenamePoolSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function RenamePoolSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  onRequestClose,
  onSuccess,
}: RenamePoolSheetProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && pool) {
      setName(pool.name);
      setError(null);
      setSubmitting(false);
    }
  }, [visible, pool]);

  const validate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio');
      return false;
    }
    if (trimmed.length > 50) {
      setError('El nombre no puede exceder 50 caracteres');
      return false;
    }
    if (trimmed === pool?.name) {
      setError('El nombre no ha cambiado');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken || !pool || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-rename-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id, name: name.trim() };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.rename',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: pool.id,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await renameFinancePool({
        accessToken,
        contextType,
        currency,
        poolId: pool.id,
        name: name.trim(),
        mutationId,
        idempotencyKey,
        payloadHash,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_pool_duplicate_name') {
        setError(`Ya tenés un pozo con ese nombre en ${currency}.`);
      } else if (err?.code === 'finance_pool_archived') {
        setError('No se puede renombrar un pozo archivado.');
      } else {
        setError(err?.message ?? 'No pudimos renombrar el pozo. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !pool) return null;

  return (
    <ActionSheet
      visible={true}
      title="Renombrar pozo"
      onRequestClose={onRequestClose}
      size={FINANCE_SHEET_SIZE_POLICY.SHORT_FORM}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <FinanceDetailMetaRow label="Nombre actual" value={pool.name} />

        <AppInput
          label="Nuevo nombre"
          placeholder="Ej: Ahorro Emergencia, Vacaciones, Impuestos"
          value={name}
          onChangeText={setName}
          errorText={error ?? undefined}
          autoCapitalize="words"
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          autoFocus={true}
        />

        <FinanceFormFooter
          onCancel={onRequestClose}
          primaryTitle="Guardar"
          onPrimary={handleSubmit}
          primaryDisabled={!name.trim() || name.trim() === pool.name}
          loading={submitting}
        />
      </View>
    </ActionSheet>
  );
}
