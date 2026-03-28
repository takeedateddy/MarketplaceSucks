import { describe, it, expect } from 'vitest';
import { ConditionFilter } from './condition-filter';
import { buildListing } from '../test-helpers';

describe('ConditionFilter', () => {
  const filter = new ConditionFilter();

  it('passes all when conditions array is empty', () => {
    const listing = buildListing({ condition: 'salvage' });
    const result = filter.apply(listing, { conditions: [] });
    expect(result.keep).toBe(true);
  });

  it('keeps listing with matching condition', () => {
    const listing = buildListing({ condition: 'new' });
    const result = filter.apply(listing, { conditions: ['new', 'like_new'] });
    expect(result.keep).toBe(true);
  });

  it('removes listing with non-matching condition', () => {
    const listing = buildListing({ condition: 'salvage' });
    const result = filter.apply(listing, { conditions: ['new', 'like_new'] });
    expect(result.keep).toBe(false);
  });

  it('is case-insensitive', () => {
    const listing = buildListing({ condition: 'new' });
    const result = filter.apply(listing, { conditions: ['NEW'] });
    expect(result.keep).toBe(true);
  });

  it('handles unknown condition not in allowed list', () => {
    const listing = buildListing({ condition: 'unknown' });
    const result = filter.apply(listing, { conditions: ['new', 'good'] });
    expect(result.keep).toBe(false);
  });

  describe('validateConfig', () => {
    it('accepts valid config', () => {
      expect(filter.validateConfig({ conditions: ['new', 'good'] })).toBe(true);
      expect(filter.validateConfig({ conditions: [] })).toBe(true);
    });

    it('rejects non-array conditions', () => {
      expect(filter.validateConfig({ conditions: 'new' })).toBe(false);
    });
  });
});
