type Identified = { id: string };

/** Returns a new collection only when the visible entity collection changes. */
export function upsertById<T extends Identified>(
  collection: readonly T[],
  nextItem: T,
): T[] {
  const index = collection.findIndex((item) => item.id === nextItem.id);
  if (index === -1) return [...collection, nextItem];
  if (collection[index] === nextItem) return collection.slice();

  const next = collection.slice();
  next[index] = nextItem;
  return next;
}

/** Removes an entity without mutating the previous React state snapshot. */
export function removeById<T extends Identified>(
  collection: readonly T[],
  id: string,
): T[] {
  const index = collection.findIndex((item) => item.id === id);
  return index === -1 ? collection.slice() : collection.filter((item) => item.id !== id);
}
