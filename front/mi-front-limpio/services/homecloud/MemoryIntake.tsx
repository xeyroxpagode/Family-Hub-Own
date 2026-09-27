import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, ScrollView, StyleSheet, View } from 'react-native';

import { ActionSheet, AppButton, AppInput, AppText, FilterChip } from '../../components/ui';
import { MemorySemanticDateFields } from '../../components/homecloud/MemorySemanticDateFields';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { generateMutationId } from '../api';
import { createMemoryIntakeService } from './homecloudMemoryIntakeService';
import { createWrittenMemory } from './homecloudWrittenMemoryService';
import {
  formatMediaCaptureDate,
  memoryRegisterCaptureFields,
  type MediaCaptureMetadata,
} from './homecloudMediaCaptureMetadata';
import {
  emptySemanticDateDraft,
  semanticDateDraftError,
  semanticDateValueFromDraft,
  type SemanticDateDraft,
} from './homecloudSemanticDate';
import type { BinaryMemoryDraft, MemoryIntakeConfig, MemoryIntakeDestination, MemoryIntakeState } from './homecloudMemoryIntakeTypes';

export interface MemoryIntakeProps {
  config: MemoryIntakeConfig;
  onComplete?: (contentId: string) => void;
}

type Sheet = 'create' | 'binary' | 'written' | null;

/**
 * HomeCloud STAGE 4C.1.1 — Memory create runtime recovery.
 *
 * PICKER REUSE (the confirmed runtime bug)
 * -----------------------------------------
 * ROOT CAUSE was an illegal presentation order: `chooseMedia` dismissed this
 * component's `ActionSheet` Modal and then presented the native gallery picker
 * in the same JS turn. iOS only allows presenting from the top-most presented
 * controller, so the native presentation was dropped and
 * `launchImageLibraryAsync` never settled. Because the only "picker is busy"
 * guard was the derived `state.status === 'picking'` (set by the service and
 * cleared only on settle), a dropped presentation left that status stuck and the
 * `+` trigger permanently `disabled` — the picker could never be reopened.
 *
 * The fix is behavioural, not a timer: the create sheet now STAYS PRESENTED
 * while the native picker is up (the pattern already proven by
 * `FileIntake.handlePickFile`), so the presentation is always legal, and the
 * pending guard is owned locally by `pickingRef` and released in a `finally` on
 * every exit path. On top of that, CLOSING the create sheet is an explicit,
 * user-driven reset that also releases the guard — so no state can ever brick
 * Create. `pickerAttemptRef` gives each attempt ownership so a late resolve
 * can never overwrite a newer draft, and a double tap cannot open two pickers.
 *
 * RESET CONTRACT
 * - SUCCESS: draft, picker guard and transient state are cleared; Create is
 *   immediately reusable.
 * - CANCEL: the create sheet stays open with the guard released, so the very
 *   same button opens the picker again; an abandoned artifact copy is deleted.
 * - ERROR: the Review keeps the draft and the error so Retry works, and the
 *   picker guard is released regardless.
 * - CLOSE: every transient flag is dropped and the guard released; Create is
 *   ready to open again without remounting anything.
 */
export function MemoryIntake({ config, onComplete }: MemoryIntakeProps) {
  const { householdId, accessToken, capabilities, initialAlbumId, initialAlbumName, intakeSource } = config;
  const [state, setState] = useState<MemoryIntakeState>({ status: 'idle' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [albums, setAlbums] = useState<MemoryIntakeDestination[]>([]);
  const [binaryDraft, setBinaryDraft] = useState<BinaryMemoryDraft | null>(null);
  const [binaryCaption, setBinaryCaption] = useState('');
  const [binaryAlbumId, setBinaryAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [picking, setPicking] = useState(false);
  const [writtenText, setWrittenText] = useState('');
  const [writtenDate, setWrittenDate] = useState<SemanticDateDraft>(emptySemanticDateDraft);
  const [writtenAlbumId, setWrittenAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [writtenSubmitting, setWrittenSubmitting] = useState(false);
  const [writtenError, setWrittenError] = useState<string | null>(null);
  const writtenRequestId = useRef<string | null>(null);
  const notifiedContentId = useRef<string | null>(null);
  // Local owner of the pending picker guard. A ref (not derived state) so a
  // double tap in the same tick is refused synchronously.
  const pickingRef = useRef(false);
  // Attempt ownership: only the newest attempt may commit its draft.
  const pickerAttemptRef = useRef(0);
  const mountedRef = useRef(true);

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
    mountedRef.current = true;
    const unsubscribe = service.subscribe(setState);
    void service.loadAlbums().then(() => setAlbums(service.getAvailableDestinations()));
    void service.recover();
    return () => {
      mountedRef.current = false;
      // Unmount must never leave a pending guard behind.
      pickingRef.current = false;
      unsubscribe();
    };
  }, [service]);

  /** Drop the picked-but-never-uploaded copy so CANCEL/CLOSE do not leak it. */
  const discardDraftArtifact = useCallback((draft: BinaryMemoryDraft | null) => {
    if (!draft) return;
    void import('./homecloudMemoryPicker')
      .then(({ discardMemoryMedia }) => discardMemoryMedia(draft.artifact))
      .catch(() => {
        // Best effort: a leftover copy is a storage concern, never a failure.
      });
  }, []);

  /** SUCCESS contract: draft + picker transient state cleared, Create reusable. */
  const clearBinaryDraft = useCallback(() => {
    setBinaryDraft(null);
    setBinaryCaption('');
    setBinaryAlbumId(initialAlbumId ?? null);
  }, [initialAlbumId]);

  useEffect(() => {
    if (state.status !== 'completed' || !state.contentId || notifiedContentId.current === state.contentId) return;
    notifiedContentId.current = state.contentId;
    clearBinaryDraft();
    setSheet(null);
    onComplete?.(state.contentId);
  }, [clearBinaryDraft, onComplete, state.contentId, state.status]);

  const active = ['preparing', 'uploading', 'verifying', 'finalizing'].includes(state.status);
  // The trigger depends on the LOCAL guard only. A remote status that could be
  // orphaned must never be able to disable the only entry point.
  const triggerDisabled = !capabilities.contribute || active || picking;
  // Owned by the service, not by local state: `pickMemory` clears the previous
  // error on every new attempt, so a failure is shown exactly where it happened
  // (the create sheet) and can never leak into the next Review.
  const pickingError = state.status === 'failed' ? state.error ?? 'No pudimos seleccionar la foto o el video.' : null;

  const chooseMedia = useCallback(async () => {
    if (pickingRef.current) return;
    pickingRef.current = true;
    const attempt = pickerAttemptRef.current + 1;
    pickerAttemptRef.current = attempt;
    setPicking(true);
    Keyboard.dismiss();
    // The create sheet deliberately STAYS presented while the native picker is
    // up: dismissing it first is what made the presentation illegal on iOS.
    try {
      const draft = await service.pickMemory();
      if (!draft) return;
      if (!mountedRef.current || pickerAttemptRef.current !== attempt) return;
      setBinaryDraft(draft);
      setBinaryCaption('');
      setBinaryAlbumId(initialAlbumId ?? null);
      setSheet('binary');
    } finally {
      if (pickerAttemptRef.current === attempt) pickingRef.current = false;
      if (mountedRef.current) setPicking(false);
    }
  }, [initialAlbumId, service]);

  /** CLOSE contract: nothing transient survives, Create is ready to reopen. */
  const closeCreate = useCallback(() => {
    pickerAttemptRef.current += 1;
    pickingRef.current = false;
    setPicking(false);
    service.dismiss();
    setSheet(null);
  }, [service]);

  const closeReview = useCallback(() => {
    discardDraftArtifact(binaryDraft);
    clearBinaryDraft();
    // CLOSE means the Memory was abandoned, so its error must not survive into
    // the next flow. The durable job stays in the shared store untouched, and
    // failed jobs are never auto-resumed by recovery (retry stays explicit).
    service.dismiss();
    setSheet(null);
  }, [binaryDraft, clearBinaryDraft, discardDraftArtifact, service]);

  const submitBinary = useCallback(async () => {
    if (!binaryDraft || active) return;
    const capture = binaryDraft.capture;
    await service.createBinaryMemory(binaryDraft, {
      caption: binaryCaption.trim() || null,
      initialAlbumId: binaryAlbumId,
      ...memoryRegisterCaptureFields(capture),
    });
  }, [active, binaryAlbumId, binaryCaption, binaryDraft, service]);

  const submitWritten = useCallback(async () => {
    if (writtenSubmitting || !writtenText.trim() || semanticDateDraftError(writtenDate)) return;
    setWrittenSubmitting(true);
    setWrittenError(null);
    if (!writtenRequestId.current) writtenRequestId.current = generateMutationId();
    try {
      Keyboard.dismiss();
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
    Keyboard.dismiss();
    setWrittenText('');
    setWrittenDate(emptySemanticDateDraft());
    setWrittenAlbumId(initialAlbumId ?? null);
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
        disabled={triggerDisabled}
        accessibilityLabel="Crear recuerdo"
      >
        <HomePlusIcon name="add" size={24} color={colors.brand} />
      </AppButton>

      <ActionSheet visible={sheet === 'create'} title="Guardar un recuerdo" onRequestClose={closeCreate} size="content">
        <View style={styles.actions}>
          <AppButton
            title={picking ? 'Abriendo tus fotos…' : 'Elegir fotos o videos'}
            loading={picking}
            disabled={picking}
            onPress={() => void chooseMedia()}
          />
          <AppButton title="Escribir un recuerdo" variant="secondary" onPress={openWritten} disabled={picking} />
          {pickingError ? (
            <View style={styles.error}>
              <AppText variant="bodySmall" tone="danger">{pickingError}</AppText>
            </View>
          ) : null}
        </View>
      </ActionSheet>

      <ActionSheet
        visible={sheet === 'binary'}
        title="Revisar recuerdo"
        subtitle={binaryDraft ? formatMediaCaptureDate(binaryDraft.capture) : undefined}
        onRequestClose={() => { if (!active) closeReview(); }}
        closeDisabled={active}
        size="scrollable-content"
        keyboardAware
        footer={(
          <AppButton
            title={binarySubmitLabel(state.status)}
            loading={active}
            disabled={!binaryDraft || active}
            onPress={() => { Keyboard.dismiss(); void (state.status === 'failed' ? service.retry() : submitBinary()); }}
          />
        )}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.form}
        >
          {binaryDraft?.artifact.mimeType.startsWith('image/') ? (
            <Image source={{ uri: binaryDraft.artifact.localUri }} resizeMode="cover" style={styles.preview} accessibilityLabel="Vista previa del recuerdo" />
          ) : binaryDraft ? (
            // The VIDEO is the content. Its original filename is technical
            // metadata and is never shown as the identity of the Memory.
            <View style={styles.videoPreview} accessibilityLabel="Vista previa del video">
              <HomePlusIcon name="videocam-outline" size={36} color={colors.text.secondary} />
              <AppText variant="bodySmall" tone="secondary">Video</AppText>
            </View>
          ) : null}
          <MemoryCaptureSummary capture={binaryDraft?.capture} />
          <AppInput
            label="Texto (opcional)"
            value={binaryCaption}
            onChangeText={setBinaryCaption}
            editable={!active}
            placeholder="Contá algo sobre este momento…"
            variant="multiline"
            returnKeyType="done"
            blurOnSubmit
          />
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
        keyboardAware
        footer={(
          <AppButton
            title={writtenSubmitting ? 'Guardando…' : 'Guardar recuerdo'}
            loading={writtenSubmitting}
            disabled={!writtenText.trim() || writtenSubmitting || Boolean(semanticDateDraftError(writtenDate))}
            onPress={() => void submitWritten()}
          />
        )}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.form}
        >
          <AppInput
            label="Recuerdo"
            value={writtenText}
            onChangeText={(text) => { setWrittenText(text); setWrittenError(null); }}
            editable={!writtenSubmitting}
            autoFocus
            placeholder="Escribí el momento que quieren conservar…"
            variant="multiline"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => void submitWritten()}
          />
          <MemorySemanticDateFields value={writtenDate} onChange={setWrittenDate} disabled={writtenSubmitting} />
          <MemoryAlbumSelector albums={albums} value={writtenAlbumId} onChange={setWrittenAlbumId} disabled={writtenSubmitting} />
          {writtenError ? <AppText variant="bodySmall" tone="danger">{writtenError}</AppText> : null}
        </ScrollView>
      </ActionSheet>
    </>
  );
}

/**
 * Informational, non-interactive summary of the semantic date the gallery
 * already knows. A photo/video does NOT get asked to grade its own precision:
 * there is no "exact / month-year / year / no date" choice here, only the
 * honest result ("12 ene 2024" or "Sin fecha").
 */
function MemoryCaptureSummary({ capture }: { capture: MediaCaptureMetadata | undefined }) {
  return (
    <View style={styles.captureSummary} accessibilityLabel={`Fecha del recuerdo: ${formatMediaCaptureDate(capture ?? { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' })}`}>
      <AppText variant="caption" tone="secondary" weight="700">{'Fecha'}</AppText>
      <AppText variant="bodySmall" tone={capture?.capturePrecision === 'exact' ? 'primary' : 'secondary'}>
        {formatMediaCaptureDate(capture ?? { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' })}
      </AppText>
      <AppText variant="caption" tone="tertiary">
        {capture?.capturePrecision === 'exact'
          ? 'Tomada de la galería.'
          : 'Este archivo no trae fecha, así que queda como Sin fecha.'}
      </AppText>
    </View>
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
  captureSummary: { gap: spacing[1] },
  albumSection: { gap: spacing[2] },
  albumList: { gap: spacing[2], paddingRight: spacing[4] },
  error: { gap: spacing[2], alignItems: 'flex-start' },
});
