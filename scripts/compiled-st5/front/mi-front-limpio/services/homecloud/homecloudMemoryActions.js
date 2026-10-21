"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_ACTION_LABELS = void 0;
exports.availableMemoryActions = availableMemoryActions;
function availableMemoryActions(input) {
    const organize = input.capabilities.organize === true;
    const selected = Math.max(0, Math.trunc(input.selectionCount));
    const hasFavorites = input.favoriteStates.some((state) => state === true);
    const hasNonFavorites = input.favoriteStates.some((state) => state !== true);
    const inAlbum = input.caller === 'album' && input.albumIdentity !== null;
    const allWritten = selected > 0
        && input.selectedKinds.length === selected
        && input.selectedKinds.every((kind) => kind === 'written');
    const actions = [];
    if (input.caller === 'trash') {
        if (input.capabilities.contribute)
            actions.push({ id: 'restore', label: 'Restaurar' });
        if (input.capabilities.delete)
            actions.push({ id: 'purge', label: 'Eliminar definitivamente' });
        return actions;
    }
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
        if (hasNonFavorites)
            actions.push({ id: 'markFavorite', label: 'Marcar como favorito' });
        if (hasFavorites)
            actions.push({ id: 'unmarkFavorite', label: 'Quitar de favoritos' });
    }
    if (input.capabilities.contribute) {
        actions.push({ id: 'trash', label: 'Mover a papelera' });
    }
    if (organize && input.caller === 'resurfacing') {
        actions.push({ id: 'hideFromResurfacing', label: 'No mostrar este recuerdo acá' });
    }
    return actions;
}
function selectionCountLabel(count) {
    return count === 1 ? 'Quitar del álbum' : `Quitar ${count} del álbum`;
}
/** Label used by both surfaces so the vocabulary never drifts. */
exports.MEMORY_ACTION_LABELS = {
    addToAlbum: 'Agregar a un álbum',
    removeFromAlbum: 'Quitar del álbum',
    info: 'Información del recuerdo',
    share: 'Compartir',
    copy: 'Copiar',
    markFavorite: 'Marcar como favorito',
    unmarkFavorite: 'Quitar de favoritos',
    trash: 'Mover a papelera',
    restore: 'Restaurar',
    purge: 'Eliminar definitivamente',
    hideFromResurfacing: 'No mostrar este recuerdo acá',
};
