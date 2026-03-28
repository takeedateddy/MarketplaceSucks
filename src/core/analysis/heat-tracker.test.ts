import { describe, it, expect } from 'vitest';
import { calculateHeatScore } from './heat-tracker';

describe('calculateHeatScore', () => {
  it('returns cool tier for no engagement', () => {
    const result = calculateHeatScore({
      engagement: { saves: null, comments: null, views: null },
      searchPosition: null,
      postedDate: null,
    });
    expect(result.score).toBe(0);
    expect(result.tier).toBe('cool');
    expect(result.limitedData).toBe(true);
  });

  it('scores absolute engagement', () => {
    const result = calculateHeatScore({
      engagement: { saves: 20, comments: 10, views: 500 },
      searchPosition: null,
      postedDate: null,
    });
    expect(result.breakdown.absoluteEngagement).toBe(40); // 15 + 15 + 10
    expect(result.tier).not.toBe('cool');
  });

  it('scores search position', () => {
    const result = calculateHeatScore({
      engagement: { saves: 1, comments: null, views: null },
      searchPosition: 3,
      postedDate: null,
    });
    expect(result.breakdown.positionScore).toBe(15);
  });

  it('scores recency boost for new listings with engagement', () => {
    const result = calculateHeatScore({
      engagement: { saves: 5, comments: 2, views: 100 },
      searchPosition: null,
      postedDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    });
    expect(result.breakdown.recencyBoost).toBe(10);
  });

  it('no recency boost for old listings', () => {
    const result = calculateHeatScore({
      engagement: { saves: 5, comments: 2, views: 100 },
      searchPosition: null,
      postedDate: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    });
    expect(result.breakdown.recencyBoost).toBe(0);
  });

  it('no recency boost without engagement', () => {
    const result = calculateHeatScore({
      engagement: { saves: 0, comments: 0, views: 0 },
      searchPosition: null,
      postedDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
    });
    expect(result.breakdown.recencyBoost).toBe(0);
  });

  it('calculates velocity with previous engagement', () => {
    const result = calculateHeatScore({
      engagement: { saves: 20, comments: 5, views: 200 },
      previousEngagement: {
        saves: 10,
        comments: 2,
        views: 100,
        observedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      },
      searchPosition: null,
      postedDate: null,
    });
    expect(result.breakdown.engagementVelocity).toBeGreaterThan(0);
  });

  it('returns correct tiers', () => {
    // Fire: score >= 80
    const fire = calculateHeatScore({
      engagement: { saves: 25, comments: 15, views: 600 },
      previousEngagement: {
        saves: 5, comments: 2, views: 100,
        observedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      searchPosition: 1,
      postedDate: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    });
    expect(fire.tier).toBe('fire');
  });

  it('clamps score to 0-100', () => {
    const result = calculateHeatScore({
      engagement: { saves: 100, comments: 50, views: 10000 },
      previousEngagement: {
        saves: 0, comments: 0, views: 0,
        observedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      searchPosition: 1,
      postedDate: new Date(Date.now() - 30 * 60 * 1000),
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('limitedData is false when any engagement metric is present', () => {
    const result = calculateHeatScore({
      engagement: { saves: 1, comments: null, views: null },
      searchPosition: null,
      postedDate: null,
    });
    expect(result.limitedData).toBe(false);
  });
});
