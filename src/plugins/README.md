# Creating a MarketplaceSucks Plugin

Plugins extend MarketplaceSucks with new capabilities — filters, analyzers, sorters, or entirely new features.

## Quick Start

1. Create a new file in `src/plugins/` implementing `IPlugin`:

```typescript
import type { IPlugin, PluginContext } from './plugin.interface';

class MyPlugin implements IPlugin {
  readonly id = 'my-plugin';
  readonly name = 'My Custom Plugin';
  readonly version = '1.0.0';
  readonly author = 'Your Name';

  async initialize(context: PluginContext): Promise<void> {
    // Register your filters, sorters, or subscribe to events
    context.events.on('listings:parsed', (data) => {
      // React to new listings
    });
  }

  async teardown(): Promise<void> {
    // Clean up subscriptions, clear data, etc.
  }
}

export default new MyPlugin();
```

2. Register it in `src/content/index.ts`:

```typescript
import myPlugin from '@/plugins/my-plugin';
pluginManager.register(myPlugin, pluginContext);
```

## Plugin Context

Your plugin receives a `PluginContext` with:

- **`events`** — The event bus. Subscribe to `listings:parsed`, `listings:filtered`, etc.
- **`storage`** — Persistent storage adapter for your plugin's data.
- **`registerFilter`** — Add a custom filter to the filter registry.
- **`registerSorter`** — Add a custom sorter to the sort registry.

## Guidelines

- Plugins must not import browser APIs directly. Use the provided context.
- Plugins must clean up all subscriptions and data in `teardown()`.
- Use a unique `id` to avoid conflicts with other plugins.
- Keep plugins focused — one feature per plugin.
