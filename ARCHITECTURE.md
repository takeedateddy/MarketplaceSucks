# Architecture

This document describes the internal architecture of MarketplaceSucks: the layer structure, data flow, module responsibilities, interface contracts, and instructions for extending the system.

---

## Table of Contents

- [High-Level Layer Diagram](#high-level-layer-diagram)
- [Data Flow](#data-flow)
- [Module Glossary](#module-glossary)
- [Interface Contracts](#interface-contracts)
- [How to Add a Filter](#how-to-add-a-filter)
- [How to Add an Analyzer](#how-to-add-an-analyzer)
- [How to Add a Sidebar Tab](#how-to-add-a-sidebar-tab)
- [How to Modify the Design System](#how-to-modify-the-design-system)
- [Testing Strategy](#testing-strategy)

---

## High-Level Layer Diagram

Dependencies flow strictly downward. Upper layers import from lower layers, never the reverse. Side modules (design-system, workers, plugins, background) interact through the event bus or platform abstractions.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          ui/                                         │
│  sidebar/   overlays/   popup/   preview/                            │
│  React components that render data and dispatch user actions          │
├──────────────────────────────────────────────────────────────────────┤
│                        content/                                      │
│  listing-observer   listing-parser   dom-manipulator   dom-injector  │
│  detail-page-enhancer   selectors.config   styles.css                │
│  Bridges the Facebook DOM and the core business logic                │
├──────────────────────────────────────────────────────────────────────┤
│                         core/                                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ filters/ │  │ sorters/ │  │ analysis/  │  │ models/          │   │
│  │          │  │          │  │            │  │ interfaces/      │   │
│  │          │  │          │  │            │  │ utils/           │   │
│  └──────────┘  └──────────┘  └────────────┘  └──────────────────┘   │
│  Pure business logic with zero browser dependencies                  │
├──────────────────────────────────────────────────────────────────────┤
│                         data/                                        │
│  db.ts   db-schema.ts   repositories/   migrations/                  │
│  IndexedDB persistence layer                                         │
├──────────────────────────────────────────────────────────────────────┤
│                       platform/                                      │
│  browser.ts   storage.ts   messaging.ts   permissions.ts   tabs.ts   │
│  manifest-helpers.ts                                                 │
│  Abstracts Chrome/Firefox/Edge extension APIs                        │
└──────────────────────────────────────────────────────────────────────┘

Side modules (no strict layer position):

┌───────────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐
│  design-system/   │  │  workers/    │  │  plugins/  │  │ background/│
│  primitives/      │  │  image-      │  │  plugin-   │  │ service-   │
│  composites/      │  │  analysis    │  │  manager   │  │ worker.ts  │
│  tokens/          │  │  data-       │  │  plugin    │  │            │
│  theme/           │  │  processing  │  │  interface │  │            │
│  layouts/         │  │              │  │            │  │            │
└───────────────────┘  └──────────────┘  └────────────┘  └────────────┘
```

---

## Data Flow

This is the complete trace of a listing from DOM appearance to rendered result.

### 1. Scroll and Observe

The user scrolls Facebook Marketplace. Facebook's infinite scroll appends new listing card elements to the DOM.

`ListingObserver` (`src/content/listing-observer.ts`) uses a `MutationObserver` watching the Marketplace results container. DOM mutations are debounced at 100ms to batch rapid insertions.

### 2. Parse

When the observer fires, new elements are passed to the listing parser (`src/content/listing-parser.ts`). The parser uses CSS selectors defined in `src/content/selectors.config.ts` to extract structured data from each listing card DOM element.

The parser produces `ListingInput` objects, which are passed to `createListing()` (`src/core/models/listing.ts`) to build fully normalized `Listing` objects with lowercased titles, tokenized title words, and timestamps.

### 3. Event Bus Broadcast

Parsed listings are emitted on the event bus:

```
eventBus.emit("listings:parsed", parsedListings)
```

The event bus (`src/core/utils/event-bus.ts`) is the central communication backbone. All modules subscribe to events rather than importing each other directly.

### 4. Filter

The filter engine (`src/core/filters/filter-engine.ts`) subscribes to `listings:parsed`. It retrieves all registered filters from the `FilterRegistry`, loads each filter's current configuration, and runs every listing through every enabled filter.

Each filter's `apply()` method returns a `FilterResult` with `keep: boolean` and an optional `reason` string. A listing must pass all enabled filters to survive.

The filter engine emits `listings:filtered` with the surviving listings and the removal reasons.

### 5. Sort

The sort engine (`src/core/sorters/sort-engine.ts`) subscribes to `listings:filtered`. It retrieves the active sorter from the `SortRegistry` and sorts the filtered listings using the sorter's `sort()` comparison function with the user's chosen direction.

The sort engine emits `listings:sorted` with the final ordered array.

### 6. DOM Manipulation

The DOM manipulator (`src/content/dom-manipulator.ts`) subscribes to `listings:sorted`. It hides filtered-out listing cards (via CSS class toggling), reorders the remaining cards in the DOM to match the sort order, and injects analysis badges via the DOM injector (`src/content/dom-injector.ts`).

### 7. Analysis (Parallel)

Analysis engines run in parallel with the filter/sort pipeline. Each analyzer subscribes to `listings:parsed` and processes listings independently:

- **Seller trust** (`seller-trust.ts`) -- computes trust scores, emits `seller:scored`
- **Price rater** (`price-rater.ts`) -- computes price ratings, emits `price:rated`
- **Image analyzer** (`image-analyzer.ts`) -- detects AI images, emits `image:analyzed`
- **Heat tracker** (`heat-tracker.ts`) -- calculates engagement velocity, emits `heat:updated`
- **Sales forecaster** (`sales-forecaster.ts`) -- predicts time to sell
- **Comparison engine** (`comparison-engine.ts`) -- activated on user request
- **Related listings** (`related-listings.ts`) -- finds similar listings
- **Image fingerprint** (`image-fingerprint.ts`) -- perceptual hashing for duplicate detection

Heavy analyzers (those with `isHeavy: true`) are dispatched to Web Workers (`src/workers/`) to avoid blocking the main thread.

### 8. Persistence

The data layer subscribes to relevant events and persists data to IndexedDB:

- `listings` store -- parsed listing records
- `sellers` store -- seller profiles and trust scores
- `imageHashes` store -- perceptual hashes for duplicate detection
- `priceData` store -- historical price data for rating calculations
- `engagement` store -- engagement snapshots over time
- `seenListings` store -- tracking which listings the user has viewed
- `savedSearches` store -- persisted filter/sort combinations

The database schema is defined in `src/data/db-schema.ts`. Repositories in `src/data/repositories/` provide typed CRUD operations over each store.

### 9. UI Update

UI components subscribe to analysis events and re-render:

- `TrustBadge` listens for `seller:scored`
- `PriceRatingBadge` listens for `price:rated`
- `ImageFlagBadge` listens for `image:analyzed`
- `HeatIndicator` listens for `heat:updated`
- `ComparisonBar` listens for `comparison:added`

The sidebar, overlays, and preview components are React components mounted by the DOM injector into shadow DOM containers to avoid style conflicts with Facebook's CSS.

---

## Module Glossary

### platform/

| File | Responsibility |
|------|---------------|
| `browser.ts` | Browser detection, capability flags |
| `storage.ts` | Extension storage abstraction (sync/local) |
| `messaging.ts` | Message passing between content script, service worker, and popup |
| `permissions.ts` | Optional permission requests |
| `tabs.ts` | Tab query and management |
| `manifest-helpers.ts` | Utilities for manifest-version-specific behavior |

### core/filters/

| File | Responsibility |
|------|---------------|
| `filter-engine.ts` | Orchestrates running all filters against listings |
| `filter-registry.ts` | Central registry for filter instances |
| `keyword-filter.ts` | Include-keyword matching |
| `keyword-exclude-filter.ts` | Exclude-keyword matching |
| `price-filter.ts` | Min/max price range |
| `condition-filter.ts` | Item condition filtering |
| `distance-filter.ts` | Distance radius filtering |
| `date-filter.ts` | Posted-date recency filtering |
| `seller-trust-filter.ts` | Filter by seller trust score threshold |
| `price-rating-filter.ts` | Filter by price rating tier |
| `image-flag-filter.ts` | Filter out AI-flagged images |
| `fuzzy-matcher.ts` | Levenshtein/n-gram fuzzy matching utilities |

### core/sorters/

| File | Responsibility |
|------|---------------|
| `sort-engine.ts` | Orchestrates sorting using the active sorter |
| `sort-registry.ts` | Central registry for sorter instances |

### core/analysis/

| File | Responsibility |
|------|---------------|
| `seller-trust.ts` | 6-factor seller trust scoring (0-100) |
| `price-rater.ts` | 7-tier price rating with statistical comparison |
| `image-analyzer.ts` | AI-generated image detection via heuristics |
| `image-fingerprint.ts` | Perceptual hashing for duplicate image detection |
| `heat-tracker.ts` | Engagement velocity tracking |
| `sales-forecaster.ts` | Time-to-sell prediction |
| `comparison-engine.ts` | Side-by-side listing comparison (up to 4) |
| `related-listings.ts` | Similar listing discovery |

### core/models/

| File | Responsibility |
|------|---------------|
| `listing.ts` | `Listing` interface, `createListing()` factory, validators, type guards |
| `seller.ts` | `SellerProfile` interface |
| `price-data.ts` | Price history data model |
| `saved-search.ts` | Saved search/filter preset data model |
| `engagement.ts` | Engagement snapshot data model |

### core/interfaces/

| File | Responsibility |
|------|---------------|
| `filter.interface.ts` | `IFilter<TConfig>` contract, `FilterResult`, `FilterCategory` |
| `sorter.interface.ts` | `ISorter` contract, `SortDirection` |
| `analyzer.interface.ts` | `IAnalyzer<TInput, TOutput>` contract, `AnalysisResult`, `AnalyzerConfidence` |
| `parser.interface.ts` | Parser contract for listing extraction |
| `storage.interface.ts` | `IStorageAdapter` contract for persistence |

### core/utils/

| File | Responsibility |
|------|---------------|
| `event-bus.ts` | Pub/sub event bus with typed event names (`MPS_EVENTS`) |
| `math-utils.ts` | `median`, `mean`, `standardDeviation`, `percentileRank`, `clamp` |
| `text-utils.ts` | Text normalization and comparison utilities |
| `similarity-utils.ts` | String similarity scoring for fuzzy matching |
| `date-utils.ts` | Relative date parsing ("2 hours ago" to timestamp) |

### content/

| File | Responsibility |
|------|---------------|
| `index.ts` | Content script entry point |
| `listing-observer.ts` | `MutationObserver` watching for new listing DOM nodes |
| `listing-parser.ts` | Extracts structured data from listing card DOM elements |
| `selectors.config.ts` | CSS selector constants for Facebook's DOM structure |
| `dom-manipulator.ts` | Hides/reorders listing cards in the DOM |
| `dom-injector.ts` | Injects shadow DOM containers for React UI |
| `detail-page-enhancer.ts` | Adds analysis overlays to individual listing pages |
| `styles.css` | Injected stylesheet for content script additions |

### data/

| File | Responsibility |
|------|---------------|
| `db.ts` | IndexedDB connection management using `idb` library |
| `db-schema.ts` | Database name, version, store names, record interfaces |
| `repositories/` | Typed CRUD repositories for each object store |
| `migrations/` | Schema migration scripts |

### design-system/

| Directory | Contents |
|-----------|---------|
| `primitives/` | `Badge`, `Button`, `Card`, `Checkbox`, `EmptyState`, `Icon`, `Input`, `Modal`, `ProgressBar`, `Select`, `Slider`, `Spinner`, `Tabs`, `Toggle`, `Tooltip` |
| `composites/` | `TrustBadge`, `PriceRatingBadge`, `ImageFlagBadge`, `HeatIndicator`, `ForecastIndicator`, `ConfidenceBar`, `FilterGroup` |
| `tokens/` | `colors`, `spacing`, `typography`, `borders`, `shadows`, `animation`, `breakpoints`, `z-index` |
| `theme/` | `ThemeProvider`, `theme-detector`, `css-variables` |
| `layouts/` | Layout components (grid, flex wrappers) |

### workers/

| File | Responsibility |
|------|---------------|
| `image-analysis.worker.ts` | Runs image heuristics and optional TF.js model off-main-thread |
| `data-processing.worker.ts` | Runs heavy statistical computations off-main-thread |

### plugins/

| File | Responsibility |
|------|---------------|
| `plugin.interface.ts` | `IPlugin` contract and `PluginContext` |
| `plugin-manager.ts` | Plugin lifecycle management (load, initialize, teardown) |

### background/

| File | Responsibility |
|------|---------------|
| `service-worker.ts` | Extension lifecycle events, install/update handling |

---

## Interface Contracts

### IFilter\<TConfig\>

Every filter must implement this interface. The generic `TConfig` parameter defines the filter's configuration shape.

```typescript
interface IFilter<TConfig = Record<string, unknown>> {
  readonly id: string;                     // Unique kebab-case identifier
  readonly displayName: string;            // UI label
  readonly category: FilterCategory;       // "keyword" | "price" | "location" | "condition" | "seller" | "image" | "market" | "date"
  readonly defaultEnabled: boolean;        // On by default for new users?

  apply(listing: Listing, config: TConfig): FilterResult;
  getDefaultConfig(): TConfig;
  validateConfig(config: unknown): config is TConfig;
}

interface FilterResult {
  readonly keep: boolean;
  readonly reason?: string;
}
```

The `FilterRegistry` stores all filter instances by ID. The `FilterEngine` iterates through enabled filters and calls `apply()` on each. A listing is kept only if every enabled filter returns `keep: true`.

### ISorter

```typescript
interface ISorter {
  readonly id: string;                     // Unique kebab-case identifier
  readonly displayName: string;            // UI label
  readonly defaultDirection: SortDirection; // "asc" | "desc"

  sort(a: Listing, b: Listing, direction: SortDirection): number;
}
```

The `SortRegistry` stores all sorter instances. The `SortEngine` uses the active sorter's `sort()` function with `Array.prototype.sort`.

### IAnalyzer\<TInput, TOutput\>

```typescript
interface IAnalyzer<TInput, TOutput> {
  readonly id: string;
  readonly displayName: string;
  readonly isHeavy: boolean;               // True = run in Web Worker

  analyze(input: TInput): Promise<AnalysisResult<TOutput>>;
  analyzeBatch(inputs: readonly TInput[]): Promise<ReadonlyArray<AnalysisResult<TOutput>>>;
  hasMinimumData(input: TInput): boolean;
  getConfidence(input: TInput): AnalyzerConfidence;
}

interface AnalysisResult<TOutput> {
  readonly data: TOutput | null;
  readonly confidence: AnalyzerConfidence;  // "high" | "medium" | "low" | "insufficient"
  readonly analyzerId: string;
  readonly timestamp: number;
}
```

### IPlugin

```typescript
interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;

  initialize(context: PluginContext): Promise<void>;
  teardown(): Promise<void>;
}
```

Plugins receive a `PluginContext` with access to the event bus, storage adapter, and registration functions for filters and sorters.

---

## How to Add a Filter

This is the detailed version with full context on how filters integrate with the system.

### 1. Define Your Config Interface

Every filter has a configuration shape. Define an interface for it. This config is what gets persisted in extension storage and what the UI renders controls for.

```typescript
interface MyFilterConfig {
  enabled: boolean;
  threshold: number;
}
```

### 2. Implement IFilter

Create a class in `src/core/filters/`. Import only from `@/core/` -- filters must have zero browser dependencies.

Key implementation rules:
- `id` must be kebab-case and must never change across versions (it is used as a storage key).
- `apply()` must be a pure function with no side effects.
- `getDefaultConfig()` must return a new object each time (no shared references).
- `validateConfig()` must handle any possible input gracefully -- it receives raw data from storage that may be corrupt or from an older version.

### 3. Register

Add your filter to the registry. The registry makes it discoverable by the filter engine and the UI.

### 4. Test

Write unit tests using Vitest. Use `createListing()` to build test fixtures. Test both the pass case (`keep: true`) and the reject case (`keep: false` with a reason string). Test `validateConfig()` with valid configs, invalid configs, null, undefined, and malformed objects.

### 5. UI (Automatic)

The filter panel in the sidebar auto-generates controls based on registered filters and their categories. If your filter's config shape uses standard types (boolean, number, string), no additional UI work is needed. For complex configs, create a custom `FilterGroup` composite.

---

## How to Add an Analyzer

### 1. Implement IAnalyzer

Create a class in `src/core/analysis/`. Like filters, analyzers must have zero browser dependencies. All input data must be passed in.

Key implementation rules:
- Set `isHeavy: true` if the analysis involves iteration over large datasets, statistical computation, or ML inference. Heavy analyzers are dispatched to Web Workers.
- `analyze()` must always return an `AnalysisResult` even when data is insufficient -- set `data: null` and `confidence: "insufficient"`.
- `analyzeBatch()` should optimize for batch processing when possible (e.g., computing a distribution once across all inputs rather than per-input).
- `hasMinimumData()` is called before `analyze()` to skip unnecessary computation.

### 2. Define Events

Add a new event constant to `MPS_EVENTS` in `src/core/utils/event-bus.ts` for your analyzer's completion event.

### 3. Wire into the Pipeline

Subscribe your analyzer to `listings:parsed` so it runs automatically when new listings appear. Emit your completion event when done.

### 4. Create a Composite

If your analysis needs a visual indicator on listing cards, create a composite component in `src/design-system/composites/`. Subscribe to your analyzer's event in the component to receive results.

### 5. Worker Integration (Heavy Analyzers)

For heavy analyzers, add a message handler in the appropriate worker file (`src/workers/data-processing.worker.ts` or `src/workers/image-analysis.worker.ts`). The main thread sends listing data to the worker, the worker runs the analyzer, and posts back results. The worker communicates via `postMessage`/`onmessage`.

### 6. Persistence

If your analyzer's results should be cached, add a store to `src/data/db-schema.ts` (with a migration in `src/data/migrations/`) and create a repository in `src/data/repositories/`.

---

## How to Add a Sidebar Tab

### 1. Create the Panel Component

Create a new `.tsx` file in `src/ui/sidebar/`. The component should:
- Use design system primitives for all UI elements.
- Subscribe to relevant events from the event bus for data.
- Dispatch user actions through the event bus.
- Handle loading, empty, and error states using `Spinner` and `EmptyState` primitives.

### 2. Register the Tab

Add your tab to the sidebar's tab configuration. Each tab needs an `id`, a `label` for the tab button, and a reference to the panel component.

### 3. Follow the Pattern

The sidebar uses the `Tabs` primitive from the design system. Your panel is rendered as the content of its tab. Keep the panel's layout consistent with existing tabs: use the same spacing tokens, section headers, and card patterns.

### 4. Theme Support

Ensure your panel works in both light and dark mode. Use CSS variables from `@/design-system/theme/css-variables.ts` and test with Facebook's dark mode enabled.

---

## How to Modify the Design System

### Adding a Token

Tokens live in `src/design-system/tokens/`. Each token file exports a typed constant object:

- `colors.ts` -- brand colors, semantic colors, price tier colors
- `spacing.ts` -- spacing scale (4px base grid)
- `typography.ts` -- font sizes, weights, line heights
- `borders.ts` -- border widths and radii
- `shadows.ts` -- elevation shadows
- `animation.ts` -- durations and easing curves
- `breakpoints.ts` -- responsive breakpoints
- `z-index.ts` -- z-index layers

To add a new token, export it from the appropriate file and update the CSS variables in `src/design-system/theme/css-variables.ts`.

### Adding a Primitive

Primitives are low-level, reusable UI atoms in `src/design-system/primitives/`. A primitive:
- Accepts standard HTML attributes plus component-specific props.
- Uses tokens for all visual properties (no hardcoded values).
- Supports theming via CSS variables.
- Is exported from `src/design-system/index.ts`.

### Adding a Composite

Composites are domain-specific components built from primitives. They live in `src/design-system/composites/`. A composite:
- Composes multiple primitives.
- Encapsulates domain logic (e.g., mapping a trust score to a color and label).
- Subscribes to events from the event bus for data.
- Is exported from `src/design-system/index.ts`.

---

## Testing Strategy

### Unit Tests

- **Location:** Co-located with source files or in `__tests__/` subdirectories.
- **Framework:** Vitest with the default configuration.
- **Scope:** Filters, sorters, analyzers, models, and utility functions.
- **Approach:** Test pure logic with `createListing()` fixtures. Verify both positive and negative cases. Test edge cases (null values, empty arrays, malformed input).

### Type Checking

- `pnpm typecheck` runs `tsc --noEmit` across the entire codebase.
- TypeScript strict mode catches most data-shape errors at compile time.
- `validateConfig()` and `validateListing()` provide runtime type safety for data loaded from storage or parsed from the DOM.

### Linting

- `pnpm lint` runs ESLint with TypeScript and React plugins.
- All warnings are treated as errors in CI.

### Manual Testing

- Load the extension in Chrome and Firefox.
- Navigate to Facebook Marketplace.
- Verify that listing observation, filtering, sorting, and analysis work end to end.
- Test with dark mode enabled.
- Test with various search queries and scroll depths.

### What to Test for New Code

| Change type | Required tests |
|-------------|---------------|
| New filter | Unit tests for `apply()`, `getDefaultConfig()`, `validateConfig()` |
| New analyzer | Unit tests for `analyze()`, `hasMinimumData()`, `getConfidence()` |
| New sorter | Unit tests for `sort()` with both directions |
| New utility function | Unit tests for all branches and edge cases |
| New UI component | Manual verification in Chrome and Firefox |
| Platform change | Manual verification on all affected browsers |
| Schema migration | Unit test for migration function, manual verification of upgrade path |
