import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { AppText } from '../ui';

export type PlannerEvidenceViewerItem = { id: string; uri: string; mimeType: string; label?: string };

function EvidenceVideo({ item, width }: { item: PlannerEvidenceViewerItem; width: number }) {
  const player = useVideoPlayer({ uri: item.uri }, (instance) => { instance.pause(); });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const ready = player.addListener('statusChange', ({ status }) => { setLoading(status === 'loading'); setError(status === 'error'); });
    return () => ready.remove();
  }, [player]);
  return <View style={[styles.page, { width }]}>{error ? <AppText tone="danger">No se pudo reproducir. Cerrá y volvé a intentar.</AppText> : <VideoView player={player} nativeControls contentFit="contain" style={styles.video} />}{loading ? <ActivityIndicator style={styles.loading} color={colors.text.inverse} /> : null}</View>;
}

export function PlannerEvidenceViewer({ visible, items, initialIndex = 0, onClose }: { visible: boolean; items: PlannerEvidenceViewerItem[]; initialIndex?: number; onClose: () => void }) {
  const { width } = useWindowDimensions();
  return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
    <View style={styles.root}>
      <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar visor"><HomePlusIcon name="close" size={26} color={colors.text.inverse} /></TouchableOpacity>
      <FlatList horizontal pagingEnabled data={items} initialScrollIndex={Math.min(initialIndex, Math.max(0, items.length - 1))} getItemLayout={(_, index) => ({ length: width, offset: width * index, index })} keyExtractor={(item) => item.id} renderItem={({ item }) => item.mimeType.startsWith('video/') ? <EvidenceVideo item={item} width={width} /> : <ScrollView style={{ width }} contentContainerStyle={styles.page} maximumZoomScale={4} minimumZoomScale={1} centerContent><Image source={{ uri: item.uri }} resizeMode="contain" style={[styles.image, { width }]} /></ScrollView>} />
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' }, close: { position: 'absolute', zIndex: 3, top: spacing[8], right: spacing[4], width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' }, image: { height: '100%' }, video: { width: '100%', height: '70%' }, loading: { position: 'absolute' },
});
