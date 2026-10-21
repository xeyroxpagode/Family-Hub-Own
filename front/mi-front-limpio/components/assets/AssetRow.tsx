import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, spacing } from '../../constants/theme';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';
import { StatusBadge } from '../ui/StatusBadge';
import { AssetAvatar } from './AssetAvatar';
import { describeContextLine, lifecyclePill } from './assetLabels';
import type { AssetDto } from '../../services/assets';

export type AssetRowProps = {
  asset: AssetDto;
  onPress: () => void;
};

/**
 * Fila Root: avatar 40, nombre 15/600, contexto 12–13, chevron 16,
 * alto base 64 con crecimiento natural. Sin recorte tipográfico.
 */
export function AssetRow({ asset, onPress }: AssetRowProps) {
  const context = describeContextLine(asset);
  const pill = lifecyclePill(asset.lifecycle_status);

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={context ? `${asset.name}. ${context}` : asset.name}
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      pressedOpacity={0.85}
      style={styles.row}
    >
      <AssetAvatar profile={asset.profile} size="root" />
      <View style={styles.content}>
        <View style={styles.titleLine}>
          <AppText variant="bodySmall" weight="600" style={styles.title}>
            {asset.name}
          </AppText>
          {pill ? <StatusBadge label={pill.label} tone={pill.tone} /> : null}
        </View>
        {context ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={2}>
            {context}
          </AppText>
        ) : null}
      </View>
      <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flexShrink: 1,
  },
});
