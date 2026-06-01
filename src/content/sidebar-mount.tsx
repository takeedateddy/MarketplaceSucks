/**
 * @module content/sidebar-mount
 *
 * Mounts the React sidebar (previously orphaned in `ui/sidebar/*`) into the
 * content script's injected sidebar host and bridges it to the running
 * pipeline via a {@link SidebarController}.
 *
 * Responsibilities:
 *  - translate the panel's {@link FilterState} into the filter engine's config
 *    map (and back-fill saved searches / settings via chrome.storage);
 *  - expose live analyzed listings and derived counts to the panels;
 *  - render `<SidebarTabs>` inside `.mps-sidebar-content`, wrapped in the data
 *    provider, replacing the placeholder vanilla controls.
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { SidebarTabs } from "@/ui/sidebar/Sidebar";
import {
  SidebarDataProvider,
  DEFAULT_FILTERS,
  DEFAULT_SETTINGS,
  type SidebarController,
  type FilterState,
  type SavedSearchItem,
  type SettingsState,
  type HistoryEntry,
  type NotificationFrequency,
} from "@/ui/sidebar/sidebar-context";
import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import type { ComparisonResult } from "@/core/analysis/comparison-engine";
import type { ContentPersistence } from "@/content/persistence";
import { storageGet, storageSet } from "@/platform/storage";

/** chrome.storage key shared with the background alert worker. */
const SAVED_SEARCHES_KEY = "mps-saved-searches";
/** chrome.storage key for persisted feature settings. */
const SETTINGS_KEY = "mps:settings";

/** Saved search as persisted: the UI shape plus fields the worker reads. */
interface StoredSavedSearch extends SavedSearchItem {
  filters?: FilterState;
  sortId?: string | null;
  sortDirection?: "asc" | "desc";
  notifications?: { enabled: boolean; frequency: string };
}

/** Best->worst price rating order, used to map tier checkboxes to a floor. */
const RATING_ORDER = [
  "steal",
  "great-deal",
  "good-price",
  "fair-price",
  "above-market",
  "high",
  "overpriced",
];

const DATE_TO_HOURS: Record<string, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

/**
 * Translate the panel's {@link FilterState} into the filter engine's config
 * map (keyed by filter id). Only meaningfully-configured filters are included
 * so unset controls remain no-ops.
 */
export function filterStateToConfigs(
  state: FilterState,
): Map<string, Record<string, unknown>> {
  const configs = new Map<string, Record<string, unknown>>();

  if (state.keywords.trim()) {
    configs.set("keyword-include", { keywords: state.keywords.trim(), fuzzyLevel: "off" });
  }
  if (state.excludeKeywords.trim()) {
    configs.set("keyword-exclude", { keywords: state.excludeKeywords.trim(), fuzzyLevel: "off" });
  }

  const min = state.priceMin ? Number(state.priceMin) : null;
  const max = state.priceMax ? Number(state.priceMax) : null;
  if ((min !== null && !Number.isNaN(min)) || (max !== null && !Number.isNaN(max))) {
    configs.set("price-range", {
      min: min !== null && !Number.isNaN(min) ? min : null,
      max: max !== null && !Number.isNaN(max) ? max : null,
    });
  }

  const distance = state.maxDistance ? Number(state.maxDistance) : null;
  if (distance !== null && !Number.isNaN(distance)) {
    configs.set("distance-radius", { maxDistance: distance });
  }

  const conditions = Object.entries(state.conditions)
    .filter(([, on]) => on)
    .map(([k]) => k);
  if (conditions.length > 0) {
    configs.set("condition", { conditions });
  }

  if (state.datePosted !== "any" && DATE_TO_HOURS[state.datePosted] !== undefined) {
    configs.set("date-posted", { maxAgeHours: DATE_TO_HOURS[state.datePosted] });
  }

  const minTrust = state.minTrustScore ? Number(state.minTrustScore) : 0;
  if (minTrust > 0 && !Number.isNaN(minTrust)) {
    configs.set("seller-trust", { minTrustScore: minTrust });
  }

  if (state.minImageQuality.trim()) {
    configs.set("image-flags", {
      hideAiGenerated: true,
      hideStockPhotos: false,
      onlyOriginal: false,
    });
  }

  const checkedTiers = Object.entries(state.priceRatingTiers)
    .filter(([, on]) => on)
    .map(([k]) => k);
  if (checkedTiers.length > 0) {
    // Map the multi-select tiers to the worst (lowest-quality) checked tier as
    // a minimum-rating floor: keeps everything at least that good.
    const worst = checkedTiers.reduce((acc, t) =>
      RATING_ORDER.indexOf(t) > RATING_ORDER.indexOf(acc) ? t : acc,
    );
    configs.set("price-rating", { minRating: worst, hideOverpriced: false });
  }

  return configs;
}

/** Map a persisted listing record to the history panel's view-model. */
function toHistoryEntry(r: {
  id: string;
  title: string;
  price: number | null;
  imageUrls: string[];
  firstObserved: string;
  lastObserved: string;
}): HistoryEntry {
  return {
    listingId: r.id,
    title: r.title,
    price: r.price,
    imageUrl: r.imageUrls.length > 0 ? r.imageUrls[0] : null,
    firstSeen: Date.parse(r.firstObserved) || 0,
    lastSeen: Date.parse(r.lastObserved) || 0,
    viewCount: 0,
  };
}

/** Dependencies the controller needs from the content-script composition root. */
export interface SidebarMountDeps {
  getListings: () => AnalyzedListing[];
  getVisibleCount: () => number;
  /** Replace the active filter configs, persist, and re-run the pipeline. */
  setActiveFilters: (configs: Map<string, Record<string, unknown>>) => void;
  getSort: () => { id: string | null; direction: "asc" | "desc" };
  /** Set the active sort and re-run the pipeline. */
  setSort: (id: string | null, direction: "asc" | "desc") => void;
  persistence: ContentPersistence;
  /** Current comparison result (null when fewer than 2 are selected). */
  getComparison: () => ComparisonResult | null;
  /** Map of selected listing id -> title. */
  getComparisonTitles: () => Record<string, string>;
  /** Clear the comparison selection. */
  clearComparison: () => void;
  /** Subscribe to a pipeline event; returns an unsubscribe function. */
  subscribe: (event: string, handler: () => void) => () => void;
}

/** Build the {@link SidebarController} that bridges React panels to the pipeline. */
export function createSidebarController(deps: SidebarMountDeps): SidebarController {
  let currentFilterState: FilterState = DEFAULT_FILTERS;

  const applyState = (state: FilterState): void => {
    currentFilterState = state;
    deps.setActiveFilters(filterStateToConfigs(state));
  };

  async function loadStored(): Promise<StoredSavedSearch[]> {
    const list = await storageGet<StoredSavedSearch[]>(SAVED_SEARCHES_KEY, []);
    // Backfill `frequency` for searches saved before it was a first-class field.
    return list.map((s) => ({
      ...s,
      frequency: s.frequency ?? (s.notifications?.frequency as NotificationFrequency) ?? "daily",
    }));
  }
  async function saveStored(list: StoredSavedSearch[]): Promise<StoredSavedSearch[]> {
    await storageSet(SAVED_SEARCHES_KEY, list);
    return list;
  }

  return {
    getAnalyzedListings: () => deps.getListings(),
    getVisibleCount: () => deps.getVisibleCount(),

    getFilterState: () => currentFilterState,
    applyFilterState: applyState,

    getSort: () => deps.getSort(),
    setSort: (id, direction) => deps.setSort(id, direction),

    async loadSavedSearches() {
      return loadStored();
    },
    async addSavedSearch(name: string) {
      const list = await loadStored();
      const item: StoredSavedSearch = {
        id: `search-${Date.now()}`,
        name,
        query: currentFilterState.keywords,
        isPinned: false,
        createdAt: Date.now(),
        lastRunAt: null,
        resultCount: deps.getVisibleCount(),
        frequency: "daily",
        filters: currentFilterState,
        sortId: deps.getSort().id,
        sortDirection: deps.getSort().direction,
        notifications: { enabled: true, frequency: "daily" },
      };
      return saveStored([item, ...list]);
    },
    async deleteSavedSearch(id: string) {
      const list = await loadStored();
      return saveStored(list.filter((s) => s.id !== id));
    },
    async togglePinSavedSearch(id: string) {
      const list = await loadStored();
      return saveStored(
        list.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s)),
      );
    },
    async setSavedSearchFrequency(id: string, frequency: NotificationFrequency) {
      const list = await loadStored();
      return saveStored(
        list.map((s) =>
          s.id === id
            ? {
                ...s,
                frequency,
                // "manual" disables background alerts; anything else enables them.
                notifications: { enabled: frequency !== "manual", frequency },
              }
            : s,
        ),
      );
    },
    runSavedSearch(item: SavedSearchItem) {
      const stored = item as StoredSavedSearch;
      applyState(stored.filters ?? { ...DEFAULT_FILTERS, keywords: item.query });
      if (stored.sortId !== undefined) {
        deps.setSort(stored.sortId, stored.sortDirection ?? "asc");
      }
      // Record last-run time (best effort).
      loadStored().then((list) =>
        saveStored(list.map((s) => (s.id === item.id ? { ...s, lastRunAt: Date.now() } : s))),
      );
    },
    async exportSavedSearches() {
      return JSON.stringify(await loadStored(), null, 2);
    },
    async importSavedSearches(json: string) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        return loadStored();
      }
      if (!Array.isArray(parsed)) return loadStored();
      const existing = await loadStored();
      const imported = parsed
        .filter((s): s is StoredSavedSearch => !!s && typeof s === "object" && "name" in s)
        // Re-id imported entries to avoid collisions with existing ones.
        .map((s, i) => ({ ...s, id: `import-${Date.now()}-${i}` }));
      return saveStored([...existing, ...imported]);
    },

    async loadSettings() {
      return storageGet<SettingsState>(SETTINGS_KEY, DEFAULT_SETTINGS);
    },
    async saveSettings(settings: SettingsState) {
      await storageSet(SETTINGS_KEY, settings);
    },

    async loadHistory() {
      const records = await deps.persistence.getRecentListings(50);
      return records.map(toHistoryEntry);
    },

    getComparison: () => deps.getComparison(),
    getComparisonTitles: () => deps.getComparisonTitles(),
    clearComparison: () => deps.clearComparison(),

    subscribe: (event, handler) => deps.subscribe(event, handler),
  };
}

/** Handle returned by {@link mountSidebar} for teardown. */
export interface SidebarMountHandle {
  unmount: () => void;
}

/**
 * Render the React sidebar into the injected host's content area, replacing the
 * placeholder vanilla controls. Returns `null` if the host is not present.
 */
export function mountSidebar(controller: SidebarController): SidebarMountHandle | null {
  const content = document.querySelector(".mps-sidebar-content");
  if (!content) return null;

  // Clear the placeholder vanilla controls and host the React root.
  content.innerHTML = "";
  const rootEl = document.createElement("div");
  rootEl.id = "mps-react-root";
  rootEl.style.height = "100%";
  content.appendChild(rootEl);

  const root: Root = createRoot(rootEl);
  root.render(
    <SidebarDataProvider controller={controller}>
      <SidebarTabs />
    </SidebarDataProvider>,
  );

  return { unmount: () => root.unmount() };
}
