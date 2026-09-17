import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../ui/AppText';
import { colors, radius, spacing } from '../../constants/theme';

type PendingSummaryPillProps = {
  count: number;
  onPress: () => void;
};

export const PendingSummaryPill: React.FC<PendingSummaryPillProps> = ({ count, onPress }) => {
  const label = count === 1 ? '1 pendiente' : `${count} pendientes`;

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.pill}>
        <View style={styles.badge}>
          <AppText variant="caption" weight="700">
            {count}
          </AppText>
        </View>
        <AppText variant="bodySmall" weight="600" tone="warning">
          {label}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.warning.soft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning.text,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: radius.md,
    backgroundColor: colors.warning.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});