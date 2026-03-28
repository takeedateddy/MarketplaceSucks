/**
 * @module platform/permissions
 *
 * Wrapper around `browser.permissions` for requesting and querying optional
 * permissions at runtime.
 *
 * Optional permissions let the extension request access to APIs or host
 * patterns only when the user actually needs them, keeping the install-time
 * permission prompt as small as possible.
 */

import { browser } from "./browser";
import type { Permissions } from "webextension-polyfill";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Convenience alias for the permissions request shape. */
export interface PermissionRequest {
  /** API permissions (e.g. `"tabs"`, `"notifications"`). */
  permissions?: string[];
  /** Host match patterns (e.g. `"*://*.facebook.com/*"`). */
  origins?: string[];
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

/**
 * Check whether the extension currently holds **all** of the specified
 * permissions and/or origin patterns.
 *
 * @param request - The permissions / origins to check.
 * @returns `true` if every requested permission is already granted.
 *
 * @example
 * ```ts
 * if (await hasPermissions({ permissions: ["notifications"] })) {
 *   showNotification(msg);
 * }
 * ```
 */
export async function hasPermissions(
  request: PermissionRequest,
): Promise<boolean> {
  return browser.permissions.contains(
    request as Permissions.AnyPermissions,
  );
}

/**
 * Return the full set of permissions the extension currently holds.
 *
 * @returns The current `Permissions` object.
 */
export async function getCurrentPermissions(): Promise<Permissions.AnyPermissions> {
  return browser.permissions.getAll();
}

// ---------------------------------------------------------------------------
// Requesting / Releasing
// ---------------------------------------------------------------------------

/**
 * Prompt the user to grant additional permissions.
 *
 * **Important:** This must be called from a user-gesture context (e.g. a
 * click handler) or the browser will reject the request.
 *
 * @param request - The permissions / origins to request.
 * @returns `true` if the user granted the request.
 *
 * @example
 * ```ts
 * const granted = await requestPermissions({
 *   origins: ["*://*.facebook.com/*"],
 * });
 * if (!granted) showPermissionDenied();
 * ```
 */
export async function requestPermissions(
  request: PermissionRequest,
): Promise<boolean> {
  return browser.permissions.request(
    request as unknown as Permissions.Permissions,
  );
}

/**
 * Voluntarily release permissions the extension no longer needs.
 *
 * @param request - The permissions / origins to release.
 * @returns `true` if the permissions were successfully removed.
 */
export async function releasePermissions(
  request: PermissionRequest,
): Promise<boolean> {
  return browser.permissions.remove(
    request as unknown as Permissions.Permissions,
  );
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/**
 * Ensure a set of permissions is granted, requesting them if necessary.
 *
 * If the permissions are already held this is a no-op. Otherwise the user is
 * prompted. Returns `true` only when all requested permissions are active
 * after the call.
 *
 * @param request - The permissions / origins to ensure.
 * @returns `true` if all permissions are now granted.
 */
export async function ensurePermissions(
  request: PermissionRequest,
): Promise<boolean> {
  const alreadyGranted = await hasPermissions(request);
  if (alreadyGranted) return true;
  return requestPermissions(request);
}

/**
 * Subscribe to permission changes (granted or revoked).
 *
 * @param onAdded - Called when new permissions are granted.
 * @param onRemoved - Called when permissions are revoked.
 * @returns An unsubscribe function that removes both listeners.
 */
export function onPermissionsChanged(
  onAdded?: (permissions: Permissions.AnyPermissions) => void,
  onRemoved?: (permissions: Permissions.AnyPermissions) => void,
): () => void {
  const addedHandler = onAdded
    ? (perms: Permissions.AnyPermissions) => onAdded(perms)
    : undefined;
  const removedHandler = onRemoved
    ? (perms: Permissions.AnyPermissions) => onRemoved(perms)
    : undefined;

  if (addedHandler) {
    browser.permissions.onAdded.addListener(addedHandler);
  }
  if (removedHandler) {
    browser.permissions.onRemoved.addListener(removedHandler);
  }

  return () => {
    if (addedHandler) {
      browser.permissions.onAdded.removeListener(addedHandler);
    }
    if (removedHandler) {
      browser.permissions.onRemoved.removeListener(removedHandler);
    }
  };
}
