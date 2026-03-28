import React from 'react';

/** Props for the {@link ProgressBar} component. */
export interface ProgressBarProps {
  /** Progress value from 0 to 100. */
  value: number;
  /** Height of the bar in pixels. */
  height?: number;
  /** Bar fill color. Defaults to the primary theme color. */
  color?: string;
  /** Whether to show the percentage label. */
  showLabel?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A horizontal progress bar with value from 0 to 100.
 *
 * @example
 * ```tsx
 * <ProgressBar value={65} showLabel />
 * <ProgressBar value={30} color="var(--mps-color-status-warning)" height={6} />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 8,
  color = 'var(--mps-color-primary)',
  showLabel = false,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--mps-spacing-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: `${height}px`,
    backgroundColor: 'var(--mps-color-border)',
    borderRadius: 'var(--mps-radius-full)',
    overflow: 'hidden',
  };

  const fillStyle: React.CSSProperties = {
    width: `${clamped}%`,
    height: '100%',
    backgroundColor: color,
    borderRadius: 'var(--mps-radius-full)',
    transition: `width var(--mps-duration-normal) var(--mps-easing-ease-out)`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    textAlign: 'right',
    fontFamily: 'var(--mps-font-family-mono)',
  };

  return (
    <div className={className} style={wrapperStyle} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      {showLabel && <span style={labelStyle}>{Math.round(clamped)}%</span>}
    </div>
  );
};
