/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  createFinanceCategory,
  FINANCE_CATEGORY_ICON_OPTIONS,
  type FinanceCategoryDto,
  type FinanceCategoryIconKey,
} from '../../services/finance/financeCategories';
import { ActionSheet, AppInput, AppText, InteractivePressable } from '../ui';
import { FinanceFormFooter, FINANCE_SHEET_SIZE_POLICY } from './ui';

type Props = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  mode: 'expense' | 'income';
  onRequestClose: () => void;
  onCreated: (category: FinanceCategoryDto) => void;
};

const DEFAULT_ICON_KEY: FinanceCategoryIconKey = 'pricetag-outline';

function humanCreateError(error: any) {
  if (error?.code === 'invalid_finance_category_icon_key') return 'Elegí un icono válido.';
  if (error?.code === 'invalid_finance_category_label') return 'Escribí un nombre para la categoría.';
  if (error?.message?.toLowerCase?.().includes('duplicate') || error?.code === '23505') return 'Ya existe una categoría con ese nombre.';
  return 'No pudimos crear la categoría. Intentá de nuevo.';
}

export function CreateFinanceCategorySheet({ visible, accessToken, contextType, mode, onRequestClose, onCreated }: Props) {
  const theme = useAppTheme();
  const { colors, motion, radius, spacing } = theme;
  const [view, setView] = useState<'form' | 'icon'>('form');
  const [label, setLabel] = useState('');
  const [iconKey, setIconKey] = useState<FinanceCategoryIconKey>(DEFAULT_ICON_KEY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setView('form'); setLabel(''); setIconKey(DEFAULT_ICON_KEY); setError(null); setSubmitting(false);
  }, [visible]);

  const create = async () => {
    const trimmed = label.trim();
    if (!accessToken || !trimmed || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const response = await createFinanceCategory(accessToken, { contextType, type: mode, label: trimmed, iconKey });
      onCreated(response.category);
    } catch (cause: any) {
      setError(humanCreateError(cause));
    } finally { setSubmitting(false); }
  };

  const selectedIcon = FINANCE_CATEGORY_ICON_OPTIONS.find((option) => option.key === iconKey);
  return <ActionSheet visible={visible} title={view === 'icon' ? 'Elegir icono' : `Nueva categoría de ${mode === 'expense' ? 'gasto' : 'ingreso'}`} subtitle={contextType === 'personal' ? 'Personal' : 'Hogar'} onRequestClose={() => view === 'icon' ? setView('form') : onRequestClose()} closeDisabled={submitting} size={view === 'icon' ? 'scrollable-content' : FINANCE_SHEET_SIZE_POLICY.SHORT_FORM} footer={view === 'form' ? <FinanceFormFooter primaryTitle="Crear categoría" onPrimary={create} primaryDisabled={!label.trim() || submitting} loading={submitting} divided={false} /> : null}>
    {view === 'form' ? <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}><ScrollView contentContainerStyle={[styles.content, { gap: spacing[4] }]} keyboardShouldPersistTaps="handled"><AppInput label="Nombre" placeholder={mode === 'expense' ? 'Mascotas' : 'Freelance'} value={label} onChangeText={(value) => { setLabel(value); setError(null); }} errorText={error ?? undefined} autoFocus maxLength={42} returnKeyType="done" onSubmitEditing={create} /><InteractivePressable onPress={() => setView('icon')} haptic="light" pressScale={motion.scale.card} style={[styles.formRow, { borderBottomColor: colors.border.subtle }]} accessibilityRole="button" accessibilityLabel={`Icono ${selectedIcon?.label ?? 'categoría'}`}><AppText variant="bodySmall" weight="700" style={styles.formRowLabel}>Icono</AppText><HomePlusIcon name={iconKey} size={22} color={colors.terracotta[700]} /><HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} /></InteractivePressable><AppText variant="caption" tone="secondary">Se creará en {contextType === 'personal' ? 'Personal' : 'Hogar'}.</AppText></ScrollView></KeyboardAvoidingView> : <ScrollView contentContainerStyle={[styles.iconGrid, { gap: spacing[2] }]} keyboardShouldPersistTaps="handled">{FINANCE_CATEGORY_ICON_OPTIONS.map((option) => { const selected = option.key === iconKey; return <InteractivePressable key={option.key} onPress={() => { setIconKey(option.key); setView('form'); }} haptic="light" pressScale={motion.scale.card} style={[styles.iconTile, { borderRadius: radius.lg, backgroundColor: colors.surface.soft }, selected && { backgroundColor: colors.terracotta[600] }]} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={option.label}><HomePlusIcon name={option.key} size={24} color={selected ? colors.text.inverse : colors.text.secondary} /></InteractivePressable>; })}</ScrollView>}
  </ActionSheet>;
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flexGrow: 0, flexShrink: 1 },
  content: { paddingBottom: 24 },
  formRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1 },
  formRowLabel: { flex: 1 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 24 },
  iconTile: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
