import React from 'react';

/** Props for the {@link EmptyState} component. */
export interface EmptyStateProps {
  /** Optional icon element displayed above the title. */
  icon?: React.ReactNode;
  /** Primary heading text. */
  title: string;
  /** Descriptive text shown below the title. */
  description?: string;
  /** Optional action element (e.g., a button) below the description. */
  action?: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A placeholder view for empty content areas with icon, title, and description.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Icon size={48}><circle cx="12" cy="12" r="10" stroke="currentColor" /></Icon>}
 *   title="No listings found"
 *   description="Try adjusting your filters or search terms."
 *   action={<Button variant="primary">Reset Filters</Button>}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--mps-spacing-xxl)',
    textAlign: 'center',
    fontFamily: 'var(--mps-font-family-primary)',
    gap: 'var(--mps-spacing-md)',
  };

  const iconStyle: React.CSSProperties = {
    color: 'var(--mps-color-text-secondary)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-lg)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    color: 'var(--mps-color-text-secondary)',
    lineHeight: 'var(--mps-line-height-normal)' as never,
    maxWidth: '360px',
    margin: 0,
  };

  return (
    <div className={className} style={containerStyle}>
      {icon && <div style={iconStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descStyle}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
