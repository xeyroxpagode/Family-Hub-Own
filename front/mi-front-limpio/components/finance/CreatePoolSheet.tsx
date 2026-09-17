import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  AppInput,
  ActionSheet,
} from '../ui';
import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  createFinancePool,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type CreatePoolSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function CreatePoolSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  onRequestClose,
  onSuccess,
}: CreatePoolSheetProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

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
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-create-${mutationId}`;
      const payload = { name: name.trim(), currency };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.create',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: null,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await createFinancePool({
        accessToken,
        contextType,
        currency,
        name: name.trim(),
        mutationId,
        idempotencyKey,
        payloadHash,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_pool_duplicate_name') {
        setError(`Ya tenés un pozo con ese nombre en ${currency}.`);
      } else {
        setError(err?.message ?? 'No pudimos crear el pozo. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <ActionSheet
      visible={true}
      title="Crear pozo"
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <AppText variant="caption" tone="secondary" style={styles.hint}>
          Moneda: {currency}
        </AppText>

        <AppCard variant="quiet" padding="default" style={styles.formCard}>
          <AppInput
            label="Nombre del pozo"
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

        <AppText variant="caption" tone="tertiary" style={styles.note}>
          El pozo se crea con saldo 0. Podrás agregarle dinero después.
        </AppText>

        <View style={styles.buttonRow}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onRequestClose}
            disabled={submitting}
            style={styles.cancelButton}
          />
          <AppButton
            title="Crear pozo"
            onPress={handleSubmit}
            disabled={submitting || !name.trim()}
            style={styles.createButton}
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
  hint: {
    color: colors.text.tertiary,
  },
  formCard: {
    gap: spacing[3],
  },
  note: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
});
