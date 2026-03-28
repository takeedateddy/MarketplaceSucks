/**
 * End-to-end integration tests for the listing parser pipeline.
 *
 * Loads HTML fixtures into jsdom and runs the full parser pipeline:
 * selectors.config → queryFirst/queryAllFirst → ListingParser → Listing objects
 *
 * Validates that the parser correctly extracts structured data from
 * realistic Facebook Marketplace HTML.
 *
 * @module tests/e2e/listing-parser-e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { ListingParser } from '@/content/listing-parser';

let searchDoc: Document;
let parser: ListingParser;

beforeAll(() => {
  const html = readFileSync(
    resolve(__dirname, 'fixtures/marketplace-search-results.html'),
    'utf-8',
  );
  const dom = new JSDOM(html);

  // Make the jsdom document available globally so queryFirst/queryAllFirst work
  // by patching the global document
  global.document = dom.window.document;
  searchDoc = dom.window.document;
  parser = new ListingParser();
});

describe('ListingParser.canParse', () => {
  it('returns true for fixture with marketplace container', () => {
    expect(parser.canParse(searchDoc.documentElement)).toBe(true);
  });

  it('returns false for empty document', () => {
    const emptyDom = new JSDOM('<html><body></body></html>');
    global.document = emptyDom.window.document;
    const result = parser.canParse(emptyDom.window.document.documentElement);
    global.document = searchDoc; // restore
    expect(result).toBe(false);
  });
});

describe('ListingParser.parseAll', () => {
  it('finds multiple listing cards', () => {
    const result = parser.parseAll(searchDoc.documentElement);
    expect(result.totalCandidates).toBeGreaterThanOrEqual(4);
    expect(result.listings.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts listing IDs', () => {
    const result = parser.parseAll(searchDoc.documentElement);
    const ids = result.listings.map((l) => l.id);
    expect(ids).toContain('100001');
    expect(ids).toContain('100002');
    expect(ids).toContain('100004');
  });

  it('reports errors for unparseable cards', () => {
    const result = parser.parseAll(searchDoc.documentElement);
    // Some cards may fail to parse; that's expected
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('ListingParser.parseOne — full data card', () => {
  it('extracts complete listing from card with all fields', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100001"]');
    expect(card).not.toBeNull();

    const result = parser.parseOne(card!);
    expect(result.success).toBe(true);
    expect(result.listing).not.toBeNull();

    const listing = result.listing!;
    expect(listing.id).toBe('100001');
    expect(listing.title).toContain('IKEA Malm Dresser');
    expect(listing.price).toBe(150);
    expect(listing.condition).toBe('like_new');
    expect(listing.listingUrl).toContain('/marketplace/item/100001');
    expect(listing.imageUrls.length).toBeGreaterThan(0);
  });

  it('extracts location/distance', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100001"]');
    const result = parser.parseOne(card!);
    const listing = result.listing!;
    expect(listing.distance).toBe(5);
  });

  it('extracts seller info', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100001"]');
    const result = parser.parseOne(card!);
    const listing = result.listing!;
    expect(listing.sellerName).toBe('Jane D.');
    expect(listing.sellerProfileUrl).toContain('/marketplace/profile/200001');
  });
});

describe('ListingParser.parseOne — minimal data card', () => {
  it('handles free items', () => {
    const card = searchDoc.querySelector('a[href="/marketplace/item/100002/"]')?.closest('[data-testid="marketplace-feed-item"]');
    expect(card).not.toBeNull();

    const result = parser.parseOne(card!);
    expect(result.success).toBe(true);

    const listing = result.listing!;
    expect(listing.id).toBe('100002');
    expect(listing.title).toContain('Moving Sale');
    expect(listing.price).toBe(0); // "Free" parsed as 0
  });
});

describe('ListingParser.parseOne — shipping detection', () => {
  it('detects shipping availability from text', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100004"]');
    expect(card).not.toBeNull();

    const result = parser.parseOne(card!);
    expect(result.success).toBe(true);
    expect(result.listing!.shippingAvailable).toBe(true);
  });

  it('returns false when no shipping text present', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100001"]');
    const result = parser.parseOne(card!);
    expect(result.listing!.shippingAvailable).toBe(false);
  });
});

describe('ListingParser.parseOne — condition normalization', () => {
  it('normalizes "Used - Like New" to "like_new"', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100001"]');
    const result = parser.parseOne(card!);
    expect(result.listing!.condition).toBe('like_new');
  });

  it('normalizes "Good" to "good"', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100004"]');
    const result = parser.parseOne(card!);
    expect(result.listing!.condition).toBe('good');
  });

  it('normalizes "Like New" to "like_new"', () => {
    const card = searchDoc.querySelector('[data-marketplace-item-id="100005"]');
    const result = parser.parseOne(card!);
    expect(result.listing!.condition).toBe('like_new');
  });
});

describe('Full pipeline: parse → filter-ready data', () => {
  it('all parsed listings have required fields for filtering', () => {
    const result = parser.parseAll(searchDoc.documentElement);

    for (const listing of result.listings) {
      // Required fields for any filter to work
      expect(listing.id).toBeTruthy();
      expect(listing.title).toBeTruthy();
      expect(listing.normalizedTitle).toBeTruthy();
      expect(listing.titleTokens.length).toBeGreaterThan(0);
      expect(listing.listingUrl).toBeTruthy();
      expect(typeof listing.firstObserved).toBe('number');
      expect(typeof listing.lastObserved).toBe('number');
      expect(listing.engagement).toBeDefined();

      // Currency should always be set
      expect(listing.currency).toBe('USD');

      // Condition should be a valid enum value
      const validConditions = ['new', 'like_new', 'good', 'fair', 'salvage', 'unknown'];
      expect(validConditions).toContain(listing.condition);
    }
  });
});
