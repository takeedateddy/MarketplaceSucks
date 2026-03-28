import { describe, it, expect } from 'vitest';
import { createPriceDataPoint, validatePriceDataPoint } from './price-data';

describe('createPriceDataPoint', () => {
  it('creates with required fields and defaults', () => {
    const point = createPriceDataPoint({
      listingId: '123',
      price: 500,
      currency: 'USD',
    });
    expect(point.listingId).toBe('123');
    expect(point.price).toBe(500);
    expect(point.currency).toBe('USD');
    expect(point.source).toBe('listing_card');
    expect(point.priceDropFromPrevious).toBeNull();
    expect(point.priceDropPercentage).toBeNull();
    expect(typeof point.timestamp).toBe('number');
  });

  it('uses provided source', () => {
    const point = createPriceDataPoint({
      listingId: '123',
      price: 500,
      currency: 'USD',
      source: 'detail_page',
    });
    expect(point.source).toBe('detail_page');
  });

  it('uses provided price drop data', () => {
    const point = createPriceDataPoint({
      listingId: '123',
      price: 400,
      currency: 'USD',
      priceDropFromPrevious: -100,
      priceDropPercentage: -20,
    });
    expect(point.priceDropFromPrevious).toBe(-100);
    expect(point.priceDropPercentage).toBe(-20);
  });
});

describe('validatePriceDataPoint', () => {
  it('returns true for valid point', () => {
    const point = createPriceDataPoint({ listingId: '1', price: 100, currency: 'USD' });
    expect(validatePriceDataPoint(point)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validatePriceDataPoint(null)).toBe(false);
  });

  it('returns false for invalid source', () => {
    const point = createPriceDataPoint({ listingId: '1', price: 100, currency: 'USD' });
    expect(validatePriceDataPoint({ ...point, source: 'unknown' })).toBe(false);
  });

  it('returns false for non-number price', () => {
    const point = createPriceDataPoint({ listingId: '1', price: 100, currency: 'USD' });
    expect(validatePriceDataPoint({ ...point, price: 'free' })).toBe(false);
  });
});
