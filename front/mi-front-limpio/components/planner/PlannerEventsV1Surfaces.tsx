import React, { useMemo } from 'react';
import {
  Pressable,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, touchTargets } from '../../constants/theme';
import { describePlannerVisualState, type PlannerVisualStateKind } from '../../services/planner/plannerVisualStates';
import { getPlannerMotionSpec } from '../../services/planner/plannerMotion';
import type { PlannerFormState } from '../../services/planner/plannerFormState';
import type {
  EventAgendaGroup,
  EventAgendaProjection,
  EventFormModel,
  EventLocationViewModel,
  EventParticipantViewModel,
  EventRecurrencePresentation,
  EventViewModel,
} from '../../services/plannerEventsFrontend';
import type {
  EventV1Attendance,
  EventV1EditScope,
  EventV1Rsvp,
} from '../../services/plannerEventsV1';

type ButtonHandler = () => void;

export type EventsVisualStateProps = {
  readonly kind: PlannerVisualStateKind;
  readonly hasData?: boolean;
  readonly message?: string;
  readonly onRetry?: ButtonHandler;
  readonly reduceMotion?: boolean;
  readonly style?: StyleProp<ViewStyle>;
};

export function EventsVisualState({
  kind,
  hasData = false,
  message,
  onRetry,
  reduceMotion = false,
  style,
}: EventsVisualStateProps) {
  const descriptor = describePlannerVisualState(kind);
  const motion = getPlannerMotionSpec('state_transition', reduceMotion);
  const showInline = descriptor.preservesContent || hasData;
  const accessibilityRole = descriptor.role === 'status' ? 'text' : descriptor.role;

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLiveRegion={descriptor.liveRegion === 'none' ? undefined : descriptor.liveRegion}
      style={[
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: descriptor.role === 'alert' ? colors.warning.base : colors.border.subtle,
          backgroundColor: descriptor.role === 'alert' ? colors.warning.soft : colors.surface.soft,
          padding: spacing[4],
          gap: spacing[2],
          opacity: motion.durationMs === 0 ? 1 : 0.99,
        },
        !showInline ? { minHeight: 180, justifyContent: 'center', alignItems: 'center' } : null,
        style,
      ]}
    >
      <AppText variant="bodySmall" tone={descriptor.role === 'alert' ? 'warning' : 'secondary'} weight="700">
        {message ?? descriptor.message}
      </AppText>
      {descriptor.canRetry && onRetry ? (
        <AppButton
          title="Reintentar"
          variant="ghost"
          size="sm"
          onPress={onRetry}
          accessibilityLabel="Reintentar carga de eventos"
        />
      ) : null}
    </View>
  );
}

export type EventAgendaRowProps = {
  readonly item: EventAgendaProjection;
  readonly onOpenDetail: (item: EventAgendaProjection) => void;
  readonly disabled?: boolean;
};

export function EventAgendaRow({ item, onOpenDetail, disabled = false }: EventAgendaRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.rowTime}. ${item.title}. ${item.secondaryText}`}
      accessibilityHint="Abre el detalle del evento"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onOpenDetail(item)}
      style={({ pressed }) => [
        eventStyles.row,
        item.exceptionText ? eventStyles.rowCancelled : null,
        pressed && !disabled ? eventStyles.pressed : null,
      ]}
    >
      <View style={eventStyles.rowTimeColumn}>
        <AppText variant="caption" tone={item.exceptionText ? 'tertiary' : 'primary'} weight="800">
          {item.rowTime}
        </AppText>
      </View>
      <View style={eventStyles.rowBody}>
        <AppText variant="body" tone="primary" weight="800">
          {item.title}
        </AppText>
        {item.secondaryText ? (
          <AppText variant="caption" tone="secondary">
            {item.secondaryText}
          </AppText>
        ) : null}
        {item.exceptionText ? (
          <AppText variant="caption" tone="warning" weight="700">
            {item.exceptionText}
          </AppText>
        ) : null}
      </View>
      <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

export type EventsAgendaProps = {
  readonly groups: readonly EventAgendaGroup[];
  readonly state?: PlannerVisualStateKind;
  readonly refreshing?: boolean;
  readonly stale?: boolean;
  readonly offline?: boolean;
  readonly partialError?: boolean;
  readonly onOpenDetail: (item: EventAgendaProjection) => void;
  readonly onRetry?: ButtonHandler;
  readonly reduceMotion?: boolean;
};

export function EventsAgenda({
  groups,
  state,
  refreshing = false,
  stale = false,
  offline = false,
  partialError = false,
  onOpenDetail,
  onRetry,
  reduceMotion,
}: EventsAgendaProps) {
  const hasRows = groups.some((group) => group.items.length > 0);
  const visualKind = state
    ?? (!hasRows ? 'empty_dataset' : offline ? 'offline' : partialError ? 'partial_error' : stale ? 'stale' : refreshing ? 'refresh_visible' : null);

  if (!hasRows && visualKind === 'loading') {
    return <EventsVisualState kind="loading" onRetry={onRetry} reduceMotion={reduceMotion} />;
  }

  return (
    <View style={eventStyles.stack}>
      {visualKind ? (
        <EventsVisualState
          kind={visualKind}
          hasData={hasRows}
          onRetry={onRetry}
          reduceMotion={reduceMotion}
        />
      ) : null}
      {hasRows ? groups.map((group) => (
        <View key={group.key} style={eventStyles.group}>
          <AppText variant="caption" tone="tertiary" weight="800">
            {group.title}
          </AppText>
          <View style={eventStyles.stackSm}>
            {group.items.map((item) => (
              <EventAgendaRow
                key={`${item.id}:${item.occurrenceId}`}
                item={item}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </View>
        </View>
      )) : null}
    </View>
  );
}

export const EventsRoot = EventsAgenda;

export type EventLocationCardProps = {
  readonly location: EventLocationViewModel;
  readonly onOpenMaps?: ButtonHandler;
};

export function EventLocationCard({ location, onOpenMaps }: EventLocationCardProps) {
  const canOpenMaps = location.canOpenMaps && onOpenMaps;
  return (
    <View style={eventStyles.section} accessibilityLabel={`Ubicacion ${location.label}`}>
      <View style={eventStyles.sectionHeader}>
        <HomePlusIcon name="location-outline" size={18} color={colors.terracotta[600]} />
        <AppText variant="bodySmall" tone="primary" weight="800">
          Ubicacion
        </AppText>
      </View>
      <AppText variant="body" tone="primary" weight="700">
        {location.label}
      </AppText>
      {location.address ? (
        <AppText variant="caption" tone="secondary">
          {location.address}
        </AppText>
      ) : (
        <AppText variant="caption" tone="tertiary">
          {location.type === 'home' ? 'Sin direccion publicada.' : 'Sin direccion disponible.'}
        </AppText>
      )}
      {location.hasCoordinates ? (
        <AppText variant="caption" tone="tertiary">
          Coordenadas disponibles
        </AppText>
      ) : null}
      {canOpenMaps ? (
        <AppButton
          title="Abrir mapa"
          variant="secondary"
          size="sm"
          onPress={onOpenMaps}
          leftSlot={<HomePlusIcon name="map" size={16} color={colors.terracotta[600]} />}
        />
      ) : null}
    </View>
  );
}

export type EventParticipantsSectionProps = {
  readonly participants: readonly EventParticipantViewModel[];
  readonly loading?: boolean;
  readonly partialError?: boolean;
  readonly privacyLabel?: string;
  readonly onAddParticipant?: ButtonHandler;
};

export function EventParticipantsSection({
  participants,
  loading = false,
  partialError = false,
  privacyLabel,
  onAddParticipant,
}: EventParticipantsSectionProps) {
  return (
    <View style={eventStyles.section}>
      <View style={eventStyles.sectionHeader}>
        <HomePlusIcon name="people" size={18} color={colors.sage[600]} />
        <AppText variant="bodySmall" tone="primary" weight="800">
          Participantes
        </AppText>
      </View>
      {loading ? (
        <EventsVisualState kind="loading" hasData={participants.length > 0} />
      ) : null}
      {partialError ? (
        <EventsVisualState kind="partial_error" hasData={participants.length > 0} />
      ) : null}
      {participants.length === 0 && !loading ? (
        <AppText variant="caption" tone="tertiary">
          Sin participantes visibles.
        </AppText>
      ) : participants.map((participant) => (
        <View key={participant.id} style={eventStyles.participantRow}>
          <View style={eventStyles.avatar}>
            <AppText variant="caption" tone="inverse" weight="800">
              {participant.personId.slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" tone="primary" weight="700">
              Participante
            </AppText>
            <AppText variant="caption" tone="secondary">
              {participant.rsvpLabel} - {participant.attendanceLabel}
            </AppText>
          </View>
        </View>
      ))}
      {privacyLabel ? (
        <AppText variant="caption" tone="tertiary">
          {privacyLabel}
        </AppText>
      ) : null}
      {onAddParticipant ? (
        <AppButton title="Agregar participante" variant="ghost" size="sm" onPress={onAddParticipant} />
      ) : null}
    </View>
  );
}

const RSVP_OPTIONS: readonly EventV1Rsvp[] = ['pending', 'attending', 'declined', 'maybe'];
const ATTENDANCE_OPTIONS: readonly EventV1Attendance[] = ['not_recorded', 'present', 'absent', 'excused'];

export type EventRsvpControlProps = {
  readonly value: EventV1Rsvp;
  readonly available?: readonly EventV1Rsvp[];
  readonly pending?: boolean;
  readonly uncertain?: boolean;
  readonly conflict?: boolean;
  readonly onChange: (value: EventV1Rsvp) => void;
};

export function EventRsvpControl({
  value,
  available = RSVP_OPTIONS,
  pending = false,
  uncertain = false,
  conflict = false,
  onChange,
}: EventRsvpControlProps) {
  return (
    <SegmentedStatusControl
      title="RSVP"
      value={value}
      options={RSVP_OPTIONS}
      available={available}
      pending={pending}
      uncertain={uncertain}
      conflict={conflict}
      labels={RSVP_TEXT}
      onChange={onChange}
    />
  );
}

export type EventAttendanceControlProps = {
  readonly value: EventV1Attendance;
  readonly attendanceRequired: boolean;
  readonly available?: readonly EventV1Attendance[];
  readonly pending?: boolean;
  readonly uncertain?: boolean;
  readonly conflict?: boolean;
  readonly onChange: (value: EventV1Attendance) => void;
};

export function EventAttendanceControl({
  value,
  attendanceRequired,
  available = ATTENDANCE_OPTIONS,
  pending = false,
  uncertain = false,
  conflict = false,
  onChange,
}: EventAttendanceControlProps) {
  if (!attendanceRequired) return null;
  return (
    <SegmentedStatusControl
      title="Asistencia"
      value={value}
      options={ATTENDANCE_OPTIONS}
      available={available}
      pending={pending}
      uncertain={uncertain}
      conflict={conflict}
      labels={ATTENDANCE_TEXT}
      onChange={onChange}
    />
  );
}

export type EventRecurrenceSummaryProps = {
  readonly recurrence: EventRecurrencePresentation;
};

export function EventRecurrenceSummary({ recurrence }: EventRecurrenceSummaryProps) {
  return (
    <View style={eventStyles.section}>
      <View style={eventStyles.sectionHeader}>
        <HomePlusIcon name="repeat" size={18} color={colors.text.secondary} />
        <AppText variant="bodySmall" tone="primary" weight="800">
          Repeticion
        </AppText>
      </View>
      <AppText variant="body" tone="primary" weight="700">
        {recurrence.label}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {recurrence.occurrenceContext === 'single'
          ? 'Evento unico'
          : recurrence.occurrenceContext === 'occurrence'
          ? 'Ocurrencia de una serie'
          : 'Serie completa'}
      </AppText>
      {recurrence.warning ? (
        <AppText variant="caption" tone="warning">
          {recurrence.warning}
        </AppText>
      ) : null}
    </View>
  );
}

export type EventRecurrenceScopeSelectorProps = {
  readonly recurrence: EventRecurrencePresentation;
  readonly value: EventV1EditScope;
  readonly onChange: (scope: EventV1EditScope) => void;
};

export function EventRecurrenceScopeSelector({
  recurrence,
  value,
  onChange,
}: EventRecurrenceScopeSelectorProps) {
  return (
    <View
      style={eventStyles.section}
      accessibilityRole="radiogroup"
      accessibilityLabel="Alcance de recurrencia"
    >
      <AppText variant="bodySmall" tone="primary" weight="800">
        Alcance
      </AppText>
      <View style={eventStyles.segmentRow}>
        {recurrence.availableScopes.map((scope) => (
          <AppButton
            key={scope}
            title={scopeLabel(scope)}
            variant={value === scope ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onChange(scope)}
            accessibilityLabel={scopeAccessibleLabel(scope)}
            accessibilityState={{ selected: value === scope }}
          />
        ))}
      </View>
      {recurrence.availableScopes.includes('this_and_following') ? (
        <AppText variant="caption" tone="tertiary">
          Este y los siguientes divide la serie desde esta ocurrencia.
        </AppText>
      ) : null}
    </View>
  );
}

export type EventLifecycleActionsProps = {
  readonly event: EventViewModel;
  readonly selectedScope?: EventV1EditScope;
  readonly pending?: boolean;
  readonly onEdit?: ButtonHandler;
  readonly onCancel?: (scope: EventV1EditScope) => void;
  readonly onReactivate?: (scope: EventV1EditScope) => void;
  readonly onTrash?: (scope: EventV1EditScope) => void;
  readonly onRestore?: ButtonHandler;
  readonly onRequestConfirm?: (params: { readonly action: 'cancel' | 'reactivate' | 'trash' | 'restore'; readonly scope?: EventV1EditScope }) => void;
};

export function EventLifecycleActions({
  event,
  selectedScope,
  pending = false,
  onEdit,
  onCancel,
  onReactivate,
  onTrash,
  onRestore,
  onRequestConfirm,
}: EventLifecycleActionsProps) {
  const scope = selectedScope ?? event.recurrenceContext.defaultEditScope;
  const confirm = (action: 'cancel' | 'reactivate' | 'trash' | 'restore', handler?: ButtonHandler) => {
    if (!handler) return;
    if (onRequestConfirm) {
      onRequestConfirm({ action, scope: action === 'restore' ? undefined : scope });
      return;
    }
    handler();
  };

  return (
    <View style={eventStyles.section}>
      <View style={eventStyles.sectionHeader}>
        <HomePlusIcon name="options" size={18} color={colors.text.secondary} />
        <AppText variant="bodySmall" tone="primary" weight="800">
          Acciones
        </AppText>
      </View>
      {event.canEdit && onEdit ? (
        <AppButton title="Editar" variant="secondary" onPress={onEdit} disabled={pending} />
      ) : null}
      {event.canCancel && onCancel ? (
        <AppButton title="Cancelar evento" variant="danger" onPress={() => confirm('cancel', () => onCancel(scope))} disabled={pending} />
      ) : null}
      {event.canReactivate && onReactivate ? (
        <AppButton title="Reactivar evento" variant="secondary" onPress={() => confirm('reactivate', () => onReactivate(scope))} disabled={pending} />
      ) : null}
      {event.canTrash && onTrash ? (
        <AppButton title="Mover a papelera" variant="danger" onPress={() => confirm('trash', () => onTrash(scope))} disabled={pending} />
      ) : null}
      {event.canRestore && onRestore ? (
        <AppButton title="Restaurar" variant="secondary" onPress={() => confirm('restore', onRestore)} disabled={pending} />
      ) : null}
      {event.recurrenceContext.availableScopes.length > 1 ? (
        <AppText variant="caption" tone="tertiary">
          Las acciones de serie usan alcance: {scopeLabel(scope)}.
        </AppText>
      ) : null}
    </View>
  );
}

export type EventDetailProps = {
  readonly event: EventViewModel;
  readonly selectedScope?: EventV1EditScope;
  readonly participantLoading?: boolean;
  readonly participantPartialError?: boolean;
  readonly pendingRsvp?: boolean;
  readonly pendingAttendance?: boolean;
  readonly mutationState?: 'confirmed' | 'optimistic' | 'replay' | 'noop' | 'rollback' | 'uncertain' | 'conflict';
  readonly onEdit?: ButtonHandler;
  readonly onOpenMaps?: ButtonHandler;
  readonly onRsvpChange?: (value: EventV1Rsvp) => void;
  readonly onAttendanceChange?: (value: EventV1Attendance) => void;
  readonly onScopeChange?: (scope: EventV1EditScope) => void;
  readonly onCancel?: (scope: EventV1EditScope) => void;
  readonly onReactivate?: (scope: EventV1EditScope) => void;
  readonly onTrash?: (scope: EventV1EditScope) => void;
  readonly onRestore?: ButtonHandler;
  readonly onRequestConfirm?: EventLifecycleActionsProps['onRequestConfirm'];
};

export function EventDetail({
  event,
  selectedScope,
  participantLoading,
  participantPartialError,
  pendingRsvp,
  pendingAttendance,
  mutationState = 'confirmed',
  onEdit,
  onOpenMaps,
  onRsvpChange,
  onAttendanceChange,
  onScopeChange,
  onCancel,
  onReactivate,
  onTrash,
  onRestore,
  onRequestConfirm,
}: EventDetailProps) {
  const activeScope = selectedScope ?? event.recurrenceContext.defaultEditScope;
  const firstParticipant = event.participants[0] ?? null;

  return (
    <View style={eventStyles.stack}>
      {mutationState !== 'confirmed' ? (
        <EventsVisualState kind={mutationState === 'conflict' ? 'conflict' : mutationState === 'uncertain' ? 'pending_sync' : 'refresh_visible'} hasData />
      ) : null}
      <View style={[eventStyles.section, event.isCancelled ? eventStyles.cancelledSection : null]}>
        <View style={eventStyles.sectionHeader}>
          <HomePlusIcon name="calendar" size={18} color={colors.terracotta[600]} />
          <AppText variant="caption" tone={event.isCancelled ? 'warning' : 'secondary'} weight="800">
            {event.lifecycleLabel}
          </AppText>
        </View>
        <AppText variant="title2" tone="primary" weight="800" accessibilityRole="header">
          {event.title}
        </AppText>
        {event.description ? (
          <AppText variant="bodySmall" tone="secondary">
            {event.description}
          </AppText>
        ) : null}
        <AppText variant="bodySmall" tone="primary" weight="700">
          {event.timingLabel}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {event.scopeLabel}{event.timezone ? ` - ${event.timezone}` : ''}
        </AppText>
      </View>

      <EventLocationCard location={event.location} onOpenMaps={onOpenMaps} />
      <EventRecurrenceSummary recurrence={event.recurrenceContext} />
      {event.recurrenceContext.availableScopes.length > 1 && onScopeChange ? (
        <EventRecurrenceScopeSelector recurrence={event.recurrenceContext} value={activeScope} onChange={onScopeChange} />
      ) : null}
      <EventParticipantsSection
        participants={event.participants}
        loading={participantLoading}
        partialError={participantPartialError}
        privacyLabel={event.scope === 'personal' ? 'Evento personal privado.' : 'Visible segun permisos del hogar.'}
      />
      {firstParticipant && onRsvpChange ? (
        <EventRsvpControl
          value={firstParticipant.rsvp}
          pending={pendingRsvp}
          uncertain={mutationState === 'uncertain'}
          conflict={mutationState === 'conflict'}
          onChange={onRsvpChange}
        />
      ) : null}
      {firstParticipant && onAttendanceChange ? (
        <EventAttendanceControl
          value={firstParticipant.attendance}
          attendanceRequired={event.attendanceRequired}
          pending={pendingAttendance}
          uncertain={mutationState === 'uncertain'}
          conflict={mutationState === 'conflict'}
          onChange={onAttendanceChange}
        />
      ) : null}
      <EventLifecycleActions
        event={event}
        selectedScope={activeScope}
        onEdit={onEdit}
        onCancel={onCancel}
        onReactivate={onReactivate}
        onTrash={onTrash}
        onRestore={onRestore}
        onRequestConfirm={onRequestConfirm}
      />
    </View>
  );
}

export type EventFormProps = {
  readonly mode: 'create' | 'edit';
  readonly form: PlannerFormState<EventFormModel>;
  readonly errors: readonly string[];
  readonly recurrence?: EventRecurrencePresentation;
  readonly onChange: (next: EventFormModel) => void;
  readonly onSubmit: ButtonHandler;
  readonly onCancel?: ButtonHandler;
  readonly onRetry?: ButtonHandler;
};

export function EventForm({
  mode,
  form,
  errors,
  recurrence,
  onChange,
  onSubmit,
  onCancel,
  onRetry,
}: EventFormProps) {
  const value = form.value;
  const errorSet = useMemo(() => new Set(errors), [errors]);
  const canSubmit = form.canSubmit && errors.length === 0;
  const update = <K extends keyof EventFormModel>(key: K, next: EventFormModel[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <View style={eventStyles.stack}>
      {form.status === 'conflict' ? <EventsVisualState kind="conflict" hasData onRetry={onRetry} /> : null}
      {form.status === 'uncertain' || form.status === 'offline_pending' ? (
        <EventsVisualState kind="pending_sync" hasData onRetry={onRetry} />
      ) : null}
      {form.status === 'safe_error' ? <EventsVisualState kind="partial_error" hasData onRetry={onRetry} /> : null}

      <FormTextField
        label="Titulo"
        value={value.title}
        error={errorSet.has('title_required') ? 'Ingresa un titulo.' : null}
        onChangeText={(text) => update('title', text)}
      />
      <FormTextField
        label="Descripcion"
        value={value.description}
        multiline
        onChangeText={(text) => update('description', text)}
      />
      <View style={eventStyles.section}>
        <AppText variant="bodySmall" tone="primary" weight="800">
          Alcance
        </AppText>
        <View style={eventStyles.segmentRow}>
          <AppButton
            title="Personal"
            variant={value.scope === 'personal' ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => update('scope', 'personal')}
            accessibilityState={{ selected: value.scope === 'personal' }}
          />
          <AppButton
            title="Hogar"
            variant={value.scope === 'household' ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => update('scope', 'household')}
            accessibilityState={{ selected: value.scope === 'household' }}
          />
        </View>
        {errorSet.has('household_required') ? <InlineError text="Selecciona un hogar." /> : null}
      </View>
      <View style={eventStyles.section}>
        <View style={eventStyles.switchRow}>
          <AppText variant="bodySmall" tone="primary" weight="800">
            Todo el dia
          </AppText>
          <Switch
            value={value.allDay}
            onValueChange={(next) => update('allDay', next)}
            accessibilityLabel="Todo el dia"
          />
        </View>
        <View style={eventStyles.twoColumns}>
          <FormTextField label="Fecha inicio" value={value.startDate} error={errorSet.has('start_date_invalid') ? 'Fecha invalida.' : null} onChangeText={(text) => update('startDate', text)} />
          <FormTextField label="Fecha fin" value={value.endDate} error={errorSet.has('end_date_invalid') ? 'Fecha invalida.' : null} onChangeText={(text) => update('endDate', text)} />
        </View>
        {!value.allDay ? (
          <>
            <View style={eventStyles.twoColumns}>
              <FormTextField label="Hora inicio" value={value.startTime} error={errorSet.has('start_time_invalid') ? 'Hora invalida.' : null} onChangeText={(text) => update('startTime', text)} />
              <FormTextField label="Hora fin" value={value.endTime} error={errorSet.has('end_time_invalid') || errorSet.has('end_before_start') ? 'Revisa la hora de fin.' : null} onChangeText={(text) => update('endTime', text)} />
            </View>
            <FormTextField label="Timezone" value={value.timezone} error={errorSet.has('timezone_required') ? 'Timezone requerido.' : null} onChangeText={(text) => update('timezone', text)} />
          </>
        ) : null}
      </View>
      <View style={eventStyles.section}>
        <AppText variant="bodySmall" tone="primary" weight="800">
          Ubicacion
        </AppText>
        <View style={eventStyles.segmentRow}>
          <AppButton title="En casa" variant={value.locationType === 'home' ? 'primary' : 'secondary'} size="sm" onPress={() => update('locationType', 'home')} />
          <AppButton title="Otro lugar" variant={value.locationType === 'other' ? 'primary' : 'secondary'} size="sm" onPress={() => update('locationType', 'other')} />
        </View>
        {value.locationType === 'other' ? (
          <FormTextField label="Lugar" value={value.locationText} onChangeText={(text) => update('locationText', text)} />
        ) : null}
      </View>
      <View style={eventStyles.section}>
        <View style={eventStyles.switchRow}>
          <AppText variant="bodySmall" tone="primary" weight="800">
            Requiere asistencia
          </AppText>
          <Switch
            value={value.attendanceRequired}
            onValueChange={(next) => update('attendanceRequired', next)}
            accessibilityLabel="Requiere asistencia"
          />
        </View>
      </View>
      {recurrence ? <EventRecurrenceSummary recurrence={recurrence} /> : null}
      <View style={eventStyles.actionRow}>
        {onCancel ? <AppButton variant="icon" onPress={onCancel} accessibilityLabel="Cerrar formulario"><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton> : null}
        <AppButton
          title={form.status === 'submitting' ? 'Guardando' : mode === 'edit' ? 'Guardar cambios' : 'Crear evento'}
          loading={form.status === 'submitting'}
          disabled={!canSubmit}
          onPress={onSubmit}
          accessibilityLabel={mode === 'edit' ? 'Guardar cambios del evento' : 'Crear evento'}
        />
      </View>
    </View>
  );
}

function SegmentedStatusControl<TValue extends string>({
  title,
  value,
  options,
  available,
  labels,
  pending,
  uncertain,
  conflict,
  onChange,
}: {
  readonly title: string;
  readonly value: TValue;
  readonly options: readonly TValue[];
  readonly available: readonly TValue[];
  readonly labels: Readonly<Record<TValue, string>>;
  readonly pending: boolean;
  readonly uncertain: boolean;
  readonly conflict: boolean;
  readonly onChange: (value: TValue) => void;
}) {
  const availableSet = new Set(available);
  return (
    <View
      style={[eventStyles.section, conflict ? eventStyles.conflictSection : null]}
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
    >
      <View style={eventStyles.sectionHeader}>
        <AppText variant="bodySmall" tone="primary" weight="800">
          {title}
        </AppText>
        {pending ? <AppText variant="caption" tone="tertiary">Pendiente</AppText> : null}
        {uncertain ? <AppText variant="caption" tone="warning">Incierto</AppText> : null}
        {conflict ? <AppText variant="caption" tone="warning">Conflicto</AppText> : null}
      </View>
      <View style={eventStyles.segmentRow}>
        {options.filter((option) => availableSet.has(option)).map((option) => (
          <AppButton
            key={option}
            title={labels[option]}
            variant={value === option ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onChange(option)}
            disabled={pending}
            accessibilityState={{ selected: value === option, disabled: pending }}
          />
        ))}
      </View>
    </View>
  );
}

function FormTextField({
  label,
  value,
  error,
  multiline = false,
  onChangeText,
}: {
  readonly label: string;
  readonly value: string;
  readonly error?: string | null;
  readonly multiline?: boolean;
  readonly onChangeText: (value: string) => void;
}) {
  return (
    <View style={eventStyles.field}>
      <AppText variant="caption" tone="secondary" weight="800">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        style={[eventStyles.input, multiline ? eventStyles.textArea : null, error ? eventStyles.inputError : null]}
        placeholderTextColor={colors.text.tertiary}
      />
      {error ? <InlineError text={error} /> : null}
    </View>
  );
}

function InlineError({ text }: { readonly text: string }) {
  return (
    <AppText variant="caption" tone="danger" accessibilityRole="alert">
      {text}
    </AppText>
  );
}

function scopeLabel(scope: EventV1EditScope): string {
  if (scope === 'this_occurrence') return 'Una ocurrencia';
  if (scope === 'this_and_following') return 'Este y siguientes';
  return 'Serie completa';
}

function scopeAccessibleLabel(scope: EventV1EditScope): string {
  if (scope === 'this_and_following') return 'Este y los siguientes, divide la serie';
  return scopeLabel(scope);
}

const RSVP_TEXT: Readonly<Record<EventV1Rsvp, string>> = {
  pending: 'Pendiente',
  attending: 'Asiste',
  declined: 'No asiste',
  maybe: 'Quizas',
};

const ATTENDANCE_TEXT: Readonly<Record<EventV1Attendance, string>> = {
  not_recorded: 'Sin registro',
  present: 'Presente',
  absent: 'Ausente',
  excused: 'Justificada',
};

const eventStyles = {
  stack: {
    gap: spacing[3],
  },
  stackSm: {
    gap: spacing[2],
  },
  group: {
    gap: spacing[2],
  },
  row: {
    minHeight: touchTargets.normal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[3],
  },
  rowCancelled: {
    backgroundColor: colors.surface.soft,
    borderColor: colors.warning.base,
  },
  rowTimeColumn: {
    width: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  pressed: {
    opacity: 0.86,
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[4],
    gap: spacing[2],
  },
  cancelledSection: {
    borderColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
  },
  conflictSection: {
    borderColor: colors.warning.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: touchTargets.normal,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage[500],
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  switchRow: {
    minHeight: touchTargets.normal,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  field: {
    gap: spacing[1],
    flex: 1,
  },
  input: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    color: colors.text.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  inputError: {
    borderColor: colors.danger.base,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
} as const;
