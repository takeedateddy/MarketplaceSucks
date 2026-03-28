/**
 * Seller trust intelligence panel showing the trust score details
 * for the currently selected or hovered listing's seller.
 *
 * @module ui/sidebar/SellerTrustPanel
 */

import React, { useState } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { TrustBadge } from '@/design-system/composites/TrustBadge';
import { ConfidenceBar } from '@/design-system/composites/ConfidenceBar';
import { TRUST_FACTOR_MAX_SCORES, type TrustScoreBreakdown } from '@/core/analysis/seller-trust';

/** Displayable trust data for the panel. */
interface TrustDisplayData {
  sellerName: string;
  score: number;
  tier: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  breakdown: TrustScoreBreakdown;
  factorsWithData: string[];
}

/** Props for the {@link SellerTrustPanel} component. */
export interface SellerTrustPanelProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/** Human-readable factor names. */
const FACTOR_LABELS: Record<keyof TrustScoreBreakdown, string> = {
  accountAge: 'Account Age',
  rating: 'Seller Rating',
  ratingVolume: 'Rating Volume',
  profileCompleteness: 'Profile Completeness',
  response: 'Response Rate',
  listingBehavior: 'Listing Behavior',
};

/**
 * The seller trust panel displays trust score breakdown for the
 * seller associated with the currently focused listing.
 *
 * @example
 * ```tsx
 * <SellerTrustPanel />
 * ```
 */
export const SellerTrustPanel: React.FC<SellerTrustPanelProps> = ({ className }) => {
  // In production this would come from a context/store; placeholder for now
  const [trustData] = useState<TrustDisplayData | null>(null);

  const containerStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-md)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
  };

  const factorRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--mps-spacing-xs) 0',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontSize: 'var(--mps-font-size-sm)',
  };

  const barTrackStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: '100px',
    height: '6px',
    backgroundColor: 'var(--mps-color-border)',
    borderRadius: 'var(--mps-radius-full)',
    overflow: 'hidden',
    marginLeft: 'var(--mps-spacing-sm)',
  };

  if (!trustData) {
    return (
      <PanelLayout title="Seller Trust" className={className}>
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F6E1;
          </div>
          <div>Select or hover over a listing to see seller trust details.</div>
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout title="Seller Trust" className={className}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mps-spacing-sm)', marginBottom: 'var(--mps-spacing-md)' }}>
          <TrustBadge score={trustData.score} size="md" />
          <div>
            <div style={{ fontWeight: 'var(--mps-font-weight-semibold)' as never, color: 'var(--mps-color-text-primary)' }}>
              {trustData.sellerName}
            </div>
            <div style={{ fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)' }}>
              {trustData.tier}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 'var(--mps-spacing-md)' }}>
          <ConfidenceBar level={trustData.confidence} />
        </div>

        {/* Factor breakdown */}
        <div style={{ marginBottom: 'var(--mps-spacing-sm)', fontWeight: 'var(--mps-font-weight-medium)' as never, fontSize: 'var(--mps-font-size-sm)', color: 'var(--mps-color-text-primary)' }}>
          Score Breakdown
        </div>
        {(Object.keys(trustData.breakdown) as Array<keyof TrustScoreBreakdown>).map((factor) => {
          const score = trustData.breakdown[factor];
          const max = TRUST_FACTOR_MAX_SCORES[factor];
          const pct = max > 0 ? (score / max) * 100 : 0;
          const hasData = trustData.factorsWithData.includes(factor);

          return (
            <div key={factor} style={factorRowStyle}>
              <span style={{ color: hasData ? 'var(--mps-color-text-primary)' : 'var(--mps-color-text-secondary)' }}>
                {FACTOR_LABELS[factor]}
                {!hasData && ' *'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ minWidth: '40px', textAlign: 'right', fontFamily: 'var(--mps-font-family-mono)', fontSize: 'var(--mps-font-size-xs)' }}>
                  {score}/{max}
                </span>
                <div style={barTrackStyle}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: 'var(--mps-color-primary)',
                      borderRadius: 'var(--mps-radius-full)',
                      transition: `width var(--mps-duration-normal) var(--mps-easing-ease-out)`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)', marginTop: 'var(--mps-spacing-sm)' }}>
          * Estimated from default value (data not available)
        </div>
      </div>
    </PanelLayout>
  );
};
