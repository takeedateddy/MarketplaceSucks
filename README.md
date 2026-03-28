# MarketplaceSucks

**Fix Facebook Marketplace's useless search. Real filters. Real sorting. Results you actually asked for.**

MarketplaceSucks is a browser extension that overhauls Facebook Marketplace with 18+ advanced filters, 10 sort options, seller trust scoring, AI image detection, price intelligence, sales forecasting, and a side-by-side comparison engine -- all running locally with zero data collection.

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome  | Primary -- fully tested |
| Firefox | Supported (Manifest V2 build) |
| Edge    | Supported (Chromium-based) |
| Brave   | Supported (Chromium-based) |
| Arc     | Supported (Chromium-based) |
| Opera   | Supported (Chromium-based) |

---

## Features

### Search and Filtering

18+ filter types that actually work, unlike Marketplace's built-in options.

- **Keyword filters** -- include or exclude listings by keywords in titles
- **Price range** -- set real min/max price boundaries
- **Condition filter** -- filter by New, Like New, Good, Fair, or Salvage
- **Distance filter** -- set a real distance radius
- **Date filter** -- only see listings posted within your timeframe
- **Seller trust filter** -- hide listings from low-trust sellers
- **Price rating filter** -- only show deals rated "Good Price" or better
- **Image flag filter** -- hide listings with suspected AI-generated images
- **Keyword exclusion** -- block specific terms (no more "ISO" or "wanted" posts)
- **Fuzzy matching** -- catches misspellings and close variations automatically
- **Filter presets** -- save and load filter combinations for repeated searches
- **Filter categories** -- filters are organized by keyword, price, location, condition, seller, image, market, and date

### Sorting

10 sort options to put the best results first.

- Price (low to high / high to low)
- Date posted (newest / oldest)
- Distance (nearest / farthest)
- Seller trust score
- Price rating (best deals first)
- Heat score (most popular)
- Relevance

All sort options support ascending and descending direction.

### Seller Trust Intelligence

Every seller gets a 0-100 trust score computed from 6 weighted factors:

1. **Account age** -- newer accounts score lower (0-25 points)
2. **Star rating** -- average rating from buyer reviews (0-25 points)
3. **Rating volume** -- more reviews means more confidence
4. **Profile completeness** -- filled-out profiles are a positive signal
5. **Response rate** -- responsive sellers score higher
6. **Listing behavior** -- patterns in posting history

Sellers are classified into tiers: Trusted, Moderate, Caution, and Low. Confidence levels (high, medium, low, insufficient) are shown so you know how much data backs the score.

### Image Authenticity

Detect AI-generated and suspicious listing images.

- **AI detection scoring** -- each image gets a 0-100 AI likelihood score
- **Classification** -- images are tagged as Appears Real, Possibly AI, or Likely AI
- **Heuristic signals** -- checks EXIF data presence, common AI resolutions (512x512, 1024x1024, etc.), uniform backgrounds, saturation patterns, and aspect ratios
- **Originality scoring** -- perceptual hashing detects duplicate/stock images across listings
- **TF.js integration** -- optional ML-based detection (lazy-loaded, runs locally)
- **Confidence indicators** -- every result shows how confident the assessment is

### Price Intelligence

7-tier price rating system with transparent reasoning for every score.

| Tier | Meaning |
|------|---------|
| Steal | Priced way below market |
| Great Deal | Significantly below typical pricing |
| Good Price | Below average, solid price |
| Fair Price | Right around market rate |
| Above Market | Priced above typical for this type of item |
| High | Noticeably overpriced |
| Overpriced | Far above market -- consider negotiating or skipping |

Ratings are computed by comparing each listing's price against the median, mean, and standard deviation of similar listings currently on Marketplace. The reasoning is shown in plain language so you can see exactly why a listing got its rating.

### Market Intelligence

- **Heat tracking** -- measures engagement velocity (saves, comments, views over time) to surface listings that are gaining traction
- **Sales forecasting** -- estimates how quickly a listing will sell based on category velocity, price ratio, heat score, condition, seller responsiveness, and posting day. Results include estimated days to sell, an urgency tier (Act Fast, Moderate, Take Your Time), and the reasoning behind the prediction.

### Comparison Engine

Compare up to 4 listings side by side.

- Structured comparison across price, condition, trust score, location, and more
- Each dimension highlights the best option
- Auto-generated summary text identifies the recommended listing
- Add and remove listings from the comparison bar as you browse

### Related Listings

Surfaces actually useful related items based on title similarity and category, not the irrelevant suggestions Marketplace shows by default.

### Productivity

- **Saved searches** -- save filter and sort combinations, reload them instantly
- **Listing history** -- browse previously viewed listings stored in IndexedDB
- **Seen tracking** -- listings you have already viewed are marked so you can skip them
- **All data stored locally** -- IndexedDB stores for listings, sellers, image hashes, price data, engagement snapshots, seen listings, and saved searches

---

## Installation

### From Source

```bash
git clone https://github.com/takeeda/MarketplaceSucks.git
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
pnpm build:chrome    # Default Chrome/Chromium build
pnpm build:firefox   # Firefox Manifest V2 build
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

Click the MarketplaceSucks toggle button on any Facebook Marketplace page to open the sidebar. The sidebar is where you configure filters, change sort order, and view analysis results.

### Filters

Select filters from the sidebar filter panel. Filters are grouped by category (keyword, price, location, condition, seller, image, market, date). Each filter has its own configuration options. Filtered listings are hidden from the Marketplace grid in real time as new listings load via infinite scroll.

### Sorting

Choose a sort option and direction from the sidebar. Listings are reordered in the DOM immediately.

### Analysis Features

Analysis badges appear on listing cards when data is available:

- **Trust Badge** -- colored indicator showing the seller's trust tier
- **Price Rating Badge** -- tier label with color coding
- **Image Flag Badge** -- warning indicator on suspected AI images
- **Heat Indicator** -- engagement velocity gauge
- **Forecast Indicator** -- estimated time to sell

Click any badge to see the full analysis breakdown with confidence levels and reasoning.

### Comparison

Click the compare button on up to 4 listing cards. A comparison bar appears at the bottom of the page with a side-by-side breakdown and a recommendation summary.

---

## Privacy

MarketplaceSucks collects no data. There are no analytics, no tracking pixels, no external API calls, and no remote servers. Every computation runs locally in your browser. All persisted data (listing history, saved searches, seen tracking) is stored in your browser's IndexedDB and never leaves your machine.

For the full privacy commitment, see [PRIVACY.md](PRIVACY.md).

---

## How Analysis Works

### Trust Scoring

The seller trust engine evaluates 6 weighted factors (account age, rating, rating volume, profile completeness, response rate, listing behavior) and produces a 0-100 score. When data for a factor is unavailable, a neutral midpoint is used and the confidence level is adjusted downward. The algorithm is deterministic and fully transparent -- every score shows its breakdown.

### Image Analysis

Image authenticity uses heuristic signal detection: checking for EXIF metadata, matching against known AI output resolutions, analyzing saturation distribution, and detecting uniform backgrounds. Each signal has a weight, and the weighted sum produces the AI likelihood score. An optional TF.js model can be lazy-loaded for ML-based detection, but it runs entirely in-browser via a Web Worker.

### Price Rating

Prices are compared against the statistical distribution (median, mean, standard deviation) of similar listings visible on Marketplace. The listing's percentile rank determines its tier. The reasoning text explains exactly which comparisons drove the rating.

### Sales Forecasting

The forecaster estimates days to sell based on category-level historical velocity, adjusted by price ratio to median, heat score, item condition, seller responsiveness, and whether the listing was posted on a weekend. When historical data is sparse, confidence drops and the estimate widens.

---

## Architecture

The extension is organized into layered modules with strict dependency direction:

```
platform/     Browser abstraction (Chrome, Firefox, Edge APIs)
core/         Business logic (filters, sorters, analyzers, models, interfaces)
content/      DOM observation, parsing, and manipulation
data/         IndexedDB persistence and repositories
ui/           React components (sidebar, overlays, popup, preview)
design-system/ Primitives, composites, tokens, and theming
workers/      Web Workers for heavy computation (image analysis, data processing)
plugins/      Plugin system for third-party extensions
```

For the full architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

All contributors must sign the [Contributor License Agreement](CLA.md) before their contributions can be merged.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by [Takeeda LLC](https://takeeda.com).
