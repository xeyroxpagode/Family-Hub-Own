import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  AppInput,
  ActionSheet,
} from '../ui';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  renameFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

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
      size="content"
    >
      <View style={styles.content}>
        <View style={styles.currentName}>
          <AppText variant="caption" tone="secondary" weight="700">Nombre actual</AppText>
          <AppText variant="body" weight="800">{pool.name}</AppText>
        </View>

        <AppCard variant="quiet" padding="default" style={styles.formCard}>
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
        </AppCard>

        <View style={styles.buttonRow}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onRequestClose}
            disabled={submitting}
            style={styles.cancelButton}
          />
          <AppButton
            title="Guardar"
            onPress={handleSubmit}
            disabled={submitting || !name.trim() || name.trim() === pool.name}
            style={styles.saveButton}
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
  currentName: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  formCard: {
    gap: spacing[3],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
