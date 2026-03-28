/**
 * @module platform/tabs
 *
 * Typed helpers for common tab operations.
 *
 * Wraps `browser.tabs` so the rest of the codebase does not need to import
 * the polyfill directly and gets narrower, more ergonomic function signatures.
 */

import { browser } from "./browser";
import type { Tabs } from "webextension-polyfill";

// ---------------------------------------------------------------------------
// Re-export useful upstream types
// ---------------------------------------------------------------------------

export type Tab = Tabs.Tab;
export type TabChangeInfo = Tabs.OnUpdatedChangeInfoType;

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

/**
 * Return the currently active tab in the focused window.
 *
 * @returns The active `Tab`, or `undefined` if none can be determined.
 */
export async function getActiveTab(): Promise<Tab | undefined> {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tabs[0];
}

/**
 * Query tabs matching the supplied filter.
 *
 * This is a thin pass-through kept here so consumers do not need to import
 * `browser` themselves.
 *
 * @param query - A `tabs.query` filter object.
 * @returns An array of matching tabs.
 */
export async function queryTabs(
  query: Tabs.QueryQueryInfoType,
): Promise<Tab[]> {
  return browser.tabs.query(query);
}

/**
 * Get a single tab by its ID.
 *
 * @param tabId - The tab ID.
 * @returns The `Tab` object, or `undefined` if the tab no longer exists.
 */
export async function getTab(tabId: number): Promise<Tab | undefined> {
  try {
    return await browser.tabs.get(tabId);
  } catch {
    // Tab was closed between the time we obtained the ID and now.
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Create a new tab.
 *
 * @param url - The URL to open.
 * @param active - Whether the tab should be focused (defaults to `true`).
 * @returns The newly created `Tab`.
 */
export async function createTab(
  url: string,
  active = true,
): Promise<Tab> {
  return browser.tabs.create({ url, active });
}

/**
 * Navigate an existing tab to a new URL.
 *
 * @param tabId - The target tab.
 * @param url - The URL to navigate to.
 * @returns The updated `Tab`.
 */
export async function updateTab(
  tabId: number,
  url: string,
): Promise<Tab | undefined> {
  try {
    return await browser.tabs.update(tabId, { url });
  } catch {
    return undefined;
  }
}

/**
 * Reload a tab.
 *
 * @param tabId - The tab to reload.
 * @param bypassCache - If `true`, bypass the browser cache (defaults to `false`).
 */
export async function reloadTab(
  tabId: number,
  bypassCache = false,
): Promise<void> {
  await browser.tabs.reload(tabId, { bypassCache });
}

/**
 * Close one or more tabs.
 *
 * @param tabIds - A single tab ID or an array of tab IDs.
 */
export async function closeTabs(tabIds: number | number[]): Promise<void> {
  await browser.tabs.remove(tabIds);
}

// ---------------------------------------------------------------------------
// Scripting
// ---------------------------------------------------------------------------

/**
 * Inject a CSS string into a tab.
 *
 * @param tabId - The target tab.
 * @param css - The CSS text to inject.
 */
export async function injectCSS(tabId: number, css: string): Promise<void> {
  await browser.tabs.insertCSS(tabId, { code: css });
}

/**
 * Remove previously injected CSS from a tab.
 *
 * @param tabId - The target tab.
 * @param css - The CSS text to remove.
 */
export async function removeCSS(tabId: number, css: string): Promise<void> {
  await browser.tabs.removeCSS(tabId, { code: css });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Listen for tab updates (URL change, loading state, title change, etc.).
 *
 * @param listener - Callback invoked on every tab update.
 * @returns An unsubscribe function.
 */
export function onTabUpdated(
  listener: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void,
): () => void {
  browser.tabs.onUpdated.addListener(listener);
  return () => {
    browser.tabs.onUpdated.removeListener(listener);
  };
}

/**
 * Listen for tab activation (the user switches tabs).
 *
 * @param listener - Callback receiving the newly active tab's ID and window ID.
 * @returns An unsubscribe function.
 */
export function onTabActivated(
  listener: (activeInfo: Tabs.OnActivatedActiveInfoType) => void,
): () => void {
  browser.tabs.onActivated.addListener(listener);
  return () => {
    browser.tabs.onActivated.removeListener(listener);
  };
}

/**
 * Listen for tab removal (the user closes a tab).
 *
 * @param listener - Callback receiving the closed tab's ID and removal info.
 * @returns An unsubscribe function.
 */
export function onTabRemoved(
  listener: (
    tabId: number,
    removeInfo: Tabs.OnRemovedRemoveInfoType,
  ) => void,
): () => void {
  browser.tabs.onRemoved.addListener(listener);
  return () => {
    browser.tabs.onRemoved.removeListener(listener);
  };
}
