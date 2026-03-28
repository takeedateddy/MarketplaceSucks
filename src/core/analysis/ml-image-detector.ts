/**
 * TensorFlow.js model manager for ML-based AI image detection.
 *
 * Provides a lazy-loaded, Web Worker-compatible inference pipeline that
 * classifies listing images as real or AI-generated. The model is loaded
 * on first use and cached for subsequent calls.
 *
 * This module defines the inference interface and scoring logic.
 * Actual TF.js runtime loading happens in the image-analysis worker.
 *
 * @module ml-image-detector
 */

/** Result from the ML model inference */
export interface MlDetectionResult {
  /** ML confidence score (0-1) that the image is AI-generated */
  readonly mlScore: number;
  /** Whether the model is available and was used */
  readonly modelUsed: boolean;
  /** Model version identifier */
  readonly modelVersion: string | null;
  /** Inference time in milliseconds */
  readonly inferenceTimeMs: number;
}

/** Combined result merging ML and heuristic signals */
export interface CombinedDetectionResult {
  /** Final combined score (0-100) */
  readonly combinedScore: number;
  /** Classification based on combined score */
  readonly classification: 'appears-real' | 'possibly-ai' | 'likely-ai';
  /** ML model result (null if model not available) */
  readonly ml: MlDetectionResult | null;
  /** Heuristic result */
  readonly heuristic: {
    readonly score: number;
    readonly signalCount: number;
  };
  /** Weights used for combination */
  readonly weights: {
    readonly ml: number;
    readonly heuristic: number;
  };
  /** Overall confidence */
  readonly confidence: 'high' | 'medium' | 'low';
}

/** Configuration for the ML detector */
export interface MlDetectorConfig {
  /** Whether to enable ML detection (user can disable to save resources) */
  readonly enabled: boolean;
  /** Maximum inference time before timeout (ms) */
  readonly timeoutMs: number;
  /** Minimum image dimension to analyze (skip tiny thumbnails) */
  readonly minImageSize: number;
}

/** Default configuration */
export const DEFAULT_ML_CONFIG: MlDetectorConfig = {
  enabled: true,
  timeoutMs: 5000,
  minImageSize: 64,
};

/**
 * Combine ML model output with heuristic signals into a single score.
 *
 * When the ML model is available, it gets 70% weight and heuristics 30%.
 * When ML is unavailable, heuristics get 100% weight.
 *
 * @param mlResult - ML model result (null if model not available)
 * @param heuristicScore - Heuristic score (0-100)
 * @param heuristicSignalCount - Number of heuristic signals triggered
 * @returns Combined detection result
 */
export function combineScores(
  mlResult: MlDetectionResult | null,
  heuristicScore: number,
  heuristicSignalCount: number,
): CombinedDetectionResult {
  let combinedScore: number;
  let mlWeight: number;
  let heuristicWeight: number;
  let confidence: 'high' | 'medium' | 'low';

  if (mlResult && mlResult.modelUsed) {
    // ML available: 70% ML + 30% heuristic
    mlWeight = 0.7;
    heuristicWeight = 0.3;
    const mlScore100 = mlResult.mlScore * 100;
    combinedScore = Math.round(mlScore100 * mlWeight + heuristicScore * heuristicWeight);

    // ML model provides higher confidence
    if (mlResult.inferenceTimeMs < 1000) {
      confidence = 'high';
    } else {
      confidence = 'medium';
    }
  } else {
    // ML unavailable: 100% heuristic
    mlWeight = 0;
    heuristicWeight = 1;
    combinedScore = heuristicScore;

    // Heuristic-only confidence is lower
    confidence = heuristicSignalCount >= 4 ? 'medium' : 'low';
  }

  combinedScore = Math.max(0, Math.min(100, combinedScore));

  let classification: 'appears-real' | 'possibly-ai' | 'likely-ai';
  if (combinedScore <= 30) classification = 'appears-real';
  else if (combinedScore <= 60) classification = 'possibly-ai';
  else classification = 'likely-ai';

  return {
    combinedScore,
    classification,
    ml: mlResult,
    heuristic: {
      score: heuristicScore,
      signalCount: heuristicSignalCount,
    },
    weights: {
      ml: mlWeight,
      heuristic: heuristicWeight,
    },
    confidence,
  };
}

/**
 * Check whether an image meets minimum requirements for ML analysis.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param config - ML detector configuration
 * @returns Whether the image should be analyzed
 */
export function shouldAnalyze(
  width: number,
  height: number,
  config: MlDetectorConfig = DEFAULT_ML_CONFIG,
): boolean {
  if (!config.enabled) return false;
  if (width < config.minImageSize || height < config.minImageSize) return false;
  return true;
}
