/**
 * Web Worker for off-main-thread data processing.
 *
 * Scope note: a content-script-spawned worker runs in the extension origin, not
 * the page origin, so it cannot touch the page-origin IndexedDB the extension
 * persists to — DB writes/cleanup stay on the main thread (see
 * `content/persistence.ts`). This worker therefore handles *pure* computation
 * that benefits from being off the main thread: price aggregation over
 * potentially large listing sets.
 *
 * @module data-processing-worker
 */

import { aggregatePrices } from "@/core/utils/price-aggregate";

/** Request sent to the worker. */
interface AggregateRequest {
  type: "aggregate-prices";
  id: string;
  payload: { prices: number[] };
}

self.onmessage = (event: MessageEvent<AggregateRequest>) => {
  const { type, id, payload } = event.data;
  try {
    if (type === "aggregate-prices") {
      const result = aggregatePrices(payload?.prices ?? []);
      self.postMessage({ type: "aggregate-result", id, result });
    } else {
      self.postMessage({ type: "error", id, error: `Unknown type: ${type}` });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      id,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
