/**
 * @module platform/browser
 *
 * Single import point for the webextension-polyfill browser API.
 *
 * Every module in the extension should import `browser` from this file rather
 * than importing `webextension-polyfill` directly. This gives us a single seam
 * for mocking in tests and swapping implementations if the polyfill changes.
 *
 * @example
 * ```ts
 * import { browser } from "@/platform/browser";
 * const tabs = await browser.tabs.query({ active: true });
 * ```
 */

import browser from "webextension-polyfill";

export { browser };
export type { Browser } from "webextension-polyfill";
