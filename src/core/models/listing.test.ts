import { describe, it, expect } from 'vitest';
import { createListing, validateListing, hasPrice, hasParsedDate, hasCoordinates } from './listing';

describe('createListing', () => {
  it('creates listing with required fields and defaults', () => {
    const listing = createListing({
      id: '123',
      title: 'Test Item',
      listingUrl: 'https://facebook.com/marketplace/item/123',
    });

    expect(listing.id).toBe('123');
    expect(listing.title).toBe('Test Item');
    expect(listing.listingUrl).toBe('https://facebook.com/marketplace/item/123');
    expect(listing.currency).toBe('USD');
    expect(listing.condition).toBe('unknown');
    expect(listing.price).toBeNull();
    expect(listing.category).toBeNull();
    expect(listing.location).toBeNull();
    expect(listing.coordinates).toBeNull();
    expect(listing.distance).toBeNull();
    expect(listing.sellerName).toBeNull();
    expect(listing.sellerProfileUrl).toBeNull();
    expect(listing.imageUrls).toEqual([]);
    expect(listing.datePosted).toBeNull();
    expect(listing.parsedDate).toBeNull();
    expect(listing.shippingAvailable).toBe(false);
    expect(listing.engagement).toEqual({ saves: null, comments: null, views: null });
    expect(typeof listing.firstObserved).toBe('number');
    expect(typeof listing.lastObserved).toBe('number');
  });

  it('normalizes title to lowercase with collapsed whitespace', () => {
    const listing = createListing({
      id: '1',
      title: '  Like  NEW  iPhone 14!! ',
      listingUrl: 'https://example.com',
    });
    expect(listing.normalizedTitle).toBe('like new iphone 14!!');
  });

  it('tokenizes title', () => {
    const listing = createListing({
      id: '1',
      title: 'IKEA Malm Dresser',
      listingUrl: 'https://example.com',
    });
    expect(listing.titleTokens).toContain('ikea');
    expect(listing.titleTokens).toContain('malm');
    expect(listing.titleTokens).toContain('dresser');
  });

  it('uses provided optional fields', () => {
    const listing = createListing({
      id: '1',
      title: 'Test',
      listingUrl: 'https://example.com',
      price: 99.99,
      condition: 'like_new',
      currency: 'EUR',
      distance: 5.2,
      shippingAvailable: true,
      engagement: { saves: 10, comments: 3 },
    });
    expect(listing.price).toBe(99.99);
    expect(listing.condition).toBe('like_new');
    expect(listing.currency).toBe('EUR');
    expect(listing.distance).toBe(5.2);
    expect(listing.shippingAvailable).toBe(true);
    expect(listing.engagement.saves).toBe(10);
    expect(listing.engagement.comments).toBe(3);
    expect(listing.engagement.views).toBeNull();
  });
});

describe('validateListing', () => {
  it('returns true for valid listing', () => {
    const listing = createListing({
      id: '1',
      title: 'Test',
      listingUrl: 'https://example.com',
    });
    expect(validateListing(listing)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateListing(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(validateListing('string')).toBe(false);
  });

  it('returns false for missing id', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'url' });
    const broken = { ...listing, id: '' };
    expect(validateListing(broken)).toBe(false);
  });

  it('returns false for invalid condition', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'url' });
    const broken = { ...listing, condition: 'broken' };
    expect(validateListing(broken)).toBe(false);
  });

  it('returns false for invalid price type', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'url' });
    const broken = { ...listing, price: 'free' };
    expect(validateListing(broken)).toBe(false);
  });
});

describe('hasPrice', () => {
  it('returns true when price is a number', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'u', price: 100 });
    expect(hasPrice(listing)).toBe(true);
  });

  it('returns false when price is null', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'u' });
    expect(hasPrice(listing)).toBe(false);
  });
});

describe('hasParsedDate', () => {
  it('returns true when parsedDate is a number', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'u', parsedDate: Date.now() });
    expect(hasParsedDate(listing)).toBe(true);
  });

  it('returns false when parsedDate is null', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'u' });
    expect(hasParsedDate(listing)).toBe(false);
  });
});

describe('hasCoordinates', () => {
  it('returns true when coordinates exist', () => {
    const listing = createListing({
      id: '1', title: 'T', listingUrl: 'u',
      coordinates: { lat: 40.7, lng: -74.0 },
    });
    expect(hasCoordinates(listing)).toBe(true);
  });

  it('returns false when coordinates is null', () => {
    const listing = createListing({ id: '1', title: 'T', listingUrl: 'u' });
    expect(hasCoordinates(listing)).toBe(false);
  });
});
