/**
 * Sales forecast panel with time-to-sell predictions grouped into
 * "Act Fast" (urgent) and "Take Your Time" (patient) sections.
 *
 * @module ui/sidebar/SalesForecast
 */

import React, { useState, useMemo } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { ForecastIndicator } from '@/design-system/composites/ForecastIndicator';
// ConfidenceBar available for future per-listing confidence display
// import { ConfidenceBar } from '@/design-system/composites/ConfidenceBar';

/** A listing's forecast data for display. */
interface ForecastEntry {
  listingId: string;
  title: string;
  price: number | null;
  displayEstimate: string;
  urgency: 'act-fast' | 'moderate' | 'take-your-time';
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  estimatedDays: number;
}

/** Props for the {@link SalesForecast} component. */
export interface SalesForecastProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Forecast tab that groups listings into urgency buckets and
 * displays time-to-sell estimates with confidence indicators.
 *
 * @example
 * ```tsx
 * <SalesForecast />
 * ```
 */
export const SalesForecast: React.FC<SalesForecastProps> = ({ className }) => {
  // In production this would come from a context/store
  const [entries] = useState<ForecastEntry[]>([]);

  const actFast = useMemo(
    () => entries.filter((e) => e.urgency === 'act-fast').sort((a, b) => a.estimatedDays - b.estimatedDays),
    [entries],
  );
  const moderate = useMemo(
    () => entries.filter((e) => e.urgency === 'moderate').sort((a, b) => a.estimatedDays - b.estimatedDays),
    [entries],
  );
  const takeYourTime = useMemo(
    () => entries.filter((e) => e.urgency === 'take-your-time').sort((a, b) => a.estimatedDays - b.estimatedDays),
    [entries],
  );

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const sectionStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    marginBottom: 'var(--mps-spacing-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xs)',
  };

  const entryStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-sm)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    marginBottom: 'var(--mps-spacing-xs)',
    fontSize: 'var(--mps-font-size-sm)',
  };

  const titleStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    marginRight: 'var(--mps-spacing-sm)',
    color: 'var(--mps-color-text-primary)',
  };

  const priceStyle: React.CSSProperties = {
    fontFamily: 'var(--mps-font-family-mono)',
    fontWeight: 'var(--mps-font-weight-bold)' as never,
    marginRight: 'var(--mps-spacing-sm)',
    whiteSpace: 'nowrap',
  };

  const emptyBucketStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    fontStyle: 'italic',
    padding: 'var(--mps-spacing-sm)',
  };

  const renderEntries = (items: ForecastEntry[]) => {
    if (items.length === 0) {
      return <div style={emptyBucketStyle}>No listings in this category.</div>;
    }
    return items.map((entry) => (
      <div key={entry.listingId} style={entryStyle}>
        <div style={titleStyle} title={entry.title}>{entry.title}</div>
        {entry.price != null && <span style={priceStyle}>${entry.price.toFixed(0)}</span>}
        <ForecastIndicator displayEstimate={entry.displayEstimate} urgency={entry.urgency} />
      </div>
    ));
  };

  if (entries.length === 0) {
    return (
      <PanelLayout title="Sales Forecast" className={className}>
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F552;
          </div>
          <div>No forecast data yet.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Forecasts require 5+ comparable historical listings per category.
            They improve as you browse more listings.
          </div>
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout title="Sales Forecast" className={className}>
      {/* Act Fast */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>&#x26A1;</span> Act Fast
        </div>
        {renderEntries(actFast)}
      </div>

      {/* Moderate */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>&#x23F3;</span> Moderate
        </div>
        {renderEntries(moderate)}
      </div>

      {/* Take Your Time */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span>&#x1F9D8;</span> Take Your Time
        </div>
        {renderEntries(takeYourTime)}
      </div>

      <div style={{ padding: '0 var(--mps-spacing-md)', fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)', fontStyle: 'italic', marginBottom: 'var(--mps-spacing-md)' }}>
        Forecasts are estimates based on historical patterns and may not reflect actual outcomes.
      </div>
    </PanelLayout>
  );
};
