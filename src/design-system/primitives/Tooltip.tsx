import React, { useState, useRef } from 'react';

/** Tooltip positioning. */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/** Props for the {@link Tooltip} component. */
export interface TooltipProps {
  /** Tooltip text content. */
  content: string;
  /** Positioning relative to the trigger element. */
  position?: TooltipPosition;
  /** The trigger element that activates the tooltip on hover. */
  children: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

const positionStyles: Record<TooltipPosition, React.CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' },
};

/**
 * A tooltip that appears on hover with configurable positioning.
 *
 * @example
 * ```tsx
 * <Tooltip content="View seller profile" position="top">
 *   <Button variant="ghost">Profile</Button>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => { clearTimeout(timeoutRef.current); setVisible(true); };
  const hide = () => { timeoutRef.current = setTimeout(() => setVisible(false), 100); };

  const wrapperStyle: React.CSSProperties = { position: 'relative', display: 'inline-flex' };

  const tipStyle: React.CSSProperties = {
    position: 'absolute',
    ...positionStyles[position],
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    fontSize: 'var(--mps-font-size-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
    color: '#fff',
    backgroundColor: 'var(--mps-color-text-primary)',
    borderRadius: 'var(--mps-radius-sm)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 'var(--mps-z-tooltip)' as never,
    opacity: visible ? 1 : 0,
    transition: `opacity var(--mps-duration-fast) var(--mps-easing-ease)`,
  };

  return (
    <div className={className} style={wrapperStyle} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <div style={tipStyle} role="tooltip">{content}</div>
    </div>
  );
};
