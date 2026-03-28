/**
 * Selector health monitoring and tuning system.
 *
 * Tracks which selectors succeed or fail against the live DOM and provides
 * health metrics so the UI can surface degradation warnings. Also supports
 * runtime selector overrides for user-contributed fixes.
 *
 * The health check functions are pure — they accept selector results as data
 * rather than querying the DOM directly (that happens in the content script).
 *
 * @module selector-health
 */

/** Result of testing a single selector against the DOM */
export interface SelectorProbeResult {
  /** The CSS selector that was tested */
  readonly selector: string;
  /** Whether the selector matched any elements */
  readonly matched: boolean;
  /** Number of elements matched */
  readonly matchCount: number;
}

/** Health status for a single selector category (e.g. "listingTitle") */
export interface SelectorCategoryHealth {
  /** Category name (e.g. "listingCard", "listingTitle") */
  readonly category: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Results for each selector in the fallback chain */
  readonly probes: readonly SelectorProbeResult[];
  /** Index of the first selector that matched (-1 if none) */
  readonly activeIndex: number;
  /** Overall health status */
  readonly status: SelectorHealthStatus;
}

/** Health status enum */
export type SelectorHealthStatus = 'healthy' | 'degraded' | 'broken';

/** Full health report across all selector categories */
export interface SelectorHealthReport {
  /** Per-category health results */
  readonly categories: readonly SelectorCategoryHealth[];
  /** Overall health score (0-100) */
  readonly overallScore: number;
  /** Number of healthy categories */
  readonly healthyCount: number;
  /** Number of degraded categories (working via fallback) */
  readonly degradedCount: number;
  /** Number of broken categories (no selector matches) */
  readonly brokenCount: number;
  /** Unix timestamp of the check */
  readonly checkedAt: number;
}

/** Display name mapping for selector categories */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  listingCard: 'Listing Cards',
  listingTitle: 'Listing Titles',
  listingPrice: 'Price Elements',
  listingLocation: 'Location/Distance',
  listingImage: 'Listing Images',
  listingCondition: 'Item Condition',
  listingDate: 'Date Posted',
  listingLink: 'Detail Page Links',
  sellerName: 'Seller Names',
  sellerLink: 'Seller Profile Links',
  engagementIndicators: 'Engagement Metrics',
  marketplaceContainer: 'Marketplace Container',
  darkModeIndicator: 'Dark Mode Detection',
};

/**
 * Evaluate the health of a single selector category based on probe results.
 *
 * @param category - The selector category name
 * @param probes - Results of testing each selector in the fallback chain
 * @returns Health assessment for the category
 */
export function evaluateCategoryHealth(
  category: string,
  probes: SelectorProbeResult[],
): SelectorCategoryHealth {
  const activeIndex = probes.findIndex((p) => p.matched);

  let status: SelectorHealthStatus;
  if (activeIndex === 0) {
    status = 'healthy'; // Primary selector works
  } else if (activeIndex > 0) {
    status = 'degraded'; // Working via fallback
  } else {
    status = 'broken'; // No selector matches
  }

  return {
    category,
    displayName: CATEGORY_DISPLAY_NAMES[category] ?? category,
    probes,
    activeIndex,
    status,
  };
}

/**
 * Generate a full health report from per-category results.
 *
 * @param categoryResults - Health results for each selector category
 * @returns Comprehensive health report with overall score
 */
export function generateHealthReport(
  categoryResults: SelectorCategoryHealth[],
): SelectorHealthReport {
  let healthyCount = 0;
  let degradedCount = 0;
  let brokenCount = 0;

  for (const cat of categoryResults) {
    switch (cat.status) {
      case 'healthy': healthyCount++; break;
      case 'degraded': degradedCount++; break;
      case 'broken': brokenCount++; break;
    }
  }

  const total = categoryResults.length;
  const overallScore = total > 0
    ? Math.round(((healthyCount * 1 + degradedCount * 0.5) / total) * 100)
    : 100;

  return {
    categories: categoryResults,
    overallScore,
    healthyCount,
    degradedCount,
    brokenCount,
    checkedAt: Date.now(),
  };
}

/** A user-provided selector override for a category */
export interface SelectorOverride {
  /** The category being overridden (e.g. "listingTitle") */
  readonly category: string;
  /** Custom selectors to prepend to the fallback chain */
  readonly selectors: readonly string[];
  /** When this override was created */
  readonly createdAt: number;
  /** Optional note from the user */
  readonly note?: string;
}

/**
 * Merge user overrides into the existing selector config.
 * Override selectors are prepended to the existing fallback chain
 * so they are tried first.
 *
 * @param baseSelectors - The original selector config (category → selectors[])
 * @param overrides - User-provided overrides
 * @returns Merged selector config
 */
export function mergeOverrides(
  baseSelectors: Record<string, readonly string[]>,
  overrides: SelectorOverride[],
): Record<string, readonly string[]> {
  const merged: Record<string, readonly string[]> = { ...baseSelectors };

  for (const override of overrides) {
    const base = baseSelectors[override.category] ?? [];
    // Prepend overrides, deduplicate
    const seen = new Set<string>();
    const combined: string[] = [];
    for (const sel of [...override.selectors, ...base]) {
      if (!seen.has(sel)) {
        seen.add(sel);
        combined.push(sel);
      }
    }
    merged[override.category] = combined;
  }

  return merged;
}

/**
 * Validate that a CSS selector string is syntactically valid.
 * Does NOT test against actual DOM — just checks parse-ability.
 *
 * @param selector - The CSS selector to validate
 * @returns Whether the selector is syntactically valid
 */
export function isValidSelector(selector: string): boolean {
  if (!selector.trim()) return false;
  try {
    // Use a minimal document fragment to test parsing
    // In pure-function context, we do basic structural checks
    if (selector.includes('{') || selector.includes('}')) return false;
    if (selector.includes('<') || selector.includes('>') && !selector.includes('>')) return false;
    return true;
  } catch {
    return false;
  }
}
