# MarketplaceSucks

**Fix Facebook Marketplace's useless search. Real filters. Real sorting. Results you actually asked for.**

MarketplaceSucks is a browser extension that overhauls Facebook Marketplace with 18+ advanced filters, 10 sort options, seller trust scoring, AI image detection, price intelligence, sales forecasting, and a side-by-side comparison engine -- all running **100% locally** with **zero data collection**.

No accounts. No API keys. No subscriptions. No data leaves your browser. Ever.

---

## Table of Contents

- [Browser Support](#browser-support)
- [Features](#features)
  - [Search and Filtering](#search-and-filtering)
  - [Sorting](#sorting)
  - [Seller Trust Intelligence](#seller-trust-intelligence)
  - [Price Intelligence](#price-intelligence)
  - [Image Authenticity](#image-authenticity)
  - [Market Intelligence](#market-intelligence)
  - [Comparison Engine](#comparison-engine)
  - [Notifications and Alerts](#notifications-and-alerts)
  - [Selector Health Monitoring](#selector-health-monitoring)
  - [Productivity](#productivity)
- [How It Works (No LLM, No Cloud, No API)](#how-it-works-no-llm-no-cloud-no-api)
- [Free vs Pro (Planned)](#free-vs-pro-planned)
- [Installation](#installation)
- [Usage](#usage)
- [Privacy](#privacy)
- [Architecture](#architecture)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome  | Primary -- fully tested (Manifest V3) |
| Firefox | Supported (Manifest V3 + gecko ID) |
| Edge    | Supported (Chromium-based) |
| Brave   | Supported (Chromium-based) |
| Arc     | Supported (Chromium-based) |
| Opera   | Supported (Chromium-based) |

---

## Features

### Search and Filtering

18+ filter types that actually work, unlike Marketplace's built-in options.

- **Keyword include** -- match listings by keywords in titles
- **Keyword exclude** -- block specific terms (no more "ISO" or "wanted" posts)
- **Fuzzy matching** -- catches misspellings and close variations automatically (configurable: off, low, medium, high)
- **Quoted phrases** -- wrap phrases in quotes for exact multi-word matching (e.g. `"mid century"`)
- **Price range** -- set real min/max price boundaries (inclusive)
- **Condition filter** -- filter by New, Like New, Good, Fair, or Salvage
- **Distance filter** -- set a real distance radius in miles
- **Date filter** -- only see listings posted within your timeframe (1h, 24h, 7d, 30d, etc.)
- **Seller trust filter** -- hide listings from sellers below a trust score threshold
- **Price rating filter** -- only show deals rated "Good Price" or better, or hide all overpriced listings
- **Image flag filter** -- hide listings with suspected AI-generated or stock photos
- **Filter presets** -- save and load filter combinations for repeated searches
- **Filter categories** -- filters are organized by keyword, price, location, condition, seller, image, market, and date
- **Sequential pipeline** -- filters apply in sequence with per-filter stats (input count, output count, removed)
- **No-data safety** -- listings with missing fields (no price, no date, no trust score) are **never silently removed** -- they pass through until data is available

### Sorting

10 sort options to put the best results first.

| Sort | Default Direction | Missing Data Handling |
|------|-------------------|----------------------|
| Price | Low to high | null price → treated as $0 |
| Date Posted | Newest first | null date → treated as oldest |
| Distance | Nearest first | null distance → pushed to end |
| Alphabetical | A-Z | — |
| Seller Trust | Highest first | null score → neutral (50) |
| Price Rating | Best deals first | null rating → worst (100) |
| Heat Score | Most popular first | null heat → 0 |
| Selling Speed | Fastest selling first | null estimate → pushed to end |

All sort options support ascending and descending direction. The original array is never mutated.

### Seller Trust Intelligence

Every seller gets a 0-100 trust score computed from 6 weighted factors:

| Factor | Max Points | What It Measures |
|--------|-----------|-----------------|
| Account age | 25 | Older accounts score higher (0/5/10/15/20/25 points at 3mo/6mo/12mo/24mo/60mo thresholds) |
| Star rating | 25 | Average rating from buyer reviews (0 below 3.0, up to 25 at 4.5+) |
| Rating volume | 15 | More reviews = more confidence (3 at zero reviews, 15 at 50+) |
| Profile completeness | 15 | Photo (+5), cover (+3), location (+4), bio (+3) |
| Response rate | 10 | "Very responsive" = 10, "Not responsive" = 0 |
| Listing behavior | 10 | Fewer active listings = higher score (10 at ≤10, down to 2 at 100+) |

**Tiers:** Trusted (80+), Moderate (60-79), Caution (40-59), Low (<40)

**Confidence levels:** High (5+ factors with data), Medium (3-4), Low (1-2), Insufficient (0)

When data for a factor is unavailable, a **neutral midpoint** is used so the score doesn't artificially drop. Every score shows its full breakdown.

### Price Intelligence

7-tier price rating system with transparent reasoning for every score.

| Tier | % of Median | Meaning |
|------|------------|---------|
| Steal | ≤ 40% | Priced way below market |
| Great Deal | 41-70% | Significantly below typical pricing |
| Good Price | 71-90% | Below average, solid price |
| Fair Price | 91-110% | Right around market rate |
| Above Market | 111-130% | Priced above typical |
| High | 131-160% | Noticeably overpriced |
| Overpriced | > 160% | Far above market |

- Requires **5+ comparable listings** to generate a rating (returns nothing if insufficient data)
- Confidence: High (20+ comparables), Medium (10-19), Low (5-9)
- Reasoning text explains exactly which comparisons drove the rating
- Includes percentile rank, median, min/max range, and standard deviation

### Image Authenticity

Detect AI-generated and suspicious listing images using **local heuristics** (no cloud API).

**Heuristic engine (5 signals):**

| Signal | Weight | Triggered When |
|--------|--------|---------------|
| No EXIF metadata | 25 | Real camera photos typically have EXIF; AI images don't |
| AI-typical resolution | 20 | Matches 512x512, 1024x1024, 1024x768, etc. |
| AI-typical aspect ratio | 10 | Matches 1:1, 4:3, 16:9, 9:16 (within 0.02 tolerance) |
| Uniform saturation | 20 | Saturation std dev < 0.1 AND avg saturation > 0.3 |
| Uniform background | 15 | Solid/uniform background detected |

**Score = (triggered weight / total weight) x 100**

**Classification:** Appears Real (≤30), Possibly AI (31-60), Likely AI (>60)

**Image fingerprinting:**
- Perceptual hashing (DCT-based, 32x32 grayscale → 64-bit hash)
- Hamming distance comparison for duplicate detection across listings
- Originality scoring: starts at 50, +15 for environmental context, +15 for multi-angle photos, -15 for white background, -10 for studio lighting, -10 for recompression, -15 per duplicate (capped at -40)

**ML model infrastructure (placeholder):**
- Web Worker pipeline ready for TF.js model loading and inference
- Combined scoring: 70% ML + 30% heuristic when model is available
- Falls back to 100% heuristic when model is not loaded
- All inference runs locally in a Web Worker -- never blocks the UI

### Market Intelligence

- **Heat tracking** -- 4-component scoring (0-100):
  - Absolute engagement: saves, comments, views (0-40 points)
  - Engagement velocity: rate of change vs previous snapshot (0-35 points)
  - Search position: higher position = more heat (0-15 points)
  - Recency boost: new listings with engagement get a bump (0-10 points)
  - **Tiers:** Fire (80+), Hot (60-79), Warm (30-59), Cool (<30)

- **Sales forecasting** -- estimates days to sell using 6 adjustment multipliers on a category base:
  - Price ratio to median (below median sells faster)
  - Heat score (high heat = 0.4x, low heat = 1.5x)
  - Item condition (New = 0.7x, Salvage = 1.5x)
  - Price point ($0 free = 0.5x, >$1000 = 1.5x)
  - Weekend listing (0.9x boost)
  - Seller responsiveness (responsive = 0.8x)
  - Result clamped to 0.25-90 days
  - **Urgency:** Act Fast (≤2 days), Moderate (3-7), Take Your Time (>7)

### Comparison Engine

Compare up to 4 listings side by side across 7 dimensions.

| Dimension | Best = | Missing Value |
|-----------|--------|--------------|
| Price | Lowest | N/A |
| Condition | — (qualitative) | — |
| Distance | Nearest | Unknown |
| Seller Trust | Highest | N/A |
| Price Rating | — (qualitative) | N/A |
| Heat Score | Highest | N/A |
| Shipping | — | No |

- **Recommendation:** listing with most dimension "wins"
- **Auto-generated summary** with per-listing notes (trust ≥80, trust <40, heat ≥60)
- **Export as markdown** -- formatted table with bold best values, recommendation line
- **Export as plain text** -- per-listing summary with winner highlights
- **Copy to clipboard** with 2-second "Copied!" feedback

### Notifications and Alerts

Background alert system for saved search matches and price drops.

- **Saved search alerts:** Background service worker checks every 30 minutes. When new listings match a saved search query, sends a browser notification.
- **Price drop alerts:** Detects price decreases ≥5% on tracked listings. Notification shows previous price, current price, and drop percentage.
- **Badge count:** Red badge on extension icon shows unread notification count.
- **Notification click:** Opens the listing URL in a new tab.
- **Configurable frequency:** Realtime (5 min), Hourly, Daily, or Manual.
- **Notification panel:** Sidebar panel showing notification history with read/unread state, type badges (New Match / Price Drop), and time-ago formatting.

### Selector Health Monitoring

Facebook changes their DOM frequently, which can break the extension's CSS selectors. The health monitoring system catches this.

- **Per-category health check:** Tests all 13 selector categories against the live DOM
- **3 status levels:** Healthy (primary selector works), Degraded (fallback selector works), Broken (no selector matches)
- **Overall health score:** Weighted average (healthy=1.0, degraded=0.5, broken=0.0) × 100
- **User-provided overrides:** Add custom CSS selectors per category when Facebook breaks existing ones -- overrides are prepended to the fallback chain and persisted across sessions
- **Sidebar panel:** Progress bar, per-category breakdown with match counts, expandable selector details

### Productivity

- **Saved searches** -- save filter + sort combinations, reload them instantly
- **Export/import** -- download saved searches as JSON, import on another browser or after reinstall (validates entries, generates new IDs to avoid conflicts)
- **Listing history** -- browse previously viewed listings stored locally
- **Seen tracking** -- listings you've already viewed are marked
- **Keyboard shortcuts:**
  - `Alt+S` -- Toggle sidebar
  - `Alt+F` -- Focus keyword filter input
  - `Alt+C` -- Clear all active filters
- **First-time onboarding** -- 3-step walkthrough on first install (toggle button, filters, intelligence features)
- **All data stored locally** -- IndexedDB stores for listings, sellers, image hashes, price data, engagement snapshots, seen listings, and saved searches
- **Dark mode** -- automatic detection of Facebook's dark mode with full theme switching

---

## How It Works (No LLM, No Cloud, No API)

**MarketplaceSucks uses zero AI services, zero LLMs, and zero external APIs.** Every feature runs locally in your browser using deterministic algorithms:

| Feature | How It Actually Works |
|---------|----------------------|
| **Seller trust** | Weighted sum of 6 hand-tuned factors (account age, ratings, etc.). Pure math. |
| **Price rating** | Statistical comparison (median, mean, std dev, percentile rank) against comparable listings stored in IndexedDB. |
| **"AI" image detection** | 5 heuristic rules checking EXIF metadata, resolution patterns, saturation uniformity, and backgrounds. Weighted sum → 0-100 score. No neural network. |
| **Image fingerprinting** | DCT-based perceptual hashing + Hamming distance. Classic computer vision, not ML. |
| **Sales forecasting** | Category base average × 6 hand-tuned multipliers. No training data, no model. |
| **Heat tracking** | Engagement deltas over time + position + recency. Arithmetic. |
| **Fuzzy matching** | Levenshtein edit distance with configurable threshold. 1965 algorithm. |
| **Related listings** | Jaccard similarity on title tokens + category/price/condition bonuses. Set math. |

The ML model infrastructure exists (Web Worker pipeline, TF.js lazy loading, combined 70/30 scoring) but **no trained model is currently bundled**. The heuristic engine handles everything today.

---

## Free vs Pro (Planned)

The extension is currently **100% free** and will remain open source. A future Pro tier is planned for features that require real ML model inference.

| Feature | Free | Pro (Planned) |
|---------|------|---------------|
| 18+ filters with fuzzy matching | Yes | Yes |
| 10 sort options | Yes | Yes |
| Seller trust scoring (6-factor heuristic) | Yes | Yes |
| Price intelligence (7-tier statistical) | Yes | Yes |
| Image detection (heuristic, 5 signals) | Yes | Yes |
| Image fingerprinting (perceptual hash) | Yes | Yes |
| Heat tracking and sales forecasting | Yes | Yes |
| Comparison engine with export | Yes | Yes |
| Saved searches with notifications | Yes | Yes |
| Selector health monitoring | Yes | Yes |
| Keyboard shortcuts and onboarding | Yes | Yes |
| Dark mode | Yes | Yes |
| Export/import saved searches | Yes | Yes |
| **ML image detection (real TF.js model)** | -- | Planned |
| **Enhanced listing description analysis** | -- | Planned |
| **Cross-session price trend charts** | -- | Planned |
| **Smart deal scoring (multi-factor ML)** | -- | Planned |

The free version uses heuristic algorithms that are fast, transparent, and require zero dependencies. The Pro version will add trained ML models that run locally via TensorFlow.js in a Web Worker -- still no cloud, still no data collection, just better accuracy.

---

## Installation

### From Source

```bash
git clone https://github.com/takeedateddy/MarketplaceSucks.git
cd MarketplaceSucks
pnpm install
pnpm build
```

Then load the extension in your browser:

1. Open `chrome://extensions` (or the equivalent for your browser)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

### Browser-Specific Builds

```bash
pnpm build:chrome    # Default Chrome/Chromium build (Manifest V3)
pnpm build:firefox   # Firefox build
pnpm build:edge      # Edge build
pnpm build:all       # Build for all browsers
```

### Development

```bash
pnpm dev             # Watch mode with hot rebuild (Chrome)
pnpm dev:firefox     # Watch mode for Firefox
```

The extension rebuilds automatically when you save a file. Reload the extension in the browser to pick up changes.

---

## Usage

### Sidebar

Click the MarketplaceSucks toggle button (or press `Alt+S`) on any Facebook Marketplace page to open the sidebar. The sidebar is where you configure filters, change sort order, and view analysis results.

### Filters

Select filters from the sidebar filter panel. Filters are grouped by category (keyword, price, location, condition, seller, image, market, date). Each filter has its own configuration options. Filtered listings are hidden from the Marketplace grid in real time as new listings load via infinite scroll.

### Sorting

Choose a sort option and direction from the sidebar. Listings are reordered in the DOM immediately using CSS order (no DOM node moves, preserves Facebook's internal state).

### Analysis Badges

Analysis badges appear on listing cards when data is available:

- **Trust Badge** -- colored indicator showing the seller's trust tier
- **Price Rating Badge** -- tier label with color coding
- **Image Flag Badge** -- warning indicator on suspected AI images
- **Heat Indicator** -- engagement velocity gauge
- **Forecast Indicator** -- estimated time to sell

Click any badge to see the full analysis breakdown with confidence levels and reasoning.

### Comparison

Click the compare button on up to 4 listing cards. A comparison bar appears at the bottom of the page with a side-by-side breakdown and a recommendation summary. Use "Copy as Markdown" or "Copy as Text" to share the comparison.

### Notifications

Enable notifications on a saved search to receive browser alerts when new matching listings appear. Price drop alerts trigger automatically when tracked listings decrease by ≥5%.

---

## Privacy

**MarketplaceSucks collects no data.** There are no analytics, no tracking pixels, no external API calls, and no remote servers. Every computation runs locally in your browser. All persisted data (listing history, saved searches, seen tracking, price history, engagement snapshots) is stored in your browser's IndexedDB and never leaves your machine.

| What | Where | Shared? |
|------|-------|---------|
| Settings | `chrome.storage.local` | No |
| Listings | IndexedDB | No |
| Seller profiles | IndexedDB | No |
| Price history | IndexedDB | No |
| Saved searches | IndexedDB | No |
| Image hashes | IndexedDB | No |
| Notifications | `chrome.storage.local` | No |

For the full privacy commitment, see [PRIVACY.md](PRIVACY.md).

---

## Architecture

The extension is organized into layered modules with strict dependency direction:

```
platform/       Browser abstraction (Chrome, Firefox, Edge APIs)
core/           Business logic (filters, sorters, analyzers, models, interfaces, utils)
  analysis/     Seller trust, price rating, image detection, heat tracking,
                sales forecasting, comparison, notifications, selector health, ML detector
  filters/      10 filter implementations + engine + registry
  sorters/      8 sorter implementations + engine + registry
  models/       Listing, Seller, Engagement, PriceData, SavedSearch, AnalyzedListing
  utils/        Math, text, date, similarity, event bus, perf, LRU cache, search I/O, comparison export
content/        DOM observation, parsing, manipulation, selector config, onboarding
data/           IndexedDB persistence (6 repositories, schema migrations)
ui/             React sidebar (12 panels), overlays, popup, preview
design-system/  15 primitives, 9 composites, 3 layouts, theming, tokens
workers/        Web Workers for image analysis + data processing
plugins/        Plugin system for third-party extensions
```

**Key design decisions:**
- All `core/` modules are **pure functions** with zero browser dependencies -- trivially testable
- Communication via **event bus** (pub/sub) -- no direct imports between layers
- **Shadow DOM** for UI injection -- no CSS conflicts with Facebook
- **Web Workers** for heavy computation (image analysis, data processing)
- **requestAnimationFrame** batching for DOM manipulation -- no layout thrashing
- **2-second element cache** in DomManipulator for performance

For the full architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Testing

The project has a comprehensive test suite with **540+ tests** across 43 test files.

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Run with coverage (80% threshold on src/core/)
```

| Category | Files | Tests | What's Covered |
|----------|-------|-------|----------------|
| Utils | 7 | ~170 | Math, text, date, similarity, event bus, perf, search I/O, comparison export, LRU cache |
| Models | 5 | 53 | Listing, seller, engagement, price data, saved search factories + validators |
| Filters | 12 | 99 | All 10 filters + engine pipeline + registry |
| Sorters | 3 | 24 | All 8 sorters + engine + registry |
| Analyzers | 12 | ~145 | Trust, price, image, fingerprint, heat, forecast, comparison, related, notifications, selector health, ML detector |
| E2E | 4 | ~50 | Selector validation against HTML fixtures, parser pipeline, dark mode detection |

**CI pipeline** runs lint + typecheck + test + build on every PR.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

All contributors must sign the [Contributor License Agreement](CLA.md) before their contributions can be merged.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by [Takeeda LLC](https://takeeda.com).
