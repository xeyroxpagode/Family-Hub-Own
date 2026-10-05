import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppButton, AppText } from '../components/ui';
import { colors, radius, spacing } from '../constants/theme';
import type { HomeCloudFile } from '../services/homecloud/homecloudTypes';
import {
  VIEWER_FAILURE_MESSAGE,
  ViewerAccessError,
  classifyHomeCloudViewerFile,
  discardViewerStaging,
  openViewerOriginalWithSystem,
  readViewerTextPreview,
  stageViewerOriginal,
  viewerUnsupportedReason,
  withSingleGrantRetry,
  type ViewerTextPreview,
} from '../services/homecloud/homecloudViewerAccess';
import { isInlineRenderableFamily } from '../services/homecloud/homecloudViewerKind';

/**
 * HomeCloud Files - Stage 2 / Phase 3 - VIEWER V1.
 *
 * Read-only, private and Household-authorized. It shows the EXACT ORIGINAL of one
 * File and it never edits, annotates, converts or re-hosts anything. There is no
 * third-party document viewer anywhere in this file: a private File is never sent
 * to Google Docs, to Microsoft, to a converter or to a public preview endpoint.
 *
 * FORMAT STRATEGY, chosen from what this app ACTUALLY has installed rather than
 * from what would be ideal:
 *
 *   image / video / audio   rendered inline from the authorized signed URL.
 *                           `expo-video` and `expo-audio` are already installed.
 *   text / csv / markdown    a BOUNDED local read of the original, never the whole
 *                           file, with an honest "partial preview" indication.
 *   pdf / office            staged to the TEMPORARY cache and handed to the
 *                           platform. There is no WebView and no PDF renderer in
 *                           this app, and adding one would force a custom native
 *                           rebuild, which Stage 2 forbids. The honest fallback is a
 *                           system hand-off, not a fake inline render.
 *   svg / html / xml         REFUSED inline as active web content, with the reason
 *                           stated, plus the actions that do work.
 *
 * MEDIA LIFECYCLE. Playback is torn down on unmount and whenever the target
 * changes, so leaving the Viewer can never leave sound or video running invisibly.
 */
export interface HomeCloudFileViewerProps {
  readonly file: HomeCloudFile | null;
  readonly accessToken: string;
  readonly onClose: () => void;
  /** Called after a hand-off or export so the Files browser can reconcile. */
  readonly onExternalAction?: () => void;
}

type ViewerPhase = 'loading' | 'ready' | 'failed';

export function HomeCloudFileViewer({ file, accessToken, onClose, onExternalAction }: HomeCloudFileViewerProps) {
  const [phase, setPhase] = useState<ViewerPhase>('loading');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ reason: keyof typeof VIEWER_FAILURE_MESSAGE; message: string } | null>(null);
  const [stagedUri, setStagedUri] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<ViewerTextPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const classification = useMemo(
    () => (file ? classifyHomeCloudViewerFile({ fileName: file.displayName, mimeType: file.mimeType }) : null),
    [file],
  );

  const clearStaging = useCallback((target: HomeCloudFile) => {
    discardViewerStaging(target.id, target.displayName);
  }, []);

  // One fresh grant per target, plus AT MOST ONE controlled re-grant if the access
  // failed because the signed URL went stale. A signed URL is never persisted and
  // never treated as a durable cache key.
  useEffect(() => {
    if (!file) return undefined;
    let active = true;
    const target = file;
    const classify = classifyHomeCloudViewerFile({ fileName: target.displayName, mimeType: target.mimeType });
    setPhase('loading');
    setFailure(null);
    setStagedUri(null);
    setTextPreview(null);
    // The previous target's signed URL is dropped HERE, not only on unmount. Holding
    // it past the end of its own Viewer session kept a live credential for a file
    // that was no longer open.
    setSignedUrl(null);
    withSingleGrantRetry(accessToken, target.id, async (grant) => {
      if (!active) return;
      setSignedUrl(grant.signedUrl);
      if (classify.kind === 'text' || classify.kind === 'csv' || classify.kind === 'markdown') {
        const preview = await readViewerTextPreview(target, grant);
        if (!active) return;
        setTextPreview(preview);
        return;
      }
      if (!isInlineRenderableFamily(classify.kind)) {
        const uri = await stageViewerOriginal(target, grant);
        if (!active) return;
        setStagedUri(uri);
      }
    })
      .then(() => {
        if (active) setPhase('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        const reason = error instanceof ViewerAccessError ? error.reason : 'preview_failed';
        setFailure({ reason, message: VIEWER_FAILURE_MESSAGE[reason] ?? VIEWER_FAILURE_MESSAGE.preview_failed });
        setPhase('failed');
      });
    return () => {
      active = false;
    };
  }, [file, accessToken]);

  // MEDIA + TEMP LIFECYCLE. Unmounting tears down playback and removes the staged
  // copy this Viewer created. The previous target's staging is removed too, so
  // paging between Files cannot accumulate copies.
  useEffect(() => () => {
    if (file) clearStaging(file);
    setStagedUri(null);
    setSignedUrl(null);
  }, [file, clearStaging]);

  const handleExternalOpen = useCallback(async () => {
    if (!file || !stagedUri || busy) return;
    setBusy(true);
    try {
      await openViewerOriginalWithSystem(stagedUri);
      // The hand-off gives no verifiable result, so nothing is claimed here.
      onExternalAction?.();
    } catch (error) {
      const reason = error instanceof ViewerAccessError ? error.reason : 'external_open_unavailable';
      setFailure({ reason, message: VIEWER_FAILURE_MESSAGE[reason] ?? VIEWER_FAILURE_MESSAGE.external_open_unavailable });
    } finally {
      setBusy(false);
    }
  }, [file, stagedUri, busy, onExternalAction]);

  if (!file || !classification) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <AppText variant="title3" weight="800" style={styles.title}>Visor</AppText>
          <AppButton title="Cerrar" variant="ghost" size="sm" onPress={onClose} />
        </View>
      </View>
    );
  }

  const kind = classification.kind;
  const cannotPreview = kind === 'unsupported' || kind === 'pdf' || kind === 'office_document' || kind === 'office_sheet' || kind === 'office_presentation';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="title3" weight="800" style={styles.title} numberOfLines={2}>{file.displayName}</AppText>
        <AppButton title="Cerrar" variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Cerrar el visor" />
      </View>
      <AppText variant="caption" tone="secondary">
        {[file.mimeType, file.sizeBytes ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : null].filter(Boolean).join(' - ')}
      </AppText>

      {phase === 'loading' ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /><AppText variant="caption" tone="secondary">Preparando…</AppText></View>
      ) : failure ? (
        <View style={styles.center}>
          <AppText variant="title3" weight="800" align="center">{failure.reason === 'unsupported' ? 'Formato no compatible' : 'No pudimos mostrar el archivo'}</AppText>
          <AppText variant="body" tone="secondary" align="center">{failure.message}</AppText>
          {stagedUri ? <AppButton title="Abrir o compartir con…" onPress={() => void handleExternalOpen()} disabled={busy} style={{ marginTop: spacing[3] }} /> : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {renderPreviewSurface()}
        </ScrollView>
      )}
    </View>
  );

  function renderPreviewSurface(): React.ReactNode {
    if (kind === 'image' && signedUrl) {
      return <Image source={{ uri: signedUrl }} style={styles.media} resizeMode="contain" accessibilityLabel={`Imagen ${file!.displayName}`} />;
    }
    if (kind === 'video' && signedUrl) {
      // expo-video is the installed, Expo-supported playback primitive. It is
      // released by the lifecycle effect above when this Viewer unmounts.
      return <ViewerVideoSurface uri={signedUrl} />;
    }
    if (kind === 'audio' && signedUrl) {
      return <ViewerAudioSurface uri={signedUrl} title={file!.displayName} />;
    }
    if ((kind === 'text' || kind === 'csv' || kind === 'markdown') && textPreview) {
      return (
        <View style={styles.textBlock}>
          {textPreview.truncated ? (
            <AppText variant="caption" tone="secondary">Vista previa parcial: solo los primeros {Math.round(textPreview.byteCap / 1024)} KB del archivo.</AppText>
          ) : null}
          {textPreview.decodeFailed ? (
            <AppText variant="caption" tone="danger">Este archivo no es texto UTF-8 legible; mostramos una aproximación.</AppText>
          ) : null}
          <AppText variant="bodySmall" style={styles.mono}>{textPreview.text}</AppText>
        </View>
      );
    }
    if (cannotPreview) {
      return (
        <View style={styles.center}>
          <AppText variant="title3" weight="800" align="center">{classification!.activeWebContent ? 'Documento web activo' : 'Vista previa no disponible'}</AppText>
          <AppText variant="body" tone="secondary" align="center">
            {classification!.activeWebContent ? viewerUnsupportedReason(classification!) : 'Este formato se abre con una app del sistema.'}
          </AppText>
          <AppText variant="caption" tone="secondary" align="center">{file!.displayName}</AppText>
          <AppButton
            title="Abrir o compartir con…"
            onPress={() => void handleExternalOpen()}
            disabled={busy || !stagedUri}
            style={{ marginTop: spacing[4] }}
            accessibilityLabel="Abrir o compartir el archivo con otra app"
          />
          {busy ? <AppText variant="caption" tone="secondary">Abriendo…</AppText> : null}
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <AppText variant="body" tone="secondary" align="center">{viewerUnsupportedReason(classification!)}</AppText>
      </View>
    );
  }
}

/**
 * Video surface.
 *
 * `useVideoPlayer` is the installed, Expo-supported playback primitive, and it
 * RELEASES the player when the component unmounts. That is precisely the lifecycle
 * guarantee this screen needs: leaving the Viewer cannot leave video playing
 * invisibly, and no manual teardown can be forgotten.
 */
function ViewerVideoSurface({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <View style={styles.mediaBox}>
      <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />
      {player.status === 'error' ? <AppText variant="caption" tone="danger">No pudimos reproducir este video.</AppText> : null}
    </View>
  );
}

/**
 * Audio surface.
 *
 * `useAudioPlayer` also releases on unmount, so the same guarantee holds for
 * sound. Playback is never started automatically: a member taps to play.
 */
function ViewerAudioSurface({ uri, title }: { uri: string; title: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    // The module reports "playing" independently of our tap, so the control can
    // never drift from the real state after a stall or an interruption.
    setPlaying(status.playing === true);
  }, [status.playing, status.error]);
  return (
    <View style={styles.center}>
      <AppText variant="title3" weight="800" align="center">{title}</AppText>
      <AppText variant="caption" tone="secondary">Audio</AppText>
      <AppButton
        title={playing ? 'Pausar' : 'Reproducir'}
        onPress={() => { if (playing) player.pause(); else player.play(); }}
        style={{ marginTop: spacing[4] }}
        accessibilityLabel={`${playing ? 'Pausar' : 'Reproducir'} ${title}`}
      />
      {status.error ? <AppText variant="caption" tone="danger">No pudimos reproducir este audio.</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base, paddingHorizontal: spacing[5], paddingTop: spacing[4] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  title: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[2] },
  body: { paddingVertical: spacing[4] },
  mediaBox: { alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  media: { width: '100%', height: 320, borderRadius: radius.lg, backgroundColor: colors.surface.card },
  textBlock: { gap: spacing[2] },
  mono: { lineHeight: 20 },
});