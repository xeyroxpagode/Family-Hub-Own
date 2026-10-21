import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton, AppText, SegmentedControl } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, MOTION, spacing } from '../constants/theme';
import { HomeCloudFilesView } from './HomeCloudFilesScreen';
import { HomeCloudMemoriesView } from './HomeCloudMemoriesScreen';
import { HomeCloudUploadActivity } from '../components/homecloud/HomeCloudUploadActivity';
import { useHousehold } from '../context/HouseholdContext';
import { isMemoryViewerOpen, subscribeMemoryViewerOpen } from '../services/homecloud/homecloudViewerVisibility';
import { useReducedMotion } from '../hooks/useReducedMotion';

type HomeCloudSection = 'files' | 'memories';

export function HomeCloudScreen() {
  const navigation = useNavigation<any>();
  const { currentHousehold } = useHousehold();
  const [section, setSection] = useState<HomeCloudSection>('files');
  const paneProgress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const [viewerOpen, setViewerOpen] = useState(isMemoryViewerOpen());
  useEffect(() => subscribeMemoryViewerOpen(() => setViewerOpen(isMemoryViewerOpen())), []);

  const changeSection = (next: HomeCloudSection) => {
    if (next === section) return;
    setSection(next);
    paneProgress.stopAnimation();
    Animated.timing(paneProgress, {
      toValue: next === 'files' ? 0 : 1,
      duration: reducedMotion ? MOTION.reducedFade : MOTION.tabCrossFade,
      easing: reducedMotion ? Easing.linear : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.screen}>
      {viewerOpen ? null : (
        <View style={styles.header}>
          <AppButton variant="icon" size="sm" onPress={() => navigation.goBack()} accessibilityLabel="Volver">
            <HomePlusIcon name="arrow-back" size={22} color={colors.text.primary} />
          </AppButton>
          <AppText variant="title2" weight="800" style={styles.title}>HomeCloud</AppText>
        </View>
      )}
      {viewerOpen ? null : (
        <SegmentedControl
          selectionMode="single"
          value={section}
          options={[{ value: 'files', label: 'Archivos' }, { value: 'memories', label: 'Recuerdos' }]}
          onChange={changeSection}
          accessibilityLabel="Vista de HomeCloud"
          style={styles.selector}
        />
      )}
      {viewerOpen ? null : <HomeCloudUploadActivity householdId={currentHousehold?.id ?? null} />}
      <View style={styles.content}>
        {/* Both panes stay mounted and overlap so opacity can cross-fade without a
            layout flash. Section remains the interaction/accessibility authority;
            the inactive pane cannot receive touches, while its loaded window,
            scroll and navigation state remain intact. */}
        <Animated.View
          style={[styles.pane, { opacity: paneProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
          pointerEvents={section === 'files' ? 'auto' : 'none'}
          accessibilityElementsHidden={section !== 'files'}
          importantForAccessibility={section === 'files' ? 'auto' : 'no-hide-descendants'}
        >
          <HomeCloudFilesView visible={section === 'files'} />
        </Animated.View>
        <Animated.View
          style={[styles.pane, { opacity: paneProgress }]}
          pointerEvents={section === 'memories' ? 'auto' : 'none'}
          accessibilityElementsHidden={section !== 'memories'}
          importantForAccessibility={section === 'memories' ? 'auto' : 'no-hide-descendants'}
        >
          <HomeCloudMemoriesView active={section === 'memories'} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[2] },
  title: { flex: 1 },
  selector: { marginHorizontal: spacing[5], marginTop: spacing[2] },
  content: { flex: 1 },
  pane: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
