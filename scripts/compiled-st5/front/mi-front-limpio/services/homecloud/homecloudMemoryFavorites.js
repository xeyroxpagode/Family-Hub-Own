"use strict";
/**
 * HomeCloud ST-5 — batch favorite updates (pure composer, no React).
 *
 * One mutation per contentId (the backend is PATCH per Memory); partial
 * failures are reported honestly and the failed ids remain selectable for
 * retry. Never rewrites `favorite` outside this composer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMemoryFavoriteUpdate = runMemoryFavoriteUpdate;
exports.favoriteTargetsFor = favoriteTargetsFor;
exports.favoriteUpdateSummary = favoriteUpdateSummary;
exports.favoriteMutationMessage = favoriteMutationMessage;
async function runMemoryFavoriteUpdate(input) {
    const committed = [];
    const failures = [];
    const target = input.direction === 'mark';
    for (const contentId of input.contentIds) {
        try {
            await input.mutate(contentId, target);
            committed.push(contentId);
        }
        catch (error) {
            failures.push({
                contentId,
                label: safeLabel(input.labelFor, contentId),
                message: 'No se pudo actualizar favorito.',
            });
        }
    }
    return { committed, failures };
}
/** 'mark' affects non-favorites only; 'unmark' affects favorites only. */
function favoriteTargetsFor(direction, selected) {
    return selected
        .filter((memory) => (direction === 'mark' ? memory.favorite !== true : memory.favorite === true))
        .map((memory) => memory.id);
}
function favoriteUpdateSummary(direction, failureCount, committedCount) {
    if (failureCount === 0) {
        return direction === 'mark' ? 'Agregado a favoritos' : 'Quitado de favoritos';
    }
    if (committedCount === 0) {
        return 'No se pudo actualizar favorito.';
    }
    return direction === 'mark'
        ? `Agregado a favoritos: ${committedCount}. No se pudo actualizar favorito.: ${failureCount}.`
        : `Quitado de favoritos: ${committedCount}. No se pudo actualizar favorito.: ${failureCount}.`;
}
function favoriteMutationMessage(error) {
    return 'No se pudo actualizar favorito.';
}
function safeLabel(labelFor, contentId) {
    try {
        const label = labelFor(contentId);
        return typeof label === 'string' && label.length > 0 ? label : 'Un recuerdo';
    }
    catch {
        return 'Un recuerdo';
    }
}
