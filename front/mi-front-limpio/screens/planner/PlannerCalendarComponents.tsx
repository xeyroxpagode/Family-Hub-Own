import React, { useMemo } from 'react';
import { Alert, Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { plannerStyles as S, getTypeDotColor, getTypeLabel, formatDate, formatTime, priorityLabelsWithLegacy } from './plannerShared';
import { colors } from '../../constants/theme';

type CalendarDayCellProps = {
  day: Date | null;
  dateKey: string;
  selected: boolean;
  isToday: boolean;
  hasEvent: boolean;
  hasTask: boolean;
  onPress?: () => void;
};

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  dateKey,
  selected,
  isToday,
  hasEvent,
  hasTask,
  onPress,
}) => {
  const scale = useMemo(() => new Animated.Value(1), []);

  if (!day) {
    return <View style={[S.monthDay, { opacity: 0 }]} />;
  }

  const dayText = day.getDate();
  const both = hasEvent && hasTask;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
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
        {both ? (
          <View style={S.calendarIndicatorBoth}>
            <View style={[S.calendarIndicatorBothInner, { backgroundColor: colors.terracotta[500] }]} />
            <View style={[S.calendarIndicatorBothInner, { backgroundColor: colors.sage[500] }]} />
          </View>
        ) : hasEvent ? (
          <View style={[S.calendarIndicator, S.calendarIndicatorEvent]} />
        ) : hasTask ? (
          <View style={[S.calendarIndicator, S.calendarIndicatorTask]} />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
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
  onPress?: () => void;
};

export const WeekDayCell: React.FC<WeekDayCellProps> = ({
  dayLabel,
  dayNumber,
  selected,
  isToday,
  hasEvent,
  hasTask,
  onPress,
}) => {
  const scale = useMemo(() => new Animated.Value(1), []);

  const both = hasEvent && hasTask;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
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
        {both ? (
          <View style={[S.calendarIndicatorBoth, { marginTop: 3 }]}>
            <View style={[S.calendarIndicatorBothInner, { backgroundColor: colors.terracotta[400] }]} />
            <View style={[S.calendarIndicatorBothInner, { backgroundColor: colors.sage[400] }]} />
          </View>
        ) : hasEvent ? (
          <View style={[S.calendarIndicator, S.calendarIndicatorEvent, { marginTop: 3 }]} />
        ) : hasTask ? (
          <View style={[S.calendarIndicator, S.calendarIndicatorTask, { marginTop: 3 }]} />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

type AgendaItemCardProps = {
  item: any;
  isSaving: boolean;
  onShowToast?: (message: string) => void;
  onEditEvent: (item: any) => void;
  onCancelEvent: (eventId: string, version?: number) => void;
  onTrashEvent: (eventId: string, version?: number) => void;
  onEditTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
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
  onTrashEvent,
  onEditTask,
  onCompleteTask,
  onTrashTask,
}) => {
  if (item.type === 'event') {
    return (
      <View style={[S.calendarAgendaCard, S.calendarAgendaCardEvent]}>
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
          <View style={[S.calendarAgendaBadge, S.calendarAgendaBadgeEvent]}>
            <Text style={[S.calendarAgendaBadgeText, S.calendarAgendaBadgeTextEvent]}>Evento</Text>
          </View>
        </View>
        <View style={S.calendarAgendaActions}>
          <TouchableOpacity
            style={[S.secondaryBtn, { minHeight: 36, paddingVertical: 6 }]}
            onPress={() => onEditEvent(item)}
          >
            <Text style={S.secondaryText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.dangerBtn, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
            onPress={() => onCancelEvent(item.id, item.version)}
            disabled={isSaving}
          >
            <Text style={S.dangerText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.dangerBtn, { minHeight: 36, paddingVertical: 6 }, isSaving && { opacity: 0.6 }]}
            onPress={() => onTrashEvent(item.id, item.version)}
            disabled={isSaving}
          >
            <Text style={S.dangerText}>Papelera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCompleted = item.status === 'completed' || item.status === 'verified';
  const isPending = item.status === 'pending';
  const isAwaiting = item.status === 'awaiting_verification';
  const isHighPriority = item.priority === 'high';

  const typeLabel = getTypeLabel(item.template_key, item.category);
  const typeDotColor = getTypeDotColor(item.template_key);
  const priorityLabel = priorityLabelsWithLegacy[item.priority] ?? 'Normal';
  const statusLabel = item.status === 'awaiting_verification' ? 'Por verificar' : item.status === 'completed' ? 'Completada' : item.status === 'verified' ? 'Verificada' : 'Pendiente';
  const ownerLabel = item.assigned_member?.display_name || null;

  const openMenu = () => {
    const actions: Array<{ text: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void }> = [];
    if (isPending) {
      actions.push({ text: 'Completar', onPress: () => onCompleteTask(item.id) });
    }
    if (isAwaiting) {
      actions.push({ text: 'Verificar', onPress: () => onCompleteTask(item.id) });
    }
    actions.push({ text: 'Editar', onPress: () => onEditTask(item.id) });
    actions.push({
      text: 'Mover a la papelera',
      style: 'destructive' as const,
      onPress: () => onTrashTask(item),
    });
    actions.push({ text: 'Cancelar', style: 'cancel' as const });
    Alert.alert('Opciones de tarea', item.title, actions);
  };

  return (
    <View
      style={[
        S.calendarAgendaCard,
        S.calendarAgendaCardTask,
        isHighPriority ? S.calendarAgendaCardTaskHigh : {},
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
          </View>
          <TouchableOpacity onPress={openMenu} style={[S.taskOverflowBtn, { width: 28, height: 28, borderRadius: 14 }]} disabled={isSaving}>
            <Text style={[S.taskOverflowBtnText, { fontSize: 16 }]}>⋮</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};