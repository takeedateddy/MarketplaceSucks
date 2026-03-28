import React from 'react';

/** Props for the {@link Icon} component. */
export interface IconProps {
  /** SVG child elements (path, circle, etc.). */
  children: React.ReactNode;
  /** Icon size in pixels. */
  size?: number;
  /** Icon color via CSS custom property or value. */
  color?: string;
  /** Additional CSS class for composition. */
  className?: string;
  /** Accessible label for the icon. */
  label?: string;
}

/**
 * An SVG icon wrapper with consistent sizing and color.
 *
 * @example
 * ```tsx
 * <Icon size={20} color="var(--mps-color-primary)" label="Check">
 *   <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" fill="none" />
 * </Icon>
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  children,
  size = 16,
  color = 'currentColor',
  className,
  label,
}) => {
  const style: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    color,
    flexShrink: 0,
    display: 'inline-flex',
  };

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={!label}
    >
      {children}
    </svg>
  );
};
