import React from 'react';

/** A single option in the select dropdown. */
export interface SelectOption {
  label: string;
  value: string;
}

/** Props for the {@link Select} component. */
export interface SelectProps {
  /** Label text displayed above the select. */
  label?: string;
  /** Available options. */
  options: SelectOption[];
  /** Currently selected value. */
  value?: string;
  /** Change handler receiving the new value. */
  onChange?: (value: string) => void;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A dropdown select with label and option list.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Sort By"
 *   options={[{ label: 'Price', value: 'price' }, { label: 'Date', value: 'date' }]}
 *   value="price"
 *   onChange={setValue}
 * />
 * ```
 */
export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
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
  const selectStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-base)', fontFamily: 'var(--mps-font-family-primary)',
    color: 'var(--mps-color-text-primary)', backgroundColor: 'var(--mps-color-surface)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    borderRadius: 'var(--mps-radius-md)', outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  };

  return (
    <div className={className} style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        style={selectStyle}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};
