import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { memoryPrimaryText, memorySemanticLabel } from '../../services/homecloud/homecloudMemoriesTimeline';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';
import { getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import { isMemoryMediaKind, mediaPlaybackAuthorized } from '../../services/homecloud/homecloudMemoryMediaPlayback';
import { MemoryVideoPage } from './MemoryVideoPage';
import type { MemoryViewerSource } from '../../services/homecloud/homecloudMemoryViewerSource';

/**
 * HC2-B — the EXISTING Memory Viewer, now owning media lifecycle.
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
 * 2. A settled page change makes the outgoing page inactive, so its player
 *    component unmounts and the hook releases it. Programmatic page changes
 *    revoke through this same path.
 */

export function MemoryViewer({ memories, activeContentId, accessToken, source, onClose, onActiveChange, onNearEnd }: {
  memories: readonly HomeCloudMemoryListItem[]; activeContentId: string; accessToken: string | null; source: MemoryViewerSource;
  onClose: () => void; onActiveChange: (contentId: string) => void; onNearEnd: () => void;
}) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<HomeCloudMemoryListItem>>(null);
  const activeIndex = Math.max(0, memories.findIndex((memory) => memory.id === activeContentId));
  const [chrome, setChrome] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const screenFocused = useIsFocused();
  const authorized = mediaPlaybackAuthorized({
    isActivePage: true, viewerOpen: true, appActive, screenFocused, dragging,
  });
  // The suspension intent is also what a settled page change and a close mean:
  // revoking is the only thing that ever happens, and nothing restores it
  // automatically.
  const revoke = useCallback(() => { setDragging(true); }, []);
  useEffect(() => { list.current?.scrollToIndex({ index: activeIndex, animated: false }); }, [activeContentId, activeIndex]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => { setAppActive(next === 'active'); });
    return () => subscription.remove();
  }, []);
  if (memories.length === 0 || activeIndex < 0) return <Missing onClose={onClose} />;
  return <View style={styles.overlay} accessibilityViewIsModal>
    {chrome ? <View style={styles.top}><AppButton variant="icon" size="sm" onPress={onClose} accessibilityLabel="Cerrar recuerdo"><HomePlusIcon name="close" size={24} color={colors.text.inverse} /></AppButton><AppText tone="inverse" variant="bodySmall" numberOfLines={1}>{memorySemanticLabel(memories[activeIndex])}</AppText><View style={styles.topSpacer} /></View> : null}
    <FlatList ref={list} data={memories} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={activeIndex}
      keyExtractor={(memory) => memory.id} getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      initialNumToRender={VIEWER_WINDOW} maxToRenderPerBatch={VIEWER_WINDOW} windowSize={VIEWER_WINDOW * 2 + 1}
      onScrollBeginDrag={revoke}
      onMomentumScrollEnd={(event) => { setDragging(false); const index = Math.round(event.nativeEvent.contentOffset.x / width); const item = memories[index]; if (item) { onActiveChange(item.id); if (index >= memories.length - 3) onNearEnd(); } }}
      renderItem={({ item }) => <ViewerPage memory={item} accessToken={accessToken} width={width} active={item.id === activeContentId} authorized={authorized} onTap={() => setChrome((value) => !value)} />}
    />
    {chrome ? <View style={styles.bottom}><AppText tone="inverse" variant="caption">{source.label}</AppText></View> : null}
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
  if (memory.kind === 'written') return <ScrollView style={{ width }} contentContainerStyle={styles.written} onTouchEnd={onTap}><AppText tone="inverse" variant="title2" weight="700">{memoryPrimaryText(memory) || 'Sin texto'}</AppText><AppText tone="inverse" variant="bodySmall">{memorySemanticLabel(memory)}</AppText>{memory.caption ? <AppText tone="inverse" variant="body">{memory.caption}</AppText> : null}</ScrollView>;
  // Media pages own their own surface. `active` is the ONLY authorization to
  // instantiate a native player, and `authorized` is the global lifecycle
  // intent that revokes playback on blur, background and swipe.
  if (memory.kind === 'video') return <MemoryVideoPage memory={memory} accessToken={accessToken} active={active} authorized={authorized} />;
  if (isMemoryMediaKind(memory.kind)) return <MediaPlaceholder width={width} />;
  return <ImagePage memory={memory} accessToken={accessToken} width={width} onTap={onTap} />;
}

function MediaPlaceholder({ width }: { width: number }) {
  return <View style={[styles.placeholder, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

function ImagePage({ memory, accessToken, width, onTap }: { memory: HomeCloudMemoryListItem; accessToken: string | null; width: number; onTap: () => void }) {
  const preview = useMemoryPreviewUrl(accessToken, memory.id, memory.hasPreview);
  const [original, setOriginal] = useState<string | null>(null); const [failed, setFailed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current; const translate = useRef(new Animated.ValueXY()).current; const scaleValue = useRef(1); const startDistance = useRef<number | null>(null); const startScale = useRef(1);
  useEffect(() => { setOriginal(null); setFailed(false); scale.setValue(1); translate.setValue({ x: 0, y: 0 }); scaleValue.current = 1; if (accessToken) void getMemoryOriginalUrl(accessToken, memory.id).then(setOriginal).catch(() => setFailed(true)); }, [accessToken, memory.id, scale, translate]);
  const responder = useRef(PanResponder.create({ onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1, onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length > 1 || scaleValue.current > 1.01,
    onPanResponderGrant: (event) => { const t=event.nativeEvent.touches; if(t.length>1){ startDistance.current=Math.hypot(t[0].pageX-t[1].pageX,t[0].pageY-t[1].pageY); startScale.current=scaleValue.current; } },
    onPanResponderMove: (event, gesture) => { const t=event.nativeEvent.touches; if(t.length>1 && startDistance.current){ const next=Math.max(1,Math.min(3,startScale.current*Math.hypot(t[0].pageX-t[1].pageX,t[0].pageY-t[1].pageY)/startDistance.current)); scaleValue.current=next; scale.setValue(next); } else if(scaleValue.current>1.01) translate.setValue({x: Math.max(-width,Math.min(width,gesture.dx)),y:Math.max(-500,Math.min(500,gesture.dy))}); },
    onPanResponderRelease: () => { startDistance.current=null; if(scaleValue.current<=1.01){ scaleValue.current=1; Animated.parallel([Animated.spring(scale,{toValue:1,useNativeDriver:true}),Animated.spring(translate,{toValue:{x:0,y:0},useNativeDriver:true})]).start(); } }, onPanResponderTerminationRequest: () => scaleValue.current <= 1.01 })).current;
  const uri = original ?? (preview.phase === 'ready' ? preview.url : null);
  return <Pressable style={[styles.imagePage,{width}]} onPress={onTap} {...responder.panHandlers}>{uri ? <Animated.Image source={{ uri }} resizeMode="contain" style={[styles.image,{transform:[{translateX:translate.x},{translateY:translate.y},{scale}]}]} onError={() => setFailed(true)} /> : <View style={styles.state}><ActivityIndicator color={colors.text.inverse}/><AppText tone="inverse">{failed ? 'No pudimos mostrar este recuerdo.' : 'Cargando recuerdo…'}</AppText></View>}</Pressable>;
}

function Missing({ onClose }: { onClose: () => void }) { return <View style={styles.overlay}><View style={styles.state}><AppText tone="inverse" align="center">Este recuerdo ya no está disponible.</AppText><AppButton title="Volver" variant="secondary" onPress={onClose} /></View></View>; }
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFill,zIndex:20,backgroundColor:'#000'},top:{position:'absolute',zIndex:2,top:spacing[5],left:spacing[3],right:spacing[3],flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topSpacer:{width:36},bottom:{position:'absolute',zIndex:2,bottom:spacing[5],left:spacing[4]},imagePage:{height:'100%',alignItems:'center',justifyContent:'center'},image:{width:'100%',height:'100%'},state:{flex:1,alignItems:'center',justifyContent:'center',gap:spacing[3],padding:spacing[5]},written:{paddingTop:90,paddingHorizontal:spacing[5],paddingBottom:spacing[6],gap:spacing[4]},placeholder:{height:'100%',backgroundColor:'#000'}});
