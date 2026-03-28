/**
 * Animation tokens for the MarketplaceSucks design system.
 */

/** Transition duration scale. */
export const durations = {
  /** 150ms – micro-interactions (hover, focus). */
  fast: '150ms',
  /** 250ms – standard transitions (expand, collapse). */
  normal: '250ms',
  /** 400ms – dramatic transitions (page, modal). */
  slow: '400ms',
} as const;

/** Easing / timing-function curves. */
export const easings = {
  /** General purpose ease. */
  ease: 'ease',
  /** Accelerating from rest. */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Decelerating to rest. */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Smooth acceleration then deceleration. */
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Spring-like overshoot for playful motion. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/** Aggregated animation tokens. */
export const animation = {
  durations,
  easings,
} as const;

export type DurationToken = keyof typeof durations;
export type EasingToken = keyof typeof easings;
