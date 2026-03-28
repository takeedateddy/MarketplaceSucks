import { describe, it, expect } from 'vitest';
import { forecastSale } from './sales-forecaster';

function makeInput(overrides?: Partial<Parameters<typeof forecastSale>[0]>) {
  return {
    categoryAvgDays: 14,
    categoryDataPoints: 20,
    priceRatio: null,
    heatScore: null,
    condition: null,
    price: 100,
    isWeekendListing: false,
    isResponsiveSeller: false,
    ...overrides,
  };
}

describe('forecastSale', () => {
  it('returns null for < 5 data points', () => {
    expect(forecastSale(makeInput({ categoryDataPoints: 4 }))).toBeNull();
  });

  it('returns result for exactly 5 data points', () => {
    const result = forecastSale(makeInput({ categoryDataPoints: 5 }));
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('low');
  });

  it('uses default base of 14 days when categoryAvgDays is null', () => {
    const result = forecastSale(makeInput({ categoryAvgDays: null }));
    expect(result).not.toBeNull();
    expect(result!.reasoning[0]).toContain('14');
  });

  it('provides correct confidence levels', () => {
    expect(forecastSale(makeInput({ categoryDataPoints: 5 }))!.confidence).toBe('low');
    expect(forecastSale(makeInput({ categoryDataPoints: 10 }))!.confidence).toBe('medium');
    expect(forecastSale(makeInput({ categoryDataPoints: 20 }))!.confidence).toBe('high');
  });

  it('adjusts for price ratio', () => {
    const cheap = forecastSale(makeInput({ priceRatio: 0.3 }))!; // ×0.5
    const expensive = forecastSale(makeInput({ priceRatio: 2.0 }))!; // ×2.0
    expect(cheap.estimatedDays).toBeLessThan(expensive.estimatedDays);
  });

  it('adjusts for heat score', () => {
    const hot = forecastSale(makeInput({ heatScore: 90 }))!; // ×0.4
    const cold = forecastSale(makeInput({ heatScore: 10 }))!; // ×1.5
    expect(hot.estimatedDays).toBeLessThan(cold.estimatedDays);
  });

  it('adjusts for condition', () => {
    const newItem = forecastSale(makeInput({ condition: 'new' }))!; // ×0.7
    const salvage = forecastSale(makeInput({ condition: 'salvage' }))!; // ×1.5
    expect(newItem.estimatedDays).toBeLessThan(salvage.estimatedDays);
  });

  it('adjusts for free items', () => {
    const free = forecastSale(makeInput({ price: 0 }))!; // ×0.5
    const mid = forecastSale(makeInput({ price: 300 }))!; // ×1.0
    expect(free.estimatedDays).toBeLessThan(mid.estimatedDays);
  });

  it('adjusts for weekend listing', () => {
    const weekend = forecastSale(makeInput({ isWeekendListing: true }))!; // ×0.9
    const weekday = forecastSale(makeInput({ isWeekendListing: false }))!; // ×1.0
    expect(weekend.estimatedDays).toBeLessThan(weekday.estimatedDays);
  });

  it('adjusts for responsive seller', () => {
    const responsive = forecastSale(makeInput({ isResponsiveSeller: true }))!; // ×0.8
    const slow = forecastSale(makeInput({ isResponsiveSeller: false }))!; // ×1.0
    expect(responsive.estimatedDays).toBeLessThan(slow.estimatedDays);
  });

  it('clamps to 0.25-90 days', () => {
    // Very fast: all favorable
    const fast = forecastSale(makeInput({
      categoryAvgDays: 1,
      priceRatio: 0.2,
      heatScore: 100,
      condition: 'new',
      price: 0,
      isWeekendListing: true,
      isResponsiveSeller: true,
    }))!;
    expect(fast.estimatedDays).toBeGreaterThanOrEqual(0.25);

    // Very slow: all unfavorable
    const slow = forecastSale(makeInput({
      categoryAvgDays: 90,
      priceRatio: 5.0,
      heatScore: 0,
      condition: 'salvage',
      price: 5000,
    }))!;
    expect(slow.estimatedDays).toBeLessThanOrEqual(90);
  });

  it('formats display estimate correctly', () => {
    const fast = forecastSale(makeInput({ categoryAvgDays: 1 }))!;
    expect(fast.displayEstimate).toBeTruthy();

    const slow = forecastSale(makeInput({ categoryAvgDays: 60 }))!;
    expect(slow.displayEstimate).toBe('1+ months');
  });

  it('assigns urgency tiers correctly', () => {
    const actFast = forecastSale(makeInput({
      categoryAvgDays: 1, priceRatio: 0.3, heatScore: 90,
    }))!;
    expect(actFast.urgency).toBe('act-fast');
  });
});
