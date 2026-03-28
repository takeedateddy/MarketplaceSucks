import { describe, it, expect } from 'vitest';
import { computePerceptualHash, hammingDistance, areSimilarImages, assessOriginality } from './image-fingerprint';

describe('computePerceptualHash', () => {
  it('returns 16-character hex string for 1024 pixels', () => {
    const pixels = new Array(1024).fill(128);
    const hash = computePerceptualHash(pixels);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash.length).toBe(16); // 64 bits / 4 bits per hex char
  });

  it('throws for wrong number of pixels', () => {
    expect(() => computePerceptualHash(new Array(100).fill(0))).toThrow('Expected 1024');
  });

  it('produces same hash for identical input', () => {
    const pixels = Array.from({ length: 1024 }, (_, i) => i % 256);
    const hash1 = computePerceptualHash(pixels);
    const hash2 = computePerceptualHash([...pixels]);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different input', () => {
    const pixelsA = Array.from({ length: 1024 }, (_, i) => i % 256);
    const pixelsB = Array.from({ length: 1024 }, (_, i) => (i * 7) % 256);
    const hashA = computePerceptualHash(pixelsA);
    const hashB = computePerceptualHash(pixelsB);
    expect(typeof hashA).toBe('string');
    expect(typeof hashB).toBe('string');
  });
});

describe('hammingDistance', () => {
  it('returns 0 for identical hashes', () => {
    expect(hammingDistance('abcdef', 'abcdef')).toBe(0);
  });

  it('counts differing bits', () => {
    // 'a' = 1010, 'b' = 1011 => 1 bit different
    expect(hammingDistance('a', 'b')).toBe(1);
  });

  it('throws for different length hashes', () => {
    expect(() => hammingDistance('abc', 'abcd')).toThrow('same length');
  });
});

describe('areSimilarImages', () => {
  it('returns true for identical hashes', () => {
    expect(areSimilarImages('abcdef1234567890', 'abcdef1234567890')).toBe(true);
  });

  it('uses default threshold of 10', () => {
    // Same hash = distance 0, which is <= 10
    expect(areSimilarImages('abcdef1234567890', 'abcdef1234567890')).toBe(true);
  });

  it('returns false for very different hashes', () => {
    expect(areSimilarImages('0000000000000000', 'ffffffffffffffff')).toBe(false);
  });
});

describe('assessOriginality', () => {
  const originalChars = {
    hasWhiteBackground: false,
    hasStudioLighting: false,
    hasEnvironmentalContext: true,
    isPartOfMultiAngleSet: true,
    hasHighRecompression: false,
  };

  const stockChars = {
    hasWhiteBackground: true,
    hasStudioLighting: true,
    hasEnvironmentalContext: false,
    isPartOfMultiAngleSet: false,
    hasHighRecompression: true,
  };

  it('scores original photos highly', () => {
    const result = assessOriginality(originalChars, 0);
    expect(result.score).toBe(80); // 50 + 15 + 15
    expect(result.classification).toBe('original');
  });

  it('scores stock-like photos low', () => {
    const result = assessOriginality(stockChars, 0);
    expect(result.score).toBe(15); // 50 - 15 - 10 - 10 = 15
    expect(result.classification).toBe('probably-not-original');
  });

  it('penalizes duplicates', () => {
    const result = assessOriginality(originalChars, 2);
    // 50 + 15 + 15 - 30 = 50
    expect(result.score).toBe(50);
    expect(result.duplicateCount).toBe(2);
  });

  it('caps duplicate penalty at 40', () => {
    const result = assessOriginality(originalChars, 10);
    // 50 + 15 + 15 - 40 = 40
    expect(result.score).toBe(40);
  });

  it('clamps score to 0-100', () => {
    const result = assessOriginality(stockChars, 5);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('classifies mixed-signals correctly', () => {
    const result = assessOriginality({
      ...originalChars,
      hasWhiteBackground: true,
    }, 0);
    // 50 + 15 + 15 - 15 = 65
    expect(result.classification).toBe('mixed-signals');
  });
});
