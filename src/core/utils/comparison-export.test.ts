import { describe, it, expect } from 'vitest';
import { formatAsMarkdown, formatAsText } from './comparison-export';
import type { ComparisonResult } from '@/core/analysis/comparison-engine';

const mockResult: ComparisonResult = {
  listingIds: ['a', 'b'],
  dimensions: [
    { label: 'Price', values: { a: '$50', b: '$100' }, bestId: 'a', lowerIsBetter: true },
    { label: 'Seller Trust', values: { a: '80/100', b: '60/100' }, bestId: 'a', lowerIsBetter: false },
    { label: 'Condition', values: { a: 'good', b: 'like_new' }, bestId: null, lowerIsBetter: false },
  ],
  summary: 'Listing A appears to be the strongest option.',
  recommendedId: 'a',
};

const titles: Record<string, string> = {
  a: 'IKEA Malm Dresser',
  b: 'Wooden Bookshelf',
};

describe('formatAsMarkdown', () => {
  it('returns table with header, separator, and data rows', () => {
    const md = formatAsMarkdown(mockResult, titles);
    expect(md).toContain('| Dimension |');
    expect(md).toContain('| --- |');
    expect(md).toContain('| Price |');
    expect(md).toContain('| Seller Trust |');
    expect(md).toContain('| Condition |');
  });

  it('bolds best values', () => {
    const md = formatAsMarkdown(mockResult, titles);
    expect(md).toContain('**$50**');
    expect(md).toContain('**80/100**');
  });

  it('does not bold values without a bestId', () => {
    const md = formatAsMarkdown(mockResult, titles);
    // Condition has no bestId, so neither value should be bold
    expect(md).toContain('| Condition | good | like_new |');
  });

  it('includes recommendation', () => {
    const md = formatAsMarkdown(mockResult, titles);
    expect(md).toContain('**Recommended:** IKEA Malm Dresser');
  });

  it('includes summary', () => {
    const md = formatAsMarkdown(mockResult, titles);
    expect(md).toContain('Listing A appears to be the strongest option.');
  });

  it('uses listing titles in headers', () => {
    const md = formatAsMarkdown(mockResult, titles);
    expect(md).toContain('IKEA Malm Dresser');
    expect(md).toContain('Wooden Bookshelf');
  });

  it('truncates long titles to 30 chars', () => {
    const longTitles = { a: 'A Very Long Listing Title That Exceeds Thirty Characters', b: 'Short' };
    const md = formatAsMarkdown(mockResult, longTitles);
    expect(md).toContain('...');
    expect(md).not.toContain('Exceeds Thirty Characters');
  });

  it('falls back to letter labels for missing titles', () => {
    const md = formatAsMarkdown(mockResult, {});
    expect(md).toContain('Listing A');
    expect(md).toContain('Listing B');
  });

  it('handles empty dimensions', () => {
    const empty: ComparisonResult = { listingIds: [], dimensions: [], summary: '', recommendedId: null };
    expect(formatAsMarkdown(empty, {})).toBe('No comparison data.');
  });

  it('handles no recommendation', () => {
    const noRec = { ...mockResult, recommendedId: null };
    const md = formatAsMarkdown(noRec, titles);
    expect(md).not.toContain('**Recommended:**');
  });
});

describe('formatAsText', () => {
  it('starts with header', () => {
    const text = formatAsText(mockResult, titles);
    expect(text).toContain('Marketplace Comparison');
  });

  it('lists per-listing dimension values', () => {
    const text = formatAsText(mockResult, titles);
    expect(text).toContain('IKEA Malm Dresser: Price: $50');
    expect(text).toContain('Wooden Bookshelf: Price: $100');
  });

  it('shows winner highlights', () => {
    const text = formatAsText(mockResult, titles);
    expect(text).toContain('IKEA Malm Dresser leads in: price, seller trust');
  });

  it('includes summary', () => {
    const text = formatAsText(mockResult, titles);
    expect(text).toContain('Listing A appears to be the strongest option.');
  });

  it('handles empty dimensions', () => {
    const empty: ComparisonResult = { listingIds: [], dimensions: [], summary: '', recommendedId: null };
    expect(formatAsText(empty, {})).toBe('No comparison data.');
  });

  it('falls back to letter labels', () => {
    const text = formatAsText(mockResult, {});
    expect(text).toContain('Listing A:');
    expect(text).toContain('Listing B:');
  });
});
