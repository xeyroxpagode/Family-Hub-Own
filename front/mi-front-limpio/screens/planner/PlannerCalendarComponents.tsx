import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { plannerStyles as S, getTypeDotColor, getTypeLabel, formatDate, formatTime, priorityLabelsWithLegacy, statusLabels, eventStatusLabels } from './plannerShared';
import { colors } from '../../constants/theme';

type CalendarDayCellProps = {
  day: Date | null;
  dateKey: string;
  selected: boolean;
  isToday: boolean;
  hasEvent: boolean;
  hasTask: boolean;
  count?: number;
  onPress?: () => void;
};

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  dateKey,
  selected,
  isToday,
  hasEvent,
  hasTask,
  count = 0,
  onPress,
}) => {
  if (!day) {
    return <View style={[S.monthDay, { opacity: 0 }]} />;
  }

  const dayText = day.getDate();
  const badge = count <= 0 ? '' : count > 9 ? '9+' : String(count);

  return (
      <TouchableOpacity
        style={[
          S.calendarMonthDay,
          selected ? S.calendarMonthDaySelected : {},
          isToday && !selected ? S.calendarMonthDayToday : {},
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            S.calendarMonthDayText,
            selected ? S.calendarMonthDayTextSelected : {},
            isToday && !selected ? S.calendarMonthDayTextToday : {},
            isToday && selected ? S.calendarMonthDayTextTodaySelected : {},
          ]}
        >
          {dayText}
        </Text>
        {badge ? (
          <View style={[S.calendarCountBadge, selected && S.calendarCountBadgeSelected]}>
            <Text style={[S.calendarCountBadgeText, selected && S.calendarCountBadgeTextSelected]}>{badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
  );
};

type WeekDayCellProps = {
  date: Date;
  dateKey: string;
  dayLabel: string;
  dayNumber: number;
  selected: boolean;
  isToday: boolean;
  hasEvent: boolean;
  hasTask: boolean;
  count?: number;
  onPress?: () => void;
};

export const WeekDayCell: React.FC<WeekDayCellProps> = ({
  dayLabel,
  dayNumber,
  selected,
  isToday,
  hasEvent,
  hasTask,
  count = 0,
  onPress,
}) => {
  const badge = count <= 0 ? '' : count > 9 ? '9+' : String(count);

  return (
      <TouchableOpacity
        style={[
          S.weekDayCell,
          selected ? S.weekDayCellSelected : {},
          isToday && !selected ? S.weekDayCellToday : {},
        ]}
        onPress={onPress}
      >
        <Text style={[S.weekDayCellLabel, selected && { color: colors.text.inverse }]}>{dayLabel}</Text>
        <Text style={[S.weekDayCellNumber, selected && S.weekDayCellNumberSelected]}>{dayNumber}</Text>
        {badge ? (
          <View style={[S.calendarCountBadge, selected && S.calendarCountBadgeSelected, { marginTop: 3 }]}>
            <Text style={[S.calendarCountBadgeText, selected && S.calendarCountBadgeTextSelected]}>{badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
  );
};

type AgendaItemCardProps = {
  item: any;
  isSaving: boolean;
  onShowToast?: (message: string) => void;
  onEditEvent: (item: any) => void;
  onCancelEvent: (eventId: string, version?: number) => void;
  onReactivateEvent: (eventId: string, version?: number) => void;
  onTrashEvent: (eventId: string, version?: number) => void;
  onEditTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onCancelTask: (taskId: string, version?: number) => void;
  onReactivateTask: (taskId: string, version?: number) => void;
  onTrashTask: (item: any) => void;
};

const formatTimeShort = (value?: string | null) => {
  if (!value) return '';
  if (value.includes('T')) {
    return new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return value.slice(0, 5);
};

export const AgendaItemCard: React.FC<AgendaItemCardProps> = ({
  item,
  isSaving,
  onShowToast,
  onEditEvent,
  onCancelEvent,
  onReactivateEvent,
  onTrashEvent,
  onEditTask,
  onCompleteTask,
  onCancelTask,
  onReactivateTask,
  onTrashTask,
}) => {
  if (item.type === 'event') {
    const isEventCancelled = item.status === 'cancelled';

    return (
      <View style={[S.calendarAgendaCard, S.calendarAgendaCardEvent, isEventCancelled && S.calendarAgendaCardEventCancelled]}>
        <View style={S.calendarAgendaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={S.calendarAgendaTitle}>{item.title}</Text>
            <Text style={S.calendarAgendaMeta}>
              {item.all_day ? 'Todo el día' : `${formatTimeShort(item.starts_at)} - ${item.ends_at ? formatTimeShort(item.ends_at) : ''}`}
            </Text>
            {item.location_name ? (
              <Text style={S.calendarAgendaLocation}>{item.location_name}</Text>
            ) : null}
          </View>
          <View style={[S.calendarAgendaBadge, isEventCancelled ? S.calendarAgendaBadgeCancelled : S.calendarAgendaBadgeEvent]}>
            <Text style={[S.calendarAgendaBadgeText, isEventCancelled ? S.calendarAgendaBadgeTextCancelled : S.calendarAgendaBadgeTextEvent]}>
              {isEventCancelled ? eventStatusLabels.cancelled : 'Evento'}
            </Text>
          </View>
        </View>
        <View style={S.calendarAgendaActions}>
          {!isEventCancelled ? (
            <>
              <TouchableOpacity
                style={[S.secondaryBtn, { minHeight: 36, paddingVertical: 6 }]}
                onPress={() => onEditEvent(item)}
                disabled={isSaving}
              >
                <Text style={S.secondaryText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.dangerBtn, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
                onPress={() => onCancelEvent(item.id, item.version)}
                disabled={isSaving}
              >
                <Text style={S.dangerText}>Cancelar evento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.dangerBtn, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
                onPress={() => onTrashEvent(item.id, item.version)}
                disabled={isSaving}
              >
                <Text style={S.dangerText}>Papelera</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[S.taskPrimaryAction, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
                onPress={() => onReactivateEvent(item.id, item.version)}
                disabled={isSaving}
              >
                <Text style={S.taskPrimaryActionText}>Reactivar evento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.dangerBtn, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
                onPress={() => onTrashEvent(item.id, item.version)}
                disabled={isSaving}
              >
                <Text style={S.dangerText}>Papelera</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const isCompleted = item.status === 'completed' || item.status === 'verified';
  const isPending = item.status === 'pending';
  const isAwaiting = item.status === 'awaiting_verification';
  const isCancelled = item.status === 'cancelled';
  const isHighPriority = item.priority === 'high';

  const typeLabel = getTypeLabel(item.template_key, item.category);
  const typeDotColor = getTypeDotColor(item.template_key);
  const priorityLabel = priorityLabelsWithLegacy[item.priority] ?? 'Normal';
  const statusLabel = isCancelled
    ? statusLabels.cancelled
    : item.status === 'awaiting_verification' ? statusLabels.awaiting_verification
    : item.status === 'completed' ? statusLabels.completed
    : item.status === 'verified' ? statusLabels.verified
    : statusLabels.pending;
  const ownerLabel = item.assigned_member?.display_name || null;

  const openMenu = () => {
    const actions: Array<{ text: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void }> = [];

    if (isCancelled) {
      actions.push({
        text: 'Reactivar tarea',
        onPress: () => onReactivateTask(item.id, item.version),
      });
    } else {
      if (isPending) {
        actions.push({ text: 'Completar', onPress: () => onCompleteTask(item.id) });
      }
      if (isAwaiting) {
        actions.push({ text: 'Verificar', onPress: () => onCompleteTask(item.id) });
      }
      actions.push({ text: 'Editar', onPress: () => onEditTask(item.id) });
      actions.push({
        text: 'Cancelar tarea',
        style: 'destructive' as const,
        onPress: () => onCancelTask(item.id, item.version),
      });
    }

    actions.push({
      text: 'Mover a la papelera',
      style: 'destructive' as const,
      onPress: () => onTrashTask(item),
    });

    actions.push({ text: 'Cerrar', style: 'cancel' as const });
    Alert.alert('Opciones de tarea', item.title, actions);
  };

  return (
    <View
      style={[
        S.calendarAgendaCard,
        S.calendarAgendaCardTask,
        isHighPriority ? S.calendarAgendaCardTaskHigh : {},
        isCancelled ? S.calendarAgendaCardTaskCancelled : {},
      ]}
    >
      <TouchableOpacity onPress={() => onEditTask(item.id)} onLongPress={openMenu} disabled={isSaving}>
        <View style={S.calendarAgendaHeader}>
          <View style={[S.taskTypeDot, { width: 28, height: 28, borderRadius: 14, marginRight: 0, backgroundColor: typeDotColor }]}>
            <Text style={[S.taskTypeDotIcon, { fontSize: 14 }]}>📝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.calendarAgendaTitle}>{item.title}</Text>
            <Text style={S.calendarAgendaMeta}>
              {item.due_time ? formatTime(item.due_time) : ''} · {formatDate(item.due_date)} · {typeLabel}
            </Text>
            {ownerLabel ? (
              <Text style={[S.calendarAgendaMeta, { marginTop: 2 }]}>{ownerLabel}</Text>
            ) : null}
            <Text style={[S.calendarAgendaMeta, { marginTop: 2 }]}>{statusLabel}</Text>
          </View>
          <TouchableOpacity onPress={openMenu} style={[S.taskOverflowBtn, { width: 28, height: 28, borderRadius: 14 }]} disabled={isSaving}>
            <Text style={[S.taskOverflowBtnText, { fontSize: 16 }]}>⋮</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};
