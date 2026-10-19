import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { PlannerAnchoredMenu, type PlannerAnchoredMenuItem } from '../../components/planner/PlannerAnchoredMenu';
import { ActionSheet, AppButton, AppInput, AppScreen, AppText, ErrorState, FilterChip, FormActionRow, InteractivePressable, Skeleton, Toggle } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { enqueuePlannerTaskTrash } from '../../services/planner/reliability';
import {
  changeResponsibilityLifecycle,
  getResponsibility,
  replaceResponsibilityCurrentAssignee,
  responsibilityScheduleSummary,
  updateResponsibility,
  type PlannerResponsibility,
  type ResponsibilityAssignmentKind,
  type ResponsibilityScheduleKind,
} from '../../services/plannerResponsibilities';
import { getTaskById } from '../../services/plannerTasks';
import { dateToYMD } from './plannerShared';

type Draft = {
  title: string;
  note: string;
  who: ResponsibilityAssignmentKind;
  memberIds: string[];
  kind: ResponsibilityScheduleKind;
  interval: string;
  unit: 'days' | 'weeks' | 'months';
  weekdays: number[];
  monthDay: string;
  time: string;
  verify: boolean;
};

const assignmentOptions: Array<{ key: Exclude<ResponsibilityAssignmentKind, 'unassigned'>; label: string; detail: string }> = [
  { key: 'fixed', label: 'Siempre la misma persona', detail: 'La tarea se asigna siempre a quienes elijas.' },
  { key: 'rotation', label: 'Por turnos', detail: 'La siguiente persona se elige automáticamente.' },
  { key: 'claimable', label: 'Cualquiera puede encargarse', detail: 'Una persona del hogar puede tomar cada tarea.' },
];
const scheduleOptions: Array<{ key: ResponsibilityScheduleKind; label: string }> = [
  { key: 'daily', label: 'Todos los días' }, { key: 'weekdays', label: 'Días de la semana' },
  { key: 'interval', label: 'Cada cierto tiempo' }, { key: 'monthly', label: 'Una vez al mes' },
  { key: 'after_completion', label: 'Después de completar' },
];
const week = [{ n: 1, l: 'L' }, { n: 2, l: 'M' }, { n: 3, l: 'X' }, { n: 4, l: 'J' }, { n: 5, l: 'V' }, { n: 6, l: 'S' }, { n: 0, l: 'D' }];

const draftFrom = (item: PlannerResponsibility): Draft => ({
  title: item.title,
  note: item.description ?? '',
  who: item.assignment_kind === 'unassigned' ? 'claimable' : item.assignment_kind,
  memberIds: item.members.map((entry) => entry.member_id),
  kind: item.schedule_kind,
  interval: String(item.schedule_interval || 1),
  unit: item.schedule_unit ?? 'days',
  weekdays: item.weekdays,
  monthDay: String(item.month_day ?? 1),
  time: item.due_time?.slice(0, 5) ?? '',
  verify: Boolean(item.task_defaults.requires_verification),
});
const sameDraft = (a: Draft, b: Draft) => JSON.stringify({ ...a, memberIds: [...a.memberIds].sort(), weekdays: [...a.weekdays].sort() }) === JSON.stringify({ ...b, memberIds: [...b.memberIds].sort(), weekdays: [...b.weekdays].sort() });

export function ResponsibilityDetailScreen() {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params.responsibilityId;
  const { session } = useAuth();
  const { members } = useHousehold();
  const token = session?.access_token;
  const menuAnchorRef = useRef<View>(null);
  const [item, setItem] = useState<PlannerResponsibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [replacement, setReplacement] = useState(false);
  const [whoSheet, setWhoSheet] = useState(false);
  const [scheduleSheet, setScheduleSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(Boolean(route.params?.editMode));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openingDraft, setOpeningDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const next = (await getResponsibility(token, id)).responsibility;
      setItem(next);
      if (!draft || !editing) {
        const nextDraft = draftFrom(next);
        setDraft(nextDraft);
        setOpeningDraft(nextDraft);
      }
    } catch {
      setError('No pudimos cargar la responsabilidad.');
    }
  }, [draft, editing, id, token]);
  useEffect(() => { void load(); }, [id, token]);
  useFocusEffect(useCallback(() => () => setMenu(false), []));

  const dirty = Boolean(draft && openingDraft && !sameDraft(draft, openingDraft));
  const closeEdit = useCallback(() => {
    if (dirty) {
      Alert.alert('¿Descartar cambios?', 'Los cambios que hiciste no se guardarán.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => { if (item) setDraft(draftFrom(item)); setEditing(false); } },
      ]);
      return;
    }
    setEditing(false);
  }, [dirty, item]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!editing) return false;
      closeEdit();
      return true;
    });
    return () => subscription.remove();
  }, [closeEdit, editing]));

  const names = item?.members.map((entry) => members.find((member) => member.id === entry.member_id)?.user?.nombre || 'Miembro') ?? [];
  const who = item?.assignment_kind === 'rotation' ? `Por turnos · ${names.join(', ')}` : item?.assignment_kind === 'claimable' || item?.assignment_kind === 'unassigned' ? 'Cualquiera puede encargarse' : names.join(', ');
  const act = async (action: 'pause' | 'resume' | 'trash' | 'restore') => {
    if (!token || !item || saving) return;
    setSaving(true);
    try {
      const next = (await changeResponsibilityLifecycle(token, item.id, action, item.version)).responsibility;
      setItem(next); setMenu(false);
    } catch { Alert.alert('No pudimos actualizar', 'Intentá de nuevo.'); }
    finally { setSaving(false); }
  };
  const pause = () => {
    if (!item?.current_occurrence) { void act('pause'); return; }
    Alert.alert('Pausar responsabilidad', '¿Qué querés hacer con la tarea actual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Conservar tarea y pausar', onPress: () => void act('pause') },
      { text: 'Mover tarea a Papelera y pausar', style: 'destructive', onPress: async () => {
        if (!token || !item.current_occurrence || saving) return;
        setSaving(true);
        try {
          const { task } = await getTaskById(token, item.current_occurrence.task_id);
          await enqueuePlannerTaskTrash(task.id, task.version);
          const next = (await changeResponsibilityLifecycle(token, item.id, 'pause', item.version)).responsibility;
          setItem(next); setMenu(false);
        } catch { Alert.alert('No pudimos pausar', 'La responsabilidad y su tarea no se modificaron por completo. Revisá su estado e intentá de nuevo.'); }
        finally { setSaving(false); }
      } },
    ]);
  };
  const replaceOnce = async (memberId: string) => {
    if (!token || !item?.current_occurrence || saving) return;
    setSaving(true);
    try {
      const { task } = await getTaskById(token, item.current_occurrence.task_id);
      await replaceResponsibilityCurrentAssignee(token, item.id, task.version, [memberId]);
      setReplacement(false); setMenu(false); await load();
    } catch { Alert.alert('No pudimos cambiar esta tarea', 'Intentá de nuevo.'); }
    finally { setSaving(false); }
  };
  const startEdit = () => {
    if (!item) return;
    const next = draftFrom(item);
    setDraft(next); setOpeningDraft(next); setEditing(true); setMenu(false);
    navigation.setParams({ ...route.params, editMode: false });
  };
  const save = async () => {
    if (!token || !item || !draft || saving || !dirty) { if (!dirty) setEditing(false); return; }
    if (!draft.title.trim()) { Alert.alert('Falta el título', 'Escribí qué responsabilidad querés organizar.'); return; }
    if (draft.who === 'fixed' && !draft.memberIds.length) { Alert.alert('Elegí una persona', 'Seleccioná quién se ocupa habitualmente.'); return; }
    if (draft.who === 'rotation' && draft.memberIds.length < 2) { Alert.alert('Faltan integrantes', 'La rotación necesita al menos dos personas.'); return; }
    setSaving(true);
    try {
      const response = await updateResponsibility(token, item.id, {
        title: draft.title.trim(), description: draft.note.trim(), assignmentKind: draft.who,
        memberIds: draft.who === 'claimable' ? [] : draft.memberIds,
        schedule: { kind: draft.kind, interval: Math.max(1, Number(draft.interval) || 1), unit: draft.kind === 'interval' || draft.kind === 'after_completion' ? draft.unit : null, weekdays: draft.kind === 'weekdays' ? draft.weekdays : [], monthDay: draft.kind === 'monthly' ? Math.max(1, Math.min(31, Number(draft.monthDay) || 1)) : null, anchorDate: item.anchor_date || dateToYMD(new Date()), time: draft.time || null },
        taskDefaults: { ...item.task_defaults, requires_verification: draft.verify },
      }, item.version);
      setItem(response.responsibility);
      const nextDraft = draftFrom(response.responsibility);
      setDraft(nextDraft); setOpeningDraft(nextDraft); setEditing(false);
    } catch { Alert.alert('No pudimos guardar', 'Conservamos tus cambios. Actualizá la responsabilidad y volvé a intentar.'); }
    finally { setSaving(false); }
  };

  if (error) return <AppScreen><ErrorState title="No pudimos cargar" description={error} onRetry={() => void load()} /></AppScreen>;
  if (!item || !draft) return <AppScreen><Skeleton variant="listItem" /><Skeleton variant="listItem" /></AppScreen>;

  const draftWho = draft.who === 'rotation' ? `Por turnos · ${draft.memberIds.length} personas` : draft.who === 'claimable' ? 'Cualquiera puede encargarse' : draft.memberIds.map((memberId) => members.find((member) => member.id === memberId)?.user?.nombre || 'Miembro').join(', ');
  const menuItems: PlannerAnchoredMenuItem[] = [
    { label: 'Editar', icon: 'create', onPress: startEdit },
    ...(item.current_occurrence ? [{ label: 'Cambiar responsable esta vez', icon: 'person', onPress: () => setReplacement(true) } satisfies PlannerAnchoredMenuItem] : []),
    item.lifecycle === 'active' ? { label: 'Pausar', icon: 'pause', onPress: pause } : { label: 'Reactivar', icon: 'play', onPress: () => void act('resume') },
    { label: 'Mover a Papelera', icon: 'trash', danger: true, separatorBefore: true, onPress: () => void act('trash') },
  ];

  return <AppScreen scroll keyboardAvoiding bottomInset="tab" contentContainerStyle={styles.screen}>
    <View style={styles.header}>
      <InteractivePressable style={styles.iconButton} onPress={() => editing ? closeEdit() : navigation.goBack()} accessibilityLabel="Volver"><HomePlusIcon name="chevron-back" size={24} color={colors.text.primary} /></InteractivePressable>
      <View style={{ flex: 1 }} />
      {!editing ? <View ref={menuAnchorRef} style={styles.iconButton}><InteractivePressable style={{ flex: 1, width: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setMenu(true)} accessibilityLabel="Opciones"><HomePlusIcon name="ellipsis-horizontal" size={24} color={colors.text.secondary} /></InteractivePressable></View> : null}
    </View>

    {editing ? <AppInput label="Título" value={draft.title} onChangeText={(title) => setDraft((current) => current && ({ ...current, title }))} /> : <View style={styles.titleBlock}><AppText variant="title2" weight="800" style={styles.title}>{item.title}</AppText><AppText variant="caption" tone="secondary">{item.lifecycle === 'active' ? 'Activa' : item.lifecycle === 'paused' ? 'Inactiva' : 'Papelera'}</AppText></View>}

    <Section title="CÓMO SE REPARTE">
      {editing ? <FormActionRow label="Reparto" value={draftWho} onPress={() => setWhoSheet(true)} /> : <PropertyRow label="Reparto" value={who} />}
    </Section>
    <Section title="CADA CUÁNDO">
      {editing ? <FormActionRow label="Frecuencia" value={scheduleOptions.find((option) => option.key === draft.kind)?.label ?? ''} onPress={() => setScheduleSheet(true)} /> : <PropertyRow label="Frecuencia" value={responsibilityScheduleSummary(item)} />}
    </Section>
    {editing ? <Section title="DETALLES"><AppInput label="Nota" value={draft.note} onChangeText={(note) => setDraft((current) => current && ({ ...current, note }))} variant="multiline" /><View style={styles.toggleRow}><View style={{ flex: 1 }}><AppText weight="700">Requiere revisión</AppText><AppText variant="caption" tone="secondary">Se aplica sólo a tareas futuras.</AppText></View><Toggle value={draft.verify} onValueChange={(verify) => setDraft((current) => current && ({ ...current, verify }))} accessibilityLabel="Requiere revisión" /></View></Section> : item.description ? <Section title="NOTA"><AppText tone="secondary">{item.description}</AppText></Section> : null}

    <Section title="PRÓXIMA TAREA">{item.requires_adjustment_reason ? <View style={styles.callout}><AppText weight="800">REQUIERE AJUSTE</AppText><AppText tone="secondary">{item.requires_adjustment_reason}</AppText></View> : item.current_occurrence ? <PropertyRow label="Fecha" value={item.current_occurrence.scheduled_date} /> : <AppText tone="secondary">Se creará cuando corresponda según la frecuencia.</AppText>}</Section>
    <Section title="TAREA ACTUAL">{item.current_occurrence ? <InteractivePressable style={styles.linkRow} onPress={() => navigation.navigate('TaskDetail', { entityId: item.current_occurrence?.task_id, source: 'planner', returnTo: 'previous' })} accessibilityLabel="Abrir tarea actual"><AppText style={{ flex: 1 }} weight="700">{item.title}</AppText><HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} /></InteractivePressable> : <AppText tone="secondary">No hay una tarea abierta.</AppText>}</Section>
    <Section title="HISTORIAL">{item.occurrences.filter((occurrence) => occurrence.resolved_at).length ? item.occurrences.filter((occurrence) => occurrence.resolved_at).slice(0, 5).map((occurrence) => <InteractivePressable key={occurrence.sequence} style={styles.linkRow} onPress={() => navigation.navigate('TaskDetail', { entityId: occurrence.task_id, source: 'planner', returnTo: 'previous' })}><View style={{ flex: 1 }}><AppText weight="700">{occurrence.scheduled_date}</AppText><AppText variant="caption" tone="secondary">{occurrence.resolution_status === 'verified' ? 'Verificada' : 'Completada'}</AppText></View><HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} /></InteractivePressable>) : <AppText tone="secondary">Todavía no hay tareas resueltas.</AppText>}</Section>

    {editing ? <View style={styles.footer}><AppButton title="Cancelar" variant="ghost" onPress={closeEdit} disabled={saving} style={{ flex: 1 }} /><AppButton title="Guardar cambios" onPress={() => void save()} loading={saving} disabled={!dirty} style={{ flex: 1 }} /></View> : <View style={styles.lifecycle}><AppButton title={item.lifecycle === 'active' ? 'Pausar' : 'Reactivar'} variant="secondary" onPress={item.lifecycle === 'active' ? pause : () => void act('resume')} loading={saving} /></View>}

    <PlannerAnchoredMenu visible={menu} anchorRef={menuAnchorRef} items={menuItems} onRequestClose={() => setMenu(false)} preferredSide="left" />
    <ActionSheet visible={replacement} title="Cambiar responsable esta vez" onRequestClose={() => setReplacement(false)} size="content"><View style={styles.chips}>{members.map((member) => <FilterChip key={member.id} label={member.user?.nombre || 'Miembro'} selected={false} disabled={saving} onPress={() => void replaceOnce(member.id)} />)}</View></ActionSheet>
    <ActionSheet visible={whoSheet} title="Cómo se reparte" onRequestClose={() => setWhoSheet(false)} size="content"><View style={styles.sheet}>{assignmentOptions.map((option) => <InteractivePressable key={option.key} style={styles.choice} onPress={() => setDraft((current) => current && ({ ...current, who: option.key }))}><HomePlusIcon name={draft.who === option.key ? 'radio-button-on' : 'radio-button-off'} size={21} color={draft.who === option.key ? colors.terracotta[600] : colors.text.tertiary} /><View style={{ flex: 1 }}><AppText weight="700">{option.label}</AppText><AppText variant="caption" tone="secondary">{option.detail}</AppText></View></InteractivePressable>)}{draft.who === 'fixed' || draft.who === 'rotation' ? <View style={styles.chips}>{members.map((member) => <FilterChip key={member.id} label={member.user?.nombre || 'Miembro'} selected={draft.memberIds.includes(member.id)} onPress={() => setDraft((current) => current && ({ ...current, memberIds: current.memberIds.includes(member.id) ? current.memberIds.filter((value) => value !== member.id) : [...current.memberIds, member.id] }))} />)}</View> : null}<AppButton title="Listo" onPress={() => setWhoSheet(false)} /></View></ActionSheet>
    <ActionSheet visible={scheduleSheet} title="Cada cuándo" onRequestClose={() => setScheduleSheet(false)} size="content"><View style={styles.sheet}><View style={styles.chips}>{scheduleOptions.map((option) => <FilterChip key={option.key} label={option.label} selected={draft.kind === option.key} onPress={() => setDraft((current) => current && ({ ...current, kind: option.key }))} />)}</View>{draft.kind === 'weekdays' ? <View style={styles.chips}>{week.map((day) => <FilterChip key={day.n} label={day.l} selected={draft.weekdays.includes(day.n)} onPress={() => setDraft((current) => current && ({ ...current, weekdays: current.weekdays.includes(day.n) ? current.weekdays.filter((value) => value !== day.n) : [...current.weekdays, day.n] }))} />)}</View> : null}{draft.kind !== 'daily' && draft.kind !== 'weekdays' ? <AppInput label={draft.kind === 'monthly' ? 'Día del mes' : 'Cada'} value={draft.kind === 'monthly' ? draft.monthDay : draft.interval} onChangeText={(value) => setDraft((current) => current && ({ ...current, ...(draft.kind === 'monthly' ? { monthDay: value } : { interval: value }) }))} keyboardType="number-pad" /> : null}{draft.kind === 'interval' || draft.kind === 'after_completion' ? <View style={styles.chips}>{(['days', 'weeks', 'months'] as const).map((unit) => <FilterChip key={unit} label={unit === 'days' ? 'días' : unit === 'weeks' ? 'semanas' : 'meses'} selected={draft.unit === unit} onPress={() => setDraft((current) => current && ({ ...current, unit }))} />)}</View> : null}<AppInput label="Hora" value={draft.time} onChangeText={(time) => setDraft((current) => current && ({ ...current, time }))} placeholder="Sin hora" /><AppButton title="Listo" onPress={() => setScheduleSheet(false)} /></View></ActionSheet>
  </AppScreen>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={stylesStatic.section}><AppText variant="caption" tone="secondary" weight="800" style={stylesStatic.sectionTitle}>{title}</AppText>{children}</View>; }
function PropertyRow({ label, value }: { label: string; value: string }) { return <View style={stylesStatic.propertyRow}><AppText variant="caption" tone="secondary" weight="500" style={stylesStatic.propertyLabel}>{label}</AppText><AppText weight="500" style={stylesStatic.propertyValue}>{value}</AppText></View>; }
const stylesStatic = StyleSheet.create({ section: { marginTop: 24 }, sectionTitle: { marginBottom: 8 }, propertyRow: { minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEE8E0' }, propertyLabel: { width: 96, marginRight: 12 }, propertyValue: { flex: 1, fontSize: 15 }, });
const makeStyles = ({ colors }: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  screen: { paddingHorizontal: 20, paddingTop: 8 }, header: { minHeight: 44, flexDirection: 'row', alignItems: 'center' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, titleBlock: { marginTop: 12, gap: 4 }, title: { fontSize: 22, lineHeight: 28 }, callout: { gap: 4, padding: 12, backgroundColor: colors.warning.soft, borderLeftWidth: 3, borderLeftColor: colors.warning.base }, linkRow: { minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }, toggleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, lifecycle: { marginTop: 24 }, footer: { marginTop: 24, flexDirection: 'row', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, paddingTop: 12, paddingBottom: 16 }, sheet: { gap: 16 }, choice: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
