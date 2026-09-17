export type PlannerVisualStateKind =
  | 'idle'
  | 'pending'
  | 'in_flight'
  | 'syncing'
  | 'uncertain'
  | 'conflicted'
  | 'confirmed'
  | 'safe_error'
  | 'blocked_by_dependency'
  | 'quarantined'
  | 'initial_skeleton'
  | 'loading'
  | 'refresh_visible'
  | 'empty_dataset'
  | 'empty_filtered'
  | 'stale'
  | 'offline'
  | 'partial_error'
  | 'fatal_error'
  | 'pending_sync'
  | 'retrying'
  | 'conflict'
  | 'inline_validation'
  | 'terminal_submit'
  | 'autosave';

export type PlannerLocalAttentionLevel = 'none' | 'low' | 'medium' | 'high';
export type PlannerVisualEmphasis = 'quiet' | 'subtle' | 'notice' | 'strong';
export type PlannerVisualActionKind =
  | 'none'
  | 'retry'
  | 'review'
  | 'dismiss'
  | 'close'
  | 'wait'
  | 'refetch';

export type PlannerVisualStateDescriptor = {
  readonly kind: PlannerVisualStateKind;
  readonly role: 'status' | 'alert' | 'progressbar';
  readonly message: string;
  readonly title: string;
  readonly emphasis: PlannerVisualEmphasis;
  readonly attention: PlannerLocalAttentionLevel;
  readonly icon: 'check' | 'clock' | 'cloud' | 'cloud_off' | 'sync' | 'warning' | 'info' | 'lock' | 'review';
  readonly primaryAction: PlannerVisualActionKind;
  readonly secondaryAction: PlannerVisualActionKind;
  readonly accessibilityLabel: string;
  readonly reduceMotion: 'none' | 'static_progress' | 'fade_only';
  readonly disappearsWhen:
    | 'immediate'
    | 'next_user_edit'
    | 'authoritative_confirmation'
    | 'reconciliation_finishes'
    | 'manual_dismiss'
    | 'manual_review'
    | 'retry_or_review'
    | 'never_automatic';
  readonly preservesContent: boolean;
  readonly liveRegion: 'none' | 'polite' | 'assertive';
  readonly blocksInteraction: boolean;
  readonly blocksNewActions: boolean;
  readonly canRetry: boolean;
};

type DescriptorInput = Omit<PlannerVisualStateDescriptor, 'accessibilityLabel'> & {
  readonly accessibilityLabel?: string;
};

const CANONICAL_DESCRIPTORS = {
  idle: descriptor({
    kind: 'idle',
    role: 'status',
    title: 'Listo',
    message: 'Listo para continuar.',
    emphasis: 'quiet',
    attention: 'none',
    icon: 'check',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'none',
    disappearsWhen: 'immediate',
    preservesContent: true,
    liveRegion: 'none',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  pending: descriptor({
    kind: 'pending',
    role: 'status',
    title: 'Pendiente',
    message: 'Pendiente de sincronización.',
    emphasis: 'subtle',
    attention: 'low',
    icon: 'clock',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'authoritative_confirmation',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  in_flight: descriptor({
    kind: 'in_flight',
    role: 'progressbar',
    title: 'Guardando',
    message: 'Guardando cambios.',
    emphasis: 'subtle',
    attention: 'low',
    icon: 'sync',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'authoritative_confirmation',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: false,
  }),
  syncing: descriptor({
    kind: 'syncing',
    role: 'status',
    title: 'Sincronizando',
    message: 'Sincronizando cambios.',
    emphasis: 'subtle',
    attention: 'low',
    icon: 'sync',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  uncertain: descriptor({
    kind: 'uncertain',
    role: 'alert',
    title: 'Resultado pendiente',
    message: 'No pudimos confirmar si se guardó.',
    emphasis: 'notice',
    attention: 'high',
    icon: 'review',
    primaryAction: 'review',
    secondaryAction: 'retry',
    reduceMotion: 'fade_only',
    disappearsWhen: 'manual_review',
    preservesContent: true,
    liveRegion: 'assertive',
    blocksInteraction: false,
    blocksNewActions: true,
    canRetry: true,
  }),
  conflicted: descriptor({
    kind: 'conflicted',
    role: 'alert',
    title: 'Revisión necesaria',
    message: 'Revisá los cambios antes de continuar.',
    emphasis: 'strong',
    attention: 'high',
    icon: 'warning',
    primaryAction: 'review',
    secondaryAction: 'retry',
    reduceMotion: 'fade_only',
    disappearsWhen: 'manual_review',
    preservesContent: true,
    liveRegion: 'assertive',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: true,
  }),
  confirmed: descriptor({
    kind: 'confirmed',
    role: 'status',
    title: 'Guardado',
    message: 'Guardado.',
    emphasis: 'quiet',
    attention: 'low',
    icon: 'check',
    primaryAction: 'none',
    secondaryAction: 'dismiss',
    reduceMotion: 'fade_only',
    disappearsWhen: 'manual_dismiss',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  safe_error: descriptor({
    kind: 'safe_error',
    role: 'alert',
    title: 'No se pudo completar',
    message: 'No pudimos completar la acción. Revisá e intentá de nuevo.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'warning',
    primaryAction: 'retry',
    secondaryAction: 'dismiss',
    reduceMotion: 'fade_only',
    disappearsWhen: 'retry_or_review',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: true,
  }),
  blocked_by_dependency: descriptor({
    kind: 'blocked_by_dependency',
    role: 'status',
    title: 'Esperando otro cambio',
    message: 'Se completará cuando termine el cambio anterior.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'lock',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: true,
    canRetry: false,
  }),
  quarantined: descriptor({
    kind: 'quarantined',
    role: 'alert',
    title: 'Revisión necesaria',
    message: 'Encontramos un cambio recuperado que necesita revisión.',
    emphasis: 'strong',
    attention: 'high',
    icon: 'review',
    primaryAction: 'review',
    secondaryAction: 'dismiss',
    reduceMotion: 'fade_only',
    disappearsWhen: 'manual_review',
    preservesContent: true,
    liveRegion: 'assertive',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: false,
  }),
} satisfies Readonly<Record<
  | 'idle'
  | 'pending'
  | 'in_flight'
  | 'syncing'
  | 'uncertain'
  | 'conflicted'
  | 'confirmed'
  | 'safe_error'
  | 'blocked_by_dependency'
  | 'quarantined',
  PlannerVisualStateDescriptor
>>;

const DESCRIPTORS: Readonly<Record<PlannerVisualStateKind, PlannerVisualStateDescriptor>> = {
  ...CANONICAL_DESCRIPTORS,
  initial_skeleton: descriptor({
    kind: 'initial_skeleton',
    role: 'progressbar',
    title: 'Cargando',
    message: 'Cargando.',
    emphasis: 'subtle',
    attention: 'low',
    icon: 'clock',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: false,
    liveRegion: 'none',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: false,
  }),
  loading: descriptor({
    kind: 'loading',
    role: 'progressbar',
    title: 'Cargando',
    message: 'Cargando.',
    emphasis: 'subtle',
    attention: 'low',
    icon: 'clock',
    primaryAction: 'wait',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: false,
    liveRegion: 'polite',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: false,
  }),
  refresh_visible: descriptor({
    kind: 'refresh_visible',
    role: 'status',
    title: 'Actualizando',
    message: 'Actualizando.',
    emphasis: 'quiet',
    attention: 'low',
    icon: 'sync',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  empty_dataset: descriptor({
    kind: 'empty_dataset',
    role: 'status',
    title: 'Sin contenido',
    message: 'Todavía no hay contenido.',
    emphasis: 'quiet',
    attention: 'none',
    icon: 'info',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'none',
    disappearsWhen: 'next_user_edit',
    preservesContent: false,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  empty_filtered: descriptor({
    kind: 'empty_filtered',
    role: 'status',
    title: 'Sin resultados',
    message: 'No hay resultados con estos filtros.',
    emphasis: 'quiet',
    attention: 'none',
    icon: 'info',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'none',
    disappearsWhen: 'next_user_edit',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  stale: descriptor({
    kind: 'stale',
    role: 'status',
    title: 'Datos guardados',
    message: 'Mostrando datos guardados.',
    emphasis: 'subtle',
    attention: 'medium',
    icon: 'cloud',
    primaryAction: 'refetch',
    secondaryAction: 'none',
    reduceMotion: 'fade_only',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: true,
  }),
  offline: descriptor({
    kind: 'offline',
    role: 'status',
    title: 'Sin conexión',
    message: 'Sin conexión. Los cambios quedan pendientes.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'cloud_off',
    primaryAction: 'retry',
    secondaryAction: 'dismiss',
    reduceMotion: 'fade_only',
    disappearsWhen: 'reconciliation_finishes',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: true,
  }),
  partial_error: descriptor({
    kind: 'partial_error',
    role: 'alert',
    title: 'Carga parcial',
    message: 'Parte del contenido no pudo cargarse.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'warning',
    primaryAction: 'retry',
    secondaryAction: 'dismiss',
    reduceMotion: 'fade_only',
    disappearsWhen: 'retry_or_review',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: true,
  }),
  fatal_error: descriptor({
    kind: 'fatal_error',
    role: 'alert',
    title: 'No disponible',
    message: 'No pudimos cargar esta vista.',
    emphasis: 'strong',
    attention: 'high',
    icon: 'warning',
    primaryAction: 'retry',
    secondaryAction: 'close',
    reduceMotion: 'fade_only',
    disappearsWhen: 'retry_or_review',
    preservesContent: false,
    liveRegion: 'assertive',
    blocksInteraction: true,
    blocksNewActions: true,
    canRetry: true,
  }),
  pending_sync: aliasDescriptor('pending_sync', CANONICAL_DESCRIPTORS.pending),
  retrying: descriptor({
    kind: 'retrying',
    role: 'status',
    title: 'Reintentando',
    message: 'Se volverá a intentar.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'sync',
    primaryAction: 'wait',
    secondaryAction: 'review',
    reduceMotion: 'static_progress',
    disappearsWhen: 'authoritative_confirmation',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: true,
    blocksNewActions: false,
    canRetry: false,
  }),
  conflict: aliasDescriptor('conflict', CANONICAL_DESCRIPTORS.conflicted),
  inline_validation: descriptor({
    kind: 'inline_validation',
    role: 'alert',
    title: 'Revisá este campo',
    message: 'Revisá este campo.',
    emphasis: 'notice',
    attention: 'medium',
    icon: 'warning',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'none',
    disappearsWhen: 'next_user_edit',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
  terminal_submit: aliasDescriptor('terminal_submit', CANONICAL_DESCRIPTORS.confirmed),
  autosave: descriptor({
    kind: 'autosave',
    role: 'status',
    title: 'Guardando borrador',
    message: 'Guardando cambios.',
    emphasis: 'quiet',
    attention: 'low',
    icon: 'sync',
    primaryAction: 'none',
    secondaryAction: 'none',
    reduceMotion: 'static_progress',
    disappearsWhen: 'authoritative_confirmation',
    preservesContent: true,
    liveRegion: 'polite',
    blocksInteraction: false,
    blocksNewActions: false,
    canRetry: false,
  }),
};

export const PLANNER_RELIABILITY_CANONICAL_VISUAL_STATES: readonly PlannerVisualStateKind[] = [
  'idle',
  'pending',
  'in_flight',
  'syncing',
  'retrying',
  'uncertain',
  'conflicted',
  'confirmed',
  'offline',
  'safe_error',
  'blocked_by_dependency',
  'quarantined',
];

export function describePlannerVisualState(kind: PlannerVisualStateKind): PlannerVisualStateDescriptor {
  return DESCRIPTORS[kind];
}

export function isHighAttentionPlannerVisualState(kind: PlannerVisualStateKind): boolean {
  return describePlannerVisualState(kind).attention === 'high';
}

function descriptor(input: DescriptorInput): PlannerVisualStateDescriptor {
  return {
    ...input,
    accessibilityLabel: input.accessibilityLabel ?? `${input.title}. ${input.message}`,
  };
}

function aliasDescriptor(
  kind: PlannerVisualStateKind,
  base: PlannerVisualStateDescriptor,
): PlannerVisualStateDescriptor {
  return {
    ...base,
    kind,
  };
}
