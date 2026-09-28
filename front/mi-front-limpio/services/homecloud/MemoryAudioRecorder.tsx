import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { AppButton, AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import type { BinaryMemoryDraft } from './homecloudMemoryIntakeTypes';
import { persistRecordedAudio } from './homecloudMemoryPicker';
import { formatDuration } from './MemoryMediaReview';

export function MemoryAudioRecorder({ onReady, onCancel }: { onReady: (draft: BinaryMemoryDraft) => void; onCancel: () => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recording' | 'saving' | 'denied' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const capturedAtRef = useRef<string | null>(null);
  const canAskAgainRef = useRef(true);

  useEffect(() => () => {
    if (recorder.isRecording) void recorder.stop().then(() => {
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (uri) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }).catch(() => {});
    void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [recorder]);

  const start = async () => {
    setPhase('preparing'); setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      canAskAgainRef.current = permission.canAskAgain;
      if (!permission.granted) { setPhase('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      capturedAtRef.current = new Date().toISOString();
      recorder.record();
      setPhase('recording');
    } catch { setError('No pudimos iniciar la grabación. Probá de nuevo.'); setPhase('error'); }
  };
  const stop = async () => {
    if (!recorderState.isRecording) return;
    setPhase('saving');
    try {
      const durationBeforeStop = recorderState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const stopped = recorder.getStatus();
      const durationMillis = Math.max(durationBeforeStop, stopped.durationMillis);
      const uri = recorder.uri ?? stopped.url;
      if (!uri || !capturedAtRef.current || durationMillis <= 0) throw new Error('empty recording');
      onReady(await persistRecordedAudio(uri, capturedAtRef.current, durationMillis));
    } catch { setError('No pudimos preparar la grabación. Podés intentarlo otra vez.'); setPhase('error'); }
  };
  const cancel = async () => {
    if (recorder.isRecording) {
      setPhase('saving');
      try { await recorder.stop(); } catch { /* unmount cleanup remains best-effort */ }
      const uri = recorder.uri ?? recorder.getStatus().url;
      if (uri) void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
    onCancel();
  };

  return <View style={styles.body}>
    <View style={styles.timer}><AppText variant="title2" weight="800">{formatDuration(recorderState.durationMillis / 1000)}</AppText><AppText tone="secondary">{phase === 'recording' ? 'Grabando…' : phase === 'saving' ? 'Preparando audio…' : 'Listo para grabar'}</AppText></View>
    {phase === 'denied' ? <><AppText tone="danger" align="center">HomePlus necesita acceso al micrófono para grabar audio.</AppText>{canAskAgainRef.current ? <AppButton title="Reintentar permiso" onPress={() => void start()} /> : <AppButton title="Abrir configuración" onPress={() => void Linking.openSettings()} />}</> : null}
    {error ? <AppText tone="danger" align="center">{error}</AppText> : null}
    {phase === 'recording' ? <AppButton title="Detener" onPress={() => void stop()} /> : phase !== 'saving' && phase !== 'denied' ? <AppButton title={phase === 'preparing' ? 'Preparando…' : 'Comenzar grabación'} loading={phase === 'preparing'} disabled={phase === 'preparing'} onPress={() => void start()} /> : null}
    <AppButton title="Cancelar" variant="secondary" disabled={phase === 'saving'} onPress={() => void cancel()} />
  </View>;
}

const styles = StyleSheet.create({ body: { gap: spacing[3], paddingBottom: spacing[2] }, timer: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderRadius: radius.lg, backgroundColor: colors.brandSoft } });
