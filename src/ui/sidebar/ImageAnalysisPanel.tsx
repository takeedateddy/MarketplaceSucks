/**
 * Image analysis panel showing listings with flagged images,
 * including thumbnails, AI-detection scores, classifications,
 * and ML vs heuristic confidence breakdown.
 *
 * @module ui/sidebar/ImageAnalysisPanel
 */

import React, { useState } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { ImageFlagBadge } from '@/design-system/composites/ImageFlagBadge';
import { ConfidenceBar } from '@/design-system/composites/ConfidenceBar';
import { Badge } from '@/design-system/primitives/Badge';

/** A flagged image entry for display. */
interface FlaggedImage {
  listingId: string;
  listingTitle: string;
  imageUrl: string;
  classification: string;
  aiScore: number;
  confidence: 'high' | 'medium' | 'low';
  signalCount: number;
  /** Whether ML model was used for this analysis */
  mlModelUsed?: boolean;
  /** ML model confidence score (0-1), if model was used */
  mlScore?: number;
  /** Inference time in milliseconds */
  inferenceTimeMs?: number;
}

/** Props for the {@link ImageAnalysisPanel} component. */
export interface ImageAnalysisPanelProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Displays listings whose images have been flagged by the
 * AI-detection system (heuristic and/or ML model), with
 * thumbnails, detail scores, and model attribution.
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
            {' '}ML model will be used when available for higher accuracy.
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
              <div style={{ display: 'flex', gap: 'var(--mps-spacing-xs)', alignItems: 'center' }}>
                <span style={metaStyle}>
                  {item.signalCount} signal{item.signalCount !== 1 ? 's' : ''} triggered
                </span>
                {item.mlModelUsed && (
                  <Badge variant="info" size="sm">ML</Badge>
                )}
                {item.mlModelUsed && item.inferenceTimeMs !== undefined && (
                  <span style={{ ...metaStyle, fontSize: '10px' }}>
                    {item.inferenceTimeMs}ms
                  </span>
                )}
              </div>
              {item.mlModelUsed && item.mlScore !== undefined && (
                <div style={metaStyle}>
                  ML confidence: {Math.round(item.mlScore * 100)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </PanelLayout>
  );
};
