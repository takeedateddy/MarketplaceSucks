/**
 * @module core/interfaces/storage
 *
 * Defines the {@link IStorageAdapter} contract for persisting extension data.
 *
 * All persistence in the extension flows through this interface so that the
 * underlying storage mechanism (chrome.storage, IndexedDB, in-memory for
 * tests) can be swapped without touching business logic.
 *
 * @example
 * ```ts
 * import type { IStorageAdapter } from "@/core/interfaces/storage.interface";
 *
 * async function loadPreferences(storage: IStorageAdapter): Promise<UserPrefs> {
 *   const prefs = await storage.get<UserPrefs>("user-prefs");
 *   return prefs ?? DEFAULT_PREFS;
 * }
 * ```
 */

/**
 * A key-value pair used in bulk operations.
 *
 * @typeParam T - The type of the stored value.
 *
 * @example
 * ```ts
 * const entries: StorageEntry<string>[] = [
 *   { key: "theme", value: "dark" },
 *   { key: "locale", value: "en-US" },
 * ];
 * ```
 */
export interface StorageEntry<T> {
  /** The storage key. */
  readonly key: string;

  /** The value to store. */
  readonly value: T;
}

/**
 * Contract for a key-value storage backend.
 *
 * All methods are asynchronous to accommodate both synchronous (in-memory)
 * and asynchronous (chrome.storage, IndexedDB) implementations.
 *
 * Keys are plain strings. Values are serialized to JSON internally, so only
 * JSON-serializable types should be stored.
 *
 * @example
 * ```ts
 * const adapter: IStorageAdapter = new ChromeStorageAdapter();
 * await adapter.set("filters.price-range", { min: 10, max: 500 });
 * const config = await adapter.get<{ min: number; max: number }>("filters.price-range");
 * ```
 */
export interface IStorageAdapter {
  /**
   * Retrieve a single value by key.
   *
   * @typeParam T - The expected type of the stored value.
   * @param key - The storage key to look up.
   * @returns The stored value, or `null` if the key does not exist.
   *
   * @example
   * ```ts
   * const theme = await storage.get<string>("theme");
   * ```
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a single key-value pair.
   *
   * Overwrites any existing value at the same key.
   *
   * @typeParam T - The type of the value being stored.
   * @param key   - The storage key.
   * @param value - The value to persist. Must be JSON-serializable.
   *
   * @example
   * ```ts
   * await storage.set("theme", "dark");
   * ```
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Remove a single key and its associated value.
   *
   * No-op if the key does not exist.
   *
   * @param key - The storage key to remove.
   *
   * @example
   * ```ts
   * await storage.remove("theme");
   * ```
   */
  remove(key: string): Promise<void>;

  /**
   * Remove all keys and values from the store.
   *
   * @example
   * ```ts
   * await storage.clear();
   * ```
   */
  clear(): Promise<void>;

  /**
   * Retrieve multiple values by their keys in a single operation.
   *
   * Returns a `Map` keyed by the requested keys. Keys that do not exist in
   * storage are omitted from the result map.
   *
   * @typeParam T - The expected type of all returned values.
   * @param keys  - The storage keys to look up.
   * @returns A map of found key-value pairs.
   *
   * @example
   * ```ts
   * const results = await storage.getMany<string>(["theme", "locale"]);
   * const theme = results.get("theme");
   * ```
   */
  getMany<T>(keys: readonly string[]): Promise<Map<string, T>>;

  /**
   * Store multiple key-value pairs in a single operation.
   *
   * Overwrites any existing values at the same keys.
   *
   * @typeParam T   - The type of the values being stored.
   * @param entries - The key-value pairs to persist.
   *
   * @example
   * ```ts
   * await storage.setMany([
   *   { key: "theme", value: "dark" },
   *   { key: "locale", value: "en-US" },
   * ]);
   * ```
   */
  setMany<T>(entries: readonly StorageEntry<T>[]): Promise<void>;
}
