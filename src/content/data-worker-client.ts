/**
 * @module content/data-worker-client
 *
 * Thin client for the data-processing Web Worker. Lazily spawns the worker
 * (built to `dist/data-processing.worker.js` and exposed via
 * `web_accessible_resources`), correlates responses by id, and exposes a typed
 * `aggregatePrices` call. Best-effort: if the worker can't be created it falls
 * back to computing inline so callers never break.
 */

import { browser } from "@/platform/browser";
import { aggregatePrices as aggregateInline, type PriceAggregate } from "@/core/utils/price-aggregate";

const WORKER_PATH = "data-processing.worker.js";

interface PendingRequest {
  resolve: (value: PriceAggregate) => void;
  reject: (reason?: unknown) => void;
}

/** Client around the data-processing worker with a graceful inline fallback. */
export class DataWorkerClient {
  private worker: Worker | null = null;
  private seq = 0;
  private readonly pending = new Map<string, PendingRequest>();

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    try {
      const url = browser.runtime.getURL(WORKER_PATH);
      this.worker = new Worker(url);
      this.worker.onmessage = (event: MessageEvent<{ id: string; result?: PriceAggregate; error?: string }>) => {
        const { id, result, error } = event.data;
        const req = this.pending.get(id);
        if (!req) return;
        this.pending.delete(id);
        if (error || !result) req.reject(new Error(error ?? "worker error"));
        else req.resolve(result);
      };
      this.worker.onerror = () => {
        // Drop the worker; subsequent calls fall back to inline computation.
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
    return this.worker;
  }

  /** Aggregate prices off the main thread, falling back to inline on failure. */
  aggregatePrices(prices: number[]): Promise<PriceAggregate> {
    const worker = this.ensureWorker();
    if (!worker) return Promise.resolve(aggregateInline(prices));

    const id = `agg-${++this.seq}`;
    return new Promise<PriceAggregate>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ type: "aggregate-prices", id, payload: { prices } });
    }).catch(() => aggregateInline(prices));
  }

  /** Terminate the worker and reject any in-flight requests. */
  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
