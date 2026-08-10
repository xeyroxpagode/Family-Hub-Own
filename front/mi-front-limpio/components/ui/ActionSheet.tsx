import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, motion, radius, shadows, spacing, touchTargets } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { lightHaptic } from '../../utils/haptics';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

LocaleConfig.locales.es = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mie.', 'Jue.', 'Vie.', 'Sab.'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const WHEEL_ITEM_HEIGHT = 44;

export const formatHumanDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return 'Elegir fecha';
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === today.getTime()) return 'Hoy';
  if (date.getTime() === tomorrow.getTime()) return 'Manana';
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

type InlinePickerProps = { title: string; onClose: () => void; onConfirm: () => void; children: React.ReactNode };

function InlinePicker({ title, onClose, onConfirm, children }: InlinePickerProps) {
  return (
    <View style={styles.inlineOverlay} accessibilityViewIsModal>
      <View style={styles.inlinePanel}>
        <View style={styles.handle} />
        <View style={styles.inlineHeader}>
          <AppButton variant="icon" size="sm" onPress={onClose} accessibilityLabel={`Cerrar ${title}`}><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton>
          <AppText variant="title3" weight="800" style={styles.inlineTitle}>{title}</AppText>
          <AppButton title="Listo" size="sm" onPress={onConfirm} accessibilityLabel={`Confirmar ${title}`} />
        </View>
        <View style={styles.inlineContent}>{children}</View>
      </View>
    </View>
  );
}

export type ActionSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  closeDisabled?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ActionSheet({ visible, title, subtitle, onRequestClose, closeDisabled = false, children, footer }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.max(360, height - insets.top - spacing[3]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, spacing[4]) }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}><AppText variant="title2" weight="800">{title}</AppText>{subtitle ? <AppText variant="caption" tone="secondary">{subtitle}</AppText> : null}</View>
            <AppButton variant="icon" size="sm" onPress={onRequestClose} disabled={closeDisabled} accessibilityLabel={`Cerrar ${title}`}><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton>
          </View>
          <View style={styles.modalContent}>{children}</View>
          {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function FormActionRow({ label, value, onPress, accessibilityLabel, disabled }: { label: string; value: string; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) {
  return (
    <InteractivePressable style={styles.actionRow} onPress={() => { Keyboard.dismiss(); onPress(); }} disabled={disabled} haptic="light" pressScale={motion.scale.card} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}>
      <AppText variant="bodySmall" weight="700" style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={styles.actionRowValue}>{value}</AppText>
      <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
    </InteractivePressable>
  );
}

export function DatePickerSheet({ visible, value, onClose, onConfirm }: { visible: boolean; value: string; onClose: () => void; onConfirm: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);
  const markedDates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      [today]: { marked: true, dotColor: colors.terracotta[600] },
      [draft]: { selected: true, selectedColor: colors.terracotta[500], selectedTextColor: colors.text.inverse },
    };
  }, [draft]);
  if (!visible) return null;
  return <InlinePicker title="Seleccionar fecha" onClose={onClose} onConfirm={() => onConfirm(draft)}><Calendar current={draft} markedDates={markedDates} onDayPress={(day) => { setDraft(day.dateString); void lightHaptic(); }} enableSwipeMonths firstDay={1} theme={{ backgroundColor: colors.background.base, calendarBackground: colors.background.base, textSectionTitleColor: colors.text.tertiary, monthTextColor: colors.text.primary, arrowColor: colors.terracotta[600], dayTextColor: colors.text.primary, todayTextColor: colors.terracotta[700], textDisabledColor: colors.text.muted, textDayFontWeight: '600', textMonthFontWeight: '800', textDayHeaderFontWeight: '700' }} accessibilityLabel={`Calendario. Fecha seleccionada: ${formatHumanDate(draft)}`} /><AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[4] }}>{formatHumanDate(draft)}</AppText></InlinePicker>;
}

function WheelColumn({ values, selected, onSelect, accessibilityLabel }: { values: number[]; selected: number; onSelect: (value: number) => void; accessibilityLabel: string }) {
  const initialIndex = Math.max(0, values.indexOf(selected));
  return <View style={styles.wheelColumn}><FlatList data={values} keyExtractor={(item) => String(item)} getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })} initialScrollIndex={initialIndex} showsVerticalScrollIndicator={false} nestedScrollEnabled disableIntervalMomentum snapToInterval={WHEEL_ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={styles.wheelContent} accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: values[0], max: values[values.length - 1], now: selected, text: `${accessibilityLabel} ${String(selected).padStart(2, '0')}` }} onMomentumScrollEnd={(event) => { const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT); const next = values[Math.max(0, Math.min(index, values.length - 1))]; if (next !== selected) { onSelect(next); void lightHaptic(); } }} renderItem={({ item }) => <View style={styles.wheelItem}><AppText variant="title3" weight={item === selected ? '800' : '400'} tone={item === selected ? 'primary' : 'tertiary'}>{String(item).padStart(2, '0')}</AppText></View>} /></View>;
}

export function TimePickerSheet({ visible, value, onClose, onConfirm }: { visible: boolean; value: string; onClose: () => void; onConfirm: (value: string) => void }) {
  const [hours, minutes] = value.split(':').map(Number);
  const [draftHour, setDraftHour] = useState(Number.isInteger(hours) ? hours : 9);
  const [draftMinute, setDraftMinute] = useState(Number.isInteger(minutes) ? Math.round(minutes / 5) * 5 % 60 : 0);
  useEffect(() => {
    if (!visible) return;
    setDraftHour(Number.isInteger(hours) ? hours : 9);
    setDraftMinute(Number.isInteger(minutes) ? Math.round(minutes / 5) * 5 % 60 : 0);
  }, [hours, minutes, visible]);
  const hourValues = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minuteValues = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);
  if (!visible) return null;
  return <InlinePicker title="Seleccionar hora" onClose={onClose} onConfirm={() => onConfirm(`${String(draftHour).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`)}><View style={styles.wheelRow}><View style={styles.wheelFrame} pointerEvents="none" /><WheelColumn values={hourValues} selected={draftHour} onSelect={setDraftHour} accessibilityLabel="Hora" /><AppText variant="title2" weight="800">:</AppText><WheelColumn values={minuteValues} selected={draftMinute} onSelect={setDraftMinute} accessibilityLabel="Minutos" /></View><AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: spacing[4] }}>{`${String(draftHour).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`}</AppText></InlinePicker>;
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.surface.overlay },
  modalSheet: { backgroundColor: colors.background.base, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing[5], paddingTop: spacing[3], ...shadows.sheet },
  handle: { width: 44, height: 4, borderRadius: radius.pill, backgroundColor: colors.border.strong, alignSelf: 'center', marginBottom: spacing[3] },
  modalHeader: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] },
  modalContent: { flex: 1 }, modalFooter: { paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border.subtle },
  inlineOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'flex-end', backgroundColor: colors.background.base },
  inlinePanel: { flex: 1, paddingHorizontal: spacing[5], paddingTop: spacing[3] },
  inlineHeader: { minHeight: touchTargets.normal, flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[5] }, inlineTitle: { flex: 1, textAlign: 'center' }, inlineContent: { flex: 1, position: 'relative' },
  actionRow: { minHeight: 56, paddingHorizontal: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.soft, flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, actionRowValue: { maxWidth: '58%', textAlign: 'right' },
  wheelRow: { height: WHEEL_ITEM_HEIGHT * 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }, wheelFrame: { position: 'absolute', top: WHEEL_ITEM_HEIGHT * 2, left: 0, right: 0, height: WHEEL_ITEM_HEIGHT, zIndex: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.terracotta[300], backgroundColor: colors.terracotta[50] }, wheelColumn: { width: 92, height: WHEEL_ITEM_HEIGHT * 5 }, wheelContent: { paddingVertical: WHEEL_ITEM_HEIGHT * 2 }, wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
