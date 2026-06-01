/**
 * @module ui/sidebar/sidebar-context
 *
 * Single source of truth that connects the React sidebar panels to the running
 * content-script pipeline. Previously every panel held its own mock `useState`
 * and rendered empty/zeroed data; this context replaces that with live data
 * derived from the analyzed listings the pipeline produces.
 *
 * The content script supplies an imperative {@link SidebarController} (its seam
 * onto the filter/sort engines, persistence repositories and event bus). The
 * {@link SidebarDataProvider} subscribes to pipeline events, recomputes the
 * per-panel view-models, and exposes them (plus actions) through
 * {@link useSidebarData}.
 *
 * View-model type definitions live here so panels and the controller share one
 * shape.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { AnalyzedListing } from "@/core/models/analyzed-listing";
import type { ComparisonResult } from "@/core/analysis/comparison-engine";
import type { TrustScoreBreakdown } from "@/core/analysis/seller-trust";
import type { HeatTier } from "@/core/analysis/heat-tracker";
import type { PriceRatingTier } from "@/core/analysis/price-rater";
import { MPS_EVENTS } from "@/core/utils/event-bus";

// ---------------------------------------------------------------------------
// View-model types (shared by panels)
// ---------------------------------------------------------------------------

/** UI filter state edited by the FilterPanel. */
export interface FilterState {
  keywords: string;
  excludeKeywords: string;
  priceMin: string;
  priceMax: string;
  maxDistance: string;
  conditions: Record<string, boolean>;
  datePosted: string;
  minTrustScore: string;
  minImageQuality: string;
  priceRatingTiers: Record<string, boolean>;
}

export const DEFAULT_FILTERS: FilterState = {
  keywords: "",
  excludeKeywords: "",
  priceMin: "",
  priceMax: "",
  maxDistance: "",
  conditions: { new: false, like_new: false, good: false, fair: false, salvage: false },
  datePosted: "any",
  minTrustScore: "",
  minImageQuality: "",
  priceRatingTiers: {
    steal: false,
    "great-deal": false,
    "good-price": false,
    "fair-price": false,
    "above-market": false,
    high: false,
    overpriced: false,
  },
};

export interface PriceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

export type RatingDistribution = Record<PriceRatingTier, number>;

export interface TrustDisplayData {
  sellerName: string;
  score: number;
  tier: string;
  confidence: "high" | "medium" | "low" | "insufficient";
  breakdown: TrustScoreBreakdown;
  factorsWithData: string[];
}

export interface FlaggedImage {
  listingId: string;
  listingTitle: string;
  imageUrl: string;
  classification: string;
  aiScore: number;
  confidence: "high" | "medium" | "low";
  signalCount: number;
  /** Whether an ML model was used for this analysis. */
  mlModelUsed?: boolean;
  /** ML model confidence score (0-1), if a model was used. */
  mlScore?: number;
  /** Inference time in milliseconds. */
  inferenceTimeMs?: number;
}

export interface HeatEntry {
  listingId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  score: number;
  tier: HeatTier;
  saves: number | null;
  comments: number | null;
  views: number | null;
}

export interface ForecastEntry {
  listingId: string;
  title: string;
  price: number | null;
  displayEstimate: string;
  urgency: "act-fast" | "moderate" | "take-your-time";
  confidence: "high" | "medium" | "low" | "insufficient";
  estimatedDays: number;
}

export interface HistoryEntry {
  listingId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  firstSeen: number;
  lastSeen: number;
  viewCount: number;
}

/** Notification cadence for a saved search's alerts. */
export type NotificationFrequency = "realtime" | "hourly" | "daily" | "manual";

export interface SavedSearchItem {
  id: string;
  name: string;
  query: string;
  isPinned: boolean;
  createdAt: number;
  lastRunAt: number | null;
  resultCount: number | null;
  /** Alert cadence; "manual" disables background alerts for this search. */
  frequency: NotificationFrequency;
}

export interface SettingsState {
  theme: "auto" | "light" | "dark";
  hiddenListingBehavior: "hide" | "dim";
  historyRetentionDays: number;
  priceDataRetentionDays: number;
  enableSellerTrust: boolean;
  enablePriceRating: boolean;
  enableImageAnalysis: boolean;
  enableHeatTracking: boolean;
  enableSalesForecast: boolean;
  enableListingHistory: boolean;
  autoScanImages: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  theme: "auto",
  hiddenListingBehavior: "dim",
  historyRetentionDays: 30,
  priceDataRetentionDays: 90,
  enableSellerTrust: true,
  enablePriceRating: true,
  enableImageAnalysis: false,
  enableHeatTracking: true,
  enableSalesForecast: true,
  enableListingHistory: true,
  autoScanImages: false,
};

// ---------------------------------------------------------------------------
// Controller (imperative bridge implemented by the content script)
// ---------------------------------------------------------------------------

/**
 * The content script's seam onto the running pipeline. The provider calls
 * these to read live state and to drive the filter/sort engines and storage.
 */
export interface SidebarController {
  /** Current analyzed listings known to the pipeline. */
  getAnalyzedListings(): AnalyzedListing[];
  /** Number of listings currently visible after filtering. */
  getVisibleCount(): number;

  /** Current filter state (UI shape). */
  getFilterState(): FilterState;
  /** Apply a new filter state: map to engine configs, re-run, persist. */
  applyFilterState(state: FilterState): void;

  /** Current sort id + direction. */
  getSort(): { id: string | null; direction: "asc" | "desc" };
  /** Set the active sort and re-run. */
  setSort(id: string | null, direction: "asc" | "desc"): void;

  loadSavedSearches(): Promise<SavedSearchItem[]>;
  addSavedSearch(name: string): Promise<SavedSearchItem[]>;
  deleteSavedSearch(id: string): Promise<SavedSearchItem[]>;
  togglePinSavedSearch(id: string): Promise<SavedSearchItem[]>;
  setSavedSearchFrequency(id: string, frequency: NotificationFrequency): Promise<SavedSearchItem[]>;
  runSavedSearch(item: SavedSearchItem): void;
  exportSavedSearches(): Promise<string>;
  importSavedSearches(json: string): Promise<SavedSearchItem[]>;

  loadSettings(): Promise<SettingsState>;
  saveSettings(settings: SettingsState): Promise<void>;

  loadHistory(): Promise<HistoryEntry[]>;

  getComparison(): ComparisonResult | null;
  getComparisonTitles(): Record<string, string>;
  clearComparison(): void;

  /** Subscribe to a pipeline event; returns an unsubscribe function. */
  subscribe(event: string, handler: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

const TIER_ORDER: PriceRatingTier[] = [
  "steal",
  "great-deal",
  "good-price",
  "fair-price",
  "above-market",
  "high",
  "overpriced",
];

function emptyDistribution(): RatingDistribution {
  return TIER_ORDER.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {} as RatingDistribution);
}

function computePriceStats(listings: AnalyzedListing[]): PriceStats {
  const prices = listings
    .map((l) => l.price)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return { count: 0, min: 0, max: 0, mean: 0, median: 0 };
  const sum = prices.reduce((a, b) => a + b, 0);
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  return {
    count: prices.length,
    min: prices[0],
    max: prices[prices.length - 1],
    mean: Math.round(sum / prices.length),
    median: Math.round(median),
  };
}

function computeDistribution(listings: AnalyzedListing[]): RatingDistribution {
  const dist = emptyDistribution();
  for (const l of listings) {
    if (l.priceRating && l.priceRating in dist) {
      dist[l.priceRating as PriceRatingTier]++;
    }
  }
  return dist;
}

function priceConfidence(count: number): "high" | "medium" | "low" | "insufficient" {
  if (count >= 20) return "high";
  if (count >= 10) return "medium";
  if (count >= 5) return "low";
  return "insufficient";
}

function heatTierFromScore(score: number): HeatTier {
  if (score >= 80) return "fire";
  if (score >= 60) return "hot";
  if (score >= 30) return "warm";
  return "cool";
}

function forecastUrgency(days: number): "act-fast" | "moderate" | "take-your-time" {
  if (days <= 2) return "act-fast";
  if (days <= 7) return "moderate";
  return "take-your-time";
}

function firstImage(listing: AnalyzedListing): string | null {
  return listing.imageUrls.length > 0 ? listing.imageUrls[0] : null;
}

// ---------------------------------------------------------------------------
// Context value + provider
// ---------------------------------------------------------------------------

/** Everything the panels read and the actions they invoke. */
export interface SidebarData {
  listings: AnalyzedListing[];
  visibleCount: number;

  priceStats: PriceStats;
  ratingDistribution: RatingDistribution;
  priceConfidence: "high" | "medium" | "low" | "insufficient";

  trustList: TrustDisplayData[];
  flaggedImages: FlaggedImage[];
  heatEntries: HeatEntry[];
  forecastEntries: ForecastEntry[];
  historyEntries: HistoryEntry[];

  filterState: FilterState;
  setFilterState: (state: FilterState) => void;

  sort: { id: string | null; direction: "asc" | "desc" };
  setSort: (id: string | null, direction: "asc" | "desc") => void;

  savedSearches: SavedSearchItem[];
  addSavedSearch: (name: string) => void;
  deleteSavedSearch: (id: string) => void;
  togglePinSavedSearch: (id: string) => void;
  setSavedSearchFrequency: (id: string, frequency: NotificationFrequency) => void;
  runSavedSearch: (item: SavedSearchItem) => void;
  exportSavedSearches: () => Promise<string>;
  importSavedSearches: (json: string) => void;

  settings: SettingsState;
  saveSettings: (settings: SettingsState) => void;

  comparison: ComparisonResult | null;
  comparisonTitles: Record<string, string>;
  clearComparison: () => void;
}

const SidebarContext = createContext<SidebarData | null>(null);

/** Access the live sidebar data. Must be used within {@link SidebarDataProvider}. */
export function useSidebarData(): SidebarData {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebarData must be used within a SidebarDataProvider");
  }
  return ctx;
}

/** Props for {@link SidebarDataProvider}. */
export interface SidebarDataProviderProps {
  controller: SidebarController;
  children: ReactNode;
}

/**
 * Provider that wires the panels to the live pipeline through the supplied
 * {@link SidebarController}.
 */
export const SidebarDataProvider: React.FC<SidebarDataProviderProps> = ({
  controller,
  children,
}) => {
  const [listings, setListings] = useState<AnalyzedListing[]>(() =>
    controller.getAnalyzedListings(),
  );
  const [visibleCount, setVisibleCount] = useState(() => controller.getVisibleCount());
  const [filterState, setFilterStateLocal] = useState<FilterState>(() =>
    controller.getFilterState(),
  );
  const [sort, setSortLocal] = useState(() => controller.getSort());
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(() =>
    controller.getComparison(),
  );
  const [comparisonTitles, setComparisonTitles] = useState<Record<string, string>>(() =>
    controller.getComparisonTitles(),
  );

  // Refresh live listings when the pipeline reports analysis or filtering.
  useEffect(() => {
    const refresh = (): void => {
      setListings(controller.getAnalyzedListings());
      setVisibleCount(controller.getVisibleCount());
    };
    const offAnalysis = controller.subscribe(MPS_EVENTS.ANALYSIS_COMPLETE, refresh);
    const offFiltered = controller.subscribe(MPS_EVENTS.LISTINGS_FILTERED, refresh);
    const offComparison = controller.subscribe(MPS_EVENTS.COMPARISON_ADDED, () => {
      setComparison(controller.getComparison());
      setComparisonTitles(controller.getComparisonTitles());
    });
    const offComparisonRemoved = controller.subscribe(MPS_EVENTS.COMPARISON_REMOVED, () => {
      setComparison(controller.getComparison());
      setComparisonTitles(controller.getComparisonTitles());
    });
    refresh();
    return () => {
      offAnalysis();
      offFiltered();
      offComparison();
      offComparisonRemoved();
    };
  }, [controller]);

  // Load async data once.
  useEffect(() => {
    let active = true;
    controller.loadSavedSearches().then((s) => active && setSavedSearches(s));
    controller.loadSettings().then((s) => active && setSettings(s));
    controller.loadHistory().then((h) => active && setHistoryEntries(h));
    return () => {
      active = false;
    };
  }, [controller]);

  // --- Derived view-models ---
  const priceStats = useMemo(() => computePriceStats(listings), [listings]);
  const ratingDistribution = useMemo(() => computeDistribution(listings), [listings]);
  const ratedCount = useMemo(
    () => listings.filter((l) => l.priceRating).length,
    [listings],
  );

  const trustList = useMemo<TrustDisplayData[]>(
    () =>
      listings
        .filter((l) => l.sellerTrustScore !== undefined)
        .map((l) => ({
          sellerName: l.sellerName ?? "Unknown seller",
          score: l.sellerTrustScore as number,
          tier:
            (l.sellerTrustScore as number) >= 80
              ? "trusted"
              : (l.sellerTrustScore as number) >= 60
                ? "moderate"
                : (l.sellerTrustScore as number) >= 40
                  ? "caution"
                  : "low",
          confidence: "low",
          breakdown: {
            accountAge: 0,
            rating: 0,
            ratingVolume: 0,
            profileCompleteness: 0,
            response: 0,
            listingBehavior: 0,
          },
          factorsWithData: [],
        })),
    [listings],
  );

  const flaggedImages = useMemo<FlaggedImage[]>(
    () =>
      listings
        .filter((l) => l.aiImageScore !== undefined || (l.imageFlags?.length ?? 0) > 0)
        .map((l) => ({
          listingId: l.id,
          listingTitle: l.title,
          imageUrl: firstImage(l) ?? "",
          classification:
            (l.aiImageScore ?? 0) > 60
              ? "Likely AI"
              : (l.aiImageScore ?? 0) > 30
                ? "Possibly AI"
                : "Appears Real",
          aiScore: l.aiImageScore ?? 0,
          confidence: "low",
          signalCount: l.imageFlags?.length ?? 0,
        })),
    [listings],
  );

  const heatEntries = useMemo<HeatEntry[]>(
    () =>
      listings
        .filter((l) => l.heatScore !== undefined)
        .map((l) => ({
          listingId: l.id,
          title: l.title,
          price: l.price,
          imageUrl: firstImage(l),
          score: l.heatScore as number,
          tier: heatTierFromScore(l.heatScore as number),
          saves: l.engagement.saves,
          comments: l.engagement.comments,
          views: l.engagement.views,
        }))
        .sort((a, b) => b.score - a.score),
    [listings],
  );

  const forecastEntries = useMemo<ForecastEntry[]>(
    () =>
      listings
        .filter((l) => l.estimatedDaysToSell !== undefined)
        .map((l) => {
          const days = l.estimatedDaysToSell as number;
          return {
            listingId: l.id,
            title: l.title,
            price: l.price,
            displayEstimate: days < 1 ? "Under a day" : `~${Math.round(days)} days`,
            urgency: forecastUrgency(days),
            confidence: "low" as const,
            estimatedDays: days,
          };
        })
        .sort((a, b) => a.estimatedDays - b.estimatedDays),
    [listings],
  );

  // --- Actions ---
  const setFilterState = useCallback(
    (state: FilterState) => {
      setFilterStateLocal(state);
      controller.applyFilterState(state);
    },
    [controller],
  );

  const setSort = useCallback(
    (id: string | null, direction: "asc" | "desc") => {
      setSortLocal({ id, direction });
      controller.setSort(id, direction);
    },
    [controller],
  );

  const addSavedSearch = useCallback(
    (name: string) => {
      controller.addSavedSearch(name).then(setSavedSearches);
    },
    [controller],
  );
  const deleteSavedSearch = useCallback(
    (id: string) => {
      controller.deleteSavedSearch(id).then(setSavedSearches);
    },
    [controller],
  );
  const togglePinSavedSearch = useCallback(
    (id: string) => {
      controller.togglePinSavedSearch(id).then(setSavedSearches);
    },
    [controller],
  );
  const setSavedSearchFrequency = useCallback(
    (id: string, frequency: NotificationFrequency) => {
      controller.setSavedSearchFrequency(id, frequency).then(setSavedSearches);
    },
    [controller],
  );
  const runSavedSearch = useCallback(
    (item: SavedSearchItem) => controller.runSavedSearch(item),
    [controller],
  );
  const exportSavedSearches = useCallback(
    () => controller.exportSavedSearches(),
    [controller],
  );
  const importSavedSearches = useCallback(
    (json: string) => {
      controller.importSavedSearches(json).then(setSavedSearches);
    },
    [controller],
  );
  const saveSettings = useCallback(
    (next: SettingsState) => {
      setSettings(next);
      controller.saveSettings(next);
    },
    [controller],
  );
  const clearComparison = useCallback(() => {
    controller.clearComparison();
    setComparison(controller.getComparison());
    setComparisonTitles(controller.getComparisonTitles());
  }, [controller]);

  const value: SidebarData = {
    listings,
    visibleCount,
    priceStats,
    ratingDistribution,
    priceConfidence: priceConfidence(ratedCount),
    trustList,
    flaggedImages,
    heatEntries,
    forecastEntries,
    historyEntries,
    filterState,
    setFilterState,
    sort,
    setSort,
    savedSearches,
    addSavedSearch,
    deleteSavedSearch,
    togglePinSavedSearch,
    setSavedSearchFrequency,
    runSavedSearch,
    exportSavedSearches,
    importSavedSearches,
    settings,
    saveSettings,
    comparison,
    comparisonTitles,
    clearComparison,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};
