import React from 'react';

/** Props for the {@link Card} component. */
export interface CardProps {
  /** Optional header content rendered above the body. */
  header?: React.ReactNode;
  /** Padding variant. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Card body content. */
  children: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

const paddingMap: Record<string, string> = {
  none: '0',
  sm: 'var(--mps-spacing-sm)',
  md: 'var(--mps-spacing-md)',
  lg: 'var(--mps-spacing-lg)',
};

/**
 * A surface container with optional header and configurable padding.
 *
 * @example
 * ```tsx
 * <Card header={<h3>Listing Details</h3>} padding="md">
 *   <p>Content goes here</p>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  header,
  padding = 'md',
  children,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-lg)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    boxShadow: 'var(--mps-shadow-sm)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: `var(--mps-spacing-sm) ${paddingMap[padding]}`,
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    fontSize: 'var(--mps-font-size-md)',
    color: 'var(--mps-color-text-primary)',
  };

  const bodyStyle: React.CSSProperties = {
    padding: paddingMap[padding],
  };

  return (
    <div className={className} style={containerStyle}>
      {header && <div style={headerStyle}>{header}</div>}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
};
