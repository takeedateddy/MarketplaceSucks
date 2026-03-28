/**
 * @module platform/storage
 *
 * Typed wrapper around `browser.storage.local` and `browser.storage.sync`.
 *
 * Provides generic get / set / remove / clear helpers so callers never have to
 * deal with the raw key-value record format that the WebExtension storage API
 * expects. All methods are fully typed and will narrow the return value to
 * match the requested key(s).
 */

import { browser } from "./browser";
import type { Storage as WebExtStorage } from "webextension-polyfill";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The two durable storage areas extensions can use. */
export type StorageAreaName = "local" | "sync";

/**
 * A change record emitted by `browser.storage.onChanged`.
 * Values are narrowed to `T` when the caller supplies a type argument.
 */
export interface StorageChange<T = unknown> {
  oldValue?: T;
  newValue?: T;
}

/** Callback shape for storage-change listeners. */
export type StorageChangeListener<T = unknown> = (
  changes: Record<string, StorageChange<T>>,
  areaName: string,
) => void;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Resolve the underlying `browser.storage` area object for a given name.
 *
 * @param area - Which storage area to use.
 * @returns The corresponding `StorageArea` instance.
 */
function getArea(area: StorageAreaName): WebExtStorage.StorageArea {
  return area === "sync" ? browser.storage.sync : browser.storage.local;
}

/**
 * Retrieve a single value from extension storage.
 *
 * @typeParam T - The expected type of the stored value.
 * @param key - The storage key.
 * @param defaultValue - Returned when the key does not exist.
 * @param area - Storage area (defaults to `"local"`).
 * @returns The stored value, or `defaultValue` if absent.
 *
 * @example
 * ```ts
 * const count = await storageGet<number>("filterCount", 0);
 * ```
 */
export async function storageGet<T>(
  key: string,
  defaultValue: T,
  area: StorageAreaName = "local",
): Promise<T> {
  const result = await getArea(area).get({ [key]: defaultValue });
  return result[key] as T;
}

/**
 * Retrieve multiple values from extension storage in a single call.
 *
 * @typeParam T - A record describing the keys and their expected types.
 * @param keysWithDefaults - An object whose keys are storage keys and whose
 *   values are the defaults returned when a key is missing.
 * @param area - Storage area (defaults to `"local"`).
 * @returns A record matching the shape of `keysWithDefaults`.
 *
 * @example
 * ```ts
 * const { theme, lang } = await storageGetMany({ theme: "dark", lang: "en" });
 * ```
 */
export async function storageGetMany<T extends Record<string, unknown>>(
  keysWithDefaults: T,
  area: StorageAreaName = "local",
): Promise<T> {
  const result = await getArea(area).get(keysWithDefaults);
  return result as T;
}

/**
 * Write a single key-value pair to extension storage.
 *
 * @typeParam T - The type of the value being stored.
 * @param key - The storage key.
 * @param value - The value to persist.
 * @param area - Storage area (defaults to `"local"`).
 */
export async function storageSet<T>(
  key: string,
  value: T,
  area: StorageAreaName = "local",
): Promise<void> {
  await getArea(area).set({ [key]: value });
}

/**
 * Write multiple key-value pairs to extension storage in a single call.
 *
 * @param items - An object whose entries will be persisted.
 * @param area - Storage area (defaults to `"local"`).
 */
export async function storageSetMany(
  items: Record<string, unknown>,
  area: StorageAreaName = "local",
): Promise<void> {
  await getArea(area).set(items);
}

/**
 * Remove one or more keys from extension storage.
 *
 * @param keys - A single key or array of keys to delete.
 * @param area - Storage area (defaults to `"local"`).
 */
export async function storageRemove(
  keys: string | string[],
  area: StorageAreaName = "local",
): Promise<void> {
  await getArea(area).remove(typeof keys === "string" ? [keys] : keys);
}

/**
 * Remove **all** keys from the specified storage area.
 *
 * @param area - Storage area (defaults to `"local"`).
 */
export async function storageClear(
  area: StorageAreaName = "local",
): Promise<void> {
  await getArea(area).clear();
}

/**
 * Subscribe to changes in extension storage.
 *
 * @typeParam T - Optional type hint for the changed values.
 * @param listener - Callback invoked whenever storage changes.
 * @returns An unsubscribe function that removes the listener.
 *
 * @example
 * ```ts
 * const off = onStorageChanged<string>((changes, area) => {
 *   if (changes.theme?.newValue) applyTheme(changes.theme.newValue);
 * });
 * // Later…
 * off();
 * ```
 */
export function onStorageChanged<T = unknown>(
  listener: StorageChangeListener<T>,
): () => void {
  const handler = listener as (
    changes: Record<string, WebExtStorage.StorageChange>,
    areaName: string,
  ) => void;

  browser.storage.onChanged.addListener(handler);

  return () => {
    browser.storage.onChanged.removeListener(handler);
  };
}
