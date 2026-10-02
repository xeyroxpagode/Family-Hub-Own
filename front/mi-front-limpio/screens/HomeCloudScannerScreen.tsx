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
import { ActivityIndicator, AppState, FlatList, Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { ActionSheet, AppButton, AppInput, AppText, floatingNavigationMetrics } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing, touchTargets } from '../constants/theme';
import { errorHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { createFileIntakeService } from '../services/homecloud/homecloudFileIntakeService';
import type { FileIntakeState } from '../services/homecloud/homecloudFileIntakeTypes';
import type { HomeCloudCapabilityDescriptor } from '../services/homecloud/homecloudCapabilitiesAdapter';
import {
  appendPage,
  buildScanPdfHtml,
  buildScannerArtifact,
  buildScannerIntakeContext,
  canCreatePdf,
  defaultScanFileName,
  deletePage,
  normalizeScanFileName,
  replacePage,
  type ScannerPage,
  type ScanPdfPageInput,
} from '../services/homecloud/homecloudScanner';
import {
  createScannerSubmitGuard,
  planScannerCleanupAfterAcceptance,
  scannerAcceptanceOutcome,
} from '../services/homecloud/homecloudScannerAcceptance';

type ScannerRoute = {
  folderId?: string | null;
  folderName?: string | null;
  capabilities?: HomeCloudCapabilityDescriptor;
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
    const captured = pagesRef.current.map((page) => page.uri);
    const pdfUri = pdfRef.current?.uri;
    pagesRef.current = [];
    setPages([]);
    pdfRef.current = null;
    captured.forEach((uri) => void deleteQuietly(uri));
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
    const plan = planScannerCleanupAfterAcceptance({
      captureUris: pagesRef.current.map((page) => page.uri),
      generatedPdfUri: pdfRef.current?.uri ?? null,
    });
    pagesRef.current = [];
    setPages([]);
    pdfRef.current = null;
    plan.deleteTempCaptureUris.forEach((uri) => void deleteQuietly(uri));
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
      const page: ScannerPage = {
        id: `scan_${Date.now()}_${captureCounterRef.current++}`,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
      if (replaced) void deleteQuietly(pagesRef.current.find((item) => item.id === replaced)?.uri);
      const nextPages = replaced ? replacePage(pagesRef.current, replaced, page) : appendPage(pagesRef.current, page);
      pdfRef.current = null; // pages changed: any generated PDF is stale
      setPages(nextPages);
      setRetakeId(null);
      setSelectedId(page.id);
      setPhase('review');
    } catch {
      setCaptureError('No pudimos capturar la página. Probá de nuevo.');
    } finally {
      setCapturing(false);
    }
  }, [cameraReady, capturing, retakeId]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const prev = pagesRef.current;
    const removedIndex = prev.findIndex((page) => page.id === selectedId);
    if (removedIndex < 0) return;
    void deleteQuietly(prev[removedIndex]?.uri);
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
    const key = `${snapshot.map((page) => `${page.id}:${page.uri}`).join('|')}#${name}`;
    if (pdfRef.current && pdfRef.current.key === key) return pdfRef.current;
    const images: ScanPdfPageInput[] = [];
    for (const page of snapshot) {
      const base64 = await FileSystem.readAsStringAsync(page.uri, { encoding: FileSystem.EncodingType.Base64 });
      images.push({ base64, width: page.width, height: page.height });
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
    // AFTER acceptance: detach now. The coordinator keeps uploading, and the
    // W1-C global reconciliation makes the file appear on its own.
    handleAccepted();
  }, [service, fileName, generatePdf, handleAccepted]);

  const handleRetrySave = useCallback(async () => {
    if (!service) return;
    // Failed jobs retry through the existing UploadJob semantics. If the
    // failure happened before a job existed, resubmit the preserved PDF.
    if (service.hasActiveJob()) await service.retry();
    else await handleSave();
  }, [service, handleSave]);

  const openSettings = useCallback(() => { void Linking.openSettings().catch(() => {}); }, []);

  const selectedPage = pages.find((page) => page.id === selectedId) ?? pages[pages.length - 1] ?? null;
  const intakeActive = ACTIVE_INTAKE_STATUSES.has(intake.status);
  const intakeFailed = intake.status === 'failed';

  // The global floating BottomNav is absolutely positioned OVER tab content and
  // stays visible while the Scanner is active. Reserve its real occupied height
  // (bar + own bottom inset) plus a small gap so no Scanner CTA renders under it.
  // Same formula already used by PresenceScreen for the same overlay.
  const bottomNavOverlayPadding = floatingNavigationMetrics.mainRegularHeight
    + Math.max(insets.bottom, spacing[3])
    + spacing[2];

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
          <View style={[styles.cameraBottom, { paddingBottom: bottomNavOverlayPadding }]}>
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
          <View style={styles.reviewTop}>
            <AppButton variant="icon" size="sm" onPress={requestClose} accessibilityLabel="Cerrar escáner">
              <HomePlusIcon name="close" size={22} color={colors.text.primary} />
            </AppButton>
            <View style={styles.reviewTitle}>
              <AppText variant="title3" weight="800">Escaneo</AppText>
              <AppText variant="bodySmall" tone="secondary">{pages.length === 1 ? '1 página' : `${pages.length} páginas`}</AppText>
            </View>
            <View style={styles.reviewTopSpacer} />
          </View>
          {selectedPage ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: selectedPage.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel={`Página ${pages.findIndex((p) => p.id === selectedPage.id) + 1}`} />
            </View>
          ) : null}
          <FlatList
            horizontal
            data={pages}
            keyExtractor={(page) => page.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbList}
            renderItem={({ item, index }) => (
              <AppButton
                variant="icon"
                onPress={() => setSelectedId(item.id)}
                accessibilityLabel={`Página ${index + 1}${item.id === selectedPage?.id ? ', seleccionada' : ''}`}
                style={[styles.thumbButton, item.id === selectedPage?.id && styles.thumbButtonSelected]}
              >
                <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
                <AppText variant="caption" tone={item.id === selectedPage?.id ? 'brand' : 'secondary'} weight="700">{index + 1}</AppText>
              </AppButton>
            )}
          />
          <View style={styles.reviewActions}>
            <AppButton title="Agregar página" variant="secondary" size="sm" onPress={() => { setRetakeId(null); setPhase('camera'); }} accessibilityLabel="Agregar página" style={styles.reviewAction} />
            <AppButton title="Repetir página" variant="secondary" size="sm" disabled={!selectedPage} onPress={() => { if (selectedPage) { setRetakeId(selectedPage.id); setPhase('camera'); } }} accessibilityLabel="Repetir página" style={styles.reviewAction} />
            <AppButton title="Eliminar página" variant="danger" size="sm" disabled={!selectedPage} onPress={handleDeleteSelected} accessibilityLabel="Eliminar página" style={styles.reviewAction} />
          </View>
          <View style={[styles.reviewFooter, { paddingBottom: bottomNavOverlayPadding }]}>
            <AppButton title="Crear PDF" onPress={handleOpenSave} disabled={!canCreatePdf(pages)} accessibilityLabel="Crear PDF" />
          </View>
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
          <AppInput label="Nombre del archivo" value={fileName} onChangeText={setFileName} editable={!generating && !intakeActive} autoCapitalize="none" autoCorrect={false} />
          <AppText variant="caption" tone="secondary">Guardar en: {folderName ?? 'Archivos'}</AppText>
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
  previewWrap: { flex: 1, margin: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: '#000000', overflow: 'hidden' },
  preview: { flex: 1 },
  thumbList: { gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  thumbButton: { borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', padding: spacing[1], backgroundColor: colors.surface.card, alignItems: 'center', gap: spacing[1] },
  thumbButtonSelected: { borderColor: colors.brand },
  thumb: { width: 56, height: 72, borderRadius: radius.sm, backgroundColor: '#000000' },
  reviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  reviewAction: { flexGrow: 1 },
  reviewFooter: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  saveBody: { gap: spacing[3], paddingBottom: spacing[2] },
  saveError: { gap: spacing[2], alignItems: 'flex-start', padding: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.danger.base, backgroundColor: colors.danger.soft },
});
