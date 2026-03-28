/**
 * Color tokens for the MarketplaceSucks design system.
 *
 * Every color is defined as a `{ light, dark }` pair so the theme system
 * can resolve the correct value at runtime.
 */

/** A themed color value with light and dark variants. */
export interface ThemedColor {
  readonly light: string;
  readonly dark: string;
}

// ---------------------------------------------------------------------------
// Core palette
// ---------------------------------------------------------------------------

/** Primary brand / action colors. */
export const primary: ThemedColor = { light: '#0866FF', dark: '#4599FF' } as const;

/** Primary hover state. */
export const primaryHover: ThemedColor = { light: '#0654D4', dark: '#6DB3FF' } as const;

/** Page / root background. */
export const background: ThemedColor = { light: '#F0F2F5', dark: '#18191A' } as const;

/** Card / container surface. */
export const surface: ThemedColor = { light: '#FFFFFF', dark: '#242526' } as const;

/** Elevated surface (popovers, modals). */
export const surfaceElevated: ThemedColor = { light: '#FFFFFF', dark: '#3A3B3C' } as const;

/** Primary text color. */
export const textPrimary: ThemedColor = { light: '#1C1E21', dark: '#E4E6EB' } as const;

/** Secondary / muted text color. */
export const textSecondary: ThemedColor = { light: '#65676B', dark: '#B0B3B8' } as const;

/** Default border color. */
export const border: ThemedColor = { light: '#CED0D4', dark: '#3E4042' } as const;

// ---------------------------------------------------------------------------
// Trust indicator colors
// ---------------------------------------------------------------------------

/** High trust – seller / listing looks reliable. */
export const trustHigh: ThemedColor = { light: '#31A24C', dark: '#45BD62' } as const;

/** Moderate trust – some positive signals. */
export const trustModerate: ThemedColor = { light: '#F7B928', dark: '#F7C948' } as const;

/** Caution – mixed signals. */
export const trustCaution: ThemedColor = { light: '#F5A623', dark: '#F7B955' } as const;

/** Low trust – red flags present. */
export const trustLow: ThemedColor = { light: '#E02C2C', dark: '#F25C5C' } as const;

// ---------------------------------------------------------------------------
// Price rating colors
// ---------------------------------------------------------------------------

/** Price is a steal – well below market. */
export const priceSteal: ThemedColor = { light: '#0B8A00', dark: '#3EC73E' } as const;

/** Great price – notably below market. */
export const priceGreat: ThemedColor = { light: '#31A24C', dark: '#45BD62' } as const;

/** Good price – somewhat below market. */
export const priceGood: ThemedColor = { light: '#57B85A', dark: '#6FCF72' } as const;

/** Fair price – at market value. */
export const priceFair: ThemedColor = { light: '#F7B928', dark: '#F7C948' } as const;

/** Above market – slightly overpriced. */
export const priceAbove: ThemedColor = { light: '#F5A623', dark: '#F7B955' } as const;

/** High price – clearly overpriced. */
export const priceHigh: ThemedColor = { light: '#E86C00', dark: '#FF9640' } as const;

/** Overpriced – significantly above market. */
export const priceOver: ThemedColor = { light: '#E02C2C', dark: '#F25C5C' } as const;

// ---------------------------------------------------------------------------
// Heat / popularity colors
// ---------------------------------------------------------------------------

/** Warm – some interest. */
export const heatWarm: ThemedColor = { light: '#F5A623', dark: '#F7B955' } as const;

/** Hot – high interest. */
export const heatHot: ThemedColor = { light: '#E86C00', dark: '#FF9640' } as const;

/** Fire – very high interest / selling fast. */
export const heatFire: ThemedColor = { light: '#E02C2C', dark: '#F25C5C' } as const;

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

/** Success / positive outcome. */
export const statusSuccess: ThemedColor = { light: '#31A24C', dark: '#45BD62' } as const;

/** Warning / needs attention. */
export const statusWarning: ThemedColor = { light: '#F7B928', dark: '#F7C948' } as const;

/** Error / destructive action. */
export const statusError: ThemedColor = { light: '#E02C2C', dark: '#F25C5C' } as const;

/** Informational. */
export const statusInfo: ThemedColor = { light: '#0866FF', dark: '#4599FF' } as const;

// ---------------------------------------------------------------------------
// Aggregated export
// ---------------------------------------------------------------------------

/** Complete color token map. */
export const colors = {
  primary,
  primaryHover,
  background,
  surface,
  surfaceElevated,
  textPrimary,
  textSecondary,
  border,

  trustHigh,
  trustModerate,
  trustCaution,
  trustLow,

  priceSteal,
  priceGreat,
  priceGood,
  priceFair,
  priceAbove,
  priceHigh,
  priceOver,

  heatWarm,
  heatHot,
  heatFire,

  statusSuccess,
  statusWarning,
  statusError,
  statusInfo,
} as const;

export type ColorToken = keyof typeof colors;
