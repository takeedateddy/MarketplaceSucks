/**
 * Image analysis panel showing listings with flagged images,
 * including thumbnails, AI-detection scores, and classifications.
 *
 * @module ui/sidebar/ImageAnalysisPanel
 */

import React, { useState } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { ImageFlagBadge } from '@/design-system/composites/ImageFlagBadge';
import { ConfidenceBar } from '@/design-system/composites/ConfidenceBar';

/** A flagged image entry for display. */
interface FlaggedImage {
  listingId: string;
  listingTitle: string;
  imageUrl: string;
  classification: string;
  aiScore: number;
  confidence: 'high' | 'medium' | 'low';
  signalCount: number;
}

/** Props for the {@link ImageAnalysisPanel} component. */
export interface ImageAnalysisPanelProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Displays listings whose images have been flagged by the
 * AI-detection heuristic, with thumbnails and detail scores.
 *
 * @example
 * ```tsx
 * <ImageAnalysisPanel />
 * ```
 */
export const ImageAnalysisPanel: React.FC<ImageAnalysisPanelProps> = ({ className }) => {
  // In production this would come from a context/store
  const [flaggedImages] = useState<FlaggedImage[]>([]);

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm)',
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-md)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const thumbStyle: React.CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--mps-radius-sm)',
    objectFit: 'cover',
    backgroundColor: 'var(--mps-color-border)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--mps-spacing-xxs)',
    overflow: 'hidden',
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    color: 'var(--mps-color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
  };

  if (flaggedImages.length === 0) {
    return (
      <PanelLayout title="Image Analysis" className={className}>
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F5BC;
          </div>
          <div>No flagged images found.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Listing images are analyzed automatically as you browse.
          </div>
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout title="Image Analysis" className={className}>
      <div style={listStyle}>
        {flaggedImages.map((item) => (
          <div key={`${item.listingId}-${item.imageUrl}`} style={cardStyle}>
            <img src={item.imageUrl} alt="" style={thumbStyle} loading="lazy" />
            <div style={bodyStyle}>
              <div style={titleStyle} title={item.listingTitle}>
                {item.listingTitle}
              </div>
              <ImageFlagBadge classification={item.classification} score={item.aiScore} />
              <ConfidenceBar level={item.confidence} />
              <div style={metaStyle}>
                {item.signalCount} signal{item.signalCount !== 1 ? 's' : ''} triggered
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelLayout>
  );
};
