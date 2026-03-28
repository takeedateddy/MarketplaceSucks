import { describe, it, expect } from 'vitest';
import { KeywordFilter } from './keyword-filter';
import { buildListing } from '../test-helpers';

describe('KeywordFilter', () => {
  const filter = new KeywordFilter();

  it('has correct metadata', () => {
    expect(filter.id).toBe('keyword-include');
    expect(filter.category).toBe('keyword');
  });

  it('passes all listings when keywords is empty', () => {
    const listing = buildListing({ title: 'Anything' });
    const result = filter.apply(listing, { keywords: '', fuzzyLevel: 'off' });
    expect(result.keep).toBe(true);
  });

  it('keeps listing matching any keyword (OR logic)', () => {
    const listing = buildListing({ title: 'IKEA Malm Dresser' });
    const result = filter.apply(listing, { keywords: 'nightstand, dresser', fuzzyLevel: 'off' });
    expect(result.keep).toBe(true);
  });

  it('removes listing matching no keywords', () => {
    const listing = buildListing({ title: 'Wooden Table' });
    const result = filter.apply(listing, { keywords: 'dresser, nightstand', fuzzyLevel: 'off' });
    expect(result.keep).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('supports quoted phrase matching', () => {
    const listing = buildListing({ title: 'Mid Century Modern Nightstand' });
    const result = filter.apply(listing, { keywords: '"mid century"', fuzzyLevel: 'off' });
    expect(result.keep).toBe(true);
  });

  it('uses fuzzy matching when enabled', () => {
    const listing = buildListing({ title: 'Corvette Stingray 2020' });
    const result = filter.apply(listing, { keywords: 'carvette', fuzzyLevel: 'low' });
    expect(result.keep).toBe(true);
  });

  describe('getDefaultConfig', () => {
    it('returns empty keywords and fuzzy off', () => {
      expect(filter.getDefaultConfig()).toEqual({ keywords: '', fuzzyLevel: 'off' });
    });
  });

  describe('validateConfig', () => {
    it('validates correct config', () => {
      expect(filter.validateConfig({ keywords: 'test', fuzzyLevel: 'low' })).toBe(true);
    });

    it('rejects invalid fuzzy level', () => {
      expect(filter.validateConfig({ keywords: 'test', fuzzyLevel: 'extreme' })).toBe(false);
    });

    it('rejects non-string keywords', () => {
      expect(filter.validateConfig({ keywords: 123, fuzzyLevel: 'off' })).toBe(false);
    });

    it('rejects null', () => {
      expect(filter.validateConfig(null)).toBe(false);
    });
  });
});
