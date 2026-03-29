/**
 * @module content/listing-parser
 *
 * DOM parser that extracts structured {@link Listing} data from Facebook
 * Marketplace listing card elements.
 *
 * Implements the {@link IListingParser} interface and uses selectors from
 * {@link SELECTORS} to locate data within each card. All text extraction
 * delegates to `@/core/utils/text-utils` for normalization.
 *
 * The parser is defensive: missing or unparseable fields default to `null`
 * rather than throwing. A card is only rejected (returns `null`) when it
 * lacks the minimum viable information (an ID and a title).
 *
 * @example
 * ```ts
 * import { ListingParser } from "@/content/listing-parser";
 *
 * const parser = new ListingParser();
 * if (parser.canParse(document.body)) {
 *   const { listings, errors } = parser.parseAll(document.body);
 * }
 * ```
 */

import type { Listing } from "@/core/models/listing";
import { createListing, type ListingCondition } from "@/core/models/listing";
import type { IListingParser, ParseResult, ParseBatchResult } from "@/core/interfaces/parser.interface";
import { parsePrice, parseRelativeTime, parseDistance } from "@/core/utils/text-utils";
import { SELECTORS, queryFirst, queryAllFirst } from "@/content/selectors.config";

/** Pattern to extract a Marketplace item ID from a URL. */
const ITEM_ID_PATTERN = /\/marketplace\/item\/(\d+)/;

/** Pattern to extract a seller profile ID from a URL. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future seller profile parsing
const SELLER_ID_PATTERN = /\/marketplace\/profile\/(\d+)/;

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

/**
 * Extracts structured {@link Listing} data from Facebook Marketplace DOM
 * elements. Uses the centralized {@link SELECTORS} configuration for all
 * DOM queries.
 */
export class ListingParser implements IListingParser {
  /** @inheritdoc */
  readonly id = "fb-marketplace-2026";

  /** @inheritdoc */
  readonly version = 1;

  /**
   * Probe the DOM subtree to determine whether this parser can handle it.
   *
   * Returns `true` if at least one listing card or the Marketplace container
   * is found.
   *
   * @param root - The root element to probe.
   * @returns `true` if this parser recognizes the DOM structure.
   */
  canParse(root: Element): boolean {
    return (
      queryFirst(root, SELECTORS.marketplaceContainer) !== null ||
      queryFirst(root, SELECTORS.listingCard) !== null
    );
  }

  /**
   * Parse a single listing card element into a {@link Listing}.
   *
   * @param element - The DOM element representing one listing card.
   * @returns A {@link ParseResult} with the listing or an error message.
   */
  parseOne(element: Element): ParseResult {
    try {
      const listing = this.parse(element);
      if (listing) {
        return { success: true, listing };
      }
      return {
        success: false,
        listing: null,
        error: "Element does not contain minimum listing data (id + title).",
      };
    } catch (err) {
      return {
        success: false,
        listing: null,
        error: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Parse all listing cards found within a DOM subtree.
   *
   * @param root - The root element to search within.
   * @returns A {@link ParseBatchResult} with all parsed listings and errors.
   */
  parseAll(root: Element): ParseBatchResult {
    const cards = queryAllFirst(root, SELECTORS.listingCard);
    const listings: Listing[] = [];
    const errors: string[] = [];

    for (const card of cards) {
      const result = this.parseOne(card);
      if (result.success && result.listing) {
        listings.push(result.listing);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      listings,
      errors,
      totalCandidates: cards.length,
    };
  }

  /**
   * Core parsing logic. Extracts all available data from a card element.
   *
   * @param element - A listing card DOM element.
   * @returns A fully-formed {@link Listing}, or `null` if the element is
   *   clearly not a listing (missing both ID and title).
   */
  parse(element: Element): Listing | null {
    const id = this.extractId(element);
    const title = this.extractTitle(element);

    // Minimum viable listing: must have an id and a title
    if (!id || !title) {
      return null;
    }

    const listingUrl = this.extractListingUrl(element) ?? `https://www.facebook.com/marketplace/item/${id}`;
    const priceText = this.extractText(element, SELECTORS.listingPrice) ?? this.extractPriceFallback(element);
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
      id,
      title,
      listingUrl,
      price,
      currency: "USD",
      location: locationText,
      distance,
      condition,
      sellerName,
      sellerProfileUrl,
      imageUrls,
      datePosted: dateText,
      parsedDate,
      shippingAvailable,
      engagement,
    });
  }

  // ---------------------------------------------------------------------------
  // Extraction helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract the Marketplace item ID from a listing card.
   *
   * Looks for `data-marketplace-item-id`, then falls back to parsing the
   * listing link URL.
   */
  private extractId(element: Element): string | null {
    try {
      // Direct data attribute
      const dataId = element.getAttribute("data-marketplace-item-id");
      if (dataId) return dataId;

      // Extract from link URL
      const link = queryFirst(element, SELECTORS.listingLink);
      if (link) {
        const href = link.getAttribute("href");
        if (href) {
          const match = href.match(ITEM_ID_PATTERN);
          if (match) return match[1];
        }
      }

      // Check the element itself if it's a link
      const selfHref = element.getAttribute("href");
      if (selfHref) {
        const match = selfHref.match(ITEM_ID_PATTERN);
        if (match) return match[1];
      }

      return null;
    } catch (err) {
      console.warn("[MPS] Error extracting listing ID:", err);
      return null;
    }
  }

  /**
   * Extract the listing title text.
   */
  private extractTitle(element: Element): string | null {
    try {
      const titleEl = queryFirst(element, SELECTORS.listingTitle);
      if (!titleEl) return null;

      const text = titleEl.textContent?.trim();
      return text && text.length > 0 ? text : null;
    } catch (err) {
      console.warn("[MPS] Error extracting listing title:", err);
      return null;
    }
  }

  /**
   * Extract the listing detail page URL.
   */
  private extractListingUrl(element: Element): string | null {
    try {
      const link = queryFirst(element, SELECTORS.listingLink);
      if (!link) return null;

      const href = link.getAttribute("href");
      if (!href) return null;

      // Normalize relative URLs
      if (href.startsWith("/")) {
        return `https://www.facebook.com${href}`;
      }
      return href;
    } catch (err) {
      console.warn("[MPS] Error extracting listing URL:", err);
      return null;
    }
  }

  /**
   * Extract the seller profile URL.
   */
  private extractSellerUrl(element: Element): string | null {
    try {
      const link = queryFirst(element, SELECTORS.sellerLink);
      if (!link) return null;

      const href = link.getAttribute("href");
      if (!href) return null;

      if (href.startsWith("/")) {
        return `https://www.facebook.com${href}`;
      }
      return href;
    } catch (err) {
      console.warn("[MPS] Error extracting seller URL:", err);
      return null;
    }
  }

  /**
   * Extract all image URLs from a listing card.
   */
  private extractImageUrls(element: Element): string[] {
    try {
      const urls: string[] = [];
      const imageEls = queryAllFirst(element, SELECTORS.listingImage);

      for (const imgEl of imageEls) {
        // Standard <img> src
        const src = imgEl.getAttribute("src");
        if (src && !src.startsWith("data:")) {
          urls.push(src);
          continue;
        }

        // Background image on a div[role="img"]
        if (imgEl instanceof HTMLElement) {
          const bgImage = imgEl.style.backgroundImage;
          const urlMatch = bgImage?.match(/url\(["']?([^"')]+)["']?\)/);
          if (urlMatch) {
            urls.push(urlMatch[1]);
          }
        }
      }

      return urls;
    } catch (err) {
      console.warn("[MPS] Error extracting image URLs:", err);
      return [];
    }
  }

  /**
   * Extract engagement metrics from a listing card.
   */
  private extractEngagement(element: Element): { saves: number | null; comments: number | null; views: number | null } {
    const result = { saves: null as number | null, comments: null as number | null, views: null as number | null };

    try {
      const indicators = queryAllFirst(element, SELECTORS.engagementIndicators);

      for (const indicator of indicators) {
        const text = indicator.textContent?.toLowerCase().trim() ?? "";
        const numberMatch = text.match(/(\d+)/);
        if (!numberMatch) continue;

        const count = parseInt(numberMatch[1], 10);

        if (text.includes("save")) {
          result.saves = count;
        } else if (text.includes("comment")) {
          result.comments = count;
        } else if (text.includes("view")) {
          result.views = count;
        }
      }
    } catch (err) {
      console.warn("[MPS] Error extracting engagement:", err);
    }

    return result;
  }

  /**
   * Detect whether the listing offers shipping.
   */
  private detectShipping(element: Element): boolean {
    try {
      const text = element.textContent?.toLowerCase() ?? "";
      return text.includes("shipping available") || text.includes("ships to you");
    } catch {
      return false;
    }
  }

  /**
   * Normalize a raw condition string to a {@link ListingCondition}.
   */
  private normalizeCondition(text: string): ListingCondition {
    const lower = text.toLowerCase().trim();
    return CONDITION_MAP[lower] ?? "unknown";
  }

  /**
   * Fallback price extraction: scan the card's text content for the first
   * dollar amount pattern. Used when SELECTORS.listingPrice returns null.
   *
   * Searches all spans first (more precise), then falls back to full
   * textContent regex match.
   */
  private extractPriceFallback(element: Element): string | null {
    try {
      // Strategy 1: find a span whose text is exactly a price
      const spans = element.querySelectorAll('span');
      for (const span of Array.from(spans)) {
        const text = span.textContent?.trim();
        if (!text || text.length > 20) continue;
        if (/^\$[\d,]+(\.\d{2})?$/.test(text) || text.toLowerCase() === 'free') {
          return text;
        }
      }

      // Strategy 2: find a span that CONTAINS a price (e.g. "$720 " with trailing space)
      for (const span of Array.from(spans)) {
        const text = span.textContent?.trim();
        if (!text || text.length > 30) continue;
        const match = text.match(/^(\$[\d,]+(?:\.\d{2})?)/);
        if (match) {
          return match[1];
        }
        if (/^free$/i.test(text)) {
          return 'Free';
        }
      }

      // Strategy 3: regex the entire card text for first dollar amount
      const fullText = element.textContent ?? '';
      const priceMatch = fullText.match(/\$[\d,]+(?:\.\d{2})?/);
      if (priceMatch) {
        return priceMatch[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generic text extraction: find the first matching element and return its
   * trimmed text content.
   */
  private extractText(parent: Element, selectors: readonly string[]): string | null {
    try {
      const el = queryFirst(parent, selectors);
      if (!el) return null;

      const text = el.textContent?.trim();
      return text && text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }
}
