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
- [Algorithms & Formulas](#algorithms--formulas)
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

## Algorithms & Formulas

Every score in MarketplaceSucks is computed using transparent, deterministic formulas. This section documents them all so you can verify, critique, or improve them.

### Seller Trust Score

**Formula:** `trustScore = clamp(accountAge + rating + ratingVolume + profileCompleteness + response + listingBehavior, 0, 100)`

Six independent factors are scored and summed. The total possible is 100 points.

**Why a weighted sum?** Trust is multi-dimensional. A seller with a perfect 5-star rating but a 1-week-old account is riskier than a 3-year account with 4.2 stars. The weighted sum lets each factor contribute proportionally to its predictive value. Account age and star rating get the highest weights (25 each) because they're the strongest scam indicators on Marketplace.

<details>
<summary>Factor 1: Account Age (0-25 points)</summary>

| Account Age | Points | Reasoning |
|-------------|--------|-----------|
| < 3 months | 0 | New accounts are the #1 scam vector on Marketplace |
| 3-5 months | 5 | Still new, minimal track record |
| 6-11 months | 10 | Some history, but could be a burner account |
| 12-23 months | 15 | Reasonable history |
| 24-59 months | 20 | Established account |
| 60+ months | 25 | Long-standing account, very low scam risk |

**Default when unknown:** 12 points (midpoint). Reasoning: penalizing unknown accounts too harshly would hide legitimate sellers who simply have private profiles.

**Conversion:** `ageMonths = floor(accountAgeDays / 30)`
</details>

<details>
<summary>Factor 2: Star Rating (0-25 points)</summary>

| Rating | Points | Reasoning |
|--------|--------|-----------|
| < 3.0 | 0 | Below average — significant negative feedback |
| 3.0-3.4 | 10 | Mixed reviews |
| 3.5-3.9 | 15 | Above average |
| 4.0-4.4 | 20 | Good reputation |
| 4.5+ | 25 | Excellent reputation |

**Default when unknown:** 5 points (neutral-low). Reasoning: absence of ratings is slightly negative — established trustworthy sellers almost always have some reviews.
</details>

<details>
<summary>Factor 3: Rating Volume (0-15 points)</summary>

| Reviews | Points | Reasoning |
|---------|--------|-----------|
| 0 | 3 | No social proof |
| 1-5 | 7 | Minimal data |
| 6-20 | 10 | Reasonable sample |
| 21-50 | 13 | Strong sample |
| 50+ | 15 | Very high confidence |

**Default when unknown:** 7 points (midpoint). Reasoning: volume adds confidence to the star rating — a 4.8 with 2 reviews means less than 4.8 with 50 reviews.
</details>

<details>
<summary>Factor 4: Profile Completeness (0-15 points, additive)</summary>

| Field | Points | Reasoning |
|-------|--------|-----------|
| Profile photo | +5 | Scammers rarely add real photos |
| Cover photo | +3 | Extra effort signals legitimacy |
| Location listed | +4 | Willingness to share location |
| Bio filled in | +3 | Additional personal investment |

**Default when unknown:** 7 points (midpoint).
</details>

<details>
<summary>Factor 5: Response Rate (0-10 points)</summary>

| Response Level | Points | Reasoning |
|----------------|--------|-----------|
| "Very responsive" / "< 1 hour" | 10 | Active, engaged seller |
| "Responsive" / "< 12 hours" | 7 | Reasonable response time |
| "Not responsive" / "> 24 hours" | 0 | May be inactive or ghost listing |

**Default when unknown:** 3 points (low-neutral).
</details>

<details>
<summary>Factor 6: Listing Behavior (0-10 points)</summary>

| Active Listings | Points | Reasoning |
|-----------------|--------|-----------|
| 1-10 | 10 | Normal individual seller |
| 11-30 | 7 | Active seller, possibly small business |
| 31-100 | 4 | High volume — could be dropshipper |
| 100+ | 2 | Spam risk or commercial reseller |

**Default when unknown:** 5 points (midpoint).
</details>

**Confidence:** Based on how many of the 6 factors had real data (vs defaults): 5+ = high, 3-4 = medium, 1-2 = low, 0 = insufficient.

**Tiers:** Trusted (80+), Moderate (60-79), Caution (40-59), Low (<40).

**Example:** A seller with a 3-year account (20pts), 4.6 stars (25pts), 30 reviews (13pts), profile photo + location (9pts), very responsive (10pts), 8 active listings (10pts) = **87 → Trusted**.

---

### Price Rating

**Formula:** `percentOfMedian = round((listingPrice / median(comparablePrices)) × 100)`

The listing's price is compared against the statistical distribution of similar listings.

**Why percentage of median?** Median is more robust than mean — a single $10,000 outlier doesn't skew the comparison. The percentage scale makes the tier boundaries intuitive: 100% = exactly at market rate.

| Tier | % of Median | Reasoning |
|------|------------|-----------|
| Steal | ≤ 40% | Less than half of market price — verify it's real |
| Great Deal | 41-70% | Significantly below market — strong buy signal |
| Good Price | 71-90% | Meaningfully below average |
| Fair Price | 91-110% | Within ±10% of median — normal market rate |
| Above Market | 111-130% | Noticeable premium |
| High | 131-160% | Significant premium — negotiate or skip |
| Overpriced | > 160% | More than 1.5x market rate |

**Statistics computed:**
```
median = sorted[n/2] or average of two middle values
mean = sum(prices) / count
stdDev = sqrt(sum((price - mean)²) / count)
percentileRank = (count of prices below listing price / total count) × 100
```

**Minimum data requirement:** 5 comparable listings. Below that, no rating is generated (avoids unreliable comparisons).

**Confidence:** 20+ comparables = high, 10-19 = medium, 5-9 = low.

**Example:** A dresser listed at $75 when 15 similar dressers have a median of $120 → `75/120 × 100 = 63%` → **Great Deal** with medium confidence.

---

### AI Image Detection (Heuristic)

**Formula:** `aiScore = round((triggeredWeight / totalWeight) × 100)`

Five binary signals are evaluated. Each has a weight reflecting its predictive value for detecting AI-generated images.

| Signal | Weight | Trigger | Why This Weight |
|--------|--------|---------|-----------------|
| No EXIF metadata | 25 | `!hasExif` | Strongest single indicator — real cameras always embed EXIF (model, exposure, GPS). AI generators strip it. |
| AI-typical resolution | 20 | Exact match: 512x512, 768x768, 1024x1024, 1024x768, 768x1024, 1024x576, 576x1024, 1920x1080, 1080x1920 | AI generators output at fixed resolutions. Real phone cameras produce 3024x4032, 4000x3000, etc. |
| Uniform saturation | 20 | `saturationStdDev < 0.1 AND avgSaturation > 0.3` | AI images have unnaturally even color distribution. Real photos have shadows, reflections, varying lighting. |
| Uniform background | 15 | `hasUniformBackground` | Common in AI renders and stock photos. Real marketplace photos show messy rooms, driveways, etc. |
| AI-typical aspect ratio | 10 | Within 0.02 of: 1:1, 4:3, 3:4, 16:9, 9:16 | Lower weight because many real photos also use standard ratios. It's a supporting signal, not conclusive. |

**Total weight = 90.** If all 5 signals trigger: `90/90 × 100 = 100`.

**Classification:**
- ≤ 30 → Appears Real (at most 1 weak signal triggered)
- 31-60 → Possibly AI (2-3 signals or 1 strong signal)
- \> 60 → Likely AI (majority of signals triggered)

**Why heuristic instead of ML?** Heuristics are fast (< 1ms), require zero dependencies, and are fully transparent. Users can see exactly which signals triggered. The ML model (planned Pro feature) will add accuracy but the heuristic catches the obvious cases.

---

### Image Originality Scoring

**Formula:** `originalityScore = clamp(50 + positiveAdjustments - negativeAdjustments, 0, 100)`

Starts at a **neutral 50** (no opinion) and adjusts based on evidence.

| Signal | Adjustment | Reasoning |
|--------|-----------|-----------|
| Environmental context (real background) | +15 | Room, furniture, yard in background = someone took a real photo |
| Multi-angle photo set | +15 | Multiple angles of same item = original photography |
| Duplicate found in other listings | -15 per duplicate (max -40) | Same image on multiple listings = scraped or stock |
| White/uniform background | -15 | Common in product/stock photography, not casual marketplace photos |
| Studio lighting | -10 | Professional lighting suggests commercial source |
| High recompression artifacts | -10 | Multiple re-saves suggest the image was downloaded from the web |

**Classification:** Original (80+), Mixed Signals (50-79), Likely Sourced (20-49), Probably Not Original (<20).

**Perceptual hash algorithm:**
```
1. Input: 32×32 grayscale image (1024 pixel values)
2. Divide into 8×8 grid of blocks (each block = 4×4 pixels)
3. Compute mean brightness of each block → 64 values
4. Compute overall mean of all 64 block values
5. Binary hash: 1 if block mean ≥ overall mean, else 0 → 64-bit hash
6. Convert to 16-character hex string
```

**Duplicate detection:** Two images are considered similar if their Hamming distance (number of differing bits) is ≤ 10 out of 64.

---

### Heat Score (Popularity)

**Formula:** `heatScore = clamp(absoluteEngagement + velocity + positionScore + recencyBoost, 0, 100)`

Four independent components capture different aspects of listing popularity.

<details>
<summary>Component 1: Absolute Engagement (0-40 points)</summary>

| Saves | Points | | Comments | Points | | Views | Points |
|-------|--------|-|----------|--------|-|-------|--------|
| 20+ | 15 | | 10+ | 15 | | 500+ | 10 |
| 10-19 | 12 | | 5-9 | 10 | | 200-499 | 8 |
| 5-9 | 8 | | 2-4 | 6 | | 100-199 | 5 |
| 2-4 | 4 | | 1 | 3 | | 50-99 | 3 |
| 1 | 1 | | 0 | 0 | | 1-49 | 1 |

**Why saves are weighted highest:** Saves indicate genuine purchase intent. Comments can be questions. Views are passive.
</details>

<details>
<summary>Component 2: Engagement Velocity (0-35 points)</summary>

**Formula:**
```
hoursSince = max((now - previousObservedAt) / 3,600,000, 0.1)
totalDelta = (savesDelta × 1) + (commentsDelta × 2) + (viewsDelta × 0.1)
velocityPerHour = totalDelta / hoursSince
```

| Velocity/hour | Points | Meaning |
|---------------|--------|---------|
| ≥ 10 | 35 | Viral — selling very fast |
| 5-9 | 28 | High demand |
| 2-4 | 20 | Good traction |
| 1-1.9 | 12 | Moderate interest |
| 0.5-0.9 | 6 | Some activity |
| < 0.5 | 2 | Minimal change |

**Why comments are 2x weighted in velocity:** A new comment represents active engagement. A view might be accidental scrolling.
</details>

<details>
<summary>Component 3: Search Position (0-15 points)</summary>

| Position | Points | Reasoning |
|----------|--------|-----------|
| 1-5 | 15 | Top results get the most traffic |
| 6-10 | 12 | Still above the fold |
| 11-20 | 8 | Requires some scrolling |
| 21-50 | 4 | Deep in results |
| 50+ | 1 | Minimal visibility |
</details>

<details>
<summary>Component 4: Recency Boost (0-10 points)</summary>

Only applies when the listing has any engagement (saves > 0 OR comments > 0 OR views > 0).

| Hours Since Posted | Points | Reasoning |
|--------------------|--------|-----------|
| ≤ 2 | 10 | Brand new with engagement = hot |
| 3-6 | 8 | Very fresh |
| 7-12 | 6 | Same day |
| 13-24 | 4 | Yesterday |
| 25-48 | 2 | Couple days old |
| > 48 | 0 | No boost for older listings |
</details>

**Tiers:** Fire (80+), Hot (60-79), Warm (30-59), Cool (<30).

---

### Sales Forecast

**Formula:**
```
estimatedDays = clamp(
  baseDays × priceAdj × heatAdj × conditionAdj × pricePointAdj × weekendAdj × responseAdj,
  0.25,
  90
)
```

Starts with a category average and applies 6 multiplicative adjustments. Multipliers < 1.0 speed up the estimate; > 1.0 slow it down.

**Why multiplicative?** Each factor independently scales the base. A free item (0.5x) from a responsive seller (0.8x) in new condition (0.7x) with high heat (0.4x) compounds: `14 × 0.5 × 0.8 × 0.7 × 0.4 = 1.6 days`. Additive scoring wouldn't capture this compounding effect.

<details>
<summary>All 6 multiplier tables</summary>

**Price Ratio** (listing price / median of similar items):

| Ratio | Multiplier | Reasoning |
|-------|-----------|-----------|
| ≤ 0.4 | 0.5x | Far below market — sells very fast |
| 0.41-0.7 | 0.65x | Below market |
| 0.71-0.9 | 0.8x | Slightly below |
| 0.91-1.1 | 1.0x | At market rate |
| 1.11-1.3 | 1.3x | Above market — takes longer |
| 1.31-1.6 | 1.7x | Significantly overpriced |
| > 1.6 | 2.0x | Very overpriced — may never sell |

**Heat Score:**

| Heat | Multiplier | Reasoning |
|------|-----------|-----------|
| 80+ | 0.4x | Already going viral |
| 60-79 | 0.55x | High demand |
| 40-59 | 0.7x | Moderate interest |
| 20-39 | 1.0x | Normal |
| < 20 | 1.5x | Low interest — slower sell |

**Condition:**

| Condition | Multiplier | Reasoning |
|-----------|-----------|-----------|
| New / Like New | 0.7x | Buyers prefer pristine items |
| Good | 0.9x | Acceptable to most |
| Fair | 1.3x | Limits buyer pool |
| Salvage | 1.5x | Niche audience only |

**Price Point** (absolute dollar amount):

| Price | Multiplier | Reasoning |
|-------|-----------|-----------|
| $0 (free) | 0.5x | Free items go instantly |
| $1-25 | 0.7x | Impulse buy range |
| $26-50 | 0.8x | Low commitment |
| $51-100 | 0.9x | Moderate |
| $101-500 | 1.0x | Standard range |
| $501-1000 | 1.3x | Requires deliberation |
| > $1000 | 1.5x | Major purchase — slow decision |

**Weekend:** Posted on weekend = 0.9x (more buyers browsing).

**Seller Responsiveness:** Responsive = 0.8x (faster communication closes deals).
</details>

**Base days:** Uses category historical average if available, otherwise defaults to 14 days.

**Urgency:** Act Fast (≤2 days), Moderate (3-7 days), Take Your Time (>7 days).

**Example:** A "Like New" dresser ($75, 60% of median, heat score 65, responsive seller, posted Saturday) with 10 days category average:
`10 × 0.65 × 0.55 × 0.7 × 0.8 × 0.9 × 0.8 = 1.3 days` → **Act Fast**

---

### Combined ML + Heuristic Scoring

When the TF.js model is loaded (planned Pro feature), scores are blended:

```
combinedScore = round(mlScore × 100 × 0.7 + heuristicScore × 0.3)
```

**Why 70/30?** A trained ML model analyzing raw pixels has fundamentally more information than 5 binary heuristic signals. But heuristics catch things the model might miss (like resolution metadata). The 30% heuristic weight acts as a sanity check.

**When ML is unavailable:** `combinedScore = heuristicScore` (100% heuristic, no degradation).

---

### Related Listings Relevance

**Formula:** `relevance = min(titleSim × 0.45 + categoryMatch × 0.20 + priceProximity × 0.20 + conditionMatch × 0.10 + locationProximity × 0.05, 1.0)`

| Component | Weight | Calculation | Reasoning |
|-----------|--------|-------------|-----------|
| Title similarity | 0.45 | Jaccard similarity on title tokens (only if > 0.1) | Title is the strongest indicator of item similarity |
| Category match | 0.20 | 1.0 if exact category match, else 0 | Same category = likely comparable |
| Price proximity | 0.20 | `(1 - abs(1 - priceRatio) / deviation)` within ±50% | Similar price suggests similar item tier |
| Condition match | 0.10 | 1.0 if same condition (excludes "unknown") | Same condition = more directly comparable |
| Location proximity | 0.05 | 1.0 if distance difference ≤ 10 miles | Nearby items are more actionable |

**Jaccard similarity:** `|A ∩ B| / |A ∪ B|` where A and B are sets of title tokens (with stop words removed).

**Minimum threshold:** relevance must be ≥ 0.15 to appear in results.

---

### Fuzzy Keyword Matching

**Algorithm:** Levenshtein edit distance with normalized threshold.

```
distance = levenshteinDistance(keyword, titleWord)    // minimum single-char edits to transform one into the other
normalizedDistance = distance / max(len(keyword), len(titleWord))
isMatch = normalizedDistance ≤ threshold
```

| Fuzzy Level | Threshold | What It Catches |
|-------------|-----------|-----------------|
| Off | 0 | Exact substring only |
| Low | 0.15 | 1 typo in 7+ character words (e.g. "corvete" → "corvette") |
| Medium | 0.25 | 1-2 typos (e.g. "ikea malm" → "ikia malm") |
| High | 0.40 | Aggressive matching — may produce false positives |

**Quoted phrases** (e.g. `"mid century"`) always use exact substring matching regardless of fuzzy level, because edit distance doesn't work well on multi-word phrases.

**Multi-word unquoted keywords:** Every token in the keyword must fuzzy-match at least one word in the title. This prevents "ikea malm" from matching "ikea kallax".

---

### Price Drop Detection

**Formula:** `dropPercent = ((previousPrice - currentPrice) / previousPrice) × 100`

**Trigger:** `dropPercent ≥ 5%` (default threshold).

**Why 5%?** Smaller drops are often rounding or minor adjustments. A 5% drop on a $200 item ($10) represents a meaningful price change that's worth notifying about.

**Safety checks:** Skips if `currentPrice ≥ previousPrice` (no drop) or `previousPrice = 0` (avoids division by zero).

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
