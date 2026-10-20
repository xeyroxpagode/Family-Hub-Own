import React from 'react';
import { View } from 'react-native';
import { ActionSheet } from './ActionSheet';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

export type ConfirmActionSheetProps = {
  visible: boolean; title: string; body: string; primaryLabel: string; onPrimary: () => void;
  onCancel: () => void; cancelLabel?: string; variant?: 'neutral' | 'destructive'; busy?: boolean; closeDisabled?: boolean;
};
export function ConfirmActionSheet({ visible, title, body, primaryLabel, onPrimary, onCancel, cancelLabel = 'Cancelar', variant = 'neutral', busy = false, closeDisabled = false }: ConfirmActionSheetProps) {
  const locked = busy || closeDisabled;
  return <ActionSheet visible={visible} title={title} onRequestClose={onCancel} closeDisabled={locked} size="content" transition="controlled"
    footer={<View style={{ gap: 8 }}><AppButton title={primaryLabel} onPress={onPrimary} loading={busy} disabled={locked} variant={variant === 'destructive' ? 'danger' : 'primary'} /><AppButton title={cancelLabel} onPress={onCancel} disabled={locked} variant="secondary" /></View>}>
    <AppText variant="body" tone="secondary">{body}</AppText>
  </ActionSheet>;
}
