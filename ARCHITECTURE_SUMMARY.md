# MarketplaceSucks — Architecture Summary for Core-plus-Adapter Refactor

> **Purpose of this document.** MarketplaceSucks is currently a Facebook-Marketplace-specific
> browser extension. This document describes what it does end to end and explicitly flags
> what is **Facebook-specific** versus **universal (marketplace-agnostic)**, so the app can be
> refactored into a reusable core platform with Facebook Marketplace as the first *adapter*.
>
> Sections 2 (Data model) and 3 (Acquisition layer) paste real code inline. Other sections
> summarize. All keys/tokens/secrets are redacted as `[REDACTED]` — note that **this codebase
> contains no API keys, tokens, or secrets** (see §6), so there is nothing to redact.

---

## 1. Overview

### What it is

MarketplaceSucks is a **browser extension** (Manifest V3; Chrome, Edge, and Firefox builds)
that runs on top of `https://www.facebook.com/marketplace/*`. It does **not** replace
Facebook Marketplace — it overlays it. The user keeps browsing Marketplace normally; the
extension injects a sidebar, badges, and an overlay comparison bar into the existing page.

### Problem it solves

Facebook Marketplace's native search is weak: you can't reliably filter by real price ranges,
exclude keywords, sort by anything meaningful, judge whether a price is good, or tell whether
a seller is trustworthy. MarketplaceSucks adds the filtering, sorting, and analysis layer that
Marketplace lacks, computed entirely on the client from the listings the user scrolls past.

### Core user flow

1. The user navigates to Facebook Marketplace (optionally searching via the extension's own
   search box, which just redirects to a Marketplace search URL).
2. As the user scrolls, Facebook lazy-loads listing cards into the DOM. A `MutationObserver`
   detects each new card.
3. Each card is **scraped** (parsed) into a normalized `Listing` object.
4. Listings flow through a **filter → sort** pipeline driven by the user's settings, and in
   parallel through **analysis engines** (price rating, seller trust, image AI-detection, heat,
   sales forecast).
5. The extension **manipulates the page**: hides cards that fail the filters, reorders the
   visible cards to match the chosen sort, and injects analysis **badges** onto each card.
6. A **sidebar** (React, in shadow DOM) shows aggregate stats, filter/sort controls, price
   analytics, seller-trust details, saved searches, notifications, and side-by-side comparison.
7. Data is persisted to **IndexedDB** so price history, seller scores, "seen" state, and image
   hashes survive across sessions and accumulate the comparables that power price ratings.
8. A **background service worker** runs periodic alarms to check saved searches for new matches
   and price drops, firing native browser notifications.

Everything is **local and client-side**. There is no backend server, no account, and no payment.

---

## 2. Data model

The central domain object is `Listing`. Related entities are `SellerProfile`, `SavedSearch`,
engagement/price snapshots, image hashes, and the `AnalyzedListing` enrichment. There are two
parallel representations: in-memory **domain models** (`src/core/models/`, epoch-ms timestamps,
frozen objects) and **persisted records** (`src/data/db-schema.ts`, ISO-string dates,
denormalized). Both are pasted below with per-field FB-vs-universal annotations.

### 2.1 `Listing` (in-memory domain model) — `src/core/models/listing.ts`

```typescript
/** Item condition as reported by the seller. */
export type ListingCondition =
  | "new"
  | "like_new"
  | "good"
  | "fair"
  | "salvage"
  | "unknown";

/** Engagement metrics snapshot for a listing at a point in time. */
export interface ListingEngagement {
  /** Number of times the listing has been saved/bookmarked. */
  readonly saves: number | null;
  /** Number of comments on the listing. */
  readonly comments: number | null;
  /** Number of views the listing has received. */
  readonly views: number | null;
}

/** Geographic coordinates for a listing's location. */
export interface ListingCoordinates {
  readonly lat: number;
  readonly lng: number;
}

/** The core data model for a single Facebook Marketplace listing. */
export interface Listing {
  /** Facebook's unique identifier for this listing. */
  readonly id: string;
  /** The raw title as displayed on the listing card. */
  readonly title: string;
  /** Lowercased, whitespace-normalized version of {@link title}. */
  readonly normalizedTitle: string;
  /** Individual tokens extracted from {@link normalizedTitle}. */
  readonly titleTokens: readonly string[];
  /** Marketplace category (e.g. "Electronics", "Vehicles"). */
  readonly category: string | null;
  /** Seller-reported item condition. */
  readonly condition: ListingCondition;
  /** Asking price in the listing's currency. `null` if "Free" or unparseable. */
  readonly price: number | null;
  /** ISO 4217 currency code. */
  readonly currency: string;
  /** Human-readable location string (e.g. "Brooklyn, NY"). */
  readonly location: string | null;
  /** Parsed geographic coordinates, if available. */
  readonly coordinates: ListingCoordinates | null;
  /** Distance from the user in miles, if available. */
  readonly distance: number | null;
  /** Display name of the seller. */
  readonly sellerName: string | null;
  /** URL to the seller's Marketplace profile. */
  readonly sellerProfileUrl: string | null;
  /** Direct URL to this listing's detail page. */
  readonly listingUrl: string;
  /** URLs of all listing images. */
  readonly imageUrls: readonly string[];
  /** The raw "posted" text from the listing card (e.g. "2 hours ago"). */
  readonly datePosted: string | null;
  /** Unix-epoch millisecond timestamp parsed from {@link datePosted}. */
  readonly parsedDate: number | null;
  /** Whether the seller offers shipping. */
  readonly shippingAvailable: boolean;
  /** Engagement metrics at the time of parsing. */
  readonly engagement: ListingEngagement;
  /** Unix-epoch millisecond timestamp when the extension first saw this listing. */
  readonly firstObserved: number;
  /** Unix-epoch millisecond timestamp of the most recent observation. */
  readonly lastObserved: number;
}
```

Factory defaults (note the **hardcoded `currency: "USD"`** default — a leak point, see §8):

```typescript
export function createListing(input: ListingInput): Listing {
  const now = Date.now();
  const [normalizedTitle, titleTokens] = normalizeTitle(input.title);
  return {
    id: input.id,
    title: input.title,
    normalizedTitle,
    titleTokens,
    category: input.category ?? null,
    condition: input.condition ?? "unknown",
    price: input.price ?? null,
    currency: input.currency ?? "USD",          // <-- US-centric default
    location: input.location ?? null,
    coordinates: input.coordinates ?? null,
    distance: input.distance ?? null,            // <-- miles assumed downstream
    sellerName: input.sellerName ?? null,
    sellerProfileUrl: input.sellerProfileUrl ?? null,
    listingUrl: input.listingUrl,
    imageUrls: input.imageUrls ?? [],
    datePosted: input.datePosted ?? null,
    parsedDate: input.parsedDate ?? null,
    shippingAvailable: input.shippingAvailable ?? false,
    engagement: {
      saves: input.engagement?.saves ?? null,
      comments: input.engagement?.comments ?? null,
      views: input.engagement?.views ?? null,
    },
    firstObserved: input.firstObserved ?? now,
    lastObserved: input.lastObserved ?? now,
  };
}
```

**Per-field annotation for `Listing`:**

| Field | FB-specific? | Notes |
|---|---|---|
| `id` | **Universal shape, FB-sourced value** | Doc comment says "Facebook's unique identifier"; the value is a Marketplace item ID, but every marketplace has an item ID. Rename concept to "listing id". |
| `title` | Universal | |
| `normalizedTitle` / `titleTokens` | Universal | Derived via `normalizeTitle()`; pure text logic. |
| `category` | Universal | String category; FB's category vocabulary differs but the field is generic. |
| `condition` | **Semi-FB** | The enum (`new`/`like_new`/`good`/`fair`/`salvage`/`unknown`) is generic, but the raw→enum mapping (`CONDITION_MAP` in the parser) is keyed to FB's exact condition strings. |
| `price` | Universal | |
| `currency` | **Universal field, FB/US-biased default** | Defaults to `"USD"`; the parser never reads a real currency code (see §8). |
| `location` | Universal | Free-text location string. |
| `coordinates` | Universal | Never actually populated by the FB parser today (always `null`). |
| `distance` | **Semi-FB** | Field is universal, but it is parsed from FB's "X miles away" text and assumed to be **miles** by sorters/filters. |
| `sellerName` | Universal | |
| `sellerProfileUrl` | **Universal shape, FB URL** | Always a `facebook.com/marketplace/profile/...` URL today. |
| `listingUrl` | **Universal shape, FB URL** | Always a `facebook.com/marketplace/item/...` URL today. |
| `imageUrls` | Universal | Values are `fbcdn.net` URLs; the field itself is generic. |
| `datePosted` | **Semi-FB** | Raw FB relative-time text ("2 hours ago"); parsing logic is generic but tuned to FB phrasing. |
| `parsedDate` | Universal | Epoch ms. |
| `shippingAvailable` | **Semi-FB** | Detected by string-matching FB phrases ("shipping available", "ships to you"). |
| `engagement.{saves,comments,views}` | **Semi-FB** | Universal concept; "saves" is FB terminology (eBay = "watchers", etc.). |
| `firstObserved` / `lastObserved` | Universal | Extension-internal observation timestamps. |

### 2.2 `AnalyzedListing` (enrichment) — `src/core/models/analyzed-listing.ts`

```typescript
import type { Listing } from './listing';

/** A {@link Listing} extended with optional analysis results. */
export interface AnalyzedListing extends Listing {
  readonly sellerTrustScore?: number;
  readonly priceRating?: string;
  readonly priceRatingScore?: number;
  readonly heatScore?: number;
  readonly estimatedDaysToSell?: number;
  readonly imageFlags?: readonly string[];
  readonly aiImageScore?: number;
  readonly originalityScore?: number;
}
```

**Annotation:** Entirely **universal** — these are computed analytics that apply to any
marketplace. (The *inputs* to some of these computations are FB-specific; see §4.)

### 2.3 `SellerProfile` (domain model) — `src/core/models/seller.ts`

```typescript
export type ProfileCompleteness = "full" | "partial" | "minimal" | "unknown";

export interface SellerRating {
  readonly overall: number | null;        // 0-5 stars
  readonly totalReviews: number | null;
  readonly positiveCount: number | null;
  readonly negativeCount: number | null;
}

export interface SellerProfile {
  readonly id: string;
  readonly displayName: string;
  readonly profileUrl: string;
  readonly profileImageUrl: string | null;
  /** Raw string e.g. "Joined in 2018". */
  readonly joinedDate: string | null;
  readonly accountAgeDays: number | null;
  readonly rating: SellerRating;
  /** Response rate as a percentage (0-100). */
  readonly responseRate: number | null;
  /** Qualitative responsiveness text Facebook shows, e.g. "Very responsive". */
  readonly responseDescription: string | null;
  readonly responseTime: number | null;   // minutes
  readonly profileCompleteness: ProfileCompleteness;
  readonly trustScore: number | null;     // 0-100, computed
  readonly totalListings: number | null;
  readonly activeListings: number | null;
  readonly isVerified: boolean;
  readonly location: string | null;
  readonly firstObserved: number;
  readonly lastObserved: number;
}
```

**Per-field annotation for `SellerProfile`:**

| Field | FB-specific? | Notes |
|---|---|---|
| `id`, `displayName`, `profileUrl`, `profileImageUrl` | Universal shape, FB-sourced | `profileUrl` is an FB profile URL today. |
| `joinedDate` | **Semi-FB** | Raw FB string "Joined in YYYY"; account-age concept is universal. |
| `accountAgeDays` | Universal | |
| `rating.*` | **Semi-FB** | 0–5 star scale is FB's; review counts are universal. |
| `responseRate` | Universal | Numeric percentage; **never populated by the FB adapter** (FB only gives text). |
| `responseDescription` | **FB-specific** | Exists *because* FB exposes responsiveness as text, not a number. The trust scorer phrase-matches on it (§4). |
| `responseTime` | Universal | |
| `profileCompleteness` | Universal | |
| `trustScore` | Universal | Computed. |
| `totalListings`, `activeListings` | Universal | |
| `isVerified` | Universal | |
| `location` | Universal | |

### 2.4 `SavedSearch` (domain model) — `src/core/models/saved-search.ts`

```typescript
export type NotificationFrequency = "realtime" | "hourly" | "daily" | "manual";

export interface NotificationSettings {
  readonly enabled: boolean;
  readonly frequency: NotificationFrequency;
  readonly showBadge: boolean;
  readonly playSound: boolean;
}

export interface SavedSearchSort {
  readonly sorterId: string;
  readonly direction: SortDirection;   // "asc" | "desc"
}

export interface SavedSearch {
  readonly id: string;                                          // UUID
  readonly name: string;
  readonly query: string;                                       // empty = browse-all
  readonly filters: Readonly<Record<string, Record<string, unknown>>>;
  readonly sort: SavedSearchSort | null;
  readonly notifications: NotificationSettings;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastRunAt: number | null;
  readonly resultCount: number | null;
  readonly isPinned: boolean;
}
```

**Annotation:** **Fully universal.** Filters are keyed by generic filter id, sort by sorter id.
Nothing here references Facebook. (Note: a *second, divergent* `SavedSearch` shape exists in the
persistence layer — see §2.6 and §8.)

### 2.5 Persisted records — `src/data/db-schema.ts`

These are the IndexedDB-stored shapes (ISO-string dates, denormalized). DB name is
`"MarketplaceSucks"`, version `1`, with stores: `listings`, `sellers`, `imageHashes`,
`priceData`, `engagement`, `seenListings`, `savedSearches`.

```typescript
export interface ListingRecord {
  readonly id: string;
  readonly title: string;
  readonly normalizedTitle: string;
  readonly titleTokens: string[];
  readonly category: string | null;
  readonly condition: string | null;
  readonly price: number | null;
  readonly currency: string;
  readonly location: string | null;
  readonly distance: number | null;
  readonly sellerName: string | null;
  readonly sellerProfileUrl: string | null;
  readonly listingUrl: string;
  readonly imageUrls: string[];
  readonly datePosted: string | null;
  readonly firstObserved: string;        // ISO 8601
  readonly lastObserved: string;         // ISO 8601
  readonly disappeared: boolean;
  readonly disappearedAt: string | null;
}

export interface SellerProfile {         // NOTE: flat, differs from core/models/seller.ts
  readonly id: string;
  readonly name: string;
  readonly profileUrl: string;
  readonly accountAge: string | null;
  readonly accountAgeMonths: number | null;
  readonly rating: number | null;
  readonly ratingCount: number | null;
  readonly responseRate: string | null;
  readonly responseTime: string | null;
  readonly hasProfilePhoto: boolean;
  readonly hasCoverPhoto: boolean;
  readonly hasLocation: boolean;
  readonly hasBio: boolean;
  readonly activeListingCount: number | null;
  readonly trustScore: number;
  readonly trustScoreBreakdown: Record<string, number>;
  readonly lastUpdated: string;
}

export interface ImageHash {
  readonly hash: string;                 // perceptual hash
  readonly listingId: string;
  readonly imageUrl: string;
  readonly aiScore: number | null;       // 0-1
  readonly originalityScore: number | null;
  readonly flags: string[];
  readonly analyzedAt: string;
}

export interface PriceDataPoint {
  readonly id: string;                   // listingId + timestamp
  readonly listingId: string;
  readonly category: string | null;
  readonly normalizedTitle: string;      // grouping key for comparables
  readonly condition: string | null;
  readonly price: number;
  readonly location: string | null;
  readonly observedAt: string;
}

export interface EngagementSnapshot {
  readonly id: string;
  readonly listingId: string;
  readonly saves: number | null;
  readonly comments: number | null;
  readonly views: number | null;
  readonly searchPosition: number | null;
  readonly observedAt: string;
}

export interface SeenListing {
  readonly listingId: string;
  readonly firstSeen: string;
  readonly priceAtFirstSeen: number;
  readonly currentPrice: number | null;
  readonly trustScoreAtFirstSeen: number | null;
}

export interface SavedSearch {           // NOTE: differs from core/models/saved-search.ts
  readonly id: string;
  readonly name: string;
  readonly filters: Record<string, unknown>;
  readonly sortOrder: string | null;
  readonly keywords: string | null;
  readonly pinned: boolean;
  readonly createdAt: string;
  readonly lastUsedAt: string;
}
```

**Annotation:** The persisted records are **structurally universal**. Two FB-relevant notes:
(1) `currency` and `distance` carry the same US/miles assumptions as the domain model;
(2) the persisted `SavedSearch` and `SellerProfile` shapes **diverge** from the `core/models/`
shapes — a pre-existing inconsistency the refactor should resolve (see §8).

---

## 3. Acquisition layer

**Mechanism: DOM scraping, not an API.** There is no Facebook API call, no auth token, no
credential of any kind. The extension is a content script injected into the user's already-
authenticated Facebook tab; it reads whatever the logged-in user can already see in the page
DOM. The user's Facebook session cookie does the authentication implicitly — the extension
never touches it.

The acquisition path has three parts: (a) a `MutationObserver` that detects new listing cards,
(b) a selector-driven parser that turns cards into `Listing` objects, and (c) a detail-page
parser that scrapes seller/engagement data only available on item pages. Cross-origin listing
**images** are fetched and decoded in the background service worker (the only place that can,
thanks to `host_permissions`).

### 3.1 Manifest (entry point + permissions) — `public/manifest.chrome.json`

```json
{
  "manifest_version": 3,
  "name": "MarketplaceSucks",
  "version": "0.1.0",
  "permissions": ["storage", "activeTab", "offscreen", "alarms", "notifications"],
  "host_permissions": [
    "https://www.facebook.com/marketplace/*",
    "https://*.fbcdn.net/*"
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["https://www.facebook.com/marketplace/*"],
      "js": ["content.js"],
      "css": ["assets/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

**Annotation:** The `matches` and `host_permissions` are the hardest-wired FB coupling in the
project — they bind the whole extension to `facebook.com/marketplace` and `fbcdn.net`. An adapter
model needs per-adapter manifest fragments (match patterns + CDN host permissions). No secrets.

### 3.2 Selector config (single source of FB DOM truth) — `src/content/selectors.config.ts`

This is the **most FB-specific file in the codebase** and the intended single point of DOM
coupling. Every selector is an ordered array (most-specific → fallback); the first match wins.

```typescript
export const SELECTORS: SelectorConfig = {
  listingCard: [
    '[data-testid="marketplace-feed-item"]',
    '[role="listitem"] > div[data-testid]',
    'div[data-marketplace-item-id]',
    'a[href*="/marketplace/item/"][role="link"]',
    '[role="main"] [role="list"] [role="listitem"]',
    'div[aria-label="Collection of Marketplace items"] > div > div',
  ],
  listingTitle: [
    '[data-testid="marketplace-listing-title"]',
    'span[data-testid="marketplace-item-title"]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:first-of-type',
    '[aria-label][role="link"] span[dir="auto"]',
    'a[href*="/marketplace/item/"] > div > div:nth-child(2) span',
  ],
  listingPrice: [
    '[data-testid="marketplace-listing-price"]',
    'span[data-testid="marketplace-item-price"]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:has(+ span[dir="auto"])',
    'a[href*="/marketplace/item/"] > div > div:first-child span[dir="auto"]',
    '[role="listitem"] span[aria-label*="$"]',
    '[role="listitem"] span[aria-label*="Price"]',
  ],
  listingLocation: [
    '[data-testid="marketplace-listing-location"]',
    'span[data-testid="marketplace-item-location"]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:last-of-type',
    '[role="listitem"] span[aria-label*="miles"]',
    '[role="listitem"] span[aria-label*="away"]',
    'a[href*="/marketplace/item/"] > div > div:nth-child(2) span:last-child',
  ],
  listingImage: [
    '[data-testid="marketplace-listing-image"] img',
    'a[href*="/marketplace/item/"] img[src*="scontent"]',
    'a[href*="/marketplace/item/"] img[src*="fbcdn"]',
    'a[href*="/marketplace/item/"] div[role="img"]',
    '[role="listitem"] img[alt]',
  ],
  listingCondition: [
    '[data-testid="marketplace-listing-condition"]',
    'span[data-testid="marketplace-item-condition"]',
    '[role="listitem"] span[aria-label*="condition" i]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:nth-of-type(3)',
  ],
  listingDate: [
    '[data-testid="marketplace-listing-date"]',
    'span[data-testid="marketplace-item-date"]',
    '[role="listitem"] span[aria-label*="ago"]',
    '[role="listitem"] abbr[data-utime]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:last-of-type',
  ],
  listingLink: [
    'a[href*="/marketplace/item/"]',
    'a[href*="/marketplace/item/"][role="link"]',
    '[data-testid="marketplace-feed-item"] a[href*="/marketplace/"]',
    '[role="listitem"] a[href*="/marketplace/"]',
  ],
  sellerName: [
    '[data-testid="marketplace-seller-name"]',
    'span[data-testid="marketplace-listing-seller"]',
    'a[href*="/marketplace/profile/"] span',
    '[aria-label*="Seller"] span',
    'div[data-testid="marketplace-pdp-seller-info"] span[dir="auto"]',
  ],
  sellerLink: [
    'a[href*="/marketplace/profile/"]',
    'a[data-testid="marketplace-seller-link"]',
    '[aria-label*="seller" i] a[href*="/profile"]',
    'a[href*="/marketplace/profile/"][role="link"]',
  ],
  engagementIndicators: [
    '[data-testid="marketplace-listing-engagement"]',
    'span[data-testid="marketplace-item-saves"]',
    'span[aria-label*="save" i]',
    'span[aria-label*="comment" i]',
    'span[aria-label*="view" i]',
    '[role="listitem"] [aria-label*="people saved this"]',
  ],
  marketplaceContainer: [
    '[data-testid="marketplace-feed"]',
    '[data-testid="marketplace-search-results"]',
    '[role="main"] [role="feed"]',
    '[role="main"] [role="list"]',
    'div[aria-label="Collection of Marketplace items"]',
    '[role="main"] div[data-pagelet*="Marketplace"]',
  ],
  darkModeIndicator: [
    'html.__fb-dark-mode',
    'html[data-theme="dark"]',
    'html[data-color-scheme="dark"]',
    'body.__fb-dark-mode',
    'body[data-theme="dark"]',
  ],
} as const;

export function queryFirst(parent: Element | Document, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    try {
      const el = parent.querySelector(selector);
      if (el) return el;
    } catch { /* invalid selector — skip */ }
  }
  return null;
}

export function queryAllFirst(parent: Element | Document, candidates: readonly string[]): Element[] {
  for (const selector of candidates) {
    try {
      const els = parent.querySelectorAll(selector);
      if (els.length > 0) return Array.from(els);
    } catch { /* invalid selector — skip */ }
  }
  return [];
}
```

**Annotation:** Wholly **Facebook-specific**. The `SelectorConfig` *interface* (the set of
fields an adapter must locate: card, title, price, location, image, condition, date, link,
seller name/link, engagement, container, dark-mode) is the natural **adapter contract**. The
`SELECTORS` constant and `queryFirst`/`queryAllFirst` helpers are universal scaffolding;
only the selector strings are FB-bound.

### 3.3 Observer (detects new cards) — `src/content/listing-observer.ts` (core logic)

Auth approach: none — reads the live DOM. Quirk handling: debounces FB's rapid infinite-scroll
insertions (100 ms), polls up to 10 s for the container during FB's SPA transitions, falls back
to observing `document.body`, and de-dupes already-seen elements via a `WeakSet`.

```typescript
export class ListingObserver {
  private observer: MutationObserver | null = null;
  private callbacks: NewListingsCallback[] = [];
  private pendingElements: Set<Element> = new Set();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly seenElements: WeakSet<Element> = new WeakSet();

  constructor(debounceMs = 100) { this.debounceMs = debounceMs; }

  onNewListings(callback: NewListingsCallback): void { this.callbacks.push(callback); }

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
    this.attachToContainer();
  }

  // Locate the Marketplace container; retry every 500 ms up to 10 s, then fall
  // back to <body> (common during Facebook's SPA transitions).
  private attachToContainer(retries = 20): void {
    const container = queryFirst(document, SELECTORS.marketplaceContainer);
    if (container) {
      this.observeContainer(container);
      this.performInitialScan(container);
      return;
    }
    if (retries <= 0) {
      if (document.body) {
        this.observeContainer(document.body);
        this.performInitialScan(document.body);
      }
      return;
    }
    setTimeout(() => this.attachToContainer(retries - 1), 500);
  }

  private observeContainer(container: Element): void {
    this.observer?.observe(container, { childList: true, subtree: true });
  }

  // Find listing cards in `node` itself and its subtree, dedupe via WeakSet,
  // then schedule a debounced flush to registered callbacks.
  private collectListingCards(node: Element): void {
    for (const selector of SELECTORS.listingCard) {
      try {
        if (node.matches(selector) && !this.seenElements.has(node)) {
          this.seenElements.add(node);
          this.pendingElements.add(node);
        }
      } catch { /* skip */ }
    }
    const cards = queryAllFirst(node, SELECTORS.listingCard);
    for (const card of cards) {
      if (!this.seenElements.has(card)) {
        this.seenElements.add(card);
        this.pendingElements.add(card);
      }
    }
  }
}
```

**Annotation:** The observer mechanics (MutationObserver, debounce, WeakSet de-dupe, container
polling/fallback) are **universal**. Its only FB coupling is the `SELECTORS` it reads — i.e. it
already depends on the adapter contract, not on FB directly.

### 3.4 Parser (DOM → `Listing`) — `src/content/listing-parser.ts` (core logic)

```typescript
/** Pattern to extract a Marketplace item ID from a URL. */
const ITEM_ID_PATTERN = /\/marketplace\/item\/(\d+)/;

/** Map of raw condition text to normalized condition values. */
const CONDITION_MAP: Record<string, ListingCondition> = {
  new: "new",
  "brand new": "new",
  "like new": "like_new",
  "used - like new": "like_new",
  "gently used": "like_new",
  good: "good",
  "used - good": "good",
  fair: "fair",
  "used - fair": "fair",
  salvage: "salvage",
  "for parts": "salvage",
};

export class ListingParser implements IListingParser {
  readonly id = "fb-marketplace-2026";
  readonly version = 1;

  canParse(root: Element): boolean {
    return (
      queryFirst(root, SELECTORS.marketplaceContainer) !== null ||
      queryFirst(root, SELECTORS.listingCard) !== null
    );
  }

  // Core: extract everything available from a single card element.
  parse(element: Element): Listing | null {
    const id = this.extractId(element);
    const title = this.extractTitle(element);
    if (!id || !title) return null;   // minimum viable listing

    const listingUrl =
      this.extractListingUrl(element) ??
      `https://www.facebook.com/marketplace/item/${id}`;
    const priceText =
      this.extractText(element, SELECTORS.listingPrice) ?? this.extractPriceFallback(element);
    const locationText = this.extractText(element, SELECTORS.listingLocation);
    const conditionText = this.extractText(element, SELECTORS.listingCondition);
    const dateText = this.extractText(element, SELECTORS.listingDate);
    const sellerName = this.extractText(element, SELECTORS.sellerName);
    const sellerProfileUrl = this.extractSellerUrl(element);
    const imageUrls = this.extractImageUrls(element);

    const price = priceText ? parsePrice(priceText) : null;
    const parsedDateObj = dateText ? parseRelativeTime(dateText) : null;
    const parsedDate = parsedDateObj ? parsedDateObj.getTime() : null;
    const distance = locationText ? parseDistance(locationText) : null;
    const condition = conditionText ? this.normalizeCondition(conditionText) : "unknown";
    const engagement = this.extractEngagement(element);
    const shippingAvailable = this.detectShipping(element);

    return createListing({
      id, title, listingUrl, price,
      currency: "USD",                 // <-- hardcoded, see §8
      location: locationText, distance, condition,
      sellerName, sellerProfileUrl, imageUrls,
      datePosted: dateText, parsedDate, shippingAvailable, engagement,
    });
  }

  // ID: data-marketplace-item-id attr, else parse the /marketplace/item/<id> URL.
  private extractId(element: Element): string | null {
    const dataId = element.getAttribute("data-marketplace-item-id");
    if (dataId) return dataId;
    const link = queryFirst(element, SELECTORS.listingLink);
    const href = link?.getAttribute("href") ?? element.getAttribute("href");
    if (href) {
      const match = href.match(ITEM_ID_PATTERN);
      if (match) return match[1];
    }
    return null;
  }

  // Images: <img src> (skipping data: URIs) or CSS background-image on div[role=img].
  private extractImageUrls(element: Element): string[] {
    const urls: string[] = [];
    for (const imgEl of queryAllFirst(element, SELECTORS.listingImage)) {
      const src = imgEl.getAttribute("src");
      if (src && !src.startsWith("data:")) { urls.push(src); continue; }
      if (imgEl instanceof HTMLElement) {
        const m = imgEl.style.backgroundImage?.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) urls.push(m[1]);
      }
    }
    return urls;
  }

  // Engagement: text-match "save"/"comment"/"view" near a number.
  private extractEngagement(element: Element) {
    const result = { saves: null as number | null, comments: null as number | null, views: null as number | null };
    for (const indicator of queryAllFirst(element, SELECTORS.engagementIndicators)) {
      const text = indicator.textContent?.toLowerCase().trim() ?? "";
      const numberMatch = text.match(/(\d+)/);
      if (!numberMatch) continue;
      const count = parseInt(numberMatch[1], 10);
      if (text.includes("save")) result.saves = count;
      else if (text.includes("comment")) result.comments = count;
      else if (text.includes("view")) result.views = count;
    }
    return result;
  }

  // Shipping: phrase-match FB's labels.
  private detectShipping(element: Element): boolean {
    const text = element.textContent?.toLowerCase() ?? "";
    return text.includes("shipping available") || text.includes("ships to you");
  }

  private normalizeCondition(text: string): ListingCondition {
    return CONDITION_MAP[text.toLowerCase().trim()] ?? "unknown";
  }
}
```

The price fallback (`extractPriceFallback`) is notable quirk-handling: when selectors miss, it
scans spans for an exact `$[\d,]+` match, then partial matches, then walks visible text nodes
with a `TreeWalker` — explicitly to avoid matching dollar amounts embedded in **Facebook's
tracking URLs/data attributes** that pollute `textContent`.

**Annotation:** Mixed. **FB-specific:** `id = "fb-marketplace-2026"`, `ITEM_ID_PATTERN`,
`CONDITION_MAP` keys, the `/marketplace/item/<id>` URL fallback, hardcoded `currency: "USD"`,
shipping phrase matching, the `$`-based price parsing, and the tracking-URL workaround. **Universal:**
the `IListingParser` interface, the parse-or-null discipline, the defensive per-field try/catch,
and the generic extract helpers. The parser is the natural body of a **Facebook adapter**; its
interface (`IListingParser`: `id`, `version`, `canParse`, `parseOne`, `parseAll`) is the contract.

### 3.5 Detail-page parser — `src/content/detail-page-parser.ts`

Scrapes seller profile + engagement that FB renders **only** on an item detail page (not on the
grid), keying off `[data-testid="marketplace-pdp-seller-info"]` / `*-pdp-engagement`. It parses
"Joined in YYYY" → account-age days, "N star(s)"/"M review(s)" → rating, and "responsive" text →
`responseText`, computes a trust score, and persists a flat `SellerProfile` record so that grid
cards from the same seller can later display the cached trust/heat. `buildSellerRecord` is pure
and unit-tested.

**Annotation:** **FB-specific** scraping (PDP `data-testid`s, FB profile string formats); the
trust-score computation it calls is universal (§4).

### 3.6 Image acquisition — `src/background/image-analysis.ts`

Content scripts cannot analyze `fbcdn.net` images (drawing cross-origin images to a canvas
taints it). The **MV3 service worker** can `fetch` the bytes (CORS-bypassed via the
`*.fbcdn.net` `host_permissions`), decode with `createImageBitmap`, and read pixels from an
`OffscreenCanvas`. It computes a perceptual hash + heuristic AI-image score and returns them to
the content script, which persists and badges them. One explicit FB quirk: **Facebook strips
EXIF from every upload**, so the "no EXIF" AI signal is excluded and the score renormalized.

**Annotation:** The fetch-and-decode pipeline is **universal**, but it is enabled specifically by
the FB CDN host permission and tuned with the FB-EXIF-stripping assumption.

---

## 4. Filtering and scoring

All filtering/sorting/scoring logic lives in `src/core/` and is documented as having **zero
browser dependencies** — pure functions over the `Listing`/`AnalyzedListing`/`SellerProfile`
models. This layer is **almost entirely universal**, with a few FB-shaped assumptions baked into
defaults and inputs.

### Filters — `src/core/filters/` (registry + engine pattern)

Each filter implements `IFilter<TConfig>` (`id`, `displayName`, `category`, `defaultEnabled`,
`apply()`, `getDefaultConfig()`, `validateConfig()`). The `FilterEngine` runs every enabled
filter; a listing survives only if all return `keep: true`. Registered filters:

| Filter | Universal? | Notes |
|---|---|---|
| `keyword-filter` / `keyword-exclude-filter` | **Universal** | Include/exclude matching on title tokens; uses a `fuzzy-matcher` (Levenshtein/n-gram). |
| `price-filter` (`price-range`) | **Universal** | Min/max; null-price listings always kept. (Currency-agnostic numerically, but `$` is assumed in UI/reasons.) |
| `condition-filter` | **Semi-FB** | Operates on the generic `ListingCondition` enum, but that enum is populated from FB condition strings. |
| `distance-filter` | **Semi-FB** | Radius filter; assumes `distance` is in **miles** (FB's unit). |
| `date-filter` | **Universal** | Recency on `parsedDate`. |
| `seller-trust-filter` | **Universal** | Threshold on `sellerTrustScore` (kept if unscored). |
| `price-rating-filter` | **Universal** | Filters by rating tier. |
| `image-flag-filter` | **Universal** | Drops AI-flagged images. |

The `keyword-filter` text pipeline includes a marketplace-flavored **stop-word list** in
`text-utils.ts` ("obo", "firm", "negotiable", "pickup", "must sell"…) — universal across
classifieds but classifieds-specific, not FB-specific.

### Sorters — `src/core/sorters/sorters.ts`

Eight sorters, **all universal**: `price`, `date`, `distance`, `alphabetical`, `seller-trust`,
`price-rating`, `heat`, `selling-speed`. They read `Listing`/`AnalyzedListing` fields and apply a
direction. (`distance` again presumes miles.)

### Analyzers — `src/core/analysis/`

| Analyzer | Universal? | FB-shaped inputs / assumptions |
|---|---|---|
| `price-rater` | **Universal logic** | Pure statistics: compares price to median of comparables, 7 tiers (steal → overpriced) by % of median, confidence by comparable count. Reasoning strings hardcode `$`. Comparables are grouped by `normalizedTitle`/category from accumulated `priceData`. |
| `seller-trust` | **Universal logic, FB-tuned inputs** | 6-factor 0–100 score (account age, rating, rating volume, profile completeness, response, listing behavior). **`scoreResponse` phrase-matches FB's text** ("very responsive", "within an hour"); the 0–5 rating scale and "Joined in YYYY" age derivation come from FB. Missing factors fall back to neutral midpoints with reduced confidence. |
| `image-analyzer` / `image-fingerprint` / `ml-image-detector` | **Universal logic** | Heuristic AI-image score from pixel/metadata signals + perceptual hashing for duplicates. The FB-EXIF-stripping assumption lives in the background caller (§3.6), not here. |
| `heat-tracker` | **Universal** | Engagement velocity from `engagement` snapshots + search position over time. Driven by FB's saves/comments/views, which not all marketplaces expose. |
| `sales-forecaster` | **Universal** | Time-to-sell prediction. |
| `comparison-engine` / `related-listings` | **Universal** | Side-by-side compare (≤4) and similar-listing discovery via `similarity-utils`. |

**Summary for §4:** The entire filter/sort/score layer is the reusable core. FB leakage is
limited to: (1) the **miles** distance unit, (2) the **`$`/USD** assumption in reasoning/UI
strings, (3) **`scoreResponse` phrase matching** on FB responsiveness text, (4) the 0–5 rating
scale and "Joined in YYYY" parsing feeding `seller-trust`, and (5) the condition enum's reliance
on FB condition strings. These are *input-shaping* concerns the adapter should normalize, leaving
the math untouched.

---

## 5. Alerts and notifications

**Yes, this exists.** Two cooperating pieces:

1. **`src/core/analysis/notification-engine.ts`** (pure, browser-free): `detectNewMatches()`
   compares a `SavedSearch.query` against recently-observed listings (only those `firstObserved`
   after the last check) and emits `new-match` notification descriptors; `detectPriceDrops()`
   compares previous vs current price snapshots and emits `price-drop` descriptors when the drop
   exceeds a threshold (default 5%). `frequencyToMinutes()` maps `realtime|hourly|daily|manual`
   to alarm intervals (5 / 60 / 1440 / 0).

2. **`src/background/service-worker.ts`** (browser-bound): registers a `chrome.alarms` alarm
   (`mps-check-alerts`, every 30 min). On each fire, `checkAlerts()` reads saved searches,
   recent listings, and price history from extension storage, runs the same match/drop logic,
   creates native `browser.notifications`, increments an action **badge count**, remembers each
   notification's target URL (so a click opens the listing), and appends to a capped
   notification history that the sidebar's `NotificationPanel` reads. Price-history entries are
   cleared after notifying to avoid re-alerting.

The sidebar (`SavedSearches.tsx`, `NotificationPanel.tsx`) is the UI for creating/managing saved
searches and viewing the notification feed.

**Annotation:** The matching/drop logic and `SavedSearch` model are **universal**. FB coupling:
matching is a simple `normalizedTitle.includes(query)` substring (no marketplace-specific query
semantics), notifications open `facebook.com` listing URLs, and the alarm/notification/badge
plumbing goes through the WebExtension APIs (the platform layer, see §7). The service worker also
maintains its **own divergent storage-shaped** copies of saved searches / listings rather than
reading IndexedDB — a consistency gap (see §8).

---

## 6. Accounts and billing

**None of these exist.** There is:

- **No user accounts / no auth UI** — no login, signup, sessions, or identity. Verified by
  searching the source: the only "auth"/"account" hits are about *Facebook seller* account age
  and trust, not app accounts.
- **No payment / billing / subscription / paywall / premium tiers** — no Stripe, no licensing,
  no feature gating.
- **No API keys, tokens, or secrets** anywhere in the repo (nothing to redact).

"Authentication" to Facebook is **implicit**: the content script runs inside the user's own
logged-in Facebook tab and reads what the user can already see. The extension never handles
credentials or cookies.

The only monetization touchpoint is **donations**: `.github/FUNDING.yml` lists GitHub Sponsors
(`takeedateddy`), Buy Me a Coffee, and a custom URL (`https://marketplacesucks.com`). This is
sponsorship, not in-app billing.

**Implication for the refactor:** accounts, billing, and any cross-device sync would be
**greenfield** on the new platform. All current state is local (IndexedDB + `chrome.storage`).

---

## 7. Tech stack and structure

### Stack

- **Language:** TypeScript (strict), ES modules.
- **UI:** React 18 + ReactDOM, mounted into **shadow DOM** to avoid Facebook CSS bleed.
  Tailwind CSS + PostCSS + a custom design-system token/primitive/composite layer.
- **Extension platform:** Manifest V3 (Chrome/Edge) and a Firefox manifest variant, via
  `webextension-polyfill`. Built with `@crxjs/vite-plugin` available but the real build is a
  custom multi-pass Vite script.
- **Storage:** IndexedDB via `idb`; plus `chrome.storage.local` for settings/alerts.
- **Build:** Vite 6 + a custom `scripts/build-extension.mjs` that runs **4 separate builds**
  (content script → IIFE, background SW → IIFE, data-processing worker → IIFE, popup → ES
  module) to dodge MV3's "import outside a module" constraints. Per-browser via `BROWSER` env.
- **Off-main-thread:** a **data-processing Web Worker** (price-stat aggregation) and the
  **background service worker** (image fetch/decode/analysis).
- **Testing:** Vitest (unit, co-located `*.test.ts`) + jsdom-based e2e tests over saved
  Marketplace HTML fixtures. ESLint + Prettier. GitHub Actions CI.
- **Extensibility:** a small **plugin system** (`IPlugin` + `PluginManager`) exposing the event
  bus, storage, and filter/sorter registries.

### File tree (2–3 levels, annotated)

```
src/
├── content/                 ★ FB DOM bridge (most FB-coupled layer)
│   ├── index.ts             ★ content-script composition root; FB search-URL building, FB nav hide
│   ├── selectors.config.ts  ★★★ ALL Facebook DOM selectors (single source of FB coupling)
│   ├── listing-observer.ts   ~ generic observer; reads FB selectors
│   ├── listing-parser.ts    ★ FB card → Listing (item-id regex, condition map, $/USD, fbcdn)
│   ├── detail-page-parser.ts ★ FB PDP seller/engagement scraping
│   ├── detail-page-enhancer.ts ★ overlays on FB item pages
│   ├── dom-manipulator.ts    ~ hide/reorder cards (generic, drives off ids)
│   ├── dom-injector.ts        ~ shadow-DOM hosts + badge/compare-button injection
│   ├── analysis-runner.ts     · orchestrates core analyzers (universal)
│   ├── badge-builder.ts       · builds badge view-models (universal)
│   ├── selector-health-checker.ts ★ monitors FB selector breakage
│   └── persistence.ts / data-worker-client.ts / onboarding.ts / *-mount.tsx
├── core/                    ✓ UNIVERSAL business logic (zero browser deps)
│   ├── models/              ✓ Listing, seller, saved-search, engagement, price-data, analyzed-listing
│   ├── interfaces/          ✓ filter / sorter / analyzer / parser / storage contracts (= adapter seams)
│   ├── filters/             ✓ 9 filters + engine + registry + fuzzy-matcher (distance=miles caveat)
│   ├── sorters/             ✓ 8 sorters + engine + registry
│   ├── analysis/            ✓ price-rater, seller-trust, image-*, heat, forecast, comparison, related
│   └── utils/               ✓ event-bus, math/text/date/similarity, price-aggregate, caches
├── data/                    ✓ persistence (mostly universal)
│   ├── db.ts / db-schema.ts  ~ IndexedDB; DB name "MarketplaceSucks", currency/miles assumptions
│   ├── repositories/         ✓ typed CRUD per store
│   └── migrations/           ✓ v1
├── platform/                ✓ browser-API abstraction (Chrome/FF/Edge); not FB-specific
│   ├── browser.ts messaging.ts storage.ts tabs.ts permissions.ts
│   └── manifest-helpers.ts chrome-storage-adapter.ts
├── background/              ~ MV3 service worker
│   ├── service-worker.ts     ~ lifecycle, messaging, alarms, alerts (opens FB URLs)
│   └── image-analysis.ts    ★ fetch/decode fbcdn images; FB-EXIF-stripping assumption
├── workers/                 ✓ data-processing.worker.ts, image-analysis.worker.ts
├── ui/                      ~ React UI (FB-labeled copy, e.g. "Marketplace")
│   ├── sidebar/             ~ Filter/Sort/PriceAnalytics/SellerTrust/SavedSearches/Notification…
│   ├── overlays/ popup/ preview/
├── design-system/           ✓ primitives / composites / tokens / theme / layouts
│   └── theme/theme-detector.ts ★ reads FB dark-mode indicators
├── plugins/                 ✓ IPlugin, PluginManager, builtin, examples
└── assets/icons/

public/
├── manifest.chrome.json     ★ matches facebook.com/marketplace + fbcdn host perms
├── manifest.edge.json       ★ "
└── manifest.firefox.json    ★ "
scripts/build-extension.mjs   ✓ multi-pass Vite build
tests/e2e/fixtures/*.html    ★ saved Facebook Marketplace HTML

Legend: ★ Facebook-specific   ~ thin/glue (mostly generic, some FB)   ✓ universal   · view-model glue
```

---

## 8. Leak points (most important for the refactor)

Every place where Facebook-specific logic is tangled into something that should be
platform-agnostic, roughly ordered by refactor impact. These are the seams an adapter
abstraction must own.

1. **Manifest match patterns & host permissions** (`public/manifest.*.json`). Hard-wires the
   entire extension to `https://www.facebook.com/marketplace/*` and `https://*.fbcdn.net/*`.
   → *Adapter must contribute its own match patterns + CDN host permissions; build should compose
   a manifest per adapter.*

2. **`selectors.config.ts`** — all Facebook DOM selectors in one constant. Correctly centralized,
   but the **`SelectorConfig` interface is the de-facto adapter contract** and should be promoted
   into `core/interfaces/` (or a `MarketplaceAdapter` type), with `SELECTORS` becoming the FB
   adapter's implementation.

3. **`listing-parser.ts`** — FB logic baked into the only parser: `id = "fb-marketplace-2026"`,
   `ITEM_ID_PATTERN = /\/marketplace\/item\/(\d+)/`, `CONDITION_MAP` keyed to FB strings, the
   `facebook.com/marketplace/item/<id>` URL fallback, shipping phrase-matching, and the
   tracking-URL price workaround. → *This whole class is the body of the Facebook adapter; keep it
   behind `IListingParser` (which already exists and is clean).*

4. **Hardcoded `currency: "USD"`** in both `listing-parser.ts` and `createListing()`. No currency
   is ever parsed. → *Adapter should supply currency (and locale); core should not default to USD.*

5. **`distance` assumed to be miles** throughout (`distance-filter`, `DistanceSorter`, parser via
   `parseDistance`). → *Normalize to a unit-tagged distance, or have the adapter declare its unit.*

6. **`$` / dollar formatting** embedded in core analysis reasoning strings (`price-rater.ts`),
   `updateStats()` in `content/index.ts`, and various UI components. → *Route all money formatting
   through a currency/locale formatter the adapter configures.*

7. **`seller-trust.ts` `scoreResponse()`** phrase-matches Facebook's responsiveness wording
   ("very responsive", "within an hour"); the scorer also assumes a 0–5 rating scale and consumes
   "Joined in YYYY"-derived account age. → *Adapter should normalize seller signals into a neutral
   shape before scoring; keep the math marketplace-agnostic.*

8. **`detail-page-parser.ts`** is built on FB PDP `data-testid`s and FB profile string formats
   ("Joined in", "N stars", "M reviews", "responsive"). → *Belongs in the FB adapter behind a
   "seller/engagement detail" capability.*

9. **`image-analysis.ts` Facebook-EXIF assumption** — excludes the no-EXIF AI signal because "FB
   strips EXIF from every upload." That is a per-platform fact. → *Make excluded signals an
   adapter-declared capability flag.*

10. **`condition` enum population** — the generic `ListingCondition` is fine, but its only source
    is FB's `CONDITION_MAP`. → *Each adapter maps its own raw condition vocabulary to the enum.*

11. **`theme-detector.ts` / `SELECTORS.darkModeIndicator`** detect light/dark by reading
    Facebook's `__fb-dark-mode` / `data-theme` markers. → *Adapter-specific theme detection.*

12. **`content/index.ts` couplings:** builds Facebook search URLs
    (`facebook.com/marketplace/search/?query=`), hides Facebook's nav (`[data-mps-hidden-nav]`),
    and reads the `query` URL param. → *Search navigation and chrome-hiding are adapter behaviors.*

13. **`service-worker.ts` alert path** opens `facebook.com` URLs and, more importantly, keeps its
    **own storage-shaped copies** of saved searches / recent listings / price history instead of
    reading the IndexedDB repositories. → *Unify on one persistence path; keep URL targets adapter-
    supplied.*

14. **Two divergent model shapes** — `SavedSearch` and `SellerProfile` each exist in *both*
    `core/models/` (rich, nested) and `data/db-schema.ts` (flat). Not FB-specific, but it's an
    existing inconsistency the refactor should reconcile so the core has one canonical model with
    explicit record mappers.

15. **Naming & copy** — `DB_NAME = "MarketplaceSucks"`, `MPS_*` prefixes, the product name, and
    UI strings ("Marketplace", "Seller") assume the FB context. Cosmetic, but worth a pass so the
    core platform isn't branded around Facebook.

**Bottom line.** The codebase is already unusually well-positioned for a core-plus-adapter split:
`src/core/` is genuinely browser-free and marketplace-agnostic, and the right interfaces
(`IListingParser`, `IFilter`, `ISorter`, `IAnalyzer`, `IStorageAdapter`, the `SelectorConfig`
shape) already exist as seams. The Facebook coupling is concentrated in `content/` (selectors +
parsers), the manifests, and a handful of input-shaping assumptions (currency, miles, rating
scale, response-text matching, EXIF). Promote `SelectorConfig` + `IListingParser` + seller/detail
scraping + manifest fragments + currency/locale/unit config into a formal **`MarketplaceAdapter`**
interface, make Facebook its first implementation, and the rest of the system can stay as-is.
```
