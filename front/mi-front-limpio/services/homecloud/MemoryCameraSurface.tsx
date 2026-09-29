import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Modal, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText, SegmentedControl } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import type { BinaryMemoryDraft } from './homecloudMemoryIntakeTypes';
import type { MemoryAttempt } from './homecloudMemoryAttempt';
import { memoryAttemptTrace } from './homecloudMemoryDiagnostics';
import { discardMemoryMedia, persistCameraCapture } from './homecloudMemoryPicker';
import { MemoryVideoPreview, formatDuration } from './MemoryMediaReview';

type CameraMode = 'picture' | 'video';
type Phase = 'ready' | 'capturing' | 'recording' | 'stopping' | 'captured' | 'using' | 'error';
type Capture = { uri: string; kind: 'image' | 'video'; capturedAt: string; durationMillis: number | null };

async function deleteTemp(uri: string | null | undefined) { if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }

export function MemoryCameraSurface({
  onClose, onUse, beginAttempt, ownsAttempt,
}: {
  onClose: () => void;
  onUse: (draft: BinaryMemoryDraft, attempt: MemoryAttempt) => void;
  beginAttempt: (kind: 'image' | 'video') => MemoryAttempt;
  ownsAttempt: (attempt: MemoryAttempt) => boolean;
}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [initialAttempt] = useState(() => beginAttempt('image'));
  const attemptRef = useRef<MemoryAttempt>(initialAttempt);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const captureRef = useRef<Capture | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [mode, setMode] = useState<CameraMode>('picture');
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  /**
   * READINESS AFTER A MODE/FACING CHANGE (confirmed runtime blocker)
   * ---------------------------------------------------------------
   * `onCameraReady` is a MOUNT event: the installed expo-camera build only
   * reports it when the native view is created, so flipping `mode` (Foto → Video)
   * on an already mounted CameraView left `ready` stuck at `false` forever. The
   * shutter then stayed grey and `recordAsync` was never reachable, even though
   * the surface was perfectly usable.
   *
   * The fix is an explicit, controlled remount of the CameraView keyed by the
   * capture configuration. Everything the surface owns lives OUTSIDE
   * CameraView — `facing`, the attempt, the permissions, the AppState and the
   * current phase — so a remount recovers readiness without losing any of them,
   * and without a forced `disabled`, a timer, or a permission bypass.
   * `ready` still means exactly what it said: the native view reported ready.
   */
  const [surfaceSession, setSurfaceSession] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [capture, setCapture] = useState<Capture | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  // Synchronous native-recording gates. `phase` is React state, so two taps in
  // the same tick would both observe a stale `ready`/`recording` and could start
  // or stop the native recording twice.
  const recordStartLockRef = useRef(false);
  const stopRequestLockRef = useRef(false);

  const invalidateOperation = useCallback(() => { operationRef.current += 1; }, []);
  const stopNativeRecording = useCallback(() => { try { cameraRef.current?.stopRecording(); } catch { /* idempotent cleanup */ } }, []);
  /** Drop readiness and remount the native surface so it can report ready again. */
  const remountSurface = useCallback(() => { setReady(false); setSurfaceSession((value) => value + 1); }, []);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) { invalidateOperation(); stopNativeRecording(); setReady(false); setPhase('ready'); }
      else if (permission && !permission.granted) void getPermission();
    });
    return () => {
      mountedRef.current = false; invalidateOperation(); stopNativeRecording(); subscription.remove();
      void deleteTemp(captureRef.current?.uri); memoryAttemptTrace(attemptRef.current, 'unmount');
    };
  }, [getPermission, invalidateOperation, permission, stopNativeRecording]);

  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const tick = () => setElapsed(recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0);
    tick(); const id = setInterval(tick, 250); return () => clearInterval(id);
  }, [phase]);

  const replaceCapture = useCallback((next: Capture | null) => {
    const previous = captureRef.current; captureRef.current = next; setCapture(next);
    if (previous && previous.uri !== next?.uri) void deleteTemp(previous.uri);
  }, []);

  const switchMode = useCallback((next: CameraMode) => {
    if (phase !== 'ready' || next === mode) return;
    invalidateOperation(); const kind = next === 'picture' ? 'image' : 'video'; attemptRef.current = beginAttempt(kind);
    setMode(next); remountSurface(); setError(null); memoryAttemptTrace(attemptRef.current, 'source_start', { mode: next, from: mode });
  }, [beginAttempt, invalidateOperation, mode, phase, remountSurface]);

  const takePhoto = useCallback(async () => {
    const camera = cameraRef.current; if (!camera || !ready || phase !== 'ready') return;
    const attempt = attemptRef.current; const operation = ++operationRef.current; const capturedAt = new Date().toISOString();
    setPhase('capturing'); setError(null); memoryAttemptTrace(attempt, 'capture_start');
    try {
      // Preserve the exact artifact emitted by the selected camera engine.
      // `quality: 1` is its maximum processed quality, not a lossless claim.
      const result = await camera.takePictureAsync({ quality: 1, exif: true });
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) { await deleteTemp(result.uri); return; }
      replaceCapture({ uri: result.uri, kind: 'image', capturedAt, durationMillis: null }); setPhase('captured'); memoryAttemptTrace(attempt, 'capture_complete');
    } catch (caught) { if (mountedRef.current && operationRef.current === operation) { setError('No pudimos sacar la foto. Probá de nuevo.'); setPhase('error'); memoryAttemptTrace(attempt, 'error', { step: 'capture_photo', message: caught instanceof Error ? caught.message : 'unknown' }); } }
  }, [ownsAttempt, phase, ready, replaceCapture]);

  /**
   * The single record gate. It mirrors EXACTLY what the shutter button and
   * `startVideo`/`stopVideo` decide, so the trace can never describe a state
   * different from the one the user actually acted on.
   */
  const recordGate = useMemo(() => {
    const recording = phase === 'recording';
    const stopping = phase === 'stopping';
    return {
      ready,
      active: appActive && phase !== 'error',
      focused: isFocused,
      appActive,
      cameraPermission: permission?.granted ?? null,
      microphonePermission: microphonePermission?.granted ?? null,
      recording,
      stopping,
      refReady: cameraRef.current !== null,
      disabled: !ready || phase === 'capturing' || stopping || phase === 'error',
    };
  }, [appActive, isFocused, microphonePermission?.granted, permission?.granted, phase, ready]);

  const startVideo = useCallback(async () => {
    const camera = cameraRef.current;
    // `record_start_lock` makes `recordAsync` reachable exactly once per press
    // sequence: the lock is released only when the recording promise settles.
    if (!camera || !ready || phase !== 'ready' || recordStartLockRef.current) {
      if (mode === 'video') memoryAttemptTrace(attemptRef.current, 'camera_video record_gate', { ...recordGate, decision: 'refused' });
      return;
    }
    const attempt = attemptRef.current; const operation = ++operationRef.current; recordStartLockRef.current = true;
    memoryAttemptTrace(attempt, 'camera_video record_gate', { ...recordGate, decision: 'start' });
    try {
      const mic = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission(); memoryAttemptTrace(attempt, 'permission', { camera: true, microphone: mic.granted });
      if (!mic.granted) { if (ownsAttempt(attempt)) { setError('HomePlus necesita acceso al micrófono para grabar video.'); setPhase('error'); } return; }
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) return;
      const capturedAt = new Date().toISOString(); recordingStartedAtRef.current = Date.now(); stopRequestLockRef.current = false; setElapsed(0); setPhase('recording'); memoryAttemptTrace(attempt, 'record_start');
      const result = await camera.recordAsync();
      const durationMillis = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0; recordingStartedAtRef.current = null;
      if (!result) { if (mountedRef.current && operationRef.current === operation) { setError('No pudimos guardar el video.'); setPhase('error'); } return; }
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) { await deleteTemp(result.uri); return; }
      replaceCapture({ uri: result.uri, kind: 'video', capturedAt, durationMillis }); setPhase('captured'); memoryAttemptTrace(attempt, 'capture_complete', { durationMillis });
    } catch (caught) { if (mountedRef.current && operationRef.current === operation) { setError('No pudimos grabar el video. Probá de nuevo.'); setPhase('error'); memoryAttemptTrace(attempt, 'error', { step: 'record_video', message: caught instanceof Error ? caught.message : 'unknown' }); } }
    finally { recordStartLockRef.current = false; }
  }, [microphonePermission, mode, ownsAttempt, phase, ready, recordGate, replaceCapture, requestMicrophonePermission]);

  const stopVideo = useCallback(() => {
    if (phase !== 'recording' || stopRequestLockRef.current) return;
    stopRequestLockRef.current = true; setPhase('stopping');
    memoryAttemptTrace(attemptRef.current, 'camera_video record_gate', { ...recordGate, decision: 'stop' });
    memoryAttemptTrace(attemptRef.current, 'stop_requested'); stopNativeRecording();
  }, [phase, recordGate, stopNativeRecording]);

  const retake = useCallback(() => { invalidateOperation(); replaceCapture(null); setError(null); remountSurface(); setPhase('ready'); memoryAttemptTrace(attemptRef.current, 'cleanup', { reason: 'retake' }); }, [invalidateOperation, remountSurface, replaceCapture]);

  const acceptCapture = useCallback(async () => {
    const selected = captureRef.current; if (!selected || phase !== 'captured') return;
    const attempt = attemptRef.current; const operation = ++operationRef.current; setPhase('using');
    try {
      const outcome = await persistCameraCapture({ ...selected, attempt });
      if (!mountedRef.current || operationRef.current !== operation || !ownsAttempt(attempt)) { await discardMemoryMedia(outcome.artifact); return; }
      await deleteTemp(selected.uri); captureRef.current = null; setCapture(null); memoryAttemptTrace(attempt, 'review_requested');
      onUse({ artifact: outcome.artifact, capture: outcome.capture, source: outcome.source, durationMillis: outcome.durationMillis }, attempt);
    } catch (caught) { if (mountedRef.current && operationRef.current === operation) { setError('No pudimos preparar la captura. Podés reintentar.'); setPhase('captured'); memoryAttemptTrace(attempt, 'error', { step: 'artifact_copy', message: caught instanceof Error ? caught.message : 'unknown' }); } }
  }, [onUse, ownsAttempt, phase]);

  const close = useCallback(() => { invalidateOperation(); stopNativeRecording(); void deleteTemp(captureRef.current?.uri); captureRef.current = null; memoryAttemptTrace(attemptRef.current, 'cleanup', { reason: 'close' }); onClose(); }, [invalidateOperation, onClose, stopNativeRecording]);

  if (!permission) return <Modal visible statusBarTranslucent presentationStyle="fullScreen"><View style={styles.message}><ActivityIndicator color={colors.brand} /></View></Modal>;
  if (!permission.granted) return <Modal visible statusBarTranslucent presentationStyle="fullScreen"><View style={[styles.message, { paddingTop: insets.top }]}><HomePlusIcon name="camera-outline" size={40} color={colors.text.tertiary} /><AppText align="center">HomePlus necesita acceso a la cámara para capturar este momento.</AppText>{permission.canAskAgain ? <AppButton title="Permitir cámara" onPress={() => void requestPermission().then((value) => memoryAttemptTrace(attemptRef.current, 'permission', { camera: value.granted }))} /> : <AppButton title="Abrir configuración" onPress={() => void Linking.openSettings()} />}<AppButton title="Volver" variant="secondary" onPress={close} /></View></Modal>;

  return <Modal visible statusBarTranslucent presentationStyle="fullScreen" onRequestClose={close}>
    <View style={styles.screen}>
      {phase === 'captured' || phase === 'using' ? <View style={styles.confirmation}>
        <View style={[styles.confirmTop, { top: insets.top + spacing[2] }]}><AppButton variant="icon" size="sm" disabled={phase === 'using'} onPress={close} accessibilityLabel="Cancelar captura"><HomePlusIcon name="close" size={22} color={colors.text.primary} /></AppButton></View>
        {capture?.kind === 'image' ? <Image source={{ uri: capture.uri }} resizeMode="contain" style={styles.confirmMedia} /> : capture ? <MemoryVideoPreview uri={capture.uri} attempt={attemptRef.current} /> : null}
        {error ? <AppText tone="danger" align="center">{error}</AppText> : null}
        <View style={styles.confirmActions}><AppButton title="Repetir" variant="secondary" disabled={phase === 'using'} onPress={retake} style={styles.flex} /><AppButton title={capture?.kind === 'video' ? 'Usar video' : 'Usar foto'} loading={phase === 'using'} disabled={phase === 'using'} onPress={() => void acceptCapture()} style={styles.flex} /></View>
      </View> : <>
        {appActive && phase !== 'error' ? <CameraView key={`${mode}:${facing}:${surfaceSession}`} ref={cameraRef} active mode={mode} facing={facing} mute={false} style={StyleSheet.absoluteFill} onCameraReady={() => { setReady(true); memoryAttemptTrace(attemptRef.current, 'camera_ready', { mode, facing, surfaceSession }); }} onMountError={() => { setError('No pudimos iniciar la cámara.'); setPhase('error'); }} /> : <View style={StyleSheet.absoluteFill} />}
        <View style={[styles.top, { paddingTop: insets.top + spacing[2] }]}><AppButton variant="icon" size="sm" onPress={close} accessibilityLabel="Cerrar cámara" style={styles.overlay}><HomePlusIcon name="close" size={22} color={colors.text.inverse} /></AppButton><AppButton variant="icon" size="sm" disabled={phase === 'recording' || phase === 'stopping'} onPress={() => { setFacing((value) => value === 'back' ? 'front' : 'back'); remountSurface(); }} accessibilityLabel="Cambiar cámara" style={styles.overlay}><HomePlusIcon name="camera-reverse-outline" size={22} color={colors.text.inverse} /></AppButton></View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing[5] }]}>
          {error ? <View style={styles.error}><AppText tone="inverse" align="center">{error}</AppText><AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => { setError(null); remountSurface(); setPhase('ready'); }} /></View> : null}
          {phase === 'recording' || phase === 'stopping' ? <AppText tone="inverse" weight="700">● {formatDuration(elapsed / 1000)}</AppText> : null}
          <SegmentedControl<CameraMode> value={mode} disabled={phase !== 'ready'} options={[{ value: 'picture', label: 'Foto' }, { value: 'video', label: 'Video' }]} onChange={switchMode} accessibilityLabel="Modo de captura" style={styles.mode} />
          <AppButton variant="icon" disabled={recordGate.disabled} onPress={() => phase === 'recording' ? stopVideo() : mode === 'picture' ? void takePhoto() : void startVideo()} accessibilityLabel={phase === 'recording' ? 'Detener grabación' : mode === 'picture' ? 'Sacar foto' : 'Grabar video'} style={styles.shutter}>{phase === 'capturing' || phase === 'stopping' ? <ActivityIndicator color={colors.brand} /> : <View style={[styles.shutterInner, phase === 'recording' && styles.stopInner]} />}</AppButton>
        </View>
      </>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#000' }, message: { flex: 1, padding: spacing[6], alignItems: 'center', justifyContent: 'center', gap: spacing[4], backgroundColor: colors.background.base }, top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing[4], flexDirection: 'row', justifyContent: 'space-between' }, bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[5] }, overlay: { backgroundColor: 'rgba(0,0,0,0.45)' }, mode: { width: 230 }, shutter: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.65)' }, shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.brand }, stopInner: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.danger.base }, error: { alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: 'rgba(0,0,0,0.55)' }, confirmation: { flex: 1, padding: spacing[4], paddingTop: spacing[8], justifyContent: 'center', gap: spacing[4], backgroundColor: colors.background.base }, confirmTop: { position: 'absolute', left: spacing[4], zIndex: 2 }, confirmMedia: { width: '100%', flex: 1, borderRadius: radius.lg, backgroundColor: '#000' }, confirmActions: { flexDirection: 'row', gap: spacing[3] }, flex: { flex: 1 } });
