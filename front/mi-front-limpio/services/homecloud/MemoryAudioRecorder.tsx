import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { AppButton, AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import type { BinaryMemoryDraft } from './homecloudMemoryIntakeTypes';
import type { MemoryAttempt } from './homecloudMemoryAttempt';
import { memoryAttemptTrace } from './homecloudMemoryDiagnostics';
import { discardMemoryMedia, persistRecordedAudio } from './homecloudMemoryPicker';
import { formatDuration } from './MemoryMediaReview';

type Phase = 'idle' | 'preparing' | 'recording' | 'stopping' | 'recorded' | 'denied' | 'error';

/**
 * Handle the host uses to finish the recording BEFORE this component leaves.
 * The native recorder is owned by `useAudioRecorder`, which releases the shared
 * object on unmount, and the release cleanup is registered before this
 * component's own effects — so after unmount the recorder must never be read
 * again. Abandoning explicitly (while still mounted) is the only correct
 * teardown for a recording that is still in flight.
 */
export interface MemoryAudioRecorderHandle {
  /** Stop an in-flight recording and release the audio session. Safe to call twice. */
  abandon: () => void;
}

export function MemoryAudioRecorder({ onReady, onCancel, attempt, ownsAttempt, abandonRef }: {
  onReady: (draft: BinaryMemoryDraft, attempt: MemoryAttempt) => void;
  onCancel: () => void;
  attempt: MemoryAttempt;
  ownsAttempt: (attempt: MemoryAttempt) => boolean;
  abandonRef?: (handle: MemoryAudioRecorderHandle | null) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const capturedAtRef = useRef<string | null>(null);
  const canAskAgainRef = useRef(true);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  /**
   * Everything the teardown needs, captured WHILE the recorder is still valid.
   * After unmount the teardown reads only this ref: never `recorder.uri`,
   * never `recorder.getStatus()`.
   */
  const pendingUriRef = useRef<string | null>(null);
  const recordedRef = useRef(false);
  // The host's close path calls this. It resolves to `cancel()` at press time so
  // the effect below never re-registers for a changing callback identity.
  const cancelRef = useRef<() => void>(() => {});

  const returnToPlaybackMode = useCallback(async () => {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
    memoryAttemptTrace(attempt, 'audio_session_transition', { mode: 'playback' });
  }, [attempt]);

  /**
   * Recorder teardown. ONLY ever invoked while this component is still mounted:
   * by the AppState listener, by `cancel`, or by the host's abandon handle. The
   * unmount cleanup below deliberately does NOT call it, because
   * `useAudioRecorder` has already released the native object by then.
   * Idempotent: the captured URI is consumed once, so AppState + unmount, or
   * Cancel + unmount, collapse into a single native stop and a single delete.
   */
  const stopAndDiscard = useCallback(async () => {
    operationRef.current += 1;
    let uri = pendingUriRef.current;
    if (!uri) { try { uri = recorder.uri ?? recorder.getStatus().url ?? null; } catch { uri = null; } }
    if (recorder.isRecording) { try { await recorder.stop(); } catch { /* best-effort teardown stays idempotent */ } }
    pendingUriRef.current = null;
    await returnToPlaybackMode().catch(() => {});
    if (uri && !recordedRef.current) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }, [recorder, returnToPlaybackMode]);

  const cancel = useCallback(async () => {
    setPhase('stopping');
    await stopAndDiscard();
    if (mountedRef.current) onCancelRef.current();
  }, [stopAndDiscard]);
  cancelRef.current = () => { void cancel(); };

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') void stopAndDiscard(); });
    return () => {
      mountedRef.current = false; subscription.remove();
      // Unmount cleanup owns only NON-native resources: the AppState listener,
      // the audio session and the cached temporary file. `useAudioRecorder`
      // already released the recorder, so stop/get/uri must never be called here.
      const uri = pendingUriRef.current; pendingUriRef.current = null;
      if (uri && !recordedRef.current) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      void returnToPlaybackMode().catch(() => {});
      memoryAttemptTrace(attempt, 'unmount', { recorderOwnership: 'released_by_useAudioRecorder' });
    };
  }, [attempt, returnToPlaybackMode, stopAndDiscard]);

  // The host routes "close the recorder sheet" through here, so an in-flight
  // native recording is always finished while the recorder is still valid and
  // the sheet is left by the recorder itself (through `onCancel`).
  useEffect(() => {
    if (!abandonRef) return undefined;
    abandonRef({ abandon: () => { cancelRef.current(); } });
    return () => abandonRef(null);
  }, [abandonRef]);

  const start = async () => {
    const operation = ++operationRef.current; setPhase('preparing'); setError(null); memoryAttemptTrace(attempt, 'source_start');
    try {
      const permission = await requestRecordingPermissionsAsync(); canAskAgainRef.current = permission.canAskAgain; memoryAttemptTrace(attempt, 'permission', { microphone: permission.granted });
      if (!ownsAttempt(attempt) || operationRef.current !== operation || !mountedRef.current) return;
      if (!permission.granted) { setPhase('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
      await recorder.prepareToRecordAsync();
      if (!ownsAttempt(attempt) || operationRef.current !== operation || !mountedRef.current) return;
      capturedAtRef.current = new Date().toISOString(); recorder.record(); setPhase('recording'); memoryAttemptTrace(attempt, 'record_start');
    } catch (caught) { if (mountedRef.current && operationRef.current === operation && ownsAttempt(attempt)) { setError('No pudimos iniciar la grabación. Probá de nuevo.'); setPhase('error'); memoryAttemptTrace(attempt, 'error', { step: 'prepare', message: caught instanceof Error ? caught.message : 'unknown' }); } }
  };

  const stop = async () => {
    if (!recorderState.isRecording || phase !== 'recording') return;
    const operation = ++operationRef.current; setPhase('stopping'); memoryAttemptTrace(attempt, 'stop_requested');
    try {
      const durationBeforeStop = recorderState.durationMillis;
      await recorder.stop(); memoryAttemptTrace(attempt, 'stop_completed');
      // EVERY native read happens here, while the recorder is still valid.
      const stopped = recorder.getStatus(); const durationMillis = Math.max(durationBeforeStop, stopped.durationMillis); const uri = recorder.uri ?? stopped.url;
      memoryAttemptTrace(attempt, 'recording_uri', { present: Boolean(uri), durationMillis });
      if (!uri || !capturedAtRef.current || durationMillis <= 0) throw new Error('empty recording');
      pendingUriRef.current = uri;
      const info = await FileSystem.getInfoAsync(uri); memoryAttemptTrace(attempt, 'file_info', { exists: info.exists, sizeBytes: info.exists ? info.size ?? null : null });
      if (!info.exists || typeof info.size !== 'number' || info.size <= 0) throw new Error('empty recording file');
      const draft = await persistRecordedAudio(uri, capturedAtRef.current, durationMillis, attempt); memoryAttemptTrace(attempt, 'durable_copy', { sizeBytes: draft.artifact.sizeBytes });
      // The durable copy owns the media from here; the recorder temp is already
      // gone and nothing native may be touched during the handoff.
      pendingUriRef.current = null; recordedRef.current = true;
      await returnToPlaybackMode();
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) { await discardMemoryMedia(draft.artifact).catch(() => {}); return; }
      setPhase('recorded'); memoryAttemptTrace(attempt, 'audio_review_requested'); onReady(draft, attempt);
    } catch (caught) {
      pendingUriRef.current = null;
      await returnToPlaybackMode().catch(() => {});
      if (mountedRef.current && operationRef.current === operation && ownsAttempt(attempt)) { setError('No pudimos preparar la grabación. Podés intentarlo otra vez.'); setPhase('error'); memoryAttemptTrace(attempt, 'error', { step: 'stop', message: caught instanceof Error ? caught.message : 'unknown' }); }
    }
  };

  return <View style={styles.body}>
    <View style={styles.timer}><AppText variant="title2" weight="800">{formatDuration(recorderState.durationMillis / 1000)}</AppText><AppText tone="secondary">{phase === 'recording' ? 'Grabando…' : phase === 'stopping' ? 'Preparando audio…' : phase === 'recorded' ? 'Grabación lista' : 'Listo para grabar'}</AppText></View>
    {phase === 'denied' ? <><AppText tone="danger" align="center">HomePlus necesita acceso al micrófono para grabar audio.</AppText>{canAskAgainRef.current ? <AppButton title="Reintentar permiso" onPress={() => void start()} /> : <AppButton title="Abrir configuración" onPress={() => void Linking.openSettings()} />}</> : null}
    {error ? <AppText tone="danger" align="center">{error}</AppText> : null}
    {phase === 'recording' ? <AppButton title="Detener" onPress={() => void stop()} /> : !['stopping', 'denied', 'recorded'].includes(phase) ? <AppButton title={phase === 'preparing' ? 'Preparando…' : 'Comenzar grabación'} loading={phase === 'preparing'} disabled={phase === 'preparing'} onPress={() => void start()} /> : null}
    <AppButton title="Cancelar" variant="secondary" disabled={phase === 'stopping' || phase === 'recorded'} onPress={() => void cancel()} />
  </View>;
}

const styles = StyleSheet.create({ body: { gap: spacing[3], paddingBottom: spacing[2] }, timer: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderRadius: radius.lg, backgroundColor: colors.brandSoft } });
