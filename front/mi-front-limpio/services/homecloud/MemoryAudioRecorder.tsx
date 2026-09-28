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

export function MemoryAudioRecorder({ onReady, onCancel, attempt, ownsAttempt }: {
  onReady: (draft: BinaryMemoryDraft, attempt: MemoryAttempt) => void;
  onCancel: () => void;
  attempt: MemoryAttempt;
  ownsAttempt: (attempt: MemoryAttempt) => boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const capturedAtRef = useRef<string | null>(null);
  const canAskAgainRef = useRef(true);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);

  const returnToPlaybackMode = useCallback(async () => {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
    memoryAttemptTrace(attempt, 'audio_session_transition', { mode: 'playback' });
  }, [attempt]);

  const stopAndDiscard = useCallback(async () => {
    operationRef.current += 1;
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* cleanup remains idempotent */ }
    const uri = recorder.uri ?? recorder.getStatus().url;
    await returnToPlaybackMode().catch(() => {});
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }, [recorder, returnToPlaybackMode]);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') void stopAndDiscard(); });
    return () => { mountedRef.current = false; subscription.remove(); void stopAndDiscard(); memoryAttemptTrace(attempt, 'unmount'); };
  }, [attempt, stopAndDiscard]);

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
      const stopped = recorder.getStatus(); const durationMillis = Math.max(durationBeforeStop, stopped.durationMillis); const uri = recorder.uri ?? stopped.url;
      memoryAttemptTrace(attempt, 'recording_uri', { present: Boolean(uri), durationMillis });
      if (!uri || !capturedAtRef.current || durationMillis <= 0) throw new Error('empty recording');
      const info = await FileSystem.getInfoAsync(uri); memoryAttemptTrace(attempt, 'file_info', { exists: info.exists, sizeBytes: info.exists ? info.size ?? null : null });
      if (!info.exists || typeof info.size !== 'number' || info.size <= 0) throw new Error('empty recording file');
      const draft = await persistRecordedAudio(uri, capturedAtRef.current, durationMillis, attempt); memoryAttemptTrace(attempt, 'durable_copy', { sizeBytes: draft.artifact.sizeBytes });
      await returnToPlaybackMode();
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) { await discardMemoryMedia(draft.artifact).catch(() => {}); return; }
      setPhase('recorded'); memoryAttemptTrace(attempt, 'audio_review_requested'); onReady(draft, attempt);
    } catch (caught) {
      await returnToPlaybackMode().catch(() => {});
      if (mountedRef.current && operationRef.current === operation && ownsAttempt(attempt)) { setError('No pudimos preparar la grabación. Podés intentarlo otra vez.'); setPhase('error'); memoryAttemptTrace(attempt, 'error', { step: 'stop', message: caught instanceof Error ? caught.message : 'unknown' }); }
    }
  };

  const cancel = async () => { setPhase('stopping'); await stopAndDiscard(); if (mountedRef.current) onCancel(); };

  return <View style={styles.body}>
    <View style={styles.timer}><AppText variant="title2" weight="800">{formatDuration(recorderState.durationMillis / 1000)}</AppText><AppText tone="secondary">{phase === 'recording' ? 'Grabando…' : phase === 'stopping' ? 'Preparando audio…' : phase === 'recorded' ? 'Grabación lista' : 'Listo para grabar'}</AppText></View>
    {phase === 'denied' ? <><AppText tone="danger" align="center">HomePlus necesita acceso al micrófono para grabar audio.</AppText>{canAskAgainRef.current ? <AppButton title="Reintentar permiso" onPress={() => void start()} /> : <AppButton title="Abrir configuración" onPress={() => void Linking.openSettings()} />}</> : null}
    {error ? <AppText tone="danger" align="center">{error}</AppText> : null}
    {phase === 'recording' ? <AppButton title="Detener" onPress={() => void stop()} /> : !['stopping', 'denied', 'recorded'].includes(phase) ? <AppButton title={phase === 'preparing' ? 'Preparando…' : 'Comenzar grabación'} loading={phase === 'preparing'} disabled={phase === 'preparing'} onPress={() => void start()} /> : null}
    <AppButton title="Cancelar" variant="secondary" disabled={phase === 'stopping' || phase === 'recorded'} onPress={() => void cancel()} />
  </View>;
}

const styles = StyleSheet.create({ body: { gap: spacing[3], paddingBottom: spacing[2] }, timer: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderRadius: radius.lg, backgroundColor: colors.brandSoft } });
