import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { File } from 'expo-file-system';
import { WebView } from 'react-native-webview';
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
import {
  PDF_VIEWER_LOAD_TIMEOUT_MS,
  PDF_VIEWER_READY_TIMEOUT_MS,
  VIEWER_PDF_PASSWORD_MESSAGE,
  VIEWER_PDF_PASSWORD_TITLE,
  VIEWER_PDF_TOO_LARGE_MESSAGE,
  VIEWER_PDF_TOO_LARGE_TITLE,
  pdfInlineEligibility,
} from '../services/homecloud/homecloudPdfPolicy';
import {
  PDF_BRIDGE_PROTOCOL_VERSION,
  parseViewerMessage,
  serializeRnMessage,
  type PdfLoadErrorTelemetry,
  type ViewerToRnMessage,
} from '../services/homecloud/homecloudPdfBridge';
import { buildPdfViewerHtml } from '../services/homecloud/homecloudPdfViewerHtml';
import { PdfTooLargeError, readStagedPdfForBridge } from '../services/homecloud/homecloudPdfTransport';
import { PDFJS_ENGINE_SOURCE } from '../services/homecloud/pdfJsEngine.generated';
import {
  OFFICE_VIEWER_LOAD_TIMEOUT_MS,
  buildOfficeViewerHtml,
  cancelOfficeViewingSession,
  createOfficeViewingSession,
  isOfficeViewerSupported,
  officeViewerAllowedOrigin,
  parseOfficeViewerMessage,
  type OfficeViewingSession,
} from '../services/homecloud/homecloudOfficeViewer';

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
 *   pdf                     rendered INLINE from the LOCAL STAGED ORIGINAL
 *                           (`file://`), privately, inside the HomePlus shell: a
 *                           locally bundled pdf.js engine (no CDN, no third party,
 *                           no network) runs in a locked-down WebView and receives
 *                           the bytes over a bounded, chunked, versioned bridge.
 *                           Documents above INLINE_PDF_PREVIEW_MAX_BYTES are NOT
 *                           attempted; they get an intentional "too large" state
 *                           with the system hand-off. The decision, the memory
 *                           model and the Expo Go constraint are recorded in
 *                           `docs/homecloud/HOMECLOUD_FILES_STAGE2_SLICE_C_EXPO_GO_CORRECTION.md`.
 *                           Expo Go cannot load custom native modules, which is why
 *                           the previous native renderer had to go; every
 *                           dependency used here ships inside Expo Go.
 *   office (DOCX/DOC/XLSX/XLS/PPTX/PPT)
 *                           OFFICE-3: visor ONLYOFFICE embebido read-only
 *                           (`type: "embedded"` + `mode: "view"` llegan firmados
 *                           en la sesión del backend). El original también se
 *                           stagea a la cache para que el hand-off externo
 *                           siga disponible como respaldo honesto. Otros
 *                           formatos Office (odt, rtf, xlsm, odp…) y los
 *                           documentos web activos siguen con hand-off externo.
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

  // Stable identity on purpose: the PDF surface gates its transfer effect on
  // this callback, so an inline arrow here would re-run the whole staging read
  // on every parent render.
  const handlePdfFailed = useCallback((next: { title: string; message: string }) => {
    setRenderFailure(next);
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
  // OFFICE-2: el visor Office embebido se dibuja FUERA del ScrollView. El
  // contenido del documento (páginas, hojas con pestañas, slides, zoom,
  // scroll propio del visor embebido) ocupa todo el área restante del
  // Viewer: una vista previa, no una "aplicación de Office" enmarcada con
  // UI alrededor.
  // OFFICE-3: las tres familias Office (documento, hoja, presentación)
  // entran al visor integrado cuando la extensión es de los seis formatos
  // V1; el resto de Office (odt, rtf, xlsm, odp…) conserva el hand-off
  // honesto de respaldo.
  const officeInline = (kind === 'office_document' || kind === 'office_sheet' || kind === 'office_presentation')
    && isOfficeViewerSupported({ fileName: file.displayName });

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
      ) : officeInline ? (
        <View style={styles.officeFill}>
          {renderPreviewSurface()}
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
      // document inside the app. The surface reads the staged bytes through a BOUNDED
      // chunked bridge into a locally bundled engine (see homecloudPdfTransport.ts
      // and homecloudPdfViewerHtml.ts); oversized documents never reach the bridge.
      if (stagedUri === null) {
        return <View style={styles.center}><ActivityIndicator color={colors.brand} /><AppText variant="caption" tone="secondary">Preparando el PDF…</AppText></View>;
      }
      return (
        <ViewerPdfSurface
          uri={stagedUri}
          onDocumentFailed={handlePdfFailed}
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
    if (officeInline && file) {
      // OFFICE-3: los seis formatos Office V1 (Word/Excel/PowerPoint, OOXML
      // y legacy) integrados como VISOR EMBEBIDO read-only (`type:
      // "embedded"` y el documentType por familia llegan firmados en la
      // config de la sesión). Los formatos Office no-V1 conservan el
      // hand-off honesto de abajo.
      return (
        <ViewerOfficeSurface
          file={file}
          accessToken={accessToken}
          onExternalOpen={() => void handleExternalOpen()}
          externalAvailable={stagedUri !== null}
          externalBusy={busy}
        />
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

export type PdfViewerDiagnosticCode =
  | 'pdf_ready_timeout'
  | 'pdf_load_timeout'
  | 'pdf_staging_unreadable'
  | 'pdf_transport_error'
  | 'pdf_webview_error'
  | 'pdf_webview_http_error'
  | 'pdf_engine_corrupt'
  | 'pdf_engine_missing'
  | 'pdf_get_document_exception'
  | 'pdf_get_document_rejected'
  | 'pdf_page_setup_failed';

function pdfFailure(
  title: string,
  message: string,
  diagnosticCode: PdfViewerDiagnosticCode,
  telemetry?: PdfLoadErrorTelemetry,
): { title: string; message: string } {
  const details = pdfDiagnosticDetails(diagnosticCode, telemetry);
  return { title, message: `${message}\n\n${details}` };
}

function pdfDiagnosticDetails(diagnosticCode: PdfViewerDiagnosticCode, telemetry?: PdfLoadErrorTelemetry): string {
  const details = [`Código de diagnóstico: ${diagnosticCode}.`];
  if (telemetry?.stage) details.push(`Etapa: ${telemetry.stage}.`);
  if (telemetry?.engineName) details.push(`Clase: ${telemetry.engineName}.`);
  if (typeof telemetry?.byteLength === 'number') details.push(`Bytes: ${telemetry.byteLength}.`);
  if (typeof telemetry?.receivedChunks === 'number' || typeof telemetry?.totalChunks === 'number') {
    details.push(`Chunks: ${telemetry.receivedChunks ?? 0}/${telemetry.totalChunks ?? 0}.`);
  }
  if (typeof telemetry?.pages === 'number') details.push(`Páginas: ${telemetry.pages}.`);
  if (typeof telemetry?.durationMs === 'number') details.push(`Duración: ${telemetry.durationMs} ms.`);
  if (typeof telemetry?.engineReady === 'boolean') details.push(`Motor listo: ${telemetry.engineReady ? 'sí' : 'no'}.`);
  return details.join(' ');
}

function pdfDiagnosticForLoadError(message: Extract<ViewerToRnMessage, { type: 'LOAD_ERROR' }>): PdfViewerDiagnosticCode {
  if (message.code === 'corrupt') return 'pdf_engine_corrupt';
  if (message.stage === 'engine_missing' || message.code === 'engine_unavailable') return 'pdf_engine_missing';
  if (message.stage === 'get_document_call') return 'pdf_get_document_exception';
  if (message.stage === 'page_setup') return 'pdf_page_setup_failed';
  return 'pdf_get_document_rejected';
}

export function allowPdfViewerNavigation(request: unknown): boolean {
  const url = typeof (request as { url?: unknown } | null)?.url === 'string'
    ? (request as { url: string }).url
    : '';
  return url === 'about:blank' || url.startsWith('about:blank#') || url === 'about:srcdoc';
}

/** The honest reason a video could not be DECODED on this device. */
export const VIEWER_VIDEO_RENDER_MESSAGE =
  'No pudimos reproducir este video aquí. Podés abrirlo o compartirlo con otra app.';

/**
 * THE INLINE PDF SURFACE (Expo-Go-compatible).
 *
 * Architecture: HomePlus shell -> staged `file://` original -> bounded chunked
 * bridge -> LOCAL pdf.js engine inside a locked-down WebView. The engine source
 * is vendored into the bundle (never fetched), the document bytes travel as
 * base64 chunks under a versioned protocol with a per-open `docId` session, and
 * the WebView itself is nailed down: no file access, no new windows, no
 * navigation - every link tap returns as an explicit LINK_PRESSED message so
 * React Native performs the system handoff.
 *
 * LIFECYCLE. One `docId` per DOCUMENT (`key` on the WebView follows the uri, so
 * paging between Files unmounts the renderer holding the previous document's
 * pixels). Unmount sends DISPOSE best-effort and drops every byte reference,
 * so a close during load cannot leak the transfer or the renderer.
 *
 * TIMEOUTS. READY (engine booted) and LOAD (document opened) are both bounded;
 * a renderer that never answers becomes the same honest failure surface as a
 * corrupt file - never an indefinite spinner.
 *
 * Exported (not just module-local) so the automated suite mounts the REAL
 * surface with controlled timeouts; production always uses the policy defaults.
 */
export function ViewerPdfSurface({
  uri,
  onDocumentFailed,
  timeouts,
}: {
  uri: string;
  onDocumentFailed: (failure: { title: string; message: string }) => void;
  /** Override for tests and constrained devices; defaults are the policy values. */
  timeouts?: { readonly readyMs?: number; readonly loadMs?: number };
}) {
  const webviewRef = useRef<WebView | null>(null);
  // One session per DOCUMENT, not per mount: the parent reuses this surface when
  // the member pages between Files, so the session follows the uri. A new uri
  // mints a new session, which (via `key` on the WebView) unmounts the renderer
  // holding the previous document's pixels: stale content on reopen is
  // impossible by construction, not by cleanup discipline.
  const [sessionKey, setSessionKey] = useState(() => `pdf-${pdfSessionCounter++}`);
  const uriRef = useRef(uri);
  if (uriRef.current !== uri) {
    uriRef.current = uri;
    setSessionKey(`pdf-${pdfSessionCounter++}`);
  }
  const [page, setPage] = useState<{ page: number; pages: number } | null>(null);
  const stateRef = useRef({
    session: '',
    settled: false,
    rendererReady: false,
    sent: false,
    payload: null as { byteLength: number; chunks: string[] } | null,
    readyTimer: null as ReturnType<typeof setTimeout> | null,
    loadTimer: null as ReturnType<typeof setTimeout> | null,
  });
  const html = useMemo(() => getPdfViewerHtml(), []);

  /** Resets the mutable session box when the document changed under it. */
  const sessionState = useCallback(() => {
    const state = stateRef.current;
    if (state.session !== sessionKey) {
      if (state.readyTimer) clearTimeout(state.readyTimer);
      if (state.loadTimer) clearTimeout(state.loadTimer);
      state.session = sessionKey;
      state.settled = false;
      state.rendererReady = false;
      state.sent = false;
      state.payload = null;
      state.readyTimer = null;
      state.loadTimer = null;
    }
    return state;
  }, [sessionKey]);

  const failOnce = useCallback((failure: { title: string; message: string }) => {
    const state = sessionState();
    if (state.settled || state.session !== sessionKey) return;
    state.settled = true;
    if (state.readyTimer) clearTimeout(state.readyTimer);
    if (state.loadTimer) clearTimeout(state.loadTimer);
    state.payload = null;
    onDocumentFailed(failure);
  }, [onDocumentFailed, sessionKey, sessionState]);

  const sendDocument = useCallback(() => {
    const state = sessionState();
    if (state.settled || state.session !== sessionKey || !state.rendererReady || !state.payload || state.sent) return;
    const target = webviewRef.current;
    if (!target) return;
    state.sent = true;
    target.postMessage(serializeRnMessage({ v: PDF_BRIDGE_PROTOCOL_VERSION, type: 'INIT_DOCUMENT', docId: sessionKey, byteLength: state.payload.byteLength, totalChunks: state.payload.chunks.length }));
    for (let index = 0; index < state.payload.chunks.length; index += 1) {
      target.postMessage(serializeRnMessage({ v: PDF_BRIDGE_PROTOCOL_VERSION, type: 'LOAD_CHUNK', docId: sessionKey, index, data: state.payload.chunks[index] }));
    }
    // The payload served its purpose; drop it so a many-chunk document is not
    // held twice (here and in the renderer) for the rest of the session.
    state.payload = null;
    const loadMs = timeouts?.loadMs ?? PDF_VIEWER_LOAD_TIMEOUT_MS;
    if (state.loadTimer) clearTimeout(state.loadTimer);
    state.loadTimer = setTimeout(() => {
      failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_load_timeout'));
    }, loadMs);
  }, [failOnce, sessionKey, sessionState, timeouts]);

  useEffect(() => {
    const state = sessionState();
    setPage(null);
    let active = true;
    const readyMs = timeouts?.readyMs ?? PDF_VIEWER_READY_TIMEOUT_MS;
    state.readyTimer = setTimeout(() => {
      if (!active) return;
      failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_ready_timeout'));
    }, readyMs);
    // The gate runs on the REAL staged size: metadata can be stale, the file
    // on disk cannot. Oversized documents never reach the bridge at all.
    let staged: File;
    try {
      staged = new File(uri);
    } catch {
      failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_staging_unreadable'));
      return () => { active = false; };
    }
    const gate = pdfInlineEligibility(staged.size ?? null);
    if (!gate.eligible && gate.reason === 'too_large') {
      failOnce({ title: VIEWER_PDF_TOO_LARGE_TITLE, message: VIEWER_PDF_TOO_LARGE_MESSAGE });
      return () => { active = false; };
    }
    if (!gate.eligible) {
      failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_staging_unreadable'));
      return () => { active = false; };
    }
    readStagedPdfForBridge(staged)
      .then((payload) => {
        if (!active || state.settled) return;
        state.payload = payload;
        sendDocument();
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof PdfTooLargeError) {
          failOnce({ title: VIEWER_PDF_TOO_LARGE_TITLE, message: VIEWER_PDF_TOO_LARGE_MESSAGE });
          return;
        }
        void error;
        failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_transport_error'));
      });
    return () => {
      active = false;
      // Best-effort DISPOSE: the WebView may already be gone, which is fine -
      // unmounting the WebView itself releases the renderer either way.
      try {
        webviewRef.current?.postMessage(serializeRnMessage({ v: PDF_BRIDGE_PROTOCOL_VERSION, type: 'DISPOSE', docId: sessionKey }));
      } catch {
        // Best-effort.
      }
      if (state.readyTimer) clearTimeout(state.readyTimer);
      if (state.loadTimer) clearTimeout(state.loadTimer);
      state.payload = null;
    };
  }, [failOnce, sendDocument, sessionKey, timeouts, uri]);

  const handleMessage = useCallback((event: { nativeEvent: { data: unknown } }) => {
    const state = sessionState();
    const message = parseViewerMessage(event.nativeEvent.data);
    if (!message) return;
    // READY means "the engine booted", not "a document is open": a fresh
    // WebView announces itself with a boot token before it knows any session,
    // so it is accepted regardless of docId. Everything else must belong to
    // THIS session - stale or foreign messages are ignored, never acted on.
    if (message.type === 'READY') {
      // Idempotent: a renderer that announces itself twice must not cause a
      // second transfer (`sent` guards it in sendDocument).
      state.rendererReady = true;
      if (state.readyTimer) clearTimeout(state.readyTimer);
      sendDocument();
      return;
    }
    // A hostile document cannot steer this surface with a crafted string.
    if (message.docId !== sessionKey || state.session !== sessionKey) return;
    switch (message.type) {
      case 'DOCUMENT_LOADED':
        if (state.loadTimer) clearTimeout(state.loadTimer);
        setPage({ page: 1, pages: message.pages });
        break;
      case 'PAGE_CHANGED':
        setPage({ page: message.page, pages: message.pages });
        break;
      case 'LOAD_ERROR':
        if (message.code === 'password') {
          failOnce({ title: VIEWER_PDF_PASSWORD_TITLE, message: VIEWER_PDF_PASSWORD_MESSAGE });
        } else {
          failOnce(pdfFailure(
            'No pudimos abrir este PDF',
            VIEWER_PDF_RENDER_MESSAGE,
            pdfDiagnosticForLoadError(message),
            message,
          ));
        }
        break;
      case 'RENDER_ERROR':
        // A single bad page must not nuke a readable document: the renderer
        // keeps the rest, and only a total failure (LOAD_ERROR) escalates.
        break;
      case 'LINK_PRESSED':
        // Explicit system handoff for document links: the viewer never
        // navigates anywhere on its own.
        Linking.openURL(message.url).catch(() => undefined);
        break;
    }
  }, [failOnce, sendDocument, sessionKey, sessionState]);

  return (
    <View style={styles.pdfBox}>
      <WebView
        key={sessionKey}
        ref={webviewRef}
        source={{ html, baseUrl: 'about:blank' }}
        originWhitelist={['about:blank']}
        style={styles.pdf}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowingReadAccessToURL={undefined}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        mediaPlaybackRequiresUserAction
        onShouldStartLoadWithRequest={allowPdfViewerNavigation}
        onMessage={handleMessage}
        onError={() => failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_webview_error'))}
        onHttpError={() => failOnce(pdfFailure('No pudimos abrir este PDF', VIEWER_PDF_RENDER_MESSAGE, 'pdf_webview_http_error'))}
      />
      {page && page.pages > 1 ? (
        <View style={styles.pdfPager}>
          <AppText variant="caption" tone="secondary">{`${page.page} / ${page.pages}`}</AppText>
        </View>
      ) : null}
    </View>
  );
}

let pdfSessionCounter = 1;

/** The viewer HTML is built ONCE: the ~320 KiB engine must not be re-inlined per open. */
let cachedPdfViewerHtml: string | null = null;

function getPdfViewerHtml(): string {
  if (!cachedPdfViewerHtml) {
    cachedPdfViewerHtml = buildPdfViewerHtml(PDFJS_ENGINE_SOURCE, {
      background: colors.background.base,
      surface: colors.surface.card,
      text: colors.text.primary,
      subtle: '#8A8178',
    });
  }
  return cachedPdfViewerHtml;
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

/**
 * Superficie Office (OFFICE-3: DOCX/DOC/XLSX/XLS/PPTX/PPT, read-only;
 * OFFICE-2: visor embebido).
 *
 * La sesión trae la config firmada por el backend con `type: "embedded"`,
 * `editorConfig.mode: "view"` y el `documentType` por familia (word | cell |
 * slide): el WebView muestra el CONTENIDO del documento (páginas legibles,
 * hojas con pestañas, slides navegables, zoom y scroll del propio visor
 * embebido), no un workspace de edición. Sin enlaces de
 * compartir/embeber/descargar por parte del DocServer: el original se
 * comparte desde HomePlus.
 *
 * Fases: preparando (sesión autorizada) -> cargando (editor) -> visible.
 * Cerrar cancela la sesión best-effort; la expiración la impone el backend.
 * El WebView solo navega al origen del DocServer entregado POR SESIÓN.
 * `domStorageEnabled` es requerido por el editor (a diferencia del PDF
 * bloqueado); la compensación es el allowlist estricto de navegación.
 *
 * Exportada (no solo local) para que la suite monte la superficie REAL;
 * producción la usa siempre a través del Viewer.
 */
export function ViewerOfficeSurface({
  file,
  accessToken,
  onExternalOpen,
  externalAvailable,
  externalBusy,
}: {
  file: { readonly id: string; readonly displayName: string };
  accessToken: string;
  onExternalOpen: () => void;
  externalAvailable: boolean;
  externalBusy: boolean;
}) {
  const [status, setStatus] = useState<'preparing' | 'loading' | 'visible' | 'failed'>('preparing');
  const [session, setSession] = useState<OfficeViewingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  // OFFICE-2: `appReady` distingue "el editor arrancó pero el documento no
  // llegó" (descarga/conversión) de "ni siquiera arrancó" (api.js/red/init).
  // Solo alimenta el código de diagnóstico; nunca expone URLs ni tokens.
  const [appReady, setAppReady] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const targetId = file.id;
    setStatus('preparing');
    setSession(null);
    setError(null);
    setAppReady(false);
    setHtml(null);
    createOfficeViewingSession(accessToken, targetId)
      .then((created) => {
        if (!active) {
          // La pantalla ya se fue: cancelar lo recién creado.
          void cancelOfficeViewingSession(accessToken, created.sessionId);
          return;
        }
        const nextHtml = buildOfficeViewerHtml({
          apiJsUrl: `${created.documentServerUrl.replace(/\/+$/, '')}/web-apps/apps/api/documents/api.js`,
          config: created.config,
          token: created.token,
        });
        sessionRef.current = created.sessionId;
        setSession(created);
        setHtml(nextHtml);
        setStatus('loading');
      })
      .catch(() => {
        if (!active) return;
        setError('No pudimos preparar este documento. Revisá tu conexión o intentá de nuevo. Código: office_session_failed.');
        setStatus('failed');
      });
    return () => {
      active = false;
      const pending = sessionRef.current;
      sessionRef.current = null;
      if (pending) void cancelOfficeViewingSession(accessToken, pending);
    };
  }, [file.id, accessToken]);

  useEffect(() => {
    if (status !== 'loading') return undefined;
    const timer = setTimeout(() => {
      // Sin DOCUMENT_READY en 60 s: fallo honesto con etapa. Si la app
      // arrancó, el documento no llegó (descarga/conversión, OFFICE-2);
      // si no, falló el arranque (red/api.js/init) o el WebView miente.
      setError(
        appReady
          ? 'El editor arrancó pero el documento no terminó de cargar. Código: office_timeout_app_ready.'
          : 'El visor tardó demasiado en responder. Código: office_timeout_no_app_ready.',
      );
      setStatus('failed');
    }, OFFICE_VIEWER_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status, appReady]);

  const allowedOrigin = useMemo(
    () => (session ? officeViewerAllowedOrigin(session.documentServerUrl) : null),
    [session],
  );

  const handleMessage = useCallback((event: { nativeEvent: { data: unknown } }) => {
    const message = parseOfficeViewerMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'APP_READY') {
      setAppReady(true);
      return;
    }
    if (message.type === 'DOCUMENT_READY') {
      setStatus('visible');
      return;
    }
    // LOAD_ERROR trae un código acotado del puente (`api-missing`,
    // `editor-error:<detalle>`…): se muestra tal cual, sin URLs ni tokens.
    setError(`Este dispositivo no pudo mostrar el documento. Código: ${message.message}.`);
    setStatus('failed');
  }, []);

  if (status === 'preparing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
        <AppText variant="caption" tone="secondary">Preparando documento…</AppText>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={styles.center}>
        <AppText variant="title3" weight="800" align="center">No pudimos mostrar el archivo</AppText>
        <AppText variant="body" tone="secondary" align="center">{error ?? 'Intentá de nuevo.'}</AppText>
        <AppButton
          title="Abrir o compartir con…"
          onPress={onExternalOpen}
          disabled={externalBusy || !externalAvailable}
          style={{ marginTop: spacing[3] }}
          accessibilityLabel="Abrir o compartir el archivo con otra app"
        />
      </View>
    );
  }

  if (!html || !allowedOrigin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
        <AppText variant="caption" tone="secondary">Cargando visor…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.officeBox}>
      <WebView
        key={session?.sessionId ?? file.id}
        source={{ html, baseUrl: allowedOrigin }}
        originWhitelist={[allowedOrigin]}
        style={styles.office}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowingReadAccessToURL={undefined}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        mediaPlaybackRequiresUserAction
        mixedContentMode="never"
        onShouldStartLoadWithRequest={(request) => {
          const url = typeof request?.url === 'string' ? request.url : '';
          if (url === 'about:blank' || url.startsWith('about:blank#') || url === 'about:srcdoc') return true;
          return url.startsWith(`${allowedOrigin}/`);
        }}
        onMessage={handleMessage}
        onError={() => {
          setError('Este dispositivo no pudo mostrar el documento. Código: office_webview_error.');
          setStatus('failed');
        }}
        onHttpError={() => {
          setError('Este dispositivo no pudo mostrar el documento. Código: office_webview_http_error.');
          setStatus('failed');
        }}
      />
      {status === 'loading' ? (
        <View style={styles.officeLoading}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="caption" tone="secondary">Cargando visor…</AppText>
        </View>
      ) : null}
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
  pdfPager: { alignItems: 'center', paddingVertical: spacing[1] },
  media: { width: '100%', height: 320, borderRadius: radius.lg, backgroundColor: colors.surface.card },
  officeFill: { flex: 1 },
  officeBox: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  office: { flex: 1, backgroundColor: '#ffffff' },
  officeLoading: { alignItems: 'center', paddingVertical: spacing[3], gap: spacing[1] },
  textBlock: { gap: spacing[2] },
  mono: { lineHeight: 20 },
});
