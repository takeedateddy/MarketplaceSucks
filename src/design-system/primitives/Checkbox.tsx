import React from 'react';

/** Props for the {@link Checkbox} component. */
export interface CheckboxProps {
  /** Label text displayed next to the checkbox. */
  label?: string;
  /** Whether the checkbox is checked. */
  checked?: boolean;
  /** Change handler receiving the new boolean state. */
  onChange?: (checked: boolean) => void;
  /** Whether the checkbox is disabled. */
  disabled?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A checkbox with optional label.
 *
 * @example
 * ```tsx
 * <Checkbox label="Include sold items" checked={false} onChange={setInclude} />
 * ```
 */
export const Checkbox: React.FC<CheckboxProps> = ({
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

  const boxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    borderRadius: 'var(--mps-radius-sm)',
    border: `var(--mps-border-width-medium) solid ${checked ? 'var(--mps-color-primary)' : 'var(--mps-color-border)'}`,
    backgroundColor: checked ? 'var(--mps-color-primary)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all var(--mps-duration-fast) var(--mps-easing-ease)`,
    flexShrink: 0,
  };

  const checkStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    color: '#fff',
    display: checked ? 'block' : 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    color: 'var(--mps-color-text-primary)',
  };

  const handleClick = () => {
    if (!disabled) onChange?.(!checked);
  };

  return (
    <div className={className} style={wrapperStyle} onClick={handleClick} role="checkbox" aria-checked={checked}>
      <div style={boxStyle}>
        <svg style={checkStyle} viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
};
