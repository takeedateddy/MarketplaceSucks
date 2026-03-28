import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  isFuzzyMatch,
  jaccardSimilarity,
  cosineSimilarity,
  termFrequency,
  getFuzzyThreshold,
} from './similarity-utils';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('calculates single substitution', () => {
    expect(levenshteinDistance('corvette', 'carvette')).toBe(1);
  });

  it('calculates multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});

describe('isFuzzyMatch', () => {
  it('returns true for exact match (case-insensitive)', () => {
    expect(isFuzzyMatch('Hello', 'hello')).toBe(true);
  });

  it('returns true within threshold', () => {
    expect(isFuzzyMatch('corvette', 'carvette', 0.3)).toBe(true);
  });

  it('returns false outside threshold', () => {
    expect(isFuzzyMatch('corvette', 'toyota', 0.3)).toBe(false);
  });

  it('returns true for both empty strings', () => {
    expect(isFuzzyMatch('', '')).toBe(true);
  });

  it('uses default threshold of 0.3', () => {
    // distance 1, maxLen 8 => 0.125 < 0.3
    expect(isFuzzyMatch('corvette', 'carvette')).toBe(true);
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for two empty arrays', () => {
    expect(jaccardSimilarity([], [])).toBe(1);
  });

  it('returns 0 when one is empty', () => {
    expect(jaccardSimilarity(['a'], [])).toBe(0);
    expect(jaccardSimilarity([], ['a'])).toBe(0);
  });

  it('returns 1 for identical sets', () => {
    expect(jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('calculates partial overlap', () => {
    // intersection=2 (ikea,malm), union=4 (ikea,malm,dresser,nightstand)
    const result = jaccardSimilarity(['ikea', 'malm', 'dresser'], ['ikea', 'malm', 'nightstand']);
    expect(result).toBe(0.5);
  });
});

describe('cosineSimilarity', () => {
  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity({}, {})).toBe(0);
    expect(cosineSimilarity({ a: 1 }, {})).toBe(0);
  });

  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity({ a: 1 }, { b: 1 })).toBe(0);
  });

  it('calculates partial overlap', () => {
    const result = cosineSimilarity(
      { ikea: 1, malm: 1, dresser: 1 },
      { ikea: 1, malm: 1, nightstand: 1 },
    );
    expect(result).toBeCloseTo(2 / 3, 3);
  });
});

describe('termFrequency', () => {
  it('counts token occurrences', () => {
    expect(termFrequency(['ikea', 'malm', 'ikea'])).toEqual({ ikea: 2, malm: 1 });
  });

  it('returns empty object for empty array', () => {
    expect(termFrequency([])).toEqual({});
  });
});

describe('getFuzzyThreshold', () => {
  it('returns 0 for off', () => {
    expect(getFuzzyThreshold('off')).toBe(0);
  });

  it('returns 0.15 for low', () => {
    expect(getFuzzyThreshold('low')).toBe(0.15);
  });

  it('returns 0.25 for medium', () => {
    expect(getFuzzyThreshold('medium')).toBe(0.25);
  });

  it('returns 0.4 for high', () => {
    expect(getFuzzyThreshold('high')).toBe(0.4);
  });
});
