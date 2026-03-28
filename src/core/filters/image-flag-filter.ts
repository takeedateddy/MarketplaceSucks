/**
 * Image authenticity filter for Facebook Marketplace listings.
 *
 * Uses analysis-phase enrichments (`imageFlags` and `aiImageScore`) to
 * filter out listings with suspicious or inauthentic images. Supports
 * hiding AI-generated images, stock photos, and requiring original
 * photography only.
 *
 * Listings that have not yet been analyzed (i.e. `imageFlags` is
 * `undefined`) are always kept so the user does not silently lose results
 * before analysis has run.
 *
 * @module image-flag-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Extended listing type that may include the optional image analysis fields
 * added during the analysis phase.
 */
interface ListingWithImageAnalysis extends Listing {
  /** Flags set by the image analyzer (e.g. `['ai_generated', 'stock_photo']`). */
  imageFlags?: string[];
  /** AI-generated image confidence score (0--1). */
  aiImageScore?: number;
  /** Originality score (0--1) indicating likelihood of original photography. */
  originalityScore?: number;
}

/** Threshold above which an AI image score is considered "AI-generated". */
const AI_SCORE_THRESHOLD = 0.7;

/** Threshold above which an originality score is considered "original". */
const ORIGINALITY_THRESHOLD = 0.6;

/**
 * Configuration shape for the image flag filter.
 */
export interface ImageFlagFilterConfig {
  /** Hide listings flagged as having AI-generated images. */
  hideAiGenerated: boolean;
  /** Hide listings flagged as using stock photos. */
  hideStockPhotos: boolean;
  /** Only show listings with original photography. */
  onlyOriginal: boolean;
}

/**
 * Filters listings based on image authenticity analysis results.
 *
 * - Listings with no image analysis data (`imageFlags` undefined) are always kept.
 * - When all options are `false`, all listings pass through.
 * - Multiple options combine with AND logic (all checks must pass).
 *
 * @example
 * ```typescript
 * import { ImageFlagFilter } from '@/core/filters/image-flag-filter';
 *
 * const filter = new ImageFlagFilter();
 * const config = { hideAiGenerated: true, hideStockPhotos: false, onlyOriginal: false };
 * const result = filter.apply(listing, config);
 * ```
 */
export class ImageFlagFilter implements IFilter<ImageFlagFilterConfig> {
  /** @inheritdoc */
  readonly id = 'image-flags';

  /** @inheritdoc */
  readonly displayName = 'Image Authenticity';

  /** @inheritdoc */
  readonly category: FilterCategory = 'image';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the image authenticity rules.
   *
   * @param listing - The listing to evaluate (may include image analysis fields).
   * @param config - Current image flag filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing's images pass.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, {
   *   hideAiGenerated: true,
   *   hideStockPhotos: true,
   *   onlyOriginal: false,
   * });
   * ```
   */
  apply(listing: Listing, config: ImageFlagFilterConfig): FilterResult {
    const extended = listing as ListingWithImageAnalysis;

    // No image analysis data -- keep by default
    if (extended.imageFlags === undefined) {
      return { keep: true };
    }

    const flags = new Set(extended.imageFlags.map((f) => f.toLowerCase()));

    // Check AI-generated images
    if (config.hideAiGenerated) {
      if (flags.has('ai_generated') || flags.has('ai-generated')) {
        return {
          keep: false,
          reason: 'Listing images flagged as AI-generated',
        };
      }

      // Also check the numeric AI score if available
      if (extended.aiImageScore !== undefined && extended.aiImageScore >= AI_SCORE_THRESHOLD) {
        return {
          keep: false,
          reason: `AI image score ${extended.aiImageScore.toFixed(2)} exceeds threshold`,
        };
      }
    }

    // Check stock photos
    if (config.hideStockPhotos) {
      if (flags.has('stock_photo') || flags.has('stock-photo') || flags.has('stock')) {
        return {
          keep: false,
          reason: 'Listing images flagged as stock photos',
        };
      }
    }

    // Require original photography
    if (config.onlyOriginal) {
      const hasOriginalFlag = flags.has('original');

      if (extended.originalityScore !== undefined) {
        if (extended.originalityScore < ORIGINALITY_THRESHOLD && !hasOriginalFlag) {
          return {
            keep: false,
            reason: `Originality score ${extended.originalityScore.toFixed(2)} is below threshold`,
          };
        }
      } else if (!hasOriginalFlag) {
        // No originality score and no "original" flag -- still keep if no negative flags
        const hasNegativeFlags = flags.has('ai_generated') ||
          flags.has('ai-generated') ||
          flags.has('stock_photo') ||
          flags.has('stock-photo') ||
          flags.has('stock');

        if (hasNegativeFlags) {
          return {
            keep: false,
            reason: 'Listing images are not original photography',
          };
        }
      }
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with all checks disabled.
   *
   * @returns Default {@link ImageFlagFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new ImageFlagFilter().getDefaultConfig();
   * // => { hideAiGenerated: false, hideStockPhotos: false, onlyOriginal: false }
   * ```
   */
  getDefaultConfig(): ImageFlagFilterConfig {
    return {
      hideAiGenerated: false,
      hideStockPhotos: false,
      onlyOriginal: false,
    };
  }

  /**
   * Validate that an unknown value conforms to {@link ImageFlagFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid image flag filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ hideAiGenerated: true, hideStockPhotos: false, onlyOriginal: false });
   * // => true
   * filter.validateConfig({ hideAiGenerated: 'yes' }); // => false
   * ```
   */
  validateConfig(config: unknown): config is ImageFlagFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (typeof c.hideAiGenerated !== 'boolean') return false;
    if (typeof c.hideStockPhotos !== 'boolean') return false;
    if (typeof c.onlyOriginal !== 'boolean') return false;
    return true;
  }
}
