import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError } from '../../services/api';
import {
  listPlannerEvents,
  type CreatePlannerEventPayload,
  type PlannerEventRecurrence,
} from '../../services/plannerEvents';
import {
  enqueuePlannerEventCancel,
  enqueuePlannerEventCreate,
  enqueuePlannerEventOccurrenceOverride,
  enqueuePlannerEventUpdate,
} from '../../services/planner/reliability';
import { createIdempotencyKey } from '../../services/idempotency';
import { omitUndefinedPlannerPayloadProperties } from '../../services/planner/plannerPayloadFilter';
import { useAuth } from '../../context/AuthContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { buildLocalIso, dateToYMD, addDays, plannerStyles as S, recurrenceLabels } from './plannerShared';
import { colors } from '../../constants/theme';

type EventFormProps = {
  mode: 'create' | 'edit';
  embedded?: boolean;
  eventId?: string;
  baseEventId?: string;
  occurrenceId?: string;
  occurrenceStartsAt?: string;
  occurrenceEndsAt?: string;
  isGeneratedRecurringOccurrence?: boolean;
  initialDate?: string;
  onClose?: () => void;
  onSaved?: (message: string) => void;
  createMutationId?: string;
  onSubmitBegin?: (intentId: string) => void;
  onSubmitEnd?: (intentId: string) => void;
};

const recurrenceOptions: PlannerEventRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const validateDate = (value: string): string | null => {
  if (!value.trim()) return 'Ingresá una fecha.';
  if (!DATE_REGEX.test(value.trim())) return 'Ingresá una fecha válida con formato AAAA-MM-DD.';
  return null;
};

const validateTime = (value: string): string | null => {
  if (!value.trim()) return 'Ingresá una hora.';
  if (!TIME_REGEX.test(value.trim())) return 'Ingresá una hora válida con formato HH:mm.';
  return null;
};

const validateEndTime = (start: string, end: string): string | null => {
  if (!start.trim() || !end.trim()) return null;
  if (!TIME_REGEX.test(start.trim()) || !TIME_REGEX.test(end.trim())) return null;
  if (end.trim() <= start.trim()) return 'La hora de fin debe ser posterior a la hora de inicio.';
  return null;
};

const splitIso = (value?: string | null) => {
  if (!value) return { date: dateToYMD(new Date()), time: '09:00' };
  const date = new Date(value);
  return {
    date: dateToYMD(date),
    time: date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
};

const getDateLabel = (value: string): string => {
  if (!value || !DATE_REGEX.test(value)) return '';
  const today = dateToYMD(new Date());
  const tomorrow = dateToYMD(addDays(new Date(), 1));
  if (value === today) return 'Hoy';
  if (value === tomorrow) return 'Mañana';
  const date = new Date(value + 'T00:00:00');
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' });
};

export function EventForm({
  mode,
  embedded = false,
  eventId: eventIdProp,
  baseEventId,
  occurrenceId,
  occurrenceStartsAt,
  occurrenceEndsAt,
  isGeneratedRecurringOccurrence,
  initialDate,
  onClose,
  onSaved,
  createMutationId,
  onSubmitBegin,
  onSubmitEnd,
}: EventFormProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, loading: authLoading } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const eventId = eventIdProp ?? route.params?.eventId as string | undefined;
  const routeReturnTo = (route.params?.returnTo as string) || undefined;
  const routeInitialTab = (route.params?.initialTab as string) || undefined;

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<'occurrence' | 'series'>('occurrence');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => {
    if (mode === 'create' && initialDate && DATE_REGEX.test(initialDate)) {
      return initialDate;
    }
    return dateToYMD(new Date());
  });
  const [dateTouched, setDateTouched] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [startTimeTouched, setStartTimeTouched] = useState(false);
  const [endTime, setEndTime] = useState('10:00');
  const [endTimeTouched, setEndTimeTouched] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [recurrence, setRecurrence] = useState<PlannerEventRecurrence>('none');
  const [entityVersion, setEntityVersion] = useState<number | null>(null);

  const eventCreateKeyRef = useRef(createIdempotencyKey('planner.events.create'));
  const eventUpdateKeyRef = useRef(createIdempotencyKey('planner.events.update'));
  const eventCancelKeyRef = useRef(createIdempotencyKey('planner.events.cancel'));
  const occurrenceOverrideKeyRef = useRef(createIdempotencyKey('planner.events.occurrences.override.create'));
  // Re-entry guard for the submit button (same rationale as TaskForm).
  const submitInFlightRef = useRef(false);

  const isFormReadyForSubmit = React.useMemo(() => {
    if (authLoading || loading || saving) return false;
    if (!accessToken) return false;
    if (!title.trim()) return false;
    if (!DATE_REGEX.test(date.trim())) return false;
    if (!allDay) {
      if (!TIME_REGEX.test(startTime.trim())) return false;
      if (!TIME_REGEX.test(endTime.trim())) return false;
      if (endTime.trim() <= startTime.trim()) return false;
    }

    if (mode === 'create') {
      return true;
    }
    if (mode === 'edit' && eventId) {
      if (isGeneratedRecurringOccurrence) {
        if (editScope === 'occurrence') {
          return Boolean(baseEventId && occurrenceStartsAt);
        }
        if (editScope === 'series') {
          return Boolean(baseEventId);
        }
      }
      return true;
    }
    return false;
  }, [authLoading, loading, saving, accessToken, title, date, allDay, startTime, endTime, mode, eventId, isGeneratedRecurringOccurrence, editScope, baseEventId, occurrenceStartsAt]);

  useEffect(() => {
    const loadEvent = async () => {
      if (mode !== 'edit' || !accessToken || !eventId || authLoading) return;

      setLoading(true);
      setError(null);

      try {
        const { events } = await listPlannerEvents(accessToken, {
          from: '2020-01-01T00:00:00.000Z',
          to: '2100-12-31T23:59:59.999Z',
          include_cancelled: true,
          include_recurring: true,
        });
        const event = events.find((item) => item.id === eventId);

        if (!event) {
          setError('No pudimos encontrar este evento.');
          return;
        }

        const start = splitIso(event.starts_at);
        const end = splitIso(event.ends_at);
        setTitle(event.title);
        setDescription(event.description ?? '');
        setDate(start.date);
        setStartTime(start.time);
        setEndTime(end.time);
        setAllDay(event.all_day);
        setLocationName(event.location_name ?? '');
        setRecurrence(event.recurrence);
        setEntityVersion(event.version ?? 1);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No pudimos cargar el evento.');
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'edit' && authLoading) {
      setLoading(true);
    }

    if (mode !== 'edit' || !authLoading) {
      void loadEvent();
    }
  }, [accessToken, eventId, mode, authLoading]);

  const submit = async () => {
    // Re-entry guard: a single logical submit must drive at most one
    // enqueuePlannerEventCreate / Update call. Without this guard, a fast
    // double tap can start a second submit BEFORE the React `saving` state
    // re-render disables the button; that second submit reuses the same
    // stable mutation id (the sheet host owns one intent per form open) and
    // hits the backend as a duplicate mutation_id, which the backend V2
    // reserve previously escalated to 500 instead of returning replay.
    if (submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;

    if (authLoading) {
      submitInFlightRef.current = false;
      const message = 'Estamos preparando tu sesión. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (loading) {
      submitInFlightRef.current = false;
      const message = 'Estamos preparando el formulario. Intentá de nuevo en un momento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    if (!accessToken) {
      submitInFlightRef.current = false;
      const message = 'No hay sesión activa para guardar el evento.';
      setError(message);
      Alert.alert('Planner', message);
      return;
    }

    setTitleTouched(true);
    setDateTouched(true);
    setStartTimeTouched(true);
    setEndTimeTouched(true);

    const titleError = !title.trim() ? 'Ingresá un título para el evento.' : null;
    const dateError = validateDate(date);
    const startTimeError = !allDay ? validateTime(startTime) : null;
    const endTimeError = !allDay ? validateTime(endTime) : null;
    const timeOrderError = !allDay ? validateEndTime(startTime, endTime) : null;

    if (titleError || dateError || startTimeError || endTimeError || timeOrderError) {
      submitInFlightRef.current = false;
      if (titleError) setError(titleError);
      else if (dateError) setError(dateError);
      else if (startTimeError) setError(startTimeError);
      else if (endTimeError) setError(endTimeError);
      else if (timeOrderError) setError(timeOrderError);
      return;
    }

    if (mode === 'edit' && isGeneratedRecurringOccurrence) {
      if (editScope === 'occurrence' && (!baseEventId || !occurrenceStartsAt)) {
        submitInFlightRef.current = false;
        Alert.alert('Planner', 'No hay información suficiente para editar este evento recurrente.');
        return;
      }
      if (editScope === 'series' && !baseEventId) {
        submitInFlightRef.current = false;
        Alert.alert('Planner', 'No hay información suficiente para editar este evento recurrente.');
        return;
      }
    }

    const startsAt = buildLocalIso(date, allDay ? '00:00' : startTime);
    const finalEndsAt = allDay ? undefined : buildLocalIso(date, endTime);

    const payload: CreatePlannerEventPayload & { expected_version?: number } = omitUndefinedPlannerPayloadProperties({
      title: title.trim(),
      description: description.trim() || undefined,
      starts_at: startsAt,
      ends_at: finalEndsAt,
      all_day: allDay,
      location_name: locationName.trim() || undefined,
      recurrence,
      expected_version: mode === 'edit' ? entityVersion ?? undefined : undefined,
    });

    setSaving(true);
    setError(null);
    if (createMutationId && onSubmitBegin) {
      onSubmitBegin(createMutationId);
    }

    try {
      if (mode === 'edit' && eventId) {
        let targetEventId = eventId;

if (isGeneratedRecurringOccurrence) {
            if (editScope === 'occurrence') {
              if (!baseEventId || !occurrenceStartsAt) {
                const message = 'No hay información suficiente para editar este evento recurrente.';
                setError(message);
                Alert.alert('Planner', message);
                return;
              }

              const overrideResponse = await enqueuePlannerEventOccurrenceOverride(baseEventId, {
                original_occurrence_start_at: occurrenceStartsAt,
                starts_at: occurrenceStartsAt,
                ends_at: occurrenceEndsAt ?? undefined,
              }, { idempotencyKey: occurrenceOverrideKeyRef.current });
              occurrenceOverrideKeyRef.current = createIdempotencyKey('planner.events.occurrences.override.create');
              targetEventId = overrideResponse.event.id;
            } else if (editScope === 'series') {
              if (!baseEventId) {
                const message = 'No hay información suficiente para editar este evento recurrente.';
                setError(message);
                Alert.alert('Planner', message);
                return;
              }
              targetEventId = baseEventId;
            }
          }

        await enqueuePlannerEventUpdate(targetEventId, payload, { idempotencyKey: eventUpdateKeyRef.current });
        markPlannerChanged();
        if (onSaved) {
          onSaved('Evento actualizado.');
        } else {
          Alert.alert('Planner', 'Evento actualizado.');
        }
        eventUpdateKeyRef.current = createIdempotencyKey('planner.events.update');
      } else {
        await enqueuePlannerEventCreate(payload, {
          idempotencyKey: eventCreateKeyRef.current,
          mutationId: createMutationId,
        });
        markPlannerChanged();
        if (onSaved) {
          onSaved('Evento creado.');
        } else {
          Alert.alert('Planner', 'Evento creado.');
        }
        eventCreateKeyRef.current = createIdempotencyKey('planner.events.create');
      }

      if (!onSaved) {
        const tab = routeReturnTo === 'PlannerHome'
          ? (routeInitialTab ?? 'calendar')
          : 'calendar';
        const refreshKey = Date.now();
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('PlannerHome', { refreshKey, initialTab: tab });
        }
      }
    } catch (err) {
      if (createMutationId && onSubmitEnd) {
        onSubmitEnd(createMutationId);
      }
      const message = err instanceof ApiError ? err.message : 'No pudimos guardar el evento.';
      setError(message);
      Alert.alert('Planner', message);
    } finally {
      setSaving(false);
      submitInFlightRef.current = false;
    }
  };

  const cancelEvent = () => {
    if (!accessToken || !eventId) return;

    Alert.alert('¿Cancelar este evento?', 'Dejará de aparecer como próximo evento.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar evento',
        style: 'destructive',
onPress: async () => {
            setSaving(true);
            try {
              await enqueuePlannerEventCancel(eventId, entityVersion ?? undefined, { idempotencyKey: eventCancelKeyRef.current });
              markPlannerChanged();
              if (onSaved) {
                onSaved('Evento cancelado.');
              } else {
                Alert.alert('Planner', 'Evento cancelado.');
                const tab = routeReturnTo === 'PlannerHome'
                  ? (routeInitialTab ?? 'calendar')
                  : 'calendar';
                const refreshKey = Date.now();
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('PlannerHome', { refreshKey, initialTab: tab });
                }
              }
              eventCancelKeyRef.current = createIdempotencyKey('planner.events.cancel');
            } catch (err) {
              Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos cancelar el evento.');
            } finally {
              setSaving(false);
            }
          },
      },
    ]);
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (routeReturnTo === 'PlannerHome') {
      const tab = routeInitialTab ?? 'calendar';
      const refreshKey = Date.now();
      navigation.replace('PlannerHome', { refreshKey, initialTab: tab });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('PlannerHome', { refreshKey: Date.now(), initialTab: 'calendar' });
  };

  const handlePressOutside = () => {
    Keyboard.dismiss();
  };

  const content = loading ? (
    <View style={[S.content, { minHeight: 220, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#CD7353" />
      <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando formulario...</Text>
    </View>
  ) : (
    <Pressable style={{ flex: 1 }} onPress={handlePressOutside}>
      <KeyboardAwareScrollView
        style={embedded ? undefined : S.scroll}
        contentContainerStyle={embedded ? { paddingBottom: 26 } : S.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={48}
      >
        <View style={[S.headerRow, { marginBottom: 18 }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.title}>{mode === 'edit' ? 'Editar evento' : 'Crear evento'}</Text>
            <Text style={S.subtitle}>
              {mode === 'edit'
                ? 'Ajustá los detalles sin perder la coordinación familiar.'
                : 'Agendá un momento importante para que todos estén al tanto.'}
            </Text>
          </View>
          <TouchableOpacity style={S.secondaryBtn} onPress={closeForm}>
            <Text style={S.secondaryText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{error}</Text>
          </View>
        ) : null}

        {mode === 'edit' && isGeneratedRecurringOccurrence ? (
          <View style={S.eventScopeCard}>
            <Text style={S.formLabelHuman}>Alcance de la edición</Text>
            <View style={[S.row, { gap: 8 }]}>
              <TouchableOpacity
                style={[
                  S.eventFormChip,
                  editScope === 'occurrence' && S.eventFormChipActive,
                  { flex: 1, alignItems: 'center', paddingVertical: 10 },
                ]}
                onPress={() => setEditScope('occurrence')}
              >
                <Text
                  style={[
                    S.eventFormChipText,
                    editScope === 'occurrence' && S.eventFormChipTextActive,
                  ]}
                >
                  Solo este evento
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  S.eventFormChip,
                  editScope === 'series' && S.eventFormChipActive,
                  { flex: 1, alignItems: 'center', paddingVertical: 10 },
                ]}
                onPress={() => setEditScope('series')}
              >
                <Text
                  style={[
                    S.eventFormChipText,
                    editScope === 'series' && S.eventFormChipTextActive,
                  ]}
                >
                  Toda la serie
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={S.eventScopeHelper}>
              Elegí si este cambio afecta solo esta fecha o toda la serie.
            </Text>
          </View>
        ) : null}

        <View style={S.eventFormSection}>
            <Text style={S.formLabelHuman}>¿Qué evento es?</Text>
            <TextInput
              style={[S.eventFormInput, S.eventFormInputFocus, !title.trim() && titleTouched && { borderColor: colors.danger.base }]}
              value={title}
              onChangeText={setTitle}
              onFocus={() => { if (error) setError(null); }}
              placeholder="Ej. Control médico, Cumpleaños de Ana..."
              placeholderTextColor={colors.text.tertiary}
            />
            {!title.trim() && titleTouched ? (
              <Text style={S.formErrorInline}>Ingresá un título para el evento.</Text>
            ) : null}
          </View>

          <View style={S.eventFormSection}>
            <Text style={S.formLabelHuman}>Descripción</Text>
            <TextInput
              style={[S.eventFormInput, S.textArea, S.eventFormInputFocus]}
              value={description}
              onChangeText={setDescription}
              placeholder="Notas adicionales del evento..."
              placeholderTextColor={colors.text.tertiary}
              multiline
            />
          </View>

          <View style={S.eventFormSection}>
            <Text style={S.formLabelHuman}>Fecha</Text>
            <TextInput
              style={[S.eventFormInput, S.eventFormInputFocus, validateDate(date) && dateTouched && { borderColor: colors.danger.base }]}
              value={date}
              onChangeText={setDate}
              onFocus={() => { if (error) setError(null); }}
              placeholder="2024-06-15"
              placeholderTextColor={colors.text.tertiary}
            />
            {validateDate(date) && dateTouched ? (
              <Text style={S.formErrorInline}>{validateDate(date)}</Text>
            ) : (
              <Text style={S.formHelperText}>{getDateLabel(date) || 'Usá el formato AAAA-MM-DD.'}</Text>
            )}
          </View>

          <View style={S.allDayCompactCard}>
            <Text style={S.allDayLabel}>Todo el día</Text>
            <Switch value={allDay} onValueChange={setAllDay} />
          </View>

          {!allDay ? (
            <View style={S.eventFormSection}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.formLabelHuman}>Hora de inicio</Text>
                  <TextInput
                    style={[S.eventFormInput, S.eventFormInputFocus, validateTime(startTime) && startTimeTouched && { borderColor: colors.danger.base }]}
                    value={startTime}
                    onChangeText={setStartTime}
                    onFocus={() => { if (error) setError(null); }}
                    placeholder="09:00"
                    placeholderTextColor={colors.text.tertiary}
                  />
                  {validateTime(startTime) && startTimeTouched ? (
                    <Text style={S.formErrorInline}>{validateTime(startTime)}</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.formLabelHuman}>Hora de fin</Text>
                  <TextInput
                    style={[S.eventFormInput, S.eventFormInputFocus, validateTime(endTime) && endTimeTouched && { borderColor: colors.danger.base }]}
                    value={endTime}
                    onChangeText={setEndTime}
                    onFocus={() => { if (error) setError(null); }}
                    placeholder="18:30"
                    placeholderTextColor={colors.text.tertiary}
                  />
                  {validateTime(endTime) && endTimeTouched ? (
                    <Text style={S.formErrorInline}>{validateTime(endTime)}</Text>
                  ) : null}
                </View>
              </View>
              {validateEndTime(startTime, endTime) && (startTimeTouched || endTimeTouched) ? (
                <Text style={S.formErrorInline}>{validateEndTime(startTime, endTime)}</Text>
              ) : (
                <Text style={S.formHelperText}>Usá formato 24hs, ej. 14:30.</Text>
              )}
            </View>
          ) : null}

          <View style={S.eventFormSection}>
            <Text style={S.formLabelHuman}>Lugar</Text>
            <TextInput
              style={[S.eventFormInput, S.eventFormInputFocus]}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Ej. Sanatorio Güemes, Casa de María..."
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

        <View style={S.eventFormSection}>
            <Text style={S.formLabelHuman}>Repetición</Text>
            <View style={[S.row, { marginBottom: 0 }]}>
              {recurrenceOptions.map((item) => {
                const active = recurrence === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[S.eventFormChip, active && S.eventFormChipActive]}
                    onPress={() => setRecurrence(item)}
                  >
                    <Text style={[S.eventFormChipText, active && S.eventFormChipTextActive]}>
                      {recurrenceLabels[item]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        <TouchableOpacity
          style={[S.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={() => void submit()}
          disabled={saving || loading || authLoading || !isFormReadyForSubmit}
        >
          <Text style={S.btnText}>
            {saving
              ? mode === 'edit'
                ? 'Guardando...'
                : 'Creando evento...'
              : mode === 'edit'
              ? 'Guardar cambios'
              : 'Crear evento'}
          </Text>
        </TouchableOpacity>

        {mode === 'edit' ? (
          <TouchableOpacity
            style={[S.dangerBtn, { marginTop: 12 }, saving && { opacity: 0.6 }]}
            onPress={cancelEvent}
            disabled={saving}
          >
            <Text style={S.dangerText}>Cancelar evento</Text>
          </TouchableOpacity>
        ) : null}
      </KeyboardAwareScrollView>
    </Pressable>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {content}
    </SafeAreaView>
  );
}
