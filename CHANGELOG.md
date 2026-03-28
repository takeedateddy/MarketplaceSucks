# Changelog

All notable changes to MarketplaceSucks are documented here.

## [Unreleased]

### Added
- **18+ filters**: keyword include/exclude, price range, condition, distance, date posted, seller trust, price rating, image flags, fuzzy matching
- **10 sort options**: price, date, distance, alphabetical, seller trust, price rating, heat, selling speed
- **Seller trust scoring**: 6-factor analysis (account age, rating, volume, profile completeness, response rate, listing behavior) with 0-100 score
- **Price intelligence**: 7-tier rating system (Steal to Overpriced) with transparent reasoning and market comparison
- **AI image detection**: Heuristic engine (5 signals) with TF.js ML model integration infrastructure (70/30 combined scoring)
- **Image fingerprinting**: Perceptual hashing for duplicate detection across listings
- **Heat tracking**: Engagement velocity, search position, and recency-based popularity scoring
- **Sales forecasting**: Time-to-sell prediction with 6 adjustment factors and urgency tiers
- **Comparison engine**: Side-by-side comparison of up to 4 listings with automated recommendations
- **Related listings**: Jaccard similarity-based discovery of similar items
- **Notification system**: Background alarm checks for saved search matches and price drops (>=5% threshold), browser notifications with badge count
- **Selector health monitoring**: Per-category health scoring (healthy/degraded/broken), overall score, user-provided selector overrides
- **Saved searches**: Persist filter/sort presets with configurable notification frequency
- **Design system**: 15 primitives, 9 composites, 3 layouts, theme detection, CSS variables
- **Plugin system**: Extensibility interface for third-party features
- **Cross-browser support**: Chrome (MV3), Firefox (MV3 + gecko ID), Edge manifests
- **Performance toolkit**: LRU cache, timing/benchmarking utilities, debounce, batched processing
- **Comprehensive test suite**: 431+ unit tests across 35 files covering all core modules
- **E2E fixture tests**: Selector validation and parser pipeline tests against HTML snapshots
- **Dark mode tests**: Verification of dark mode detection selectors
- **CI pipeline**: Lint, typecheck, test, build on all PRs
- **Store submission guide**: Chrome Web Store and Firefox Add-ons checklists

## [0.1.0] - 2026-03-28

### Added
- Initial extension build with full feature set
- Project documentation: README, ARCHITECTURE, CONTRIBUTING, CLA, PRIVACY
