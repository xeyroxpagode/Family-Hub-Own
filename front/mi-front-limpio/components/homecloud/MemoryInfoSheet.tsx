import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionSheet, AppButton, AppInput, AppText } from '../ui';
import { spacing } from '../../constants/theme';
import type { HomeCloudMemory, HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import {
  emptySemanticDateDraft,
  semanticDateDraftFromCapture,
  semanticDateDraftError,
  semanticDateValueFromDraft,
  type SemanticDateDraft,
} from '../../services/homecloud/homecloudSemanticDate';
import { memorySemanticLabel } from '../../services/homecloud/homecloudMemoriesTimeline';
import { updateMemory } from '../../services/homecloud/homecloudReadService';
import { MemorySemanticDateFields } from './MemorySemanticDateFields';

/**
 * Información del recuerdo — the canonical post-save metadata surface (§8).
 *
 * Presents the three distinct facts a user must never conflate:
 *   - Cuándo ocurrió  = semantic date (editable when organize allows)
 *   - Cuándo se agregó = uploaded_at (never used as a semantic fallback)
 *   - Quién lo agregó  = only rendered when a genuine human label exists;
 *     no member-directory exists yet, so we never invent one nor expose a
 *     raw member UUID.
 *
 * Editing is the same authority as intake: MemorySemanticDateFields +
 * semanticDateValueFromDraft, and partial -> exact is only the user's
 * explicit complete selection (DatePickerSheet, never a synthesized day).
 */
export function MemoryInfoSheet({
  visible,
  memory,
  accessToken,
  canOrganize,
  onClose,
  onUpdated,
}: {
  visible: boolean;
  memory: HomeCloudMemoryListItem | null;
  accessToken: string | null;
  canOrganize: boolean;
  onClose: () => void;
  onUpdated?: (memory: HomeCloudMemory) => void;
}) {
  const [draftDate, setDraftDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !memory) return;
    setDraftDate(semanticDateDraftFromCapture(
      memory.capturedAt,
      memory.capturePrecision,
      memory.capturedYear,
      memory.capturedMonth,
    ));
    setCaption(memory.caption ?? '');
    setError(null);
    setSaving(false);
  }, [memory, visible]);

  const dateError = useMemo(() => semanticDateDraftError(draftDate), [draftDate]);
  const addedLabel = useMemo(() => {
    if (!memory) return null;
    if (!memory.uploadedAt) return null;
    const parsed = new Date(memory.uploadedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [memory]);

  const save = async () => {
    if (!memory || !accessToken || saving) return;
    if (dateError) { setError(dateError); return; }
    setSaving(true);
    setError(null);
    try {
      const date = semanticDateValueFromDraft(draftDate);
      const updated = await updateMemory(accessToken, memory.id, {
        caption: caption.trim() || null,
        capturePrecision: date.precision,
        capturedAt: date.capturedAt,
        capturedYear: date.capturedYear,
        capturedMonth: date.capturedMonth,
      });
      onUpdated?.(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (!memory) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Información del recuerdo"
      onRequestClose={() => { if (!saving) onClose(); }}
      closeDisabled={saving}
      size="scrollable-content"
      keyboardAware
      footer={canOrganize ? (
        <AppButton
          title={saving ? 'Guardando…' : 'Guardar cambios'}
          loading={saving}
          disabled={saving || Boolean(dateError)}
          onPress={() => { void save(); }}
        />
      ) : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        <View style={styles.block}>
          <AppText variant="caption" tone="secondary" weight="700">{'Cuándo ocurrió'}</AppText>
          {canOrganize ? (
            <MemorySemanticDateFields value={draftDate} onChange={setDraftDate} disabled={saving} />
          ) : (
            <AppText variant="body">{memorySemanticLabel(memory)}</AppText>
          )}
        </View>

        <View style={styles.block}>
          <AppText variant="caption" tone="secondary" weight="700">{'Cuándo se agregó'}</AppText>
          <AppText variant="body">{addedLabel ?? 'No disponible'}</AppText>
        </View>

        <View style={styles.block}>
          <AppText variant="caption" tone="secondary" weight="700">{'Descripción'}</AppText>
          {canOrganize ? (
            <AppInput
              label="Descripción (opcional)"
              value={caption}
              onChangeText={(text) => { setCaption(text); setError(null); }}
              editable={!saving}
              variant="multiline"
              returnKeyType="done"
              blurOnSubmit
            />
          ) : (
            <AppText variant="body">{memory.caption ?? 'Sin descripción'}</AppText>
          )}
        </View>

        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
      </ScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing[4], paddingBottom: spacing[4] },
  block: { gap: spacing[2] },
});
