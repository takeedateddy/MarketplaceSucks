/**
 * Background service worker for Manifest V3.
 * Handles extension lifecycle events, messaging between content scripts
 * and the popup, and scaffolds future notification/alert functionality.
 *
 * @module service-worker
 */

import browser from 'webextension-polyfill';

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
  (message: ExtensionMessage, sender): Promise<unknown> | undefined => {
    switch (message.action) {
      case 'get-settings':
        return browser.storage.local.get('mps-settings').then((result) => {
          return result['mps-settings'] ?? null;
        });

      case 'save-settings':
        return browser.storage.local.set({
          'mps-settings': message.payload,
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

      case 'open-marketplace':
        return browser.tabs.create({
          url: 'https://www.facebook.com/marketplace/',
        }) as Promise<unknown>;

      default:
        console.log(`[MPS] Unknown message action: ${message.action}`, sender);
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
    // Future: check saved search alerts, price drop alerts
    console.log('[MPS] Alert check triggered (scaffold - no action yet)');
  }
});
