/**
 * Listing history panel showing previously seen listings with the
 * ability to mark all as seen, clear history, and view recent items.
 *
 * @module ui/sidebar/ListingHistory
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { Button } from '@/design-system/primitives/Button';

/** A history entry for display. */
interface HistoryEntry {
  listingId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  firstSeen: number;
  lastSeen: number;
  viewCount: number;
}

/** Props for the {@link ListingHistory} component. */
export interface ListingHistoryProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Displays a chronological list of previously seen listings with
 * thumbnail, title, price, and view metadata. Provides controls
 * to mark all as seen or clear the history.
 *
 * @example
 * ```tsx
 * <ListingHistory />
 * ```
 */
export const ListingHistory: React.FC<ListingHistoryProps> = ({ className }) => {
  // In production this would come from a context/store
  const [entries] = useState<HistoryEntry[]>([]);

  const handleMarkAllSeen = useCallback(() => {
    // In production: dispatch action
  }, []);

  const handleClearHistory = useCallback(() => {
    // In production: dispatch action with confirmation
  }, []);

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
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

  const formatRelativeTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const footerStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
  };

  return (
    <PanelLayout title="History" className={className}>
      {/* Action bar */}
      <div style={actionsStyle}>
        <Button size="sm" onClick={handleMarkAllSeen}>
          Mark All as Seen
        </Button>
        <Button variant="secondary" size="sm" onClick={handleClearHistory}>
          Clear History
        </Button>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F4C5;
          </div>
          <div>No listing history yet.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Listings will be tracked as you browse Marketplace.
          </div>
        </div>
      ) : (
        <div style={listStyle}>
          {entries.map((entry) => (
            <div key={entry.listingId} style={cardStyle}>
              {entry.imageUrl ? (
                <img src={entry.imageUrl} alt="" style={thumbStyle} loading="lazy" />
              ) : (
                <div style={thumbStyle} aria-hidden="true" />
              )}
              <div style={bodyStyle}>
                <div style={titleStyle} title={entry.title}>{entry.title}</div>
                <div style={{ display: 'flex', gap: 'var(--mps-spacing-sm)', alignItems: 'center', marginTop: 'var(--mps-spacing-xxs)' }}>
                  {entry.price != null && (
                    <span style={{ fontFamily: 'var(--mps-font-family-mono)', fontSize: 'var(--mps-font-size-sm)', fontWeight: 'var(--mps-font-weight-bold)' as never }}>
                      ${entry.price.toFixed(0)}
                    </span>
                  )}
                </div>
                <div style={metaStyle}>
                  Seen {entry.viewCount}x \u00B7 First: {formatRelativeTime(entry.firstSeen)} \u00B7 Last: {formatRelativeTime(entry.lastSeen)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={footerStyle}>
        History retention: 30 days (configurable in Settings)
      </div>
    </PanelLayout>
  );
};
