# MarketplaceSucks Pro — Build Instructions for Claude Code

This document contains complete instructions for a Claude Code agent to set up the MarketplaceSucks Pro private repository, configure the git subtree from the free public repo, implement license key validation, add all pro features, and prepare for Chrome Web Store submission.

---

## Context

- **Free repo (public):** `takeedateddy/MarketplaceSucks` — MIT licensed, contains all heuristic-based features, 540+ tests
- **Pro repo (private):** `takeedateddy/MarketplaceSucks-Pro` — to be created, contains free features via git subtree + pro-only features gated by license key
- **Goal:** One Chrome Web Store listing that works as free out of the box, with pro features unlocked via a purchased license key entered in Settings

---

## Phase 1: Repository Setup

### Step 1: Initialize the Pro repo

```bash
# Create the new repo directory
mkdir MarketplaceSucks-Pro
cd MarketplaceSucks-Pro
git init
git remote add origin git@github.com:takeedateddy/MarketplaceSucks-Pro.git
```

### Step 2: Pull the free repo as a subtree

The subtree approach copies the entire free repo into the pro repo's root. Future updates from free are pulled with one command.

```bash
# Add the free repo as a remote
git remote add free https://github.com/takeedateddy/MarketplaceSucks.git

# Fetch the free repo
git fetch free

# Pull the entire free repo into the root of the pro repo
git subtree add --prefix=. free main --squash -m "Import free version from takeedateddy/MarketplaceSucks"
```

### Step 3: Verify the import

```bash
# Should see all the free repo files
ls src/core/ src/ui/ src/content/ tests/

# Install and run tests to confirm everything works
pnpm install
pnpm test
pnpm lint
pnpm typecheck
```

### Step 4: Future syncing from free repo

Whenever the free repo gets updates, sync them into pro:

```bash
git fetch free
git subtree pull --prefix=. free main --squash -m "Sync latest from free repo"
```

This should be documented in the pro repo's CONTRIBUTING.md or a SYNC.md file.

---

## Phase 2: License Key System

### Step 1: Create the license key module

Create `src/core/license/license-manager.ts`:

**Requirements:**
- License keys are HMAC-SHA256 signed strings
- Format: `MPS-PRO-{userId}-{signature}` where signature = HMAC(userId, secret)
- Validation is LOCAL ONLY — no server calls, no network requests
- The HMAC secret is embedded in the built extension (obfuscated but not truly secure — acceptable for a $12 product)
- Store the key in `chrome.storage.local` under `mps-license-key`
- Export functions:
  - `validateLicenseKey(key: string): boolean`
  - `isProUnlocked(): Promise<boolean>`
  - `saveLicenseKey(key: string): Promise<void>`
  - `clearLicenseKey(): Promise<void>`

**Key generation script** (separate from extension, for your use only):

Create `scripts/generate-key.ts`:
```
Input: userId (email or unique string)
Secret: Read from environment variable MPS_PRO_SECRET
Output: MPS-PRO-{userId}-{hmacHex}
```

### Step 2: Create the license key UI

Create `src/ui/sidebar/ProUpgrade.tsx`:

**When pro is NOT unlocked:**
- Show upgrade prompt with feature list
- "Enter License Key" input field
- "Buy Pro ($12)" button linking to payment page (Gumroad/LemonSqueezy URL)
- Validate key on submit, show success/error

**When pro IS unlocked:**
- Show "Pro Active" badge with green checkmark
- Show which pro features are enabled
- "Manage License" with option to deactivate

### Step 3: Gate pro features

Create `src/core/license/feature-gates.ts`:

```typescript
export const PRO_FEATURES = {
  mlImageDetection: 'ml-image-detection',
  priceHistoryCharts: 'price-history-charts',
  redFlagDetection: 'red-flag-detection',
  autoWatchDeals: 'auto-watch-deals',
  advancedComparison: 'advanced-comparison',
  customTrustWeights: 'custom-trust-weights',
  bulkExport: 'bulk-export',
} as const;

export async function isFeatureEnabled(feature: string): Promise<boolean> {
  // All free features always enabled
  if (!Object.values(PRO_FEATURES).includes(feature)) return true;
  // Pro features require valid license
  return isProUnlocked();
}
```

### Step 4: Add pro gate checks to existing UI

In every pro feature's UI panel, wrap the content:

```typescript
const proUnlocked = useProLicense(); // custom hook that calls isProUnlocked()

if (!proUnlocked) {
  return <ProUpgrade feature="ML Image Detection" />;
}

// ... render pro feature
```

---

## Phase 3: Pro Features Implementation

Build each pro feature in its own directory under `src/pro/`. This keeps pro code cleanly separated from free code.

### Feature 1: ML Image Detection (real TF.js model)

**Location:** `src/pro/ml-detection/`

The free version already has the infrastructure:
- `src/core/analysis/ml-image-detector.ts` — combined scoring (70% ML + 30% heuristic)
- `src/workers/image-analysis.worker.ts` — has `ml-load-model` and `ml-analyze` message types
- `src/ui/sidebar/ImageAnalysisPanel.tsx` — shows ML badge when model used

**What pro adds:**
- `src/pro/ml-detection/model-loader.ts` — lazy-loads TF.js and the model from bundled assets
- `src/pro/ml-detection/model/` — directory containing the actual model weights (model.json + weight shards)
- Update `image-analysis.worker.ts` to actually import `@tensorflow/tfjs` and call `tf.loadLayersModel()`
- The placeholder `computePixelVariance` gets replaced with real tensor inference

**Dependencies to add:**
```bash
pnpm add @tensorflow/tfjs
```

**Model selection:**
- Use a MobileNet-based binary classifier (real vs AI-generated)
- Target model size: < 5MB (Chrome Web Store has a ~10MB extension limit, but smaller = faster load)
- Fine-tune on a dataset of real marketplace photos vs AI-generated product images
- If no suitable pre-trained model exists, use the existing pixel variance approach as a better-than-heuristic statistical model until a real one is trained

### Feature 2: Price History Charts

**Location:** `src/pro/price-charts/`

**Files to create:**
- `src/pro/price-charts/price-chart.ts` — pure function that takes price history data points and returns chart-ready data (timestamps, prices, trend line)
- `src/pro/price-charts/PriceChartPanel.tsx` — React component rendering a sparkline/chart using Canvas API (no chart library needed for simple sparklines)
- `src/pro/price-charts/price-chart.test.ts` — tests for data transformation

**Integration:**
- Reads from existing `PriceDataRepository` (already stores price observations over time)
- Add a "Price History" tab in the listing detail overlay
- Show: current price, price trend (up/down/stable), min/max over observed period, sparkline chart

### Feature 3: Red Flag Detection

**Location:** `src/pro/red-flags/`

**Files to create:**
- `src/pro/red-flags/red-flag-detector.ts` — pure function that scans listing title + description for scam indicators
- `src/pro/red-flags/red-flag-patterns.ts` — the pattern library (regex + keyword lists)
- `src/pro/red-flags/RedFlagPanel.tsx` — UI showing flagged phrases with explanations
- `src/pro/red-flags/red-flag-detector.test.ts` — tests

**Pattern categories to detect:**
- Payment red flags: "send deposit", "Zelle only", "cash app only", "wire transfer", "Western Union"
- Urgency pressure: "must sell today", "first come first serve", "won't last", "selling fast"
- Avoidance: "no returns", "as is", "not responsible after sale", "sold as seen"
- Too good to be true: price is "steal" tier AND account < 3 months AND no reviews
- Contact off-platform: "text me at", "call me", "WhatsApp", "email me at"

**Scoring:** Each pattern has a severity (low/medium/high). Show a summary: "3 red flags detected" with expandable details.

### Feature 4: Auto-Watch Best Deals

**Location:** `src/pro/auto-watch/`

**Files to create:**
- `src/pro/auto-watch/auto-watch-engine.ts` — monitors new listings, auto-adds "Steal" and "Great Deal" rated items to watch list
- `src/pro/auto-watch/auto-watch-config.ts` — configurable thresholds (which tiers to auto-watch, max watched items)
- Integration with existing notification engine for price drop alerts on auto-watched items

### Feature 5: Advanced Comparison (5+ items, weighted)

**Location:** `src/pro/advanced-comparison/`

**What pro adds over free comparison:**
- Raise the 4-listing cap to 8
- Let users assign custom weights to each dimension (e.g., "I care about price 3x more than distance")
- Weighted recommendation algorithm
- Export as CSV in addition to markdown/text

### Feature 6: Custom Trust Formula Weights

**Location:** `src/pro/custom-trust/`

**What pro adds:**
- UI sliders in Settings to adjust the 25/25/15/15/10/10 trust factor weights
- Recalculate all trust scores when weights change
- Save custom weights in chrome.storage.local
- Reset to defaults button

### Feature 7: Bulk Export

**Location:** `src/pro/bulk-export/`

**What pro adds:**
- "Export Results" button in the filter panel
- Exports all currently filtered/sorted listings as CSV or JSON
- Columns: title, price, condition, distance, seller, trust score, price rating, URL
- Filename: `marketplace-{query}-{date}.csv`

---

## Phase 4: Build Configuration

### Update vite.config.ts

Add a build flag that includes/excludes pro modules:

```typescript
const isPro = process.env.EDITION === 'pro';

// In the build config:
define: {
  'process.env.BROWSER': JSON.stringify(browser),
  '__MPS_PRO__': JSON.stringify(isPro),
},
```

### Update package.json scripts

```json
{
  "scripts": {
    "build:free": "EDITION=free vite build --mode production",
    "build:pro": "EDITION=pro vite build --mode production",
    "build:pro:chrome": "EDITION=pro vite build --mode production",
    "build:pro:firefox": "EDITION=pro BROWSER=firefox vite build --mode production"
  }
}
```

### Update manifests for pro

Copy the manifests and update:
- `name`: "MarketplaceSucks Pro" → "MarketplaceSucks" (same name on store, pro is internal)
- Add `"storage"` permission (already present)
- Keep the same permissions — pro doesn't need any additional ones

---

## Phase 5: Testing

### Test structure

```
src/pro/ml-detection/model-loader.test.ts
src/pro/price-charts/price-chart.test.ts
src/pro/red-flags/red-flag-detector.test.ts
src/pro/auto-watch/auto-watch-engine.test.ts
src/pro/advanced-comparison/advanced-comparison.test.ts
src/pro/custom-trust/custom-trust.test.ts
src/pro/bulk-export/bulk-export.test.ts
src/core/license/license-manager.test.ts
src/core/license/feature-gates.test.ts
```

### What to test

- License key validation: valid key accepted, invalid key rejected, expired key handling, storage persistence
- Feature gates: pro features gated when no key, unlocked with valid key, free features always available
- Each pro feature: same testing standards as free (pure functions, edge cases, boundary values)
- Build: `pnpm build:pro` succeeds, `pnpm build:free` succeeds, pro build includes TF.js, free build does not

---

## Phase 6: Chrome Web Store Preparation

### Store listing

- **Name:** MarketplaceSucks
- **Description:** Use the detailed description from STORE_SUBMISSION.md, adding a "Pro Features" section
- **Category:** Shopping
- **Price:** Free (the extension itself is free on the store; pro is unlocked via license key inside the extension)

### Payment integration

- Set up a Gumroad or LemonSqueezy product page for "MarketplaceSucks Pro — $12"
- On purchase, the platform generates a unique key (or you generate keys in bulk with `scripts/generate-key.ts`)
- Buyer receives the key via email
- Buyer enters key in extension Settings → pro unlocks

### Privacy policy update

Add to PRIVACY.md:
- License key validation is 100% local (no server calls)
- No purchase data is stored in the extension
- The license key itself is stored in chrome.storage.local

---

## Phase 7: Sync Workflow

### When free repo gets updates

```bash
cd MarketplaceSucks-Pro
git fetch free
git subtree pull --prefix=. free main --squash -m "Sync: [describe what changed in free]"
pnpm install   # in case dependencies changed
pnpm test      # verify nothing broke
pnpm lint
pnpm typecheck
```

### When pro repo needs to contribute back to free

If a bug fix or improvement in pro should go back to the free repo:
1. Make the change in the pro repo
2. Cherry-pick or manually apply the change to the free repo
3. Open a PR on the free repo

### CI for pro repo

Same as free CI plus:
```yaml
- run: pnpm build:pro   # verify pro build works
- run: pnpm build:free  # verify free build still works
```

---

## Summary Checklist

- [ ] Create private repo `takeedateddy/MarketplaceSucks-Pro`
- [ ] Import free repo via git subtree
- [ ] Verify all tests pass
- [ ] Implement license key system (manager + validation + UI)
- [ ] Implement feature gates
- [ ] Build Feature 1: ML Image Detection (TF.js model in worker)
- [ ] Build Feature 2: Price History Charts (sparkline from IndexedDB data)
- [ ] Build Feature 3: Red Flag Detection (pattern matching on titles/descriptions)
- [ ] Build Feature 4: Auto-Watch Best Deals
- [ ] Build Feature 5: Advanced Comparison (8 items, weighted dimensions)
- [ ] Build Feature 6: Custom Trust Weights (UI sliders)
- [ ] Build Feature 7: Bulk Export (CSV/JSON)
- [ ] Update build config for pro/free editions
- [ ] Write tests for all pro features + license system
- [ ] Update STORE_SUBMISSION.md with pro feature descriptions
- [ ] Set up payment page (Gumroad/LemonSqueezy)
- [ ] Create key generation script
- [ ] Build and submit to Chrome Web Store
- [ ] Document subtree sync workflow
