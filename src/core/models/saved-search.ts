/**
 * @module core/models/saved-search
 *
 * Defines the {@link SavedSearch} model for persisting a user's search
 * configuration -- query, active filters, sort order, and notification
 * preferences.
 *
 * Saved searches are the primary unit of user-facing state in the extension.
 * They can be re-applied with one click and optionally trigger background
 * notifications when new matching listings appear.
 *
 * @example
 * ```ts
 * import { createSavedSearch, validateSavedSearch } from "@/core/models/saved-search";
 *
 * const search = createSavedSearch({
 *   name: "Cheap iPhones near me",
 *   query: "iphone",
 *   filters: {
 *     "price-range": { min: 100, max: 400 },
 *     "keyword-blocklist": { blockedTerms: ["broken", "cracked"] },
 *   },
 * });
 * ```
 */

import type { SortDirection } from "@/core/interfaces/sorter.interface";

/**
 * How often the extension should check for new results matching a saved
 * search.
 *
 * - `"realtime"` -- checked every time the Marketplace page loads.
 * - `"hourly"` -- checked approximately once per hour via alarms API.
 * - `"daily"` -- checked approximately once per day.
 * - `"manual"` -- only checked when the user explicitly triggers it.
 */
export type NotificationFrequency = "realtime" | "hourly" | "daily" | "manual";

/**
 * Notification settings for a saved search.
 *
 * @example
 * ```ts
 * const settings: NotificationSettings = {
 *   enabled: true,
 *   frequency: "hourly",
 *   showBadge: true,
 *   playSound: false,
 * };
 * ```
 */
export interface NotificationSettings {
  /** Whether notifications are enabled for this saved search. */
  readonly enabled: boolean;

  /** How often to check for new results. */
  readonly frequency: NotificationFrequency;

  /** Whether to show a badge count on the extension icon. */
  readonly showBadge: boolean;

  /** Whether to play an audio notification. */
  readonly playSound: boolean;
}

/**
 * Sort configuration for a saved search.
 *
 * @example
 * ```ts
 * const sort: SavedSearchSort = { sorterId: "price", direction: "asc" };
 * ```
 */
export interface SavedSearchSort {
  /** The {@link ISorter.id} to apply. */
  readonly sorterId: string;

  /** The sort direction. */
  readonly direction: SortDirection;
}

/**
 * A persisted search configuration that the user can re-apply.
 *
 * @example
 * ```ts
 * const search: SavedSearch = {
 *   id: "search-abc123",
 *   name: "Cheap iPhones near me",
 *   query: "iphone",
 *   filters: { "price-range": { min: 100, max: 400 } },
 *   sort: { sorterId: "price", direction: "asc" },
 *   notifications: {
 *     enabled: true,
 *     frequency: "hourly",
 *     showBadge: true,
 *     playSound: false,
 *   },
 *   createdAt: 1711612800000,
 *   updatedAt: 1711612800000,
 *   lastRunAt: null,
 *   resultCount: null,
 *   isPinned: false,
 * };
 * ```
 */
export interface SavedSearch {
  /** Unique identifier for this saved search (UUID). */
  readonly id: string;

  /** User-defined name for this search. */
  readonly name: string;

  /** The search query string. Empty string for browse-all searches. */
  readonly query: string;

  /**
   * Map of filter ID to that filter's configuration object.
   *
   * Only filters that the user has explicitly configured are included.
   * The value type is `Record<string, unknown>` at this level because each
   * filter defines its own config shape via the `IFilter<TConfig>` generic.
   */
  readonly filters: Readonly<Record<string, Record<string, unknown>>>;

  /** The active sort configuration, or `null` for default ordering. */
  readonly sort: SavedSearchSort | null;

  /** Notification preferences for this saved search. */
  readonly notifications: NotificationSettings;

  /** Unix-epoch millisecond timestamp when this search was created. */
  readonly createdAt: number;

  /** Unix-epoch millisecond timestamp when this search was last modified. */
  readonly updatedAt: number;

  /** Unix-epoch millisecond timestamp when this search was last executed. `null` if never. */
  readonly lastRunAt: number | null;

  /** Number of results returned on the last run. `null` if never run. */
  readonly resultCount: number | null;

  /** Whether the user has pinned this search to the top of the list. */
  readonly isPinned: boolean;
}

/**
 * Fields accepted by {@link createSavedSearch}. Only `name` and `query` are
 * required; everything else gets a sensible default.
 *
 * @example
 * ```ts
 * const input: SavedSearchInput = {
 *   name: "Cheap iPhones near me",
 *   query: "iphone",
 *   filters: { "price-range": { min: 100, max: 400 } },
 * };
 * ```
 */
export interface SavedSearchInput {
  /** @see SavedSearch.id */
  readonly id?: string;

  /** @see SavedSearch.name */
  readonly name: string;

  /** @see SavedSearch.query */
  readonly query: string;

  /** @see SavedSearch.filters */
  readonly filters?: Readonly<Record<string, Record<string, unknown>>>;

  /** @see SavedSearch.sort */
  readonly sort?: SavedSearchSort | null;

  /** @see SavedSearch.notifications */
  readonly notifications?: Partial<NotificationSettings>;

  /** @see SavedSearch.isPinned */
  readonly isPinned?: boolean;
}

/**
 * Generate a random UUID v4 string.
 *
 * Uses `crypto.randomUUID` when available, otherwise falls back to a
 * simple random hex generator.
 *
 * @returns A UUID v4 string.
 *
 * @example
 * ```ts
 * const id = generateId(); // "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 * ```
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  const hex = (n: number): string =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/**
 * Factory function that creates a {@link SavedSearch} with sensible defaults
 * for any omitted fields.
 *
 * @param input - The partial search data. At minimum, `name` and `query`
 *   must be provided.
 * @returns A complete {@link SavedSearch} object.
 *
 * @example
 * ```ts
 * const search = createSavedSearch({
 *   name: "Cheap iPhones near me",
 *   query: "iphone",
 *   filters: {
 *     "price-range": { min: 100, max: 400 },
 *   },
 * });
 * ```
 */
export function createSavedSearch(input: SavedSearchInput): SavedSearch {
  const now = Date.now();

  return {
    id: input.id ?? generateId(),
    name: input.name,
    query: input.query,
    filters: input.filters ?? {},
    sort: input.sort ?? null,
    notifications: {
      enabled: input.notifications?.enabled ?? false,
      frequency: input.notifications?.frequency ?? "manual",
      showBadge: input.notifications?.showBadge ?? true,
      playSound: input.notifications?.playSound ?? false,
    },
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    resultCount: null,
    isPinned: input.isPinned ?? false,
  };
}

/**
 * Runtime type guard that checks whether an unknown value conforms to the
 * {@link SavedSearch} interface.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a structurally valid {@link SavedSearch}.
 *
 * @example
 * ```ts
 * const raw: unknown = JSON.parse(stored);
 * if (validateSavedSearch(raw)) {
 *   console.log(raw.name);
 * }
 * ```
 */
export function validateSavedSearch(value: unknown): value is SavedSearch {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (typeof obj.query !== "string") return false;
  if (typeof obj.filters !== "object" || obj.filters === null) return false;
  if (typeof obj.isPinned !== "boolean") return false;
  if (typeof obj.createdAt !== "number") return false;
  if (typeof obj.updatedAt !== "number") return false;

  // notifications must be a valid NotificationSettings
  if (typeof obj.notifications !== "object" || obj.notifications === null) return false;
  const notif = obj.notifications as Record<string, unknown>;
  if (typeof notif.enabled !== "boolean") return false;

  const validFrequencies: readonly string[] = ["realtime", "hourly", "daily", "manual"];
  if (typeof notif.frequency !== "string" || !validFrequencies.includes(notif.frequency)) {
    return false;
  }

  if (typeof notif.showBadge !== "boolean") return false;
  if (typeof notif.playSound !== "boolean") return false;

  // sort: null or valid object
  if (obj.sort !== null) {
    if (typeof obj.sort !== "object") return false;
    const sort = obj.sort as Record<string, unknown>;
    if (typeof sort.sorterId !== "string") return false;
    if (sort.direction !== "asc" && sort.direction !== "desc") return false;
  }

  return true;
}
