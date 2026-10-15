'use strict';

// Test stub for `@react-native-async-storage/async-storage`.
//
// In-memory key/value store. Compiled Planner suites load theme/session context
// modules that read persisted preferences at import time; they only need the
// module to resolve and to behave like a local store.

const store = new Map();

const AsyncStorage = {
  async getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
  async getAllKeys() {
    return Array.from(store.keys());
  },
  async multiGet(keys) {
    return keys.map((key) => [key, store.has(key) ? store.get(key) : null]);
  },
  async multiSet(pairs) {
    for (const [key, value] of pairs) store.set(key, String(value));
  },
  async multiRemove(keys) {
    for (const key of keys) store.delete(key);
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
