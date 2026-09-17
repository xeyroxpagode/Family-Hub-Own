import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';

import { ActionSheet, AppButton, AppInput, AppText, EmptyState, ErrorState, FormActionRow, TimePickerSheet } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import {
  createHouseholdSchedule,
  deleteHouseholdSchedule,
  getSchedulePrivacy,
  listHouseholdSchedules,
  updateHouseholdSchedule,
  updateSchedulePrivacy,
  type HouseholdScheduleBlock,
  type ScheduleColorKey,
} from '../../services/plannerSchedules';
import { PlannerWeekNavigator } from './PlannerWeekNavigator';

const DAYS = [
  { key: 1, short: 'L', label: 'Lunes' }, { key: 2, short: 'M', label: 'Martes' }, { key: 3, short: 'X', label: 'Miercoles' },
  { key: 4, short: 'J', label: 'Jueves' }, { key: 5, short: 'V', label: 'Viernes' }, { key: 6, short: 'S', label: 'Sabado' }, { key: 0, short: 'D', label: 'Domingo' },
] as const;

const COLORS: Record<ScheduleColorKey, { fill: string; soft: string; label: string }> = {
  terracotta: { fill: colors.terracotta[500], soft: colors.terracotta[50], label: 'Terracota' },
  sage: { fill: colors.sage[500], soft: colors.sage[50], label: 'Verde' },
  blue: { fill: '#4B79A1', soft: '#EAF2F8', label: 'Azul' },
  gold: { fill: '#B88127', soft: '#FBF1DB', label: 'Dorado' },
};

type FormState = { title: string; start: string; end: string; days: number[]; note: string; color: ScheduleColorKey };
const emptyForm = (): FormState => ({ title: '', start: '08:00', end: '09:00', days: [1], note: '', color: 'terracotta' });
const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const timeToMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]); const mins = Number(match[2]);
  return hours >= 0 && hours < 24 && mins >= 0 && mins < 60 ? hours * 60 + mins : null;
};

export function PlannerSchedulesScreen({ refreshKey }: { refreshKey?: number }) {
  const { session, authMe } = useAuth();
  const { members } = useHousehold();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const ownPersonId = authMe?.person?.id ?? null;
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(ownPersonId);
  const [schedules, setSchedules] = useState<HouseholdScheduleBlock[]>([]);
  const [canView, setCanView] = useState(true);
  const [privacy, setPrivacy] = useState(true);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<HouseholdScheduleBlock | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => { if (ownPersonId && !selectedPersonId) setSelectedPersonId(ownPersonId); }, [ownPersonId, selectedPersonId]);
  const isOwnSchedule = selectedPersonId === ownPersonId;
  const selectedMember = members.find((member) => member.user_id === selectedPersonId) ?? null;

  const load = useCallback(async (silent = false) => {
    if (!accessToken || !selectedPersonId) return;
    if (!silent) setLoading(true);
    setError(null); setFeedback(null);
    try {
      const response = await listHouseholdSchedules(accessToken, selectedPersonId);
      setSchedules(response.schedules); setCanView(response.can_view);
      if (selectedPersonId === ownPersonId) {
        try { const ownPrivacy = await getSchedulePrivacy(accessToken); setPrivacy(ownPrivacy.is_visible_to_household); setPrivacyError(null); }
        catch (cause) { setPrivacyError(cause instanceof Error ? cause.message : 'No pudimos cargar la privacidad.'); }
      } else setPrivacyError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar los horarios.'); }
    finally { if (!silent) setLoading(false); }
  }, [accessToken, ownPersonId, selectedPersonId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { if (refreshKey != null) void load(true); }, [refreshKey, load]);
  const activeDay = selectedDate.getDay();
  const daySchedules = useMemo(() => schedules.filter((schedule) => schedule.days_of_week.includes(activeDay)).sort((a, b) => a.start_minutes - b.start_minutes), [activeDay, schedules]);
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm(), days: [activeDay] }); setEditorVisible(true); };
  const openEdit = (schedule: HouseholdScheduleBlock) => { if (!isOwnSchedule) return; setEditing(schedule); setForm({ title: schedule.title, start: minutesToTime(schedule.start_minutes), end: minutesToTime(schedule.end_minutes), days: schedule.days_of_week, note: schedule.note ?? '', color: schedule.color_key }); setEditorVisible(true); };

  const save = async () => {
    if (!accessToken) return;
    const start = timeToMinutes(form.start); const end = timeToMinutes(form.end);
    if (!form.title.trim()) return Alert.alert('Falta titulo', 'Agrega un nombre para el horario.');
    if (start == null || end == null || end <= start) return Alert.alert('Horario invalido', 'Selecciona una hora final posterior.');
    if (form.days.length === 0) return Alert.alert('Falta dia', 'Selecciona al menos un dia.');
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), start_minutes: start, end_minutes: end, days_of_week: form.days, note: form.note.trim() || null, color_key: form.color };
      if (editing) await updateHouseholdSchedule(accessToken, editing.id, payload); else await createHouseholdSchedule(accessToken, payload);
      markPlannerChanged();
      setEditorVisible(false); await load(true); setFeedback(editing ? 'Horario actualizado.' : 'Horario creado.');
    } catch (cause) { Alert.alert('No pudimos guardar', cause instanceof Error ? cause.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  };

  const remove = () => {
    if (!accessToken || !editing) return;
    Alert.alert('Eliminar horario', `Eliminar ${editing.title}?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => {
      try { await deleteHouseholdSchedule(accessToken, editing.id); markPlannerChanged(); setEditorVisible(false); await load(true); setFeedback('Horario eliminado.'); }
      catch (cause) { Alert.alert('No pudimos eliminar', cause instanceof Error ? cause.message : 'Intenta nuevamente.'); }
    } }]);
  };
  const changePrivacy = async (value: boolean) => { if (!accessToken) return; setPrivacy(value); try { await updateSchedulePrivacy(accessToken, value); markPlannerChanged(); } catch (cause) { setPrivacy(!value); Alert.alert('No pudimos actualizar', cause instanceof Error ? cause.message : 'Intenta nuevamente.'); } };

  return <View style={styles.screen}>
    <View style={styles.header}><View><AppText variant="title2">Horarios</AppText><AppText variant="caption" tone="secondary">Rutinas semanales del hogar</AppText></View>{isOwnSchedule ? <AppButton variant="icon" onPress={openCreate} accessibilityLabel="Crear horario"><HomePlusIcon name="add" size={22} color={colors.terracotta[600]} /></AppButton> : null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.members}>{members.map((member) => { const active = member.user_id === selectedPersonId; const name = member.user?.nombre ?? 'Integrante'; const initials = name.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(); return <TouchableOpacity key={member.id} onPress={() => setSelectedPersonId(member.user_id)} style={[styles.memberChip, active && styles.memberChipActive]} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Ver horarios de ${name}`}><View style={[styles.avatar, active && styles.avatarActive]}><AppText variant="micro" weight="800" tone={active ? 'inverse' : 'secondary'}>{initials}</AppText></View><AppText variant="caption" weight="700" tone={active ? 'inverse' : 'secondary'} numberOfLines={1}>{name}</AppText></TouchableOpacity>; })}</ScrollView>
    {isOwnSchedule ? <View style={styles.privacyRow}><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="700">Compartir mis horarios</AppText><AppText variant="caption" tone="secondary">{privacyError ?? 'Otros integrantes pueden ver tus bloques.'}</AppText></View>{privacyError ? <AppButton title="Reintentar" variant="ghost" onPress={() => void load(true)} /> : <Switch value={privacy} onValueChange={changePrivacy} trackColor={{ false: colors.border.default, true: colors.terracotta[400] }} thumbColor={colors.background.base} accessibilityLabel="Permitir que otros integrantes vean mis horarios" />}</View> : null}
    <PlannerWeekNavigator selectedDate={selectedDate} onSelectDate={setSelectedDate} showTodayLabel getDayIndicator={(date) => schedules.filter((schedule) => schedule.days_of_week.includes(date.getDay())).length} />
    {feedback ? <View style={styles.feedback}><HomePlusIcon name="checkmark-circle" size={18} color={colors.success.base} /><AppText variant="bodySmall" tone="success" weight="700">{feedback}</AppText></View> : null}
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.terracotta[500]} /></View> : error ? <ErrorState description={error} onRetry={() => void load()} /> : !canView ? <View style={styles.privateState}><HomePlusIcon name="lock-closed-outline" size={24} color={colors.text.tertiary} /><AppText variant="body" weight="700">Horarios privados</AppText><AppText variant="caption" tone="secondary" align="center">{selectedMember?.user?.nombre ?? 'Este integrante'} eligio no compartir sus horarios.</AppText></View> : daySchedules.length === 0 ? <EmptyState title="Sin horarios este dia" description={isOwnSchedule ? 'Agrega una rutina para verla en tu semana.' : 'No hay bloques cargados para este dia.'} actionLabel={isOwnSchedule ? 'Crear horario' : undefined} onAction={isOwnSchedule ? openCreate : undefined} style={styles.empty} /> : <View style={styles.timeline}>{daySchedules.map((schedule) => <TouchableOpacity key={schedule.id} onPress={() => openEdit(schedule)} disabled={!isOwnSchedule} style={[styles.block, { borderLeftColor: COLORS[schedule.color_key].fill, backgroundColor: COLORS[schedule.color_key].soft }]} accessibilityRole={isOwnSchedule ? 'button' : undefined} accessibilityLabel={`${schedule.title}, ${minutesToTime(schedule.start_minutes)} a ${minutesToTime(schedule.end_minutes)}`}><View style={styles.time}><AppText variant="caption" weight="800">{minutesToTime(schedule.start_minutes)}</AppText><AppText variant="caption" tone="tertiary">{minutesToTime(schedule.end_minutes)}</AppText></View><View style={{ flex: 1 }}><AppText variant="bodySmall" weight="800">{schedule.title}</AppText>{schedule.note ? <AppText variant="caption" tone="secondary">{schedule.note}</AppText> : null}</View>{isOwnSchedule ? <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} /> : null}</TouchableOpacity>)}</View>}
    <ActionSheet visible={editorVisible} title={editing ? 'Editar horario' : 'Nuevo horario'} subtitle="Se repite cada semana" onRequestClose={() => !saving && setEditorVisible(false)} closeDisabled={saving} footer={<View style={styles.actions}>{editing ? <AppButton variant="icon" onPress={remove} disabled={saving} accessibilityLabel="Eliminar horario"><HomePlusIcon name="trash-outline" size={20} color={colors.danger.base} /></AppButton> : <AppButton title="Cancelar" variant="ghost" onPress={() => setEditorVisible(false)} disabled={saving} style={{ flex: 1 }} />}<AppButton title={editing ? 'Guardar' : 'Crear'} onPress={() => void save()} loading={saving} style={{ flex: 1 }} /></View>}><View style={{ flex: 1, position: 'relative' }}><KeyboardAwareScrollView enableOnAndroid extraScrollHeight={32} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.form}><AppInput label="Titulo" value={form.title} onChangeText={(title) => setForm((previous) => ({ ...previous, title }))} placeholder="Universidad" /><View style={{ gap: spacing[2] }}><FormActionRow label="Desde" value={form.start} onPress={() => setActiveTimePicker('start')} /><FormActionRow label="Hasta" value={form.end} onPress={() => setActiveTimePicker('end')} /></View><AppText variant="caption" tone="secondary" weight="700">Dias</AppText><View style={styles.daySelector}>{DAYS.map((day) => { const selected = form.days.includes(day.key); return <TouchableOpacity key={day.key} onPress={() => setForm((previous) => ({ ...previous, days: selected ? previous.days.filter((key) => key !== day.key) : [...previous.days, day.key] }))} style={[styles.formDay, selected && styles.formDaySelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={day.label}><AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'}>{day.short}</AppText></TouchableOpacity>; })}</View><AppText variant="caption" tone="secondary" weight="700">Color</AppText><View style={styles.colors}>{(Object.keys(COLORS) as ScheduleColorKey[]).map((color) => <TouchableOpacity key={color} onPress={() => setForm((previous) => ({ ...previous, color }))} style={[styles.colorDot, { backgroundColor: COLORS[color].fill }, form.color === color && styles.colorDotSelected]} accessibilityRole="radio" accessibilityState={{ selected: form.color === color }} accessibilityLabel={COLORS[color].label} />)}</View><AppInput label="Nota (opcional)" value={form.note} onChangeText={(note) => setForm((previous) => ({ ...previous, note }))} placeholder="Aula, lugar o detalle" multiline /></KeyboardAwareScrollView><TimePickerSheet visible={activeTimePicker === 'start'} value={form.start} onClose={() => setActiveTimePicker(null)} onConfirm={(start) => { setForm((previous) => ({ ...previous, start })); setActiveTimePicker(null); }} /><TimePickerSheet visible={activeTimePicker === 'end'} value={form.end} onClose={() => setActiveTimePicker(null)} onConfirm={(end) => { setForm((previous) => ({ ...previous, end })); setActiveTimePicker(null); }} /></View></ActionSheet>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing[4], paddingBottom: spacing[5] }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, members: { gap: spacing[2], paddingRight: spacing[4] }, memberChip: { minHeight: 44, maxWidth: 124, paddingHorizontal: spacing[2], borderRadius: radius.pill, backgroundColor: colors.surface.soft, borderWidth: 1, borderColor: colors.border.subtle, flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, memberChipActive: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] }, avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.base }, avatarActive: { backgroundColor: 'rgba(255,255,255,0.2)' }, privacyRow: { minHeight: 64, padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface.soft, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, feedback: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.success.soft }, state: { minHeight: 160, alignItems: 'center', justifyContent: 'center' }, empty: { marginTop: spacing[2] }, privateState: { minHeight: 176, padding: spacing[5], justifyContent: 'center', alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface.soft, borderRadius: radius.lg }, timeline: { gap: spacing[2] }, block: { minHeight: 76, borderLeftWidth: 4, borderRadius: radius.md, padding: spacing[3], flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, time: { width: 44, gap: spacing[1] }, form: { paddingBottom: spacing[5], gap: spacing[3] }, daySelector: { flexDirection: 'row', gap: spacing[2] }, formDay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.soft }, formDaySelected: { backgroundColor: colors.terracotta[500] }, colors: { flexDirection: 'row', gap: spacing[3] }, colorDot: { width: 32, height: 32, borderRadius: 16 }, colorDotSelected: { borderWidth: 3, borderColor: colors.text.primary }, actions: { flexDirection: 'row', gap: spacing[3] },
});
