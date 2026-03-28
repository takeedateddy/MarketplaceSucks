import { describe, it, expect } from 'vitest';
import {
  combineScores,
  shouldAnalyze,
  DEFAULT_ML_CONFIG,
  type MlDetectionResult,
} from './ml-image-detector';

describe('combineScores', () => {
  const mlResult: MlDetectionResult = {
    mlScore: 0.8,
    modelUsed: true,
    modelVersion: 'v1',
    inferenceTimeMs: 150,
  };

  describe('with ML model available', () => {
    it('uses 70/30 weight split (ML/heuristic)', () => {
      const result = combineScores(mlResult, 50, 3);
      // 0.8 * 100 * 0.7 + 50 * 0.3 = 56 + 15 = 71
      expect(result.combinedScore).toBe(71);
      expect(result.weights.ml).toBe(0.7);
      expect(result.weights.heuristic).toBe(0.3);
    });

    it('classifies likely-ai for high combined score', () => {
      const result = combineScores(mlResult, 80, 4);
      expect(result.classification).toBe('likely-ai');
    });

    it('classifies appears-real for low ML score', () => {
      const lowMl: MlDetectionResult = { ...mlResult, mlScore: 0.1 };
      const result = combineScores(lowMl, 10, 1);
      // 0.1 * 100 * 0.7 + 10 * 0.3 = 7 + 3 = 10
      expect(result.classification).toBe('appears-real');
    });

    it('returns high confidence for fast inference', () => {
      const result = combineScores(mlResult, 50, 3);
      expect(result.confidence).toBe('high');
    });

    it('returns medium confidence for slow inference', () => {
      const slowMl: MlDetectionResult = { ...mlResult, inferenceTimeMs: 2000 };
      const result = combineScores(slowMl, 50, 3);
      expect(result.confidence).toBe('medium');
    });

    it('includes ML result in output', () => {
      const result = combineScores(mlResult, 50, 3);
      expect(result.ml).toBe(mlResult);
      expect(result.heuristic.score).toBe(50);
      expect(result.heuristic.signalCount).toBe(3);
    });
  });

  describe('without ML model', () => {
    it('uses 100% heuristic weight', () => {
      const result = combineScores(null, 45, 2);
      expect(result.combinedScore).toBe(45);
      expect(result.weights.ml).toBe(0);
      expect(result.weights.heuristic).toBe(1);
    });

    it('returns medium confidence with 4+ heuristic signals', () => {
      const result = combineScores(null, 60, 4);
      expect(result.confidence).toBe('medium');
    });

    it('returns low confidence with fewer heuristic signals', () => {
      const result = combineScores(null, 60, 2);
      expect(result.confidence).toBe('low');
    });

    it('ml field is null', () => {
      const result = combineScores(null, 50, 3);
      expect(result.ml).toBeNull();
    });
  });

  describe('with modelUsed=false', () => {
    it('falls back to heuristic-only', () => {
      const unusedMl: MlDetectionResult = { ...mlResult, modelUsed: false };
      const result = combineScores(unusedMl, 60, 3);
      expect(result.combinedScore).toBe(60);
      expect(result.weights.ml).toBe(0);
    });
  });

  it('clamps combined score to 0-100', () => {
    const highMl: MlDetectionResult = { ...mlResult, mlScore: 1.0 };
    const result = combineScores(highMl, 100, 5);
    expect(result.combinedScore).toBeLessThanOrEqual(100);
    expect(result.combinedScore).toBeGreaterThanOrEqual(0);
  });

  it('classifies possibly-ai in the middle range', () => {
    const midMl: MlDetectionResult = { ...mlResult, mlScore: 0.5 };
    const result = combineScores(midMl, 40, 2);
    // 50 * 0.7 + 40 * 0.3 = 35 + 12 = 47
    expect(result.classification).toBe('possibly-ai');
  });
});

describe('shouldAnalyze', () => {
  it('returns true for normal images with default config', () => {
    expect(shouldAnalyze(800, 600)).toBe(true);
  });

  it('returns false when ML is disabled', () => {
    expect(shouldAnalyze(800, 600, { ...DEFAULT_ML_CONFIG, enabled: false })).toBe(false);
  });

  it('returns false for images below minimum size', () => {
    expect(shouldAnalyze(32, 32)).toBe(false);
    expect(shouldAnalyze(64, 32)).toBe(false);
  });

  it('returns true at exact minimum size', () => {
    expect(shouldAnalyze(64, 64)).toBe(true);
  });

  it('respects custom minImageSize', () => {
    expect(shouldAnalyze(100, 100, { ...DEFAULT_ML_CONFIG, minImageSize: 128 })).toBe(false);
    expect(shouldAnalyze(128, 128, { ...DEFAULT_ML_CONFIG, minImageSize: 128 })).toBe(true);
  });
});
