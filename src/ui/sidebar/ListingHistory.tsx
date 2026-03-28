/**
 * Listing history panel showing previously seen listings.
 *
 * @module ListingHistory
 */

export function ListingHistory() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={headerStyle}>Listing History</h3>
      <p style={descStyle}>
        Track listings you have seen. Dim or hide previously viewed listings
        to focus on new inventory.
      </p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btnStyle}>Mark All as Seen</button>
        <button style={outlineBtnStyle}>Clear History</button>
      </div>

      <div style={sectionStyle}>
        <h4 style={subHeaderStyle}>Recently Seen</h4>
        <div style={emptyStyle}>
          No listing history yet. Listings will be tracked as you browse Marketplace.
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--mps-color-text-secondary)' }}>
        History retention: 30 days (configurable in Settings)
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = { fontSize: '15px', fontWeight: '600', margin: 0 };
const descStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--mps-color-text-secondary)', margin: 0, lineHeight: '1.4' };
const subHeaderStyle: React.CSSProperties = { fontSize: '13px', fontWeight: '600', margin: '0 0 8px' };
const sectionStyle: React.CSSProperties = { padding: '12px', background: 'var(--mps-color-surface, #f0f2f5)', borderRadius: '8px' };
const emptyStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--mps-color-text-secondary)', fontStyle: 'italic' };
const btnStyle: React.CSSProperties = { padding: '8px 16px', background: 'var(--mps-color-primary, #e04f5f)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const outlineBtnStyle: React.CSSProperties = { padding: '8px 16px', background: 'transparent', color: 'var(--mps-color-text-secondary)', border: '1px solid var(--mps-color-border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
