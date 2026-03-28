/**
 * Heat / popularity panel showing a ranked list of the hottest
 * listings sorted by heat score, with flame indicators and engagement
 * details.
 *
 * @module ui/sidebar/HeatMap
 */

import React, { useState } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { HeatIndicator } from '@/design-system/composites/HeatIndicator';
import { HEAT_TIER_INFO, type HeatTier } from '@/core/analysis/heat-tracker';

/** A listing's heat data for display. */
interface HeatEntry {
  listingId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  score: number;
  tier: HeatTier;
  saves: number | null;
  comments: number | null;
  views: number | null;
}

/** Props for the {@link HeatMap} component. */
export interface HeatMapProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Renders a ranked list of listings ordered by heat score, with
 * flame indicators, engagement metrics, and a legend.
 *
 * @example
 * ```tsx
 * <HeatMap />
 * ```
 */
export const HeatMap: React.FC<HeatMapProps> = ({ className }) => {
  // In production this would come from a context/store
  const [entries] = useState<HeatEntry[]>([]);

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
    gap: 'var(--mps-spacing-xs)',
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
    alignItems: 'center',
  };

  const thumbStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--mps-radius-sm)',
    objectFit: 'cover',
    backgroundColor: 'var(--mps-color-border)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
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
    marginTop: 'var(--mps-spacing-xxs)',
  };

  const legendStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    fontFamily: 'var(--mps-font-family-primary)',
    borderTop: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
  };

  const legendRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-sm)',
    marginBottom: 'var(--mps-spacing-xxs)',
  };

  return (
    <PanelLayout title="Listing Heat" className={className}>
      {entries.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F525;
          </div>
          <div>No heat data yet.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Heat scores will appear as you browse listings and engagement data is collected.
          </div>
        </div>
      ) : (
        <div style={listStyle}>
          {entries.map((entry, index) => {
            const info = HEAT_TIER_INFO[entry.tier];
            const engagementParts: string[] = [];
            if (entry.saves != null) engagementParts.push(`${entry.saves} saves`);
            if (entry.comments != null) engagementParts.push(`${entry.comments} comments`);
            if (entry.views != null) engagementParts.push(`${entry.views} views`);

            return (
              <div key={entry.listingId} style={cardStyle}>
                <div style={{ fontFamily: 'var(--mps-font-family-mono)', fontSize: 'var(--mps-font-size-sm)', color: 'var(--mps-color-text-secondary)', minWidth: '24px', textAlign: 'center' }}>
                  #{index + 1}
                </div>
                {entry.imageUrl ? (
                  <img src={entry.imageUrl} alt="" style={thumbStyle} loading="lazy" />
                ) : (
                  <div style={thumbStyle} aria-hidden="true" />
                )}
                <div style={bodyStyle}>
                  <div style={titleStyle} title={entry.title}>{entry.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mps-spacing-sm)', marginTop: 'var(--mps-spacing-xxs)' }}>
                    {entry.price != null && (
                      <span style={{ fontFamily: 'var(--mps-font-family-mono)', fontSize: 'var(--mps-font-size-sm)', fontWeight: 'var(--mps-font-weight-bold)' as never }}>
                        ${entry.price.toFixed(0)}
                      </span>
                    )}
                    {info.flames > 0 && (
                      <HeatIndicator score={entry.score} flames={info.flames} tier={info.label} />
                    )}
                  </div>
                  {engagementParts.length > 0 && (
                    <div style={metaStyle}>{engagementParts.join(' \u00B7 ')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={legendStyle}>
        <div style={{ fontWeight: 'var(--mps-font-weight-medium)' as never, marginBottom: 'var(--mps-spacing-xs)' }}>Heat Legend</div>
        <div style={legendRowStyle}>
          <span>{'\u{1F525}\u{1F525}\u{1F525}'}</span>
          <span>On Fire (80-100) -- Selling fast, act now</span>
        </div>
        <div style={legendRowStyle}>
          <span>{'\u{1F525}\u{1F525}'}</span>
          <span>Hot (60-79) -- High demand</span>
        </div>
        <div style={legendRowStyle}>
          <span>{'\u{1F525}'}</span>
          <span>Warm (30-59) -- Getting attention</span>
        </div>
        <div style={legendRowStyle}>
          <span style={{ width: '24px' }}>--</span>
          <span>Cool (0-29) -- Normal activity</span>
        </div>
      </div>
    </PanelLayout>
  );
};
