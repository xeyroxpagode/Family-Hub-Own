/**
 * HC-3E B1 — Scanner image editor screen.
 *
 * Thin adapter over three pure authorities:
 * - `homecloudScannerGeometry` — the ONE coordinate model (crop, rotation,
 *   letterboxing, zoom/pan transforms, the image-manipulator plan).
 * - `homecloudScannerEditorGestures` — the single-responder gesture machine
 *   (pinch, pan, handle drags; no competing responders by construction).
 * - `homecloudScannerEditorSession` — temp-file ownership, async confirmation
 *   and cancellation.
 *
 * Navigation contract (A): route params are fully serializable (the page
 * snapshot only). The result returns to the Scanner as a serializable
 * `scannerEditOutcome` navigation param (navigate + merge + pop, so the
 * router reuses the mounted Scanner instead of pushing a fresh instance),
 * so there are no callbacks in navigation state and no `.remove()`-on-
 * unsubscribe bug: this screen registers NO beforeRemove listener at all —
 * cancel/close is pure unmount cleanup, which the session reducer owns.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { AppButton, AppText } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing, touchTargets } from '../constants/theme';
import { errorHaptic, lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import {
  CROP_HANDLE_KEYS,
  applyRotationStep,
  clampScale,
  coerceScannerPageEdit,
  computeBoxRect,
  defaultScannerPageEdit,
  handleScreenSpaceScale,
  isUsableSize,
  orientedSize,
  quadBoundingRect,
  quadPoint,
  rectToQuad,
  rotatedImageSize,
  CANVAS_PADDING,
  type DisplayGeometry,
  type Point,
  type Rect,
  type RotationSteps,
  type Size,
} from '../services/homecloud/homecloudScannerGeometry';
import {
  DEFAULT_MAX_OUTPUT_SIDE,
  buildPerspectivePlan,
  buildScannerPerspectiveWebViewHtml,
} from '../services/homecloud/homecloudScannerPerspective';
import {
  IDLE_GESTURE_STATE,
  gestureEnd,
  gestureGrant,
  gestureMove,
  type GestureScene,
  type GestureState,
  type TouchPoint,
} from '../services/homecloud/homecloudScannerEditorGestures';
import {
  INITIAL_EDITOR_SESSION,
  editorDisplaySource,
  editorSessionAbandonEffects,
  reduceEditorSession,
  type EditorSessionEffect,
  type EditorSessionState,
} from '../services/homecloud/homecloudScannerEditorSession';
import type { ScannerPage, ScannerPageEdit, ScannerPageEditOutcome } from '../services/homecloud/homecloudScanner';
import { beginHomeCloudImmersiveChrome } from '../services/homecloud/homecloudImmersiveChrome';

/** Route params: serializable only. No functions ever (React Navigation 7 checks). */
type EditorRouteParams = {
  page: ScannerPage;
};

const HANDLE_VISUAL_SIZE = 28;
const HANDLE_HIT_RADIUS = touchTargets.normal; // 44px grab radius per corner
const PERSPECTIVE_WEBVIEW_HTML = buildScannerPerspectiveWebViewHtml();

type ProcessAttemptResult =
  | { readonly ok: true; readonly uri: string; readonly size: Size }
  | { readonly ok: false; readonly message: string };

type PerspectiveWebViewJob = {
  readonly id: string;
  readonly dataUrl: string;
  readonly sourcePoints: readonly Point[];
  readonly outputSize: Size;
  readonly rotationSteps: RotationSteps;
  readonly quality: number;
};

type PerspectiveWebViewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'result'; readonly id: string; readonly width: number; readonly height: number; readonly base64: string }
  | { readonly type: 'error'; readonly id: string; readonly message: string };

async function deleteQuietly(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Deleting a temp file must never block the flow that owns it.
  }
}

export function ScannerImageEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  useEffect(() => beginHomeCloudImmersiveChrome(), []);

  const params = (route.params ?? {}) as EditorRouteParams;
  const page = params.page;

  const [sourceSize, setSourceSize] = useState<Size | null>(
    page?.width && page?.height ? { width: page.width, height: page.height } : null,
  );
  const [sourceSizeError, setSourceSizeError] = useState(!page || (!page.width && !page.height));
  const [canvasSize, setCanvasSize] = useState<Size | null>(null);
  const [edit, setEdit] = useState<ScannerPageEdit>(() =>
    coerceScannerPageEdit(page?.edit ?? null),
  );
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [session, setSession] = useState<EditorSessionState>(INITIAL_EDITOR_SESSION);

  // --- refs: the gesture machine and async continuations must read fresh values.
  const mountedRef = useRef(true);
  const sessionRef = useRef(session);
  const editRef = useRef(edit);
  const geometryRef = useRef<DisplayGeometry | null>(null);
  const gestureRef = useRef<GestureState>(IDLE_GESTURE_STATE);
  const canvasPageOriginRef = useRef<Point>({ x: 0, y: 0 });
  const webViewRef = useRef<any>(null);
  const webViewReadyRef = useRef(false);
  const queuedPerspectiveJobsRef = useRef<PerspectiveWebViewJob[]>([]);
  const perspectiveJobsRef = useRef(new Map<string, {
    resolve: (result: { uri: string; size: Size }) => void;
    reject: (message: string) => void;
  }>());
  const perspectiveJobCounterRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const [, job] of perspectiveJobsRef.current) job.reject('cancelled');
      perspectiveJobsRef.current.clear();
      // Unmount cleanup: delete every temp file still owned here (B1 leak fix).
      for (const effect of editorSessionAbandonEffects(sessionRef.current)) {
        if (effect.kind === 'delete-file') void deleteQuietly(effect.uri);
      }
    };
  }, []);

  // Recover source dimensions when the page snapshot arrived without them.
  useEffect(() => {
    if (!page?.originalUri || sourceSize || !sourceSizeError) return;
    let alive = true;
    Image.getSize(
      page.originalUri,
      (width, height) => {
        if (!alive) return;
        if (isUsableSize({ width, height })) {
          setSourceSize({ width, height });
          setSourceSizeError(false);
        } else {
          setSourceSizeError(true);
        }
      },
      () => {
        if (alive) setSourceSizeError(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [page?.originalUri, sourceSize, sourceSizeError]);

  // ---------------------------------------------------------------------
  // geometry (derived, never stored)
  // ---------------------------------------------------------------------

  const oriented = useMemo<Size>(
    () => (sourceSize ? orientedSize(sourceSize, edit.rotationSteps) : { width: 0, height: 0 }),
    [sourceSize, edit.rotationSteps],
  );

  const box = useMemo<Rect>(
    () => (canvasSize ? computeBoxRect(canvasSize, oriented, CANVAS_PADDING) : { x: 0, y: 0, width: 0, height: 0 }),
    [canvasSize, oriented],
  );

  // The source snapshot is intentionally memoized with the live edit/session.
  const displaySource = useMemo(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    () =>
      editorDisplaySource({
        originalUri: page?.originalUri ?? '',
        source: sourceSize ?? { width: 0, height: 0 },
        edit,
        session,
      }),
    [page?.originalUri, sourceSize, edit, session],
  );

  const geometry: DisplayGeometry = useMemo(
    () => ({ viewport: canvasSize ?? { width: 0, height: 0 }, box, scale: clampScale(scale), translate }),
    [canvasSize, box, scale, translate],
  );

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    editRef.current = edit;
  }, [edit]);

  // ---------------------------------------------------------------------
  // session events
  // ---------------------------------------------------------------------

  const applySessionEffects = useCallback(
    (effects: readonly EditorSessionEffect[]) => {
      for (const effect of effects) {
        if (effect.kind === 'delete-file') {
          void deleteQuietly(effect.uri);
        } else if (effect.kind === 'hand-off') {
          const outcome: ScannerPageEditOutcome = {
            pageId: page.id,
            edit: effect.edit,
            processedUri: effect.uri,
          };
          // `pop: true` is load-bearing: a plain NAVIGATE to a route that is
          // NOT the current one (we are on ScannerImageEditor) does not reuse
          // the Scanner sitting below in the stack — the StackRouter would
          // PUSH a fresh HomeCloudScanner instance (camera phase, zero pages),
          // which is exactly the physical B1 defect. With `pop` the router
          // finds the existing Scanner by name, pops the editor off and
          // MERGES the outcome param onto the SAME mounted instance, so the
          // review session (phase, pages, selectedId) survives intact.
          navigation.navigate({
            name: 'HomeCloudScanner',
            params: { scannerEditOutcome: outcome },
            merge: true,
            pop: true,
          });
        }
      }
    },
    [navigation, page],
  );

  const dispatchSession = useCallback(
    (event: Parameters<typeof reduceEditorSession>[1]) => {
      const resolution = reduceEditorSession(sessionRef.current, event);
      sessionRef.current = resolution.state;
      setSession(resolution.state);
      applySessionEffects(resolution.effects);
      return resolution;
    },
    [applySessionEffects],
  );

  const flushPerspectiveJobs = useCallback(() => {
    if (!webViewRef.current) return;
    const jobs = queuedPerspectiveJobsRef.current.splice(0);
    for (const job of jobs) {
      webViewRef.current.postMessage(JSON.stringify(job));
    }
  }, []);

  const handlePerspectiveWebViewMessage = useCallback(
    async (event: { nativeEvent: { data?: string } }) => {
      let message: PerspectiveWebViewMessage | null = null;
      try {
        message = JSON.parse(event.nativeEvent.data ?? '{}') as PerspectiveWebViewMessage;
      } catch {
        return;
      }
      if (message.type === 'ready') {
        webViewReadyRef.current = true;
        flushPerspectiveJobs();
        return;
      }
      const pending = perspectiveJobsRef.current.get(message.id);
      if (!pending) return;
      perspectiveJobsRef.current.delete(message.id);
      if (message.type === 'error') {
        pending.reject(message.message);
        return;
      }
      try {
        const uri = `${FileSystem.cacheDirectory ?? ''}homecloud-scanner-perspective-${message.id}.jpg`;
        await FileSystem.writeAsStringAsync(uri, message.base64, { encoding: FileSystem.EncodingType.Base64 });
        pending.resolve({ uri, size: { width: message.width, height: message.height } });
      } catch {
        pending.reject('write');
      }
    },
    [flushPerspectiveJobs],
  );

  const runPerspectiveWebViewJob = useCallback(
    async (job: Omit<PerspectiveWebViewJob, 'id'>): Promise<{ uri: string; size: Size }> => {
      const id = `${Date.now()}_${perspectiveJobCounterRef.current++}`;
      const fullJob: PerspectiveWebViewJob = { ...job, id };
      const result = new Promise<{ uri: string; size: Size }>((resolve, reject) => {
        perspectiveJobsRef.current.set(id, { resolve, reject });
      });
      queuedPerspectiveJobsRef.current.push(fullJob);
      flushPerspectiveJobs();
      return result;
    },
    [flushPerspectiveJobs],
  );

  // ---------------------------------------------------------------------
  // processing (F): explicit result, never a state read-back
  // ---------------------------------------------------------------------

  const runProcessing = useCallback(async (): Promise<ProcessAttemptResult> => {
    const source = sourceSize;
    if (!source) {
      return { ok: false, message: 'No pudimos leer las dimensiones de la imagen.' };
    }
    const plan = buildPerspectivePlan(
      source,
      editRef.current.cropQuad ?? rectToQuad(editRef.current.cropRect),
      editRef.current.rotationSteps,
      DEFAULT_MAX_OUTPUT_SIDE,
    );
    if (plan.status !== 'ok') {
      return { ok: false, message: plan.message };
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(page.originalUri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await runPerspectiveWebViewJob({
        dataUrl: `data:image/jpeg;base64,${base64}`,
        sourcePoints: [plan.sourceQuad.topLeft, plan.sourceQuad.topRight, plan.sourceQuad.bottomRight, plan.sourceQuad.bottomLeft],
        outputSize: plan.outputSize,
        rotationSteps: editRef.current.rotationSteps,
        quality: 0.9,
      });
      return { ok: true, uri: result.uri, size: result.size };
    } catch {
      return { ok: false, message: 'No pudimos procesar la imagen. Probá de nuevo.' };
    }
  }, [sourceSize, page, runPerspectiveWebViewJob]);

  const startProcessing = useCallback(
    async (purpose: 'preview' | 'confirm') => {
      const resolution = dispatchSession({ type: 'process-requested', purpose });
      const pending = resolution.state.pending;
      if (!pending) return;
      const result = await runProcessing();
      if (result.ok) {
        dispatchSession({
          type: 'process-succeeded',
          ticket: pending.ticket,
          uri: result.uri,
          size: result.size,
          sessionAlive: mountedRef.current,
          edit: editRef.current,
        });
        if (mountedRef.current && purpose === 'confirm') successHaptic();
      } else {
        dispatchSession({
          type: 'process-failed',
          ticket: pending.ticket,
          message: result.message,
          sessionAlive: mountedRef.current,
        });
        if (mountedRef.current) errorHaptic();
      }
    },
    [dispatchSession, runProcessing],
  );

  const handleConfirm = useCallback(() => {
    if (session.phase === 'processing') return;
    const current = sessionRef.current;
    if (current.previewUri) {
      // The shown preview IS the current edit: adopt it, no regeneration.
      dispatchSession({ type: 'confirmed', edit: editRef.current });
      successHaptic();
      return;
    }
    void startProcessing('confirm');
  }, [session.phase, dispatchSession, startProcessing]);

  const handleCancel = useCallback(() => {
    dispatchSession({ type: 'cancelled' });
    navigation.goBack();
  }, [dispatchSession, navigation]);

  const handleRetake = useCallback(() => {
    dispatchSession({ type: 'cancelled' });
    navigation.navigate({ name: 'HomeCloudScanner', params: { scannerRetakePageId: page.id }, merge: true, pop: true });
  }, [dispatchSession, navigation, page.id]);

  const handleRotate = useCallback(() => {
    if (session.phase === 'processing') return;
    setEdit((prev) => applyRotationStep(prev));
    dispatchSession({ type: 'user-edits' });
    mediumHaptic();
  }, [session.phase, dispatchSession]);

  const handleReset = useCallback(() => {
    if (session.phase === 'processing') return;
    setEdit(defaultScannerPageEdit());
    dispatchSession({ type: 'user-edits' });
    lightHaptic();
  }, [session.phase, dispatchSession]);

  // ---------------------------------------------------------------------
  // gestures (D): one responder, machine-driven
  // ---------------------------------------------------------------------

  const gestureScene = useCallback((): GestureScene | null => {
    const geometry = geometryRef.current;
    const source = sourceSize;
    if (!geometry || !source) return null;
    const editNow = editRef.current;
    const sessionNow = sessionRef.current;
    return {
      cropRect: editNow.cropRect,
      cropQuad: editNow.cropQuad ?? rectToQuad(editNow.cropRect),
      geometry,
      source,
      rotationSteps: editNow.rotationSteps,
      handleHitRadius: HANDLE_HIT_RADIUS,
      // While a processed preview is shown, its full-frame handles are
      // display-only: editing always starts from the preserved original.
      handlesEnabled: sessionNow.previewUri === null && sessionNow.phase === 'editing',
      zoomed: clampScale(geometry.scale) > 1,
    };
  }, [sourceSize]);

  const touchesInCanvasCoords = useCallback((event: GestureResponderEvent): TouchPoint[] => {
    const origin = canvasPageOriginRef.current;
    return event.nativeEvent.touches.map((touch) => ({
      id: touch.identifier,
      x: touch.pageX - origin.x,
      y: touch.pageY - origin.y,
    }));
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => sessionRef.current.phase !== 'processing',
        onMoveShouldSetPanResponder: () => sessionRef.current.phase !== 'processing',

        onPanResponderGrant: (event: GestureResponderEvent) => {
          const scene = gestureScene();
          if (!scene) return;
          // The grant touch targets the canvas (children are pointerEvents
          // none), so page - location = canvas page origin. Constant per frame.
          canvasPageOriginRef.current = {
            x: event.nativeEvent.pageX - event.nativeEvent.locationX,
            y: event.nativeEvent.pageY - event.nativeEvent.locationY,
          };
          const touches = touchesInCanvasCoords(event);
          const active: TouchPoint = {
            id: event.nativeEvent.identifier,
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          const resolution = gestureGrant(gestureRef.current, scene, active, touches);
          gestureRef.current = resolution.state;
          if (resolution.state.mode === 'handle') lightHaptic();
        },

        onPanResponderMove: (event: GestureResponderEvent) => {
          const scene = gestureScene();
          if (!scene) return;
          const touches = touchesInCanvasCoords(event);
          const resolution = gestureMove(gestureRef.current, scene, touches);
          gestureRef.current = resolution.state;
          const effect = resolution.effect;
          if (effect.kind === 'crop') {
            setEdit((prev) => ({ ...prev, cropRect: effect.cropRect }));
            editRef.current = { ...editRef.current, cropRect: effect.cropRect };
          } else if (effect.kind === 'quad') {
            const cropRect = quadBoundingRect(effect.cropQuad);
            setEdit((prev) => ({ ...prev, cropQuad: effect.cropQuad, cropRect }));
            editRef.current = { ...editRef.current, cropQuad: effect.cropQuad, cropRect };
          } else if (effect.kind === 'zoom') {
            setScale(effect.scale);
            setTranslate(effect.translate);
          }
        },

        onPanResponderRelease: () => {
          gestureRef.current = gestureEnd(gestureRef.current);
        },
        onPanResponderTerminate: () => {
          gestureRef.current = gestureEnd(gestureRef.current);
        },
      }),
    [gestureScene, touchesInCanvasCoords],
  );

  // A rotation changes the box: zoom/pan must not leak stale geometry.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [edit.rotationSteps, canvasSize?.width, canvasSize?.height]);

  // ---------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    setCanvasSize({ width: layout.width, height: layout.height });
  }, []);

  if (!page) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
          <AppButton
            variant="icon"
            size="sm"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Cerrar editor"
            style={styles.headerButton}
          >
            <HomePlusIcon name="close" size={22} color={colors.text.primary} />
          </AppButton>
          <View style={styles.headerTitle}>
            <AppText variant="title3" weight="800">Editar página</AppText>
          </View>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.messageBody}>
          <AppText variant="body" align="center">No pudimos abrir el editor de páginas.</AppText>
        </View>
      </View>
    );
  }

  const processing = session.phase === 'processing';
  const imageElementSize = rotatedImageSize(box, displaySource.rotationSteps);
  /**
   * PATCH 1B — corner-handle SCREEN-SPACE invariant. The overlay (polygon,
   * handles, hit boxes) renders INSIDE the zoomed container, so a zoom of `S`
   * would draw the dots `S` times larger. Counter-scale the DRAWN dot and its
   * container-unit hit box by `1 / S`: both stay constant in screen space
   * (28 pt dot, 44 pt grab target) while the LOGICAL corner stays attached to
   * the same point of the transformed image. Crop geometry, normalized points
   * and perspective math are untouched — this is visual only.
   */
  const handleCompensation = handleScreenSpaceScale(scale);
  const handleDrawRadius = (HANDLE_VISUAL_SIZE / 2) * handleCompensation;
  const handleHitSize = HANDLE_HIT_RADIUS * handleCompensation;
  const quadPoints = CROP_HANDLE_KEYS.map((key) => {
    const point = quadPoint(displaySource.cropQuad, key);
    return { x: point.x * box.width, y: point.y * box.height };
  });
  const quadPolygon = quadPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const dimPath = [
    `M0 0 H${box.width} V${box.height} H0 Z`,
    `M${quadPoints[0].x} ${quadPoints[0].y}`,
    `L${quadPoints[1].x} ${quadPoints[1].y}`,
    `L${quadPoints[2].x} ${quadPoints[2].y}`,
    `L${quadPoints[3].x} ${quadPoints[3].y} Z`,
  ].join(' ');

  return (
    <View style={styles.screen}>
      <WebView
        ref={webViewRef as any}
        pointerEvents="none"
        source={{ html: PERSPECTIVE_WEBVIEW_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onMessage={handlePerspectiveWebViewMessage}
        style={styles.hiddenWebView}
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <AppButton
          variant="icon"
          size="sm"
          onPress={handleCancel}
          accessibilityLabel="Cancelar edición"
          style={styles.headerButton}
        >
          <HomePlusIcon name="close" size={22} color={colors.text.primary} />
        </AppButton>
        <View style={styles.headerTitle}>
          <AppText variant="title3" weight="800">Editar página</AppText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <View
        style={styles.canvas}
        onLayout={handleCanvasLayout}
        {...panResponder.panHandlers}
        accessibilityLabel="Área de edición de la página"
      >
        {sourceSizeError ? (
          <View style={styles.canvasMessage}>
            <AppText variant="body" tone="inverse" align="center">No pudimos leer la imagen.</AppText>
          </View>
        ) : isUsableSize(box) ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              transform: [
                { translateX: translate.x },
                { translateY: translate.y },
                { scale: clampScale(scale) },
              ],
            }}
          >
            <Image
              source={{ uri: displaySource.uri }}
              style={{
                position: 'absolute',
                left: (box.width - imageElementSize.width) / 2,
                top: (box.height - imageElementSize.height) / 2,
                width: imageElementSize.width,
                height: imageElementSize.height,
                transform: [{ rotate: `${displaySource.rotationSteps * 90}deg` }],
              }}
              resizeMode="cover"
              accessibilityLabel="Vista previa de la página"
            />
            <View style={styles.overlayLayer}>
              <Svg width={box.width} height={box.height} style={styles.svgOverlay}>
                <Path d={dimPath} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
                {/* PATCH 1C (K) — the polygon stroke is compensated by the
                    SAME 1/zoom factor as the handles, so it stays ~2 pt in
                    screen space at every zoom. Presentation only: crop math,
                    normalized points and perspective output are untouched. */}
                <Polygon points={quadPolygon} fill="transparent" stroke={colors.brand} strokeWidth={2 * handleCompensation} />
                {CROP_HANDLE_KEYS.map((key, index) => {
                  const point = quadPoints[index];
                  return <Circle key={key} cx={point.x} cy={point.y} r={handleDrawRadius} fill={colors.brand} stroke="#FFFFFF" strokeWidth={3 * handleCompensation} />;
                })}
              </Svg>
              {CROP_HANDLE_KEYS.map((key, index) => {
                const point = quadPoints[index];
                return (
                  <View
                    key={key}
                    style={[
                      styles.handle,
                      {
                        left: point.x - handleHitSize / 2,
                        top: point.y - handleHitSize / 2,
                        width: handleHitSize,
                        height: handleHitSize,
                        borderRadius: handleHitSize / 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {processing ? (
          <View style={styles.processingOverlay}>
            <View style={styles.processingContent}>
              <ActivityIndicator color={colors.brand} />
              <AppText variant="body">Procesando imagen…</AppText>
            </View>
          </View>
        ) : null}
      </View>

      {session.errorMessage ? (
        <View style={styles.errorBanner}>
          <AppText variant="bodySmall" tone="danger">{session.errorMessage}</AppText>
        </View>
      ) : null}

      {/* PATCH 1C — final structure: SAFE TOP / header / flex canvas / ONE
          bottom toolbar with safe-area bottom padding. The permanent hint row is
          gone (helper copy must be compact/contextual/transient — FF image is
          the protagonist), and the toolbar is a single row so the canvas keeps
          the majority of the usable area. */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
        <AppButton
          title="Repetir"
          variant="secondary"
          size="sm"
          onPress={handleRetake}
          disabled={processing}
          accessibilityLabel="Repetir captura de esta página"
          style={styles.toolbarButton}
        />
        <AppButton
          title="Rotar"
          variant="secondary"
          size="sm"
          onPress={handleRotate}
          disabled={processing}
          accessibilityLabel="Rotar 90 grados"
          style={styles.toolbarButton}
        />
        <AppButton
          title="Restablecer"
          variant="secondary"
          size="sm"
          onPress={handleReset}
          disabled={processing}
          accessibilityLabel="Restablecer recorte y rotación"
          style={styles.toolbarButton}
        />
        <AppButton title="Confirmar" variant="primary" size="sm" onPress={handleConfirm} disabled={processing || sourceSizeError} accessibilityLabel="Confirmar edición" style={styles.toolbarButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * PATCH 1B — layout ownership. The editor is FULLSCREEN and owns a plain
   * top-to-bottom column: safe-area top chrome, flex canvas, safe-area bottom
   * controls. Never centered, never sheet-spaced, never absolutely offset by
   * guessed device height. `justifyContent: 'flex-start'` states the column
   * contract explicitly so no ancestor presentation can midpoint the header.
   */
  screen: { flex: 1, backgroundColor: colors.background.base, justifyContent: 'flex-start' },
  hiddenWebView: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.base,
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerButton: { backgroundColor: colors.surface.soft, borderColor: colors.border.subtle },
  canvas: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  canvasMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  messageBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6] },
  overlayLayer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  svgOverlay: { position: 'absolute', left: 0, top: 0 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    // PATCH 1C — the HIT layer is visually TRANSPARENT: no brand fill, no
    // visible ring, no shadow. Only the SVG circle is the visible handle
    // (~28 pt at zoom 1x); this layer is pure touch target (≥44 pt).
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  processingContent: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  toolbarButton: { flexGrow: 1, flexBasis: 0 },
  errorBanner: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
});
