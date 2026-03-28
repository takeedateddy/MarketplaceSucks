import { describe, it, expect } from 'vitest';
import { createSellerProfile, validateSellerProfile } from './seller';

describe('createSellerProfile', () => {
  it('creates profile with required fields and defaults', () => {
    const seller = createSellerProfile({
      id: 's1',
      displayName: 'Jane',
      profileUrl: 'https://facebook.com/profile/s1',
    });

    expect(seller.id).toBe('s1');
    expect(seller.displayName).toBe('Jane');
    expect(seller.profileUrl).toBe('https://facebook.com/profile/s1');
    expect(seller.profileImageUrl).toBeNull();
    expect(seller.joinedDate).toBeNull();
    expect(seller.accountAgeDays).toBeNull();
    expect(seller.rating).toEqual({ overall: null, totalReviews: null, positiveCount: null, negativeCount: null });
    expect(seller.responseRate).toBeNull();
    expect(seller.responseTime).toBeNull();
    expect(seller.profileCompleteness).toBe('unknown');
    expect(seller.trustScore).toBeNull();
    expect(seller.totalListings).toBeNull();
    expect(seller.activeListings).toBeNull();
    expect(seller.isVerified).toBe(false);
    expect(seller.location).toBeNull();
  });

  it('uses provided optional fields', () => {
    const seller = createSellerProfile({
      id: 's1',
      displayName: 'Jane',
      profileUrl: 'https://example.com',
      accountAgeDays: 730,
      rating: { overall: 4.8, totalReviews: 23 },
      isVerified: true,
      profileCompleteness: 'full',
    });
    expect(seller.accountAgeDays).toBe(730);
    expect(seller.rating.overall).toBe(4.8);
    expect(seller.rating.totalReviews).toBe(23);
    expect(seller.rating.positiveCount).toBeNull();
    expect(seller.isVerified).toBe(true);
    expect(seller.profileCompleteness).toBe('full');
  });
});

describe('validateSellerProfile', () => {
  it('returns true for valid profile', () => {
    const seller = createSellerProfile({
      id: 's1',
      displayName: 'Jane',
      profileUrl: 'https://example.com',
    });
    expect(validateSellerProfile(seller)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateSellerProfile(null)).toBe(false);
  });

  it('returns false for empty id', () => {
    const seller = createSellerProfile({ id: 's1', displayName: 'J', profileUrl: 'u' });
    expect(validateSellerProfile({ ...seller, id: '' })).toBe(false);
  });

  it('returns false for invalid profileCompleteness', () => {
    const seller = createSellerProfile({ id: 's1', displayName: 'J', profileUrl: 'u' });
    expect(validateSellerProfile({ ...seller, profileCompleteness: 'invalid' })).toBe(false);
  });

  it('returns false for non-boolean isVerified', () => {
    const seller = createSellerProfile({ id: 's1', displayName: 'J', profileUrl: 'u' });
    expect(validateSellerProfile({ ...seller, isVerified: 'yes' })).toBe(false);
  });
});
