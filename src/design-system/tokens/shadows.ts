/**
 * Shadow / elevation tokens for the MarketplaceSucks design system.
 *
 * Each level provides light and dark variants because dark themes need
 * subtler or differently-tinted shadows.
 */

/** A themed shadow value with light and dark variants. */
export interface ThemedShadow {
  readonly light: string;
  readonly dark: string;
}

/** No shadow. */
export const shadowNone: ThemedShadow = {
  light: 'none',
  dark: 'none',
} as const;

/** Small elevation – subtle lift (cards at rest). */
export const shadowSm: ThemedShadow = {
  light: '0 1px 2px rgba(0, 0, 0, 0.1)',
  dark: '0 1px 2px rgba(0, 0, 0, 0.3)',
} as const;

/** Medium elevation – interactive elements on hover. */
export const shadowMd: ThemedShadow = {
  light: '0 2px 8px rgba(0, 0, 0, 0.12)',
  dark: '0 2px 8px rgba(0, 0, 0, 0.4)',
} as const;

/** Large elevation – dropdowns, popovers. */
export const shadowLg: ThemedShadow = {
  light: '0 4px 16px rgba(0, 0, 0, 0.15)',
  dark: '0 4px 16px rgba(0, 0, 0, 0.5)',
} as const;

/** Extra-large elevation – modals, dialogs. */
export const shadowXl: ThemedShadow = {
  light: '0 8px 32px rgba(0, 0, 0, 0.2)',
  dark: '0 8px 32px rgba(0, 0, 0, 0.6)',
} as const;

/** Complete shadow / elevation token map. */
export const shadows = {
  none: shadowNone,
  sm: shadowSm,
  md: shadowMd,
  lg: shadowLg,
  xl: shadowXl,
} as const;

export type ShadowToken = keyof typeof shadows;
