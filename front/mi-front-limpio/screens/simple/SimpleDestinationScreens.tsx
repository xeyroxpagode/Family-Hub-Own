import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/ui';
import {
  SimpleEmptyState,
  SimpleHeader,
  SimpleListRow,
  SimpleScreen,
  SimpleStatusCard,
} from '../../components/simple';
import { HomePlusIcon } from '../../constants/icons';
import { radius, spacing } from '../../constants/theme';
import { ExperienceModeSetting } from '../../components/experience/ExperienceModeSetting';
import { useHousehold } from '../../context/HouseholdContext';
import { getSimpleModules, type SimpleModule } from '../../navigation/simpleModuleRegistry';
import { useHomePlannerSummary } from '../../services/planner/useHomePlannerSummary';

function SimpleDestination({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  return (
    <SimpleScreen
      header={<SimpleHeader title={title} onBackHome={() => navigation.navigate('SimpleHome')} />}
    >
      {subtitle ? <View style={styles.heading}><AppText variant="body" tone="secondary">{subtitle}</AppText></View> : null}
      {children}
    </SimpleScreen>
  );
}

export function SimpleFamilyScreen() {
  const { members } = useHousehold();
  return (
    <SimpleDestination title="Familia" subtitle={`${members.length} integrantes`}>
      <View style={styles.list}>
        {members.length === 0 ? (
          <SimpleEmptyState title="Todavía no hay integrantes" description="Cuando se sumen a tu hogar, los vas a ver acá." icon="people-outline" />
        ) : members.map((member) => (
          <SimpleListRow
            key={member.id}
            title={member.user?.nombre ?? 'Integrante'}
            subtitle="Integrante del hogar"
            icon="person-outline"
            trailing="none"
          />
        ))}
      </View>
    </SimpleDestination>
  );
}

export function SimpleAgendaScreen() {
  const { state, refresh } = useHomePlannerSummary();
  const items = [
    ...(state.summary?.events ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: event.all_day ? 'Todo el día' : new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at)),
      icon: 'calendar-outline' as const,
    })),
    ...(state.summary?.tasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: task.due_time ?? 'Tarea pendiente',
      icon: 'checkbox-outline' as const,
    })),
  ];
  return (
    <SimpleDestination title="Mi agenda" subtitle="Hoy">
      <View style={styles.list}>
        {items.length === 0 ? (
          <SimpleEmptyState
            title="No hay pendientes para mostrar"
            description="Tus próximos eventos y tareas aparecerán acá."
            icon="calendar-outline"
            actionLabel="Actualizar"
            onAction={() => void refresh()}
          />
        ) : items.map((item) => (
          <SimpleListRow key={item.id} title={item.title} subtitle={item.subtitle} icon={item.icon} />
        ))}
      </View>
    </SimpleDestination>
  );
}

export function SimpleMedicationScreen() {
  return (
    <SimpleDestination title="Medicamentos" subtitle="Recordatorios y próximas tomas">
      <SimpleEmptyState title="No hay recordatorios activos" description="Cuando la función de medicación esté configurada para tu hogar, vas a ver las próximas tomas aquí." icon="medical-outline" />
    </SimpleDestination>
  );
}

export function SimpleCallsScreen() {
  const { members } = useHousehold();
  return (
    <SimpleDestination title="Llamar" subtitle="Elegí a quién querés contactar">
      <View style={styles.list}>
        {members.length === 0 ? (
          <SimpleEmptyState title="No hay contactos disponibles" description="Los integrantes con teléfono aparecerán en esta lista." icon="call-outline" />
        ) : members.map((member) => (
          <SimpleListRow
            key={member.id}
            title={member.user?.nombre ?? 'Integrante'}
            subtitle="Contacto del hogar"
            icon="person-outline"
            trailing={<View style={styles.callIcon}><HomePlusIcon name="call-outline" size={24} color="#FFFFFF" /></View>}
            onPress={() => Alert.alert('Llamar', 'Este integrante todavía no tiene un teléfono disponible para llamar desde HomePlus.')}
          />
        ))}
      </View>
    </SimpleDestination>
  );
}

export function SimpleMoreScreen() {
  const navigation = useNavigation<any>();
  const modules = getSimpleModules();
  const open = (module: SimpleModule) => {
    if (module.route === 'SimpleModuleEntry') {
      navigation.navigate(module.route, { moduleId: module.id, title: module.label });
      return;
    }
    navigation.navigate(module.route);
  };

  return (
    <SimpleDestination title="Más funciones" subtitle="Módulos disponibles para tu hogar">
      <View style={styles.list}>
        {modules.map((module) => (
          <SimpleListRow
            key={module.id}
            title={module.label}
            subtitle={module.description}
            icon={module.icon}
            onPress={() => open(module)}
          />
        ))}
      </View>
    </SimpleDestination>
  );
}

export function SimpleModuleEntryScreen({ route }: { route: { params: { title: string } } }) {
  return (
    <SimpleDestination title={route.params.title} subtitle="Disponible desde Más funciones">
      <SimpleEmptyState title="Próximamente en modo simple" description="Este módulo utiliza el mismo servicio y datos de HomePlus. Su vista simple se incorpora en una próxima etapa." icon="apps-outline" />
    </SimpleDestination>
  );
}

export function SimpleSosScreen() {
  return (
    <SimpleDestination title="Ayuda / SOS" subtitle="Pedí ayuda de forma rápida">
      <SimpleStatusCard
        title="SOS todavía no está activo"
        subtitle="Estamos preparando la alerta familiar, ubicación y contactos de emergencia. Esta pantalla no envía una alerta todavía."
        icon="alert-circle-outline"
        tone="attention"
        trailing="none"
      />
    </SimpleDestination>
  );
}

export function SimpleSettingsScreen() {
  return (
    <SimpleDestination title="Configuración" subtitle="Ajustes de la aplicación">
      <ExperienceModeSetting />
    </SimpleDestination>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing[1] },
  list: { gap: spacing[3] },
  callIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: '#E7643F', alignItems: 'center', justifyContent: 'center' },
});
