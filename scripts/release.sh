#!/usr/bin/env bash
set -euo pipefail

# Release script for MarketplaceSucks
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 1.0.0

if [ $# -eq 0 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

VERSION="$1"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version must be semver format (e.g., 1.0.0)"
  exit 1
fi

echo "Releasing MarketplaceSucks v${VERSION}..."

# 1. Update package.json version
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json

# 2. Update all manifest versions
for manifest in public/manifest.chrome.json public/manifest.firefox.json public/manifest.edge.json; do
  if [ -f "$manifest" ]; then
    sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" "$manifest"
    echo "  Updated ${manifest}"
  fi
done

# 3. Run checks
echo "Running checks..."
pnpm lint
pnpm typecheck
pnpm test

# 4. Build all targets
echo "Building..."
pnpm build:all

# 5. Commit and tag
git add package.json public/manifest.*.json
git commit -m "release: v${VERSION}"
git tag -a "v${VERSION}" -m "Release v${VERSION}"

echo ""
echo "Done! Release v${VERSION} is ready."
echo ""
echo "Next steps:"
echo "  1. git push origin main --tags"
echo "  2. Create GitHub release from tag v${VERSION}"
echo "  3. Upload dist/ ZIP to Chrome Web Store"
echo "  4. Upload dist/ ZIP to Firefox Add-ons"
