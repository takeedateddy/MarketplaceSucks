/**
 * Background service worker for Manifest V3.
 * Handles extension lifecycle events, messaging between content scripts
 * and the popup, and scaffolds future notification/alert functionality.
 *
 * @module service-worker
 */

import { browser } from '@/platform/browser';

/** Message types for inter-component communication */
interface ExtensionMessage {
  action: string;
  payload?: unknown;
}

/**
 * Handle extension installation/update.
 */
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[MPS] MarketplaceSucks installed. Welcome!');
    // Set default settings
    browser.storage.local.set({
      'mps-settings': {
        sidebarOpen: false,
        sidebarWidth: 360,
        activeTab: 'filters',
        theme: 'auto',
        filterPreset: null,
        enabledFeatures: {
          sellerTrust: true,
          priceRating: true,
          imageAnalysis: false,
          heatTracking: true,
          salesForecast: true,
          listingHistory: true,
        },
        historyRetentionDays: 30,
        priceDataRetentionDays: 90,
        fuzzyMatchLevel: 'medium',
        hiddenListingBehavior: 'dim',
      },
    });
  } else if (details.reason === 'update') {
    console.log(`[MPS] Updated to version ${browser.runtime.getManifest().version}`);
  }
});

/**
 * Handle messages from content scripts and popup.
 */
browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender): Promise<unknown> | undefined => {
    const msg = message as ExtensionMessage;
    const _sender = sender;
    switch (msg.action) {
      case 'get-settings':
        return browser.storage.local.get('mps-settings').then((result) => {
          return result['mps-settings'] ?? null;
        });

      case 'save-settings':
        return browser.storage.local.set({
          'mps-settings': msg.payload,
        });

      case 'get-stats':
        // Return quick stats for popup
        return browser.storage.local.get(['mps-listing-count', 'mps-filter-count']).then(
          (result) => ({
            listingCount: result['mps-listing-count'] ?? 0,
            filterCount: result['mps-filter-count'] ?? 0,
          }),
        );

      case 'toggle-sidebar':
        // Forward to content script in active tab
        return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          if (tabs[0]?.id) {
            return browser.tabs.sendMessage(tabs[0].id, {
              action: 'toggle-sidebar',
            });
          }
          return undefined;
        });

      case 'clear-badge':
        return browser.storage.local.set({ 'mps-notification-badge-count': 0 }).then(() => {
          return browser.action?.setBadgeText({ text: '' });
        });

      case 'check-alerts-now':
        return checkAlerts();

      case 'get-selector-health':
        // Forward to content script in active tab
        return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          if (tabs[0]?.id) {
            return browser.tabs.sendMessage(tabs[0].id, {
              action: 'run-selector-health-check',
            });
          }
          return undefined;
        });

      case 'open-marketplace':
        return browser.tabs.create({
          url: 'https://www.facebook.com/marketplace/',
        }) as Promise<unknown>;

      default:
        console.log(`[MPS] Unknown message action: ${msg.action}`, _sender);
        return undefined;
    }
  },
);

/**
 * Scaffold: periodic alarm for future notification features.
 * This creates a repeating alarm that can be used to check for
 * saved search matches and price drops.
 */
browser.alarms?.create('mps-check-alerts', {
  periodInMinutes: 30,
});

browser.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'mps-check-alerts') {
    checkAlerts().catch((err) => {
      console.error('[MPS] Alert check failed:', err);
    });
  }
});

/**
 * Check saved searches for new matching listings and price drops.
 * Reads saved searches from storage, compares against recent listings,
 * and creates browser notifications for any matches.
 */
async function checkAlerts(): Promise<void> {
  const result = await browser.storage.local.get([
    'mps-saved-searches',
    'mps-recent-listings',
    'mps-price-history',
    'mps-last-alert-check',
    'mps-notification-badge-count',
  ]);

  const data = result as Record<string, unknown>;
  const searches: SavedSearchRecord[] = (data['mps-saved-searches'] ?? []) as SavedSearchRecord[];
  const recentListings: RecentListingRecord[] = (data['mps-recent-listings'] ?? []) as RecentListingRecord[];
  const priceHistory: PriceHistoryRecord[] = (data['mps-price-history'] ?? []) as PriceHistoryRecord[];
  const lastCheck: number = (data['mps-last-alert-check'] ?? 0) as number;
  let badgeCount: number = (data['mps-notification-badge-count'] ?? 0) as number;

  const enabledSearches = searches.filter(
    (s) => s.notifications?.enabled && s.notifications?.frequency !== 'manual',
  );

  if (enabledSearches.length === 0 && priceHistory.length === 0) return;

  const notifications: AlertNotification[] = [];

  // Check saved searches for new matches
  for (const search of enabledSearches) {
    if (!search.query?.trim()) continue;
    const queryLower = search.query.toLowerCase();

    for (const listing of recentListings) {
      if ((listing.firstObserved ?? 0) <= lastCheck) continue;
      const title = (listing.title ?? '').toLowerCase();
      if (title.includes(queryLower)) {
        notifications.push({
          id: `match-${search.id}-${listing.id}`,
          title: `New match: "${search.name}"`,
          body: `${listing.title}${listing.price != null ? ` — $${listing.price}` : ''}`,
          url: listing.url ?? '',
        });
      }
    }
  }

  // Check for price drops
  for (const entry of priceHistory) {
    if (entry.previousPrice == null || entry.currentPrice == null) continue;
    if (entry.currentPrice >= entry.previousPrice) continue;
    if (entry.previousPrice === 0) continue;

    const dropPct = ((entry.previousPrice - entry.currentPrice) / entry.previousPrice) * 100;
    if (dropPct >= 5) {
      notifications.push({
        id: `drop-${entry.listingId}-${Date.now()}`,
        title: 'Price drop detected',
        body: `${entry.title}: $${entry.previousPrice} → $${entry.currentPrice} (-${Math.round(dropPct)}%)`,
        url: entry.url ?? '',
      });
    }
  }

  // Show browser notifications
  for (const n of notifications) {
    try {
      await browser.notifications?.create(n.id, {
        type: 'basic',
        title: n.title,
        message: n.body,
        iconUrl: browser.runtime.getURL('icon-128.png'),
      });
      badgeCount++;
    } catch (err) {
      console.warn('[MPS] Failed to create notification:', err);
    }
  }

  // Update badge and last-check timestamp
  if (badgeCount > 0) {
    try {
      await browser.action?.setBadgeText({ text: String(badgeCount) });
      await browser.action?.setBadgeBackgroundColor({ color: '#ef4444' });
    } catch {
      // action API may not be available in all contexts
    }
  }

  await browser.storage.local.set({
    'mps-last-alert-check': Date.now(),
    'mps-notification-badge-count': badgeCount,
  });

  if (notifications.length > 0) {
    console.log(`[MPS] Alert check: ${notifications.length} notification(s) sent`);
  }
}

/** Minimal record shapes for storage-based alert checking */
interface SavedSearchRecord {
  id: string;
  name: string;
  query: string;
  notifications?: { enabled: boolean; frequency: string };
}

interface RecentListingRecord {
  id: string;
  title: string;
  price?: number | null;
  url?: string;
  firstObserved?: number;
}

interface PriceHistoryRecord {
  listingId: string;
  title: string;
  url?: string;
  previousPrice?: number | null;
  currentPrice?: number | null;
}

interface AlertNotification {
  id: string;
  title: string;
  body: string;
  url: string;
}

/**
 * Open the relevant listing when a notification is clicked.
 */
browser.notifications?.onClicked.addListener((notificationId) => {
  browser.storage.local.get('mps-notification-urls').then((result) => {
    const data = result as Record<string, unknown>;
    const urls = (data['mps-notification-urls'] ?? {}) as Record<string, string>;
    const url = urls[notificationId];
    if (url) {
      browser.tabs.create({ url });
    }
    browser.notifications?.clear(notificationId);
  });
});
