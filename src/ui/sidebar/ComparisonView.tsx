/**
 * Side-by-side comparison view for up to 4 listings using
 * ComparisonRow composites and an auto-generated summary.
 *
 * @module ui/sidebar/ComparisonView
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { ComparisonRow } from '@/design-system/composites/ComparisonRow';
import { Button } from '@/design-system/primitives/Button';
import type { ComparisonResult } from '@/core/analysis/comparison-engine';
import { formatAsMarkdown, formatAsText } from '@/core/utils/comparison-export';

/** Props for the {@link ComparisonView} component. */
export interface ComparisonViewProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Renders a structured comparison table with one row per dimension,
 * a header row with listing labels (A, B, C, D), and a summary
 * with a recommendation highlight.
 *
 * @example
 * ```tsx
 * <ComparisonView />
 * ```
 */
export const ComparisonView: React.FC<ComparisonViewProps> = ({ className }) => {
  // In production this would come from a comparison store/context
  const [comparison] = useState<ComparisonResult | null>(null);
  const [listingTitles] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const copyAsMarkdown = useCallback(() => {
    if (!comparison) return;
    const md = formatAsMarkdown(comparison, listingTitles);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [comparison, listingTitles]);

  const copyAsText = useCallback(() => {
    if (!comparison) return;
    const text = formatAsText(comparison, listingTitles);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [comparison, listingTitles]);

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const summaryStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-md)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-md)',
    margin: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-sm)',
    color: 'var(--mps-color-text-primary)',
    fontFamily: 'var(--mps-font-family-primary)',
    lineHeight: 'var(--mps-line-height-normal)' as never,
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'grid',
    gap: 'var(--mps-spacing-xs)',
    alignItems: 'center',
    padding: 'var(--mps-spacing-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    borderBottom: 'var(--mps-border-width-medium) solid var(--mps-color-border)',
  };

  const recommendedBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: 'var(--mps-spacing-xxs) var(--mps-spacing-xs)',
    backgroundColor: 'var(--mps-color-status-success)',
    color: '#fff',
    borderRadius: 'var(--mps-radius-full)',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    marginLeft: 'var(--mps-spacing-xxs)',
  };

  if (!comparison || comparison.dimensions.length === 0) {
    return (
      <PanelLayout
        title="Compare"
        className={className}
        actions={
          <Button variant="ghost" size="sm" disabled>
            Clear
          </Button>
        }
      >
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x2696;
          </div>
          <div>No listings selected for comparison.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Add 2-4 listings to the comparison queue to see a side-by-side breakdown.
          </div>
        </div>
      </PanelLayout>
    );
  }

  const ids = comparison.listingIds;
  const labels = ids.map((_, i) => String.fromCharCode(65 + i));

  return (
    <PanelLayout
      title="Compare"
      className={className}
      actions={
        <Button variant="ghost" size="sm">
          Clear
        </Button>
      }
    >
      {/* Header row with listing labels */}
      <div
        style={{
          ...headerRowStyle,
          gridTemplateColumns: `120px repeat(${ids.length}, 1fr)`,
        }}
      >
        <div />
        {labels.map((label, i) => (
          <div key={ids[i]} style={{ textAlign: 'center' }}>
            Listing {label}
            {comparison.recommendedId === ids[i] && (
              <span style={recommendedBadgeStyle}>Best</span>
            )}
          </div>
        ))}
      </div>

      {/* Dimension rows */}
      <div role="table" aria-label="Listing comparison">
        {comparison.dimensions.map((dim) => (
          <ComparisonRow
            key={dim.label}
            label={dim.label}
            values={dim.values}
            bestId={dim.bestId}
          />
        ))}
      </div>

      {/* Summary */}
      {comparison.summary && (
        <div style={summaryStyle}>
          <strong>Summary:</strong> {comparison.summary}
        </div>
      )}

      {/* Share actions */}
      <div style={{ display: 'flex', gap: 'var(--mps-spacing-xs)', padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)' }}>
        <Button variant="secondary" size="sm" onClick={copyAsMarkdown}>
          {copied ? 'Copied!' : 'Copy as Markdown'}
        </Button>
        <Button variant="ghost" size="sm" onClick={copyAsText}>
          {copied ? 'Copied!' : 'Copy as Text'}
        </Button>
      </div>
    </PanelLayout>
  );
};
