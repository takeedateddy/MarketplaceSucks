# Roadmap

Prioritized plan for what's next after the foundation PR.

---

## Phase 1: Testing Foundation (P0)

Before any new features or store submission, the codebase needs test coverage.

### [#2 — Unit & integration test suite for core business logic](https://github.com/takeedateddy/MarketplaceSucks/issues/2)
- **Why first:** 39 pure core modules with zero tests. All filters, sorters, analyzers, models, and utils are pure functions — trivially testable. This is the safety net for everything else.
- **Scope:** 80%+ coverage on `src/core/`, Vitest already configured.
- **Effort:** Medium

### [#3 — End-to-end testing with real Marketplace pages](https://github.com/takeedateddy/MarketplaceSucks/issues/3)
- **Why:** Validates the full pipeline (observe → parse → filter → render) against actual Facebook DOM.
- **Scope:** Playwright/Puppeteer with extension loading, HTML fixture snapshots, cross-browser.
- **Depends on:** #2

---

## Phase 2: Resilience & Features (P1)

With tests in place, add the most impactful user-facing feature and harden DOM compatibility.

### [#4 — Notification/alert system for saved searches and price drops](https://github.com/takeedateddy/MarketplaceSucks/issues/4)
- **Why:** Highest user-value feature gap. Saved searches exist but are passive — alerts make them useful.
- **Scope:** Background alarms, browser notifications, price change detection, notification history UI.

### [#5 — Selector tuning system for Facebook DOM changes](https://github.com/takeedateddy/MarketplaceSucks/issues/5)
- **Why:** Facebook updates break selectors. Users experience silent failures with no feedback.
- **Scope:** Fallback selector chains, selector health checks, optional remote config, debugging tools.

---

## Phase 3: Polish & Release (P2)

Optimize, enhance, and ship to stores.

### [#6 — TensorFlow.js model integration for ML-based AI image detection](https://github.com/takeedateddy/MarketplaceSucks/issues/6)
- **Why:** Upgrades image detection from heuristics to ML. Existing heuristic baseline works but has limited accuracy.
- **Scope:** Pre-trained model in Web Worker, combined ML + heuristic scoring.

### [#9 — Performance profiling with 500+ listings](https://github.com/takeedateddy/MarketplaceSucks/issues/9)
- **Why:** Must validate performance at scale before wide release.
- **Scope:** Memory profiling, filter/sort benchmarks, DOM manipulation frame budgets.

### [#7 — Chrome Web Store submission](https://github.com/takeedateddy/MarketplaceSucks/issues/7)
- **Why:** Primary distribution channel.
- **Depends on:** #2, #3, #5, #9

### [#8 — Firefox Add-ons submission](https://github.com/takeedateddy/MarketplaceSucks/issues/8)
- **Why:** Second largest browser, already has Manifest V2 build.
- **Depends on:** #7 (validate submission process on Chrome first)

---

## Recommended Starting Point

**Start with [#2 — Unit tests](https://github.com/takeedateddy/MarketplaceSucks/issues/2).** The entire `src/core/` directory is pure functions with zero browser dependencies. Vitest is already configured. This unblocks everything else and catches bugs in the scoring algorithms that produce user-facing numbers (trust scores, price ratings, sales forecasts).
