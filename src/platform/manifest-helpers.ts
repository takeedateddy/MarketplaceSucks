/**
 * @module platform/manifest-helpers
 *
 * Runtime detection of manifest version, browser vendor, and feature
 * availability.
 *
 * Because the extension targets Chrome, Firefox, and Edge with both MV2 and
 * MV3 manifests, code sometimes needs to branch on capabilities that differ
 * between those environments. This module centralises that detection so the
 * rest of the codebase can query simple boolean flags instead of sniffing
 * user-agent strings or catching API errors in hot paths.
 */

import { browser } from "./browser";

// ---------------------------------------------------------------------------
// Ambient globals – Chrome exposes these but they are not in the default
// lib.dom typings used by the polyfill. We declare just the shapes we probe.
// ---------------------------------------------------------------------------

/* eslint-disable no-var */
declare global {
  // Chrome-specific global
  var chrome: {
    runtime?: { id?: string };
    offscreen?: unknown;
    sidePanel?: unknown;
    [key: string]: unknown;
  };

  // Service Worker scope detection
  var ServiceWorkerGlobalScope: { new (): unknown } | undefined;
}
/* eslint-enable no-var */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Known browser vendors the extension may run in. */
export type BrowserVendor = "chrome" | "firefox" | "edge" | "unknown";

/** Manifest versions the extension supports. */
export type ManifestVersion = 2 | 3;

/** A snapshot of the current runtime environment. */
export interface PlatformInfo {
  /** The browser vendor. */
  vendor: BrowserVendor;
  /** The manifest version declared in `manifest.json`. */
  manifestVersion: ManifestVersion;
  /** `true` when the Offscreen Documents API is available (Chrome MV3). */
  hasOffscreenAPI: boolean;
  /** `true` when `declarativeNetRequest` is available (MV3). */
  hasDeclarativeNetRequest: boolean;
  /** `true` when `browser.scripting` is available (MV3). */
  hasScriptingAPI: boolean;
  /** `true` when `browser.action` is available (MV3; MV2 uses `browserAction`). */
  hasActionAPI: boolean;
  /** `true` when the service-worker-based background is active (MV3). */
  hasServiceWorkerBackground: boolean;
  /** `true` when `browser.sidePanel` is available (Chrome 114+). */
  hasSidePanelAPI: boolean;
}

// ---------------------------------------------------------------------------
// Vendor detection
// ---------------------------------------------------------------------------

/**
 * Detect the browser vendor at runtime.
 *
 * The heuristic inspects well-known global objects and user-agent tokens in
 * that order. It intentionally avoids async APIs so it can be used
 * synchronously at module-load time.
 *
 * @returns The detected {@link BrowserVendor}.
 */
export function detectVendor(): BrowserVendor {
  const ua = navigator.userAgent;

  // Edge ships a Chrome-compatible engine but includes "Edg/" in its UA.
  if (ua.includes("Edg/")) return "edge";

  // Firefox exposes `browser` natively and lacks `chrome.csi`.
  // The polyfill provides `browser` everywhere, so we check the UA instead.
  if (ua.includes("Firefox/")) return "firefox";

  // Chrome (and Chromium-based browsers we haven't identified above).
  if (typeof chrome !== "undefined" && chrome.runtime?.id) return "chrome";

  return "unknown";
}

// ---------------------------------------------------------------------------
// Manifest version
// ---------------------------------------------------------------------------

/**
 * Read the manifest version declared in the extension's `manifest.json`.
 *
 * @returns `2` or `3`.
 */
export function getManifestVersion(): ManifestVersion {
  const manifest = browser.runtime.getManifest();
  return manifest.manifest_version as ManifestVersion;
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/**
 * Check whether the Offscreen Documents API is available.
 *
 * Offscreen documents are a Chrome MV3 feature that lets the service worker
 * create a hidden DOM context for tasks like audio playback or DOM parsing.
 *
 * @returns `true` when the API exists in the current runtime.
 */
export function hasOffscreenAPI(): boolean {
  return (
    typeof chrome !== "undefined" &&
    chrome.offscreen !== undefined
  );
}

/**
 * Check whether `declarativeNetRequest` is available.
 *
 * @returns `true` when the API exists.
 */
export function hasDeclarativeNetRequest(): boolean {
  return browser.declarativeNetRequest !== undefined;
}

/**
 * Check whether `browser.scripting` is available (MV3).
 *
 * @returns `true` when the API exists.
 */
export function hasScriptingAPI(): boolean {
  return browser.scripting !== undefined;
}

/**
 * Check whether `browser.action` is available (MV3).
 *
 * In MV2 the equivalent namespace is `browserAction`.
 *
 * @returns `true` when `browser.action` exists.
 */
export function hasActionAPI(): boolean {
  return browser.action !== undefined;
}

/**
 * Check whether the background context is a service worker (MV3) rather than
 * an event / persistent page (MV2).
 *
 * @returns `true` when running inside a service worker.
 */
export function hasServiceWorkerBackground(): boolean {
  return (
    typeof ServiceWorkerGlobalScope !== "undefined" &&
    self instanceof ServiceWorkerGlobalScope
  );
}

/**
 * Check whether the Side Panel API is available (Chrome 114+).
 *
 * @returns `true` when `browser.sidePanel` or `chrome.sidePanel` exists.
 */
export function hasSidePanelAPI(): boolean {
  return (
    (typeof chrome !== "undefined" &&
      chrome.sidePanel !== undefined) ||
    (browser as unknown as Record<string, unknown>).sidePanel !== undefined
  );
}

// ---------------------------------------------------------------------------
// Aggregate info
// ---------------------------------------------------------------------------

/** Cached result so repeated calls don't re-sniff. */
let _cached: PlatformInfo | null = null;

/**
 * Build a complete {@link PlatformInfo} snapshot of the current runtime.
 *
 * The result is cached after the first call.
 *
 * @returns A frozen {@link PlatformInfo} object.
 *
 * @example
 * ```ts
 * const info = getPlatformInfo();
 * if (info.hasOffscreenAPI) {
 *   await chrome.offscreen.createDocument({ … });
 * }
 * ```
 */
export function getPlatformInfo(): PlatformInfo {
  if (_cached) return _cached;

  _cached = Object.freeze({
    vendor: detectVendor(),
    manifestVersion: getManifestVersion(),
    hasOffscreenAPI: hasOffscreenAPI(),
    hasDeclarativeNetRequest: hasDeclarativeNetRequest(),
    hasScriptingAPI: hasScriptingAPI(),
    hasActionAPI: hasActionAPI(),
    hasServiceWorkerBackground: hasServiceWorkerBackground(),
    hasSidePanelAPI: hasSidePanelAPI(),
  });

  return _cached;
}

/**
 * Convenience check: is the extension running under Manifest V3?
 *
 * @returns `true` when `manifest_version` is 3.
 */
export function isMV3(): boolean {
  return getManifestVersion() === 3;
}

/**
 * Convenience check: is the extension running in Firefox?
 *
 * @returns `true` when the detected vendor is `"firefox"`.
 */
export function isFirefox(): boolean {
  return detectVendor() === "firefox";
}

/**
 * Reset the cached platform info.
 *
 * Primarily useful in tests when you need to simulate a different environment.
 */
export function resetPlatformInfoCache(): void {
  _cached = null;
}
