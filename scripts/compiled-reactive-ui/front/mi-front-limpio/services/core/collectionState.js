"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertById = upsertById;
exports.removeById = removeById;
/** Returns a new collection only when the visible entity collection changes. */
function upsertById(collection, nextItem) {
    const index = collection.findIndex((item) => item.id === nextItem.id);
    if (index === -1)
        return [...collection, nextItem];
    if (collection[index] === nextItem)
        return collection.slice();
    const next = collection.slice();
    next[index] = nextItem;
    return next;
}
/** Removes an entity without mutating the previous React state snapshot. */
function removeById(collection, id) {
    const index = collection.findIndex((item) => item.id === id);
    return index === -1 ? collection.slice() : collection.filter((item) => item.id !== id);
}
