import { describe, it, expect } from 'vitest';
import { detectNewMatches, detectPriceDrops, frequencyToMinutes } from './notification-engine';
import type { PriceSnapshot } from './notification-engine';
import { createSavedSearch } from '@/core/models/saved-search';
import { buildListing } from '@/core/test-helpers';

describe('detectNewMatches', () => {
  const search = createSavedSearch({
    name: 'Cheap iPhones',
    query: 'iphone',
    notifications: { enabled: true, frequency: 'hourly' },
  });

  it('returns empty when notifications are disabled', () => {
    const disabled = createSavedSearch({
      name: 'Test',
      query: 'iphone',
      notifications: { enabled: false },
    });
    const listings = [buildListing({ title: 'iPhone 14', firstObserved: Date.now() })];
    expect(detectNewMatches(disabled, listings, 0)).toEqual([]);
  });

  it('returns empty when query is empty', () => {
    const empty = createSavedSearch({
      name: 'Browse',
      query: '',
      notifications: { enabled: true, frequency: 'hourly' },
    });
    const listings = [buildListing({ title: 'iPhone 14', firstObserved: Date.now() })];
    expect(detectNewMatches(empty, listings, 0)).toEqual([]);
  });

  it('finds matching listings newer than lastCheckedAt', () => {
    const now = Date.now();
    const listings = [
      buildListing({ id: 'new', title: 'iPhone 14 Pro', firstObserved: now }),
      buildListing({ id: 'old', title: 'iPhone 13', firstObserved: now - 10000 }),
    ];
    const result = detectNewMatches(search, listings, now - 5000);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('new-match');
    expect(result[0].listingId).toBe('new');
    expect(result[0].savedSearchId).toBe(search.id);
  });

  it('skips listings older than lastCheckedAt', () => {
    const now = Date.now();
    const listings = [
      buildListing({ id: 'old', title: 'iPhone 13', firstObserved: now - 10000 }),
    ];
    const result = detectNewMatches(search, listings, now);
    expect(result).toHaveLength(0);
  });

  it('skips listings that do not match query', () => {
    const listings = [
      buildListing({ id: '1', title: 'Samsung Galaxy S24', firstObserved: Date.now() }),
    ];
    expect(detectNewMatches(search, listings, 0)).toHaveLength(0);
  });

  it('includes price in notification body', () => {
    const listings = [
      buildListing({ id: '1', title: 'iPhone 14', price: 499, firstObserved: Date.now() }),
    ];
    const result = detectNewMatches(search, listings, 0);
    expect(result[0].body).toContain('$499');
  });
});

describe('detectPriceDrops', () => {
  it('detects drops above minimum threshold', () => {
    const snapshots: PriceSnapshot[] = [{
      listingId: '1',
      title: 'iPhone 14',
      url: 'https://example.com',
      previousPrice: 100,
      currentPrice: 80,
      currency: 'USD',
    }];
    const result = detectPriceDrops(snapshots);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('price-drop');
    expect(result[0].body).toContain('$100');
    expect(result[0].body).toContain('$80');
    expect(result[0].body).toContain('-20%');
  });

  it('ignores drops below minimum threshold', () => {
    const snapshots: PriceSnapshot[] = [{
      listingId: '1',
      title: 'iPhone',
      url: '',
      previousPrice: 100,
      currentPrice: 97,
      currency: 'USD',
    }];
    expect(detectPriceDrops(snapshots)).toHaveLength(0);
  });

  it('ignores price increases', () => {
    const snapshots: PriceSnapshot[] = [{
      listingId: '1',
      title: 'iPhone',
      url: '',
      previousPrice: 80,
      currentPrice: 100,
      currency: 'USD',
    }];
    expect(detectPriceDrops(snapshots)).toHaveLength(0);
  });

  it('ignores zero previous price', () => {
    const snapshots: PriceSnapshot[] = [{
      listingId: '1',
      title: 'iPhone',
      url: '',
      previousPrice: 0,
      currentPrice: 0,
      currency: 'USD',
    }];
    expect(detectPriceDrops(snapshots)).toHaveLength(0);
  });

  it('respects custom minDropPercent', () => {
    const snapshots: PriceSnapshot[] = [{
      listingId: '1',
      title: 'iPhone',
      url: '',
      previousPrice: 100,
      currentPrice: 90,
      currency: 'USD',
    }];
    expect(detectPriceDrops(snapshots, 15)).toHaveLength(0);
    expect(detectPriceDrops(snapshots, 5)).toHaveLength(1);
  });
});

describe('frequencyToMinutes', () => {
  it('returns 5 for realtime', () => {
    expect(frequencyToMinutes('realtime')).toBe(5);
  });

  it('returns 60 for hourly', () => {
    expect(frequencyToMinutes('hourly')).toBe(60);
  });

  it('returns 1440 for daily', () => {
    expect(frequencyToMinutes('daily')).toBe(1440);
  });

  it('returns 0 for manual', () => {
    expect(frequencyToMinutes('manual')).toBe(0);
  });

  it('returns 0 for unknown frequency', () => {
    expect(frequencyToMinutes('unknown')).toBe(0);
  });
});
