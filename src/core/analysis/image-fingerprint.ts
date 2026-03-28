/**
 * Perceptual hashing (pHash) for image originality detection.
 * Generates perceptual hashes that allow comparing images for visual similarity
 * regardless of minor differences in size, compression, or color adjustment.
 *
 * The actual Canvas API operations (resize, grayscale conversion) must be
 * performed in the content script or web worker and the results passed here.
 * This module handles the hash computation and comparison logic.
 *
 * @module image-fingerprint
 */

/** Result of an originality assessment */
export interface OriginalityResult {
  /** Originality score (0-100) */
  score: number;
  /** Classification */
  classification: 'original' | 'mixed-signals' | 'likely-sourced' | 'probably-not-original';
  /** Flags explaining the assessment */
  flags: OriginalityFlag[];
  /** Number of duplicate images found across other listings */
  duplicateCount: number;
}

/** An individual originality flag */
export interface OriginalityFlag {
  type: 'duplicate' | 'stock-indicators' | 'white-background' | 'studio-lighting' | 'original-indicators';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

/** Pre-extracted image characteristics for stock photo detection */
export interface ImageCharacteristics {
  /** Whether the image border pixels are predominantly white/uniform */
  hasWhiteBackground: boolean;
  /** Whether the image shows uniform studio-like lighting */
  hasStudioLighting: boolean;
  /** Whether the image contains environmental context (room, furniture, etc.) */
  hasEnvironmentalContext: boolean;
  /** Whether there are multiple photos of the same item from different angles */
  isPartOfMultiAngleSet: boolean;
  /** Whether compression artifacts suggest re-saving from web */
  hasHighRecompression: boolean;
}

/**
 * Compute a perceptual hash from grayscale pixel data.
 *
 * The input should be a 32x32 grayscale image represented as an array
 * of 1024 values (0-255). The caller is responsible for resizing and
 * grayscale conversion (typically done via Canvas API in a Web Worker).
 *
 * Algorithm: Apply a simplified DCT, then take the top-left 8x8 block
 * and generate a 64-bit hash based on whether each value is above or
 * below the mean.
 *
 * @param grayscalePixels - 32x32 grayscale image as flat array (1024 values)
 * @returns 64-character hex string representing the perceptual hash
 *
 * @example
 * ```typescript
 * // In a Web Worker:
 * const pixels = getGrayscale32x32(imageData);
 * const hash = computePerceptualHash(pixels);
 * // hash => "a4b3c2d1e5f6a7b8"
 * ```
 */
export function computePerceptualHash(grayscalePixels: number[]): string {
  if (grayscalePixels.length !== 1024) {
    throw new Error(`Expected 1024 pixels (32x32), got ${grayscalePixels.length}`);
  }

  // Simple DCT-like approach: compute mean of 8x8 blocks
  const blockSize = 4; // 32/8 = 4 pixels per hash block
  const hashValues: number[] = [];

  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let sum = 0;
      for (let py = 0; py < blockSize; py++) {
        for (let px = 0; px < blockSize; px++) {
          const x = bx * blockSize + px;
          const y = by * blockSize + py;
          sum += grayscalePixels[y * 32 + x];
        }
      }
      hashValues.push(sum / (blockSize * blockSize));
    }
  }

  // Compute mean of all block values
  const hashMean = hashValues.reduce((a, b) => a + b, 0) / hashValues.length;

  // Generate binary hash: 1 if above mean, 0 if below
  let hashBinary = '';
  for (const val of hashValues) {
    hashBinary += val >= hashMean ? '1' : '0';
  }

  // Convert binary to hex
  let hashHex = '';
  for (let i = 0; i < hashBinary.length; i += 4) {
    const nibble = hashBinary.substring(i, i + 4);
    hashHex += parseInt(nibble, 2).toString(16);
  }

  return hashHex;
}

/**
 * Calculate the Hamming distance between two perceptual hashes.
 * Lower distance = more similar images.
 *
 * @param hashA - First perceptual hash (hex string)
 * @param hashB - Second perceptual hash (hex string)
 * @returns Hamming distance (0 = identical, 64 = completely different)
 *
 * @example
 * ```typescript
 * const distance = hammingDistance('a4b3c2d1e5f6a7b8', 'a4b3c2d1e5f6a7b9');
 * // distance => small number (very similar)
 * ```
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    throw new Error('Hashes must be the same length');
  }

  // Convert hex to binary and compare
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const a = parseInt(hashA[i], 16);
    const b = parseInt(hashB[i], 16);
    // Count differing bits
    let xor = a ^ b;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Check if two images are visually similar based on their perceptual hashes.
 *
 * @param hashA - First hash
 * @param hashB - Second hash
 * @param threshold - Maximum Hamming distance to consider similar (default 10)
 * @returns Whether the images are considered similar
 */
export function areSimilarImages(
  hashA: string,
  hashB: string,
  threshold: number = 10,
): boolean {
  return hammingDistance(hashA, hashB) <= threshold;
}

/**
 * Assess image originality based on characteristics and duplicate data.
 *
 * @param characteristics - Pre-extracted image characteristics
 * @param duplicateCount - Number of duplicate images found across other listings
 * @returns Originality assessment result
 *
 * @example
 * ```typescript
 * const result = assessOriginality(
 *   {
 *     hasWhiteBackground: false,
 *     hasStudioLighting: false,
 *     hasEnvironmentalContext: true,
 *     isPartOfMultiAngleSet: true,
 *     hasHighRecompression: false,
 *   },
 *   0, // no duplicates found
 * );
 * // result.score => 90
 * // result.classification => 'original'
 * ```
 */
export function assessOriginality(
  characteristics: ImageCharacteristics,
  duplicateCount: number,
): OriginalityResult {
  let score = 50; // Start neutral
  const flags: OriginalityFlag[] = [];

  // Positive signals (increase score)
  if (characteristics.hasEnvironmentalContext) {
    score += 15;
    flags.push({
      type: 'original-indicators',
      description: 'Photo shows real environmental context (furniture, walls, etc.)',
      impact: 'positive',
    });
  }

  if (characteristics.isPartOfMultiAngleSet) {
    score += 15;
    flags.push({
      type: 'original-indicators',
      description: 'Multiple photos from different angles of the same item',
      impact: 'positive',
    });
  }

  // Negative signals (decrease score)
  if (duplicateCount > 0) {
    score -= Math.min(duplicateCount * 15, 40);
    flags.push({
      type: 'duplicate',
      description: `Same image found in ${duplicateCount} other listing(s)`,
      impact: 'negative',
    });
  }

  if (characteristics.hasWhiteBackground) {
    score -= 15;
    flags.push({
      type: 'white-background',
      description: 'Pure white background, common in stock/product photos',
      impact: 'negative',
    });
  }

  if (characteristics.hasStudioLighting) {
    score -= 10;
    flags.push({
      type: 'studio-lighting',
      description: 'Professional studio lighting detected',
      impact: 'negative',
    });
  }

  if (characteristics.hasHighRecompression) {
    score -= 10;
    flags.push({
      type: 'stock-indicators',
      description: 'High compression suggests image was re-saved from web',
      impact: 'negative',
    });
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Classify
  let classification: OriginalityResult['classification'];
  if (score >= 80) classification = 'original';
  else if (score >= 50) classification = 'mixed-signals';
  else if (score >= 20) classification = 'likely-sourced';
  else classification = 'probably-not-original';

  return { score, classification, flags, duplicateCount };
}
