import React from 'react';

/** Props for the {@link Input} component. */
export interface InputProps {
  /** Input type. */
  type?: 'text' | 'number' | 'email' | 'password' | 'search';
  /** Label text displayed above the input. */
  label?: string;
  /** Placeholder text. */
  placeholder?: string;
  /** Current value. */
  value?: string | number;
  /** Change handler. */
  onChange?: (value: string) => void;
  /** Error message shown below the input. */
  error?: string;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A text or number input with optional label and error state.
 *
 * @example
 * ```tsx
 * <Input label="Max Price" type="number" placeholder="0" error="Required" />
 * ```
 */
export const Input: React.FC<InputProps> = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  className,
}) => {
  const wrapperStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 'var(--mps-spacing-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)', fontWeight: 'var(--mps-font-weight-medium)' as never,
    color: 'var(--mps-color-text-secondary)',
  };
  const inputStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-base)', fontFamily: 'var(--mps-font-family-primary)',
    color: 'var(--mps-color-text-primary)', backgroundColor: 'var(--mps-color-surface)',
    border: `var(--mps-border-width-thin) solid ${error ? 'var(--mps-color-status-error)' : 'var(--mps-color-border)'}`,
    borderRadius: 'var(--mps-radius-md)', outline: 'none',
    transition: `border-color var(--mps-duration-fast) var(--mps-easing-ease)`,
    opacity: disabled ? 0.5 : 1,
  };
  const errorStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-status-error)',
  };

  return (
    <div className={className} style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        style={inputStyle}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  );
};
