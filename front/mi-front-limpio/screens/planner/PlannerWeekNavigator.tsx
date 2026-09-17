import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AppText, InteractivePressable } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { addDays, dateToYMD, getWeekDays } from './plannerShared';

type Props = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getDayIndicator?: (date: Date) => number;
  showTodayLabel?: boolean;
};

const formatDayMonth = (date: Date) => date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }).toUpperCase();

const formatWeekRange = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${start.getDate()} - ${formatDayMonth(end)}`;
  return `${formatDayMonth(start)} - ${formatDayMonth(end)}`;
};

export function PlannerWeekNavigator({ selectedDate, onSelectDate, getDayIndicator, showTodayLabel = false }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const todayKey = dateToYMD(new Date());

  const changeWeek = (offset: number) => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.58, duration: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    onSelectDate(addDays(selectedDate, offset));
  };

  return (
    <View style={styles.shell}>
      {showTodayLabel ? <View style={styles.today}><AppText variant="bodySmall" weight="800">Hoy</AppText><AppText variant="caption" tone="secondary">{formatDayMonth(new Date())}</AppText></View> : null}
      <View style={styles.weekHeader}>
        <InteractivePressable style={styles.navButton} onPress={() => changeWeek(-7)} haptic="light" pressScale={motion.scale.icon} accessibilityRole="button" accessibilityLabel="Semana anterior"><HomePlusIcon name="chevron-back" size={20} color={colors.text.primary} /></InteractivePressable>
        <InteractivePressable style={styles.rangeButton} onPress={() => onSelectDate(new Date())} haptic="light" pressScale={motion.scale.card} accessibilityRole="button" accessibilityLabel="Volver a la semana actual"><AppText variant="bodySmall" weight="800" numberOfLines={1}>{formatWeekRange(weekDays[0].date, weekDays[6].date)}</AppText></InteractivePressable>
        <InteractivePressable style={styles.navButton} onPress={() => changeWeek(7)} haptic="light" pressScale={motion.scale.icon} accessibilityRole="button" accessibilityLabel="Semana siguiente"><HomePlusIcon name="chevron-forward" size={20} color={colors.text.primary} /></InteractivePressable>
      </View>
      <Animated.View style={[styles.dayRow, { opacity }]}>
        {weekDays.map((day) => {
          const dateKey = dateToYMD(day.date);
          const selected = dateKey === dateToYMD(selectedDate);
          const isToday = dateKey === todayKey;
          const count = getDayIndicator?.(day.date) ?? 0;
          const fullDate = day.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
          return <InteractivePressable key={dateKey} style={[styles.day, selected && styles.daySelected, isToday && !selected && styles.dayToday]} onPress={() => onSelectDate(day.date)} haptic="light" pressScale={motion.scale.card} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${fullDate}${selected ? ', seleccionado' : ''}${isToday ? ', hoy' : ''}${count ? `, ${count} elementos` : ''}`}><AppText variant="micro" weight="800" tone={selected ? 'inverse' : 'tertiary'} numberOfLines={1}>{day.dayLabel.slice(0, 3).toUpperCase()}</AppText><AppText variant="body" weight="800" tone={selected ? 'inverse' : 'primary'}>{day.dayNumber}</AppText><View style={[styles.indicator, count > 0 && (selected ? styles.indicatorSelected : styles.indicatorFilled)]} /></InteractivePressable>;
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing[2] },
  today: { gap: 1, paddingTop: spacing[1] },
  weekHeader: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.soft, borderRadius: radius.md, paddingHorizontal: spacing[1] },
  navButton: { width: touchTargets.normal, height: touchTargets.normal, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  rangeButton: { flex: 1, minWidth: 0, minHeight: touchTargets.normal, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[2], borderRadius: radius.md },
  dayRow: { flexDirection: 'row', gap: spacing[1] },
  day: { flex: 1, minWidth: 0, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: spacing[1], backgroundColor: colors.surface.soft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.subtle },
  daySelected: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  dayToday: { borderWidth: 2, borderColor: colors.terracotta[300] },
  indicator: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: 'transparent' },
  indicatorFilled: { backgroundColor: colors.terracotta[500] },
  indicatorSelected: { backgroundColor: colors.background.base },
});
