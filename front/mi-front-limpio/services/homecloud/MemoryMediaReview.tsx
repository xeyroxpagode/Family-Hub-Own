import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView, useVideoPlayer } from 'expo-video';
import { AppButton, AppText } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import type { BinaryMemoryDraft } from './homecloudMemoryIntakeTypes';
import { memoryDevTrace } from './homecloudMemoryDiagnostics';

export function MemoryMediaReview({ draft }: { draft: BinaryMemoryDraft }) {
  if (draft.artifact.mimeType.startsWith('image/')) return <ImageReview draft={draft} />;
  if (draft.artifact.mimeType.startsWith('video/')) return <VideoReview uri={draft.artifact.localUri} />;
  return <AudioReview uri={draft.artifact.localUri} />;
}

function ImageReview({ draft }: { draft: BinaryMemoryDraft }) {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let generated: string | null = null;
    setPhase('loading');
    setPreviewUri(null);
    memoryDevTrace('review_mount', { kind: 'image' });
    memoryDevTrace('image_preview_prepare_start');
    void manipulateAsync(draft.artifact.localUri, [{ resize: { width: 1600 } }], { compress: 0.82, format: SaveFormat.JPEG })
      .then((result) => {
        generated = result.uri;
        if (!active) { void FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {}); return; }
        setPreviewUri(result.uri);
        setPhase('ready');
        memoryDevTrace('image_preview_prepare_end', { width: result.width, height: result.height });
      })
      .catch(() => { if (active) setPhase('error'); });
    return () => {
      active = false;
      if (generated) void FileSystem.deleteAsync(generated, { idempotent: true }).catch(() => {});
    };
  }, [attempt, draft.artifact.localUri]);

  if (phase === 'loading') return <View style={styles.neutral}><ActivityIndicator color={colors.brand} /><AppText tone="secondary">Preparando vista previa…</AppText></View>;
  if (phase === 'error' || !previewUri) return <View style={styles.neutral}><HomePlusIcon name="image-outline" size={34} color={colors.text.tertiary} /><AppText tone="secondary" align="center">No pudimos mostrar la vista previa. El original no fue modificado.</AppText><AppButton title="Reintentar vista previa" size="sm" variant="secondary" onPress={() => setAttempt((value) => value + 1)} /></View>;
  return <Image key={attempt} source={{ uri: previewUri }} resizeMode="contain" style={styles.preview} onLoadStart={() => memoryDevTrace('onLoadStart', { kind: 'image' })} onLoad={() => memoryDevTrace('onLoad', { kind: 'image' })} onError={() => { memoryDevTrace('onError', { kind: 'image' }); setPhase('error'); }} accessibilityLabel="Vista previa del recuerdo" />;
}

function VideoReview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => { instance.pause(); });
  useEffect(() => { memoryDevTrace('review_mount', { kind: 'video' }); return () => player.pause(); }, [player]);
  return <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: false }} style={styles.video} accessibilityLabel="Vista previa reproducible del video" />;
}

function AudioReview({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  useEffect(() => { memoryDevTrace('review_mount', { kind: 'audio' }); return () => player.pause(); }, [player]);
  const duration = status.duration > 0 ? status.duration : 0;
  return <View style={styles.audio}><HomePlusIcon name="musical-notes" size={34} color={colors.brand} /><AppText weight="700">{formatDuration(status.currentTime)} / {formatDuration(duration)}</AppText><AppButton title={status.playing ? 'Pausar' : 'Reproducir'} size="sm" variant="secondary" onPress={() => { if (status.playing) player.pause(); else { if (duration > 0 && status.currentTime >= duration) void player.seekTo(0); player.play(); } }} /></View>;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.background.alt },
  video: { width: '100%', height: 230, borderRadius: radius.lg, backgroundColor: '#000000' },
  neutral: { minHeight: 210, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.alt, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[4] },
  audio: { minHeight: 150, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[4] },
});
