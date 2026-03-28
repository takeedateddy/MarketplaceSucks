# Contributing to MarketplaceSucks

Thank you for your interest in contributing. This document covers everything you need to get started: environment setup, code standards, architecture patterns, and the process for submitting changes.

---

## Table of Contents

- [CLA Requirement](#cla-requirement)
- [Development Environment Setup](#development-environment-setup)
- [Cross-Browser Testing](#cross-browser-testing)
- [Code Style](#code-style)
- [Naming Conventions](#naming-conventions)
- [Architecture Overview](#architecture-overview)
- [Design System Rules](#design-system-rules)
- [How to Add a New Filter](#how-to-add-a-new-filter)
- [How to Add a New Analysis Engine](#how-to-add-a-new-analysis-engine)
- [How to Add a New Sidebar Tab](#how-to-add-a-new-sidebar-tab)
- [Cross-Browser Rules](#cross-browser-rules)
- [Pull Request Requirements](#pull-request-requirements)
- [Code of Conduct](#code-of-conduct)

---

## CLA Requirement

All contributors must sign the [Contributor License Agreement](CLA.md) before any contribution can be merged. This is a one-time requirement. The CLA grants Takeeda LLC a non-exclusive license to use your contributions and ensures the project can be maintained and relicensed if needed.

---

## Development Environment Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm (the project uses pnpm 10.29.3 -- install with `corepack enable && corepack prepare pnpm@10.29.3 --activate`)
- A Chromium-based browser or Firefox for testing

### Getting Started

```bash
# Clone the repository
git clone https://github.com/takeeda/MarketplaceSucks.git
cd MarketplaceSucks

# Install dependencies
pnpm install

# Start development mode (watch + rebuild)
pnpm dev

# Load the extension in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist/ directory
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Watch mode with hot rebuild (Chrome) |
| `pnpm dev:firefox` | Watch mode for Firefox |
| `pnpm build` | Production build for Chrome |
| `pnpm build:firefox` | Production build for Firefox |
| `pnpm build:edge` | Production build for Edge |
| `pnpm build:all` | Build for all browsers |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Run Prettier |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm clean` | Delete the dist/ directory |

---

## Cross-Browser Testing

Before submitting a PR that touches platform-specific code, content scripts, or the manifest, test on at least Chrome and Firefox.

### Chrome / Chromium

1. `pnpm build:chrome`
2. Open `chrome://extensions`, enable Developer mode
3. Load unpacked from `dist/`
4. Navigate to Facebook Marketplace and verify functionality

### Firefox

1. `pnpm build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" and select `dist/manifest.json`
4. Navigate to Facebook Marketplace and verify functionality

### Edge

1. `pnpm build:edge`
2. Open `edge://extensions`, enable Developer mode
3. Load unpacked from `dist/`
4. Verify functionality

Each browser has its own manifest file in `public/` (`manifest.chrome.json`, `manifest.firefox.json`, `manifest.edge.json`). The build system selects the correct manifest based on the `BROWSER` environment variable.

---

## Code Style

### TypeScript

- **Strict mode is mandatory.** The `tsconfig.json` has `strict: true`. Do not loosen type checking.
- Use `readonly` for all properties on interfaces and data models.
- Prefer `const` over `let`. Never use `var`.
- Use explicit return types on exported functions.
- Use type guards (`value is T`) rather than type assertions (`value as T`) when validating data from external sources.

### ESLint

The project uses `@typescript-eslint/eslint-plugin` with React and React Hooks plugins. Run `pnpm lint` before committing. All warnings must be resolved -- the CI treats warnings as errors.

### Prettier

Code formatting is handled by Prettier. Run `pnpm format` to auto-format all source files. The CI checks formatting.

### Path Aliases

Always use path aliases instead of relative paths. The following aliases are configured:

| Alias | Resolves to |
|-------|------------|
| `@/*` | `src/*` |
| `@/core/*` | `src/core/*` |
| `@/platform/*` | `src/platform/*` |
| `@/content/*` | `src/content/*` |
| `@/data/*` | `src/data/*` |
| `@/design-system/*` | `src/design-system/*` |
| `@/ui/*` | `src/ui/*` |
| `@/plugins/*` | `src/plugins/*` |
| `@/workers/*` | `src/workers/*` |

Example: use `import { Listing } from "@/core/models/listing"` instead of `import { Listing } from "../../core/models/listing"`.

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (TypeScript) | kebab-case | `price-filter.ts` |
| Files (React component) | PascalCase | `TrustBadge.tsx` |
| Interfaces | `I` prefix + PascalCase | `IFilter`, `IAnalyzer` |
| Type aliases | PascalCase | `FilterCategory`, `SortDirection` |
| Classes | PascalCase | `FilterRegistry`, `ListingObserver` |
| Functions | camelCase | `createListing`, `scoreAccountAge` |
| Constants | UPPER_SNAKE_CASE | `MAX_COMPARISON_ITEMS`, `DB_NAME` |
| Filter IDs | kebab-case string | `"keyword-blocklist"`, `"price-range"` |
| Analyzer IDs | kebab-case string | `"price-fairness"`, `"seller-trust"` |
| Sorter IDs | kebab-case string | `"price"`, `"date-posted"` |
| Event names | colon-separated, lowercase | `"listings:parsed"`, `"seller:scored"` |
| CSS tokens | kebab-case | `--color-primary`, `--spacing-md` |
| Design system tokens | camelCase exports | `colors.primary`, `spacing.md` |

---

## Architecture Overview

The codebase follows a strict layered architecture. Dependencies flow downward only -- upper layers may import from lower layers, but never the reverse.

```
┌─────────────────────────────────────────────┐
│  ui/            React components            │  Sidebar, overlays, popup, preview
├─────────────────────────────────────────────┤
│  content/       DOM interaction             │  Observer, parser, injector, manipulator
├─────────────────────────────────────────────┤
│  core/          Business logic              │  Filters, sorters, analyzers, models
├─────────────────────────────────────────────┤
│  data/          Persistence                 │  IndexedDB, repositories, migrations
├─────────────────────────────────────────────┤
│  platform/      Browser abstraction         │  Chrome/Firefox/Edge API wrappers
└─────────────────────────────────────────────┘

Side modules:
  design-system/  UI primitives, composites, tokens, theming
  workers/        Web Workers for heavy computation
  plugins/        Plugin system for extensibility
  background/     Service worker (extension lifecycle)
```

Key rules:

- `core/` has zero browser dependencies. It operates on pure data passed in by the content layer.
- `platform/` is the only module that directly calls browser extension APIs (`chrome.*`, `browser.*`).
- `content/` bridges the DOM and the core business logic.
- `ui/` components consume data through the event bus and render using design system primitives.

For the full architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Design System Rules

The design system in `src/design-system/` provides all visual building blocks. Follow these rules:

1. **Use primitives.** Never create raw `<button>`, `<input>`, `<div>` wrappers with custom styles. Use `Button`, `Input`, `Card`, `Badge`, `Modal`, `Select`, `Slider`, `Toggle`, `Checkbox`, `Tabs`, `Tooltip`, `Spinner`, `ProgressBar`, and `EmptyState` from `@/design-system/primitives/`.

2. **Use composites for domain-specific components.** `TrustBadge`, `PriceRatingBadge`, `ImageFlagBadge`, `HeatIndicator`, `ForecastIndicator`, `ConfidenceBar`, and `FilterGroup` are in `@/design-system/composites/`.

3. **Use tokens, not hardcoded values.** Import spacing, colors, typography, borders, shadows, animations, breakpoints, and z-index values from `@/design-system/tokens/`. Never hardcode pixel values, hex colors, or font sizes.

4. **Respect theming.** The extension adapts to Facebook's dark/light mode. Use CSS variables from `@/design-system/theme/css-variables.ts` and the `ThemeProvider` from `@/design-system/theme/theme-provider.tsx`. The `theme-detector.ts` module handles automatic detection.

5. **Tailwind is available** but should be used through the design system's token layer, not with arbitrary values.

---

## How to Add a New Filter

Filters are the most common type of contribution. Here is the complete process.

### Step 1: Create the Filter File

Create a new file in `src/core/filters/` following the kebab-case naming convention.

```typescript
// src/core/filters/shipping-filter.ts

import type { IFilter, FilterCategory, FilterResult } from "@/core/interfaces/filter.interface";
import type { Listing } from "@/core/models/listing";

interface ShippingFilterConfig {
  requireShipping: boolean;
}

export class ShippingFilter implements IFilter<ShippingFilterConfig> {
  readonly id = "shipping-available";
  readonly displayName = "Shipping Available";
  readonly category: FilterCategory = "condition";
  readonly defaultEnabled = false;

  apply(listing: Listing, config: ShippingFilterConfig): FilterResult {
    if (!config.requireShipping) {
      return { keep: true };
    }
    return {
      keep: listing.shippingAvailable,
      reason: listing.shippingAvailable ? undefined : "Shipping not available",
    };
  }

  getDefaultConfig(): ShippingFilterConfig {
    return { requireShipping: false };
  }

  validateConfig(config: unknown): config is ShippingFilterConfig {
    if (typeof config !== "object" || config === null) return false;
    const c = config as Record<string, unknown>;
    return typeof c.requireShipping === "boolean";
  }
}
```

### Step 2: Register the Filter

Add the filter to the registry in the appropriate initialization file. Import your filter class and call `filterRegistry.register()`:

```typescript
import { filterRegistry } from "@/core/filters/filter-registry";
import { ShippingFilter } from "@/core/filters/shipping-filter";

filterRegistry.register(new ShippingFilter());
```

### Step 3: Add a UI Control (Optional)

If your filter needs custom UI beyond what the auto-generated filter panel provides, add a component in `src/design-system/composites/` or the relevant sidebar section.

### Step 4: Write Tests

Create a test file in the same directory or a `__tests__` subdirectory:

```typescript
// src/core/filters/__tests__/shipping-filter.test.ts

import { describe, it, expect } from "vitest";
import { ShippingFilter } from "../shipping-filter";
import { createListing } from "@/core/models/listing";

describe("ShippingFilter", () => {
  const filter = new ShippingFilter();

  it("keeps all listings when requireShipping is false", () => {
    const listing = createListing({ id: "1", title: "Test", listingUrl: "/1" });
    const result = filter.apply(listing, { requireShipping: false });
    expect(result.keep).toBe(true);
  });

  it("removes listings without shipping when requireShipping is true", () => {
    const listing = createListing({ id: "1", title: "Test", listingUrl: "/1", shippingAvailable: false });
    const result = filter.apply(listing, { requireShipping: true });
    expect(result.keep).toBe(false);
    expect(result.reason).toBeDefined();
  });
});
```

---

## How to Add a New Analysis Engine

### Step 1: Create the Analyzer

Create a new file in `src/core/analysis/`. Your analyzer must implement the `IAnalyzer` interface:

```typescript
// src/core/analysis/my-analyzer.ts

import type { IAnalyzer, AnalysisResult, AnalyzerConfidence } from "@/core/interfaces/analyzer.interface";
import type { Listing } from "@/core/models/listing";

interface MyAnalysisOutput {
  score: number;
  reasoning: string[];
}

export class MyAnalyzer implements IAnalyzer<Listing, MyAnalysisOutput> {
  readonly id = "my-analysis";
  readonly displayName = "My Analysis";
  readonly isHeavy = false; // Set true to run in a Web Worker

  async analyze(input: Listing): Promise<AnalysisResult<MyAnalysisOutput>> {
    // Your analysis logic here
    return {
      data: { score: 75, reasoning: ["Based on X", "Adjusted for Y"] },
      confidence: "medium",
      analyzerId: this.id,
      timestamp: Date.now(),
    };
  }

  async analyzeBatch(inputs: readonly Listing[]): Promise<ReadonlyArray<AnalysisResult<MyAnalysisOutput>>> {
    return Promise.all(inputs.map((input) => this.analyze(input)));
  }

  hasMinimumData(input: Listing): boolean {
    return input.price !== null;
  }

  getConfidence(input: Listing): AnalyzerConfidence {
    if (input.price === null) return "insufficient";
    return "medium";
  }
}
```

### Step 2: Emit Events

Use the event bus to notify the UI when analysis completes:

```typescript
import { eventBus, MPS_EVENTS } from "@/core/utils/event-bus";

eventBus.emit(MPS_EVENTS.ANALYSIS_COMPLETE, { analyzerId: this.id, results });
```

### Step 3: Create a Composite Component

If the analysis has a visual representation, create a composite component in `src/design-system/composites/` (e.g., `MyAnalysisBadge.tsx`). Use existing primitives like `Badge`, `Tooltip`, and `ProgressBar`.

### Step 4: If Heavy, Add a Worker

If `isHeavy` is `true`, add the computation logic to `src/workers/data-processing.worker.ts` or create a dedicated worker file. Workers receive messages with listing data and post back analysis results.

---

## How to Add a New Sidebar Tab

The sidebar UI lives in `src/ui/sidebar/`. To add a new tab:

1. Create a new panel component in `src/ui/sidebar/` (e.g., `MyPanel.tsx`).
2. Use design system primitives and composites for all UI elements.
3. Subscribe to relevant events from the event bus to receive data updates.
4. Register the tab in the sidebar's tab configuration so it appears in the `Tabs` component.
5. Follow the existing panel patterns for layout, spacing, and responsiveness.

---

## Cross-Browser Rules

1. **Never call `chrome.*` or `browser.*` APIs directly.** Always use the abstractions in `src/platform/`:
   - `@/platform/browser` -- browser detection and capability checks
   - `@/platform/storage` -- extension storage (sync/local)
   - `@/platform/messaging` -- message passing between content script, background, and popup
   - `@/platform/permissions` -- optional permissions
   - `@/platform/tabs` -- tab management

2. **Test manifest changes against all browser manifests.** Chrome, Firefox, and Edge each have separate manifests in `public/`. If you add a new permission or content script, update all three.

3. **Use `webextension-polyfill`** when the platform abstraction does not cover your use case. It is already a project dependency.

---

## Pull Request Requirements

1. **CI must pass.** This includes `pnpm lint`, `pnpm typecheck`, and `pnpm test`. PRs with failing CI will not be reviewed.

2. **Use conventional commits.** Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat: add shipping filter`
   - `fix: correct price rating percentile calculation`
   - `refactor: extract trust score factors into separate functions`
   - `docs: update contributing guide with new filter instructions`
   - `test: add unit tests for sales forecaster`
   - `chore: update dependencies`

3. **Keep PRs focused.** One feature or fix per PR. Large PRs are harder to review and more likely to be asked for a split.

4. **Include tests** for new filters, analyzers, and utility functions. UI components do not require tests but should be manually verified.

5. **Update documentation** if your change affects public-facing behavior, adds a new feature category, or changes the architecture.

6. **Sign the CLA.** Your first PR will be checked for CLA signature. See [CLA.md](CLA.md).

---

## Code of Conduct

This project maintains a professional, respectful environment.

- Be constructive in code reviews. Critique code, not people.
- Assume good intent. If a contribution needs work, explain what and why.
- No harassment, discrimination, or personal attacks. This includes comments, commit messages, and issue discussions.
- Respect maintainer decisions on scope, design, and priorities. Discussion is welcome; hostility is not.
- If you see behavior that violates these standards, contact the maintainers at conduct@takeeda.com.

Violations may result in comments being removed, PRs being closed, or contributors being blocked from the project.
