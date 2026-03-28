/**
 * Enhanced listing preview panel shown on hover.
 * Displays all listing details, badges, and quick actions.
 *
 * @module ListingPreview
 */

import { useState } from 'react';
import type { Listing } from '@/core/models/listing';

interface ListingPreviewProps {
  /** The listing to preview */
  listing: Listing;
  /** Position to render the preview */
  position: { top: number; left: number };
  /** Quick actions */
  onHide: (id: string) => void;
  onCompare: (listing: Listing) => void;
  onOpenInNewTab: (url: string) => void;
}

/**
 * Enhanced hover preview showing full listing details with badges.
 */
export function ListingPreview({
  listing,
  position,
  onHide,
  onCompare,
  onOpenInNewTab,
}: ListingPreviewProps) {
  const [imageIndex, setImageIndex] = useState(0);

  const prevImage = () => setImageIndex((i) => Math.max(0, i - 1));
  const nextImage = () =>
    setImageIndex((i) => Math.min(listing.imageUrls.length - 1, i + 1));

  return (
    <div
      className="mps-preview-panel"
      data-mps-element="preview"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10001,
        width: '340px',
        background: 'var(--mps-color-surface-elevated, #fff)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid var(--mps-color-border, #ced0d4)',
        overflow: 'hidden',
        fontFamily: 'var(--mps-font-family-primary)',
      }}
    >
      {/* Image Carousel */}
      {listing.imageUrls.length > 0 && (
        <div style={{ position: 'relative', height: '200px', background: '#f0f2f5' }}>
          <img
            src={listing.imageUrls[imageIndex]}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {listing.imageUrls.length > 1 && (
            <>
              <button
                onClick={prevImage}
                disabled={imageIndex === 0}
                style={carouselBtnStyle('left')}
                aria-label="Previous image"
              >
                &#8249;
              </button>
              <button
                onClick={nextImage}
                disabled={imageIndex === listing.imageUrls.length - 1}
                style={carouselBtnStyle('right')}
                aria-label="Next image"
              >
                &#8250;
              </button>
              <div style={counterStyle}>
                {imageIndex + 1} / {listing.imageUrls.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Details */}
      <div style={{ padding: '12px 16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', color: 'var(--mps-color-text-primary)' }}>
          {listing.title}
        </h3>

        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--mps-color-primary, #e04f5f)', margin: '0 0 8px' }}>
          {listing.price === 0 ? 'Free' : `$${listing.price.toFixed(0)}`}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', fontSize: '12px', color: 'var(--mps-color-text-secondary)' }}>
          {listing.location && <span>{listing.location}</span>}
          {listing.distance !== null && <span>({listing.distance} mi)</span>}
          {listing.condition && <span>| {listing.condition}</span>}
          {listing.datePosted && <span>| {listing.datePosted}</span>}
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {listing.sellerTrustScore !== undefined && (
            <span style={badgeStyle(listing.sellerTrustScore >= 80 ? '#31a24c' : listing.sellerTrustScore >= 60 ? '#1877f2' : listing.sellerTrustScore >= 40 ? '#f7b928' : '#e04f5f')}>
              Trust: {listing.sellerTrustScore}
            </span>
          )}
          {listing.priceRating && (
            <span style={badgeStyle('#65676b')}>
              {listing.priceRating}
            </span>
          )}
          {listing.heatScore !== undefined && listing.heatScore >= 30 && (
            <span style={badgeStyle('#f77f00')}>
              {listing.heatScore >= 80 ? '\u{1F525}\u{1F525}\u{1F525}' : listing.heatScore >= 60 ? '\u{1F525}\u{1F525}' : '\u{1F525}'} {listing.heatScore}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onOpenInNewTab(listing.listingUrl)} style={actionBtnStyle}>
            Open
          </button>
          <button onClick={() => onCompare(listing)} style={actionBtnStyle}>
            Compare
          </button>
          <button onClick={() => onHide(listing.id)} style={actionBtnStyle}>
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}

function carouselBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: '8px',
    transform: 'translateY(-50%)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

const counterStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
};

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
    background: color,
  };
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  border: '1px solid var(--mps-color-border, #ced0d4)',
  borderRadius: '6px',
  background: 'var(--mps-color-surface, #f0f2f5)',
  color: 'var(--mps-color-text-primary)',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
};
