import React from 'react';

/** Props for the {@link Spinner} component. */
export interface SpinnerProps {
  /** Spinner diameter in pixels. */
  size?: number;
  /** Spinner color. Defaults to the primary theme color. */
  color?: string;
  /** Additional CSS class for composition. */
  className?: string;
}

/** Keyframe animation name (injected once). */
const ANIMATION_NAME = 'mps-spin';

/** Injects the spin keyframe once into the document. */
function ensureKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mps-spinner-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'mps-spinner-keyframes';
  style.textContent = `@keyframes ${ANIMATION_NAME} { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

/**
 * A CSS-only loading spinner.
 *
 * @example
 * ```tsx
 * <Spinner size={24} />
 * <Spinner size={16} color="var(--mps-color-status-warning)" />
 * ```
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 20,
  color = 'var(--mps-color-primary)',
  className,
}) => {
  ensureKeyframes();

  const style: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    border: `${Math.max(2, size / 8)}px solid var(--mps-color-border)`,
    borderTopColor: color,
    borderRadius: 'var(--mps-radius-full)',
    animation: `${ANIMATION_NAME} var(--mps-duration-slow) linear infinite`,
    display: 'inline-block',
    boxSizing: 'border-box',
  };

  return <div className={className} style={style} role="status" aria-label="Loading" />;
};
