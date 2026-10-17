import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';
import type { FilesIndexEntry } from './homecloudFilesSideIndex';

export function HomeCloudFilesSideIndex({ entries, onSelect }: { entries: readonly FilesIndexEntry[]; onSelect: (entry: FilesIndexEntry) => void }) {
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const selectAt = useCallback((y: number) => {
    if (entries.length === 0 || height <= 0) return;
    const index = Math.max(0, Math.min(entries.length - 1, Math.floor((y / height) * entries.length)));
    if (lastRef.current === index) return;
    lastRef.current = index;
    setActive(index);
    onSelect(entries[index]);
  }, [entries, height, onSelect]);
  // The responder must retain one gesture owner for the full rail drag.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => selectAt(event.nativeEvent.locationY),
    onPanResponderMove: (event) => selectAt(event.nativeEvent.locationY),
    onPanResponderRelease: () => { lastRef.current = null; setActive(null); },
    onPanResponderTerminate: () => { lastRef.current = null; setActive(null); },
    onShouldBlockNativeResponder: () => true,
  }), [selectAt]);
  if (entries.length === 0) return null;
  return <View style={styles.host} onLayout={(event) => setHeight(event.nativeEvent.layout.height)} {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Índice rápido de archivos">
    {active === null ? null : <View style={styles.bubble}><AppText variant="bodySmall" weight="800" tone="inverse">{entries[active]?.label}</AppText></View>}
    {entries.map((entry) => <AppText key={`${entry.label}-${entry.index}`} variant="caption" tone="secondary" weight="700" style={styles.label} numberOfLines={1}>{entry.label}</AppText>)}
  </View>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', right: spacing[1], top: spacing[2], bottom: spacing[4], width: 34, zIndex: 8, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: spacing[1] },
  label: { fontSize: 10, lineHeight: 12, color: colors.text.tertiary },
  bubble: { position: 'absolute', right: 40, top: '42%', minWidth: 68, minHeight: 40, paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.text.primary, alignItems: 'center', justifyContent: 'center' },
});
