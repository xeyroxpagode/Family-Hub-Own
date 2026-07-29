export type PlannerVisualStateKind =
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

export type PlannerVisualStateDescriptor = {
  readonly kind: PlannerVisualStateKind;
  readonly role: 'status' | 'alert' | 'progressbar';
  readonly message: string;
  readonly preservesContent: boolean;
  readonly liveRegion: 'none' | 'polite' | 'assertive';
  readonly blocksInteraction: boolean;
  readonly canRetry: boolean;
};

const DESCRIPTORS: Readonly<Record<PlannerVisualStateKind, PlannerVisualStateDescriptor>> = {
  initial_skeleton: descriptor('initial_skeleton', 'progressbar', 'Cargando.', false, 'none', true, false),
  loading: descriptor('loading', 'progressbar', 'Cargando.', false, 'polite', true, false),
  refresh_visible: descriptor('refresh_visible', 'status', 'Actualizando.', true, 'polite', false, false),
  empty_dataset: descriptor('empty_dataset', 'status', 'Todavía no hay contenido.', false, 'polite', false, false),
  empty_filtered: descriptor('empty_filtered', 'status', 'No hay resultados con estos filtros.', true, 'polite', false, false),
  stale: descriptor('stale', 'status', 'Mostrando datos guardados.', true, 'polite', false, true),
  offline: descriptor('offline', 'status', 'Sin conexión.', true, 'polite', false, true),
  partial_error: descriptor('partial_error', 'alert', 'Parte del contenido no pudo cargarse.', true, 'polite', false, true),
  fatal_error: descriptor('fatal_error', 'alert', 'No pudimos cargar esta vista.', false, 'assertive', true, true),
  pending_sync: descriptor('pending_sync', 'status', 'Pendiente de confirmación.', true, 'polite', false, false),
  retrying: descriptor('retrying', 'status', 'Reintentando.', true, 'polite', true, false),
  conflict: descriptor('conflict', 'alert', 'Los datos cambiaron.', true, 'assertive', true, true),
  inline_validation: descriptor('inline_validation', 'alert', 'Revisá este campo.', true, 'polite', false, false),
  terminal_submit: descriptor('terminal_submit', 'status', 'Confirmado.', true, 'polite', false, false),
  autosave: descriptor('autosave', 'status', 'Guardando cambios.', true, 'polite', false, false),
};

export function describePlannerVisualState(kind: PlannerVisualStateKind): PlannerVisualStateDescriptor {
  return DESCRIPTORS[kind];
}

function descriptor(
  kind: PlannerVisualStateKind,
  role: PlannerVisualStateDescriptor['role'],
  message: string,
  preservesContent: boolean,
  liveRegion: PlannerVisualStateDescriptor['liveRegion'],
  blocksInteraction: boolean,
  canRetry: boolean,
): PlannerVisualStateDescriptor {
  return { kind, role, message, preservesContent, liveRegion, blocksInteraction, canRetry };
}
