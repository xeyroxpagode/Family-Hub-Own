/**
 * Planner P2.2A — Presets Foundation — canonical Task Preset editor.
 *
 * ONE reusable editor for every canonical flow:
 *   - crear preset del hogar (create)
 *   - editar preset del hogar (edit)
 *   - duplicar preset HomePlus al hogar (prefill via initialPayload)
 *   - guardar una Task como preset (prefill via initialPayload)
 *
 * The editor captures ONLY the frozen stable fields (contract):
 *   title, note, type (template_key + category), priority,
 *   checklist template (labels/order only),
 *   requires_verification, requires_evidence.
 *
 * It NEVER captures contextual fields (assignee, date, time, Plan,
 * lifecycle/status). The preset name is the task title (single source of
 * truth) — there is no second "nombre" field to drift out of sync.
 *
 * The screen never performs I/O or mutations: it reports the committed input
 * through `onCommit`. Callers own identity/fan-out.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../../context/AppThemeContext';
import type { AppResolvedTheme } from '../../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  FilterChip,
  Toggle,
} from '../../ui';
import type { PlannerPresetTaskPayload, PresetTaskPriority } from '../../../services/planner/plannerPresetTaskDomain';
import { PlannerChecklistEditor, makePlannerChecklistDraft, type PlannerChecklistDraftItem } from '../PlannerChecklistEditor';

// ---------------------------------------------------------------------------
// Canonical Task types (mirrors TaskForm TIPO_OPTIONS)
// ---------------------------------------------------------------------------

export type PresetTypeOption = {
  id: string;
  label: string;
  category: string;
  templateKey: string | null;
  icon: HomePlusIconName;
};

export const PRESET_TYPE_OPTIONS: readonly PresetTypeOption[] = [
  { id: 'general', label: 'General', category: 'General', templateKey: null, icon: 'checkmark-circle' },
  { id: 'cleaning', label: 'Limpieza', category: 'Limpieza', templateKey: 'cleaning', icon: 'sparkles' },
  { id: 'shopping', label: 'Compras', category: 'Compras', templateKey: 'shopping', icon: 'cart' },
  { id: 'pets', label: 'Mascotas', category: 'Mascotas', templateKey: 'pets', icon: 'paw' },
  { id: 'payments', label: 'Pagos', category: 'Pagos', templateKey: 'payments', icon: 'card' },
  { id: 'medication', label: 'Medicación', category: 'Medicacion', templateKey: 'medication', icon: 'medical' },
  { id: 'studies', label: 'Estudios', category: 'Estudios', templateKey: 'studies', icon: 'school' },
];

const PRIORITY_VALUES: readonly PresetTaskPriority[] = ['low', 'normal', 'high'];
const PRIORITY_LABELS: Record<PresetTaskPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
};

/** Resolve the editor's initial type from a payload (template_key wins). */
export function presetTypeIdFromPayload(payload: PlannerPresetTaskPayload | null | undefined): string {
  if (!payload) return 'general';
  if (payload.template_key) {
    const byKey = PRESET_TYPE_OPTIONS.find((option) => option.templateKey === payload.template_key);
    if (byKey) return byKey.id;
  }
  const category = (payload.category ?? '').trim().toLowerCase();
  if (category) {
    const byCategory = PRESET_TYPE_OPTIONS.find((option) => option.category.toLowerCase() === category);
    if (byCategory) return byCategory.id;
  }
  return 'general';
}

export type PlannerPresetEditorCommitInput = {
  /** Preset name = task title (single source of truth). */
  readonly name: string;
  readonly payload: PlannerPresetTaskPayload;
};

type Props = {
  mode: 'create' | 'edit';
  /** Canonical prefilled stable fields (duplicate / save-as-preset / edit). */
  initialPayload?: PlannerPresetTaskPayload | null;
  onCommit: (input: PlannerPresetEditorCommitInput) => void;
  onCancel: () => void;
  submitting?: boolean;
};

export function PlannerPresetEditorScreen({
  mode,
  initialPayload,
  onCommit,
  onCancel,
  submitting = false,
}: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(initialPayload?.title ?? '');
  const [titleTouched, setTitleTouched] = useState(false);
  const [priority, setPriority] = useState<PresetTaskPriority>(initialPayload?.priority ?? 'normal');
  const [showMore, setShowMore] = useState(
    Boolean(
      initialPayload?.note
      || (initialPayload?.checklist?.length ?? 0) > 0
      || initialPayload?.requires_evidence,
    ),
  );
  const [note, setNote] = useState(initialPayload?.note ?? '');
  const [checklist, setChecklist] = useState<PlannerChecklistDraftItem[]>(
    makePlannerChecklistDraft((initialPayload?.checklist ?? []).map((item) => ({ text: item.text, checked: false }))),
  );
  const [typeId, setTypeId] = useState<string>(presetTypeIdFromPayload(initialPayload));
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(Boolean(initialPayload?.requires_verification));
  const [requiresEvidence, setRequiresEvidence] = useState(Boolean(initialPayload?.requires_evidence));

  const selectedType = PRESET_TYPE_OPTIONS.find((option) => option.id === typeId) ?? PRESET_TYPE_OPTIONS[0];
  const canSave = title.trim().length > 0 && !submitting;
  // P2.2A-R1 (defecto 1): la bottom navbar de HomePlus es flotante y absoluta
  // (`useBottomNavigationStyle`: height 68, bottom max(inset,12)) y cubre el
  // contenido del stack. El footer del editor reserva esa altura + un gap de
  // 12 para quedar siempre visible y tapeable sobre la navbar, con o sin
  // teclado (KeyboardAvoidingView) y con "Más detalles" colapsado/expandido.
  const tabBarClearance = theme.componentSizes.bottomNavHeight + theme.spacing[3];
  const footerPaddingBottom = Math.max(insets.bottom, 12) + tabBarClearance;

  const handleCommit = () => {
    if (!canSave) return;
    const cleanChecklist = checklist
      .map((item) => ({ text: item.text.trim() }))
      .filter((item) => item.text.length > 0);
    const payload: PlannerPresetTaskPayload = {
      title: title.trim(),
      note: note.trim(),
      template_key: selectedType.templateKey,
      category: selectedType.category,
      priority,
      estimated_duration_minutes: null,
      checklist: cleanChecklist,
      requires_verification: requiresVerification,
      requires_evidence: requiresEvidence,
    };
    onCommit({ name: title.trim(), payload });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <AppText variant="title2" weight="800" style={styles.headerTitle}>
            {mode === 'edit' ? 'Editar preset' : 'Nuevo preset'}
          </AppText>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cerrar editor de preset"
            style={styles.headerCloseButton}
          >
            <HomePlusIcon name="close" size={20} color={theme.colors.text.secondary} />
          </Pressable>
        </View>

        <AppInput
          label="¿Qué tarea prepara?"
          value={title}
          onChangeText={(value) => { setTitle(value); setTitleTouched(true); }}
          placeholder="Ej. Pagar la factura de luz"
          errorText={!title.trim() && titleTouched ? 'Agregá un título para el preset.' : undefined}
        />

        <View style={styles.section}>
          <AppText variant="caption" weight="700" style={styles.fieldLabel}>
            Prioridad
          </AppText>
          <View style={styles.priorityRow}>
            {PRIORITY_VALUES.map((value) => (
              <FilterChip
                key={value}
                label={PRIORITY_LABELS[value]}
                selected={priority === value}
                onPress={() => setPriority(value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={styles.moreRow}
            onPress={() => setShowMore((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={showMore ? 'Ocultar más detalles' : 'Mostrar más detalles'}
          >
            <View style={styles.moreRowText}>
              <AppText variant="body" weight="700">
                Más detalles
              </AppText>
              <AppText variant="caption" tone="tertiary">
                Nota, checklist, tipo, revisión y evidencia
              </AppText>
            </View>
            <HomePlusIcon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
          </Pressable>

          {showMore ? (
            <View style={styles.moreBody}>
              <AppInput
                label="Nota"
                value={note}
                onChangeText={setNote}
                placeholder="Detalle reusable de la tarea"
                multiline
              />

              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                Checklist
              </AppText>
              <View style={styles.checklistColumn}>
                <PlannerChecklistEditor items={checklist} onChange={setChecklist} disabled={submitting} />
              </View>

              <Pressable
                style={styles.valueRow}
                onPress={() => setTypeSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Tipo de tarea"
              >
                <AppText variant="body" style={styles.valueRowLabel}>
                  Tipo
                </AppText>
                <View style={styles.valueRowValue}>
                  <AppText variant="body" tone="tertiary">
                    {selectedType.label}
                  </AppText>
                  <HomePlusIcon name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </Pressable>

              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <AppText variant="body" weight="700">
                    Pedir revisión
                  </AppText>
                  <AppText variant="caption" tone="tertiary">
                    Las tareas creadas con este preset pedirán que alguien las confirme.
                  </AppText>
                </View>
                <Toggle
                  value={requiresVerification}
                  onValueChange={setRequiresVerification}
                  accessibilityLabel="Pedir revisión"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <AppText variant="body" weight="700">
                    Requerir evidencia
                  </AppText>
                  <AppText variant="caption" tone="tertiary">
                    Marca que la tarea debería dejar una evidencia al completarse.
                  </AppText>
                </View>
                <Toggle
                  value={requiresEvidence}
                  onValueChange={setRequiresEvidence}
                  accessibilityLabel="Requerir evidencia"
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <AppButton
          title="Cancelar"
          variant="ghost"
          onPress={onCancel}
          disabled={submitting}
          style={styles.footerButton}
        />
        <AppButton
          title={submitting ? 'Guardando...' : 'Guardar preset'}
          onPress={handleCommit}
          disabled={!canSave}
          loading={submitting}
          style={styles.footerButton}
        />
      </View>

      <ActionSheet
        visible={typeSheetOpen}
        title="Tipo"
        onRequestClose={() => setTypeSheetOpen(false)}
        size="content"
      >
        <View style={styles.typeChips}>
          {PRESET_TYPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.id}
              label={option.label}
              selected={typeId === option.id}
              onPress={() => { setTypeId(option.id); setTypeSheetOpen(false); }}
            />
          ))}
        </View>
      </ActionSheet>

      {submitting ? (
        <View style={styles.submittingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.terracotta[500]} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppResolvedTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.base,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
      gap: 12,
    },
    headerTitle: {
      flex: 1,
    },
    headerCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.surface.soft,
    },
    fieldLabel: {
      color: colors.text.secondary,
      marginBottom: 8,
      marginTop: 4,
    },
    section: {
      marginTop: 18,
    },
    priorityRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    moreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      gap: 12,
    },
    moreRowText: {
      flex: 1,
      gap: 2,
    },
    moreBody: {
      marginTop: 12,
      gap: 14,
    },
    checklistColumn: {
      gap: 8,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
      gap: 12,
    },
    valueRowLabel: {
      flex: 1,
    },
    valueRowValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 4,
    },
    toggleText: {
      flex: 1,
      gap: 2,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border.subtle,
      backgroundColor: colors.background.base,
    },
    footerButton: {
      flex: 1,
    },
    typeChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    submittingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
