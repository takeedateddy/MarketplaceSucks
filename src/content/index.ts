/**
 * @module content/index
 *
 * Content script entry point and composition root for MarketplaceSucks.
 *
 * This module bootstraps the entire content-side pipeline:
 *
 * 1. Detects Facebook dark/light mode and injects the correct theme tokens.
 * 2. Creates shared infrastructure (EventBus, registries).
 * 3. Instantiates the ListingObserver, ListingParser, DomInjector,
 *    DomManipulator, and DetailPageEnhancer.
 * 4. Wires the event flow:
 *    `Observer -> Parser -> EventBus -> Filters/Sorters -> DomManipulator`
 * 5. Loads persisted user settings from extension storage.
 * 6. Injects the sidebar toggle button so the user can access controls.
 *
 * All browser API access goes through the `@/platform/` layer. The content
 * script never imports `chrome.*` or `browser.*` directly.
 *
 * @example
 * ```
 * // Loaded by the manifest as a content script on facebook.com/marketplace/*
 * import "@/content/index";
 * ```
 */

import "./styles.css";

import { storageGet, onStorageChanged } from "@/platform/storage";
import { browser } from "@/platform/browser";
import { detectFacebookTheme, observeThemeChanges } from "@/design-system/theme/theme-detector";
import { injectCSSVariables } from "@/design-system/theme/css-variables";
import { EventBus, MPS_EVENTS } from "@/core/utils/event-bus";
import { filterRegistry } from "@/core/filters/filter-registry";
import type { IFilter } from "@/core/interfaces/filter.interface";
import { FilterEngine } from "@/core/filters/filter-engine";
import { KeywordFilter } from "@/core/filters/keyword-filter";
import { KeywordExcludeFilter } from "@/core/filters/keyword-exclude-filter";
import { PriceFilter } from "@/core/filters/price-filter";
import { ConditionFilter } from "@/core/filters/condition-filter";
import { DistanceFilter } from "@/core/filters/distance-filter";
import { DateFilter } from "@/core/filters/date-filter";
import { sortRegistry } from "@/core/sorters/sort-registry";
import { ALL_SORTERS } from "@/core/sorters/sorters";
import { SortEngine } from "@/core/sorters/sort-engine";
import type { Listing } from "@/core/models/listing";

import { ListingObserver } from "@/content/listing-observer";
import { ListingParser } from "@/content/listing-parser";
import { DomInjector } from "@/content/dom-injector";
import { DomManipulator } from "@/content/dom-manipulator";
import { runSelectorHealthCheck } from "@/content/selector-health-checker";
import { DetailPageEnhancer } from "@/content/detail-page-enhancer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Storage key for persisted filter configurations. */
const STORAGE_KEY_FILTERS = "mps:activeFilters";

/** Storage key for the active sort option. */
const STORAGE_KEY_SORT = "mps:activeSort";

/** Storage key for sidebar open/closed state. */
const STORAGE_KEY_SIDEBAR = "mps:sidebarOpen";

/** Console log prefix. */
const LOG_PREFIX = "[MPS]";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** All listings the extension has parsed during this page session. */
const knownListings: Map<string, Listing> = new Map();

/** Currently active filter configs. */
let activeFilters: Map<string, Record<string, unknown>> = new Map();

/** Current sort option ID. */
let activeSortId: string | null = null;

/** Current sort direction. */
let activeSortDirection: "asc" | "desc" = "asc";

/** Cleanup functions for teardown. */
const cleanupFns: Array<() => void> = [];

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Main bootstrap function. Called once when the content script loads.
 */
async function bootstrap(): Promise<void> {
  try {
    console.log(`${LOG_PREFIX} Initializing MarketplaceSucks...`);

    // 1. Theme detection and CSS variable injection
    const theme = detectFacebookTheme();
    injectCSSVariables(theme);
    console.log(`${LOG_PREFIX} Detected theme: ${theme}`);

    // Watch for theme changes
    const stopThemeObserver = observeThemeChanges((newTheme) => {
      injectCSSVariables(newTheme);
      eventBus.emit(MPS_EVENTS.THEME_CHANGED, { theme: newTheme });
      console.log(`${LOG_PREFIX} Theme changed to: ${newTheme}`);
    });
    cleanupFns.push(stopThemeObserver);

    // 2. Shared infrastructure
    // Register all filters
    filterRegistry.register(new KeywordFilter() as unknown as IFilter);
    filterRegistry.register(new KeywordExcludeFilter() as unknown as IFilter);
    filterRegistry.register(new PriceFilter() as unknown as IFilter);
    filterRegistry.register(new ConditionFilter() as unknown as IFilter);
    filterRegistry.register(new DistanceFilter() as unknown as IFilter);
    filterRegistry.register(new DateFilter() as unknown as IFilter);
    console.log(`${LOG_PREFIX} Registered ${filterRegistry.size} filters`);

    // Register all sorters
    for (const sorter of ALL_SORTERS) {
      sortRegistry.register(sorter);
    }
    console.log(`${LOG_PREFIX} Registered ${sortRegistry.size} sorters`);

    const eventBus = new EventBus();
    const filterEngine = new FilterEngine(filterRegistry);
    const sortEngine = new SortEngine(sortRegistry);

    // 3. Content-script components
    const observer = new ListingObserver();
    const parser = new ListingParser();
    const injector = new DomInjector();
    const manipulator = new DomManipulator();
    const detailEnhancer = new DetailPageEnhancer();

    // 4. Wire the event flow
    //    Observer detects new DOM nodes -> Parser extracts Listing data ->
    //    EventBus broadcasts -> Filters/Sorters run -> DomManipulator updates DOM

    observer.onNewListings((elements) => {
      const newListings: Listing[] = [];

      for (const element of elements) {
        try {
          const result = parser.parseOne(element);
          if (result.success && result.listing) {
            const listing = result.listing;

            // Tag the element with the listing ID for later lookups
            if (element instanceof HTMLElement) {
              element.setAttribute("data-mps-listing-id", listing.id);
            }

            // Track listing
            if (!knownListings.has(listing.id)) {
              knownListings.set(listing.id, listing);
              newListings.push(listing);
            }
          }
        } catch (err) {
          console.warn(`${LOG_PREFIX} Error parsing listing element:`, err);
        }
      }

      if (newListings.length > 0) {
        eventBus.emit(MPS_EVENTS.LISTINGS_PARSED, {
          listings: newListings,
          total: knownListings.size,
        });
        console.log(`${LOG_PREFIX} Parsed ${newListings.length} new listings (${knownListings.size} total)`);
        updateStats(Array.from(knownListings.values()));
      }
    });

    // When listings are parsed, apply filters and sorts
    eventBus.on<{ listings: Listing[]; total: number }>(
      MPS_EVENTS.LISTINGS_PARSED,
      () => {
        applyFiltersAndSort(eventBus, filterEngine, sortEngine, manipulator, injector);
      },
    );

    // When settings change, re-apply filters
    eventBus.on(MPS_EVENTS.SETTINGS_CHANGED, () => {
      manipulator.invalidateCache();
      applyFiltersAndSort(eventBus, filterEngine, sortEngine, manipulator, injector);
    });

    // When sidebar is toggled
    eventBus.on<{ open: boolean }>(MPS_EVENTS.SIDEBAR_TOGGLED, ({ open }) => {
      try {
        const sidebar = document.getElementById("mps-sidebar");
        if (sidebar) {
          sidebar.setAttribute("data-mps-open", String(open));
        }

        // Show/hide Facebook's original nav when our sidebar is toggled
        const fbNav = document.querySelector("[data-mps-hidden-nav]") as HTMLElement | null;
        if (fbNav) {
          fbNav.style.display = open ? "none" : "";
        }

        // Persist sidebar state so it reopens after navigation/search
        browser.storage.local.set({ [STORAGE_KEY_SIDEBAR]: open }).catch(() => {});
      } catch (err) {
        console.warn(`${LOG_PREFIX} Error toggling sidebar:`, err);
      }
    });

    // 5. Inject UI elements FIRST (before loading settings, so sidebar exists
    //    when loadSettings emits SIDEBAR_TOGGLED to restore open state)
    injector.injectSidebar();

    // 6. Load persisted settings (may emit SIDEBAR_TOGGLED to reopen sidebar)
    await loadSettings(eventBus);

    // Listen for storage changes from popup/options pages
    const stopStorageListener = onStorageChanged((changes) => {
      try {
        if (changes[STORAGE_KEY_FILTERS]?.newValue) {
          const raw = changes[STORAGE_KEY_FILTERS].newValue as Record<string, Record<string, unknown>>;
          activeFilters = new Map(Object.entries(raw));
          eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "storage" });
        }
        if (changes[STORAGE_KEY_SORT]?.newValue) {
          const sortConfig = changes[STORAGE_KEY_SORT].newValue as { id: string; direction: "asc" | "desc" };
          activeSortId = sortConfig.id;
          activeSortDirection = sortConfig.direction;
          eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "storage" });
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Error processing storage change:`, err);
      }
    });
    cleanupFns.push(stopStorageListener);

    // 7. Wire UI event handlers
    // Wire search box — navigates to Facebook Marketplace search
    const keywordInput = document.getElementById("mps-keyword-input") as HTMLInputElement | null;
    const searchBtn = document.getElementById("mps-search-btn");

    const performSearch = () => {
      const query = keywordInput?.value.trim();
      if (query) {
        // Save sidebar as open so it persists after navigation
        browser.storage.local.set({ [STORAGE_KEY_SIDEBAR]: true }).catch(() => {});
        const searchUrl = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}`;
        window.location.href = searchUrl;
      }
    };

    keywordInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performSearch();
      }
    });

    searchBtn?.addEventListener("click", performSearch);

    // Pre-fill search box from current URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const currentQuery = urlParams.get("query");
    if (currentQuery && keywordInput) {
      keywordInput.value = currentQuery;
    }

    // Wire price filter inputs
    const priceMin = document.getElementById("mps-price-min") as HTMLInputElement | null;
    const priceMax = document.getElementById("mps-price-max") as HTMLInputElement | null;
    const handlePriceChange = () => {
      const rawMin = priceMin?.value ? parseFloat(priceMin.value) : null;
      const rawMax = priceMax?.value ? parseFloat(priceMax.value) : null;
      const min = rawMin !== null && rawMin >= 0 ? rawMin : null;
      const max = rawMax !== null && rawMax >= 0 ? rawMax : null;
      if (min !== null || max !== null) {
        activeFilters.set("price-range", { min, max });
      } else {
        activeFilters.delete("price-range");
      }
      eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "sidebar" });
    };
    priceMin?.addEventListener("input", handlePriceChange);
    priceMax?.addEventListener("input", handlePriceChange);

    // Wire sort dropdown
    const sortSelect = document.getElementById("mps-sort-select") as HTMLSelectElement | null;
    sortSelect?.addEventListener("change", () => {
      const value = sortSelect.value;
      if (value) {
        const [sorterId, direction] = value.split("-") as [string, "asc" | "desc"];
        activeSortId = sorterId;
        activeSortDirection = direction;
      } else {
        activeSortId = null;
      }
      eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "sidebar" });
    });

    // Wire collapse/expand toggle
    const collapseToggle = document.getElementById("mps-collapse-toggle");
    collapseToggle?.addEventListener("click", () => {
      const sidebar = document.getElementById("mps-sidebar");
      if (sidebar) {
        const isCollapsed = sidebar.getAttribute("data-mps-collapsed") === "true";
        sidebar.setAttribute("data-mps-collapsed", String(!isCollapsed));
        // Update toggle icon: « when expanded, » when collapsed
        collapseToggle.innerHTML = isCollapsed ? "&#x00AB;" : "&#x00BB;";
      }
    });

    // Collapsed icon buttons expand the sidebar when clicked
    document.querySelectorAll(".mps-collapsed-icon-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sidebar = document.getElementById("mps-sidebar");
        if (sidebar) {
          sidebar.setAttribute("data-mps-collapsed", "false");
          if (collapseToggle) collapseToggle.innerHTML = "&#x00AB;";
        }
      });
    });

    // Wire clear filters button
    const clearBtn = document.getElementById("mps-clear-filters-btn");
    clearBtn?.addEventListener("click", () => {
      activeFilters.clear();
      activeSortId = null;
      activeSortDirection = "asc";
      // Reset UI inputs
      if (priceMin) priceMin.value = "";
      if (priceMax) priceMax.value = "";
      if (sortSelect) sortSelect.value = "";
      eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "sidebar" });
    });

    // 6b. Listen for messages from popup/background
    //
    // IMPORTANT: Return undefined for messages we don't handle so the
    // browser closes the message channel immediately. Only return a
    // Promise for messages that need an async response.
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (typeof message !== "object" || message === null) return;
      const msg = message as { action?: string };
      if (!msg.action) return;

      switch (msg.action) {
        case "toggle-sidebar": {
          const sidebar = document.getElementById("mps-sidebar");
          if (!sidebar) {
            injector.injectSidebar();
          }
          const isOpen = document.getElementById("mps-sidebar")?.getAttribute("data-mps-open") === "true";
          eventBus.emit(MPS_EVENTS.SIDEBAR_TOGGLED, { open: !isOpen });
          return;
        }
        case "focus-filter": {
          const filterInput = document.querySelector<HTMLInputElement>("[data-mps-filter-input]");
          if (filterInput) filterInput.focus();
          return;
        }
        case "clear-filters": {
          activeFilters.clear();
          eventBus.emit(MPS_EVENTS.SETTINGS_CHANGED, { source: "keyboard" });
          return;
        }
        case "run-selector-health-check": {
          try {
            return Promise.resolve(runSelectorHealthCheck());
          } catch {
            return;
          }
        }
        default:
          return;
      }
    });

    // 7. Start observing
    observer.start();
    detailEnhancer.enhance();

    cleanupFns.push(() => observer.stop());
    cleanupFns.push(() => detailEnhancer.cleanup());
    cleanupFns.push(() => injector.removeAll());
    cleanupFns.push(() => manipulator.resetAll());
    cleanupFns.push(() => eventBus.clear());

    console.log(`${LOG_PREFIX} Initialization complete.`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Fatal error during bootstrap:`, err);
  }
}

// ---------------------------------------------------------------------------
// Filter / sort pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full filter-and-sort pipeline on all known listings and update
 * the DOM accordingly.
 */
function applyFiltersAndSort(
  eventBus: EventBus,
  filterEngine: FilterEngine,
  sortEngine: SortEngine,
  manipulator: DomManipulator,
  _injector: DomInjector, // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  try {
    const allListings = Array.from(knownListings.values());

    // Apply filters
    const filterResult = filterEngine.apply(allListings, activeFilters);

    const hiddenIds = allListings
      .filter((l) => !filterResult.listings.some((fl) => fl.id === l.id))
      .map((l) => l.id);

    manipulator.showAllListings();
    manipulator.hideListings(hiddenIds);

    // Update stats to reflect filtered results
    const hasActiveFilters = activeFilters.size > 0;
    updateStats(
      hasActiveFilters ? filterResult.listings : allListings,
      hasActiveFilters ? allListings.length : undefined,
    );

    eventBus.emit(MPS_EVENTS.LISTINGS_FILTERED, {
      visible: filterResult.listings.length,
      hidden: hiddenIds.length,
      total: allListings.length,
      breakdown: filterResult.breakdown,
    });

    // Apply sort
    if (activeSortId) {
      const sortResult = sortEngine.apply(filterResult.listings, activeSortId, activeSortDirection);
      const orderedIds = sortResult.listings.map((l) => l.id);
      manipulator.reorderListings(orderedIds);

      eventBus.emit(MPS_EVENTS.LISTINGS_SORTED, {
        sorterId: sortResult.sorterId,
        direction: sortResult.direction,
        count: orderedIds.length,
      });
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error applying filters/sort:`, err);
  }
}

/**
 * Update the sidebar stats display.
 * @param listings - The listings to compute stats from (filtered or all)
 * @param totalUnfiltered - If provided, shows "Showing X of Y"
 */
function updateStats(listings: Listing[], totalUnfiltered?: number): void {
  const statsEl = document.getElementById("mps-stats-content");
  const filterStatusEl = document.getElementById("mps-filter-status");
  if (!statsEl) return;

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  const allPrices = listings
    .map((l) => l.price)
    .filter((p): p is number => p !== null && p > 0);
  const count = listings.length;
  const withPrices = allPrices.length;

  if (allPrices.length > 0) {
    const sorted = [...allPrices].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    statsEl.innerHTML = `
      <div><strong>${count}</strong> listings${totalUnfiltered ? ` (of ${totalUnfiltered})` : ''} (${withPrices} with prices)</div>
      <div>Median: <strong>${fmt(Math.round(median))}</strong> | Avg: <strong>${fmt(avg)}</strong></div>
      <div>Range: <strong>${fmt(min)}</strong> - <strong>${fmt(max)}</strong></div>
    `;
  } else {
    statsEl.innerHTML = `
      <div><strong>${count}</strong> listings${totalUnfiltered ? ` (of ${totalUnfiltered})` : ''}</div>
      <div style="color: var(--mps-color-text-secondary, #65676b);">No prices extracted yet</div>
    `;
  }

  // Update filter status
  if (filterStatusEl) {
    if (totalUnfiltered && totalUnfiltered > count) {
      filterStatusEl.style.display = "block";
      filterStatusEl.innerHTML = `
        <span style="color: var(--mps-color-primary, #0866ff); font-weight: 600;">
          Showing ${count} of ${totalUnfiltered} listings
        </span>
        <span style="color: var(--mps-color-text-secondary, #65676b);"> (${totalUnfiltered - count} filtered out)</span>
      `;
    } else {
      filterStatusEl.style.display = "none";
    }
  }
}

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

/**
 * Load persisted user settings from extension storage.
 */
async function loadSettings(eventBus: EventBus): Promise<void> {
  try {
    const savedFilters = await storageGet<Record<string, Record<string, unknown>>>(
      STORAGE_KEY_FILTERS,
      {},
    );
    if (savedFilters && typeof savedFilters === "object") {
      activeFilters = new Map(Object.entries(savedFilters));
    }

    const savedSort = await storageGet<{ id: string; direction: "asc" | "desc" } | null>(
      STORAGE_KEY_SORT,
      null,
    );
    if (savedSort) {
      activeSortId = savedSort.id;
      activeSortDirection = savedSort.direction;
    }

    const sidebarOpen = await storageGet<boolean>(STORAGE_KEY_SIDEBAR, false);
    if (sidebarOpen) {
      eventBus.emit(MPS_EVENTS.SIDEBAR_TOGGLED, { open: true });
    }

    console.log(
      `${LOG_PREFIX} Loaded settings: ${activeFilters.size} filters, sort=${activeSortId ?? "none"}`,
    );
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error loading settings from storage:`, err);
  }
}

// ---------------------------------------------------------------------------
// Teardown (for HMR or navigation away)
// ---------------------------------------------------------------------------

/**
 * Clean up all content-script resources.
 *
 * Called when the extension is unloaded or the user navigates away from
 * Marketplace.
 */
function teardown(): void {
  console.log(`${LOG_PREFIX} Tearing down...`);
  for (const fn of cleanupFns) {
    try {
      fn();
    } catch (err) {
      console.warn(`${LOG_PREFIX} Error during teardown:`, err);
    }
  }
  cleanupFns.length = 0;
  knownListings.clear();
  activeFilters.clear();
}

// Expose teardown for programmatic cleanup
(window as unknown as Record<string, unknown>).__mps_teardown = teardown;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

// Wait for the DOM to be ready before bootstrapping
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrap();
  });
} else {
  bootstrap();
}
