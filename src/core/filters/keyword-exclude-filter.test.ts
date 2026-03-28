import { describe, it, expect } from 'vitest';
import { KeywordExcludeFilter } from './keyword-exclude-filter';
import { buildListing } from '../test-helpers';

describe('KeywordExcludeFilter', () => {
  const filter = new KeywordExcludeFilter();

  it('has correct metadata', () => {
    expect(filter.id).toBe('keyword-exclude');
    expect(filter.category).toBe('keyword');
  });

  it('passes all listings when keywords is empty', () => {
    const listing = buildListing({ title: 'Broken Phone' });
    const result = filter.apply(listing, { keywords: '', fuzzyLevel: 'off' });
    expect(result.keep).toBe(true);
  });

  it('removes listing matching any excluded keyword', () => {
    const listing = buildListing({ title: 'Broken iPhone Screen' });
    const result = filter.apply(listing, { keywords: 'broken, damaged', fuzzyLevel: 'off' });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('broken');
  });

  it('keeps listing not matching any excluded keyword', () => {
    const listing = buildListing({ title: 'iPhone 14 Pro Max' });
    const result = filter.apply(listing, { keywords: 'broken, damaged', fuzzyLevel: 'off' });
    expect(result.keep).toBe(true);
  });

  it('supports fuzzy exclusion', () => {
    const listing = buildListing({ title: 'Brokn iPhone' });
    const result = filter.apply(listing, { keywords: 'broken', fuzzyLevel: 'high' });
    expect(result.keep).toBe(false);
  });

  it('supports quoted phrase exclusion', () => {
    const listing = buildListing({ title: 'Phone for parts only' });
    const result = filter.apply(listing, { keywords: '"for parts"', fuzzyLevel: 'off' });
    expect(result.keep).toBe(false);
  });
});
