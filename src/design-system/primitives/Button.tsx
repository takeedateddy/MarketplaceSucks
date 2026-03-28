import React from 'react';

/** Props for the {@link Button} component. */
export interface ButtonProps {
  /** Visual style variant. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Click handler. */
  onClick?: () => void;
  /** Button content. */
  children: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
  /** HTML button type. */
  type?: 'button' | 'submit';
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)', fontSize: 'var(--mps-font-size-sm)' },
  md: { padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)', fontSize: 'var(--mps-font-size-base)' },
  lg: { padding: 'var(--mps-spacing-md) var(--mps-spacing-lg)', fontSize: 'var(--mps-font-size-lg)' },
};

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { backgroundColor: 'var(--mps-color-primary)', color: '#fff', border: 'none' },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--mps-color-primary)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-primary)',
  },
  ghost: { backgroundColor: 'transparent', color: 'var(--mps-color-text-primary)', border: 'none' },
  danger: { backgroundColor: 'var(--mps-color-status-error)', color: '#fff', border: 'none' },
};

/**
 * A styled button primitive that maps variants to CSS custom properties.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Save
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className,
  type = 'button',
}) => {
  const style: React.CSSProperties = {
    ...variantStyles[variant], ...sizeStyles[size],
    fontFamily: 'var(--mps-font-family-primary)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    borderRadius: 'var(--mps-radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    transition: `all var(--mps-duration-fast) var(--mps-easing-ease)`,
    lineHeight: 'var(--mps-line-height-normal)' as never,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 'var(--mps-spacing-xs)',
  };

  return (
    <button
      type={type}
      className={className}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
