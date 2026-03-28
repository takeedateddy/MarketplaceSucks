/**
 * Notification engine for saved search alerts and price drop detection.
 * Compares current listings against saved search criteria and historical
 * price data to generate actionable alerts.
 *
 * This module has ZERO browser dependencies — it operates on domain models
 * and returns notification descriptors. The service worker handles the
 * actual browser notification API calls.
 *
 * @module notification-engine
 */

import type { Listing } from '@/core/models/listing';
import type { SavedSearch } from '@/core/models/saved-search';

/** Types of notifications the system can generate */
export type NotificationType = 'new-match' | 'price-drop';

/** A single notification descriptor ready to be shown */
export interface NotificationItem {
  /** Unique ID for deduplication */
  readonly id: string;
  /** Notification type */
  readonly type: NotificationType;
  /** Human-readable title */
  readonly title: string;
  /** Human-readable body text */
  readonly body: string;
  /** URL to open when notification is clicked */
  readonly url: string;
  /** Unix-epoch millisecond timestamp */
  readonly timestamp: number;
  /** Whether the user has read/dismissed this notification */
  readonly read: boolean;
  /** Related saved search ID (for new-match type) */
  readonly savedSearchId?: string;
  /** Related listing ID */
  readonly listingId?: string;
}

/** Price observation for detecting drops */
export interface PriceSnapshot {
  readonly listingId: string;
  readonly title: string;
  readonly url: string;
  readonly previousPrice: number;
  readonly currentPrice: number;
  readonly currency: string;
}

/** Result of a notification check cycle */
export interface NotificationCheckResult {
  /** New notifications generated */
  readonly notifications: NotificationItem[];
  /** Total saved searches checked */
  readonly searchesChecked: number;
  /** Total listings scanned for price drops */
  readonly priceChecksPerformed: number;
}

/**
 * Detect new listings matching a saved search's keywords.
 *
 * Compares the list of recent listings against the search query.
 * Only listings observed after `lastCheckedAt` are considered new.
 *
 * @param search - The saved search to check
 * @param recentListings - Listings to evaluate
 * @param lastCheckedAt - Unix timestamp of the last check (only newer listings count)
 * @returns Array of notification items for new matches
 */
export function detectNewMatches(
  search: SavedSearch,
  recentListings: Listing[],
  lastCheckedAt: number,
): NotificationItem[] {
  if (!search.notifications.enabled) return [];
  if (!search.query.trim()) return [];

  const queryLower = search.query.toLowerCase();
  const notifications: NotificationItem[] = [];

  for (const listing of recentListings) {
    if (listing.firstObserved <= lastCheckedAt) continue;

    const titleLower = listing.normalizedTitle;
    if (!titleLower.includes(queryLower)) continue;

    notifications.push({
      id: `match-${search.id}-${listing.id}`,
      type: 'new-match',
      title: `New match: "${search.name}"`,
      body: `${listing.title} — ${listing.price !== null ? `$${listing.price}` : 'Free'}`,
      url: listing.listingUrl,
      timestamp: Date.now(),
      read: false,
      savedSearchId: search.id,
      listingId: listing.id,
    });
  }

  return notifications;
}

/**
 * Detect price drops from price snapshots.
 *
 * @param snapshots - Price snapshots with previous and current prices
 * @param minDropPercent - Minimum percentage drop to trigger notification (default 5%)
 * @returns Array of notification items for price drops
 */
export function detectPriceDrops(
  snapshots: PriceSnapshot[],
  minDropPercent: number = 5,
): NotificationItem[] {
  const notifications: NotificationItem[] = [];

  for (const snap of snapshots) {
    if (snap.currentPrice >= snap.previousPrice) continue;
    if (snap.previousPrice === 0) continue;

    const dropPercent = ((snap.previousPrice - snap.currentPrice) / snap.previousPrice) * 100;

    if (dropPercent < minDropPercent) continue;

    notifications.push({
      id: `drop-${snap.listingId}-${Date.now()}`,
      type: 'price-drop',
      title: 'Price drop detected',
      body: `${snap.title}: $${snap.previousPrice} → $${snap.currentPrice} (-${Math.round(dropPercent)}%)`,
      url: snap.url,
      timestamp: Date.now(),
      read: false,
      listingId: snap.listingId,
    });
  }

  return notifications;
}

/**
 * Determine the alarm interval in minutes based on notification frequency.
 *
 * @param frequency - The user's chosen frequency
 * @returns Interval in minutes
 */
export function frequencyToMinutes(frequency: string): number {
  switch (frequency) {
    case 'realtime': return 5;
    case 'hourly': return 60;
    case 'daily': return 1440;
    default: return 0; // manual = no automatic checks
  }
}
