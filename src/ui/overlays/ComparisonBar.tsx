/**
 * Floating comparison queue bar at the bottom of the page.
 * Shows thumbnails of listings added for comparison.
 *
 * @module ComparisonBar
 */

import type { Listing } from '@/core/models/listing';

interface ComparisonBarProps {
  /** Listings in the comparison queue */
  listings: Listing[];
  /** Remove a listing from comparison */
  onRemove: (id: string) => void;
  /** Open the full comparison view */
  onCompare: () => void;
  /** Clear all comparison items */
  onClear: () => void;
}

/**
 * Floating bar showing comparison queue items.
 */
export function ComparisonBar({ listings, onRemove, onCompare, onClear }: ComparisonBarProps) {
  if (listings.length === 0) return null;

  return (
    <div
      className="mps-comparison-bar"
      data-mps-element="comparison-bar"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--mps-color-surface-elevated, #fff)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        border: '1px solid var(--mps-color-border, #ced0d4)',
      }}
    >
      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--mps-color-text-primary)' }}>
        Compare ({listings.length}/4)
      </span>

      <div style={{ display: 'flex', gap: '8px' }}>
        {listings.map((listing) => (
          <div
            key={listing.id}
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '2px solid var(--mps-color-border)',
            }}
          >
            {listing.imageUrls[0] && (
              <img
                src={listing.imageUrls[0]}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <button
              onClick={() => onRemove(listing.id)}
              aria-label={`Remove ${listing.title} from comparison`}
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--mps-color-error, #e04f5f)',
                color: '#fff',
                border: 'none',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onCompare}
        disabled={listings.length < 2}
        style={{
          padding: '8px 16px',
          background: listings.length >= 2 ? 'var(--mps-color-primary, #e04f5f)' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '13px',
          cursor: listings.length >= 2 ? 'pointer' : 'default',
        }}
      >
        Compare
      </button>

      <button
        onClick={onClear}
        style={{
          padding: '8px 12px',
          background: 'transparent',
          color: 'var(--mps-color-text-secondary)',
          border: '1px solid var(--mps-color-border)',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        Clear
      </button>
    </div>
  );
}
