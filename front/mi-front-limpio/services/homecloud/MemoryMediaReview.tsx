import React, { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AppButton, AppText } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import type { BinaryMemoryDraft } from './homecloudMemoryIntakeTypes';
import type { MemoryAttempt } from './homecloudMemoryAttempt';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';

export function MemoryMediaReview({ draft, attempt }: { draft: BinaryMemoryDraft; attempt?: MemoryAttempt }) {
  // ONE stable Review primitive per media kind. Audio Import and Audio Record
  // both hand off a durable artifact with an `audio/*` mime type, so they
  // converge here: the recorder's native object is already finished and gone
  // before this point, and this component only ever owns a PLAYER.
  const kind = draft.artifact.mimeType.startsWith('image/')
    ? 'image'
    : draft.artifact.mimeType.startsWith('video/')
      ? 'video'
      : 'audio';
  trace(attempt, 'review_kind', { kind, source: draft.source, mimeType: draft.artifact.mimeType });
  return <MediaErrorBoundary>{kind === 'image'
    ? <ImageReview draft={draft} attempt={attempt} />
    : kind === 'video'
      ? <MemoryVideoPreview uri={draft.artifact.localUri} attempt={attempt} />
      : <AudioReview uri={draft.artifact.localUri} attempt={attempt} />}</MediaErrorBoundary>;
}

class MediaErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { memoryDevTrace('media_review_error_boundary', { message: error instanceof Error ? error.message : 'unknown' }); }
  render() {
    if (this.state.failed) return <View style={styles.neutral}><AppText tone="danger" align="center">No pudimos cargar este contenido.</AppText><AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => this.setState({ failed: false })} /></View>;
    return this.props.children;
  }
}

function trace(attempt: MemoryAttempt | undefined, event: string, details?: Record<string, unknown>) { if (attempt) memoryAttemptTrace(attempt, event, details); else memoryDevTrace(event, details); }

function ImageReview({ draft, attempt }: { draft: BinaryMemoryDraft; attempt?: MemoryAttempt }) {
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Distinguishes a REAL unmount from an effect reset (retry / new source), so
  // `review_unmount` can never be read as "the Review was torn down" when the
  // component is actually still mounted and merely regenerating its preview.
  const unmountedRef = useRef(false);
  useEffect(() => () => { unmountedRef.current = true; }, []);
  useEffect(() => {
    let active = true; let generated: string | null = null;
    setPhase('loading'); setPreviewUri(null); trace(attempt, 'review_mount', { kind: 'image' });
    void manipulateAsync(draft.artifact.localUri, [{ resize: { width: 1600 } }], { compress: 0.82, format: SaveFormat.JPEG })
      .then((result) => { generated = result.uri; if (!active) { void FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {}); return; } setPreviewUri(result.uri); setPhase('ready'); trace(attempt, 'media_ready', { kind: 'image' }); })
      .catch((error) => { if (active) { setPhase('error'); trace(attempt, 'media_error', { kind: 'image', message: error instanceof Error ? error.message : 'unknown' }); } });
    return () => {
      active = false; if (generated) void FileSystem.deleteAsync(generated, { idempotent: true }).catch(() => {});
      trace(attempt, 'review_unmount', { kind: 'image', reason: unmountedRef.current ? 'unmount' : 'preview_reset' });
    };
  }, [attempt, draft.artifact.localUri, retry]);
  if (phase === 'loading') return <Loading label="Preparando vista previa…" />;
  if (phase === 'error' || !previewUri) return <ReviewError label="No pudimos mostrar la vista previa. El original no fue modificado." retryLabel="Reintentar vista previa" onRetry={() => setRetry((v) => v + 1)} />;
  return <Image source={{ uri: previewUri }} resizeMode="contain" style={styles.preview} onLoadStart={() => trace(attempt, 'onLoadStart', { kind: 'image' })} onLoad={() => trace(attempt, 'onLoad', { kind: 'image' })} onError={() => setPhase('error')} accessibilityLabel="Vista previa del recuerdo" />;
}

export function MemoryVideoPreview({ uri, attempt }: { uri: string; attempt?: MemoryAttempt }) {
  const [retry, setRetry] = useState(0);
  return <VideoPlayerInstance key={`${uri}:${retry}`} uri={uri} attempt={attempt} onRetry={() => setRetry((v) => v + 1)} />;
}

function VideoPlayerInstance({ uri, attempt, onRetry }: { uri: string; attempt?: MemoryAttempt; onRetry: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  /**
   * SINGLE OWNER OF THE NATIVE LIFECYCLE.
   * `useVideoPlayer` builds the player through `useReleasingSharedObject`, so it
   * releases the native shared object itself when this component unmounts — and
   * the release cleanup is registered FIRST (the hook runs before this file's
   * effects). The previous manual `player.pause()` in the cleanup therefore ran
   * AFTER the release and raised
   * `NotFoundException: Unable to find native shared object`.
   * This component must therefore never touch the player after unmount: it owns
   * only its OWN `statusChange` listener, which is removed idempotently.
   */
  const player = useVideoPlayer({ uri }, (instance) => { instance.pause(); });
  useEffect(() => {
    let active = true;
    trace(attempt, 'video_player_create'); trace(attempt, 'review_mount', { kind: 'video' }); trace(attempt, 'video_player_source', { scheme: uri.split(':', 1)[0] });
    const applyStatus = ({ status, error }: { status: typeof player.status; error?: { message: string } }) => {
      if (!active) return;
      if (status === 'readyToPlay') { setPhase('ready'); trace(attempt, 'video_player_ready'); }
      else if (status === 'error') { setPhase('error'); trace(attempt, 'video_player_error', { message: error?.message ?? 'unknown' }); }
      else setPhase('loading');
    };
    applyStatus({ status: player.status });
    const subscription = player.addListener('statusChange', applyStatus);
    return () => {
      active = false;
      subscription.remove();
      trace(attempt, 'player_cleanup', { kind: 'video', reason: 'listener_removed' });
      trace(attempt, 'review_unmount', { kind: 'video', reason: 'unmount' });
    };
  }, [attempt, player, uri]);
  if (phase === 'error') return <ReviewError label="No pudimos cargar este video." onRetry={onRetry} />;
  return <View style={styles.videoWrap}><VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: false }} style={styles.video} accessibilityLabel="Vista previa reproducible del video" />{phase === 'loading' ? <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator color={colors.text.inverse} /><AppText tone="inverse">Cargando video…</AppText></View> : null}</View>;
}

function AudioReview({ uri, attempt }: { uri: string; attempt?: MemoryAttempt }) { const [retry, setRetry] = useState(0); return <AudioPlayerInstance key={`${uri}:${retry}`} uri={uri} attempt={attempt} onRetry={() => setRetry((v) => v + 1)} />; }

function AudioPlayerInstance({ uri, attempt, onRetry }: { uri: string; attempt?: MemoryAttempt; onRetry: () => void }) {
  // SAME SINGLE-OWNER RULE AS THE VIDEO PLAYER: `useAudioPlayer` releases the
  // native shared object on unmount, so the cleanup below must not call
  // `pause()` (or read `uri`/`getStatus()`) on it. The player is used only while
  // mounted, by the render body and the press handler.
  const player = useAudioPlayer(uri, { updateInterval: 250 }); const status = useAudioPlayerStatus(player);
  useEffect(() => { trace(attempt, 'review_mount', { kind: 'audio' }); return () => { trace(attempt, 'player_cleanup', { kind: 'audio', reason: 'hook_owned_release' }); trace(attempt, 'review_unmount', { kind: 'audio', reason: 'unmount' }); }; }, [attempt, player]);
  useEffect(() => { if (status.isLoaded) trace(attempt, 'audio_player_ready'); if (status.error) trace(attempt, 'audio_player_error', { message: status.error }); }, [attempt, status.error, status.isLoaded]);
  if (status.error) return <ReviewError label="No pudimos cargar este audio." onRetry={onRetry} />;
  if (!status.isLoaded) return <Loading label="Cargando audio…" />;
  const duration = status.duration > 0 ? status.duration : 0;
  return <View style={styles.audio}><HomePlusIcon name="musical-notes" size={34} color={colors.brand} /><AppText weight="700">{formatDuration(status.currentTime)} / {formatDuration(duration)}</AppText><AppButton title={status.playing ? 'Pausar' : 'Reproducir'} size="sm" variant="secondary" onPress={() => { if (status.playing) player.pause(); else { if (duration > 0 && status.currentTime >= duration) void player.seekTo(0); player.play(); } }} /></View>;
}

function Loading({ label }: { label: string }) { return <View style={styles.neutral}><ActivityIndicator color={colors.brand} /><AppText tone="secondary">{label}</AppText></View>; }
function ReviewError({ label, retryLabel = 'Reintentar', onRetry }: { label: string; retryLabel?: string; onRetry: () => void }) { return <View style={styles.neutral}><HomePlusIcon name="alert-circle-outline" size={34} color={colors.danger.base} /><AppText tone="secondary" align="center">{label}</AppText><AppButton title={retryLabel} size="sm" variant="secondary" onPress={onRetry} /></View>; }
export function formatDuration(seconds: number): string { const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`; }

const styles = StyleSheet.create({ preview: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.background.alt }, videoWrap: { width: '100%', height: 230, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000000' }, video: { width: '100%', height: '100%' }, loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: 'rgba(0,0,0,0.45)' }, neutral: { minHeight: 210, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.alt, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[4] }, audio: { minHeight: 150, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[4] } });
