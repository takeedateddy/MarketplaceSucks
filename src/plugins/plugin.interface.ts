/**
 * Plugin interface for extending MarketplaceSucks with new capabilities.
 * Plugins can register filters, analyzers, and UI components.
 *
 * @module plugin-interface
 */

import type { EventBus } from '@/core/utils/event-bus';
import type { IStorageAdapter } from '@/core/interfaces/storage.interface';

/**
 * Context provided to plugins during initialization.
 * Gives plugins access to the extension's core systems.
 */
export interface PluginContext {
  /** Event bus for communication */
  events: EventBus;
  /** Storage adapter for persistence */
  storage: IStorageAdapter;
  /** Register a filter (plugins call this to add filters) */
  registerFilter: (filter: unknown) => void;
  /** Register a sorter */
  registerSorter: (sorter: unknown) => void;
}

/**
 * Interface that all plugins must implement.
 *
 * @example
 * ```typescript
 * class MyPlugin implements IPlugin {
 *   readonly id = 'my-plugin';
 *   readonly name = 'My Plugin';
 *   readonly version = '1.0.0';
 *   readonly author = 'Your Name';
 *
 *   async initialize(context: PluginContext): Promise<void> {
 *     context.registerFilter(new MyCustomFilter());
 *   }
 *
 *   async teardown(): Promise<void> {
 *     // cleanup
 *   }
 * }
 * ```
 */
export interface IPlugin {
  /** Unique plugin identifier */
  readonly id: string;
  /** Plugin display name */
  readonly name: string;
  /** Plugin version (semver) */
  readonly version: string;
  /** Plugin author */
  readonly author: string;
  /** Initialize the plugin */
  initialize(context: PluginContext): Promise<void>;
  /** Clean up when the plugin is disabled */
  teardown(): Promise<void>;
}
