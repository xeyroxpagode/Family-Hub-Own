import { StyleSheet } from 'react-native';
import type { PlannerTaskStatus } from '../../services/plannerTasks';
import type { PlannerGoal, PlannerGoalCategory, PlannerGoalStatus, PlannerGoalVisibility, PlannerGoalTargetType, PlannerGoalProgressMode } from '../../services/plannerGoals';
import type { HomePlusIconName } from '../../constants/icons';
import { colors, radius, shadows, spacing } from '../../constants/theme';

export type PlannerTaskPriority = 'low' | 'normal' | 'high';

export const priorityLabels: Record<PlannerTaskPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
};

export const priorityLabelsWithLegacy: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  medium: 'Normal',
  critical: 'Alta',
};

export const statusLabels: Record<PlannerTaskStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  awaiting_verification: 'Por verificar',
  verified: 'Verificada',
  cancelled: 'Cancelada',
};

export const typeLabels: Record<string, string> = {
  cleaning: 'Limpieza',
  shopping: 'Compras',
  pets: 'Mascotas',
  medication: 'Medicación',
  studies: 'Estudios',
  payments: 'Pagos',
};

export const typeIcons: Record<string, string> = {
  cleaning: 'sparkles',
  shopping: 'cart',
  pets: 'paw',
  medication: 'medical',
  studies: 'school',
  payments: 'card',
};

export const getTypeLabel = (templateKey?: string | null, category?: string | null): string => {
  if (templateKey && typeLabels[templateKey]) return typeLabels[templateKey];
  if (category) return category;
  return 'General';
};

export const getTypeIcon = (templateKey?: string | null): string | undefined => {
  if (templateKey && typeIcons[templateKey]) return typeIcons[templateKey];
  return undefined;
};

export const goalStatusLabels: Record<PlannerGoalStatus, string> = {
  active: 'Activa',
  completed: 'Lograda',
  closed: 'Cerrada',
};

export const goalVisibilityLabels: Record<PlannerGoalVisibility, string> = {
  household: 'Familiar',
  personal: 'Personal',
};

export const goalCategoryLabels: Record<PlannerGoalCategory, string> = {
  home: 'Hogar',
  family: 'Familia',
  finance: 'Finanzas',
  health: 'Salud',
  education: 'Educacion',
  other: 'Otro',
};

export const goalCategoryIcons: Record<PlannerGoalCategory, HomePlusIconName> = {
  home: 'home',
  family: 'people',
  finance: 'wallet',
  health: 'heart',
  education: 'school',
  other: 'ellipse',
};

export const goalCategoryColors: Record<PlannerGoalCategory, string> = {
  home: colors.sage[500],
  family: colors.terracotta[500],
  finance: colors.sand[500],
  health: colors.danger.base,
  education: colors.info.base,
  other: colors.text.tertiary,
};

export const goalTargetTypeLabels: Record<PlannerGoalTargetType, string> = {
  count: 'Unidades',
  percentage: 'Porcentaje',
  amount: 'Monetario',
  boolean: 'Cumplido / No',
};

export const goalProgressModeLabels: Record<PlannerGoalProgressMode, string> = {
  steps: 'Por pasos',
  tasks: 'Por tareas',
  numeric: 'Con numero',
  boolean: 'Si / No',
  none: 'Sin progreso',
};

export const hasRealGoalProgress = (goal: PlannerGoal): boolean =>
  goal.progress_percentage !== null && goal.progress_percentage !== undefined;

export const shouldShowGoalProgressBar = (goal: PlannerGoal): boolean => {
  const mode = goal.progress_mode;
  if (mode === 'boolean' || mode === 'none') return false;
  if (goal.status === 'completed' || goal.status === 'closed') return false;
  return hasRealGoalProgress(goal);
};

export const getGoalProgressText = (
  goal: PlannerGoal,
  opts?: { milestoneCount?: number; taskCount?: number },
): string | null => {
  if (hasRealGoalProgress(goal)) {
    const mode = goal.progress_mode;
    if (mode === 'tasks' && goal.tasks_total !== undefined && goal.tasks_total !== null && goal.tasks_total > 0) {
      const completed = goal.tasks_completed ?? 0;
      const total = goal.tasks_total;
      return `${completed} de ${total} tareas terminadas`;
    }
    if (mode === 'steps' && goal.milestones_total !== undefined && goal.milestones_total !== null && goal.milestones_total > 0) {
      const completed = goal.milestones_completed ?? 0;
      const total = goal.milestones_total;
      return `${completed} de ${total} pasos logrados`;
    }
    if (mode === 'tasks') {
      const knownTaskTotal = goal.tasks_total ?? opts?.taskCount;
      if (knownTaskTotal === undefined || knownTaskTotal === null) return null;
      if (knownTaskTotal === 0) return 'Sin tareas vinculadas';
      return `${goal.tasks_completed ?? 0} de ${knownTaskTotal} tareas terminadas`;
    }
    if (mode === 'steps') {
      const knownMilestoneTotal = goal.milestones_total ?? opts?.milestoneCount;
      if (knownMilestoneTotal === undefined || knownMilestoneTotal === null) return null;
      if (knownMilestoneTotal === 0) return 'Sin pasos todavía';
      return `${goal.milestones_completed ?? 0} de ${knownMilestoneTotal} pasos logrados`;
    }
    return null;
  }
  const mode = goal.progress_mode;
  if (goal.status === 'completed') return 'Meta lograda';
  if (goal.status === 'closed') return 'Cerrada sin lograr';
  switch (mode) {
    case 'steps': {
      const knownMilestoneTotal = opts?.milestoneCount ?? goal.milestones_total;
      if (knownMilestoneTotal === undefined || knownMilestoneTotal === null) return null;
      return knownMilestoneTotal === 0 ? 'Sin pasos todavía' : null;
    }
    case 'tasks': {
      const knownTaskTotal = opts?.taskCount ?? goal.tasks_total;
      if (knownTaskTotal === undefined || knownTaskTotal === null) return null;
      return knownTaskTotal === 0 ? 'Sin tareas vinculadas' : null;
    }
    case 'numeric':
      return goal.target_value === null || goal.target_value === 0
        ? 'Falta definir el objetivo'
        : null;
    case 'boolean':
      return 'Pendiente';
    case 'none':
      return 'Sin una medida fija';
    default:
      return null;
  }
};

export const getTypeDotColor = (templateKey?: string | null) => {
  const map: Record<string, string> = {
    cleaning: '#94B097',
    shopping: '#DFBC72',
    pets: '#D4944A',
    medication: '#C46B6B',
    studies: '#7A8B9B',
    payments: '#E28A5F',
  };
  if (templateKey && map[templateKey]) return map[templateKey];
  return '#B0C8B3';
};

export const recurrenceLabels = {
  none: 'No repetir',
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
} as const;

export const dateToYMD = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export const buildLocalIso = (date: string, time: string) => {
  const safeTime = time.trim() || '00:00';
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = safeTime.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0).toISOString();
};

export const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

export const getWeekDays = (centerDate: Date) => {
  const start = new Date(centerDate);
  start.setDate(start.getDate() - centerDate.getDay());
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      dayLabel: date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
      dayNumber: date.getDate(),
    };
  });
};

export const formatTime = (value?: string | null) => {
  if (!value) return '';
  if (value.includes('T')) {
    return new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return value.slice(0, 5);
};

export const plannerStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.base },
  scroll: { flex: 1 },
  content: { padding: spacing[5], paddingBottom: 96 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  title: { color: colors.text.primary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  sectionTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  topbarTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    padding: 6,
    marginBottom: 16,
    minHeight: 54,
    ...shadows.card,
  },
  topbarTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  topbarTabActive: {
    backgroundColor: colors.terracotta[50],
    borderWidth: 1,
    borderColor: colors.terracotta[100],
  },
  topbarTabText: { color: colors.text.secondary, fontWeight: '500', fontSize: 13 },
  topbarTabTextActive: { color: colors.terracotta[700], fontWeight: '700' },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[100],
    borderWidth: 1,
  },
  tabPillText: { color: colors.text.tertiary, fontWeight: '700', fontSize: 13 },
  tabPillTextActive: { color: colors.terracotta[700] },
  statCard: {
    flex: 1,
    minWidth: 84,
    borderRadius: radius.lg,
    padding: spacing[3],
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statCardPending: {
    backgroundColor: colors.surface.card,
  },
  statCardToday: {
    minWidth: 104,
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[100],
  },
  statCardOverdue: {
    backgroundColor: colors.warning.soft,
    borderColor: colors.warning.base,
  },
  statCardReview: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[100],
  },
  statLabel: { color: colors.text.tertiary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' as const },
  statValue: { color: colors.text.primary, fontSize: 22, fontWeight: '800', marginTop: 4 },
  statLabelToday: { color: colors.terracotta[700] },
  statValueToday: { color: colors.terracotta[700], fontSize: 26 },
  filterScroll: { flexGrow: 1 },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 36,
    backgroundColor: colors.surface.soft,
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  filterChipText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },
  filterChipTextActive: { color: colors.text.inverse },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.card,
  },
  muted: { color: colors.text.tertiary, fontSize: 13, lineHeight: 19 },
  label: { color: colors.text.tertiary, fontSize: 12, fontWeight: '700', marginBottom: spacing[2], textTransform: 'uppercase' },
  input: {
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    fontSize: 15,
    marginBottom: spacing[3],
  },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: colors.terracotta[500],
    borderRadius: radius.lg,
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
  },
  dangerBtn: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger.soft,
  },
  btnText: { color: colors.text.inverse, fontSize: 14, fontWeight: '800' },
  secondaryText: { color: colors.terracotta[600], fontSize: 14, fontWeight: '800' },
  dangerText: { color: colors.danger.text, fontSize: 14, fontWeight: '800' },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surface.soft,
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  chipText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: colors.text.inverse },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.sand[50],
  },
  badgeText: { color: colors.text.secondary, fontSize: 12, fontWeight: '800' },
  badgeDanger: { backgroundColor: colors.warning.soft },
  badgeDangerText: { color: colors.warning.text },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  checkboxChecked: { backgroundColor: colors.terracotta[500] },
  checkboxText: { color: colors.text.inverse, fontSize: 15, fontWeight: '900' },
  errorBox: {
    backgroundColor: colors.danger.soft,
    borderColor: colors.danger.base,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginVertical: spacing[3],
  },
  errorText: { color: colors.danger.text, fontSize: 14, lineHeight: 20 },
  emptyBox: { paddingVertical: spacing[7], alignItems: 'center' },
  emptyTitle: { color: colors.text.primary, textAlign: 'center', fontSize: 18, fontWeight: '900', marginBottom: spacing[2] },
  emptyText: { color: colors.text.secondary, textAlign: 'center', fontSize: 15, lineHeight: 21 },
  toastBox: {
    backgroundColor: colors.success.soft,
    borderColor: colors.success.base,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    ...shadows.card,
  },
  toastText: { color: colors.success.strong, fontSize: 14, fontWeight: '800' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.surface.overlayStrong,
    justifyContent: 'flex-end',
  },
  sheetPanel: {
    maxHeight: '92%',
    minHeight: '72%',
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing[5],
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.sheet,
  },
  sheetHandleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    position: 'relative',
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
  },
  sheetCloseButton: {
    position: 'absolute',
    right: 0,
    top: -6,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.xl,
    padding: spacing[3],
    marginBottom: spacing[4],
    ...shadows.card,
  },
  monthWeekday: {
    width: '14.285%',
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  monthDay: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  monthDaySelected: { backgroundColor: colors.terracotta[500] },
  monthDayText: { color: colors.text.primary, fontSize: 14, fontWeight: '800' },
  monthDayTextSelected: { color: colors.text.inverse },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.sage[500],
    marginTop: 3,
  },
  eventDotSelected: { backgroundColor: colors.text.inverse },
  taskCardBorderLow: { borderLeftWidth: 4, borderLeftColor: colors.sage[400] },
  taskCardBorderNormal: { borderLeftWidth: 4, borderLeftColor: colors.sand[400] },
  taskCardBorderHigh: { borderLeftWidth: 4, borderLeftColor: colors.warning.base },
  taskBadgePending: { backgroundColor: colors.sand[50] },
  taskBadgePendingText: { color: colors.text.secondary },
  taskBadgeAwaiting: { backgroundColor: colors.sage[50] },
  taskBadgeAwaitingText: { color: colors.sage[700] },
  taskBadgeCompleted: { backgroundColor: colors.success.soft },
  taskBadgeCompletedText: { color: colors.success.strong },
  taskBadgeVerified: { backgroundColor: colors.success.soft },
  taskBadgeVerifiedText: { color: colors.success.strong },
  taskBadgeCancelled: { backgroundColor: colors.surface.soft },
  taskBadgeCancelledText: { color: colors.text.tertiary },
  taskBadgeOverdue: { backgroundColor: colors.warning.soft },
  taskBadgeOverdueText: { color: colors.warning.text },
  taskMetadataRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' as const, marginTop: 8 },
  taskMetadataChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  taskMetadataChipText: { color: colors.text.tertiary, fontSize: 12, fontWeight: '600' },
  taskOriginBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F0EBE0',
    borderWidth: 1,
    borderColor: '#DFBC72',
  },
  taskOriginBadgeText: {
    color: '#8B6914',
    fontSize: 10,
    fontWeight: '700',
  },
  taskPersonLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600', marginTop: 6 },
  taskDateLabel: { color: colors.text.tertiary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  taskDescription: { color: colors.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  taskActionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 12, flexWrap: 'wrap' as const },
  taskPrimaryAction: {
    flex: 1,
    minWidth: 120,
    borderRadius: radius.lg,
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.terracotta[500],
  },
  taskPrimaryActionText: { color: colors.text.inverse, fontSize: 14, fontWeight: '800' },
  taskSecondaryAction: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    minWidth: 80,
  },
  taskSecondaryActionText: { color: colors.terracotta[600], fontSize: 14, fontWeight: '700' },
  checkboxAnimated: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  checkboxAnimatedChecked: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  filterChipWithCount: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 38,
    backgroundColor: colors.surface.soft,
    justifyContent: 'center',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipCountActive: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
  filterChipCountText: { color: colors.text.secondary, fontWeight: '600', fontSize: 12 },
  filterChipCountTextActive: { color: colors.text.inverse },
  filterCountBadge: {
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: colors.terracotta[300],
  },
  filterCountBadgeActive: { backgroundColor: colors.terracotta[600] },
  filterCountText: { color: colors.text.tertiary, fontSize: 11, fontWeight: '800' },
  filterCountTextActive: { color: colors.text.inverse },
  formSectionPremium: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  formLabelHuman: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing[2],
    textTransform: 'none' as const,
  },
  formInputFocused: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    fontSize: 15,
    marginBottom: spacing[3],
  },
  formInputFocusedFocus: {
    borderColor: colors.terracotta[400],
  },
  formHelperText: {
    color: colors.text.tertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  taskFormChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    marginRight: 10,
  },
  taskFormChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  taskFormChipText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  taskFormChipTextActive: {
    color: colors.text.inverse,
  },
  taskFormChipPriorityLow: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[100],
  },
  taskFormChipPriorityLowActive: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500],
  },
  taskFormChipPriorityLowText: {
    color: colors.sage[600],
  },
  taskFormChipPriorityLowTextActive: {
    color: colors.text.inverse,
  },
  taskFormChipPriorityNormal: {
    backgroundColor: colors.sand[50],
    borderColor: colors.sand[100],
  },
  taskFormChipPriorityNormalActive: {
    backgroundColor: colors.sand[500],
    borderColor: colors.sand[500],
  },
  taskFormChipPriorityNormalText: {
    color: colors.sand[600],
  },
  taskFormChipPriorityNormalTextActive: {
    color: colors.text.inverse,
  },
  taskFormChipPriorityHigh: {
    backgroundColor: colors.warning.soft,
    borderColor: colors.warning.base,
  },
  taskFormChipPriorityHighActive: {
    backgroundColor: colors.warning.base,
    borderColor: colors.warning.base,
  },
  taskFormChipPriorityHighText: {
    color: colors.warning.text,
  },
  taskFormChipPriorityHighTextActive: {
    color: colors.text.inverse,
  },
  calendarNavArrow: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  calendarNavToday: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.terracotta[500],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  calendarNavTodayText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: '800',
  },
  calendarViewChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarViewChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  calendarViewChipText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  calendarViewChipTextActive: {
    color: colors.text.inverse,
  },
  calendarMonthDay: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    marginBottom: 4,
  },
  calendarMonthDaySelected: {
    backgroundColor: colors.terracotta[500],
    borderWidth: 0,
  },
  calendarMonthDayToday: {
    borderWidth: 2,
    borderColor: colors.terracotta[300],
  },
  calendarMonthDayText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  calendarMonthDayTextSelected: {
    color: colors.text.inverse,
  },
  calendarMonthDayTextToday: {
    color: colors.terracotta[700],
  },
  calendarMonthDayTextTodaySelected: {
    color: colors.text.inverse,
  },
  calendarIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  calendarIndicatorEvent: {
    backgroundColor: colors.terracotta[500],
  },
  calendarIndicatorTask: {
    backgroundColor: colors.sage[500],
  },
  calendarIndicatorBoth: {
    width: 16,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIndicatorBothInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  calendarAgendaCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  calendarAgendaCardEvent: {
    borderColor: colors.terracotta[100],
    ...shadows.card,
  },
  calendarAgendaCardTask: {
    borderColor: colors.sage[100],
    ...shadows.card,
  },
  calendarAgendaCardTaskHigh: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.base,
  },
  calendarAgendaCardEventCancelled: {
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
  },
  calendarAgendaCardTaskCancelled: {
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
  },
  calendarAgendaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: 8,
  },
  calendarAgendaTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  calendarAgendaMeta: {
    color: colors.text.tertiary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  calendarAgendaLocation: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  calendarAgendaBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  calendarAgendaBadgeEvent: {
    backgroundColor: colors.terracotta[50],
  },
  calendarAgendaBadgeTask: {
    backgroundColor: colors.sage[50],
  },
  calendarAgendaBadgeTaskCompleted: {
    backgroundColor: colors.success.soft,
  },
  calendarAgendaBadgeCancelled: {
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  calendarAgendaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
  calendarAgendaBadgeTextEvent: {
    color: colors.terracotta[700],
  },
  calendarAgendaBadgeTextCancelled: {
    color: colors.text.tertiary,
  },
  calendarAgendaBadgeTextTask: {
    color: colors.sage[700],
  },
  calendarAgendaBadgeTextCompleted: {
    color: colors.success.strong,
  },
  calendarAgendaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 12,
    flexWrap: 'wrap' as const,
  },
  calendarEmptyState: {
    paddingVertical: spacing[6],
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  calendarEmptyTitle: {
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing[2],
  },
  calendarEmptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing[4],
  },
  weekStrip: {
    paddingVertical: spacing[2],
  },
  weekDayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    minHeight: 64,
    borderRadius: radius.lg,
    padding: 6,
  },
  weekDayCellSelected: {
    backgroundColor: colors.terracotta[500],
  },
  weekDayCellToday: {
    borderWidth: 2,
    borderColor: colors.terracotta[300],
  },
  weekDayCellLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize' as const,
  },
  weekDayCellNumber: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  weekDayCellNumberSelected: {
    color: colors.text.inverse,
  },
  verificationCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  verificationTitle: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  verificationHelper: {
    color: colors.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  verificationStatus: {
    color: colors.terracotta[600],
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  formErrorInline: {
    color: colors.danger.text,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  eventFormSection: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  eventFormInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    fontSize: 15,
    marginBottom: spacing[3],
  },
  eventFormInputFocus: {
    borderColor: colors.terracotta[400],
  },
  eventFormChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    justifyContent: 'center',
    marginRight: 10,
  },
  eventFormChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  eventFormChipText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  eventFormChipTextActive: {
    color: colors.text.inverse,
  },
  eventScopeCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  eventScopeHelper: {
    color: colors.text.tertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  allDayCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  allDayLabel: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  taskTypeDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  taskTypeDotIcon: {
    fontSize: 16,
    color: colors.text.inverse,
  },
  taskTypeDotGeneral: {
    backgroundColor: colors.sage[400],
  },
  taskOverflowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  taskOverflowBtnText: {
    color: colors.text.tertiary,
    fontSize: 18,
    fontWeight: '800',
  },
  taskCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskCardContent: {
    flex: 1,
    marginLeft: spacing[2],
  },
  taskCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  taskCardTitle: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  taskDateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: 4,
    flexWrap: 'wrap' as const,
  },
  taskDateText: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  taskDateToday: {
    color: colors.terracotta[500],
    fontWeight: '700',
  },
  taskDateOverdue: {
    color: colors.warning.text,
    fontWeight: '700',
  },
  taskOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: 6,
  },
  taskOwnerAvatarSm: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskOwnerAvatarText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '800',
  },
  taskOwnerLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  taskOwnerUnassigned: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  taskPriorityBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.warning.soft,
    borderWidth: 1,
    borderColor: colors.warning.base,
  },
  taskPriorityBadgeCritical: {
    backgroundColor: colors.danger.soft,
    borderColor: colors.danger.base,
  },
  taskPriorityBadgeText: {
    color: colors.warning.text,
    fontSize: 11,
    fontWeight: '800',
  },
  taskPriorityBadgeTextCritical: {
    color: colors.danger.text,
  },
  taskReviewLabel: {
    color: colors.sage[600],
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  taskTypeLabelInline: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  taskSectionHeader: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[1],
  },
  taskSectionHeaderText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  taskTypeFilterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    backgroundColor: colors.surface.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  taskTypeFilterChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  taskTypeFilterChipText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 11,
  },
  taskTypeFilterChipTextActive: {
    color: colors.text.inverse,
  },
  goalCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.card,
  },
  goalCardProgressBar: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
    marginTop: spacing[3],
  },
  goalCardProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.sage[500],
  },
  goalCardProgressFillLow: {
    backgroundColor: colors.warning.base,
  },
  goalCardProgressFillComplete: {
    backgroundColor: colors.success.base,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  goalCardTitle: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  goalCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    flexWrap: 'wrap' as const,
  },
  goalCategoryChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalCategoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  goalProgressLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  goalProgressPercent: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '800',
  },
  goalDetailCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.card,
  },
  goalDetailProgressWrapper: {
    marginTop: spacing[4],
  },
  goalDetailProgressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  goalDetailProgressBar: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
  },
  goalDetailProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.sage[500],
  },
  goalDetailProgressFillLow: {
    backgroundColor: colors.warning.base,
  },
  goalDetailProgressFillComplete: {
    backgroundColor: colors.success.base,
  },
  goalMilestoneCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    ...shadows.card,
  },
  goalMilestoneAchieved: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[100],
  },
  goalMilestoneContent: {
    flex: 1,
  },
  goalMilestoneTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  goalMilestoneTitleAchieved: {
    textDecorationLine: 'line-through' as const,
    color: colors.text.secondary,
  },
  goalDetailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    flexWrap: 'wrap' as const,
  },
  goalDetailPrimaryAction: {
    flex: 1,
    minWidth: 130,
    borderRadius: radius.lg,
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.terracotta[500],
  },
  goalDetailDangerAction: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger.soft,
  },
  goalStatusBadgeActive: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.terracotta[50],
  },
  goalStatusBadgeCompleted: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.success.soft,
  },
  goalStatusBadgeClosed: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.danger.soft,
  },
  goalTaskLinkBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[100],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalTaskLinkBadgeText: {
    color: colors.sage[600],
    fontSize: 10,
    fontWeight: '700',
  },
  goalFormTypeChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surface.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  goalFormTypeChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  goalFormTypeChipText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  goalFormTypeChipTextActive: {
    color: colors.text.inverse,
  },
  goalAtRiskCard: {
    backgroundColor: colors.warning.soft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.warning.base,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  goalHighlightCard: {
    backgroundColor: colors.sage[50],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.sage[100],
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  addMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  addMilestoneInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.text.primary,
    fontSize: 15,
  },
  overflowBackdrop: {
    flex: 1,
    backgroundColor: colors.surface.overlayStrong,
    justifyContent: 'flex-end',
  },
  overflowPanel: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing[5],
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.sheet,
  },
  overflowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  overflowItemText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  overflowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
