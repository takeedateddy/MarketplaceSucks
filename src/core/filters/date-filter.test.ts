import { describe, it, expect } from 'vitest';
import { DateFilter } from './date-filter';
import { buildListing } from '../test-helpers';

describe('DateFilter', () => {
  const filter = new DateFilter();

  it('passes all when maxAgeHours is null', () => {
    const listing = buildListing({ parsedDate: Date.now() - 999999999 });
    const result = filter.apply(listing, { maxAgeHours: null });
    expect(result.keep).toBe(true);
  });

  it('keeps listing with null parsedDate (no data)', () => {
    const listing = buildListing({ parsedDate: null });
    const result = filter.apply(listing, { maxAgeHours: 24 });
    expect(result.keep).toBe(true);
  });

  it('keeps recently posted listing', () => {
    const listing = buildListing({ parsedDate: Date.now() - 1 * 60 * 60 * 1000 }); // 1 hour ago
    const result = filter.apply(listing, { maxAgeHours: 24 });
    expect(result.keep).toBe(true);
  });

  it('removes old listing', () => {
    const listing = buildListing({ parsedDate: Date.now() - 48 * 60 * 60 * 1000 }); // 48 hours ago
    const result = filter.apply(listing, { maxAgeHours: 24 });
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('exceeds');
  });

  it('keeps listing at exact boundary (age equals max)', () => {
    // Just barely within - 23.99 hours
    const listing = buildListing({ parsedDate: Date.now() - 23.99 * 60 * 60 * 1000 });
    const result = filter.apply(listing, { maxAgeHours: 24 });
    expect(result.keep).toBe(true);
  });

  describe('validateConfig', () => {
    it('accepts valid configs', () => {
      expect(filter.validateConfig({ maxAgeHours: 24 })).toBe(true);
      expect(filter.validateConfig({ maxAgeHours: null })).toBe(true);
    });

    it('rejects non-number maxAgeHours', () => {
      expect(filter.validateConfig({ maxAgeHours: 'day' })).toBe(false);
    });
  });
});
