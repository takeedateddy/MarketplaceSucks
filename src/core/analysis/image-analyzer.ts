/**
 * AI-generated image detection engine. Uses heuristic analysis to determine
 * whether listing images appear to be AI-generated rather than real photographs.
 *
 * TF.js model integration is lazy-loaded and optional. This module provides
 * the heuristic fallback that works without ML dependencies.
 *
 * This module has ZERO browser dependencies — it operates on pre-extracted
 * image metadata, not on DOM or Canvas API directly.
 *
 * @module image-analyzer
 */

/** AI detection result for a single image */
export interface AiDetectionResult {
  /** Likelihood score (0-100) that the image is AI-generated */
  aiScore: number;
  /** Classification */
  classification: 'appears-real' | 'possibly-ai' | 'likely-ai';
  /** Which heuristic signals were triggered */
  signals: AiSignal[];
  /** Confidence in the assessment */
  confidence: 'high' | 'medium' | 'low';
}

/** An individual detection signal */
export interface AiSignal {
  name: string;
  description: string;
  weight: number;
  triggered: boolean;
}

/** Pre-extracted image metadata for analysis */
export interface ImageMetadata {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Whether EXIF data is present */
  hasExif: boolean;
  /** Whether the image has a uniform/solid background */
  hasUniformBackground: boolean;
  /** Average color saturation (0-1) */
  avgSaturation: number;
  /** Standard deviation of saturation */
  saturationStdDev: number;
  /** Whether the aspect ratio matches common AI outputs */
  isCommonAiAspectRatio: boolean;
  /** Whether the resolution matches common AI outputs */
  isCommonAiResolution: boolean;
}

/** Common AI-generated image resolutions */
const AI_RESOLUTIONS = new Set([
  '512x512', '768x768', '1024x1024', '1024x768', '768x1024',
  '1024x576', '576x1024', '1920x1080', '1080x1920',
]);

/** Common AI-generated image aspect ratios */
const AI_ASPECT_RATIOS = new Set([1, 4/3, 3/4, 16/9, 9/16]);

/**
 * Check if a resolution matches known AI generator outputs.
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Whether the resolution is commonly produced by AI generators
 */
export function isCommonAiResolution(width: number, height: number): boolean {
  return AI_RESOLUTIONS.has(`${width}x${height}`);
}

/**
 * Check if an aspect ratio matches common AI generator outputs.
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Whether the aspect ratio is common for AI images
 */
export function isCommonAiAspectRatio(width: number, height: number): boolean {
  if (height === 0) return false;
  const ratio = width / height;

  for (const aiRatio of AI_ASPECT_RATIOS) {
    if (Math.abs(ratio - aiRatio) < 0.02) return true;
  }
  return false;
}

/**
 * Analyze image metadata to detect AI-generated characteristics.
 * This is the heuristic fallback when the TF.js model is not available.
 *
 * @param metadata - Pre-extracted image metadata
 * @returns AI detection result with score and signals
 *
 * @example
 * ```typescript
 * const result = analyzeImageHeuristic({
 *   width: 1024,
 *   height: 1024,
 *   hasExif: false,
 *   hasUniformBackground: false,
 *   avgSaturation: 0.65,
 *   saturationStdDev: 0.08,
 *   isCommonAiAspectRatio: true,
 *   isCommonAiResolution: true,
 * });
 * // result.aiScore => ~55
 * // result.classification => 'possibly-ai'
 * ```
 */
export function analyzeImageHeuristic(metadata: ImageMetadata): AiDetectionResult {
  const signals: AiSignal[] = [];
  let totalWeight = 0;
  let triggeredWeight = 0;

  // Signal 1: No EXIF data (real photos usually have EXIF)
  const noExif: AiSignal = {
    name: 'No EXIF metadata',
    description: 'Real camera photos typically contain EXIF data (camera model, exposure, etc.)',
    weight: 25,
    triggered: !metadata.hasExif,
  };
  signals.push(noExif);
  totalWeight += noExif.weight;
  if (noExif.triggered) triggeredWeight += noExif.weight;

  // Signal 2: Common AI resolution
  const aiRes: AiSignal = {
    name: 'AI-typical resolution',
    description: `Resolution ${metadata.width}x${metadata.height} matches common AI generator outputs`,
    weight: 20,
    triggered: metadata.isCommonAiResolution,
  };
  signals.push(aiRes);
  totalWeight += aiRes.weight;
  if (aiRes.triggered) triggeredWeight += aiRes.weight;

  // Signal 3: Common AI aspect ratio
  const aiAR: AiSignal = {
    name: 'AI-typical aspect ratio',
    description: 'Aspect ratio matches common AI generator formats',
    weight: 10,
    triggered: metadata.isCommonAiAspectRatio,
  };
  signals.push(aiAR);
  totalWeight += aiAR.weight;
  if (aiAR.triggered) triggeredWeight += aiAR.weight;

  // Signal 4: Unusually uniform saturation
  const uniformSat: AiSignal = {
    name: 'Uniform saturation',
    description: 'AI images often have more uniform color saturation than real photos',
    weight: 20,
    triggered: metadata.saturationStdDev < 0.1 && metadata.avgSaturation > 0.3,
  };
  signals.push(uniformSat);
  totalWeight += uniformSat.weight;
  if (uniformSat.triggered) triggeredWeight += uniformSat.weight;

  // Signal 5: Uniform background (could be stock or AI)
  const uniformBg: AiSignal = {
    name: 'Uniform background',
    description: 'Image has a uniform/solid background, common in AI-generated and stock photos',
    weight: 15,
    triggered: metadata.hasUniformBackground,
  };
  signals.push(uniformBg);
  totalWeight += uniformBg.weight;
  if (uniformBg.triggered) triggeredWeight += uniformBg.weight;

  // Calculate score
  const aiScore = totalWeight > 0 ? Math.round((triggeredWeight / totalWeight) * 100) : 0;

  // Classify
  let classification: 'appears-real' | 'possibly-ai' | 'likely-ai';
  if (aiScore <= 30) classification = 'appears-real';
  else if (aiScore <= 60) classification = 'possibly-ai';
  else classification = 'likely-ai';

  // Confidence based on how many signals were evaluable
  const evaluableSignals = signals.length;
  let confidence: 'high' | 'medium' | 'low';
  if (evaluableSignals >= 4) confidence = 'medium'; // Heuristic-only can never be "high"
  else if (evaluableSignals >= 2) confidence = 'low';
  else confidence = 'low';

  return { aiScore, classification, signals, confidence };
}
