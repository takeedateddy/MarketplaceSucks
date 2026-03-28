# Privacy Commitment

**MarketplaceSucks** is committed to protecting user privacy. This document outlines exactly what the extension does and does not do with your data.

## Core Principles

### No Remote Data Collection

MarketplaceSucks **never** sends any data to external servers. All processing happens entirely within your browser. There are no analytics endpoints, no telemetry, no usage tracking, and no data collection of any kind.

### No External API Calls

All analysis features — seller trust scoring, image authenticity detection, price rating, heat tracking, and sales forecasting — run entirely client-side using local algorithms. No data leaves your browser. No external AI APIs, no cloud services, no third-party analytics.

### Minimal Permissions

The extension requests only the permissions strictly necessary for its functionality:

- **`storage`** — To save your settings, filter preferences, and cached analysis data locally in your browser
- **`activeTab`** — To interact with the currently active Facebook Marketplace tab
- **`offscreen`** (Chrome only) — For off-screen image processing

The extension does **not** request:
- `tabs` (broad tab access)
- `webRequest` or `webNavigation` (network monitoring)
- `history` or `bookmarks`
- Any host permissions beyond `facebook.com/marketplace/*`

### No Tracking

- No analytics scripts (Google Analytics, Mixpanel, Amplitude, etc.)
- No pixel tracking or fingerprinting
- No third-party scripts of any kind
- No cookies set by the extension
- No user identification or session tracking

### Local Storage Only

All data is stored locally in your browser using:

- **Chrome Storage API** — For settings and small data (sync-capable)
- **IndexedDB** — For larger datasets like listing history, price data, seller profiles, and image hashes

This data never leaves your device. You can clear all extension data at any time through the Settings panel or by removing the extension.

### Data Retention

- Listing history: 30 days by default (configurable)
- Price comparison data: 90 days by default (configurable)
- Seller trust cache: 7 days
- Image analysis cache: Based on image URL hash, no expiry (cleared on uninstall)

You can adjust retention periods in Settings or clear all data manually.

## What the Extension Can See

The extension can read the contents of Facebook Marketplace pages that you visit. Specifically, it parses:

- Listing titles, prices, locations, conditions, and images visible on the page
- Seller names and profile information visible on seller profiles
- Engagement indicators (saves, comments, views) if displayed by Facebook

This data is used **only** for local analysis and is **never** transmitted anywhere.

## What the Extension Cannot See

- Your Facebook account credentials or login session
- Your private messages
- Your Facebook profile information
- Pages outside of `facebook.com/marketplace/*`
- Any other browser tabs or windows
- Your browsing history outside of Marketplace

## TensorFlow.js Model Transparency

If you enable the optional AI image detection feature, the extension loads a small TensorFlow.js model locally in your browser. This model:

- Runs entirely client-side — images are never sent to any server
- Is open-source and inspectable in the repository under `src/assets/models/`
- Can be disabled at any time in Settings

## Open Source Verification

MarketplaceSucks is fully open source under the MIT license. The entire codebase is available at [github.com/takeedateddy/MarketplaceSucks](https://github.com/takeedateddy/MarketplaceSucks) for inspection. We encourage security-conscious users to review the code themselves.

## Content Security Policy

The extension enforces a strict Content Security Policy that:

- Prohibits `eval()` and `new Function()`
- Prohibits inline scripts
- Restricts resource loading to the extension's own files

## Contact

If you have privacy concerns or questions, please open an issue on our [GitHub repository](https://github.com/takeedateddy/MarketplaceSucks/issues).

---

*Last updated: March 2026*
*Built by Takeeda LLC*
