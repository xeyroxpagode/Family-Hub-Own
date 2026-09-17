import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '../../constants/theme';
import type { PresenceMember } from '../../services/presence';
import { AppCard, AppText, InteractivePressable } from '../ui';

export type MapContextCardMode = 'members' | 'places' | 'self';

export type MapPlaceSummary = {
  id: string;
  name: string;
  detail?: string;
};

export type MapContextCardProps = {
  mode: MapContextCardMode;
  members: PresenceMember[];
  selectedMember: PresenceMember | null;
  selectedPlace?: MapPlaceSummary | null;
  showMemberPicker?: boolean;
  getMemberStatus: (member: PresenceMember) => string;
  getRelativeTime: (recordedAt: string | null | undefined) => string;
  onSelectMember?: (member: PresenceMember) => void;
};

const getInitials = (name: string) => name.trim().slice(0, 2).toUpperCase() || '?';

/** One compact contextual sheet for member, place, and current-user selections. */
export function MapContextCard({
  mode,
  members,
  selectedMember,
  selectedPlace,
  showMemberPicker = false,
  getMemberStatus,
  getRelativeTime,
  onSelectMember,
}: MapContextCardProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const summaryMember = mode === 'self'
    ? members.find((member) => member.is_self) ?? null
    : selectedMember ?? members[0] ?? null;

  useEffect(() => {
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      damping: 18,
      stiffness: 280,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [entrance, mode, showMemberPicker, selectedMember?.membership_id]);

  const renderMemberPicker = () => (
    <>
      <AppText variant="bodySmall" weight="700">Integrantes</AppText>
      <AppText variant="caption" tone="secondary">Elegí una persona para ver su ubicación.</AppText>
      <View style={styles.memberChoices}>
        {members.map((member) => (
          <InteractivePressable
            key={member.membership_id}
            accessibilityRole="button"
            accessibilityLabel={`Ver ubicación de ${member.display_name}`}
            onPress={() => onSelectMember?.(member)}
            haptic="light"
            pressScale={0.96}
            style={styles.memberChoice}
          >
            <View style={styles.memberAvatar}>
              {member.avatar_url ? (
                <Image source={{ uri: member.avatar_url }} style={styles.memberAvatarImage} />
              ) : (
                <AppText variant="caption" weight="700" style={styles.memberInitials}>
                  {getInitials(member.display_name)}
                </AppText>
              )}
            </View>
            <AppText variant="micro" numberOfLines={1} style={styles.memberName}>
              {member.display_name.split(' ')[0]}
            </AppText>
          </InteractivePressable>
        ))}
      </View>
    </>
  );

  const renderContent = () => {
    if (mode === 'places') {
      return (
        <>
          <AppText variant="bodySmall" weight="700">{selectedPlace?.name ?? 'Lugares'}</AppText>
          <AppText variant="caption" tone="secondary">
            {selectedPlace?.detail ?? 'No hay lugares guardados para este hogar.'}
          </AppText>
        </>
      );
    }

    if (mode === 'members' && showMemberPicker) {
      return members.length > 0 ? renderMemberPicker() : (
        <>
          <AppText variant="bodySmall" weight="700">Integrantes</AppText>
          <AppText variant="caption" tone="secondary">No hay integrantes disponibles todavía.</AppText>
        </>
      );
    }

    if (!summaryMember) {
      return (
        <>
          <AppText variant="bodySmall" weight="700">{mode === 'self' ? 'Tu ubicación' : 'Integrante'}</AppText>
          <AppText variant="caption" tone="secondary">No hay información de ubicación disponible.</AppText>
        </>
      );
    }

    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryAvatar}>
          {summaryMember.avatar_url ? (
            <Image source={{ uri: summaryMember.avatar_url }} style={styles.summaryAvatarImage} />
          ) : (
            <AppText variant="bodySmall" weight="700" style={styles.summaryInitials}>
              {getInitials(summaryMember.display_name)}
            </AppText>
          )}
        </View>
        <View style={styles.summaryText}>
          <AppText variant="bodySmall" weight="700">
            {summaryMember.display_name}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {getMemberStatus(summaryMember)} - {getRelativeTime(summaryMember.location?.recorded_at)}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{
          translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
        }],
      }}
    >
      <AppCard variant="glass" padding="compact" style={styles.card}>
        {renderContent()}
      </AppCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    ...shadows.shadow2,
  },
  memberChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  memberChoice: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    gap: spacing[1],
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage[500],
  },
  memberInitials: {
    color: colors.text.inverse,
  },
  memberAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
  },
  memberName: {
    width: '100%',
    textAlign: 'center',
    color: colors.text.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 44,
  },
  summaryAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.terracotta[500],
  },
  summaryInitials: {
    color: colors.text.inverse,
  },
  summaryAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
  },
  summaryText: {
    flex: 1,
    gap: spacing[1],
  },
});
