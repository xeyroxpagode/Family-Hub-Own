import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppButton, AppText, SegmentedControl } from '../components/ui';
import { HomePlusIcon } from '../constants/icons';
import { colors, spacing } from '../constants/theme';
import { HomeCloudFilesView } from './HomeCloudFilesScreen';
import { HomeCloudMemoriesView } from './HomeCloudMemoriesScreen';
import { HomeCloudUploadActivity } from '../components/homecloud/HomeCloudUploadActivity';
import { useHousehold } from '../context/HouseholdContext';

type HomeCloudSection = 'files' | 'memories';

export function HomeCloudScreen() {
  const navigation = useNavigation<any>();
  const { currentHousehold } = useHousehold();
  const [section, setSection] = useState<HomeCloudSection>('files');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppButton variant="icon" size="sm" onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <HomePlusIcon name="arrow-back" size={22} color={colors.text.primary} />
        </AppButton>
        <AppText variant="title2" weight="800" style={styles.title}>HomeCloud</AppText>
      </View>
      <SegmentedControl
        selectionMode="single"
        value={section}
        options={[{ value: 'files', label: 'Archivos' }, { value: 'memories', label: 'Recuerdos' }]}
        onChange={setSection}
        accessibilityLabel="Vista de HomeCloud"
        style={styles.selector}
      />
      <HomeCloudUploadActivity householdId={currentHousehold?.id ?? null} />
      <View style={styles.content}>
        <View style={[styles.pane, section !== 'files' && styles.hidden]} accessibilityElementsHidden={section !== 'files'}>
          <HomeCloudFilesView />
        </View>
        <View style={[styles.pane, section !== 'memories' && styles.hidden]} accessibilityElementsHidden={section !== 'memories'}>
          <HomeCloudMemoriesView />
        </View>
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
  pane: { flex: 1 },
  hidden: { display: 'none' },
});
