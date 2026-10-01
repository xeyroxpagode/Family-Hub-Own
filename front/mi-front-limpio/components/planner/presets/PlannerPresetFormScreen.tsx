/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset Create/Edit form screen.
 *
 * Lane-owned. Captures preset metadata (name, entity kind, source) and the
 * reusable payload via the backend published adapter contract — NOT raw JSON.
 *
 * Lifecycle (§9):
 *   Create Preset
 *     → selectar tipo
 *     → editar metadata reusable
 *     → editar payload reusable mediante adapter
 *     → validar
 *     → guardar/publicar según contrato
 *
 * Edit:
 *   Preset Detail → Editar → revision draft → guardar cambios → publicar
 *   explícitamente. The screen distinguishes "Guardar" from "Publicar"
 *   (publishRevision wires a separate mutation).
 *
 * The screen NEVER executes submit on its own: every persisting action is
 * dispatched via the `onCommit`/`onStartRevision`/`onPublishRevision`
 * callbacks. Identity generation is delegated to the caller (lane-owned
 * hooks), preserving the canonical mutation intent policy.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import {
  PRESET_SOURCES,
  defaultAdapterKeyFor,
  isSupportedPayloadVersion,
} from '../../../services/planner/plannerPresetContracts';
import type {
  PlannerPreset,
  PlannerPresetSource,
  PlannerTemplateEntityType,
} from '../../../types/plannerPresetsDrafts';

export type PresetFormMode = 'create' | 'edit';

type Props = {
  mode: PresetFormMode;
  initialPreset?: PlannerPreset;
  onCommit?: (input: PresetCommitInput) => void;
  onStartRevision?: (presetId: string) => void;
  onPublishRevision?: (revisionId: string) => void;
  onCancel?: () => void;
  /** Generation tokens so the lane never sends actor IDs as authority. */
  capabilities: { use: boolean; manage: boolean };
};

export type PresetCommitInput = {
  readonly name: string;
  readonly entity_type: PlannerTemplateEntityType;
  readonly source: PlannerPresetSource;
  readonly adapter_key: string;
  readonly payload: Record<string, unknown>;
};

export function PlannerPresetFormScreen({
  mode,
  initialPreset,
  onCommit,
  onStartRevision,
  onPublishRevision,
  onCancel,
  capabilities,
}: Props) {
  const initialEntityType: PlannerTemplateEntityType =
    initialPreset?.entity_type ?? 'task';
  const initialSource: PlannerPresetSource = initialPreset?.source ?? 'personal';

  const [name, setName] = useState(initialPreset?.name ?? '');
  const [entityType, setEntityType] = useState<PlannerTemplateEntityType>(initialEntityType);
  const [source, setSource] = useState<PlannerPresetSource>(initialSource);
  const [payloadObjective, setPayloadObjective] = useState<string>(
    initialPreset?.planner_preset_revisions?.[0]?.payload?.objectiveTemplate as string | undefined ?? '',
  );
  const [taskHint, setTaskHint] = useState<string>(
    initialPreset?.planner_preset_revisions?.[0]?.payload?.title as string | undefined ?? '',
  );

  const canManage = capabilities.manage;

  const adapterKey = useMemo(() => defaultAdapterKeyFor(entityType), [entityType]);

  const validate = useCallback(() => {
    if (name.trim().length === 0) return false;
    if (entityType === 'task' && taskHint.trim().length === 0) return false;
    if (entityType === 'plan' && payloadObjective.trim().length === 0) return false;
    return true;
  }, [name, entityType, taskHint, payloadObjective]);

  const handleCommit = useCallback(() => {
    if (!validate()) return;
    const payload: Record<string, unknown> =
      entityType === 'task'
        ? { title: taskHint }
        : entityType === 'event'
        ? { title: taskHint }
        : { objectiveTemplate: payloadObjective, milestones: [], tasks: [], events: [] };
    onCommit?.({
      name: name.trim(),
      entity_type: entityType,
      source,
      adapter_key: adapterKey,
      payload,
    });
  }, [validate, entityType, taskHint, payloadObjective, name, source, adapterKey, onCommit]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <AppText variant="title2" weight="700">
        {mode === 'create' ? 'Nuevo preset' : 'Editar preset'}
      </AppText>

      {!canManage ? (
        <View style={[S.toastBox, { marginTop: 12 }]}>
          <AppText variant="bodySmall" tone="warning" style={{ flex: 1 }}>
            No tenés permiso para editar este preset.
          </AppText>
        </View>
      ) : null}

      <Field label="Nombre">
        <TextInput
          value={name}
          onChangeText={setName}
          editable={canManage}
          accessibilityLabel="Nombre del preset"
          style={inputStyle}
        />
      </Field>

      <Field label="Tipo">
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {(['task', 'event', 'plan'] as const).map((kind) => (
            <KindTab key={kind} kind={kind} active={entityType === kind} onPress={() => setEntityType(kind)} disabled={!canManage} />
          ))}
        </View>
      </Field>

      <Field label="Origen">
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {PRESET_SOURCES.map((srcValue) => (
            <KindTab
              key={srcValue}
              kindText={sourceLabel(srcValue)}
              active={source === srcValue}
              onPress={() => setSource(srcValue)}
              disabled={!canManage || mode === 'edit'}
            />
          ))}
        </View>
      </Field>

      {entityType === 'task' || entityType === 'event' ? (
        <Field label={entityType === 'task' ? 'Título sugerido' : 'Título sugerido'}>
          <TextInput
            value={taskHint}
            onChangeText={setTaskHint}
            editable={canManage}
            accessibilityLabel="Título sugerido"
            style={inputStyle}
          />
        </Field>
      ) : (
        <Field label="Objetivo sugerido">
          <TextInput
            value={payloadObjective}
            onChangeText={setPayloadObjective}
            editable={canManage}
            accessibilityLabel="Objetivo sugerido"
            style={inputStyle}
          />
        </Field>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 }}>
        <TouchableOpacity
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={{ paddingHorizontal: 12 }}
        >
          <AppText variant="body" tone="tertiary">
            Cancelar
          </AppText>
        </TouchableOpacity>
        {canManage && mode === 'edit' && onStartRevision && initialPreset ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Iniciar revisión"
            style={blueAction}
            onPress={() => onStartRevision(initialPreset.id)}
          >
            <AppText variant="body" tone="inverse" weight="700">
              Iniciar revisión
            </AppText>
          </TouchableOpacity>
        ) : null}
        {canManage && mode === 'edit' && onPublishRevision ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Publicar revisión"
            style={blueAction}
            onPress={() => {
              const revision = initialPreset?.active_revision_id;
              if (revision) onPublishRevision(revision);
            }}
          >
            <AppText variant="body" tone="inverse" weight="700">
              Publicar revisión
            </AppText>
          </TouchableOpacity>
        ) : null}
        {canManage && mode === 'create' && onCommit ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Guardar preset"
            style={blueAction}
            onPress={handleCommit}
            disabled={!validate()}
          >
            <AppText variant="body" tone="inverse" weight="700">
              Guardar
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const inputStyle = {
  marginTop: 6,
  borderColor: '#D0D7DE',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
};
const blueAction = {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 16,
  backgroundColor: '#2B6CB0',
  marginLeft: 8,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 12 }}>
      <AppText variant="micro" tone="tertiary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function KindTab({
  kindText,
  kind,
  active,
  onPress,
  disabled,
}: {
  kindText?: string;
  kind?: PlannerTemplateEntityType;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const label = kindText ?? kindLabel(kind ?? 'task');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: active ? '#2B6CB0' : 'transparent',
        borderWidth: 1,
        borderColor: '#2B6CB0',
        opacity: disabled ? 0.5 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppText variant="bodySmall" weight="700" tone={active ? 'inverse' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

function kindLabel(kind: PlannerTemplateEntityType): string {
  switch (kind) {
    case 'task':
      return 'Tareas';
    case 'event':
      return 'Eventos';
    case 'plan':
      return 'Planes';
  }
}

function sourceLabel(src: PlannerPresetSource): string {
  switch (src) {
    case 'homeplus':
      return 'HomePlus';
    case 'personal':
      return 'Personal';
    case 'household':
      return 'Familiar';
  }
}
