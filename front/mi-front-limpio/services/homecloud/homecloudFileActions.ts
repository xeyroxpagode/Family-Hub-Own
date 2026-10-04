/**
 * HomeCloud Files — CANONICAL FILE ACTION GRAMMAR.
 *
 * One ordered declaration owns which actions a File has and what each one needs.
 * The per-File action host renders what this resolves to, so there is exactly
 * ONE place where a File operation is named, ordered and capability-gated.
 *
 * SEAMS. `Favorito`, `Abrir` and `Mover a la papelera` are declared here, in
 * their canonical position, and they are NOT rendered: they have no backend, no
 * persistence and no behaviour in this slice. Declaring them here is what makes
 * the later addition a one-line change plus a handler, instead of a redesign of
 * the action surface — and marking them unimplemented is what keeps a fake
 * disabled row from ever being painted for an action that cannot work.
 */

/** `view` = the member may read this File; `organize` = may change where it lives. */
export type HomeCloudFileActionRequirement = 'view' | 'organize' | 'delete';

export type HomeCloudFileActionId =
  | 'info'
  | 'rename'
  | 'move'
  | 'download'
  | 'share'
  | 'favorite'
  | 'open'
  | 'trash';

export interface HomeCloudFileActionDefinition {
  readonly id: HomeCloudFileActionId;
  readonly label: string;
  readonly intent: 'primary' | 'secondary' | 'danger';
  readonly requires: HomeCloudFileActionRequirement;
  /**
   * Whether this action has real behaviour now. A seam is declared but not
   * implemented, and an unimplemented action is never offered.
   */
  readonly implemented: boolean;
}

export const HOMECLOUD_FILE_ACTION_GRAMMAR: readonly HomeCloudFileActionDefinition[] = [
  { id: 'info', label: 'Información', intent: 'primary', requires: 'view', implemented: true },
  { id: 'rename', label: 'Renombrar', intent: 'secondary', requires: 'organize', implemented: true },
  { id: 'move', label: 'Mover', intent: 'secondary', requires: 'organize', implemented: true },
  { id: 'download', label: 'Descargar', intent: 'secondary', requires: 'view', implemented: true },
  { id: 'share', label: 'Compartir', intent: 'secondary', requires: 'view', implemented: true },
  // ── EXTENSION SEAMS ── declared and ordered, never rendered ──
  { id: 'favorite', label: 'Favorito', intent: 'secondary', requires: 'view', implemented: false },
  { id: 'open', label: 'Abrir', intent: 'secondary', requires: 'view', implemented: false },
  { id: 'trash', label: 'Mover a la papelera', intent: 'danger', requires: 'delete', implemented: false },
];

export interface HomeCloudFileActionPermissions {
  readonly view: boolean;
  readonly organize: boolean;
  readonly delete: boolean;
}

export interface HomeCloudFileAction extends HomeCloudFileActionDefinition {
  /**
   * Whether the member may perform it. False keeps the row present but disabled
   * with its reason already stated, which is DENY-SAFE and never silent.
   */
  readonly available: boolean;
}

/**
 * The actions this File actually offers, in canonical order. Unimplemented seams
 * are filtered out here — once, for every consumer — so no caller can render one.
 */
export function resolveFileActions(permissions: HomeCloudFileActionPermissions): HomeCloudFileAction[] {
  return HOMECLOUD_FILE_ACTION_GRAMMAR
    .filter((action) => action.implemented)
    .map((action) => ({
      ...action,
      available: permissions[action.requires] === true,
    }));
}

/** The declared-but-unimplemented ids, for the seam assertions. */
export const HOMECLOUD_FILE_ACTION_SEAMS: readonly HomeCloudFileActionId[] =
  HOMECLOUD_FILE_ACTION_GRAMMAR.filter((action) => !action.implemented).map((action) => action.id);

/** The full vocabulary of a File action, so a handler cannot be attached to nothing. */
export type HomeCloudFileActionHandlerId = HomeCloudFileActionId;
