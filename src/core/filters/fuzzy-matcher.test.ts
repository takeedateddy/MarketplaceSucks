import { describe, it, expect } from 'vitest';
import { matchesWithFuzzy } from './fuzzy-matcher';

describe('matchesWithFuzzy', () => {
  describe('quoted phrases', () => {
    it('matches exact phrase regardless of fuzzy level', () => {
      expect(matchesWithFuzzy('Mid Century Modern Table', '"mid century"', 'off')).toBe(true);
      expect(matchesWithFuzzy('Mid Century Modern Table', '"mid century"', 'high')).toBe(true);
    });

    it('rejects non-matching quoted phrase', () => {
      expect(matchesWithFuzzy('Mid Century Modern Table', '"century mid"', 'high')).toBe(false);
    });
  });

  describe('fuzzy off', () => {
    it('matches substring', () => {
      expect(matchesWithFuzzy('IKEA Malm Dresser', 'malm', 'off')).toBe(true);
    });

    it('rejects non-matching substring', () => {
      expect(matchesWithFuzzy('IKEA Malm Dresser', 'nightstand', 'off')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(matchesWithFuzzy('iPhone 14 Pro', 'IPHONE', 'off')).toBe(true);
    });
  });

  describe('fuzzy enabled', () => {
    it('matches exact substring even with fuzzy on', () => {
      expect(matchesWithFuzzy('Corvette Stingray', 'corvette', 'low')).toBe(true);
    });

    it('matches with typo at low level', () => {
      // "carvette" vs "corvette" = distance 1, maxLen 8 => 0.125 <= 0.15
      expect(matchesWithFuzzy('Corvette Stingray 2020', 'carvette', 'low')).toBe(true);
    });

    it('rejects large typos at low level', () => {
      expect(matchesWithFuzzy('Corvette Stingray', 'toyota', 'low')).toBe(false);
    });

    it('multi-word keyword requires ALL tokens to match', () => {
      expect(matchesWithFuzzy('IKEA Malm Dresser White', 'ikea malm', 'medium')).toBe(true);
      expect(matchesWithFuzzy('IKEA Kallax Shelf', 'ikea malm', 'medium')).toBe(false);
    });
  });
});
