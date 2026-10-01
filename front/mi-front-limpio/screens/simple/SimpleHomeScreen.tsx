import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppCard } from '../../components/ui';
import {
  SimpleActionCard,
  SimpleEmergencyButton,
  SimpleEmptyState,
  SimpleHeader,
  SimpleListRow,
  SimpleLoadingState,
  SimpleScreen,
  SimpleSectionTitle,
  SimpleStatusCard,
} from '../../components/simple';
import { spacing } from '../../constants/theme';
import { getSimpleActionGridColumns } from '../../components/simple/simpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useHomePlannerSummary } from '../../services/planner/useHomePlannerSummary';

function formatEventTime(value: string, allDay: boolean) {
  if (allDay) return 'Todo el día';
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function SimpleHomeScreen() {
  const navigation = useNavigation<any>();
  const { authMe } = useAuth();
  const { currentHousehold, members } = useHousehold();
  const { state, refresh } = useHomePlannerSummary();
  const { width, fontScale } = useWindowDimensions();
  const [wellbeingAcknowledged, setWellbeingAcknowledged] = useState(false);
  const name = authMe?.person?.display_name ?? 'Usuario';
  const actionGridColumns = getSimpleActionGridColumns(width, fontScale);
  const todayItems = useMemo(() => [
    ...(state.summary?.events ?? []).map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      meta: formatEventTime(event.starts_at, event.all_day),
      icon: 'calendar-outline' as const,
    })),
    ...(state.summary?.tasks ?? []).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      meta: task.due_time ?? 'Tarea pendiente',
      icon: 'checkbox-outline' as const,
    })),
  ].slice(0, 3), [state.summary]);

  const reportWellbeing = () => {
    // No canonical wellbeing endpoint exists yet. This remains an honest UI
    // entry point rather than creating a parallel domain or backend mutation.
    setWellbeingAcknowledged(true);
    Alert.alert('Estoy bien', 'Esta confirmación estará disponible para tu hogar cuando se active esta función.');
  };

  return (
    <SimpleScreen
      header={(
        <SimpleHeader
          name={name}
          avatarUrl={authMe?.person?.avatar_url}
          householdName={currentHousehold?.nombre ?? 'Tu hogar'}
          onMore={() => navigation.navigate('SimpleMore')}
        />
      )}
      scrollProps={{
        refreshControl: <RefreshControl refreshing={state.refreshing} onRefresh={() => void refresh()} tintColor="#E7643F" />,
      }}
    >
      <SimpleSectionTitle title="HOY" actionLabel="Ver todo" onAction={() => navigation.navigate('SimpleAgenda')} />
      {state.status === 'initial_loading' ? <SimpleLoadingState label="Cargando tu agenda" /> : null}
      {state.status !== 'initial_loading' && todayItems.length === 0 ? (
        <SimpleEmptyState icon="sunny-outline" title="No hay nada pendiente" description="Tu agenda de hoy está al día." />
      ) : null}
      {todayItems.length > 0 ? (
        <AppCard padding="compact" style={styles.todayCard}>
          {todayItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <SimpleListRow
                embedded
                title={item.title}
                subtitle={item.meta}
                icon={item.icon}
                onPress={() => navigation.navigate('SimpleAgenda')}
              />
            </React.Fragment>
          ))}
        </AppCard>
      ) : null}

      <SimpleSectionTitle title="ACCESOS" />
      <View style={[styles.grid, actionGridColumns === 1 && styles.gridSingleColumn]}>
        <SimpleActionCard fullWidth={actionGridColumns === 1} title="Familia" subtitle={`${members.length || 0} integrantes`} icon="people-outline" tone="neutral" onPress={() => navigation.navigate('SimpleFamily')} />
        <SimpleActionCard fullWidth={actionGridColumns === 1} title="Medicamentos" subtitle="Recordatorios disponibles" icon="medical-outline" tone="brand" onPress={() => navigation.navigate('SimpleMedication')} />
        <SimpleActionCard fullWidth={actionGridColumns === 1} title="Mi agenda" subtitle={state.summary ? `${state.summary.counts.events + state.summary.counts.tasks} pendientes` : 'Eventos y tareas'} icon="calendar-outline" tone="sage" onPress={() => navigation.navigate('SimpleAgenda')} />
        <SimpleActionCard fullWidth={actionGridColumns === 1} title="Llamar" subtitle="Contactos del hogar" icon="call-outline" tone="lilac" onPress={() => navigation.navigate('SimpleCalls')} />
      </View>

      <SimpleStatusCard
        title="Estoy bien"
        subtitle={wellbeingAcknowledged ? 'Estado preparado' : 'Avisar a mi familia'}
        icon="heart-outline"
        tone={wellbeingAcknowledged ? 'success' : 'primarySoft'}
        onPress={reportWellbeing}
      />
      <SimpleListRow
        title="Más funciones"
        subtitle="Todos los módulos disponibles"
        icon="grid-outline"
        onPress={() => navigation.navigate('SimpleMore')}
      />
      <SimpleEmergencyButton onPress={() => navigation.navigate('SimpleSos')} />
    </SimpleScreen>
  );
}

const styles = StyleSheet.create({
  todayCard: { borderColor: '#DED5CB' },
  divider: { height: 1, backgroundColor: '#DED5CB', marginLeft: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: spacing[3], rowGap: spacing[3] },
  gridSingleColumn: { flexDirection: 'column' },
});
