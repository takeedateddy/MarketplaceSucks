/**
 * @module core/models/engagement
 *
 * Defines the {@link EngagementSnapshot} model for capturing a listing's
 * engagement metrics at a specific point in time.
 *
 * Snapshots are stored periodically so that analyzers can compute engagement
 * velocity (e.g. "this listing gained 20 saves in the last hour").
 *
 * @example
 * ```ts
 * import {
 *   createEngagementSnapshot,
 *   computeEngagementDelta,
 * } from "@/core/models/engagement";
 *
 * const snap = createEngagementSnapshot({
 *   listingId: "12345",
 *   saves: 10,
 *   comments: 3,
 *   views: 200,
 * });
 * ```
 */

/**
 * A point-in-time snapshot of engagement metrics for a single listing.
 *
 * @example
 * ```ts
 * const snapshot: EngagementSnapshot = {
 *   listingId: "12345",
 *   timestamp: 1711612800000,
 *   saves: 10,
 *   comments: 3,
 *   views: 200,
 * };
 * ```
 */
export interface EngagementSnapshot {
  /** The listing this snapshot belongs to. */
  readonly listingId: string;

  /** Unix-epoch millisecond timestamp when the snapshot was taken. */
  readonly timestamp: number;

  /** Number of saves/bookmarks at the time of the snapshot. `null` if unavailable. */
  readonly saves: number | null;

  /** Number of comments at the time of the snapshot. `null` if unavailable. */
  readonly comments: number | null;

  /** Number of views at the time of the snapshot. `null` if unavailable. */
  readonly views: number | null;
}

/**
 * The change in engagement metrics between two snapshots.
 *
 * All delta fields are `null` if either the "before" or "after" value was
 * unavailable.
 *
 * @example
 * ```ts
 * const delta: EngagementDelta = {
 *   listingId: "12345",
 *   periodMs: 3600000,
 *   savesDelta: 5,
 *   commentsDelta: 1,
 *   viewsDelta: 80,
 * };
 * ```
 */
export interface EngagementDelta {
  /** The listing this delta applies to. */
  readonly listingId: string;

  /** Duration between the two snapshots in milliseconds. */
  readonly periodMs: number;

  /** Change in saves between snapshots. `null` if either snapshot lacked data. */
  readonly savesDelta: number | null;

  /** Change in comments between snapshots. `null` if either snapshot lacked data. */
  readonly commentsDelta: number | null;

  /** Change in views between snapshots. `null` if either snapshot lacked data. */
  readonly viewsDelta: number | null;
}

/**
 * Fields accepted by {@link createEngagementSnapshot}. Only `listingId` is
 * required; metric fields default to `null`.
 *
 * @example
 * ```ts
 * const input: EngagementSnapshotInput = {
 *   listingId: "12345",
 *   saves: 10,
 *   views: 200,
 * };
 * ```
 */
export interface EngagementSnapshotInput {
  /** @see EngagementSnapshot.listingId */
  readonly listingId: string;

  /** @see EngagementSnapshot.timestamp */
  readonly timestamp?: number;

  /** @see EngagementSnapshot.saves */
  readonly saves?: number | null;

  /** @see EngagementSnapshot.comments */
  readonly comments?: number | null;

  /** @see EngagementSnapshot.views */
  readonly views?: number | null;
}

/**
 * Factory function that creates an {@link EngagementSnapshot} with sensible
 * defaults for any omitted fields.
 *
 * @param input - The partial engagement data. At minimum, `listingId` must
 *   be provided.
 * @returns A complete {@link EngagementSnapshot} object.
 *
 * @example
 * ```ts
 * const snap = createEngagementSnapshot({
 *   listingId: "12345",
 *   saves: 10,
 *   comments: 3,
 *   views: 200,
 * });
 * ```
 */
export function createEngagementSnapshot(input: EngagementSnapshotInput): EngagementSnapshot {
  return {
    listingId: input.listingId,
    timestamp: input.timestamp ?? Date.now(),
    saves: input.saves ?? null,
    comments: input.comments ?? null,
    views: input.views ?? null,
  };
}

/**
 * Compute the change in engagement metrics between two snapshots.
 *
 * The snapshots must belong to the same listing. `before` should be the
 * earlier snapshot and `after` the later one.
 *
 * @param before - The earlier engagement snapshot.
 * @param after  - The later engagement snapshot.
 * @returns An {@link EngagementDelta} describing the change.
 * @throws {Error} If the two snapshots have different `listingId` values.
 *
 * @example
 * ```ts
 * const delta = computeEngagementDelta(snapshotYesterday, snapshotToday);
 * if (delta.savesDelta !== null && delta.savesDelta > 10) {
 *   console.log("Listing is trending!");
 * }
 * ```
 */
export function computeEngagementDelta(
  before: EngagementSnapshot,
  after: EngagementSnapshot,
): EngagementDelta {
  if (before.listingId !== after.listingId) {
    throw new Error(
      `Cannot compute delta for different listings: "${before.listingId}" vs "${after.listingId}"`,
    );
  }

  const safeDelta = (a: number | null, b: number | null): number | null => {
    if (a === null || b === null) return null;
    return b - a;
  };

  return {
    listingId: before.listingId,
    periodMs: after.timestamp - before.timestamp,
    savesDelta: safeDelta(before.saves, after.saves),
    commentsDelta: safeDelta(before.comments, after.comments),
    viewsDelta: safeDelta(before.views, after.views),
  };
}

/**
 * Runtime type guard that checks whether an unknown value conforms to the
 * {@link EngagementSnapshot} interface.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a structurally valid {@link EngagementSnapshot}.
 *
 * @example
 * ```ts
 * const raw: unknown = JSON.parse(stored);
 * if (validateEngagementSnapshot(raw)) {
 *   console.log(raw.saves);
 * }
 * ```
 */
export function validateEngagementSnapshot(value: unknown): value is EngagementSnapshot {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (typeof obj.listingId !== "string" || obj.listingId.length === 0) return false;
  if (typeof obj.timestamp !== "number") return false;

  for (const field of ["saves", "comments", "views"]) {
    if (obj[field] !== null && typeof obj[field] !== "number") return false;
  }

  return true;
}
