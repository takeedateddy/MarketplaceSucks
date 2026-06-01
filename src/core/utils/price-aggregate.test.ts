import { describe, it, expect } from "vitest";
import { aggregatePrices } from "@/core/utils/price-aggregate";

describe("aggregatePrices", () => {
  it("returns a zeroed aggregate for an empty list", () => {
    expect(aggregatePrices([])).toEqual({
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      p25: 0,
      p75: 0,
    });
  });

  it("ignores non-positive and non-finite prices", () => {
    const result = aggregatePrices([100, 0, -50, NaN, Infinity, 200]);
    expect(result.count).toBe(2);
    expect(result.min).toBe(100);
    expect(result.max).toBe(200);
  });

  it("computes summary statistics", () => {
    const result = aggregatePrices([100, 110, 120, 130, 140]);
    expect(result.count).toBe(5);
    expect(result.min).toBe(100);
    expect(result.max).toBe(140);
    expect(result.mean).toBe(120);
    expect(result.median).toBe(120);
    expect(result.p25).toBeLessThanOrEqual(result.median);
    expect(result.p75).toBeGreaterThanOrEqual(result.median);
  });
});
