import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { getHouseholdSchedules, upsertSchedule, deleteSchedule } from '../../services/schedules';
import type { Schedule, ScheduleInput } from '../../services/schedules';
import {
  getHouseholdEvents,
  createEvent,
  deleteEvent,
  type CalendarEvent,
} from '../../services/events';

const SCREEN_W = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Returns the 1st of `month` in `year`. */
function firstOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Returns a 5-or-6-row × 7-col grid for the given month.
 * Cells for padding days (outside the month) are `null`.
 * Week starts on Monday.
 */
function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const first   = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dow     = first.getDay(); // 0=Sun…6=Sat
  const startPad = dow === 0 ? 6 : dow - 1; // empty cells before day 1

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null); // pad to fill last row
  return cells;
}

/** Combines a YYYY-MM-DD string with HH:MM and returns an ISO 8601 string. */
function buildDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes]   = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function dateToYMD(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type DisplayEvent = {
  id: string; time: string; title: string;
  member: string; color: string; conflict: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: Schedule['category'][] = ['trabajo','escuela','deporte','salud','familia','personal','otro'];
const CATEGORY_ICONS: Record<Schedule['category'], string> = {
  trabajo: '💼', escuela: '📚', deporte: '⚽', salud: '💊', familia: '🏠', personal: '🎯', otro: '📌',
};
const RECURRENCE_OPTIONS: Schedule['recurrence'][] = ['none','daily','weekly','monthly'];
const RECURRENCE_LABELS: Record<Schedule['recurrence'], string> = {
  none: 'Sin repetir', daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual',
};
const PALETTE = ['#E7643F', '#208F7C', '#F2A93B', '#3178C6', '#A96D8A', '#D64C5A', '#52A78D', '#9A8F84'];

// ─── Role theme ───────────────────────────────────────────────────────────────
type RoleTheme = {
  bg: string; surface: string; text: string; textMuted: string;
  primary: string; border: string; amber: string;
  modalBg: string; modalInputBg: string;
  fs: number; touch: number;
};

function getRoleTheme(role: string | null): RoleTheme {
  switch (role) {
    case 'adulto':
      return { bg: '#FCFBF9', surface: '#FFFFFF', text: '#1A1714', textMuted: '#6B6560',
               primary: '#E7643F', border: '#DED5CB', amber: '#D98622',
               modalBg: '#FFFFFF', modalInputBg: '#F4F0EB', fs: 1.0, touch: 44 };
    case 'adolescente':
      return { bg: '#FCFBF9', surface: '#FFFFFF', text: '#1A1714', textMuted: '#6B6560',
               primary: '#208F7C', border: '#DED5CB', amber: '#D98622',
               modalBg: '#FFFFFF', modalInputBg: '#F4F0EB', fs: 1.0, touch: 44 };
    case 'adulto_mayor':
      return { bg: '#FCFBF9', surface: '#FFFFFF', text: '#1A1714', textMuted: '#4A4540',
               primary: '#E7643F', border: '#DED5CB', amber: '#D98622',
               modalBg: '#FFFFFF', modalInputBg: '#F4F0EB', fs: 1.2, touch: 56 };
    default: // coordinador
      return { bg: '#FCFBF9', surface: '#FFFFFF', text: '#1A1714', textMuted: '#6B6560',
               primary: '#E7643F', border: '#DED5CB', amber: '#D98622',
               modalBg: '#FFFFFF', modalInputBg: '#F4F0EB', fs: 1.0, touch: 44 };
  }
}

type Tab = 'calendar' | 'routines';

// ─── Component ────────────────────────────────────────────────────────────────
export const CalendarScreen = () => {
  const { user } = useAuth();
  const { currentHousehold, members, currentRole } = useHousehold();

  const today = useMemo(() => new Date(), []);

  const [activeTab, setActiveTab]           = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate]     = useState<Date>(today);
  const [currentMonth, setCurrentMonth]     = useState<Date>(() => firstOfMonth(today.getFullYear(), today.getMonth()));
  const [schedules, setSchedules]           = useState<Schedule[]>([]);
  const [events, setEvents]                 = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible]     = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const T = useMemo(() => getRoleTheme(currentRole), [currentRole]);
  const S = useMemo(() => getStyles(T), [T]);

  const isAdultoMayor = currentRole === 'adulto_mayor';
  const isAdolescente = currentRole === 'adolescente';
  const routinesTabLabel = isAdultoMayor ? 'Recordatorios' : (isAdolescente ? 'Mi Agenda' : 'Rutinas');
  const f = (size: number) => Math.round(size * T.fs);

  // ── Month grid ──────────────────────────────────────────────────────────────
  const monthGrid = useMemo(
    () => buildMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth],
  );

  const monthLabel = useMemo(() => {
    const raw = currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentMonth]);

  const prevMonth = () =>
    setCurrentMonth(prev => firstOfMonth(prev.getFullYear(), prev.getMonth() - 1));
  const nextMonth = () =>
    setCurrentMonth(prev => firstOfMonth(prev.getFullYear(), prev.getMonth() + 1));

  // Keep selected date inside current month when navigating
  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    // If the selected date is outside the current month view, move to that month
    if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(firstOfMonth(d.getFullYear(), d.getMonth()));
    }
  };

  // ── Schedule form ──────────────────────────────────────────────────────────
  const [formTitle, setFormTitle]         = useState('');
  const [formStart, setFormStart]         = useState('08:00');
  const [formEnd, setFormEnd]             = useState('09:00');
  const [formDays, setFormDays]           = useState<number[]>([1, 2, 3, 4, 5]);
  const [formRecurrence, setFormRecurrence] = useState<Schedule['recurrence']>('weekly');
  const [formCategory, setFormCategory]   = useState<Schedule['category']>('trabajo');
  const [formColor, setFormColor]         = useState('#E7643F');
  const [formSaving, setFormSaving]       = useState(false);

  // ── Event form ────────────────────────────────────────────────────────────
  const [evTitle, setEvTitle]       = useState('');
  const [evDateStr, setEvDateStr]   = useState('');
  const [evStart, setEvStart]       = useState('08:00');
  const [evEnd, setEvEnd]           = useState('09:00');
  const [evCategory, setEvCategory] = useState<CalendarEvent['category']>('personal');
  const [evColor, setEvColor]       = useState('#E7643F');
  const [evAllDay, setEvAllDay]     = useState(false);
  const [evSaving, setEvSaving]     = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadSchedules = useCallback(async () => {
    if (!currentHousehold) return;
    const { schedules: s } = await getHouseholdSchedules(currentHousehold.id);
    setSchedules(s);
  }, [currentHousehold]);

  useEffect(() => { void loadSchedules(); }, [loadSchedules]);

  const loadEvents = useCallback(async () => {
    if (!currentHousehold) return;
    // Load the whole month so dots appear on all days
    const from = firstOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()).toISOString();
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const { events: e } = await getHouseholdEvents(
      currentHousehold.id,
      from,
      monthEnd.toISOString(),
    );
    setEvents(e);
  }, [currentHousehold, currentMonth]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const dayEvents = useMemo<DisplayEvent[]>(() =>
    events
      .filter(e => new Date(e.start_at).toDateString() === selectedDate.toDateString())
      .map(e => ({
        id: e.id,
        time: formatEventTime(e.start_at),
        title: e.title,
        member: '',
        color: e.color,
        conflict: false,
      })),
    [events, selectedDate]);

  /** Map of dateString → event colors (max 3 dots) */
  const eventDotMap = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const e of events) {
      const key = new Date(e.start_at).toDateString();
      if (!map[key]) map[key] = [];
      if (map[key].length < 3) map[key].push(e.color);
    }
    return map;
  }, [events]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetScheduleForm = () => {
    setFormTitle(''); setFormStart('08:00'); setFormEnd('09:00');
    setFormDays([1,2,3,4,5]); setFormRecurrence('weekly');
    setFormCategory('trabajo'); setFormColor('#E7643F');
  };

  const openEventModal = () => {
    setEvDateStr(dateToYMD(selectedDate));
    setEvTitle(''); setEvStart('08:00'); setEvEnd('09:00');
    setEvCategory('personal'); setEvColor('#E7643F'); setEvAllDay(false);
    setEventModalVisible(true);
  };

  const toggleDay = (d: number) =>
    setFormDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const memberSchedules = (userId: string) => schedules.filter(s => s.user_id === userId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    if (!formTitle.trim() || !user || !currentHousehold) return;
    setFormSaving(true);
    const input: ScheduleInput = {
      household_id: currentHousehold.id,
      user_id: user.id,
      title: formTitle.trim(),
      start_time: formStart,
      end_time: formEnd || null,
      recurrence: formRecurrence,
      recurrence_days: formRecurrence === 'weekly' ? formDays : null,
      recurrence_day: null,
      color: formColor,
      category: formCategory,
    };
    const { error } = await upsertSchedule(input);
    if (error) Alert.alert('Error', error);
    else { await loadSchedules(); setModalVisible(false); resetScheduleForm(); }
    setFormSaving(false);
  };

  const saveEvent = async () => {
    if (!evTitle.trim() || !user || !currentHousehold) return;
    setEvSaving(true);
    const start_at = evAllDay
      ? buildDateTime(evDateStr, '00:00')
      : buildDateTime(evDateStr, evStart);
    const end_at = !evAllDay && evEnd ? buildDateTime(evDateStr, evEnd) : null;
    const { error } = await createEvent({
      household_id: currentHousehold.id,
      created_by: user.id,
      title: evTitle.trim(),
      start_at, end_at,
      category: evCategory,
      color: evColor,
      all_day: evAllDay,
    });
    if (error) Alert.alert('Error', error);
    else { await loadEvents(); setEventModalVisible(false); }
    setEvSaving(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert('Eliminar evento', '¿Querés eliminar este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteEvent(eventId);
          if (error) Alert.alert('Error', error);
          else setEvents(prev => prev.filter(e => e.id !== eventId));
        },
      },
    ]);
  };

  // ── Day cell size (7 equal columns) ────────────────────────────────────────
  const cellSize = Math.floor((SCREEN_W - 40) / 7); // 20px padding each side

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* Top tab bar */}
      <View style={S.tabBar}>
        {(['calendar', 'routines'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[S.tab, activeTab === t && S.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[S.tabText, activeTab === t && S.tabTextActive]}>
              {t === 'calendar' ? 'Calendario' : routinesTabLabel}
            </Text>
          </TouchableOpacity>
        ))}
        {/* Add event shortcut */}
        <TouchableOpacity style={S.tabAddBtn} onPress={openEventModal}>
          <Text style={S.tabAddBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={S.container} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'calendar' ? (
          <>
            {/* ── Month header ──────────────────────────────────────────── */}
            <View style={S.monthRow}>
              <TouchableOpacity style={S.chevron} onPress={prevMonth}>
                <Text style={S.chevronText}>‹</Text>
              </TouchableOpacity>
              <Text style={[S.monthLabel, { fontSize: f(18) }]}>{monthLabel}</Text>
              <TouchableOpacity style={S.chevron} onPress={nextMonth}>
                <Text style={S.chevronText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* ── Day-of-week header ────────────────────────────────────── */}
            <View style={S.dowHeader}>
              {DAY_LETTERS.map(l => (
                <View key={l} style={[S.dowCell, { width: cellSize }]}>
                  <Text style={S.dowText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* ── Month grid ────────────────────────────────────────────── */}
            <View style={S.gridContainer}>
              {monthGrid.map((d, i) => {
                if (!d) {
                  return <View key={`empty-${i}`} style={[S.gridCell, { width: cellSize, height: cellSize + 8 }]} />;
                }
                const isToday    = d.toDateString() === today.toDateString();
                const isSelected = d.toDateString() === selectedDate.toDateString();
                const dots       = eventDotMap[d.toDateString()] ?? [];

                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      S.gridCell,
                      { width: cellSize, height: cellSize + 8 },
                      isSelected && [S.gridCellSelected, { backgroundColor: T.primary }],
                    ]}
                    onPress={() => handleSelectDate(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      S.gridCellNum, { fontSize: f(14) },
                      isSelected && S.gridCellNumSelected,
                      isToday && !isSelected && { color: T.primary, fontWeight: '800' },
                    ]}>
                      {d.getDate()}
                    </Text>
                    <View style={S.dotRow}>
                      {dots.map((c, j) => (
                        <View key={j} style={[S.dot, { backgroundColor: isSelected ? '#FFFFFF88' : c }]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Selected day label + add button ──────────────────────── */}
            <View style={S.dayTitleRow}>
              <Text style={[S.dayTitle, { fontSize: f(15) }]} numberOfLines={1}>
                {selectedDate.toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
              <TouchableOpacity style={[S.addEventBtn, { borderColor: T.primary }]} onPress={openEventModal}>
                <Text style={[S.addEventBtnText, { fontSize: f(13), color: T.primary }]}>+ Evento</Text>
              </TouchableOpacity>
            </View>

            {/* ── Day events ────────────────────────────────────────────── */}
            {dayEvents.length === 0 ? (
              <View style={S.emptyDay}>
                <Text style={[S.emptyDayText, { fontSize: f(15) }]}>
                  {isAdultoMayor ? '¡No tienes citas este día! 🌞' : 'Sin eventos este día ✨'}
                </Text>
              </View>
            ) : (
              dayEvents.map(ev => (
                <View
                  key={ev.id}
                  style={[S.eventCard, { borderLeftColor: ev.color }]}
                >
                  {isAdultoMayor ? (
                    <>
                      <Text style={{ fontSize: f(24), fontWeight: '800', color: T.primary, marginRight: 14 }}>
                        {ev.time}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: f(17), fontWeight: '700', color: T.text }}>{ev.title}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(ev.id)}
                        style={{ padding: 8, minWidth: T.touch, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: f(18), color: T.textMuted }}>✕</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={S.eventLeft}>
                        {isAdolescente && (
                          <Text style={{ fontSize: 11, color: T.primary, fontWeight: '700', marginBottom: 2 }}>
                            {ev.time}
                          </Text>
                        )}
                        <Text style={[S.eventTitle, { fontSize: f(15) }]}>{ev.title}</Text>
                        {!isAdolescente && (
                          <Text style={[S.eventTime, { fontSize: f(12) }]}>{ev.time}</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[S.memberColorDot, { backgroundColor: ev.color }]} />
                        <TouchableOpacity onPress={() => handleDeleteEvent(ev.id)}>
                          <Text style={S.deleteBtn}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}

            {/* ── Free time card (not for adulto_mayor) ────────────────── */}
            {!isAdultoMayor && (
              <View style={S.freeTimeCard}>
                <Text style={S.freeTimeTitle}>✨ Tiempo libre en familia detectado</Text>
                <Text style={S.freeTimeDesc}>El sábado de 14:00 a 17:00 todos están libres</Text>
                <TouchableOpacity style={S.freeTimeBtn} onPress={openEventModal}>
                  <Text style={S.freeTimeBtnText}>+ Agregar plan familiar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Adulto mayor: large add button ───────────────────────── */}
            {isAdultoMayor && (
              <TouchableOpacity
                style={[S.elderAddBtn, { minHeight: T.touch + 10 }]}
                onPress={openEventModal}
              >
                <Text style={[S.elderAddBtnText, { fontSize: f(17) }]}>+ Agregar cita o recordatorio</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* ── Routines tab ──────────────────────────────────────────── */}
            <View style={S.routinesHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[S.routinesTitle, { fontSize: f(20) }]}>
                  {isAdultoMayor ? 'Mis recordatorios' : 'Horarios de la familia'}
                </Text>
                <Text style={[S.routinesSubtitle, { fontSize: f(13) }]}>
                  {isAdultoMayor
                    ? 'Tus rutinas y recordatorios diarios'
                    : 'Configura las rutinas de cada integrante'}
                </Text>
              </View>
              <TouchableOpacity
                style={[S.addRoutineBtn, { minHeight: T.touch, justifyContent: 'center' }]}
                onPress={() => { resetScheduleForm(); setModalVisible(true); }}
              >
                <Text style={[S.addRoutineBtnText, { fontSize: f(13) }]}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {members.length === 0 && (
              <Text style={[S.noMembersText, { fontSize: f(14) }]}>No hay miembros en el hogar aún.</Text>
            )}
            {members.map(m => {
              const mSchedules = memberSchedules(m.user_id);
              const isExpanded = expandedMember === m.user_id;
              return (
                <View key={m.id} style={S.memberSection}>
                  <TouchableOpacity
                    style={[S.memberSectionHeader, { minHeight: T.touch }]}
                    onPress={() => setExpandedMember(isExpanded ? null : m.user_id)}
                  >
                    <View style={S.memberAvatarSmall}>
                      <Text style={{ fontSize: 20 }}>👤</Text>
                    </View>
                    <Text style={[S.memberSectionName, { fontSize: f(15) }]}>{m.user?.nombre ?? 'Miembro'}</Text>
                    <Text style={[S.memberSectionCount, { fontSize: f(12) }]}>{mSchedules.length} rutinas</Text>
                    <Text style={S.memberSectionChevron}>{isExpanded ? '▾' : '▸'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={S.memberSectionBody}>
                      {mSchedules.length === 0 ? (
                        <Text style={[S.noRoutinesText, { fontSize: f(13) }]}>Sin rutinas configuradas</Text>
                      ) : (
                        mSchedules.map(s => (
                          <View key={s.id} style={[S.routineEntry, { borderLeftColor: s.color, minHeight: T.touch }]}>
                            <Text style={{ fontSize: f(20) }}>{CATEGORY_ICONS[s.category]}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[S.routineTitle, { fontSize: f(14) }]}>{s.title}</Text>
                              <Text style={[S.routineMeta, { fontSize: f(12) }]}>
                                {s.start_time}{s.end_time ? ` – ${s.end_time}` : ''} · {RECURRENCE_LABELS[s.recurrence]}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={{ minHeight: T.touch, minWidth: T.touch, alignItems: 'center', justifyContent: 'center' }}
                              onPress={async () => { await deleteSchedule(s.id); await loadSchedules(); }}
                            >
                              <Text style={S.deleteBtn}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                      {m.user_id === user?.id && (
                        <TouchableOpacity
                          style={[S.addForMemberBtn, { minHeight: T.touch }]}
                          onPress={() => { resetScheduleForm(); setModalVisible(true); }}
                        >
                          <Text style={[S.addForMemberText, { fontSize: f(13) }]}>+ Agregar rutina</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={[S.templatesLabel, { fontSize: f(11) }]}>Aplicar plantilla</Text>
            <View style={S.templateRow}>
              {['Semana laboral', 'Semana escolar', 'Fin de semana'].map(t => (
                <TouchableOpacity key={t} style={[S.templatePill, { minHeight: T.touch, justifyContent: 'center' }]}>
                  <Text style={[S.templatePillText, { fontSize: f(13) }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add routine modal ───────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <ScrollView
            style={S.modalCard}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[S.modalTitle, { fontSize: f(20) }]}>
              {isAdultoMayor ? 'Nuevo recordatorio' : 'Nueva rutina'}
            </Text>
            <TextInput
              style={[S.modalInput, { fontSize: f(15), minHeight: T.touch }]}
              placeholder={isAdultoMayor ? 'Ej. Pastilla de la mañana' : 'Nombre (ej. Gimnasio)'}
              placeholderTextColor={T.textMuted}
              value={formTitle}
              onChangeText={setFormTitle}
            />
            <View style={S.timeRow}>
              <TextInput
                style={[S.modalInput, { flex: 1, fontSize: f(14), minHeight: T.touch }]}
                placeholder="Inicio 08:00"
                placeholderTextColor={T.textMuted}
                value={formStart}
                onChangeText={setFormStart}
              />
              <Text style={{ marginHorizontal: 8, color: T.textMuted, fontSize: f(14) }}>→</Text>
              <TextInput
                style={[S.modalInput, { flex: 1, fontSize: f(14), minHeight: T.touch }]}
                placeholder="Fin 09:00"
                placeholderTextColor={T.textMuted}
                value={formEnd}
                onChangeText={setFormEnd}
              />
            </View>

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Días</Text>
            <View style={S.dayToggles}>
              {DAY_LETTERS.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    S.dayToggle,
                    formDays.includes(i + 1) && S.dayToggleActive,
                    { width: Math.round(36 * T.fs), height: Math.round(36 * T.fs), borderRadius: Math.round(18 * T.fs) },
                  ]}
                  onPress={() => toggleDay(i + 1)}
                >
                  <Text style={[S.dayToggleText, formDays.includes(i + 1) && S.dayToggleTextActive, { fontSize: f(13) }]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Recurrencia</Text>
            <View style={S.recurrenceRow}>
              {RECURRENCE_OPTIONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[S.recurrencePill, formRecurrence === r && S.recurrencePillActive, { minHeight: T.touch, justifyContent: 'center' }]}
                  onPress={() => setFormRecurrence(r)}
                >
                  <Text style={[S.recurrenceText, formRecurrence === r && S.recurrenceTextActive, { fontSize: f(12) }]}>
                    {RECURRENCE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Categoría</Text>
            <View style={S.categoryGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[S.categoryBtn, formCategory === c && S.categoryBtnActive, { minHeight: T.touch }]}
                  onPress={() => setFormCategory(c)}
                >
                  <Text style={{ fontSize: f(20) }}>{CATEGORY_ICONS[c]}</Text>
                  <Text style={[S.categoryBtnText, { fontSize: f(10) }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Color</Text>
            <View style={S.paletteRow}>
              {PALETTE.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[
                    S.colorDot,
                    { backgroundColor: col, width: Math.round(28 * T.fs), height: Math.round(28 * T.fs), borderRadius: Math.round(14 * T.fs) },
                    formColor === col && S.colorDotSelected,
                  ]}
                  onPress={() => setFormColor(col)}
                />
              ))}
            </View>

            <View style={S.modalActions}>
              <TouchableOpacity
                style={[S.cancelBtn, { minHeight: T.touch }]}
                onPress={() => { setModalVisible(false); resetScheduleForm(); }}
              >
                <Text style={[S.cancelBtnText, { fontSize: f(14) }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.saveBtn, formSaving && { opacity: 0.6 }, { minHeight: T.touch }]}
                onPress={() => void saveSchedule()}
                disabled={formSaving}
              >
                <Text style={[S.saveBtnText, { fontSize: f(15) }]}>{formSaving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add event modal ─────────────────────────────────────────────────── */}
      <Modal visible={eventModalVisible} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <ScrollView
            style={S.modalCard}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[S.modalTitle, { fontSize: f(20) }]}>
              {isAdultoMayor ? 'Nueva cita' : 'Nuevo evento'}
            </Text>

            <TextInput
              style={[S.modalInput, { fontSize: f(15), minHeight: T.touch }]}
              placeholder={isAdultoMayor ? 'Ej. Médico de cabecera' : 'Título del evento'}
              placeholderTextColor={T.textMuted}
              value={evTitle}
              onChangeText={setEvTitle}
            />

            {/* All-day toggle */}
            <View style={S.allDayRow}>
              <Text style={[S.modalLabel, { fontSize: f(13), marginTop: 0, marginBottom: 0 }]}>Todo el día</Text>
              <Switch
                value={evAllDay}
                onValueChange={setEvAllDay}
                trackColor={{ false: T.border, true: T.primary }}
                thumbColor={evAllDay ? '#FFFFFF' : T.textMuted}
              />
            </View>

            {!evAllDay && (
              <View style={[S.timeRow, { marginTop: 8 }]}>
                <TextInput
                  style={[S.modalInput, { flex: 1, fontSize: f(14), minHeight: T.touch }]}
                  placeholder="Inicio 08:00"
                  placeholderTextColor={T.textMuted}
                  value={evStart}
                  onChangeText={setEvStart}
                />
                <Text style={{ marginHorizontal: 8, color: T.textMuted, fontSize: f(14) }}>→</Text>
                <TextInput
                  style={[S.modalInput, { flex: 1, fontSize: f(14), minHeight: T.touch }]}
                  placeholder="Fin 09:00"
                  placeholderTextColor={T.textMuted}
                  value={evEnd}
                  onChangeText={setEvEnd}
                />
              </View>
            )}

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Categoría</Text>
            <View style={S.categoryGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[S.categoryBtn, evCategory === c && S.categoryBtnActive, { minHeight: T.touch }]}
                  onPress={() => setEvCategory(c)}
                >
                  <Text style={{ fontSize: f(20) }}>{CATEGORY_ICONS[c]}</Text>
                  <Text style={[S.categoryBtnText, { fontSize: f(10) }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[S.modalLabel, { fontSize: f(12) }]}>Color</Text>
            <View style={S.paletteRow}>
              {PALETTE.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[
                    S.colorDot,
                    { backgroundColor: col, width: Math.round(28 * T.fs), height: Math.round(28 * T.fs), borderRadius: Math.round(14 * T.fs) },
                    evColor === col && S.colorDotSelected,
                  ]}
                  onPress={() => setEvColor(col)}
                />
              ))}
            </View>

            <View style={S.modalActions}>
              <TouchableOpacity
                style={[S.cancelBtn, { minHeight: T.touch }]}
                onPress={() => setEventModalVisible(false)}
              >
                <Text style={[S.cancelBtnText, { fontSize: f(14) }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.saveBtn, evSaving && { opacity: 0.6 }, { minHeight: T.touch }]}
                onPress={() => void saveEvent()}
                disabled={evSaving}
              >
                <Text style={[S.saveBtnText, { fontSize: f(15) }]}>{evSaving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(T: RoleTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },

    // Tab bar
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border, alignItems: 'center' },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: T.primary },
    tabText: { fontSize: 15, color: T.textMuted, fontWeight: '600' },
    tabTextActive: { color: T.text, fontWeight: '700' },
    tabAddBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: T.primary,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    tabAddBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 26 },

    container: { flex: 1, backgroundColor: T.bg },
    content: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16 },

    // Month header
    monthRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', marginBottom: 14, gap: 16,
    },
    monthLabel: { fontSize: 18, fontWeight: '700', color: T.text, textTransform: 'capitalize', minWidth: 180, textAlign: 'center' },
    chevron: { padding: 8 },
    chevronText: { fontSize: 24, color: T.primary },

    // Day-of-week header
    dowHeader: { flexDirection: 'row', marginBottom: 4 },
    dowCell: { alignItems: 'center', paddingVertical: 4 },
    dowText: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase' },

    // Month grid
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
    gridCell: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, borderRadius: 10 },
    gridCellSelected: { borderRadius: 10 },
    gridCellNum: { fontSize: 14, fontWeight: '500', color: T.text, marginBottom: 3 },
    gridCellNumSelected: { color: '#FFFFFF', fontWeight: '800' },
    dotRow: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
    dot: { width: 5, height: 5, borderRadius: 2.5 },

    // Selected day
    dayTitleRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 12,
      paddingTop: 4,
    },
    dayTitle: {
      fontSize: 15, fontWeight: '700', color: T.text,
      textTransform: 'capitalize', flex: 1, marginRight: 8,
    },
    addEventBtn: {
      borderWidth: 1.5, borderRadius: 20,
      paddingVertical: 6, paddingHorizontal: 12,
    },
    addEventBtnText: { fontWeight: '700' },

    emptyDay: { paddingVertical: 24, alignItems: 'center' },
    emptyDayText: { fontSize: 15, color: T.textMuted, textAlign: 'center' },

    eventCard: {
      backgroundColor: T.surface,
      borderRadius: 12, padding: 14,
      marginBottom: 8, borderLeftWidth: 4,
      borderWidth: 1, borderColor: T.border,
      flexDirection: 'row', alignItems: 'center',
    },
    eventLeft: { flex: 1 },
    eventTitle: { fontSize: 15, fontWeight: '600', color: T.text, marginBottom: 2 },
    eventTime: { fontSize: 12, color: T.textMuted },
    memberColorDot: { width: 10, height: 10, borderRadius: 5 },
    deleteBtn: { fontSize: 16, color: T.textMuted, paddingHorizontal: 4 },

    freeTimeCard: {
      backgroundColor: T.surface, borderRadius: 14,
      padding: 16, marginTop: 8,
      borderWidth: 1, borderColor: T.primary + '40',
    },
    freeTimeTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 4 },
    freeTimeDesc: { fontSize: 13, color: T.textMuted, marginBottom: 12 },
    freeTimeBtn: { borderWidth: 1.5, borderColor: T.primary, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    freeTimeBtnText: { color: T.primary, fontWeight: '600', fontSize: 13 },

    elderAddBtn: { backgroundColor: T.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
    elderAddBtnText: { color: '#FFF', fontWeight: '700' },

    // Routines tab
    routinesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    routinesTitle: { fontSize: 20, fontWeight: '800', color: T.text },
    routinesSubtitle: { fontSize: 13, color: T.textMuted, marginTop: 2 },
    addRoutineBtn: { backgroundColor: T.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
    addRoutineBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    noMembersText: { color: T.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 32 },
    memberSection: { backgroundColor: T.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    memberSectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    memberAvatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.border, alignItems: 'center', justifyContent: 'center' },
    memberSectionName: { flex: 1, fontSize: 15, fontWeight: '700', color: T.text },
    memberSectionCount: { fontSize: 12, color: T.textMuted },
    memberSectionChevron: { fontSize: 16, color: T.textMuted, marginLeft: 4 },
    memberSectionBody: { borderTopWidth: 1, borderTopColor: T.border, padding: 12 },
    noRoutinesText: { color: T.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    routineEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderLeftWidth: 3, paddingLeft: 10, marginBottom: 6, gap: 8 },
    routineTitle: { fontSize: 14, fontWeight: '600', color: T.text },
    routineMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
    addForMemberBtn: { paddingVertical: 10, alignItems: 'center' },
    addForMemberText: { color: T.primary, fontSize: 13, fontWeight: '600' },

    templatesLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
    templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    templatePill: { borderWidth: 1.5, borderColor: T.primary, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
    templatePillText: { color: T.primary, fontWeight: '600', fontSize: 13 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: T.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 16 },
    modalInput: { backgroundColor: T.modalInputBg, borderRadius: 10, padding: 12, color: T.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: T.border },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    modalLabel: { fontSize: 12, color: T.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
    allDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginBottom: 4 },
    dayToggles: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
    dayToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: T.border },
    dayToggleActive: { backgroundColor: T.primary, borderColor: T.primary },
    dayToggleText: { fontSize: 13, fontWeight: '700', color: T.textMuted },
    dayToggleTextActive: { color: '#FFF' },
    recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    recurrencePill: { borderWidth: 1.5, borderColor: T.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    recurrencePillActive: { backgroundColor: T.primary, borderColor: T.primary },
    recurrenceText: { fontSize: 12, color: T.textMuted, fontWeight: '600' },
    recurrenceTextActive: { color: '#FFF' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    categoryBtn: { alignItems: 'center', borderWidth: 1.5, borderColor: T.border, borderRadius: 10, padding: 8, minWidth: 64 },
    categoryBtnActive: { borderColor: T.primary, backgroundColor: T.primary + '22' },
    categoryBtnText: { fontSize: 10, color: T.textMuted, marginTop: 2, textTransform: 'capitalize' },
    paletteRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    colorDotSelected: { borderWidth: 3, borderColor: '#FFF' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: T.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { color: T.textMuted, fontWeight: '600' },
    saveBtn: { flex: 2, backgroundColor: T.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  });
}
