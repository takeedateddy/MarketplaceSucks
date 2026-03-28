/**
 * Plugin manager that loads, registers, and manages plugin lifecycle.
 *
 * @module plugin-manager
 */

import type { IPlugin, PluginContext } from './plugin.interface';

/**
 * Manages the lifecycle of all registered plugins.
 *
 * @example
 * ```typescript
 * const manager = new PluginManager();
 * await manager.register(myPlugin, pluginContext);
 * // Later:
 * await manager.unregister('my-plugin');
 * ```
 */
export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();

  /**
   * Register and initialize a plugin.
   *
   * @param plugin - The plugin to register
   * @param context - The plugin context providing access to extension systems
   */
  async register(plugin: IPlugin, context: PluginContext): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[MPS] Plugin "${plugin.id}" already registered. Replacing.`);
      await this.unregister(plugin.id);
    }

    try {
      await plugin.initialize(context);
      this.plugins.set(plugin.id, plugin);
      console.log(`[MPS] Plugin "${plugin.name}" v${plugin.version} registered.`);
    } catch (err) {
      console.error(`[MPS] Failed to initialize plugin "${plugin.id}":`, err);
    }
  }

  /**
   * Unregister and teardown a plugin.
   *
   * @param id - The plugin ID to unregister
   */
  async unregister(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin) {
      try {
        await plugin.teardown();
      } catch (err) {
        console.error(`[MPS] Error tearing down plugin "${id}":`, err);
      }
      this.plugins.delete(id);
    }
  }

  /**
   * Get all registered plugins.
   *
   * @returns Array of registered plugins
   */
  getAll(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a plugin by ID.
   *
   * @param id - The plugin ID
   * @returns The plugin, or undefined
   */
  get(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Teardown all plugins.
   */
  async teardownAll(): Promise<void> {
    for (const [id] of this.plugins) {
      await this.unregister(id);
    }
  }
}
