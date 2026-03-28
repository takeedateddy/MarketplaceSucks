# Store Submission Guide

Step-by-step instructions for publishing MarketplaceSucks to browser extension stores.

---

## Chrome Web Store (#7)

### Prerequisites

- [x] Unit test suite passing (431+ tests)
- [x] E2E tests validating against fixture pages
- [x] Selector health monitoring system in place
- [ ] Manual QA pass on Chrome stable

### Account Setup

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time $5 registration fee
3. Verify your developer account

### Build

```bash
pnpm clean
pnpm build:chrome
```

The production bundle is output to `dist/`. Verify it contains:
- `manifest.json` (Manifest V3)
- `background.js` (service worker)
- `content.js` (content script)
- `popup.html` + `popup.js`
- `assets/` (icons, CSS)

### Store Listing

| Asset | Requirements |
|-------|-------------|
| Extension name | MarketplaceSucks |
| Short description (132 chars max) | Fix Facebook Marketplace search with 18+ filters, trust scoring, price intelligence, and AI image detection. 100% local. |
| Detailed description | See below |
| Extension icon | 128x128 PNG (already at `src/assets/icons/icon-128.png`) |
| Screenshots | 1280x800 minimum, 5 recommended |
| Promotional images | 1280x800 (large), 640x400 (small), 440x280 (marquee) |
| Category | Shopping |
| Language | English |

**Detailed description:**

```
MarketplaceSucks overhauls Facebook Marketplace with features Facebook refuses to build:

SEARCH & FILTERING
- 18+ filter types: keywords, price range, condition, distance, date posted, seller trust, price rating, image authenticity
- Fuzzy keyword matching with configurable tolerance
- Exclude keywords to block unwanted results
- Real min/max price that actually works

SELLER TRUST SCORING
- 6-factor trust analysis: account age, ratings, response rate, profile completeness, listing behavior
- 0-100 trust score with transparent breakdown
- Filter out low-trust sellers automatically

PRICE INTELLIGENCE
- 7-tier price rating: Steal to Overpriced
- Compare against market data from similar listings
- Price drop alerts for watched items

AI IMAGE DETECTION
- Heuristic + ML-based detection of AI-generated listing photos
- Perceptual hashing for duplicate image detection
- Originality scoring

ADDITIONAL FEATURES
- Sales velocity forecasting
- Heat/popularity tracking
- Side-by-side listing comparison (up to 4)
- Related listing discovery
- Saved searches with notification alerts
- Full listing history

PRIVACY
- 100% local processing — zero data leaves your browser
- No analytics, no tracking, no external API calls
- All data stored in your browser's IndexedDB
```

### Permissions Justification

Chrome requires explaining each permission:

| Permission | Justification |
|-----------|---------------|
| `storage` | Persists user settings, filter presets, saved searches, and notification preferences locally in the browser. No data is sent externally. |
| `activeTab` | Accesses the active Facebook Marketplace tab to inject the sidebar UI and parse listing data from the page DOM. Only activates on facebook.com/marketplace/* URLs. |
| `offscreen` | Creates offscreen documents for image processing (perceptual hashing, AI detection) in a Web Worker without blocking the UI thread. |

### Content Security Policy

The extension uses no remote code execution. All JavaScript is bundled at build time. No `eval()`, no remote script loading, no CDN dependencies.

### Pre-submission Checklist

- [ ] `pnpm build:chrome` succeeds
- [ ] Load unpacked in `chrome://extensions` — no errors
- [ ] Navigate to facebook.com/marketplace — sidebar toggle appears
- [ ] Open sidebar — all panels render
- [ ] Apply a keyword filter — listings filter correctly
- [ ] Apply a price filter — price range works
- [ ] Check seller trust panel — scores display
- [ ] Check image analysis panel — empty state shows correctly
- [ ] Extension popup opens and shows stats
- [ ] No console errors in background service worker
- [ ] No console errors in content script
- [ ] Extension icon displays correctly at all sizes
- [ ] Test in Chrome Incognito mode (enable in extensions settings first)

### Submit

1. Create a ZIP of the `dist/` directory
2. Upload to Chrome Web Store Developer Dashboard
3. Fill in listing details from above
4. Submit for review (typically 1-3 business days)

---

## Firefox Add-ons (#8)

### Prerequisites

- [ ] Chrome Web Store submission validated (process-test first)
- [ ] Manual QA pass on Firefox stable

### Build

```bash
pnpm clean
pnpm build:firefox
```

### Firefox-Specific Notes

- Firefox manifest uses `browser_specific_settings.gecko.id`
- Extension ID: `marketplacesucks@takeedateddy.com`
- Minimum Firefox version: 109.0
- Firefox uses `browser.*` API namespace (handled by webextension-polyfill)
- No `offscreen` permission needed (Firefox doesn't support it)

### Account Setup

1. Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
2. Create a free developer account
3. No registration fee

### Store Listing

Same description and assets as Chrome, adapted for Firefox screenshots.

### Pre-submission Checklist

- [ ] `pnpm build:firefox` succeeds
- [ ] Load as temporary add-on in `about:debugging` — no errors
- [ ] Navigate to facebook.com/marketplace — sidebar toggle appears
- [ ] All panels render correctly
- [ ] Filters work as expected
- [ ] No console errors

### Submit

1. Create a ZIP of the `dist/` directory
2. Upload to Firefox Add-ons
3. **Submit source code** (Mozilla requires source for review)
   - Provide the full repo or a source ZIP
   - Include build instructions: `pnpm install && pnpm build:firefox`
4. Fill in listing details
5. Submit for review

---

## Post-Submission

After both stores approve:

1. Update `package.json` version to `1.0.0`
2. Update manifest versions to `1.0.0`
3. Tag the release: `git tag v1.0.0`
4. Create a GitHub release with changelog
5. Update README with store badges/links
