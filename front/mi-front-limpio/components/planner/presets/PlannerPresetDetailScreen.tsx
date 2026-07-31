/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset Detail / Preview screen.
 *
 * Lane-owned. Shows the safe information set the contract makes public:
 *  - name
 *  - kind (Tareas/Eventos/Planes)
 *  - source (HomePlus / Personal / Familiar)
 *  - active revision number (when published revisions exist)
 *  - placeholder summary count
 *  - updated_at (safe formatted date)
 *  - retention expiry (when the contract exposes it)
 *
 * Privacy:
 *  - NEVER shows UUIDs, SQLSTATE, raw payload JSON, adapter keys, or internal
 *    paths.
 *  - HomePlus-source presets present NO "Editar" action.
 *
 * The screen does NOT modify the backend; actions are dispatched via callbacks
 * Integration wires.
 */
import React from 'react';
import { Pressable, ScrollView, View, TouchableOpacity } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import {
  describePresetDetailInteraction,
  safeSourceLabel,
  type PresetDetailAction,
} from './plannerPresetDetailViewState';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';

type Props = {
  preset: PlannerPreset;
  capabilities: { use: boolean; manage: boolean };
  onAction?: (action: PresetDetailAction, preset: PlannerPreset) => void;
};

const ACTION_LABELS: Record<PresetDetailAction, string> = {
  use: 'Usar',
  edit: 'Editar',
  duplicate: 'Duplicar',
  trash: 'Enviar a Papelera',
  restore: 'Restaurar',
};

export function PlannerPresetDetailScreen({ preset, capabilities, onAction }: Props) {
  const interaction = describePresetDetailInteraction(preset, capabilities);
  const placeholderCount = preset.planner_preset_revisions
    ? countPlaceholders(preset.planner_preset_revisions)
    : 0;
  const updatedAt = safeDate(preset.updated_at);
  const retentionExpiry = interaction.retentionExpiresAt ? safeDate(interaction.retentionExpiresAt) : null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="title2" weight="700">
        {preset.name}
      </AppText>
      <AppText variant="bodySmall" tone="tertiary" style={{ marginBottom: 16 }}>
        {safeKindLabel(preset)} · {safeSourceLabel(preset.source)}
      </AppText>

      <View style={{ marginTop: 8 }}>
        <DetailRow label="Revisión activa" value={safeRevisionLabel(interaction)} />
        <DetailRow label="Placeholders" value={placeholderCount > 0 ? `${placeholderCount}` : '0'} />
        <DetailRow label="Ultima actualización" value={updatedAt} />
        {retentionExpiry ? <DetailRow label="Disponible hasta" value={retentionExpiry} /> : null}
      </View>

      {interaction.isTrashed ? (
        <View style={[S.toastBox, { marginTop: 16 }]}>
          <AppText variant="bodySmall" tone="warning" style={{ flex: 1 }}>
            Este preset está en la papelera.
          </AppText>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 24 }}>
        {interaction.actions.map((action) => (
          <TouchableOpacity
            key={action}
            onPress={() => onAction?.(action, preset)}
            accessibilityRole="button"
            accessibilityLabel={ACTION_LABELS[action]}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#2B6CB0',
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <AppText variant="bodySmall" weight="700" tone="primary">
              {ACTION_LABELS[action]}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="micro" tone="tertiary">
        {label}
      </AppText>
      <AppText variant="body" style={{ marginBottom: 10 }}>
        {value}
      </AppText>
    </View>
  );
}

function safeKindLabel(preset: PlannerPreset): string {
  switch (preset.entity_type) {
    case 'task':
      return 'Tareas';
    case 'event':
      return 'Eventos';
    case 'plan':
      return 'Planes';
  }
}

function safeRevisionLabel(interaction: ReturnType<typeof describePresetDetailInteraction>): string {
  if (!interaction.hasRevisions) return 'No publicada';
  if (interaction.activeRevisionNumber === null) return 'En revisión';
  return `Revisión ${interaction.activeRevisionNumber}`;
}

function safeDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

function countPlaceholders(revisions: NonNullable<PlannerPreset['planner_preset_revisions']>): number {
  const active = revisions.find((r) => r.revision_state === 'published');
  const target = active ?? revisions[0];
  const payload = target?.payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).placeholders)) {
    if (Array.isArray((payload as Record<string, unknown>).placeholders)) {
      return ((payload as Record<string, unknown>).placeholders as unknown[]).length;
    }
  }
  return 0;
}
