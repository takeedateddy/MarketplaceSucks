import { describe, it, expect } from 'vitest';
import { calculateTrustScore, describeTrustFactor, TRUST_FACTOR_MAX_SCORES } from './seller-trust';

describe('calculateTrustScore', () => {
  it('returns insufficient confidence with no data', () => {
    const result = calculateTrustScore({});
    expect(result.confidence).toBe('insufficient');
    expect(result.dataPointCount).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns high confidence with 5+ factors', () => {
    const result = calculateTrustScore({
      accountAgeDays: 1800, // 60 months
      rating: { overall: 4.8, totalReviews: 55, positiveCount: null, negativeCount: null },
      profileImageUrl: 'https://example.com/photo.jpg',
      location: 'Brooklyn, NY',
      responseRate: 95,
      activeListings: 5,
    });
    expect(result.confidence).toBe('high');
    expect(result.dataPointCount).toBeGreaterThanOrEqual(5);
  });

  it('scores account age correctly', () => {
    // < 3 months = 0 points
    const young = calculateTrustScore({ accountAgeDays: 30 });
    expect(young.breakdown.accountAge).toBe(0);

    // 60+ months = 25 points
    const old = calculateTrustScore({ accountAgeDays: 1900 });
    expect(old.breakdown.accountAge).toBe(25);
  });

  it('scores rating correctly', () => {
    const high = calculateTrustScore({
      rating: { overall: 4.8, totalReviews: null, positiveCount: null, negativeCount: null },
    });
    expect(high.breakdown.rating).toBe(25);

    const low = calculateTrustScore({
      rating: { overall: 2.5, totalReviews: null, positiveCount: null, negativeCount: null },
    });
    expect(low.breakdown.rating).toBe(0);
  });

  it('scores rating volume correctly', () => {
    const many = calculateTrustScore({
      rating: { overall: null, totalReviews: 100, positiveCount: null, negativeCount: null },
    });
    expect(many.breakdown.ratingVolume).toBe(15);

    const zero = calculateTrustScore({
      rating: { overall: null, totalReviews: 0, positiveCount: null, negativeCount: null },
    });
    expect(zero.breakdown.ratingVolume).toBe(3);
  });

  it('assigns correct trust tiers', () => {
    // Trusted: high score
    const trusted = calculateTrustScore({
      accountAgeDays: 1900,
      rating: { overall: 4.9, totalReviews: 100, positiveCount: null, negativeCount: null },
      profileImageUrl: 'url', location: 'NY',
      activeListings: 3,
    });
    expect(trusted.tier).toBe('trusted');

    // Low: minimal data, low scores
    const low = calculateTrustScore({ accountAgeDays: 10 });
    expect(low.score).toBeLessThan(40);
  });

  it('clamps score to 0-100', () => {
    const result = calculateTrustScore({
      accountAgeDays: 1900,
      rating: { overall: 5.0, totalReviews: 200, positiveCount: null, negativeCount: null },
      profileImageUrl: 'url', location: 'NY',
      activeListings: 1,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('tracks factorsWithData', () => {
    const result = calculateTrustScore({ accountAgeDays: 365, activeListings: 5 });
    expect(result.factorsWithData).toContain('accountAge');
    expect(result.factorsWithData).toContain('listingBehavior');
  });
});

describe('describeTrustFactor', () => {
  it('returns formatted string', () => {
    const desc = describeTrustFactor('accountAge', 20, 25);
    expect(desc).toContain('Account age');
    expect(desc).toContain('20/25');
    expect(desc).toContain('80%');
  });
});

describe('TRUST_FACTOR_MAX_SCORES', () => {
  it('sums to 100', () => {
    const total = Object.values(TRUST_FACTOR_MAX_SCORES).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});
