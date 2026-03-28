/**
 * Listing card component with badge overlays for trust score,
 * price rating, and heat indicator.
 *
 * Renders a compact card representation of a marketplace listing
 * suitable for sidebar lists and comparison views.
 *
 * @module design-system/composites/ListingCard
 */

import React from 'react';
import type { Listing } from '@/core/models/listing';
import type { PriceRatingTier } from '@/core/analysis/price-rater';
import { TrustBadge } from '@/design-system/composites/TrustBadge';
import { PriceRatingBadge } from '@/design-system/composites/PriceRatingBadge';
import { HeatIndicator } from '@/design-system/composites/HeatIndicator';
import { HEAT_TIER_INFO, type HeatTier } from '@/core/analysis/heat-tracker';

/** Badge overlay configuration for a listing card. */
export interface ListingCardBadges {
  /** Seller trust score (0-100). */
  trust?: number;
  /** Price rating tier result. */
  priceRating?: {
    tier: PriceRatingTier;
    display: { label: string; emoji: string; color: string };
  };
  /** Heat score (0-100). */
  heat?: number;
}

/** Props for the {@link ListingCard} component. */
export interface ListingCardProps {
  /** The listing to render. */
  listing: Listing;
  /** Optional badge overlays. */
  badges?: ListingCardBadges;
  /** Click handler when the card is selected. */
  onClick?: () => void;
  /** Additional CSS class for composition. */
  className?: string;
}

/** Derive heat tier from score. */
function heatTierFromScore(score: number): HeatTier {
  if (score >= 80) return 'fire';
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  return 'cool';
}

/**
 * A compact listing card showing thumbnail, title, price, location,
 * and optional analysis badge overlays.
 *
 * @example
 * ```tsx
 * <ListingCard
 *   listing={myListing}
 *   badges={{ trust: 82, heat: 75 }}
 *   onClick={() => select(myListing.id)}
 * />
 * ```
 */
export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  badges,
  onClick,
  className,
}) => {
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-md)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    cursor: onClick ? 'pointer' : 'default',
    transition: `box-shadow var(--mps-duration-fast) var(--mps-easing-ease)`,
    fontFamily: 'var(--mps-font-family-primary)',
    overflow: 'hidden',
  };

  const thumbnailStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
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
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    fontWeight: 'var(--mps-font-weight-bold)' as never,
    fontFamily: 'var(--mps-font-family-mono)',
    color: 'var(--mps-color-text-primary)',
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const badgeRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--mps-spacing-xxs)',
    marginTop: 'var(--mps-spacing-xxs)',
  };

  const heatTier = badges?.heat != null ? heatTierFromScore(badges.heat) : null;
  const heatInfo = heatTier ? HEAT_TIER_INFO[heatTier] : null;

  return (
    <div
      className={className}
      style={cardStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {listing.imageUrls.length > 0 ? (
        <img
          src={listing.imageUrls[0]}
          alt={listing.title}
          style={thumbnailStyle}
          loading="lazy"
        />
      ) : (
        <div style={thumbnailStyle} aria-hidden="true" />
      )}

      <div style={bodyStyle}>
        <div style={titleStyle} title={listing.title}>
          {listing.title}
        </div>
        <div style={priceStyle}>
          {listing.price != null ? `$${listing.price.toFixed(0)}` : 'Free'}
        </div>
        {listing.location && <div style={metaStyle}>{listing.location}</div>}

        {badges && (
          <div style={badgeRowStyle}>
            {badges.trust != null && <TrustBadge score={badges.trust} size="sm" />}
            {badges.priceRating && (
              <PriceRatingBadge
                tier={badges.priceRating.display.label}
                emoji={badges.priceRating.display.emoji}
                color={badges.priceRating.display.color}
              />
            )}
            {heatInfo && heatInfo.flames > 0 && (
              <HeatIndicator
                score={badges.heat!}
                flames={heatInfo.flames}
                tier={heatInfo.label}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
