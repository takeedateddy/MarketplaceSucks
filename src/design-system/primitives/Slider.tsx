import React from 'react';

/** Props for the {@link Slider} component. */
export interface SliderProps {
  /** Label text displayed above the slider. */
  label?: string;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Step increment. */
  step?: number;
  /** Current value. */
  value?: number;
  /** Change handler receiving the new numeric value. */
  onChange?: (value: number) => void;
  /** Whether to show the current value next to the label. */
  showValue?: boolean;
  /** Whether the slider is disabled. */
  disabled?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A range slider with label and optional value display.
 *
 * @example
 * ```tsx
 * <Slider label="Max Distance" min={1} max={100} step={1} value={25} showValue />
 * ```
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  min = 0,
  max = 100,
  step = 1,
  value = 50,
  onChange,
  showValue = false,
  disabled = false,
  className,
}) => {
  const wrapperStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 'var(--mps-spacing-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
  };
  const headerStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 'var(--mps-font-size-sm)', fontWeight: 'var(--mps-font-weight-medium)' as never,
    color: 'var(--mps-color-text-secondary)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', cursor: disabled ? 'not-allowed' : 'pointer',
    accentColor: 'var(--mps-color-primary)', opacity: disabled ? 0.5 : 1,
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: 'var(--mps-font-family-mono)', color: 'var(--mps-color-text-primary)',
  };

  return (
    <div className={className} style={wrapperStyle}>
      {(label || showValue) && (
        <div style={headerStyle}>
          {label && <span>{label}</span>}
          {showValue && <span style={valueStyle}>{value}</span>}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  );
};
