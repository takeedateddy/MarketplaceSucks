/**
 * Selector validation tests against HTML fixtures.
 *
 * These tests load sanitized HTML snapshots of Facebook Marketplace pages
 * into jsdom and verify that every selector category in SELECTORS can
 * find at least one match. This catches selector breakage before release.
 *
 * @module tests/e2e/selector-validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { SELECTORS, type SelectorConfig } from '@/content/selectors.config';

let searchDom: JSDOM;
let searchDoc: Document;

beforeAll(() => {
  const html = readFileSync(
    resolve(__dirname, 'fixtures/marketplace-search-results.html'),
    'utf-8',
  );
  searchDom = new JSDOM(html);
  searchDoc = searchDom.window.document;
});

function queryFirst(doc: Document, selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) return el;
    } catch {
      // Invalid selector in jsdom
    }
  }
  return null;
}

function queryAll(doc: Document, selectors: readonly string[]): Element[] {
  for (const sel of selectors) {
    try {
      const els = doc.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch {
      // Invalid selector in jsdom
    }
  }
  return [];
}

describe('Selector validation against search results fixture', () => {
  it('marketplaceContainer: finds the main feed container', () => {
    const el = queryFirst(searchDoc, SELECTORS.marketplaceContainer);
    expect(el).not.toBeNull();
    expect(el!.getAttribute('data-testid')).toBe('marketplace-feed');
  });

  it('listingCard: finds all listing cards', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('listingTitle: extracts titles from cards', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    let titlesFound = 0;
    for (const card of cards) {
      for (const sel of SELECTORS.listingTitle) {
        try {
          const el = card.querySelector(sel);
          if (el?.textContent?.trim()) {
            titlesFound++;
            break;
          }
        } catch { /* skip */ }
      }
    }
    expect(titlesFound).toBeGreaterThanOrEqual(3);
  });

  it('listingPrice: extracts prices from cards', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    let pricesFound = 0;
    for (const card of cards) {
      for (const sel of SELECTORS.listingPrice) {
        try {
          const el = card.querySelector(sel);
          if (el?.textContent?.trim()) {
            pricesFound++;
            break;
          }
        } catch { /* skip */ }
      }
    }
    expect(pricesFound).toBeGreaterThanOrEqual(3);
  });

  it('listingLocation: extracts location/distance from cards', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    let locationsFound = 0;
    for (const card of cards) {
      for (const sel of SELECTORS.listingLocation) {
        try {
          const el = card.querySelector(sel);
          if (el?.textContent?.trim()) {
            locationsFound++;
            break;
          }
        } catch { /* skip */ }
      }
    }
    expect(locationsFound).toBeGreaterThanOrEqual(3);
  });

  it('listingLink: finds links to detail pages', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    let linksFound = 0;
    for (const card of cards) {
      for (const sel of SELECTORS.listingLink) {
        try {
          const el = card.querySelector(sel);
          if (el?.getAttribute('href')?.includes('/marketplace/item/')) {
            linksFound++;
            break;
          }
        } catch { /* skip */ }
      }
    }
    expect(linksFound).toBeGreaterThanOrEqual(4);
  });

  it('listingImage: finds images in cards', () => {
    const cards = queryAll(searchDoc, SELECTORS.listingCard);
    let imagesFound = 0;
    for (const card of cards) {
      for (const sel of SELECTORS.listingImage) {
        try {
          const el = card.querySelector(sel);
          if (el) {
            imagesFound++;
            break;
          }
        } catch { /* skip */ }
      }
    }
    expect(imagesFound).toBeGreaterThanOrEqual(3);
  });

  it('sellerName: finds seller names where present', () => {
    const el = queryFirst(searchDoc, SELECTORS.sellerName);
    expect(el).not.toBeNull();
    expect(el!.textContent?.trim()).toBeTruthy();
  });

  it('sellerLink: finds seller profile links', () => {
    const el = queryFirst(searchDoc, SELECTORS.sellerLink);
    expect(el).not.toBeNull();
    expect(el!.getAttribute('href')).toContain('/marketplace/profile/');
  });

  it('engagementIndicators: finds engagement text', () => {
    const indicators = queryAll(searchDoc, SELECTORS.engagementIndicators);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('darkModeIndicator: correctly detects light mode (no match)', () => {
    const el = queryFirst(searchDoc, SELECTORS.darkModeIndicator);
    expect(el).toBeNull(); // Fixture is light mode
  });
});

describe('Selector coverage report', () => {
  it('reports which selector categories have matches', () => {
    const categories = Object.keys(SELECTORS) as (keyof SelectorConfig)[];
    const report: Record<string, { matched: boolean; matchCount: number; activeSelector: string | null }> = {};

    for (const category of categories) {
      const selectors = SELECTORS[category];
      let matched = false;
      let matchCount = 0;
      let activeSelector: string | null = null;

      for (const sel of selectors) {
        try {
          const count = searchDoc.querySelectorAll(sel).length;
          if (count > 0 && !matched) {
            matched = true;
            matchCount = count;
            activeSelector = sel;
          }
        } catch { /* skip */ }
      }

      report[category] = { matched, matchCount, activeSelector };
    }

    // At minimum, these critical categories should match
    expect(report.marketplaceContainer.matched).toBe(true);
    expect(report.listingCard.matched).toBe(true);
    expect(report.listingLink.matched).toBe(true);
  });
});
