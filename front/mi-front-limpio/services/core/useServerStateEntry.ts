import { useCallback, useSyncExternalStore } from 'react';
import type { ServerState, ServerStateEntry, ServerStateKey } from './serverState';

type ObservableServerState = Pick<ServerState, 'getEntry' | 'subscribeKey'>;

/**
 * React bridge for the shared server-state cache. Cache writes already emit
 * changes; consumers must subscribe instead of waiting for navigation/focus to
 * make an optimistic or realtime update visible.
 */
export function useServerStateEntry<T>(
  store: ObservableServerState,
  key: ServerStateKey | null,
): ServerStateEntry<T> | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => key ? store.subscribeKey(key, onStoreChange) : () => {},
    [key, store],
  );
  const getSnapshot = useCallback(
    () => (key ? store.getEntry<T>(key) : null),
    [key, store],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
