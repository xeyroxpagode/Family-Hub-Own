import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Pdf from 'react-native-pdf';
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
 *                           file, with an honest "partial preview" indication, and
 *                           NATIVE TEXT SELECTION so the member can copy from it.
 *   pdf                     rendered INLINE by `react-native-pdf` from the LOCAL
 *                           STAGED ORIGINAL (`file://`), privately, with native
 *                           paging and zoom. It is a native renderer reading a file
 *                           descriptor, so the bytes never enter the JS heap. The
 *                           decision and its evidence are in
 *                           `docs/homecloud/HOMECLOUD_FILES_STAGE2_PDF_RENDERER_DECISION.md`.
 *   office                  staged to the TEMPORARY cache and handed to the
 *                           platform: a privacy-safe external/system handoff is
 *                           honest for DOC/XLS/PPT, and pretending otherwise would
 *                           mean shipping a document converter.
 *   svg / html / xml         REFUSED inline as active web content, with the reason
 *                           stated, plus the actions that do work.
 *
 * NOTHING ENDS IN A BLANK SCREEN. Every branch that cannot show the File states
 * something specific and offers the system hand-off when one exists.
 *
 * SAFE AREA. The Viewer is a LAYER over the browser and its own inset padding comes
 * from `useSafeAreaInsets`, the same mechanism the rest of the app uses. There is no
 * hard-coded status-bar height.
 *
 * ANDROID BACK. Because the Viewer is a layer and not a route, the hardware back
 * button would leave HomeCloud instead of the Viewer. A `BackHandler` is registered
 * ONLY while the Viewer is open, and removed when it closes or unmounts.
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
  // A renderer-level failure that is NOT an access failure: the bytes were authorized
  // and staged fine, but this device could not DECODE them. It is reported on its own
  // surface with the hand-off still offered, because "we could not show it" and "you are
  // not allowed to see it" are different answers and a member deserves the right one.
  const [renderFailure, setRenderFailure] = useState<{ title: string; message: string } | null>(null);
  const insets = useSafeAreaInsets();

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
    // The previous target's renderer verdict is dropped HERE, not only on unmount: an
    // honest fallback must never outlive the File that earned it.
    setRenderFailure(null);
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

  /**
   * ANDROID HARDWARE BACK closes the VIEWER, not HomeCloud.
   *
   * The Viewer is a layer, so there is no route for the platform to pop: without this
   * the back button would leave the app with the File menu still open underneath. The
   * subscription exists ONLY while a File is open and is removed the moment this
   * effect's dependencies change, so a Viewer that is not open never intercepts back.
   */
  useEffect(() => {
    if (file === null) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [file, onClose]);

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

  /**
   * A hand-off offered from INSIDE the media branch.
   *
   * Video and audio are not staged to the cache — the player streams the authorized
   * signed original — so this stages the transfer ON DEMAND and then hands the same
   * staged copy to the platform. If the staging fails the failure lands on the same
   * honest surface as any other, rather than silently doing nothing.
   *
   * It lives here, ABOVE the "no File" early return, because a hook below one would be
   * called conditionally — which is exactly the class of defect that only shows up on a
   * device, after a member opens their second File.
   */
  const handleExternalOpenForMedia = useCallback(async () => {
    if (busy) return;
    if (stagedUri !== null) { await handleExternalOpen(); return; }
    if (file === null || signedUrl === null) return;
    setBusy(true);
    try {
      const staged = await stageViewerOriginal(file, { signedUrl, variant: 'original' });
      setStagedUri(staged);
      await openViewerOriginalWithSystem(staged);
      onExternalAction?.();
    } catch (error) {
      const reason = error instanceof ViewerAccessError ? error.reason : 'external_open_unavailable';
      setFailure({ reason, message: VIEWER_FAILURE_MESSAGE[reason] ?? VIEWER_FAILURE_MESSAGE.external_open_unavailable });
    } finally { setBusy(false); }
  }, [file, signedUrl, stagedUri, busy, handleExternalOpen, onExternalAction]);

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
  const cannotPreview = kind === 'unsupported' || kind === 'office_document' || kind === 'office_sheet' || kind === 'office_presentation';

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, spacing[4]), paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
      <View style={styles.header}>
        <AppText variant="title3" weight="800" style={styles.title} numberOfLines={2}>{file.displayName}</AppText>
        <AppButton title="Cerrar" variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Cerrar el visor" />
      </View>
      <AppText variant="caption" tone="secondary">
        {[file.mimeType, file.sizeBytes ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : null].filter(Boolean).join(' - ')}
      </AppText>

      {phase === 'loading' ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /><AppText variant="caption" tone="secondary">Preparando…</AppText></View>
      ) : renderFailure ? (
        <View style={styles.center}>
          <AppText variant="title3" weight="800" align="center">{renderFailure.title}</AppText>
          <AppText variant="body" tone="secondary" align="center">{renderFailure.message}</AppText>
          {stagedUri ? <AppButton title="Abrir o compartir con…" onPress={() => void handleExternalOpen()} disabled={busy} style={{ marginTop: spacing[3] }} accessibilityLabel="Abrir o compartir el archivo con otra app" /> : null}
        </View>
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
      return <ViewerVideoSurface uri={signedUrl} onHandOff={() => void handleExternalOpenForMedia()} />;
    }
    if (kind === 'audio' && signedUrl) {
      return <ViewerAudioSurface uri={signedUrl} title={file!.displayName} />;
    }
    if (kind === 'pdf') {
      // THE INLINE PDF SURFACE.
      //
      // The source is the LOCAL STAGED ORIGINAL — the deterministic
      // `file://…/HomeCloudViewer/viewer-<id>.pdf` slot — never a signed URL, never a
      // third-party viewer and never a CDN renderer. That is what keeps a household's
      // document inside the app.
      if (stagedUri === null) {
        return <View style={styles.center}><ActivityIndicator color={colors.brand} /><AppText variant="caption" tone="secondary">Preparando el PDF…</AppText></View>;
      }
      return (
        <ViewerPdfSurface
          uri={stagedUri}
          onRenderError={() => setRenderFailure({ title: 'No pudimos abrir este PDF', message: VIEWER_PDF_RENDER_MESSAGE })}
        />
      );
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
          {/* SELECTABLE. The whole point of a text preview is that the member can take a
              line out of it, so the native selection/copy affordance is enabled here.
              `AppText` forwards `TextProps`, so this is the platform's own selection, not
              a custom implementation. */}
          <AppText variant="bodySmall" style={styles.mono} selectable>{textPreview.text}</AppText>
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

/** The honest reason a PDF could not be rendered INLINE on this device. */
export const VIEWER_PDF_RENDER_MESSAGE =
  'El archivo se descargó bien pero este dispositivo no pudo abrirlo. Puede estar protegido con contraseña o dañado.';

/** The honest reason a video could not be DECODED on this device. */
export const VIEWER_VIDEO_RENDER_MESSAGE =
  'No pudimos reproducir este video aquí. Podés abrirlo o compartirlo con otra app.';

/**
 * THE INLINE PDF SURFACE.
 *
 * `react-native-pdf` renders through `android.graphics.pdf.PdfRenderer` and PDFKit, both
 * of which read the document from a FILE DESCRIPTOR. The bytes therefore never enter the
 * JS heap, which is the property the whole Stage 2 Viewer correction turned on.
 *
 * `trustAllCerts` is deliberately absent: there is no TLS to trust, because the source is
 * a local file and the download already happened over the authorized transfer.
 */
function ViewerPdfSurface({ uri, onRenderError }: { uri: string; onRenderError: () => void }) {
  const reported = useRef(false);
  return (
    <View style={styles.pdfBox}>
      <Pdf
        source={{ uri }}
        style={styles.pdf}
        trustAllCerts={false}
        enablePaging
        enableDoubleTapZoom
        spacing={12}
        onError={() => {
          // React can fire `onError` more than once for the same document. Reporting it
          // once keeps the message honest instead of making the surface flap.
          if (reported.current) return;
          reported.current = true;
          onRenderError();
        }}
      />
    </View>
  );
}

/**
 * Video surface.
 *
 * `useVideoPlayer` is the installed, Expo-supported playback primitive, and it
 * RELEASES the player when the component unmounts. That is precisely the lifecycle
 * guarantee this screen needs: leaving the Viewer cannot leave video playing
 * invisibly, and no manual teardown can be forgotten.
 *
 * A player that reports `status === 'error'` is a DECODE failure, not an access failure:
 * the bytes were authorized and the URL is valid, this device just could not play them.
 * That gets its OWN honest surface plus an explicit hand-off, and it never throws the
 * member into another app on its own.
 */
function ViewerVideoSurface({ uri, onHandOff }: { uri: string; onHandOff: () => void }) {
  const player = useVideoPlayer(uri);
  const failed = player.status === 'error';
  return (
    <View style={styles.mediaBox}>
      <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />
      {failed ? (
        <View style={styles.inlineFailure}>
          <AppText variant="caption" tone="danger" align="center">{VIEWER_VIDEO_RENDER_MESSAGE}</AppText>
          <AppButton title="Abrir o compartir con…" size="sm" variant="secondary" onPress={onHandOff} accessibilityLabel="Abrir o compartir el video con otra app" />
        </View>
      ) : null}
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
  screen: { flex: 1, backgroundColor: colors.background.base, paddingHorizontal: spacing[5] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  title: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[2] },
  body: { paddingVertical: spacing[4] },
  mediaBox: { alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  inlineFailure: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3] },
  pdfBox: { width: '100%', minHeight: 480, borderRadius: radius.lg, overflow: 'hidden' },
  pdf: { width: '100%', height: 560, backgroundColor: colors.surface.card },
  media: { width: '100%', height: 320, borderRadius: radius.lg, backgroundColor: colors.surface.card },
  textBlock: { gap: spacing[2] },
  mono: { lineHeight: 20 },
});