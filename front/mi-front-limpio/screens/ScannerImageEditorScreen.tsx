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
 * `scannerEditOutcome` navigation param (navigate + merge), so there are no
 * callbacks in navigation state and no `.remove()`-on-unsubscribe bug: this
 * screen registers NO beforeRemove listener at all — cancel/close is pure
 * unmount cleanup, which the session reducer owns.
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
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppButton, AppText } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing, touchTargets } from '../constants/theme';
import { errorHaptic, lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import {
  CROP_HANDLE_KEYS,
  applyRotationStep,
  buildImageProcessingPlan,
  clampScale,
  coerceScannerPageEdit,
  computeBoxRect,
  defaultScannerPageEdit,
  isUsableSize,
  orientedSize,
  rotatedImageSize,
  CANVAS_PADDING,
  type DisplayGeometry,
  type Point,
  type Rect,
  type Size,
} from '../services/homecloud/homecloudScannerGeometry';
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

/** Route params: serializable only. No functions ever (React Navigation 7 checks). */
type EditorRouteParams = {
  page: ScannerPage;
};

const HANDLE_VISUAL_SIZE = 28;
const HANDLE_HIT_RADIUS = touchTargets.normal; // 44px grab radius per corner

type ProcessAttemptResult =
  | { readonly ok: true; readonly uri: string; readonly size: Size }
  | { readonly ok: false; readonly message: string };

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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

  const displaySource = useMemo(
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
          navigation.navigate({
            name: 'HomeCloudScanner',
            params: { scannerEditOutcome: outcome },
            merge: true,
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

  // ---------------------------------------------------------------------
  // processing (F): explicit result, never a state read-back
  // ---------------------------------------------------------------------

  const runProcessing = useCallback(async (): Promise<ProcessAttemptResult> => {
    const source = sourceSize;
    if (!source) {
      return { ok: false, message: 'No pudimos leer las dimensiones de la imagen.' };
    }
    // Validate against the REAL operation dimensions before touching native code.
    const plan = buildImageProcessingPlan(source, editRef.current.cropRect, editRef.current.rotationSteps);
    if (plan.status !== 'ok') {
      return { ok: false, message: plan.message };
    }
    try {
      // Order is exactly the plan's order: rotate first, then crop against the
      // POST-rotation dimensions. The manipulator's crop action speaks
      // originX/originY — the plan's rect is converted here, at the boundary.
      const actions: ({ rotate: number } | { crop: { originX: number; originY: number; width: number; height: number } })[] = [];
      for (const step of plan.steps) {
        if (step.kind === 'rotate') {
          actions.push({ rotate: step.degrees });
        } else {
          actions.push({
            crop: {
              originX: step.rect.x,
              originY: step.rect.y,
              width: step.rect.width,
              height: step.rect.height,
            },
          });
        }
      }
      const result = await manipulateAsync(
        page.originalUri,
        actions,
        { compress: 0.9, format: SaveFormat.JPEG },
      );
      return { ok: true, uri: result.uri, size: { width: result.width, height: result.height } };
    } catch {
      return { ok: false, message: 'No pudimos procesar la imagen. Probá de nuevo.' };
    }
  }, [sourceSize, page]);

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

  const handleTogglePreview = useCallback(() => {
    if (session.phase === 'processing') return;
    if (session.previewUri) {
      dispatchSession({ type: 'user-edits' });
      lightHaptic();
    } else {
      void startProcessing('preview');
    }
  }, [session.phase, session.previewUri, dispatchSession, startProcessing]);

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

  return (
    <View style={styles.screen}>
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
        <AppButton
          variant="icon"
          size="sm"
          onPress={handleConfirm}
          disabled={processing || sourceSizeError}
          accessibilityLabel="Confirmar edición"
          style={styles.headerButton}
        >
          <HomePlusIcon name="checkmark" size={22} color={colors.text.primary} />
        </AppButton>
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
            {/* Dimmed surroundings: four strips around the selected region. */}
            <View style={styles.overlayLayer}>
              <View
                style={[
                  styles.dim,
                  {
                    left: 0,
                    top: 0,
                    width: box.width,
                    height: displaySource.cropRect.y * box.height,
                  },
                ]}
              />
              <View
                style={[
                  styles.dim,
                  {
                    left: 0,
                    top: (displaySource.cropRect.y + displaySource.cropRect.height) * box.height,
                    width: box.width,
                    height: (1 - displaySource.cropRect.y - displaySource.cropRect.height) * box.height,
                  },
                ]}
              />
              <View
                style={[
                  styles.dim,
                  {
                    left: 0,
                    top: displaySource.cropRect.y * box.height,
                    width: displaySource.cropRect.x * box.width,
                    height: displaySource.cropRect.height * box.height,
                  },
                ]}
              />
              <View
                style={[
                  styles.dim,
                  {
                    left: (displaySource.cropRect.x + displaySource.cropRect.width) * box.width,
                    top: displaySource.cropRect.y * box.height,
                    width: (1 - displaySource.cropRect.x - displaySource.cropRect.width) * box.width,
                    height: displaySource.cropRect.height * box.height,
                  },
                ]}
              />
              <View
                style={[
                  styles.cropBorder,
                  {
                    left: displaySource.cropRect.x * box.width,
                    top: displaySource.cropRect.y * box.height,
                    width: displaySource.cropRect.width * box.width,
                    height: displaySource.cropRect.height * box.height,
                  },
                ]}
              />
              {CROP_HANDLE_KEYS.map((key) => {
                // The overlay layer lives INSIDE the transformed box, so
                // handle positions are plain box-local: normalized * boxSize.
                const x =
                  (displaySource.cropRect.x
                    + (key === 'topRight' || key === 'bottomRight'
                      ? displaySource.cropRect.width
                      : 0))
                  * box.width;
                const y =
                  (displaySource.cropRect.y
                    + (key === 'bottomRight' || key === 'bottomLeft'
                      ? displaySource.cropRect.height
                      : 0))
                  * box.height;
                return (
                  <View
                    key={key}
                    style={[
                      styles.handle,
                      {
                        left: x - HANDLE_VISUAL_SIZE / 2,
                        top: y - HANDLE_VISUAL_SIZE / 2,
                        width: HANDLE_VISUAL_SIZE,
                        height: HANDLE_VISUAL_SIZE,
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

      <View style={styles.toolbar}>
        <AppButton
          title="Restablecer"
          variant="secondary"
          size="sm"
          onPress={handleReset}
          disabled={processing}
          accessibilityLabel="Restablecer recorte y rotación"
          style={styles.toolbarButton}
        />
        <AppButton
          title={session.previewUri ? 'Ver original' : 'Aplicar y ver'}
          variant={session.previewUri ? 'secondary' : 'primary'}
          size="sm"
          onPress={handleTogglePreview}
          disabled={processing || sourceSizeError}
          accessibilityLabel={
            session.previewUri ? 'Volver a la imagen original' : 'Aplicar recorte y rotación'
          }
          style={styles.toolbarButton}
        />
        <AppButton
          title="Rotar 90°"
          variant="secondary"
          size="sm"
          onPress={handleRotate}
          disabled={processing}
          accessibilityLabel="Rotar 90 grados"
          style={styles.toolbarButton}
        />
      </View>

      {session.errorMessage ? (
        <View style={styles.errorBanner}>
          <AppText variant="bodySmall" tone="danger">{session.errorMessage}</AppText>
        </View>
      ) : null}

      <View style={[styles.hint, { paddingBottom: insets.bottom + spacing[3] }]}>
        <AppText variant="caption" tone="secondary" align="center">
          Arrastrá las esquinas para recortar. Pellizcá para ampliar y arrastrá la imagen para moverla.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
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
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    borderRadius: HANDLE_VISUAL_SIZE / 2,
    backgroundColor: colors.brand,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  toolbarButton: { flexGrow: 1 },
  errorBanner: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  hint: { paddingHorizontal: spacing[4], paddingTop: spacing[2], backgroundColor: colors.background.base },
});
