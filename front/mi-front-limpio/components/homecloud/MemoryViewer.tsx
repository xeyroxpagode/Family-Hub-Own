import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppButton, AppText } from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { memoryPrimaryText, memorySemanticLabel } from '../../services/homecloud/homecloudMemoriesTimeline';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';
import { getMemoryOriginalUrl } from '../../services/homecloud/homecloudMemoryOriginal';
import type { MemoryViewerSource } from '../../services/homecloud/homecloudMemoryViewerSource';

export function MemoryViewer({ memories, activeContentId, accessToken, source, onClose, onActiveChange, onNearEnd }: {
  memories: readonly HomeCloudMemoryListItem[]; activeContentId: string; accessToken: string | null; source: MemoryViewerSource;
  onClose: () => void; onActiveChange: (contentId: string) => void; onNearEnd: () => void;
}) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<HomeCloudMemoryListItem>>(null);
  const activeIndex = Math.max(0, memories.findIndex((memory) => memory.id === activeContentId));
  const [chrome, setChrome] = useState(true);
  useEffect(() => { list.current?.scrollToIndex({ index: activeIndex, animated: false }); }, [activeContentId, activeIndex]);
  if (memories.length === 0 || activeIndex < 0) return <Missing onClose={onClose} />;
  return <View style={styles.overlay} accessibilityViewIsModal>
    {chrome ? <View style={styles.top}><AppButton variant="icon" size="sm" onPress={onClose} accessibilityLabel="Cerrar recuerdo"><HomePlusIcon name="close" size={24} color={colors.text.inverse} /></AppButton><AppText tone="inverse" variant="bodySmall" numberOfLines={1}>{memorySemanticLabel(memories[activeIndex])}</AppText><View style={styles.topSpacer} /></View> : null}
    <FlatList ref={list} data={memories} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={activeIndex}
      keyExtractor={(memory) => memory.id} getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      onMomentumScrollEnd={(event) => { const index = Math.round(event.nativeEvent.contentOffset.x / width); const item = memories[index]; if (item) { onActiveChange(item.id); if (index >= memories.length - 3) onNearEnd(); } }}
      renderItem={({ item }) => <ViewerPage memory={item} accessToken={accessToken} width={width} onTap={() => setChrome((value) => !value)} />}
    />
    {chrome ? <View style={styles.bottom}><AppText tone="inverse" variant="caption">{source.label}</AppText></View> : null}
  </View>;
}

function ViewerPage({ memory, accessToken, width, onTap }: { memory: HomeCloudMemoryListItem; accessToken: string | null; width: number; onTap: () => void }) {
  if (memory.kind === 'written') return <ScrollView style={{ width }} contentContainerStyle={styles.written} onTouchEnd={onTap}><AppText tone="inverse" variant="title2" weight="700">{memoryPrimaryText(memory) || 'Sin texto'}</AppText><AppText tone="inverse" variant="bodySmall">{memorySemanticLabel(memory)}</AppText>{memory.caption ? <AppText tone="inverse" variant="body">{memory.caption}</AppText> : null}</ScrollView>;
  if (memory.kind !== 'image') return <View style={[styles.unsupported, { width }]}><HomePlusIcon name="information-circle-outline" size={34} color={colors.text.inverse} /><AppText tone="inverse" align="center">Este tipo de recuerdo estará disponible próximamente.</AppText></View>;
  return <ImagePage memory={memory} accessToken={accessToken} width={width} onTap={onTap} />;
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
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFill,zIndex:20,backgroundColor:'#000'},top:{position:'absolute',zIndex:2,top:spacing[5],left:spacing[3],right:spacing[3],flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topSpacer:{width:36},bottom:{position:'absolute',zIndex:2,bottom:spacing[5],left:spacing[4]},imagePage:{height:'100%',alignItems:'center',justifyContent:'center'},image:{width:'100%',height:'100%'},state:{flex:1,alignItems:'center',justifyContent:'center',gap:spacing[3],padding:spacing[5]},written:{paddingTop:90,paddingHorizontal:spacing[5],paddingBottom:spacing[6],gap:spacing[4]},unsupported:{height:'100%',alignItems:'center',justifyContent:'center',gap:spacing[3],padding:spacing[5]}});
