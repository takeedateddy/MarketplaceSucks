/**
 * @module plugins/builtin
 *
 * The set of plugins bundled with the extension and registered at startup by
 * the content script. Add bundled plugins here; third-party plugins would be
 * added to this list and rebuilt (content scripts run in an isolated world, so
 * runtime injection from the page is not supported).
 */

import type { IPlugin } from "@/plugins/plugin.interface";
import { ListingCounterPlugin } from "@/plugins/examples/listing-counter.plugin";

/** Factory so each bootstrap gets fresh plugin instances. */
export function createBuiltinPlugins(): IPlugin[] {
  return [new ListingCounterPlugin()];
}
