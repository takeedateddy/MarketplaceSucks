import { describe, it, expect } from 'vitest';
import {
  analyzeImageHeuristic,
  isCommonAiResolution,
  isCommonAiAspectRatio,
  NO_EXIF_SIGNAL,
  type ImageMetadata,
} from './image-analyzer';

/** All non-EXIF signals triggered, with EXIF present (so its signal is off). */
const PIXEL_SIGNALS_ALL_ON: ImageMetadata = {
  width: 1024,
  height: 1024, // common AI resolution + 1:1 aspect
  hasExif: true,
  hasUniformBackground: true,
  avgSaturation: 0.5,
  saturationStdDev: 0.05, // uniform saturation
  isCommonAiAspectRatio: true,
  isCommonAiResolution: true,
};

describe('analyzeImageHeuristic — excludeSignals (EXIF renormalization)', () => {
  it('caps at ~72 when EXIF is counted but cannot trigger (default)', () => {
    // (20+10+20+15) / 90 = 72
    expect(analyzeImageHeuristic(PIXEL_SIGNALS_ALL_ON).aiScore).toBe(72);
  });

  it('reaches 100 when the EXIF signal is excluded and renormalized', () => {
    const result = analyzeImageHeuristic(PIXEL_SIGNALS_ALL_ON, {
      excludeSignals: [NO_EXIF_SIGNAL],
    });
    expect(result.aiScore).toBe(100);
    expect(result.classification).toBe('likely-ai');
    expect(result.signals.some((s) => s.name === NO_EXIF_SIGNAL)).toBe(false);
  });

  it('no longer inflates the score for a real photo with no other signals', () => {
    const realPhoto: ImageMetadata = {
      width: 3024,
      height: 4032,
      hasExif: false, // would trigger the 25-weight no-EXIF signal
      hasUniformBackground: false,
      avgSaturation: 0.4,
      saturationStdDev: 0.3,
      isCommonAiAspectRatio: false,
      isCommonAiResolution: false,
    };
    expect(analyzeImageHeuristic(realPhoto).aiScore).toBe(28); // 25/90
    expect(
      analyzeImageHeuristic(realPhoto, { excludeSignals: [NO_EXIF_SIGNAL] }).aiScore,
    ).toBe(0);
  });
});

describe('isCommonAiResolution', () => {
  it('returns true for known AI resolutions', () => {
    expect(isCommonAiResolution(512, 512)).toBe(true);
    expect(isCommonAiResolution(1024, 1024)).toBe(true);
    expect(isCommonAiResolution(1024, 768)).toBe(true);
    expect(isCommonAiResolution(1920, 1080)).toBe(true);
  });

  it('returns false for non-AI resolutions', () => {
    expect(isCommonAiResolution(800, 600)).toBe(false);
    expect(isCommonAiResolution(3024, 4032)).toBe(false);
  });
});

describe('isCommonAiAspectRatio', () => {
  it('returns true for 1:1 ratio', () => {
    expect(isCommonAiAspectRatio(500, 500)).toBe(true);
  });

  it('returns true for 4:3 ratio', () => {
    expect(isCommonAiAspectRatio(800, 600)).toBe(true);
  });

  it('returns true for 16:9 ratio', () => {
    expect(isCommonAiAspectRatio(1920, 1080)).toBe(true);
  });

  it('returns false for height=0', () => {
    expect(isCommonAiAspectRatio(1024, 0)).toBe(false);
  });

  it('returns false for unusual ratios', () => {
    // 7:5 is not a common AI ratio
    expect(isCommonAiAspectRatio(700, 500)).toBe(false);
  });
});

describe('analyzeImageHeuristic', () => {
  const realPhotoMetadata = {
    width: 3024,
    height: 4032,
    hasExif: true,
    hasUniformBackground: false,
    avgSaturation: 0.5,
    saturationStdDev: 0.25,
    isCommonAiAspectRatio: false,
    isCommonAiResolution: false,
  };

  const aiPhotoMetadata = {
    width: 1024,
    height: 1024,
    hasExif: false,
    hasUniformBackground: true,
    avgSaturation: 0.6,
    saturationStdDev: 0.05,
    isCommonAiAspectRatio: true,
    isCommonAiResolution: true,
  };

  it('classifies real photo as appears-real', () => {
    const result = analyzeImageHeuristic(realPhotoMetadata);
    expect(result.classification).toBe('appears-real');
    expect(result.aiScore).toBeLessThanOrEqual(30);
  });

  it('classifies AI photo as likely-ai', () => {
    const result = analyzeImageHeuristic(aiPhotoMetadata);
    expect(result.classification).toBe('likely-ai');
    expect(result.aiScore).toBeGreaterThan(60);
  });

  it('returns all 5 signals', () => {
    const result = analyzeImageHeuristic(realPhotoMetadata);
    expect(result.signals).toHaveLength(5);
  });

  it('no signals triggered gives 0 score', () => {
    const result = analyzeImageHeuristic(realPhotoMetadata);
    expect(result.aiScore).toBe(0);
  });

  it('all signals triggered gives 100 score', () => {
    const result = analyzeImageHeuristic(aiPhotoMetadata);
    expect(result.aiScore).toBe(100);
  });

  it('heuristic-only confidence is medium at most', () => {
    const result = analyzeImageHeuristic(aiPhotoMetadata);
    expect(result.confidence).toBe('medium');
  });
});
