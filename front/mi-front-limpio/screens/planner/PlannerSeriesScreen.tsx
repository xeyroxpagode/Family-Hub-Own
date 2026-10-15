import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppScreen,
  AppText,
  EmptyState,
  ErrorState,
  FilterChip,
  InteractivePressable,
  Skeleton,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { createIdempotencyKey } from '../../services/idempotency';
import {
  FREQUENCY_LABELS,
  SERIES_LIFECYCLE_LABELS,
  createPlannerEventSeries,
  getPlannerEventSeries,
  listPlannerEventSeries,
  materializePlannerEventSeriesRange,
  pausePlannerEventSeries,
  restorePlannerEventSeries,
  resumePlannerEventSeries,
  trashPlannerEventSeries,
  updatePlannerEventSeries,
  type PlannerEventSeries,
  type PlannerSeriesFrequency,
} from '../../services/plannerEventSeries';
import { dateToYMD } from './plannerShared';

/**
 * Horarios — functional Event Series management.
 *
 * Frozen §19/§35/§36: a Series is the single recurring definition; it creates
 * concrete Events only through EXPLICIT bounded materialization. This screen is
 * that explicit control. It deliberately does NOT recurse recurrence on read
 * and it never materializes an unbounded horizon.
 */

const FREQUENCIES: PlannerSeriesFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

function addDaysKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return dateToYMD(date);
}

// `availableActions` is the ONLY authority (frozen §35/§41). When the
// projection is absent we offer NOTHING: deriving an action set from `lifecycle`
// here would be a second gate authority and it is not deny-safe.
function canSeries(series: PlannerEventSeries, action: string): boolean {
  return Array.isArray(series.availableActions) && series.availableActions.includes(action);
}

function describeRecurrence(series: PlannerEventSeries): string {
  const rule = series.recurrenceRule;
  const interval = rule?.interval && rule.interval > 1 ? `cada ${rule.interval} ` : '';
  if (rule?.frequency === 'weekly') {
    const days = (rule.daysOfWeek ?? []).map((value) => WEEKDAYS.find((day) => day.value === value)?.label).filter(Boolean);
    return days.length ? `${interval}semana: ${days.join(', ')}` : `${interval}semana`;
  }
  if (rule?.dayOfMonth) return `${interval}mes el día ${rule.dayOfMonth}`;
  return `${interval}${FREQUENCY_LABELS[rule?.frequency ?? 'weekly']?.toLowerCase() ?? 'recurrente'}`;
}

export function PlannerSeriesScreen() {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const token = session?.access_token;

  const [items, setItems] = useState<PlannerEventSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSeries, setActionSeries] = useState<PlannerEventSeries | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  // Detail and edit are separate from the list action sheet so the canonical
  // `availableActions` decision stays the single authority for what is offered.
  const [detailSeries, setDetailSeries] = useState<PlannerEventSeries | null>(null);
  const [editingSeries, setEditingSeries] = useState<PlannerEventSeries | null>(null);

  // Create form state (functional, not polished).
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<PlannerSeriesFrequency>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startsOn, setStartsOn] = useState(dateToYMD(new Date()));
  const [rangeDays, setRangeDays] = useState('30');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listPlannerEventSeries(token);
      setItems(response.series ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar los horarios.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingSeries(null);
    setTitle('');
    setFrequency('weekly');
    setDaysOfWeek([1]);
    setStartTime('09:00');
    setDurationMinutes('60');
    setStartsOn(dateToYMD(new Date()));
    setRangeDays('30');
    setFormError(null);
    setCreateVisible(true);
  };

  // Pre-fill the shared form from the canonical DTO so edit never invents state.
  const openEdit = (series: PlannerEventSeries) => {
    setActionSeries(null);
    setDetailSeries(null);
    setEditingSeries(series);
    setTitle(series.title ?? series.eventDefaults?.title ?? '');
    setFrequency(series.recurrenceRule?.frequency ?? 'weekly');
    setDaysOfWeek(series.recurrenceRule?.daysOfWeek ?? [1]);
    setStartTime(series.eventDefaults?.localStartTime ?? '09:00');
    setDurationMinutes(String(series.eventDefaults?.durationMinutes ?? 60));
    setStartsOn(series.startsOn ?? dateToYMD(new Date()));
    setFormError(null);
    setCreateVisible(true);
  };

  // Detail reads the authoritative single-resource projection, not the list row.
  const openDetail = async (series: PlannerEventSeries) => {
    setActionSeries(null);
    if (!token) return;
    setDetailSeries(series);
    try {
      const response = await getPlannerEventSeries(token, series.id);
      if (response.series) setDetailSeries(response.series);
    } catch (cause) {
      Alert.alert(
        'Horario',
        cause instanceof ApiError ? cause.message : 'No pudimos leer el detalle del horario.',
      );
      setDetailSeries(null);
    }
  };

  const submitSave = async () => {
    if (!token) return;
    if (!title.trim()) {
      setFormError('Agregá un título para el horario.');
      return;
    }
    if (frequency === 'weekly' && daysOfWeek.length === 0) {
      setFormError('Elegí al menos un día de la semana.');
      return;
    }
    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 10080) {
      setFormError('La duración debe estar entre 1 y 10080 minutos.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const recurrenceRule = {
      frequency,
      interval: 1,
      ...(frequency === 'weekly' ? { daysOfWeek: [...daysOfWeek].sort() } : {}),
    };
    const eventDefaults = { title: title.trim(), localStartTime: startTime, durationMinutes: duration };
    try {
      if (editingSeries) {
        await updatePlannerEventSeries(
          token,
          editingSeries.id,
          {
            title: title.trim(),
            recurrenceRule,
            startsOn,
            timeZone: editingSeries.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
            eventDefaults,
            expected_version: editingSeries.version,
          },
          { idempotencyKey: createIdempotencyKey('planner.event-series.update') },
        );
      } else {
        await createPlannerEventSeries(
          token,
          {
            title: title.trim(),
            scheduleType: 'timed',
            startsOn,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            recurrenceRule,
            eventDefaults,
          },
          { idempotencyKey: createIdempotencyKey('planner.event-series.create') },
        );
      }
      setCreateVisible(false);
      setEditingSeries(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : 'No pudimos guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  // Explicit, bounded materialization: exactly the requested window.
  const materialize = async (series: PlannerEventSeries) => {
    if (!token) return;
    const from = series.startsOn ?? dateToYMD(new Date());
    const days = Number(rangeDays);
    if (!Number.isFinite(days) || days < 1 || days > 180) {
      Alert.alert('Rango inválido', 'Elegí entre 1 y 180 días.');
      return;
    }
    setBusyId(series.id);
    try {
      const result = await materializePlannerEventSeriesRange(
        token,
        { from, to: addDaysKey(from, days) },
        { idempotencyKey: createIdempotencyKey('planner.event-series.materialize') },
      );
      const created = typeof result.created === 'number'
        ? result.created
        : (result.series ?? []).reduce((sum, entry) => sum + (entry?.created ?? 0), 0);
      Alert.alert(
        'Horarios',
        created > 0
          ? `Se generaron ${created} evento(s) en el calendario.`
          : 'No había eventos nuevos que generar para ese rango.',
      );
      await load();
    } catch (cause) {
      Alert.alert(
        'Horarios',
        cause instanceof ApiError ? cause.message : 'No pudimos generar los eventos.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const mutate = async (
    series: PlannerEventSeries,
    action: 'pause' | 'resume' | 'trash' | 'restore',
  ) => {
    if (!token) return;
    setBusyId(series.id);
    try {
      const call =
        action === 'pause' ? pausePlannerEventSeries
          : action === 'resume' ? resumePlannerEventSeries
            : action === 'trash' ? trashPlannerEventSeries
              : restorePlannerEventSeries;
      await call(token, series.id, series.version);
      await load();
    } catch (cause) {
      Alert.alert(
        'Horarios',
        cause instanceof ApiError ? cause.message : 'No pudimos actualizar el horario.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const active = items.filter((item) => item.lifecycle === 'active');
  const paused = items.filter((item) => item.lifecycle === 'paused');
  const trashed = items.filter((item) => item.lifecycle === 'trash');

  return (
    <AppScreen scroll bottomInset="tab">
      <View style={styles.header}>
        <InteractivePressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
        >
          <HomePlusIcon name="chevron-back" size={24} color={colors.text.primary} />
        </InteractivePressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title2" weight="800">Horarios</AppText>
          <AppText variant="caption" tone="secondary">
            Una rutina que genera eventos en el calendario.
          </AppText>
        </View>
        <InteractivePressable onPress={openCreate} accessibilityLabel="Nuevo horario">
          <HomePlusIcon name="add" size={25} color={colors.terracotta[600]} />
        </InteractivePressable>
      </View>

      <AppInput
        label="Días a generar"
        value={rangeDays}
        onChangeText={setRangeDays}
        placeholder="30"
        keyboardType="number-pad"
        helperText="Rango acotado para generar eventos. Repetir el mismo rango no duplica."
      />

      {loading ? (
        <View style={{ gap: spacing[2] }}>
          <Skeleton variant="listItem" />
          <Skeleton variant="listItem" />
        </View>
      ) : error ? (
        <ErrorState title="No pudimos cargar" description={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay horarios"
          description="Creá una rutina para generar eventos sin agregarlos de a uno."
          actionLabel="Crear horario"
          onAction={openCreate}
        />
      ) : (
        <>
          {active.length ? <SeriesSection title="ACTIVOS" items={active} busyId={busyId} onOpen={setActionSeries} onMaterialize={materialize} /> : null}
          {paused.length ? <SeriesSection title="PAUSADOS" items={paused} busyId={busyId} onOpen={setActionSeries} onMaterialize={materialize} /> : null}
          {trashed.length ? <SeriesSection title="EN LA PAPELERA" items={trashed} busyId={busyId} onOpen={setActionSeries} onMaterialize={materialize} /> : null}
        </>
      )}

      <ActionSheet
        visible={Boolean(actionSeries)}
        title={actionSeries?.title ?? 'Horario'}
        onRequestClose={() => setActionSeries(null)}
        size="content"
      >
        {actionSeries ? (
          <View style={{ gap: spacing[2] }}>
            <AppButton title="Ver detalle" variant="ghost" onPress={() => { const s = actionSeries; void openDetail(s); }} />
            {canSeries(actionSeries, 'update') ? (
              <AppButton title="Editar" variant="ghost" onPress={() => openEdit(actionSeries)} />
            ) : null}
            {canSeries(actionSeries, 'pause') ? (
              <AppButton title="Pausar" variant="ghost" loading={busyId === actionSeries.id} onPress={() => { const s = actionSeries; setActionSeries(null); void mutate(s, 'pause'); }} />
            ) : null}
            {canSeries(actionSeries, 'resume') ? (
              <AppButton title="Reanudar" variant="ghost" loading={busyId === actionSeries.id} onPress={() => { const s = actionSeries; setActionSeries(null); void mutate(s, 'resume'); }} />
            ) : null}
            {canSeries(actionSeries, 'restore') ? (
              <AppButton title="Restaurar" variant="ghost" loading={busyId === actionSeries.id} onPress={() => { const s = actionSeries; setActionSeries(null); void mutate(s, 'restore'); }} />
            ) : null}
            {canSeries(actionSeries, 'trash') ? (
              <AppButton title="Mover a la papelera" variant="danger" loading={busyId === actionSeries.id} onPress={() => { const s = actionSeries; setActionSeries(null); void mutate(s, 'trash'); }} />
            ) : null}
          </View>
        ) : null}
      </ActionSheet>

      <ActionSheet
        visible={Boolean(detailSeries)}
        title={detailSeries?.title ?? 'Horario'}
        onRequestClose={() => setDetailSeries(null)}
        size="content"
      >
        {detailSeries ? (
          <View style={{ gap: spacing[2] }}>
            <AppText variant="body" weight="800">
              {FREQUENCY_LABELS[detailSeries.recurrenceRule?.frequency] ?? 'Recurrente'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {describeRecurrence(detailSeries)}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {SERIES_LIFECYCLE_LABELS[detailSeries.lifecycle] ?? detailSeries.lifecycle}
              {detailSeries.timeZone ? ` · ${detailSeries.timeZone}` : ''}
            </AppText>
            <AppText variant="caption" tone="secondary">
              Comienza {detailSeries.startsOn ?? '—'}
              {detailSeries.endsOn ? ` · Termina ${detailSeries.endsOn}` : ''}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {detailSeries.eventDefaults?.localStartTime ?? '—'}
              {' · '}
              {detailSeries.eventDefaults?.durationMinutes ?? '—'} min
            </AppText>
            {canSeries(detailSeries, 'update') ? (
              <AppButton title="Editar" onPress={() => openEdit(detailSeries)} />
            ) : null}
          </View>
        ) : null}
      </ActionSheet>

      <ActionSheet
        visible={createVisible}
        title={editingSeries ? 'Editar horario' : 'Nuevo horario'}
        onRequestClose={() => { setCreateVisible(false); setEditingSeries(null); }}
        size="content"
      >
        <View style={{ gap: spacing[3] }}>
          <AppInput label="Título" value={title} onChangeText={setTitle} placeholder="Cole,issait, Gimnasio..." />
          <AppText variant="caption" tone="secondary" weight="800">Frecuencia</AppText>
          <View style={styles.chips}>
            {FREQUENCIES.map((option) => (
              <FilterChip
                key={option}
                label={FREQUENCY_LABELS[option]}
                selected={frequency === option}
                onPress={() => setFrequency(option)}
              />
            ))}
          </View>
          {frequency === 'weekly' ? (
            <>
              <AppText variant="caption" tone="secondary" weight="800">Días</AppText>
              <View style={styles.chips}>
                {WEEKDAYS.map((day) => (
                  <FilterChip
                    key={day.value}
                    label={day.label}
                    selected={daysOfWeek.includes(day.value)}
                    onPress={() => setDaysOfWeek((current) => (
                      current.includes(day.value)
                        ? current.filter((value) => value !== day.value)
                        : [...current, day.value]
                    ))}
                  />
                ))}
              </View>
            </>
          ) : null}
          <AppInput label="Hora de inicio" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          <AppInput
            label="Duración (minutos)"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            keyboardType="number-pad"
            placeholder="60"
          />
          <AppInput label="Comienza el" value={startsOn} onChangeText={setStartsOn} placeholder="YYYY-MM-DD" />
          {formError ? <AppText variant="caption" tone="danger">{formError}</AppText> : null}
          <AppButton
            title={editingSeries ? 'Guardar cambios' : 'Crear horario'}
            loading={saving}
            onPress={() => void submitSave()}
          />
        </View>
      </ActionSheet>
    </AppScreen>
  );
}

function SeriesSection({
  title,
  items,
  busyId,
  onOpen,
  onMaterialize,
}: {
  title: string;
  items: PlannerEventSeries[];
  busyId: string | null;
  onOpen: (series: PlannerEventSeries) => void;
  onMaterialize: (series: PlannerEventSeries) => void;
}) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  return (
    <View style={{ marginTop: spacing[5] }}>
      <AppText variant="caption" tone="secondary" weight="800" style={{ marginBottom: spacing[2] }}>
        {title}
      </AppText>
      {items.map((item) => (
        <View
          key={item.id}
          style={[
            styles_row(),
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.border.subtle,
            },
          ]}
        >
          <InteractivePressable
            style={{ flex: 1 }}
            onPress={() => onOpen(item)}
            accessibilityLabel={`Acciones de ${item.title ?? 'horario'}`}
          >
            <AppText variant="body" weight="800">{item.title ?? 'Horario'}</AppText>
            <AppText variant="caption" tone="secondary">
              {FREQUENCY_LABELS[item.recurrenceRule?.frequency] ?? 'Recurrente'}
              {item.timeZone ? ` · ${item.timeZone}` : ''}
              {' · '}
              {SERIES_LIFECYCLE_LABELS[item.lifecycle] ?? item.lifecycle}
            </AppText>
          </InteractivePressable>
          <AppButton
            title="Generar"
            variant="ghost"
            size="sm"
            loading={busyId === item.id}
            disabled={item.lifecycle !== 'active'}
            onPress={() => onMaterialize(item)}
          />
        </View>
      ))}
    </View>
  );
}

const styles_row = () => ({});

const makeStyles = ({ spacing }: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
  });
