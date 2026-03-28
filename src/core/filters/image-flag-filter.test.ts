import { describe, it, expect } from 'vitest';
import { ImageFlagFilter } from './image-flag-filter';
import { buildListing, buildAnalyzedListing } from '../test-helpers';

describe('ImageFlagFilter', () => {
  const filter = new ImageFlagFilter();
  const defaultConfig = { hideAiGenerated: false, hideStockPhotos: false, onlyOriginal: false };

  it('keeps listing with no imageFlags (undefined)', () => {
    const listing = buildListing({});
    const result = filter.apply(listing, { ...defaultConfig, hideAiGenerated: true });
    expect(result.keep).toBe(true);
  });

  it('all disabled = all pass', () => {
    const listing = buildAnalyzedListing({ imageFlags: ['ai_generated', 'stock_photo'] });
    const result = filter.apply(listing, defaultConfig);
    expect(result.keep).toBe(true);
  });

  describe('hideAiGenerated', () => {
    it('removes listing with ai_generated flag', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['ai_generated'] });
      const result = filter.apply(listing, { ...defaultConfig, hideAiGenerated: true });
      expect(result.keep).toBe(false);
    });

    it('removes listing with ai-generated flag (hyphenated variant)', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['ai-generated'] });
      const result = filter.apply(listing, { ...defaultConfig, hideAiGenerated: true });
      expect(result.keep).toBe(false);
    });

    it('removes listing with aiImageScore >= 0.7', () => {
      const listing = buildAnalyzedListing({ imageFlags: [], aiImageScore: 0.75 });
      const result = filter.apply(listing, { ...defaultConfig, hideAiGenerated: true });
      expect(result.keep).toBe(false);
    });

    it('keeps listing with aiImageScore < 0.7', () => {
      const listing = buildAnalyzedListing({ imageFlags: [], aiImageScore: 0.5 });
      const result = filter.apply(listing, { ...defaultConfig, hideAiGenerated: true });
      expect(result.keep).toBe(true);
    });
  });

  describe('hideStockPhotos', () => {
    it('removes listing with stock_photo flag', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['stock_photo'] });
      const result = filter.apply(listing, { ...defaultConfig, hideStockPhotos: true });
      expect(result.keep).toBe(false);
    });

    it('removes listing with stock-photo flag', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['stock-photo'] });
      const result = filter.apply(listing, { ...defaultConfig, hideStockPhotos: true });
      expect(result.keep).toBe(false);
    });

    it('removes listing with stock flag', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['stock'] });
      const result = filter.apply(listing, { ...defaultConfig, hideStockPhotos: true });
      expect(result.keep).toBe(false);
    });
  });

  describe('onlyOriginal', () => {
    it('keeps listing with originalityScore >= 0.6', () => {
      const listing = buildAnalyzedListing({ imageFlags: [], originalityScore: 0.8 });
      const result = filter.apply(listing, { ...defaultConfig, onlyOriginal: true });
      expect(result.keep).toBe(true);
    });

    it('removes listing with originalityScore < 0.6 and no original flag', () => {
      const listing = buildAnalyzedListing({ imageFlags: [], originalityScore: 0.3 });
      const result = filter.apply(listing, { ...defaultConfig, onlyOriginal: true });
      expect(result.keep).toBe(false);
    });

    it('keeps listing with "original" flag even if score is low', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['original'], originalityScore: 0.3 });
      const result = filter.apply(listing, { ...defaultConfig, onlyOriginal: true });
      expect(result.keep).toBe(true);
    });

    it('keeps listing with no score, no flags (no negative signals)', () => {
      const listing = buildAnalyzedListing({ imageFlags: [] });
      const result = filter.apply(listing, { ...defaultConfig, onlyOriginal: true });
      expect(result.keep).toBe(true);
    });

    it('removes listing with no score but negative flags', () => {
      const listing = buildAnalyzedListing({ imageFlags: ['ai_generated'] });
      const result = filter.apply(listing, { ...defaultConfig, onlyOriginal: true });
      expect(result.keep).toBe(false);
    });
  });
});
