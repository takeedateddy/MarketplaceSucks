import { describe, it, expect } from 'vitest';
import {
  evaluateCategoryHealth,
  generateHealthReport,
  mergeOverrides,
  isValidSelector,
  type SelectorProbeResult,
  type SelectorOverride,
} from './selector-health';

describe('evaluateCategoryHealth', () => {
  it('returns healthy when primary selector matches', () => {
    const probes: SelectorProbeResult[] = [
      { selector: '[data-testid="primary"]', matched: true, matchCount: 5 },
      { selector: '.fallback', matched: false, matchCount: 0 },
    ];
    const result = evaluateCategoryHealth('listingCard', probes);
    expect(result.status).toBe('healthy');
    expect(result.activeIndex).toBe(0);
    expect(result.displayName).toBe('Listing Cards');
  });

  it('returns degraded when fallback selector matches', () => {
    const probes: SelectorProbeResult[] = [
      { selector: '[data-testid="primary"]', matched: false, matchCount: 0 },
      { selector: '.fallback', matched: true, matchCount: 3 },
    ];
    const result = evaluateCategoryHealth('listingTitle', probes);
    expect(result.status).toBe('degraded');
    expect(result.activeIndex).toBe(1);
  });

  it('returns broken when no selectors match', () => {
    const probes: SelectorProbeResult[] = [
      { selector: '[data-testid="primary"]', matched: false, matchCount: 0 },
      { selector: '.fallback', matched: false, matchCount: 0 },
    ];
    const result = evaluateCategoryHealth('listingPrice', probes);
    expect(result.status).toBe('broken');
    expect(result.activeIndex).toBe(-1);
  });

  it('uses category name as fallback display name for unknown categories', () => {
    const probes: SelectorProbeResult[] = [
      { selector: '.test', matched: true, matchCount: 1 },
    ];
    const result = evaluateCategoryHealth('customCategory', probes);
    expect(result.displayName).toBe('customCategory');
  });
});

describe('generateHealthReport', () => {
  it('calculates overall score correctly', () => {
    const categories = [
      evaluateCategoryHealth('a', [{ selector: 's1', matched: true, matchCount: 1 }]),  // healthy
      evaluateCategoryHealth('b', [
        { selector: 's1', matched: false, matchCount: 0 },
        { selector: 's2', matched: true, matchCount: 1 },
      ]), // degraded
      evaluateCategoryHealth('c', [{ selector: 's1', matched: false, matchCount: 0 }]), // broken
    ];
    const report = generateHealthReport(categories);
    expect(report.healthyCount).toBe(1);
    expect(report.degradedCount).toBe(1);
    expect(report.brokenCount).toBe(1);
    // score = (1*1 + 1*0.5 + 0) / 3 * 100 = 50
    expect(report.overallScore).toBe(50);
    expect(typeof report.checkedAt).toBe('number');
  });

  it('returns 100 for empty categories', () => {
    const report = generateHealthReport([]);
    expect(report.overallScore).toBe(100);
  });

  it('returns 100 when all healthy', () => {
    const categories = [
      evaluateCategoryHealth('a', [{ selector: 's', matched: true, matchCount: 1 }]),
      evaluateCategoryHealth('b', [{ selector: 's', matched: true, matchCount: 1 }]),
    ];
    const report = generateHealthReport(categories);
    expect(report.overallScore).toBe(100);
  });

  it('returns 0 when all broken', () => {
    const categories = [
      evaluateCategoryHealth('a', [{ selector: 's', matched: false, matchCount: 0 }]),
      evaluateCategoryHealth('b', [{ selector: 's', matched: false, matchCount: 0 }]),
    ];
    const report = generateHealthReport(categories);
    expect(report.overallScore).toBe(0);
  });
});

describe('mergeOverrides', () => {
  it('prepends override selectors to existing chain', () => {
    const base = {
      listingCard: ['[data-testid="original"]', '.fallback'],
    };
    const overrides: SelectorOverride[] = [{
      category: 'listingCard',
      selectors: ['.custom-selector'],
      createdAt: Date.now(),
    }];
    const merged = mergeOverrides(base, overrides);
    expect(merged.listingCard[0]).toBe('.custom-selector');
    expect(merged.listingCard[1]).toBe('[data-testid="original"]');
    expect(merged.listingCard[2]).toBe('.fallback');
  });

  it('deduplicates selectors', () => {
    const base = { listingCard: ['.existing'] };
    const overrides: SelectorOverride[] = [{
      category: 'listingCard',
      selectors: ['.existing', '.new'],
      createdAt: Date.now(),
    }];
    const merged = mergeOverrides(base, overrides);
    expect(merged.listingCard).toEqual(['.existing', '.new']);
  });

  it('does not modify categories without overrides', () => {
    const base = {
      listingCard: ['[data-testid="card"]'],
      listingTitle: ['[data-testid="title"]'],
    };
    const overrides: SelectorOverride[] = [{
      category: 'listingCard',
      selectors: ['.custom'],
      createdAt: Date.now(),
    }];
    const merged = mergeOverrides(base, overrides);
    expect(merged.listingTitle).toEqual(['[data-testid="title"]']);
  });

  it('handles overrides for categories not in base', () => {
    const base = {};
    const overrides: SelectorOverride[] = [{
      category: 'newCategory',
      selectors: ['.custom'],
      createdAt: Date.now(),
    }];
    const merged = mergeOverrides(base, overrides);
    expect(merged.newCategory).toEqual(['.custom']);
  });
});

describe('isValidSelector', () => {
  it('returns false for empty string', () => {
    expect(isValidSelector('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(isValidSelector('   ')).toBe(false);
  });

  it('returns true for valid CSS selectors', () => {
    expect(isValidSelector('.my-class')).toBe(true);
    expect(isValidSelector('[data-testid="test"]')).toBe(true);
    expect(isValidSelector('#my-id')).toBe(true);
    expect(isValidSelector('div > span')).toBe(true);
  });

  it('returns false for selectors containing braces', () => {
    expect(isValidSelector('.class { color: red }')).toBe(false);
  });
});
