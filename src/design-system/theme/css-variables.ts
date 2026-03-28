/**
 * CSS custom-property generation for the MarketplaceSucks design system.
 *
 * Converts design tokens into `--mps-*` prefixed CSS custom properties and
 * provides helpers to inject them into the document at runtime.
 */

import { colors, type ThemedColor } from '../tokens/colors';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { borderRadii, borderWidths } from '../tokens/borders';
import { shadows, type ThemedShadow } from '../tokens/shadows';
import { durations, easings } from '../tokens/animation';
import { zIndex } from '../tokens/z-index';

/** The ID of the injected style element so we can find / replace it. */
const STYLE_ELEMENT_ID = 'mps-design-tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a camelCase token name to a kebab-case CSS variable suffix.
 *
 * @example camelToKebab('primaryHover') // 'primary-hover'
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Emits a single CSS custom property declaration.
 */
function cssVar(name: string, value: string | number): string {
  return `  --mps-${name}: ${value};`;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates a complete CSS string containing all design-token custom properties
 * for the requested theme.
 *
 * @param theme - `'light'` or `'dark'`
 * @returns A CSS string wrapped in a `:root` selector.
 *
 * @example
 * ```ts
 * const css = generateCSSVariables('dark');
 * // ":root { --mps-primary: #4599FF; ... }"
 * ```
 */
export function generateCSSVariables(theme: 'light' | 'dark'): string {
  const lines: string[] = [];

  // --- Colors ---
  for (const [key, value] of Object.entries(colors)) {
    const color = value as ThemedColor;
    lines.push(cssVar(`color-${camelToKebab(key)}`, color[theme]));
  }

  // --- Shadows ---
  for (const [key, value] of Object.entries(shadows)) {
    const shadow = value as ThemedShadow;
    lines.push(cssVar(`shadow-${camelToKebab(key)}`, shadow[theme]));
  }

  // --- Typography ---
  for (const [key, value] of Object.entries(fontFamilies)) {
    lines.push(cssVar(`font-family-${camelToKebab(key)}`, value));
  }
  for (const [key, value] of Object.entries(fontSizes)) {
    lines.push(cssVar(`font-size-${camelToKebab(key)}`, value));
  }
  for (const [key, value] of Object.entries(fontWeights)) {
    lines.push(cssVar(`font-weight-${camelToKebab(key)}`, String(value)));
  }
  for (const [key, value] of Object.entries(lineHeights)) {
    lines.push(cssVar(`line-height-${camelToKebab(key)}`, String(value)));
  }

  // --- Spacing ---
  for (const [key, value] of Object.entries(spacing)) {
    lines.push(cssVar(`spacing-${camelToKebab(key)}`, value));
  }

  // --- Borders ---
  for (const [key, value] of Object.entries(borderRadii)) {
    lines.push(cssVar(`radius-${camelToKebab(key)}`, value));
  }
  for (const [key, value] of Object.entries(borderWidths)) {
    lines.push(cssVar(`border-width-${camelToKebab(key)}`, value));
  }

  // --- Animation ---
  for (const [key, value] of Object.entries(durations)) {
    lines.push(cssVar(`duration-${camelToKebab(key)}`, value));
  }
  for (const [key, value] of Object.entries(easings)) {
    lines.push(cssVar(`easing-${camelToKebab(key)}`, value));
  }

  // --- Z-Index ---
  for (const [key, value] of Object.entries(zIndex)) {
    lines.push(cssVar(`z-${camelToKebab(key)}`, String(value)));
  }

  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * Injects (or updates) a `<style>` element in the document `<head>` containing
 * all design-token CSS custom properties for the given theme.
 *
 * Safe to call multiple times – it will replace the existing element rather
 * than creating duplicates.
 *
 * @param theme - `'light'` or `'dark'`
 */
export function injectCSSVariables(theme: 'light' | 'dark'): void {
  const css = generateCSSVariables(theme);

  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.setAttribute('data-mps', 'design-tokens');
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = css;
}
