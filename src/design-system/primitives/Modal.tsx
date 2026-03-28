import React, { useEffect } from 'react';

/** Props for the {@link Modal} component. */
export interface ModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Callback to close the modal. */
  onClose: () => void;
  /** Optional title shown in the modal header. */
  title?: string;
  /** Modal body content. */
  children: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A modal dialog with backdrop overlay and close button.
 *
 * @example
 * ```tsx
 * <Modal open={isOpen} onClose={() => setOpen(false)} title="Confirm">
 *   <p>Are you sure?</p>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--mps-z-modal)' as never,
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: 'var(--mps-color-surface-elevated)',
    borderRadius: 'var(--mps-radius-lg)',
    boxShadow: 'var(--mps-shadow-xl)',
    padding: 'var(--mps-spacing-lg)',
    minWidth: '320px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
    fontFamily: 'var(--mps-font-family-primary)',
    color: 'var(--mps-color-text-primary)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--mps-spacing-md)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-lg)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    margin: 0,
  };

  const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 'var(--mps-font-size-xl)',
    color: 'var(--mps-color-text-secondary)',
    cursor: 'pointer',
    padding: 'var(--mps-spacing-xs)',
    lineHeight: 1,
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div className={className} style={dialogStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div style={headerStyle}>
          {title && <h2 style={titleStyle}>{title}</h2>}
          <button style={closeStyle} onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};
