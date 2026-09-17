import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ApiError } from '../../services/api';
import {
  updateFinanceAccount,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
} from '../ui';

export type AccountEditSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  account: FinanceAccountDto | null;
  onRequestClose: () => void;
  onSuccess: (account: FinanceAccountDto) => void;
};

export function AccountEditSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onSuccess,
}: AccountEditSheetProps) {
  const [name, setName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && account?.name) {
      setName(account.name);
      setSubmitError(null);
      setSubmitting(false);
    }
    if (!visible) {
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [visible, account?.id, account?.name]);

  const canSubmit = Boolean(accessToken) && Boolean(account) && name.trim().length > 0 && name.trim() !== account?.name && !submitting;

  const close = () => {
    if (submitting) return;
    setSubmitError(null);
    onRequestClose();
  };

  const submit = async () => {
    if (submitting || !accessToken || !account) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await updateFinanceAccount(accessToken, account.id, { name: name.trim(), contextType });
      onRequestClose();
      onSuccess(response.account);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos editar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionSheet
      visible={visible}
      title="Editar cuenta"
      subtitle={account?.name}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={(
        <View style={styles.footer}>
          <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
          <AppButton title="Guardar" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
        </View>
      )}
    >
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.form}
      >
        <AppInput
          label="Nombre"
          value={name}
          onChangeText={(text) => { setName(text); setSubmitError(null); }}
          placeholder="Nombre de la cuenta"
          editable={!submitting}
          returnKeyType="done"
        />

        <View style={styles.readonlyInfo}>
          <HomePlusIcon name="lock-closed-outline" size={16} color={colors.text.tertiary} />
          <AppText variant="caption" tone="tertiary">
            Por ahora solo podés editar el nombre. Tipo, moneda y contexto no se pueden cambiar después de crear la cuenta.
          </AppText>
        </View>

        {submitError ? (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
            <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  readonlyInfo: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  footerButton: {
    flex: 1,
  },
});
