import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AppScreen, AppText, IconButton, StatusBadge } from '../../components/ui';
import { spacing } from '../../constants/theme';
import { HomePlannerSections } from './HomePlannerSections';

// ─── Main screen ─────────────────────────────────────────────────────────────

export const HomeCoordinador = () => {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.user_metadata?.nombre?.split(' ')[0] ?? 'Coordinador';

  return (
    <AppScreen scroll bottomInset="tab" contentContainerStyle={styles.content}>

        <View style={styles.hero}>
          <View>
            <AppText variant="title1">{greeting}, {firstName}</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.dateLabel}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </AppText>
          </View>
          <IconButton icon="notifications-outline" variant="surface" accessibilityLabel="Notificaciones" />
        </View>

        {currentHousehold && (
          <StatusBadge label={currentHousehold.nombre} tone="brand" icon="home-outline" style={styles.householdName} />
        )}

        <HomePlannerSections />
        <View style={{ height: 40 }} />
    </AppScreen>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { paddingTop: spacing[3] },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  dateLabel: { textTransform: 'capitalize', marginTop: spacing[1] },
  householdName: { alignSelf: 'flex-start', marginBottom: spacing[4] },
});
