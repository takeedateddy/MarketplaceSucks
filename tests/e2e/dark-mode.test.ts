/**
 * Dark mode detection and selector validation tests.
 *
 * Verifies that the darkModeIndicator selectors correctly detect
 * Facebook's dark mode DOM classes, and that all critical selectors
 * still work in dark mode markup.
 *
 * @module tests/e2e/dark-mode
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { SELECTORS } from '@/content/selectors.config';

let darkDoc: Document;
let lightDoc: Document;

function queryFirst(doc: Document, selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) return el;
    } catch { /* skip */ }
  }
  return null;
}

function queryAll(doc: Document, selectors: readonly string[]): Element[] {
  for (const sel of selectors) {
    try {
      const els = doc.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch { /* skip */ }
  }
  return [];
}

beforeAll(() => {
  const darkHtml = readFileSync(
    resolve(__dirname, 'fixtures/marketplace-search-results-dark.html'),
    'utf-8',
  );
  darkDoc = new JSDOM(darkHtml).window.document;

  const lightHtml = readFileSync(
    resolve(__dirname, 'fixtures/marketplace-search-results.html'),
    'utf-8',
  );
  lightDoc = new JSDOM(lightHtml).window.document;
});

describe('Dark mode detection', () => {
  it('detects dark mode via __fb-dark-mode class on html', () => {
    const el = queryFirst(darkDoc, SELECTORS.darkModeIndicator);
    expect(el).not.toBeNull();
  });

  it('does not detect dark mode on light mode page', () => {
    const el = queryFirst(lightDoc, SELECTORS.darkModeIndicator);
    expect(el).toBeNull();
  });

  it('detects dark mode via data-color-scheme attribute', () => {
    const el = darkDoc.querySelector('html[data-color-scheme="dark"]');
    expect(el).not.toBeNull();
  });
});

describe('Critical selectors work in dark mode', () => {
  it('marketplaceContainer matches', () => {
    expect(queryFirst(darkDoc, SELECTORS.marketplaceContainer)).not.toBeNull();
  });

  it('listingCard matches', () => {
    expect(queryAll(darkDoc, SELECTORS.listingCard).length).toBeGreaterThan(0);
  });

  it('listingTitle matches', () => {
    const cards = queryAll(darkDoc, SELECTORS.listingCard);
    let found = false;
    for (const card of cards) {
      for (const sel of SELECTORS.listingTitle) {
        try {
          if (card.querySelector(sel)?.textContent?.trim()) {
            found = true;
            break;
          }
        } catch { /* skip */ }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  it('listingPrice matches', () => {
    const cards = queryAll(darkDoc, SELECTORS.listingCard);
    let found = false;
    for (const card of cards) {
      for (const sel of SELECTORS.listingPrice) {
        try {
          if (card.querySelector(sel)?.textContent?.trim()) {
            found = true;
            break;
          }
        } catch { /* skip */ }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  it('listingLink matches', () => {
    const cards = queryAll(darkDoc, SELECTORS.listingCard);
    let found = false;
    for (const card of cards) {
      for (const sel of SELECTORS.listingLink) {
        try {
          if (card.querySelector(sel)?.getAttribute('href')?.includes('/marketplace/item/')) {
            found = true;
            break;
          }
        } catch { /* skip */ }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });
});
