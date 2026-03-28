/**
 * Facebook dark-mode detector for the MarketplaceSucks design system.
 *
 * Inspects the Facebook DOM for signals that dark mode is active and exposes
 * an observer so the extension can react to runtime theme switches.
 */

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Checks whether a CSS color string looks "dark" by inspecting its lightness.
 *
 * Supports `rgb(...)`, `rgba(...)`, and hex (`#RRGGBB` / `#RGB`) formats.
 * Returns `true` when the perceived luminance is below the threshold.
 */
function isColorDark(color: string): boolean {
  let r = 0;
  let g = 0;
  let b = 0;

  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    r = parseInt(rgbMatch[1], 10);
    g = parseInt(rgbMatch[2], 10);
    b = parseInt(rgbMatch[3], 10);
  } else if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else {
    return false;
  }

  // Relative luminance (simplified sRGB)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 80;
}

/**
 * Detects whether Facebook is currently rendering in dark mode.
 *
 * The detection strategy (in priority order):
 * 1. Check `<html>` or `<body>` for a `data-theme` or `data-color-scheme` attribute.
 * 2. Check for Facebook's `__fb-dark-mode` class.
 * 3. Check the computed `background-color` of `<body>`.
 *
 * @returns `'dark'` if dark mode is detected, otherwise `'light'`.
 */
export function detectFacebookTheme(): 'light' | 'dark' {
  const html = document.documentElement;
  const body = document.body;

  // 1. Data-attribute checks
  const dataTheme =
    html.getAttribute('data-theme') ??
    html.getAttribute('data-color-scheme') ??
    body?.getAttribute('data-theme') ??
    body?.getAttribute('data-color-scheme');

  if (dataTheme === 'dark' || dataTheme === 'dark-mode') {
    return 'dark';
  }
  if (dataTheme === 'light' || dataTheme === 'light-mode') {
    return 'light';
  }

  // 2. Facebook-specific class
  if (html.classList.contains('__fb-dark-mode') || body?.classList.contains('__fb-dark-mode')) {
    return 'dark';
  }
  if (html.classList.contains('__fb-light-mode') || body?.classList.contains('__fb-light-mode')) {
    return 'light';
  }

  // 3. Computed background color
  if (body) {
    const bgColor = getComputedStyle(body).backgroundColor;
    if (bgColor && isColorDark(bgColor)) {
      return 'dark';
    }
  }

  return 'light';
}

// ---------------------------------------------------------------------------
// Observer
// ---------------------------------------------------------------------------

/**
 * Watches for Facebook theme changes and invokes the callback when a switch
 * is detected.
 *
 * Uses a `MutationObserver` on `<html>` and `<body>` attributes, and falls
 * back to periodic polling (every 2 seconds) for background-color changes
 * that don't trigger attribute mutations.
 *
 * @param callback - Invoked with the new theme whenever a change is detected.
 * @returns A cleanup function that disconnects the observer and clears the
 *          polling interval.
 *
 * @example
 * ```ts
 * const stop = observeThemeChanges((theme) => {
 *   console.log('Theme changed to', theme);
 * });
 *
 * // Later, when the extension unmounts:
 * stop();
 * ```
 */
export function observeThemeChanges(
  callback: (theme: 'light' | 'dark') => void,
): () => void {
  let currentTheme = detectFacebookTheme();

  const notify = (): void => {
    const newTheme = detectFacebookTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      callback(newTheme);
    }
  };

  // Observe attribute mutations on <html> and <body>.
  const observer = new MutationObserver(notify);
  const observerConfig: MutationObserverInit = {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style'],
  };

  observer.observe(document.documentElement, observerConfig);
  if (document.body) {
    observer.observe(document.body, observerConfig);
  }

  // Fallback polling for background-color changes that don't surface as
  // attribute mutations.
  const pollInterval = setInterval(notify, 2000);

  return () => {
    observer.disconnect();
    clearInterval(pollInterval);
  };
}
