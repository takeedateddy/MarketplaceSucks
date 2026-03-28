# Privacy Commitment

MarketplaceSucks is designed with a strict privacy-first architecture. This document describes exactly what the extension does and does not do with your data.

---

## No Remote Data Collection

MarketplaceSucks does not collect, transmit, or store any user data on external servers. There is no analytics service, no telemetry endpoint, no crash reporting backend, and no data warehouse. The extension has no server component of any kind.

## No External API Calls

The extension makes zero network requests to any server other than Facebook itself (which your browser is already connected to). There are no calls to third-party APIs for price data, image analysis, seller verification, or any other purpose. Every analysis, score, and recommendation is computed locally using data already present on the page you are viewing.

## No Tracking

There are no tracking pixels, fingerprinting scripts, session recordings, or usage analytics of any kind:

- No analytics scripts (Google Analytics, Mixpanel, Amplitude, or anything else)
- No pixel tracking or browser fingerprinting
- No third-party scripts
- No cookies set by the extension
- No user identification or session tracking
- No unique identifier assigned to your installation

The extension does not track which listings you view, which filters you use, how long you spend on Marketplace, or anything else about your behavior.

## Minimal Permissions

The extension requests only the permissions required to function:

- **`activeTab`** -- required to interact with the currently active Facebook Marketplace tab
- **`storage`** -- required to persist your filter presets, saved searches, and cached analysis data in the browser's extension storage
- **`offscreen`** (Chrome only) -- for off-screen image processing

The extension does **not** request permissions for:

- `tabs` (broad tab access)
- `webRequest` or `webNavigation` (network monitoring)
- `history` or `bookmarks`
- Geolocation, camera, microphone, or any other sensitive browser capability
- Any host permissions beyond `facebook.com/marketplace/*`

## Everything Stored Locally

All persisted data is stored in your browser using two mechanisms:

1. **IndexedDB** -- listing history, seller trust scores, image hashes, price data, engagement snapshots, seen-listing tracking, and saved searches. This data lives in an IndexedDB database named "MarketplaceSucks" within your browser profile. It never leaves your machine.

2. **Extension storage (chrome.storage.local / browser.storage.local)** -- user preferences and filter configurations. This data is stored locally in your browser's extension storage area.

### Data Retention

- Listing history: 30 days by default (configurable)
- Price comparison data: 90 days by default (configurable)
- Seller trust cache: 7 days
- Image analysis cache: based on image URL hash, no expiry (cleared on uninstall)

You can adjust retention periods in Settings or clear all data manually. Uninstalling the extension removes all stored data automatically.

## What the Extension Can See

The extension can read the contents of Facebook Marketplace pages that you visit. Specifically, it parses:

- Listing titles, prices, locations, conditions, and images visible on the page
- Seller names and profile information visible on seller profiles
- Engagement indicators (saves, comments, views) if displayed by Facebook

This data is used only for local analysis and is never transmitted anywhere.

## What the Extension Cannot See

- Your Facebook account credentials or login session
- Your private messages
- Your Facebook profile information
- Pages outside of `facebook.com/marketplace/*`
- Any other browser tabs or windows
- Your browsing history outside of Marketplace

## TF.js Model Transparency

The optional image analysis feature uses TensorFlow.js (TF.js) for ML-based AI image detection. Key facts:

- The TF.js model is bundled with the extension. It is not downloaded from an external server at runtime.
- The model runs entirely in your browser via a Web Worker. Image data is never sent anywhere.
- TF.js is lazy-loaded -- it is only initialized if you use the image analysis feature. If you never trigger image analysis, TF.js is never loaded.
- The model processes image metadata (dimensions, color statistics, EXIF presence) rather than raw pixel data of your browsing activity.
- No model outputs, predictions, or image data are transmitted externally.
- The model is open source and inspectable in the repository.
- The feature can be disabled at any time in Settings.

## Content Security Policy

The extension enforces a strict Content Security Policy that:

- Prohibits `eval()` and `new Function()`
- Prohibits inline scripts
- Restricts resource loading to the extension's own files

## Open Source for Verification

The entire source code of MarketplaceSucks is open source under the MIT License. You can audit every line of code to verify the claims in this document. There are no obfuscated modules, no binary blobs (beyond the bundled TF.js model weights, which are standard open-source artifacts), and no hidden network calls.

The content script, background service worker, and all analysis engines are written in TypeScript and built with Vite. The build process is deterministic and reproducible -- you can clone the repository, run `pnpm build`, and verify that the output matches the distributed extension.

If you have privacy concerns or find any behavior that contradicts this commitment, please open an issue on the [GitHub repository](https://github.com/takeedateddy/MarketplaceSucks/issues).

---

Built by Takeeda LLC
