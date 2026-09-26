import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ActionSheet, AppButton, AppInput, AppText, FilterChip } from '../../components/ui';
import { MemorySemanticDateFields } from '../../components/homecloud/MemorySemanticDateFields';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { generateMutationId } from '../api';
import { createMemoryIntakeService } from './homecloudMemoryIntakeService';
import { createWrittenMemory } from './homecloudWrittenMemoryService';
import {
  emptySemanticDateDraft,
  semanticDateDraftError,
  semanticDateDraftFromCapture,
  semanticDateValueFromDraft,
  type SemanticDateDraft,
} from './homecloudSemanticDate';
import type { BinaryMemoryDraft, MemoryIntakeConfig, MemoryIntakeDestination, MemoryIntakeState } from './homecloudMemoryIntakeTypes';

export interface MemoryIntakeProps {
  config: MemoryIntakeConfig;
  onComplete?: (contentId: string) => void;
}

type Sheet = 'create' | 'binary' | 'written' | null;

export function MemoryIntake({ config, onComplete }: MemoryIntakeProps) {
  const { householdId, accessToken, capabilities, initialAlbumId, initialAlbumName, intakeSource } = config;
  const [state, setState] = useState<MemoryIntakeState>({ status: 'idle' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [albums, setAlbums] = useState<MemoryIntakeDestination[]>([]);
  const [binaryDraft, setBinaryDraft] = useState<BinaryMemoryDraft | null>(null);
  const [binaryDate, setBinaryDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
  const [binaryCaption, setBinaryCaption] = useState('');
  const [binaryAlbumId, setBinaryAlbumId] = useState<string | null>(config.initialAlbumId ?? null);
  const [writtenText, setWrittenText] = useState('');
  const [writtenDate, setWrittenDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
  const [writtenAlbumId, setWrittenAlbumId] = useState<string | null>(config.initialAlbumId ?? null);
  const [writtenSubmitting, setWrittenSubmitting] = useState(false);
  const [writtenError, setWrittenError] = useState<string | null>(null);
  const writtenRequestId = useRef<string | null>(null);
  const notifiedContentId = useRef<string | null>(null);

  const service = useMemo(() => createMemoryIntakeService({
    householdId,
    accessToken,
    capabilities,
    initialAlbumId,
    initialAlbumName,
    intakeSource,
  }), [
    householdId,
    accessToken,
    capabilities,
    initialAlbumId,
    initialAlbumName,
    intakeSource,
  ]);

  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    void service.loadAlbums().then(() => setAlbums(service.getAvailableDestinations()));
    void service.recover();
    return unsubscribe;
  }, [service]);

  useEffect(() => {
    if (state.status !== 'completed' || !state.contentId || notifiedContentId.current === state.contentId) return;
    notifiedContentId.current = state.contentId;
    setSheet(null);
    setBinaryDraft(null);
    onComplete?.(state.contentId);
  }, [onComplete, state.contentId, state.status]);

  const active = ['preparing', 'uploading', 'verifying', 'finalizing'].includes(state.status);

  const chooseMedia = useCallback(async () => {
    setSheet(null);
    const draft = await service.pickMemory();
    if (!draft) return;
    setBinaryDraft(draft);
    setBinaryDate(semanticDateDraftFromCapture(draft.capturedAt, draft.capturePrecision));
    setBinaryCaption('');
    setBinaryAlbumId(config.initialAlbumId ?? null);
    setSheet('binary');
  }, [config.initialAlbumId, service]);

  const submitBinary = useCallback(async () => {
    if (!binaryDraft || active || semanticDateDraftError(binaryDate)) return;
    const date = semanticDateValueFromDraft(binaryDate);
    await service.createBinaryMemory(binaryDraft, {
      caption: binaryCaption.trim() || null,
      initialAlbumId: binaryAlbumId,
      capturedAt: date.capturedAt,
      capturedYear: date.capturedYear,
      capturedMonth: date.capturedMonth,
      capturePrecision: date.precision,
    });
  }, [active, binaryAlbumId, binaryCaption, binaryDate, binaryDraft, service]);

  const submitWritten = useCallback(async () => {
    if (writtenSubmitting || !writtenText.trim() || semanticDateDraftError(writtenDate)) return;
    setWrittenSubmitting(true);
    setWrittenError(null);
    if (!writtenRequestId.current) writtenRequestId.current = generateMutationId();
    try {
      const date = semanticDateValueFromDraft(writtenDate);
      const content = await createWrittenMemory(config.accessToken, {
        text: writtenText,
        initialAlbumId: writtenAlbumId,
        intakeRequestId: writtenRequestId.current,
        ...date,
      });
      writtenRequestId.current = null;
      setSheet(null);
      setWrittenText('');
      setWrittenDate(emptySemanticDateDraft());
      onComplete?.(content.id);
    } catch (error) {
      setWrittenError(error instanceof Error ? error.message : 'No pudimos guardar este recuerdo.');
    } finally {
      setWrittenSubmitting(false);
    }
  }, [config.accessToken, onComplete, writtenAlbumId, writtenDate, writtenSubmitting, writtenText]);

  const openWritten = () => {
    setWrittenText('');
    setWrittenDate(emptySemanticDateDraft());
    setWrittenAlbumId(config.initialAlbumId ?? null);
    setWrittenError(null);
    writtenRequestId.current = null;
    setSheet('written');
  };

  return (
    <>
      <AppButton
        variant="icon"
        size="sm"
        onPress={() => setSheet('create')}
        disabled={!config.capabilities.contribute || active || state.status === 'picking'}
        accessibilityLabel="Crear recuerdo"
      >
        <HomePlusIcon name="add" size={24} color={colors.brand} />
      </AppButton>

      <ActionSheet visible={sheet === 'create'} title="Guardar un recuerdo" onRequestClose={() => setSheet(null)} size="content">
        <View style={styles.actions}>
          <AppButton title="Elegir fotos o videos" onPress={() => void chooseMedia()} />
          <AppButton title="Escribir un recuerdo" variant="secondary" onPress={openWritten} />
        </View>
      </ActionSheet>

      <ActionSheet
        visible={sheet === 'binary'}
        title="Revisar recuerdo"
        onRequestClose={() => { if (!active) { setSheet(null); setBinaryDraft(null); } }}
        closeDisabled={active}
        size="scrollable-content"
        footer={(
          <AppButton
            title={binarySubmitLabel(state.status)}
            loading={active}
            disabled={!binaryDraft || active || Boolean(semanticDateDraftError(binaryDate))}
            onPress={() => void (state.status === 'failed' ? service.retry() : submitBinary())}
          />
        )}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          {binaryDraft?.artifact.mimeType.startsWith('image/') ? (
            <Image source={{ uri: binaryDraft.artifact.localUri }} resizeMode="cover" style={styles.preview} accessibilityLabel="Vista previa del recuerdo" />
          ) : binaryDraft ? (
            <View style={styles.videoPreview}>
              <HomePlusIcon name="videocam-outline" size={36} color={colors.text.secondary} />
              <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>{binaryDraft.artifact.displayName}</AppText>
            </View>
          ) : null}
          <AppInput
            label="Texto (opcional)"
            value={binaryCaption}
            onChangeText={setBinaryCaption}
            editable={!active}
            placeholder="Contá algo sobre este momento…"
            variant="multiline"
          />
          <MemorySemanticDateFields value={binaryDate} onChange={setBinaryDate} disabled={active} />
          <MemoryAlbumSelector albums={albums} value={binaryAlbumId} onChange={setBinaryAlbumId} disabled={active} />
          {state.status === 'failed' ? (
            <View style={styles.error}>
              <AppText variant="bodySmall" tone="danger">{state.error ?? 'No pudimos guardar este recuerdo.'}</AppText>
            </View>
          ) : null}
        </ScrollView>
      </ActionSheet>

      <ActionSheet
        visible={sheet === 'written'}
        title="Escribir un recuerdo"
        onRequestClose={() => { if (!writtenSubmitting) setSheet(null); }}
        closeDisabled={writtenSubmitting}
        size="scrollable-content"
        footer={(
          <AppButton
            title={writtenSubmitting ? 'Guardando…' : 'Guardar recuerdo'}
            loading={writtenSubmitting}
            disabled={!writtenText.trim() || writtenSubmitting || Boolean(semanticDateDraftError(writtenDate))}
            onPress={() => void submitWritten()}
          />
        )}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <AppInput
            label="Recuerdo"
            value={writtenText}
            onChangeText={(text) => { setWrittenText(text); setWrittenError(null); }}
            editable={!writtenSubmitting}
            autoFocus
            placeholder="Escribí el momento que quieren conservar…"
            variant="multiline"
          />
          <MemorySemanticDateFields value={writtenDate} onChange={setWrittenDate} disabled={writtenSubmitting} />
          <MemoryAlbumSelector albums={albums} value={writtenAlbumId} onChange={setWrittenAlbumId} disabled={writtenSubmitting} />
          {writtenError ? <AppText variant="bodySmall" tone="danger">{writtenError}</AppText> : null}
        </ScrollView>
      </ActionSheet>
    </>
  );
}

function MemoryAlbumSelector({ albums, value, onChange, disabled }: {
  albums: MemoryIntakeDestination[];
  value: string | null;
  onChange: (albumId: string | null) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.albumSection}>
      <AppText variant="caption" tone="secondary" weight="700">{'Álbum (opcional)'}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumList}>
        {albums.length === 0 ? <FilterChip label="Sin álbum" selected disabled={disabled} /> : albums.map((album) => {
          const albumId = album.id === 'root' ? null : album.id;
          return <FilterChip key={album.id} label={album.id === 'root' ? 'Sin álbum' : album.name} selected={value === albumId} disabled={disabled} onPress={() => onChange(albumId)} />;
        })}
      </ScrollView>
    </View>
  );
}

function binarySubmitLabel(status: MemoryIntakeState['status']): string {
  if (status === 'preparing') return 'Guardando…';
  if (status === 'uploading') return 'Subiendo…';
  if (status === 'verifying') return 'Procesando…';
  if (status === 'finalizing') return 'Guardando…';
  if (status === 'failed') return 'Reintentar';
  return 'Guardar recuerdo';
}

const styles = StyleSheet.create({
  actions: { gap: spacing[3], paddingBottom: spacing[2] },
  form: { gap: spacing[4], paddingBottom: spacing[4] },
  preview: { width: '100%', height: 210, borderRadius: radius.lg, backgroundColor: colors.background.alt },
  videoPreview: { minHeight: 150, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4] },
  albumSection: { gap: spacing[2] },
  albumList: { gap: spacing[2], paddingRight: spacing[4] },
  error: { gap: spacing[2], alignItems: 'flex-start' },
});
