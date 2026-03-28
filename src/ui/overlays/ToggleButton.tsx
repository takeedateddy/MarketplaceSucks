/**
 * Floating sidebar toggle button injected into the Marketplace page.
 * Positioned on the right edge, provides one-click sidebar access.
 *
 * @module ToggleButton
 */

interface ToggleButtonProps {
  /** Whether the sidebar is currently open */
  isOpen: boolean;
  /** Called when the button is clicked */
  onClick: () => void;
}

/**
 * Floating toggle button for opening/closing the sidebar.
 */
export function ToggleButton({ isOpen, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="mps-toggle-button"
      data-mps-element="toggle-button"
      aria-label={isOpen ? 'Close MarketplaceSucks sidebar' : 'Open MarketplaceSucks sidebar'}
      style={{
        position: 'fixed',
        right: isOpen ? '360px' : '0',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 9999,
        width: '36px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mps-color-primary, #e04f5f)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px 0 0 8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '700',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
        transition: 'right 0.25s ease',
      }}
    >
      {isOpen ? '\u203A' : '\u2039'}
    </button>
  );
}
