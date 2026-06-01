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

import { storageGet, storageSet, onStorageChanged } from "@/platform/storage";
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
import { SellerTrustFilter } from "@/core/filters/seller-trust-filter";
import { PriceRatingFilter } from "@/core/filters/price-rating-filter";
import { ImageFlagFilter } from "@/core/filters/image-flag-filter";
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
import { ContentPersistence } from "@/content/persistence";
import { analyzeListings } from "@/content/analysis-runner";
import { buildBadges } from "@/content/badge-builder";
import { createSidebarController, mountSidebar } from "@/content/sidebar-mount";
import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import { compareListings } from "@/core/analysis/comparison-engine";
import type { ComparisonResult } from "@/core/analysis/comparison-engine";
import {
  extractSellerProfile,
  extractDetailEngagement,
  buildSellerRecord,
} from "@/content/detail-page-parser";
import type { ImageAnalysisResult } from "@/background/image-analysis";
import { PluginManager } from "@/plugins/plugin-manager";
import type { PluginContext } from "@/plugins/plugin.interface";
import { createBuiltinPlugins } from "@/plugins/builtin";
import { ChromeStorageAdapter } from "@/platform/chrome-storage-adapter";
import type { ISorter } from "@/core/interfaces/sorter.interface";
import { DataWorkerClient } from "@/content/data-worker-client";
import { mountComparisonBar } from "@/content/comparison-bar-mount";
import { showOnboardingIfNeeded } from "@/content/onboarding";

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

/**
 * Escape a listing id for safe use inside a CSS attribute selector.
 * Uses the native `CSS.escape` when available, with a conservative fallback.
 */
function cssEscapeId(id: string): string {
  const cssApi = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS;
  if (cssApi?.escape) return cssApi.escape(id);
  return id.replace(/["\\\]]/g, "\\$&");
}

/** Recompute the comparison result from the current selection (needs >= 2). */
function recomputeComparison(): void {
  const selected = Array.from(comparisonSelection)
    .map((id) => knownListings.get(id) as AnalyzedListing | undefined)
    .filter((l): l is AnalyzedListing => l !== undefined);
  comparisonResult = selected.length >= 2 ? compareListings(selected) : null;
}

/** Map of selected listing id -> title, for comparison export/labels. */
function comparisonTitles(): Record<string, string> {
  const titles: Record<string, string> = {};
  for (const id of comparisonSelection) {
    const listing = knownListings.get(id);
    if (listing) titles[id] = listing.title;
  }
  return titles;
}

/** Sync every injected compare button's visual state to the selection. */
function refreshCompareButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".mps-card-compare-btn").forEach((btn) => {
    const id = btn.getAttribute("data-mps-listing-id");
    if (!id) return;
    const selected = comparisonSelection.has(id);
    btn.setAttribute("data-mps-selected", String(selected));
    btn.setAttribute("aria-pressed", String(selected));
    btn.title = selected ? "Remove from comparison" : "Add to comparison";
    btn.textContent = selected ? "✓ Compare" : "+ Compare";
  });
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** All listings the extension has parsed during this page session. */
const knownListings: Map<string, Listing> = new Map();

/** First-observed result position per listing id (1-based), used for heat scoring. */
const listingPositions: Map<string, number> = new Map();

/** Running counter assigning each newly observed listing its result position. */
let positionCounter = 0;

/** Currently active filter configs. */
let activeFilters: Map<string, Record<string, unknown>> = new Map();

/** Current sort option ID. */
let activeSortId: string | null = null;

/** Current sort direction. */
let activeSortDirection: "asc" | "desc" = "asc";

/** Number of listings visible after the most recent filter pass. */
let lastVisibleCount = 0;

/** Maximum listings that can be compared side by side. */
const MAX_COMPARISON = 4;

/** Listing ids currently selected for comparison (insertion order). */
const comparisonSelection = new Set<string>();

/** The most recent comparison result, or null when fewer than 2 are selected. */
let comparisonResult: ComparisonResult | null = null;

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
    filterRegistry.register(new SellerTrustFilter() as unknown as IFilter);
    filterRegistry.register(new PriceRatingFilter() as unknown as IFilter);
    filterRegistry.register(new ImageFlagFilter() as unknown as IFilter);
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

    // Persistence layer (IndexedDB). Best-effort: if it fails to open, the
    // pipeline still runs, just without comparables/history.
    const persistence = new ContentPersistence();
    await persistence.init();
    cleanupFns.push(() => persistence.close());

    // Detail-page enhancer: when a listing detail page loads, parse the seller
    // profile + engagement (only available there), score and persist them so
    // grid listings from the same seller pick up trust/heat.
    const detailEnhancer = new DetailPageEnhancer((listingId) => {
      try {
        const parsed = extractSellerProfile(document);
        if (parsed) persistence.saveSeller(buildSellerRecord(parsed)).catch(() => {});
        const engagement = extractDetailEngagement(document);
        if (engagement) persistence.saveDetailEngagement(listingId, engagement).catch(() => {});
      } catch (err) {
        console.warn(`${LOG_PREFIX} Detail-page parse failed:`, err);
      }
    });

    // Plugin system: register bundled plugins with a context that exposes the
    // event bus, storage, and the filter/sorter registries so plugins can
    // extend the pipeline.
    const pluginManager = new PluginManager();
    const pluginContext: PluginContext = {
      events: eventBus,
      storage: new ChromeStorageAdapter(),
      registerFilter: (filter) => filterRegistry.register(filter as IFilter),
      registerSorter: (sorter) => sortRegistry.register(sorter as ISorter),
    };
    for (const plugin of createBuiltinPlugins()) {
      await pluginManager.register(plugin, pluginContext);
    }
    cleanupFns.push(() => {
      void pluginManager.teardownAll();
    });

    // Data-processing worker: offloads price aggregation from the main thread.
    const dataWorker = new DataWorkerClient();
    cleanupFns.push(() => dataWorker.terminate());

    // Enforce data-retention settings so IndexedDB stays bounded.
    storageGet<{ historyRetentionDays?: number; priceDataRetentionDays?: number }>(
      "mps:settings",
      {},
    )
      .then((s) =>
        persistence.cleanup(s.historyRetentionDays ?? 30, s.priceDataRetentionDays ?? 90),
      )
      .catch(() => {});

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
              listingPositions.set(listing.id, ++positionCounter);
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

    // Optional image analysis: when enabled in settings, ask the background
    // worker (which can fetch+decode cross-origin fbcdn images without canvas
    // tainting) to score each listing's first image, then persist + badge it.
    const requestedImageUrls = new Set<string>();
    const maybeScanImages = async (listings: AnalyzedListing[]): Promise<void> => {
      let settings: { autoScanImages?: boolean };
      try {
        settings = await storageGet<{ autoScanImages?: boolean }>("mps:settings", {});
      } catch {
        return;
      }
      if (!settings.autoScanImages) return;

      let changed = false;
      for (const listing of listings) {
        const url = listing.imageUrls[0];
        if (!url || requestedImageUrls.has(url)) continue;
        requestedImageUrls.add(url);
        try {
          const result = (await browser.runtime.sendMessage({
            action: "analyze-image",
            payload: { url },
          })) as ImageAnalysisResult | null;
          if (!result) continue;

          const flags = [...result.flags];
          const dupes = (await persistence.findImageDuplicates(result.hash)).filter(
            (d) => d.listingId !== listing.id,
          );
          if (dupes.length > 0 && !flags.includes("duplicate")) flags.push("duplicate");

          await persistence.saveImageHash({
            hash: result.hash,
            listingId: listing.id,
            imageUrl: url,
            aiScore: result.aiScore / 100,
            originalityScore: null,
            flags,
            analyzedAt: new Date().toISOString(),
          });

          const current = (knownListings.get(listing.id) as AnalyzedListing | undefined) ?? listing;
          const updated: AnalyzedListing = { ...current, aiImageScore: result.aiScore, imageFlags: flags };
          knownListings.set(listing.id, updated);
          const card = document.querySelector(`[data-mps-listing-id="${cssEscapeId(listing.id)}"]`);
          if (card) injector.injectBadge(card, buildBadges(updated));
          changed = true;
        } catch {
          // best effort
        }
      }
      if (changed) {
        eventBus.emit(MPS_EVENTS.ANALYSIS_COMPLETE, { count: 0, total: knownListings.size });
      }
    };

    // When listings are parsed: persist them, run analysis (price rating, heat,
    // forecast), fold the enriched listings back into `knownListings`, then
    // apply filters/sorts. Newly parsed listings are visible by default, so
    // there is no blank period while the async IndexedDB work completes.
    eventBus.on<{ listings: Listing[]; total: number }>(
      MPS_EVENTS.LISTINGS_PARSED,
      async ({ listings }) => {
        try {
          await persistence.saveListings(listings);
          const analyzed = await analyzeListings(listings, persistence, listingPositions);
          for (const a of analyzed) {
            knownListings.set(a.id, a);
            try {
              const card = document.querySelector(
                `[data-mps-listing-id="${cssEscapeId(a.id)}"]`,
              );
              if (card) {
                injector.injectBadge(card, buildBadges(a));
                injector.injectCompareButton(card, a.id, comparisonSelection.has(a.id));
              }
            } catch (err) {
              console.warn(`${LOG_PREFIX} Badge injection failed for ${a.id}:`, err);
            }
          }
          // Record engagement snapshots *after* analysis so heat velocity
          // compares against the previous observation, not the current one.
          await persistence.saveEngagement(listings);
          eventBus.emit(MPS_EVENTS.ANALYSIS_COMPLETE, {
            count: analyzed.length,
            total: knownListings.size,
          });
          // Fire-and-forget image analysis (no-op unless enabled in settings).
          void maybeScanImages(analyzed);
          // Offload price-stats aggregation to the worker and persist for the popup.
          const prices = Array.from(knownListings.values())
            .map((l) => l.price)
            .filter((p): p is number => p !== null && p > 0);
          dataWorker
            .aggregatePrices(prices)
            .then((stats) => storageSet("mps-price-stats", stats))
            .catch(() => {});
        } catch (err) {
          console.warn(`${LOG_PREFIX} Analysis/persistence error:`, err);
        }
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

    // Comparison selection: card buttons emit COMPARISON_ADDED/REMOVED; these
    // handlers (registered before the React provider mounts, so they run first)
    // maintain the selection set and recompute the result the panel reads.
    eventBus.on<{ listingId: string }>(MPS_EVENTS.COMPARISON_ADDED, ({ listingId }) => {
      if (!comparisonSelection.has(listingId) && comparisonSelection.size >= MAX_COMPARISON) {
        console.warn(`${LOG_PREFIX} Comparison limit (${MAX_COMPARISON}) reached`);
        return;
      }
      comparisonSelection.add(listingId);
      recomputeComparison();
      refreshCompareButtons();
    });
    eventBus.on<{ listingId: string }>(MPS_EVENTS.COMPARISON_REMOVED, ({ listingId }) => {
      comparisonSelection.delete(listingId);
      recomputeComparison();
      refreshCompareButtons();
    });

    // Delegated click handling for per-card compare buttons.
    const onCompareClick = (e: MouseEvent): void => {
      const target = e.target as Element | null;
      const btn = target?.closest?.(".mps-card-compare-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute("data-mps-listing-id");
      if (!id) return;
      eventBus.emit(
        comparisonSelection.has(id)
          ? MPS_EVENTS.COMPARISON_REMOVED
          : MPS_EVENTS.COMPARISON_ADDED,
        { listingId: id },
      );
    };
    document.addEventListener("click", onCompareClick, true);
    cleanupFns.push(() => document.removeEventListener("click", onCompareClick, true));

    // Clicking an analysis badge opens the matching sidebar panel.
    const BADGE_PANEL: Record<string, string> = {
      trust: "trust",
      price: "analytics",
      heat: "heat",
      forecast: "forecast",
      image: "images",
    };
    const onBadgeClick = (e: MouseEvent): void => {
      const target = e.target as Element | null;
      const badge = target?.closest?.(".mps-badge");
      if (!badge) return;
      const type = badge.getAttribute("data-mps-badge-type");
      const panel = type ? BADGE_PANEL[type] : undefined;
      if (!panel) return;
      e.preventDefault();
      e.stopPropagation();
      eventBus.emit(MPS_EVENTS.SIDEBAR_TOGGLED, { open: true });
      document.dispatchEvent(new CustomEvent("mps:open-panel", { detail: { panel } }));
    };
    document.addEventListener("click", onBadgeClick, true);
    cleanupFns.push(() => document.removeEventListener("click", onBadgeClick, true));

    // 5. Inject UI elements FIRST (before loading settings, so sidebar exists
    //    when loadSettings emits SIDEBAR_TOGGLED to restore open state)
    injector.injectSidebar();

    // 5b. Mount the React sidebar into the injected host, replacing the
    //     placeholder vanilla controls, and bridge it to the live pipeline.
    const sidebarController = createSidebarController({
      getListings: () => Array.from(knownListings.values()) as AnalyzedListing[],
      getVisibleCount: () => lastVisibleCount,
      setActiveFilters: (configs) => {
        activeFilters = configs;
        storageSet(STORAGE_KEY_FILTERS, Object.fromEntries(configs)).catch(() => {});
        applyFiltersAndSort(eventBus, filterEngine, sortEngine, manipulator, injector);
      },
      getSort: () => ({ id: activeSortId, direction: activeSortDirection }),
      setSort: (id, direction) => {
        activeSortId = id;
        activeSortDirection = direction;
        storageSet(STORAGE_KEY_SORT, id ? { id, direction } : null).catch(() => {});
        applyFiltersAndSort(eventBus, filterEngine, sortEngine, manipulator, injector);
      },
      persistence,
      getComparison: () => comparisonResult,
      getComparisonTitles: () => comparisonTitles(),
      clearComparison: () => {
        comparisonSelection.clear();
        recomputeComparison();
        refreshCompareButtons();
      },
      subscribe: (event, handler) => eventBus.on(event, handler),
    });
    const sidebarMount = mountSidebar(sidebarController);
    if (sidebarMount) cleanupFns.push(() => sidebarMount.unmount());

    // Mount the bottom comparison bar, reflecting the live selection.
    const comparisonBar = mountComparisonBar({
      getSelectedListings: () =>
        Array.from(comparisonSelection)
          .map((id) => knownListings.get(id))
          .filter((l): l is AnalyzedListing => l !== undefined),
      subscribe: (event, handler) => eventBus.on(event, handler),
      onRemove: (id) => eventBus.emit(MPS_EVENTS.COMPARISON_REMOVED, { listingId: id }),
      onClear: () => {
        for (const id of Array.from(comparisonSelection)) {
          eventBus.emit(MPS_EVENTS.COMPARISON_REMOVED, { listingId: id });
        }
      },
      onCompare: () => eventBus.emit(MPS_EVENTS.SIDEBAR_TOGGLED, { open: true }),
    });
    cleanupFns.push(() => comparisonBar.unmount());

    // Show the first-run onboarding walkthrough (no-op after the first install).
    showOnboardingIfNeeded()
      .then((dismiss) => {
        if (dismiss) cleanupFns.push(dismiss);
      })
      .catch(() => {});

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
    lastVisibleCount = filterResult.listings.length;

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
  listingPositions.clear();
  positionCounter = 0;
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
