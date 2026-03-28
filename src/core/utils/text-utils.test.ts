import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  tokenizeTitle,
  titleContainsKeyword,
  parseKeywords,
  parsePrice,
  parseRelativeTime,
  parseDistance,
} from './text-utils';

describe('normalizeTitle', () => {
  it('lowercases the title', () => {
    expect(normalizeTitle('IKEA MALM')).toBe('ikea malm');
  });

  it('removes special characters', () => {
    expect(normalizeTitle('Great Condition!!! $$$')).toBe('great condition');
  });

  it('collapses whitespace', () => {
    expect(normalizeTitle('  lots   of   spaces  ')).toBe('lots of spaces');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });

  it('handles hyphens (removes them)', () => {
    expect(normalizeTitle('Mid-Century Modern')).toBe('mid century modern');
  });

  it('preserves underscores (part of \\w)', () => {
    expect(normalizeTitle('Modern_Table')).toBe('modern_table');
  });
});

describe('tokenizeTitle', () => {
  it('removes stop words', () => {
    const tokens = tokenizeTitle('IKEA Malm Dresser - Great Condition!!');
    expect(tokens).toContain('ikea');
    expect(tokens).toContain('malm');
    expect(tokens).toContain('dresser');
    expect(tokens).not.toContain('great');
    expect(tokens).not.toContain('condition');
  });

  it('filters out single-character tokens', () => {
    const tokens = tokenizeTitle('A B C Dresser');
    expect(tokens).not.toContain('a');
    expect(tokens).not.toContain('b');
    expect(tokens).not.toContain('c');
    expect(tokens).toContain('dresser');
  });

  it('returns empty array for all stop words', () => {
    const tokens = tokenizeTitle('the and or but');
    expect(tokens).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(tokenizeTitle('')).toEqual([]);
  });
});

describe('titleContainsKeyword', () => {
  it('matches substring case-insensitively', () => {
    expect(titleContainsKeyword('Mid Century Modern Nightstand', 'nightstand')).toBe(true);
  });

  it('matches quoted phrase', () => {
    expect(titleContainsKeyword('Mid Century Modern Nightstand', '"mid century"')).toBe(true);
  });

  it('rejects non-matching quoted phrase', () => {
    expect(titleContainsKeyword('Mid Century Modern Nightstand', '"century mid"')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(titleContainsKeyword('IPHONE 14 PRO', 'iphone')).toBe(true);
  });

  it('does not match absent keyword', () => {
    expect(titleContainsKeyword('Wooden Table', 'chair')).toBe(false);
  });
});

describe('parseKeywords', () => {
  it('returns empty array for empty input', () => {
    expect(parseKeywords('')).toEqual([]);
  });

  it('returns empty array for whitespace only', () => {
    expect(parseKeywords('   ')).toEqual([]);
  });

  it('splits on commas', () => {
    expect(parseKeywords('dresser, table, chair')).toEqual(['dresser', 'table', 'chair']);
  });

  it('preserves quoted phrases', () => {
    const result = parseKeywords('"mid century", nightstand, dresser');
    expect(result).toEqual(['"mid century"', 'nightstand', 'dresser']);
  });

  it('does not split on commas inside quotes', () => {
    const result = parseKeywords('"a, b", c');
    expect(result).toEqual(['"a, b"', 'c']);
  });
});

describe('parsePrice', () => {
  it('parses dollar amount', () => {
    expect(parsePrice('$45')).toBe(45);
  });

  it('parses comma-separated price', () => {
    expect(parsePrice('$1,234.56')).toBe(1234.56);
  });

  it('returns 0 for "Free"', () => {
    expect(parsePrice('Free')).toBe(0);
  });

  it('returns 0 for "$0"', () => {
    expect(parsePrice('$0')).toBe(0);
  });

  it('extracts price from "$45 OBO"', () => {
    expect(parsePrice('$45 OBO')).toBe(45);
  });

  it('returns 0 for empty string', () => {
    expect(parsePrice('')).toBe(0);
  });

  it('returns 0 for unparseable string', () => {
    expect(parsePrice('Contact for price')).toBe(0);
  });
});

describe('parseRelativeTime', () => {
  it('returns null for empty string', () => {
    expect(parseRelativeTime('')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(parseRelativeTime('some random text')).toBeNull();
  });

  it('parses "just now"', () => {
    const result = parseRelativeTime('just now');
    expect(result).toBeInstanceOf(Date);
    expect(Date.now() - result!.getTime()).toBeLessThan(1000);
  });

  it('parses "2 hours ago"', () => {
    const result = parseRelativeTime('2 hours ago');
    expect(result).toBeInstanceOf(Date);
    const twoHoursMs = 2 * 60 * 60 * 1000;
    expect(Date.now() - result!.getTime()).toBeCloseTo(twoHoursMs, -3);
  });

  it('parses "a day ago"', () => {
    const result = parseRelativeTime('a day ago');
    expect(result).toBeInstanceOf(Date);
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(Date.now() - result!.getTime()).toBeCloseTo(oneDayMs, -3);
  });

  it('parses "3 days ago"', () => {
    const result = parseRelativeTime('3 days ago');
    expect(result).toBeInstanceOf(Date);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(Date.now() - result!.getTime()).toBeCloseTo(threeDaysMs, -3);
  });
});

describe('parseDistance', () => {
  it('parses "5 miles away"', () => {
    expect(parseDistance('5 miles away')).toBe(5);
  });

  it('parses "2 mi"', () => {
    expect(parseDistance('2 mi')).toBe(2);
  });

  it('parses decimal distance', () => {
    expect(parseDistance('3.5 miles')).toBe(3.5);
  });

  it('returns null for empty string', () => {
    expect(parseDistance('')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(parseDistance('Listed nearby')).toBeNull();
  });
});
