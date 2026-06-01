/**
 * @module platform/chrome-storage-adapter
 *
 * {@link IStorageAdapter} implementation backed by the extension's storage
 * (via the `@/platform/storage` helpers). This is the concrete adapter handed
 * to plugins through their {@link PluginContext} so they can persist data
 * without depending on a specific storage mechanism.
 */

import type { IStorageAdapter, StorageEntry } from "@/core/interfaces/storage.interface";
import {
  storageGet,
  storageGetMany,
  storageSet,
  storageSetMany,
  storageRemove,
  storageClear,
} from "@/platform/storage";

/** chrome.storage-backed {@link IStorageAdapter}. */
export class ChromeStorageAdapter implements IStorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    return storageGet<T | null>(key, null);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await storageSet(key, value);
  }

  async remove(key: string): Promise<void> {
    await storageRemove(key);
  }

  async clear(): Promise<void> {
    await storageClear();
  }

  async getMany<T>(keys: readonly string[]): Promise<Map<string, T>> {
    const defaults = Object.fromEntries(keys.map((k) => [k, null]));
    const result = await storageGetMany(defaults);
    const map = new Map<string, T>();
    for (const key of keys) {
      const value = result[key];
      if (value !== null && value !== undefined) {
        map.set(key, value as T);
      }
    }
    return map;
  }

  async setMany<T>(entries: readonly StorageEntry<T>[]): Promise<void> {
    const items: Record<string, unknown> = {};
    for (const { key, value } of entries) {
      items[key] = value;
    }
    await storageSetMany(items);
  }
}
