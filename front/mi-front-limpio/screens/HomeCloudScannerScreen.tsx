/**
 * HomeCloud HC-3E — Document Scanner screen.
 *
 * The scanner is NOT a new entity and NOT a separate upload system: it is one
 * more CREATE source for a HomeCloud File. Pages are temporary local captures;
 * the only HomeCloud output is ONE PDF File handed to the shared Upload Engine
 * through the existing File Intake service (`submitArtifact`), with the same
 * pending/uploading/failure/retry semantics used by ordinary file selection.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, Linking, PanResponder, StyleSheet, View, type GestureResponderEvent, type ImageStyle } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { ActionSheet, AppButton, AppInput, AppText, FormActionRow } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing, touchTargets } from '../constants/theme';
import { errorHaptic, lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { createFileIntakeService } from '../services/homecloud/homecloudFileIntakeService';
import type { FileIntakeDestination, FileIntakeState } from '../services/homecloud/homecloudFileIntakeTypes';
import type { HomeCloudCapabilityDescriptor } from '../services/homecloud/homecloudCapabilitiesAdapter';
import {
  appendPage,
  adoptPageEditOutcome,
  buildScanPdfCacheKey,
  buildScanPdfHtml,
  buildScannerArtifact,
  buildScannerIntakeContext,
  canCreatePdf,
  createScannerPage,
  defaultScanFileName,
  deletePage,
  getPageEffectiveDimensions,
  getPageEffectiveUri,
  movePageEarlier,
  movePageLater,
  normalizeScanFileName,
  replacePage,
  type ScannerPage,
  type ScannerPageEditOutcome,
  type ScanPdfPageInput,
} from '../services/homecloud/homecloudScanner';
import {
  createScannerSubmitGuard,
  planScannerCleanupAfterAcceptance,
  scannerAcceptanceOutcome,
} from '../services/homecloud/homecloudScannerAcceptance';
import { beginHomeCloudImmersiveChrome } from '../services/homecloud/homecloudImmersiveChrome';
import { publishHomeCloudScannerSaved } from '../services/homecloud/homecloudScannerSaved';

type ScannerRoute = {
  folderId?: string | null;
  folderName?: string | null;
  capabilities?: HomeCloudCapabilityDescriptor;
  /** Serializable editor result, adopted exactly once and cleared right after. */
  scannerEditOutcome?: ScannerPageEditOutcome;
  scannerRetakePageId?: string;
};

type GeneratedPdf = {
  uri: string;
  sizeBytes: number;
  /** Identidad del contenido generado: páginas (id+uri) + nombre normalizado. */
  key: string;
  name: string;
};

const ACTIVE_INTAKE_STATUSES = new Set<FileIntakeState['status']>(['preparing', 'uploading', 'verifying', 'finalizing']);

async function deleteQuietly(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Cleanup failure must never lose uploaded content nor block creation.
  }
}

export function HomeCloudScannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  useEffect(() => beginHomeCloudImmersiveChrome(), []);

  const params = (route.params ?? {}) as ScannerRoute;
  const folderId: string | null = params.folderId ?? null;
  const folderName: string | null = params.folderName ?? null;
  const capabilities: HomeCloudCapabilityDescriptor = params.capabilities
    ?? { view: false, contribute: false, organize: false, delete: false, anyWrite: false };

  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [torch, setTorch] = useState(false);
  const [remountKey, setRemountKey] = useState(0);

  const [phase, setPhase] = useState<'camera' | 'review'>('camera');
  const [pages, setPages] = useState<ScannerPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retakeId, setRetakeId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const captureCounterRef = useRef(0);

  const [saveOpen, setSaveOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [intake, setIntake] = useState<FileIntakeState>({ status: 'idle' });

  const [discardOpen, setDiscardOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [destinations, setDestinations] = useState<FileIntakeDestination[]>([]);
  const [saveDestinationName, setSaveDestinationName] = useState(folderName ?? 'Archivos');
  const [saveDestinationId, setSaveDestinationId] = useState<string | null>(folderId);
  const dragPageRef = useRef<{ id: string; startX: number; lastIndex: number } | null>(null);

  // Refs for back-interception and conservative temp-file cleanup.
  const pagesRef = useRef<ScannerPage[]>(pages);
  pagesRef.current = pages;
  const pdfRef = useRef<GeneratedPdf | null>(null);
  const savedRef = useRef(false);
  const allowLeaveRef = useRef(false);
  // W1-C: the acceptance boundary is one-shot and separate from `savedRef`
  // (which also means "nothing left to discard"). Kept distinct so a
  // post-acceptance completion can never re-trigger navigation.
  const acceptedRef = useRef(false);
  // Synchronous re-entrancy guard. A second tap on "Guardar escaneo" must not
  // create a SECOND UploadJob: `generating` is React state, so two taps inside
  // one frame would both read a stale `false` from the closure. The guard flips
  // synchronously, before any await.
  const submitGuardRef = useRef(createScannerSubmitGuard());
  // The acceptance boundary is reached from an async continuation, so it must
  // never touch navigation or state after this screen is gone.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const intakeStatusRef = useRef<FileIntakeState['status']>('idle');
  intakeStatusRef.current = intake.status;
  const accessTokenRef = useRef(session?.access_token ?? null);
  accessTokenRef.current = session?.access_token ?? null;
  const blockedActionRef = useRef<any>(null);

  const intakeContext = useMemo(() => buildScannerIntakeContext(folderId), [folderId]);

  const service = useMemo(() => {
    if (!session?.access_token || !currentHousehold) return null;
    return createFileIntakeService({
      householdId: currentHousehold.id,
      accessToken: session.access_token,
      getAccessToken: () => accessTokenRef.current,
      capabilities,
      initialFolderId: intakeContext.initialFolderId,
      initialFolderName: folderName,
      intakeSource: intakeContext.intakeSource,
    });
  }, [currentHousehold?.id, capabilities.contribute, intakeContext, folderName]);

  useEffect(() => {
    if (!service) return undefined;
    const unsubscribe = service.subscribe(setIntake);
    // Canonical shared recovery (same engine path as the file picker):
    // resume an interrupted scanner/file job instead of registering a dupe.
    void service.recover();
    return unsubscribe;
  }, [service]);

  const cleanupTempFiles = useCallback(() => {
    const capturedOriginal = pagesRef.current.map((page) => page.originalUri);
    const capturedProcessed = pagesRef.current.map((page) => page.processedUri).filter((u): u is string => !!u);
    const pdfUri = pdfRef.current?.uri;
    pagesRef.current = [];
    setPages([]);
    pdfRef.current = null;
    capturedOriginal.forEach((uri) => void deleteQuietly(uri));
    capturedProcessed.forEach((uri) => void deleteQuietly(uri));
    void deleteQuietly(pdfUri);
  }, []);

  /**
   * THE ACCEPTANCE BOUNDARY — this is where the Scanner stops being the owner.
   *
   * Up to here the Scanner owns the draft: the local captures, the generated
   * PDF and the decision to stay open and offer a retry. Once the UploadJob is
   * DURABLY accepted, ownership moves to the household coordinator (execution)
   * and to the W1-C global read reconciliation (visibility), so the Scanner
   * detaches immediately instead of waiting for `completed`.
   *
   * Only LOCAL, ALREADY-REDUNDANT state is cleaned here: the temporary captures
   * and the source PDF. The durable workspace copy and the UploadJob are NOT
   * touched — they belong to the engine, and deleting them here (or relying on
   * unmount to do it) would be exactly the ownership inversion this fixes.
   */
  const handleAccepted = useCallback(() => {
    if (acceptedRef.current) return; // one-shot: acceptance navigates exactly once
    acceptedRef.current = true;
    setSaveOpen(false);
    successHaptic();
    // Only LOCAL, ALREADY-REDUNDANT state: the temporary captures and the
    // source PDF. The plan carries no handle to the durable workspace copy and
    // no way to cancel the job, so detaching can never destroy or abort them.
    const originalUris = pagesRef.current.map((page) => page.originalUri);
    const processedUris = pagesRef.current.map((page) => page.processedUri).filter((u): u is string => !!u);
    const plan = planScannerCleanupAfterAcceptance({
      captureUris: originalUris,
      generatedPdfUri: pdfRef.current?.uri ?? null,
    });
    pagesRef.current = [];
    setPages([]);
    pdfRef.current = null;
    plan.deleteTempCaptureUris.forEach((uri) => void deleteQuietly(uri));
    processedUris.forEach((uri) => void deleteQuietly(uri));
    void deleteQuietly(plan.deleteGeneratedPdfUri);
    // Accepted: leaving is no longer a discard, so the back guard must not
    // intercept this very navigation.
    allowLeaveRef.current = true;
    savedRef.current = true;
    navigation.goBack();
  }, [navigation]);

  // Refresh the permission snapshot when returning from system Settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && permission && !permission.granted) void getPermission();
    });
    return () => sub.remove();
  }, [permission, getPermission]);

  // Cancel/back: 0 pages exits immediately; with pages ask before discarding.
  useEffect(() => navigation.addListener('beforeRemove', (e: any) => {
    const unsaved = pagesRef.current.length > 0 && !savedRef.current;
    const uploading = ACTIVE_INTAKE_STATUSES.has(intakeStatusRef.current);
    if (!unsaved || uploading || allowLeaveRef.current) return;
    e.preventDefault();
    blockedActionRef.current = e.data.action;
    setDiscardOpen(true);
  }), [navigation]);

  const requestClose = useCallback(() => {
    if (pagesRef.current.length === 0 || savedRef.current) {
      navigation.goBack();
      return;
    }
    setDiscardOpen(true);
  }, [navigation]);

  const confirmDiscard = useCallback(() => {
    allowLeaveRef.current = true;
    setDiscardOpen(false);
    cleanupTempFiles();
    const blocked = blockedActionRef.current;
    blockedActionRef.current = null;
    if (blocked) navigation.dispatch(blocked);
    else navigation.goBack();
  }, [navigation, cleanupTempFiles]);

  const handleCapture = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady || capturing) return;
    setCapturing(true);
    setCaptureError(null);
    mediumHaptic();
    try {
      // No skipProcessing: default processing keeps correct orientation.
      const photo = await camera.takePictureAsync({ quality: 1 });
      const replaced = retakeId;
      const pageId = `scan_${Date.now()}_${captureCounterRef.current++}`;
      const page = createScannerPage(pageId, photo.uri, photo.width, photo.height);
      if (replaced) {
        const replacedPage = pagesRef.current.find((item) => item.id === replaced);
        // A retake destroys the page's whole temp family: original and any
        // previously adopted processed file (both Scanner-owned).
        void deleteQuietly(replacedPage?.originalUri);
        void deleteQuietly(replacedPage?.processedUri ?? null);
      }
      const nextPages = replaced ? replacePage(pagesRef.current, replaced, page) : appendPage(pagesRef.current, page);
      pdfRef.current = null; // pages changed: any generated PDF is stale
      setPages(nextPages);
      setRetakeId(null);
      setSelectedId(page.id);
      setPhase('review');
      navigation.navigate('ScannerImageEditor', { page });
    } catch {
      setCaptureError('No pudimos capturar la página. Probá de nuevo.');
    } finally {
      setCapturing(false);
    }
  }, [cameraReady, capturing, retakeId, navigation]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const prev = pagesRef.current;
    const removedIndex = prev.findIndex((page) => page.id === selectedId);
    if (removedIndex < 0) return;
    void deleteQuietly(prev[removedIndex]?.originalUri);
    void deleteQuietly(prev[removedIndex]?.processedUri ?? null);
    const next = deletePage(prev, selectedId);
    pdfRef.current = null;
    setPages(next);
    setSelectedId(next[Math.min(removedIndex, next.length - 1)]?.id ?? null);
  }, [selectedId]);

  useEffect(() => {
    if (phase === 'review' && pages.length === 0) setPhase('camera');
  }, [phase, pages.length]);

  const handleOpenSave = useCallback(() => {
    if (!canCreatePdf(pagesRef.current)) return;
    setPdfError(null);
    setFileName((prev) => (prev.trim() ? prev : defaultScanFileName()));
    setSaveOpen(true);
  }, []);

  const generatePdf = useCallback(async (name: string): Promise<GeneratedPdf> => {
    const snapshot = pagesRef.current;
    // Content identity: effective image per page + name. Any adoption, retake,
    // reset, deletion or reorder changes it, so a stale PDF is never reused.
    const key = buildScanPdfCacheKey(snapshot, name);
    if (pdfRef.current && pdfRef.current.key === key) return pdfRef.current;
    const images: ScanPdfPageInput[] = [];
    for (const page of snapshot) {
      const effectiveUri = getPageEffectiveUri(page);
      const base64 = await FileSystem.readAsStringAsync(effectiveUri, { encoding: FileSystem.EncodingType.Base64 });
      const dims = getPageEffectiveDimensions(page);
      images.push({ base64, width: dims?.width, height: dims?.height });
    }
    const html = buildScanPdfHtml(images);
    const printed = await Print.printToFileAsync({ html });
    const info = await FileSystem.getInfoAsync(printed.uri);
    if (!info.exists || typeof info.size !== 'number' || info.size <= 0) {
      throw new Error('empty_pdf');
    }
    const previous = pdfRef.current;
    pdfRef.current = { uri: printed.uri, sizeBytes: info.size, key, name };
    void deleteQuietly(previous?.uri); // stale generated PDF, never handed off
    return pdfRef.current;
  }, []);

  const handleSave = useCallback(async () => {
    if (!service || !submitGuardRef.current.tryBegin() || ACTIVE_INTAKE_STATUSES.has(intakeStatusRef.current)) return;
    setPdfError(null);
    const name = normalizeScanFileName(fileName);
    setGenerating(true);
    let pdf: GeneratedPdf;
    try {
      pdf = await generatePdf(name);
    } catch {
      submitGuardRef.current.end();
      // BEFORE acceptance: the Scanner stays open, the pages and the local PDF
      // survive, and a retry is possible. No navigation, ever.
      if (mountedRef.current) {
        setGenerating(false);
        setPdfError('No pudimos crear el PDF. Tus páginas siguen acá, probá de nuevo.');
        errorHaptic();
      }
      return;
    }
    if (mountedRef.current) setGenerating(false);
    await service.submitArtifact(buildScannerArtifact({ localUri: pdf.uri, sizeBytes: pdf.sizeBytes, displayName: name }));
    submitGuardRef.current.end();

    // THE ACCEPTANCE BOUNDARY, decided from the REAL accepted signal.
    //
    // `getAcceptedJobId()` is set by the intake service only after the
    // UploadJob has been durably persisted, and it stays `null` for every
    // failure before that (durable copy, register enqueue). So this is the
    // acceptance boundary itself — not a timeout, not a visual status and not
    // the start of the upload.
    const outcome = scannerAcceptanceOutcome({
      acceptedJobId: service.getAcceptedJobId(),
      alreadyAccepted: acceptedRef.current,
    });
    // BEFORE acceptance: the failure is already projected by the service, so the
    // Scanner deliberately stays open with the error and a retry.
    if (outcome.kind !== 'detach') return;
    if (!mountedRef.current) return;
    // The shared coordinator owns the accepted upload. This screen remains as a
    // recoverable review until that job actually completes or fails.
  }, [service, fileName, generatePdf]);

  useEffect(() => {
    if (intake.status !== 'completed' || !intake.contentId || acceptedRef.current) return;
    publishHomeCloudScannerSaved({ contentId: intake.contentId, folderId: saveDestinationId });
    handleAccepted();
  }, [handleAccepted, intake.contentId, intake.status, saveDestinationId]);

  const handleRetrySave = useCallback(async () => {
    if (!service) return;
    // Failed jobs retry through the existing UploadJob semantics. If the
    // failure happened before a job existed, resubmit the preserved PDF.
    if (service.hasActiveJob()) await service.retry();
    else await handleSave();
  }, [service, handleSave]);

  const openSettings = useCallback(() => { void Linking.openSettings().catch(() => {}); }, []);

  const openSaveDestination = useCallback(async () => {
    if (!service) return;
    await service.loadFolders();
    setDestinations(service.getAvailableDestinations());
    setDestinationOpen(true);
  }, [service]);

  const selectedPage = pages.find((page) => page.id === selectedId) ?? pages[pages.length - 1] ?? null;
  /** HC-POL-022 — where the selected page sits, so a reorder button can disable itself at the edges. */
  const selectedPageIndex = selectedPage ? pages.findIndex((page) => page.id === selectedPage.id) : -1;

  /**
   * Editor result boundary (B1). The editor hands back a SERIALIZABLE outcome
   * via navigation params — no callbacks ever lived in navigation state, so
   * there is nothing to leak and nothing to clean up on unmount.
   *
   * Adoption is parent-owned and one-shot: delete the page's PREVIOUS
   * processed file (the Scanner owned it), install the new one, invalidate the
   * generated PDF and clear the param so it can never be applied twice.
   */
  useEffect(() => {
    const outcome = params.scannerEditOutcome;
    if (!outcome) return;
    const previous = pagesRef.current.find((page) => page.id === outcome.pageId);
    if (previous?.processedUri && previous.processedUri !== outcome.processedUri) {
      void deleteQuietly(previous.processedUri);
    }
    const nextPages = adoptPageEditOutcome(pagesRef.current, outcome);
    const stalePdf = pdfRef.current?.uri ?? null;
    pdfRef.current = null; // effective image changed: the generated PDF is stale
    void deleteQuietly(stalePdf);
    setPages(nextPages);
    setSelectedId(outcome.pageId);
    navigation.setParams({ scannerEditOutcome: undefined });
  }, [params.scannerEditOutcome, navigation]);

  useEffect(() => {
    const pageId = params.scannerRetakePageId;
    if (!pageId) return;
    setRetakeId(pageId);
    setPhase('camera');
    navigation.setParams({ scannerRetakePageId: undefined });
  }, [params.scannerRetakePageId, navigation]);

  /**
   * PATCH 1C (H/I/J) — open ONE page's editor. The multipage review NEVER
   * edits: every perspective correction, rotation and crop belongs to the page
   * the member chose, in its own editor. The optional page argument is how a
   * VISIBLE `Editar` action names its target; the large preview is a display
   * surface and a thumbnail tap only SELECTS, so this is the one editor entry.
   */
  const handleEditPage = useCallback((page?: ScannerPage) => {
    const target = page ?? selectedPage;
    if (!target) return;
    // Serializable navigation contract: the page snapshot only (id, uris,
    // dims, canonical edit params). React Navigation 7 checks serializability.
    navigation.navigate('ScannerImageEditor', { page: target });
  }, [navigation, selectedPage]);

  /**
   * PATCH 1C (I) — REPETIR is a visible page action: retake the selected page.
   * The camera replaces the page at the SAME index (`replacePage` with
   * `retakeId`), never a duplicate append, and the selected page stays selected.
   */
  const handleRepeatSelected = useCallback(() => {
    if (!selectedPage) return;
    setRetakeId(selectedPage.id);
    setPhase('camera');
  }, [selectedPage]);

  /**
   * HC-POL-022 — Reorder the selected page one discrete step. The edge is
   * checked HERE and not by array identity: a no-op must never drop a valid
   * generated PDF, and the buttons disable themselves with the same condition.
   */
  const handleMovePage = useCallback((direction: 'earlier' | 'later') => {
    if (!selectedPage) return;
    const current = pagesRef.current;
    const index = current.findIndex((page) => page.id === selectedPage.id);
    if (direction === 'earlier' && index <= 0) return;
    if (direction === 'later' && (index === -1 || index >= current.length - 1)) return;
    const nextPages = direction === 'earlier'
      ? movePageEarlier(current, selectedPage.id)
      : movePageLater(current, selectedPage.id);
    pdfRef.current = null; // order changed: the previously generated PDF is stale
    setPages(nextPages);
    lightHaptic();
  }, [selectedPage]);

  // A stable responder owns one thumbnail reorder stroke.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const reorderDragResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => dragPageRef.current !== null,
    onMoveShouldSetPanResponderCapture: () => dragPageRef.current !== null,
    onPanResponderMove: (_event, gesture) => {
      const active = dragPageRef.current;
      if (!active) return;
      const delta = Math.round((gesture.moveX - active.startX) / 72);
      const target = Math.max(0, Math.min(pagesRef.current.length - 1, active.lastIndex + delta));
      const currentIndex = pagesRef.current.findIndex((page) => page.id === active.id);
      if (currentIndex < 0 || target === currentIndex) return;
      const next = [...pagesRef.current];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(target, 0, moved);
      dragPageRef.current = { ...active, startX: gesture.moveX, lastIndex: target };
      pdfRef.current = null;
      setPages(next);
      lightHaptic();
    },
    onPanResponderRelease: () => { dragPageRef.current = null; },
    onPanResponderTerminate: () => { dragPageRef.current = null; },
    onPanResponderTerminationRequest: () => false,
  }), []);

  const intakeActive = ACTIVE_INTAKE_STATUSES.has(intake.status);
  const intakeFailed = intake.status === 'failed';

  const scannerBottomPadding = Math.max(insets.bottom, spacing[3]) + spacing[2];

  // --- Estado: sin sesión/hogar (inoalcanzable desde Archivos, pero seguro) ---
  if (!service) {
    return (
      <View style={styles.messageScreen}>
        <AppText variant="title3" weight="800" align="center">No pudimos iniciar el escáner.</AppText>
        <AppButton title="Volver" variant="secondary" onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={styles.messageAction} />
      </View>
    );
  }

  // --- Permisos de cámara ---
  if (!permission) {
    return <View style={styles.messageScreen}><ActivityIndicator color={colors.brand} /></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.messageScreen}>
        <HomePlusIcon name="camera-outline" size={38} color={colors.text.tertiary} />
        <AppText variant="body" align="center">HomePlus necesita acceso a la cámara para escanear documentos.</AppText>
        {permission.canAskAgain
          ? <AppButton title="Permitir cámara" onPress={() => void requestPermission()} accessibilityLabel="Permitir cámara" style={styles.messageAction} />
          : <AppButton title="Abrir configuración" onPress={openSettings} accessibilityLabel="Abrir configuración" style={styles.messageAction} />}
        <AppButton title="Volver" variant="secondary" onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={styles.messageAction} />
      </View>
    );
  }

  // --- Cámara no disponible / fallo de montaje ---
  if (cameraError) {
    return (
      <View style={styles.messageScreen}>
        <AppText variant="body" align="center">{cameraError}</AppText>
        <AppButton title="Reintentar" variant="secondary" onPress={() => { setCameraError(null); setCameraReady(false); setRemountKey((k) => k + 1); }} accessibilityLabel="Reintentar" style={styles.messageAction} />
        <AppButton title="Volver" variant="secondary" onPress={() => navigation.goBack()} accessibilityLabel="Volver" style={styles.messageAction} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {phase === 'camera' ? (
        <View style={styles.cameraWrap}>
          <CameraView
            key={remountKey}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => setCameraError('No pudimos iniciar la cámara en este dispositivo.')}
          />
          <View style={[styles.cameraTop, { paddingTop: insets.top + spacing[2] }]}>
            <AppButton variant="icon" size="sm" onPress={requestClose} accessibilityLabel="Cerrar escáner" style={styles.overlayButton}>
              <HomePlusIcon name="close" size={22} color={colors.text.inverse} />
            </AppButton>
            <AppButton variant="icon" size="sm" onPress={() => setTorch((v) => !v)} accessibilityLabel={torch ? 'Apagar flash' : 'Encender flash'} style={styles.overlayButton}>
              <HomePlusIcon name={torch ? 'flash' : 'flash-off'} size={20} color={colors.text.inverse} />
            </AppButton>
          </View>
          {captureError ? (
            <View style={[styles.captureError, { top: insets.top + spacing[8] + spacing[6] }]}>
              <AppText variant="bodySmall" tone="inverse" align="center">{captureError}</AppText>
            </View>
          ) : null}
          <View style={[styles.cameraBottom, { paddingBottom: scannerBottomPadding }]}>
            {pages.length > 0 ? (
              <AppText variant="bodySmall" tone="inverse" weight="700" style={styles.pageCount}>
                {pages.length === 1 ? '1 página' : `${pages.length} páginas`}
              </AppText>
            ) : (
              <AppText variant="bodySmall" tone="inverse" style={styles.pageCount}>
                {retakeId ? 'Repetí la página' : 'Apuntá al documento y capturá la página'}
              </AppText>
            )}
            <View style={styles.shutterRow}>
              <View style={styles.shutterSide} />
              <AppButton
                variant="icon"
                onPress={handleCapture}
                disabled={!cameraReady || capturing}
                accessibilityLabel="Capturar página"
                style={[styles.shutter, (!cameraReady || capturing) && styles.shutterDisabled]}
              >
                {capturing ? <ActivityIndicator color={colors.brand} /> : <View style={styles.shutterInner} />}
              </AppButton>
              <View style={styles.shutterSide}>
                {pages.length > 0 ? (
                  <AppButton variant="icon" size="sm" onPress={() => setPhase('review')} accessibilityLabel="Ver páginas capturadas" style={styles.overlayButton}>
                    <HomePlusIcon name="images-outline" size={22} color={colors.text.inverse} />
                  </AppButton>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.review, { paddingTop: insets.top + spacing[2] }]}>
          {/* PATCH 1C (I) — final Review header: X · Escaneo · N páginas. The
              page-action `⋯` is GONE: Repetir/Editar/Eliminar and the one-step
              reorder controls are visible below instead of hidden in overflow. */}
          <View style={styles.reviewTop}>
            <AppButton variant="icon" size="sm" onPress={requestClose} accessibilityLabel="Cerrar escáner">
              <HomePlusIcon name="close" size={22} color={colors.text.primary} />
            </AppButton>
            <View style={styles.reviewTitle}>
              <AppText variant="title3" weight="800">Escaneo · {pages.length === 1 ? '1 página' : `${pages.length} páginas`}</AppText>
            </View>
            <View style={styles.reviewTopSpacer} />
          </View>
          {/* PATCH 1C (H) — the large preview is a DISPLAY SURFACE (View →
              Image), never a giant Edit button. Definite layout: the container
              takes the flex space and the image fills it with contain. The
              image resolves through the SAME canonical resolver as the
              thumbnails (ScannerPageImage), with an honest fallback chain. */}
          <View style={styles.previewWrap}>
            {selectedPage ? (
              <ScannerPageImage
                page={selectedPage}
                style={styles.preview}
                accessibilityLabel="Vista previa de la página seleccionada"
              />
            ) : null}
          </View>
          {/* PATCH 1C (I) — the selected page's actions are VISIBLE, compact,
              one row: Repetir · Editar · Eliminar. No three giant cards, no
              overflow menu. */}
          <View style={styles.pageActionRow}>
            <AppButton title="Repetir" size="sm" variant="secondary" disabled={!selectedPage} onPress={handleRepeatSelected} accessibilityLabel="Repetir la captura de la página seleccionada" style={styles.pageActionButton} />
            <AppButton title="Editar" size="sm" variant="secondary" disabled={!selectedPage} onPress={() => handleEditPage()} accessibilityLabel="Editar la página seleccionada" style={styles.pageActionButton} />
            <AppButton title="Eliminar" size="sm" variant="danger" disabled={!selectedPage} onPress={handleDeleteSelected} accessibilityLabel="Eliminar la página seleccionada" style={styles.pageActionButton} />
          </View>
          <View {...reorderDragResponder.panHandlers}><FlatList
            horizontal
            data={pages}
            keyExtractor={(page) => page.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbList}
            renderItem={({ item, index }) => (
              <AppButton
                variant="icon"
                // PATCH 1C (J) — tapping an existing thumbnail SELECTS the
                // page (large preview + visible actions follow `selectedId`).
                // It never opens the editor; `Editar` is the explicit door.
                onPress={() => { setSelectedId(item.id); }}
                onLongPress={(event?: GestureResponderEvent) => { setSelectedId(item.id); dragPageRef.current = { id: item.id, startX: event?.nativeEvent.pageX ?? 0, lastIndex: index }; mediumHaptic(); }}
                delayLongPress={300}
                accessibilityLabel={`Página ${index + 1}${item.id === selectedPage?.id ? ', seleccionada' : ''}. Tocá para seleccionar esta página`}
                style={[styles.thumbButton, item.id === selectedPage?.id && styles.thumbButtonSelected]}
              >
                <ScannerPageImage page={item} style={styles.thumb} resizeMode="cover" accessibilityLabel="" />
                <AppText variant="caption" tone={item.id === selectedPage?.id ? 'brand' : 'secondary'} weight="700">{index + 1}</AppText>
              </AppButton>
            )}
          /></View>
          {pages.length > 1 ? (
            // PATCH 1C (I) — one-step reorder is VISIBLE (drag stays too, as
            // the direct gesture). First page can't move earlier, last can't
            // move later; the selected page stays selected after the move.
            <View style={styles.reorderRow}>
              <AppButton title="← Mover antes" size="sm" variant="secondary" disabled={!selectedPage || selectedPageIndex <= 0} onPress={() => handleMovePage('earlier')} accessibilityLabel="Mover la página seleccionada una posición antes" style={styles.reorderButton} />
              <AppButton title="Mover después →" size="sm" variant="secondary" disabled={!selectedPage || selectedPageIndex < 0 || selectedPageIndex >= pages.length - 1} onPress={() => handleMovePage('later')} accessibilityLabel="Mover la página seleccionada una posición después" style={styles.reorderButton} />
            </View>
          ) : null}
          <View style={styles.reviewActions}>
            {/* HC-POL-022 — the multipage review offers the PAGE-SET actions
                (add, save). It deliberately offers NO global perspective,
                rotation or crop: those edit ONE page, they live in that
                page's editor. */}
            <AppButton title="+ Página" variant="secondary" onPress={() => { setRetakeId(null); setPhase('camera'); }} accessibilityLabel="Agregar página" style={styles.reviewAction} />
            <AppButton title="Guardar PDF" onPress={handleOpenSave} disabled={!canCreatePdf(pages)} accessibilityLabel="Guardar PDF" style={styles.reviewAction} />
          </View>
          <View style={{ height: scannerBottomPadding }} />
        </View>
      )}

      <ActionSheet
        visible={saveOpen}
        title="Guardar escaneo"
        onRequestClose={() => { if (!intakeActive) setSaveOpen(false); }}
        closeDisabled={intakeActive}
        size="content"
        footer={intakeFailed ? undefined : <AppButton title="Guardar escaneo" loading={generating || intakeActive} disabled={generating || intakeActive} onPress={() => void handleSave()} accessibilityLabel="Guardar escaneo" />}
      >
        <View style={styles.saveBody}>
          <AppInput label="Nombre" value={fileName} onChangeText={setFileName} editable={!generating && !intakeActive} autoCapitalize="none" autoCorrect={false} />
          <FormActionRow label="Guardar en" value={saveDestinationName} onPress={() => void openSaveDestination()} accessibilityLabel={`Destino actual: ${saveDestinationName}. Cambiar destino.`} disabled={generating || intakeActive} />
          {pdfError ? <AppText variant="bodySmall" tone="danger">{pdfError}</AppText> : null}
          {intakeActive ? (
            <AppText variant="bodySmall" tone="secondary">
              {intake.status === 'preparing' ? 'Preparando…' : intake.status === 'uploading' ? 'Subiendo…' : intake.status === 'verifying' ? 'Verificando…' : 'Guardando…'}
            </AppText>
          ) : null}
          {intakeFailed ? (
            <View style={styles.saveError}>
              <AppText variant="body" weight="700" tone="danger">No pudimos guardar el archivo</AppText>
              <AppButton title="Reintentar" size="sm" variant="secondary" onPress={() => void handleRetrySave()} accessibilityLabel="Reintentar guardar archivo" />
            </View>
          ) : null}
        </View>
      </ActionSheet>

      <ActionSheet visible={destinationOpen} title="Guardar en" onRequestClose={() => setDestinationOpen(false)} size="content">
        <View style={styles.saveBody}>{destinations.map((destination) => <AppButton key={destination.id} title={destination.path ?? destination.name} variant="secondary" disabled={destination.id === (saveDestinationId ?? 'root')} onPress={() => { const id = destination.id === 'root' ? null : destination.id; service.selectDestination(id, destination.id === 'root' ? null : destination.name); setSaveDestinationId(id); setSaveDestinationName(destination.path ?? destination.name); setDestinationOpen(false); }} />)}</View>
      </ActionSheet>

      <ActionSheet visible={discardOpen} title="¿Descartar este escaneo?" onRequestClose={() => setDiscardOpen(false)} size="content">
        <View style={styles.saveBody}>
          <AppButton title="Seguir escaneando" variant="secondary" onPress={() => setDiscardOpen(false)} accessibilityLabel="Seguir escaneando" />
          <AppButton title="Descartar" variant="danger" onPress={confirmDiscard} accessibilityLabel="Descartar escaneo" />
        </View>
      </ActionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  messageScreen: { flex: 1, backgroundColor: colors.background.base, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  messageAction: { alignSelf: 'stretch' },
  cameraWrap: { flex: 1, backgroundColor: '#000000' },
  cameraTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4] },
  overlayButton: { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'transparent' },
  captureError: { position: 'absolute', left: spacing[5], right: spacing[5], backgroundColor: colors.danger.base, borderRadius: radius.lg, paddingVertical: spacing[2], paddingHorizontal: spacing[4] },
  cameraBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: spacing[3] },
  pageCount: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full, paddingVertical: spacing[1], paddingHorizontal: spacing[4], overflow: 'hidden' },
  shutterRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: spacing[6] },
  shutterSide: { flex: 1, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.25)' },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
  review: { flex: 1, backgroundColor: colors.background.base },
  reviewTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], gap: spacing[2] },
  reviewTitle: { flex: 1, alignItems: 'center' },
  reviewTopSpacer: { width: touchTargets.normal },
  previewWrap: { flex: 1, minHeight: 0, margin: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: '#000000', overflow: 'hidden', alignItems: 'stretch', justifyContent: 'center' },
  preview: { width: '100%', height: '100%' },
  /** PATCH 1C (I) — one compact row of visible page actions (no giant cards). */
  pageActionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[1] },
  pageActionButton: { flexGrow: 1, flexBasis: 0 },
  /** PATCH 1C (I) — visible one-step reorder row (drag reorder stays too). */
  reorderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[1] },
  reorderButton: { flexGrow: 1, flexBasis: 0 },
  thumbList: { gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  thumbButton: { borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', padding: spacing[1], backgroundColor: colors.surface.card, alignItems: 'center', gap: spacing[1] },
  thumbButtonSelected: { borderColor: colors.brand },
  thumb: { width: 56, height: 72, borderRadius: radius.sm, backgroundColor: '#000000' },
  /** PATCH 1C (H) — explicit, recoverable preview failure state. */
  previewError: { alignItems: 'center', justifyContent: 'center', padding: spacing[4], backgroundColor: colors.surface.soft, borderRadius: radius.md },
  reviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  reviewAction: { flexGrow: 1 },
  reviewFooter: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  saveBody: { gap: spacing[3], paddingBottom: spacing[2] },
  saveError: { gap: spacing[2], alignItems: 'flex-start', padding: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.danger.base, backgroundColor: colors.danger.soft },
});

/**
 * PATCH 1C (H) — THE ONE canonical page-display resolver for Review.
 *
 * Both the thumbnail strip and the large preview consume THIS component, so
 * they can never disagree about what a page looks like. Source policy, once:
 *
 *   processed/display URI (if any)  →  original captured URI  →  explicit
 *   recoverable placeholder.
 *
 * A processed image that fails to load falls back to the original ONCE; an
 * original that also fails shows an explicit recoverable placeholder — never
 * a silent black rectangle. Failures are per-URI and reset when the page or
 * its URIs change, so an edit adoption (new processedUri) re-arms the chain.
 * The scanner session is never touched: this is presentation only.
 */
function ScannerPageImage({ page, style, resizeMode = 'contain', accessibilityLabel }: {
  page: ScannerPage;
  style: ImageStyle;
  resizeMode?: 'contain' | 'cover';
  accessibilityLabel: string;
}) {
  const processed = page.processedUri ?? null;
  const [failedProcessed, setFailedProcessed] = useState(false);
  const [failedOriginal, setFailedOriginal] = useState(false);
  useEffect(() => {
    setFailedProcessed(false);
    setFailedOriginal(false);
  }, [page.id, processed, page.originalUri]);
  const showProcessed = processed !== null && !failedProcessed;
  // The BASE policy is the canonical `getPageEffectiveUri` (the same one the
  // PDF reads): processed when there is one, original otherwise. Only the
  // load-failure fallback is display-local.
  const uri = showProcessed ? getPageEffectiveUri(page) : page.originalUri;
  if (!showProcessed && failedOriginal) {
    return (
      <View style={[style, styles.previewError]}>
        <AppText variant="caption" tone="secondary" align="center">No se pudo mostrar la vista previa</AppText>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      onError={() => { if (showProcessed) setFailedProcessed(true); else setFailedOriginal(true); }}
    />
  );
}
