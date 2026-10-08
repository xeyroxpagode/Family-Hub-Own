/**
 * HomeCloud ST-5 — the SINGLE Memory action authority (pure, no React).
 *
 * One deterministic function decides which actions are available for a given
 * surface / caller / selection. The Viewer `...` menu, the selection action
 * sheet and the Album-context actions all read from THIS function — no
 * duplicated action tables, no global store, no second reducer.
 *
 * Availability is a capability decision, never a role-name decision.
 */

import type { HomeCloudMemoryKind } from './homecloudTypes';

export type MemoryActionSurface = 'viewer' | 'selection';

export type MemoryActionCallerKind =
  | 'root'
  | 'type'
  | 'album'
  | 'resurfacing'
  | 'trash'
  | 'favorites'
  | 'intake'
  | 'camera';

export interface MemoryActionCapabilities {
  readonly view: boolean;
  readonly contribute: boolean;
  readonly organize: boolean;
  readonly delete: boolean;
}

export interface MemoryActionInput {
  readonly surface: MemoryActionSurface;
  /** Viewer source or selection root. Only `album` unlocks remove-from-album. */
  readonly caller: MemoryActionCallerKind;
  readonly selectionCount: number;
  readonly selectedKinds: readonly HomeCloudMemoryKind[];
  /** The open Album when the caller is an Album. Null otherwise. */
  readonly albumIdentity: { readonly id: string } | null;
  /** Favorite state of every selected Memory, in any order. */
  readonly favoriteStates: readonly boolean[];
  readonly capabilities: MemoryActionCapabilities;
}

export type MemoryActionId =
  | 'addToAlbum'
  | 'removeFromAlbum'
  | 'info'
  | 'share'
  | 'copy'
  | 'markFavorite'
  | 'unmarkFavorite';

export interface MemoryAction {
  readonly id: MemoryActionId;
  readonly label: string;
}

export function availableMemoryActions(input: MemoryActionInput): MemoryAction[] {
  const organize = input.capabilities.organize === true;
  const selected = Math.max(0, Math.trunc(input.selectionCount));
  const hasFavorites = input.favoriteStates.some((state) => state === true);
  const hasNonFavorites = input.favoriteStates.some((state) => state !== true);
  const inAlbum = input.caller === 'album' && input.albumIdentity !== null;
  const allWritten = selected > 0
    && input.selectedKinds.length === selected
    && input.selectedKinds.every((kind) => kind === 'written');

  const actions: MemoryAction[] = [];

  if (organize) {
    actions.push({ id: 'addToAlbum', label: 'Agregar a un álbum' });
    if (inAlbum) {
      actions.push({ id: 'removeFromAlbum', label: selectionCountLabel(selected) });
    }
  }

  if (input.surface === 'viewer' && selected === 1) {
    actions.push({ id: 'info', label: 'Información del recuerdo' });
  }

  actions.push({ id: 'share', label: 'Compartir' });

  if (allWritten && input.surface === 'viewer') {
    actions.push({ id: 'copy', label: 'Copiar' });
  }

  if (organize && input.surface === 'selection') {
    // Mixed-state semantics: both actions may be offered together; each only
    // affects the items for which it is meaningful (§22, ST-5 §5). The Viewer
    // surface owns favorites through its star control, not through the menu.
    if (hasNonFavorites) actions.push({ id: 'markFavorite', label: 'Marcar como favorito' });
    if (hasFavorites) actions.push({ id: 'unmarkFavorite', label: 'Quitar de favoritos' });
  }

  return actions;
}

function selectionCountLabel(count: number): string {
  return count === 1 ? 'Quitar del álbum' : `Quitar ${count} del álbum`;
}

/** Label used by both surfaces so the vocabulary never drifts. */
export const MEMORY_ACTION_LABELS: Record<MemoryActionId, string> = {
  addToAlbum: 'Agregar a un álbum',
  removeFromAlbum: 'Quitar del álbum',
  info: 'Información del recuerdo',
  share: 'Compartir',
  copy: 'Copiar',
  markFavorite: 'Marcar como favorito',
  unmarkFavorite: 'Quitar de favoritos',
};
