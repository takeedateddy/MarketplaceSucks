/**
 * @module plugins/examples/listing-counter
 *
 * A minimal reference {@link IPlugin} that demonstrates the plugin lifecycle and
 * the {@link PluginContext}: it subscribes to analysis-complete events and keeps
 * a running count of analyzed listings in storage. Useful as a copy-paste
 * starting point for real plugins (which can also `registerFilter` /
 * `registerSorter`).
 */

import type { IPlugin, PluginContext } from "@/plugins/plugin.interface";
import { MPS_EVENTS } from "@/core/utils/event-bus";

/** Storage key the example plugin writes its tally to. */
export const LISTING_COUNTER_KEY = "mps-plugin:listing-counter";

export class ListingCounterPlugin implements IPlugin {
  readonly id = "listing-counter";
  readonly name = "Listing Counter (example)";
  readonly version = "1.0.0";
  readonly author = "MarketplaceSucks";

  private unsubscribe: (() => void) | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.unsubscribe = context.events.on<{ total: number }>(
      MPS_EVENTS.ANALYSIS_COMPLETE,
      ({ total }) => {
        void context.storage.set(LISTING_COUNTER_KEY, {
          total,
          updatedAt: Date.now(),
        });
      },
    );
  }

  async teardown(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
