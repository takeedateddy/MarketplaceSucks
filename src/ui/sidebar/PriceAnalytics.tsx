/**
 * Price analytics dashboard panel showing aggregate statistics,
 * price rating distribution, and a placeholder for a histogram.
 *
 * @module ui/sidebar/PriceAnalytics
 */

import React, { useState } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { ConfidenceBar } from '@/design-system/composites/ConfidenceBar';
import { PRICE_RATING_INFO, type PriceRatingTier } from '@/core/analysis/price-rater';

/** Aggregated price statistics. */
interface PriceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

/** Distribution count per price rating tier. */
type RatingDistribution = Record<PriceRatingTier, number>;

/** Props for the {@link PriceAnalytics} component. */
export interface PriceAnalyticsProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/** All tiers in display order. */
const TIER_ORDER: PriceRatingTier[] = [
  'steal',
  'great-deal',
  'good-price',
  'fair-price',
  'above-market',
  'high',
  'overpriced',
];

/**
 * Price analytics dashboard rendered in the sidebar's "Analytics" tab.
 * Shows summary statistics, tier distribution bars, and a histogram
 * placeholder.
 *
 * @example
 * ```tsx
 * <PriceAnalytics />
 * ```
 */
export const PriceAnalytics: React.FC<PriceAnalyticsProps> = ({ className }) => {
  // In production these would come from a context/store
  const [stats] = useState<PriceStats>({ count: 0, min: 0, max: 0, mean: 0, median: 0 });
  const [distribution] = useState<RatingDistribution>({
    steal: 0,
    'great-deal': 0,
    'good-price': 0,
    'fair-price': 0,
    'above-market': 0,
    high: 0,
    overpriced: 0,
  });
  const [confidence] = useState<'high' | 'medium' | 'low' | 'insufficient'>('insufficient');

  const statGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-md)',
  };

  const statCardStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-md)',
    textAlign: 'center',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-lg)',
    fontWeight: 'var(--mps-font-weight-bold)' as never,
    fontFamily: 'var(--mps-font-family-mono)',
    color: 'var(--mps-color-text-primary)',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    marginTop: 'var(--mps-spacing-xxs)',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '0 var(--mps-spacing-md)',
    marginBottom: 'var(--mps-spacing-md)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    marginBottom: 'var(--mps-spacing-sm)',
  };

  const tierRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-sm)',
    marginBottom: 'var(--mps-spacing-xs)',
    fontSize: 'var(--mps-font-size-xs)',
  };

  const maxCount = Math.max(1, ...Object.values(distribution));

  const histogramPlaceholderStyle: React.CSSProperties = {
    height: '100px',
    backgroundColor: 'var(--mps-color-surface)',
    border: 'var(--mps-border-width-thin) dashed var(--mps-color-border)',
    borderRadius: 'var(--mps-radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-xs)',
  };

  return (
    <PanelLayout title="Price Analytics" className={className}>
      {/* Stats grid */}
      <div style={statGridStyle}>
        {[
          { label: 'Listings', value: String(stats.count) },
          { label: 'Median', value: `$${stats.median.toFixed(0)}` },
          { label: 'Min', value: `$${stats.min.toFixed(0)}` },
          { label: 'Max', value: `$${stats.max.toFixed(0)}` },
          { label: 'Average', value: `$${stats.mean.toFixed(0)}` },
        ].map((s) => (
          <div key={s.label} style={statCardStyle}>
            <div style={statValueStyle}>{s.value}</div>
            <div style={statLabelStyle}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div style={{ padding: '0 var(--mps-spacing-md)', marginBottom: 'var(--mps-spacing-md)' }}>
        <ConfidenceBar level={confidence} />
      </div>

      {/* Rating distribution */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Price Rating Distribution</div>
        {TIER_ORDER.map((tier) => {
          const info = PRICE_RATING_INFO[tier];
          const count = distribution[tier];
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={tier} style={tierRowStyle}>
              <span style={{ width: '16px', textAlign: 'center' }}>{info.emoji}</span>
              <span style={{ width: '80px', color: 'var(--mps-color-text-secondary)' }}>{info.label}</span>
              <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--mps-color-border)', borderRadius: 'var(--mps-radius-full)', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: `var(--mps-color-${info.color})`,
                  borderRadius: 'var(--mps-radius-full)',
                  transition: `width var(--mps-duration-normal) var(--mps-easing-ease-out)`,
                }} />
              </div>
              <span style={{ minWidth: '24px', textAlign: 'right', fontFamily: 'var(--mps-font-family-mono)' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Histogram placeholder */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Price Histogram</div>
        <div style={histogramPlaceholderStyle}>
          Price distribution chart (available with sufficient data)
        </div>
      </div>

      <div style={{ padding: '0 var(--mps-spacing-md)', fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)', fontStyle: 'italic' }}>
        Analytics update in real-time as you browse and filter listings.
      </div>
    </PanelLayout>
  );
};
