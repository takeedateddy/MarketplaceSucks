import React from 'react';

/** Props for the {@link Toggle} component. */
export interface ToggleProps {
  /** Label text displayed next to the toggle. */
  label?: string;
  /** Whether the toggle is checked. */
  checked?: boolean;
  /** Change handler receiving the new boolean state. */
  onChange?: (checked: boolean) => void;
  /** Whether the toggle is disabled. */
  disabled?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A toggle switch with optional label.
 *
 * @example
 * ```tsx
 * <Toggle label="Enable notifications" checked={true} onChange={setEnabled} />
 * ```
 */
export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  className,
}) => {
  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width: '36px',
    height: '20px',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: checked ? 'var(--mps-color-primary)' : 'var(--mps-color-border)',
    transition: `background-color var(--mps-duration-fast) var(--mps-easing-ease)`,
    flexShrink: 0,
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '2px',
    left: checked ? '18px' : '2px',
    width: '16px',
    height: '16px',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: '#fff',
    boxShadow: 'var(--mps-shadow-sm)',
    transition: `left var(--mps-duration-fast) var(--mps-easing-ease)`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    color: 'var(--mps-color-text-primary)',
  };

  const handleClick = () => {
    if (!disabled) onChange?.(!checked);
  };

  return (
    <div className={className} style={wrapperStyle} onClick={handleClick} role="switch" aria-checked={checked}>
      <div style={trackStyle}>
        <div style={thumbStyle} />
      </div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
};
