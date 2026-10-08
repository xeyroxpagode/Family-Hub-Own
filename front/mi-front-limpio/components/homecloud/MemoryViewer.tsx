import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing, touchTargets } from '../../constants/theme';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { memoryPrimaryText, memorySemanticLabel } from '../../services/homecloud/homecloudMemoriesTimeline';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';
import { evictMemoryOriginalUrl, getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import { evictMemoryPreviewUrl } from '../../services/homecloud/homecloudMemoryPreview';
import { isMemoryMediaKind, mediaPlaybackAuthorized } from '../../services/homecloud/homecloudMemoryMediaPlayback';
import {
  beginMemoryViewerOpening,
  reportMemoryViewerDragBegin,
  reportMemoryViewerSettle,
  resolveMemoryViewerIndex,
  solveMemoryViewerAlignment,
  type MemoryViewerOpeningState,
} from '../../services/homecloud/homecloudMemoryViewerOpening';
import { MemoryVideoPage } from './MemoryVideoPage';
import { MemoryAudioPage } from './MemoryAudioPage';
import type { MemoryViewerSource } from '../../services/homecloud/homecloudMemoryViewerSource';

/**
 * HC2-B — the EXISTING Memory Viewer, now owning media lifecycle.
 * HC2-C — the Viewer that opens the EXACT tapped Memory.
 *
 * ONE LIFECYCLE INTENT
 * There is exactly ONE AppState listener and ONE focus source in this file, and
 * both collapse into a single `authorized` boolean that Video and Audio read.
 * There is deliberately no media event bus, no context and no per-media
 * listener: two independent AppState listeners would be two answers that can
 * disagree.
 *
 * `authorized === false` means "pause". It NEVER means "resume": neither media
 * component calls `play()` outside an explicit user press, so returning to the
 * foreground restores nothing on its own.
 *
 * TWO INDEPENDENT SWIPE SAFEGUARDS
 * 1. `onScrollBeginDrag` revokes authorization the moment a finger touches the
 *    pager, so audible playback stops immediately — before the page changes.
 *    Authorization returns when the pager settles, INCLUDING when the drag was
 *    released without momentum and would otherwise never settle at all.
 * 2. A settled page change makes the outgoing page inactive, so its player
 *    component unmounts and the hook releases it. Programmatic page changes
 *    revoke through this same path.
 *
 * HC2-C — THE OPENING INVARIANT
 * -----------------------------
 * The Memory the user tapped IS the initial authority. This file therefore:
 *
 *  - resolves the index with a RAW `findIndex`, so `-1` is `Missing` and never
 *    page 0;
 *  - holds an OPENING LOCK until the pager reports the requested page, so the
 *    initial physical-offset noise of a programmatic alignment can never be
 *    read as user navigation;
 *  - issues a programmatic `scrollToIndex` from ONE authority, keyed by content
 *    id, which is what removes the `momentum -> set active -> effect -> scroll`
 *    feedback loop;
 *  - gives EVERY page the same `width`, so `getItemLayout` stops lying about
 *    video and audio.
 *
 * SCOPE
 * A household switch / re-auth revokes too: the bytes already loaded belong to
 * the previous scope.
 */

export function MemoryViewer({ memories, activeContentId, accessToken, source, canOrganize, activeFavorite, onToggleFavorite, onOpenActions, onClose, onActiveChange, onNearEnd, onOpenInfo }: {
  memories: readonly HomeCloudMemoryListItem[]; activeContentId: string; accessToken: string | null; source: MemoryViewerSource;
  canOrganize?: boolean; activeFavorite?: boolean; onToggleFavorite?: () => void; onOpenActions?: (contentId: string) => void;
  onClose: () => void; onActiveChange: (contentId: string) => void; onNearEnd: () => void; onOpenInfo?: (contentId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<HomeCloudMemoryListItem>>(null);
  // RAW index. `-1` is the honest "not found"; there is deliberately no
  // `Math.max(0, ...)` fallback, which used to open the first Memory as if it
  // were the requested one.
  const activeIndex = resolveMemoryViewerIndex(memories, activeContentId);
  /**
   * The opening lock is armed ONCE, with the id the user tapped at mount. It is
   * not re-armed when `activeContentId` changes later: those changes ARE the
   * navigation the lock exists to allow. The Viewer remounts on every open, so
   * one mount is exactly one session.
   */
  const [opening, setOpening] = useState<MemoryViewerOpeningState>(() =>
    beginMemoryViewerOpening(activeContentId, activeIndex));
  /** The content id the pager was last commanded to. THE alignment authority. */
  const alignedContentIdRef = useRef<string | null>(null);
  const [chrome, setChrome] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const screenFocused = useIsFocused();
  // A SCOPE change (household switch, re-auth) must revoke playback: the bytes
  // already loaded belong to the previous scope. Derived during render from the
  // same latest-value ref pattern the rest of HomeCloud uses, so no effect and
  // no second lifecycle signal is needed.
  const tokenRef = useRef(accessToken);
  const scopeChanged = tokenRef.current !== accessToken;
  tokenRef.current = accessToken;
  const authorized = mediaPlaybackAuthorized({
    isActivePage: true, viewerOpen: true, appActive, screenFocused, dragging: dragging || scopeChanged,
  });
  // Whether the current drag has already handed off to momentum. A drag that is
  // released without momentum never produces `onMomentumScrollEnd`, so restoring
  // authorization on that path too is what keeps a cancelled drag from leaving
  // the media permanently suspended.
  const momentumRef = useRef(false);
  /**
   * Latest-value mirrors, so the settle readers stay STABLE callbacks (their
   * identity never churns the FlatList props) while never deciding against a
   * stale lock or re-announcing an authority that did not change.
   */
  const openingRef = useRef(opening);
  openingRef.current = opening;
  const activeContentIdRef = useRef(activeContentId);
  activeContentIdRef.current = activeContentId;
  const beginPagerDrag = useCallback(() => {
    momentumRef.current = false;
    setDragging(true);
    // A real finger is genuine user intent and releases the opening lock at once,
    // so the lock can never leave the pager frozen against the user (HC2-C R1).
    const current = openingRef.current;
    const result = reportMemoryViewerDragBegin(current);
    if (result.state !== current) setOpening(result.state);
  }, []);

  /**
   * THE ONE PROGRAMMATIC ALIGNMENT AUTHORITY (HC2-C).
   *
   * While the lock is held the only target is the requested page. Once released,
   * a command is issued only when the active CONTENT ID differs from the one the
   * pager was last aligned to — so reconstructing an equal dataset or appending
   * a page issues nothing and cannot move the active Memory.
   */
  useEffect(() => {
    const command = solveMemoryViewerAlignment({
      requestedIndex: opening.requestedIndex,
      activeIndex,
      locked: opening.locked,
      requestedContentId: opening.requestedContentId,
      activeContentId,
      alignedContentId: alignedContentIdRef.current,
    });
    if (command.kind !== 'align') return;
    alignedContentIdRef.current = opening.locked ? opening.requestedContentId : activeContentId;
    list.current?.scrollToIndex({ index: command.index, animated: false });
  }, [activeContentId, activeIndex, opening]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { setAppActive(next === 'active'); });
    return () => subscription.remove();
  }, []);

  /**
   * ONE SETTLED-PAGE READER — the only writer of the active content.
   *
   * `onMomentumScrollEnd` is a settled page. The offset it carries is PHYSICAL
   * and therefore untrustworthy as an intent, which is exactly why it is offered
   * to the pure opening decision instead of writing `activeContentId` directly.
   */
  const settlePager = useCallback((contentOffsetX: number) => {
    momentumRef.current = false;
    setDragging(false);
    const computedIndex = width > 0 ? Math.round(contentOffsetX / width) : 0;
    const current = openingRef.current;
    const result = reportMemoryViewerSettle(current, computedIndex, resolveMemoryViewerIndex(memories, activeContentIdRef.current));
    if (result.state !== current) setOpening(result.state);
    // Pagination is a READ, never an authority write, so the opening lock never
    // gates it: the remaining pages must stay reachable from the first frame.
    if (memories.length > 0 && computedIndex >= memories.length - 3) onNearEnd();
    if (!result.accept) return;
    const item = memories[computedIndex];
    // Re-announcing the SAME authority would rebuild the parent session for
    // nothing; a duplicate settle is a no-op, not a new navigation.
    if (item !== undefined && item.id !== activeContentIdRef.current) {
      activeContentIdRef.current = item.id;
      onActiveChange(item.id);
    }
  }, [memories, onActiveChange, onNearEnd, width]);

  /**
   * DRAG END WITHOUT MOMENTUM — the HC2-B authorization restore plus the second
   * lock-release path the freeze names.
   *
   * It deliberately does NOT write the active content once the alignment is
   * established: an offset read on finger lift is not a settled page, and
   * treating it as one is precisely the transient wrong write HC2-B avoided.
   */
  const endPagerDrag = useCallback((contentOffsetX: number) => {
    if (!momentumRef.current) setDragging(false);
    const current = openingRef.current;
    if (!current.locked) return;
    const computedIndex = width > 0 ? Math.round(contentOffsetX / width) : 0;
    const result = reportMemoryViewerSettle(current, computedIndex, resolveMemoryViewerIndex(memories, activeContentIdRef.current));
    if (result.state !== current) setOpening(result.state);
  }, [memories, width]);

  const settleAt = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    settlePager(event.nativeEvent.contentOffset.x);
  }, [settlePager]);

  const dragEndAt = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    endPagerDrag(event.nativeEvent.contentOffset.x);
  }, [endPagerDrag]);

  if (memories.length === 0 || activeIndex < 0) return <Missing onClose={onClose} />;
  return <View style={styles.overlay} accessibilityViewIsModal>
    {chrome ? <View style={[styles.top, { paddingTop: Math.max(insets.top, spacing[3]) }]}><AppButton variant="icon" size="sm" onPress={onClose} accessibilityLabel="Cerrar recuerdo" style={styles.closeTarget}><HomePlusIcon name="close" size={24} color={colors.text.inverse} /></AppButton><AppText tone="inverse" variant="bodySmall" numberOfLines={1}>{memorySemanticLabel(memories[activeIndex])}</AppText><View style={styles.topSpacer} />
      {canOrganize && onToggleFavorite ? (
        <AppButton variant="icon" size="sm" onPress={onToggleFavorite}
          accessibilityLabel={activeFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          accessibilityState={{ selected: activeFavorite === true }}
          style={styles.closeTarget}>
          <HomePlusIcon name={activeFavorite ? 'star' : 'star-outline'} size={24} color={colors.text.inverse} />
        </AppButton>
      ) : null}
      {onOpenInfo ? <AppButton variant="icon" size="sm" onPress={() => onOpenInfo(activeContentId)} accessibilityLabel="Información del recuerdo" style={styles.closeTarget}><HomePlusIcon name="information-circle-outline" size={24} color={colors.text.inverse} /></AppButton> : null}
      {onOpenActions ? <AppButton variant="icon" size="sm" onPress={() => onOpenActions(activeContentId)} accessibilityLabel="Acciones del recuerdo" style={styles.closeTarget}><HomePlusIcon name="ellipsis-horizontal" size={24} color={colors.text.inverse} /></AppButton> : null}
    </View> : null}
    <FlatList ref={list} data={memories} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={activeIndex}
      keyExtractor={(memory) => memory.id} getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      initialNumToRender={VIEWER_WINDOW} maxToRenderPerBatch={VIEWER_WINDOW} windowSize={VIEWER_WINDOW * 2 + 1}
      onScrollBeginDrag={beginPagerDrag}
      onMomentumScrollBegin={() => { momentumRef.current = true; }}
      onScrollEndDrag={dragEndAt}
      onMomentumScrollEnd={settleAt}
      renderItem={({ item }) => <ViewerPage memory={item} accessToken={accessToken} width={width} active={item.id === activeContentId} authorized={authorized} onTap={() => setChrome((value) => !value)} />}
    />
    {chrome ? <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}><AppText tone="inverse" variant="caption">{source.label}</AppText></View> : null}
  </View>;
}

/**
 * Bounded layout/component work per swipe. This is NOT a performance project:
 * the media invariant is structural (only the active page mounts a player), and
 * this window merely keeps a full-screen pager from keeping many neighbours
 * alive at once.
 */
const VIEWER_WINDOW = 3;

function ViewerPage({ memory, accessToken, width, active, authorized, onTap }: {
  memory: HomeCloudMemoryListItem; accessToken: string | null; width: number; active: boolean; authorized: boolean; onTap: () => void;
}) {
  if (memory.kind === 'written') return <WrittenPage memory={memory} width={width} onTap={onTap} />;
  // Media pages own their own surface. `active` is the ONLY authorization to
  // instantiate a native player, and `authorized` is the global lifecycle
  // intent that revokes playback on blur, background and swipe.
  if (memory.kind === 'video') return <MemoryVideoPage memory={memory} accessToken={accessToken} active={active} authorized={authorized} width={width} />;
  if (memory.kind === 'audio') return <MemoryAudioPage memory={memory} accessToken={accessToken} active={active} authorized={authorized} width={width} />;
  if (isMemoryMediaKind(memory.kind)) return <MediaPlaceholder width={width} />;
  return <ImagePage memory={memory} accessToken={accessToken} width={width} active={active} onTap={onTap} />;
}

function WrittenPage({ memory, width, onTap }: { memory: HomeCloudMemoryListItem; width: number; onTap: () => void }) {
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ width }} contentContainerStyle={[styles.written, { paddingTop: Math.max(insets.top, spacing[3]) + spacing[6], paddingBottom: Math.max(insets.bottom, spacing[3]) + spacing[4] }]} onTouchEnd={onTap}><AppText tone="inverse" variant="title2" weight="700">{memoryPrimaryText(memory) || 'Sin texto'}</AppText><AppText tone="inverse" variant="bodySmall">{memorySemanticLabel(memory)}</AppText>{memory.caption ? <AppText tone="inverse" variant="body">{memory.caption}</AppText> : null}</ScrollView>;
}

/**
 * A media kind with no page yet renders inert geometry: the pager must never
 * claim a width it does not render.
 */
function MediaPlaceholder({ width }: { width: number }) {
  return <View style={[styles.placeholder, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

/**
 * HC2-C — the IMAGE page, with an EXPLICIT RETRY for the original.
 *
 * A failed signed-original request used to be a terminal message inside the
 * Viewer: the only way out was to close and reopen. An error the user cannot act
 * on is a correctness hole, not a missing feature, so the retry is part of the
 * frozen Run A surface.
 *
 * The gesture architecture is untouched: same pinch `PanResponder`, same 1..3
 * clamp, same pan clamp, same `onPanResponderTerminationRequest` arbitration and
 * the same `Pressable` chrome toggle. The retry only bumps a token that re-runs
 * the EXISTING original-request effect, which is what "retry" means here: ask the
 * existing seam again. No new dependency, no second request path, no cache.
 *
 * A reset-on-change dependency is why the retry also restores the neutral zoom:
 * a retry is a fresh presentation of the same image, not a continuation of a
 * half-zoomed one.
 */
function ImagePage({ memory, accessToken, width, active, onTap }: { memory: HomeCloudMemoryListItem; accessToken: string | null; width: number; active: boolean; onTap: () => void }) {
  const preview = useMemoryPreviewUrl(accessToken, memory.id, memory.hasPreview);
  const [original, setOriginal] = useState<string | null>(null); const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const scale = useRef(new Animated.Value(1)).current; const translate = useRef(new Animated.ValueXY()).current; const scaleValue = useRef(1); const startDistance = useRef<number | null>(null); const startScale = useRef(1);
  useEffect(() => {
    setOriginal(null); setFailed(false); scale.setValue(1); translate.setValue({ x: 0, y: 0 }); scaleValue.current = 1;
    if (!active) return;
    if (!accessToken) { setFailed(true); return; }
    const controller = new AbortController();
    void getMemoryOriginalUrl(accessToken, memory.id, { signal: controller.signal, forceRefresh: attempt > 0 }).then(setOriginal).catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      setFailed(true);
    });
    return () => controller.abort();
  }, [accessToken, active, attempt, memory.id, scale, translate]);
  const responder = useRef(PanResponder.create({ onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1, onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1 || scaleValue.current > 1.01,
    onPanResponderGrant: (event) => { const t=event.nativeEvent.touches; if(t.length>1){ startDistance.current=Math.hypot(t[0].pageX-t[1].pageX,t[0].pageY-t[1].pageY); startScale.current=scaleValue.current; } },
    onPanResponderMove: (event, gesture) => { const t=event.nativeEvent.touches; if(t.length>1 && startDistance.current){ const next=Math.max(1,Math.min(3,startScale.current*Math.hypot(t[0].pageX-t[1].pageX,t[0].pageY-t[1].pageY)/startDistance.current)); scaleValue.current=next; scale.setValue(next); } else if(scaleValue.current>1.01) translate.setValue({x: Math.max(-width,Math.min(width,gesture.dx)),y:Math.max(-500,Math.min(500,gesture.dy))}); },
    onPanResponderRelease: () => { startDistance.current=null; if(scaleValue.current<=1.01){ scaleValue.current=1; Animated.parallel([Animated.spring(scale,{toValue:1,useNativeDriver:true}),Animated.spring(translate,{toValue:{x:0,y:0},useNativeDriver:true})]).start(); } }, onPanResponderTerminationRequest: () => scaleValue.current <= 1.01 })).current;
  const uri = original ?? (preview.phase === 'ready' ? preview.url : null);
  if (!active && uri === null) return <View style={[styles.placeholder, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
  return <Pressable style={[styles.imagePage,{width}]} onPress={onTap} {...responder.panHandlers}>{uri ? <Animated.Image source={{ uri }} resizeMode="contain" style={[styles.image,{transform:[{translateX:translate.x},{translateY:translate.y},{scale}]}]} onError={() => { evictMemoryOriginalUrl(memory.id); evictMemoryPreviewUrl(memory.id); setOriginal(null); setFailed(true); }} /> : <View style={styles.state}>{failed ? null : <ActivityIndicator color={colors.text.inverse}/>}<AppText tone="inverse" align="center">{failed ? 'No pudimos mostrar este recuerdo.' : active ? 'Cargando recuerdo…' : 'Cargando vista previa…'}</AppText>{failed ? <AppButton title="Reintentar" variant="secondary" size="sm" onPress={() => setAttempt((value) => value + 1)} accessibilityLabel="Reintentar cargar este recuerdo" /> : null}</View>}</Pressable>;
}

/**
 * HC2-C — the honest `Missing` state.
 *
 * Reached ONLY when the requested Memory is genuinely absent from the dataset.
 * It is deliberately never reached as a substitute for opening page 0: showing
 * the FIRST Memory as if it were the requested one is the silent lie HC2-C
 * forbids.
 */
function Missing({ onClose }: { onClose: () => void }) { return <View style={styles.overlay}><View style={styles.state}><AppText tone="inverse" align="center">Este recuerdo ya no está disponible.</AppText><AppButton title="Volver" variant="secondary" onPress={onClose} /></View></View>; }
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFill,backgroundColor:'#000'},top:{position:'absolute',zIndex:2,top:0,left:spacing[3],right:spacing[3],flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topSpacer:{width:36},closeTarget:{minWidth:touchTargets.normal,minHeight:touchTargets.normal,alignItems:'center',justifyContent:'center'},bottom:{position:'absolute',zIndex:2,bottom:0,left:spacing[4],right:spacing[4]},imagePage:{height:'100%',alignItems:'center',justifyContent:'center'},image:{width:'100%',height:'100%'},state:{flex:1,alignItems:'center',justifyContent:'center',gap:spacing[3],padding:spacing[5]},written:{paddingHorizontal:spacing[5],gap:spacing[4]},placeholder:{height:'100%',backgroundColor:'#000'}});
