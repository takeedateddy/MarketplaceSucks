/**
 * Sales forecast panel with time-to-sell predictions.
 *
 * @module SalesForecast
 */

export function SalesForecast() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={headerStyle}>Sales Forecast</h3>
      <p style={descStyle}>
        Predicts how quickly listings will sell based on pricing, engagement,
        category trends, condition, and seller responsiveness.
      </p>

      <div style={sectionStyle}>
        <h4 style={subHeaderStyle}>{'\u26A1'} Act Fast</h4>
        <div style={emptyStyle}>
          Listings predicted to sell within 24-48 hours will appear here.
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={subHeaderStyle}>{'\u23F3'} Take Your Time</h4>
        <div style={emptyStyle}>
          Listings predicted to last 2+ weeks will appear here.
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--mps-color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
        Forecasts improve with more browsing data. Requires 5+ comparable
        historical listings per category for predictions.
      </p>
    </div>
  );
}

const headerStyle: React.CSSProperties = { fontSize: '15px', fontWeight: '600', margin: 0 };
const descStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--mps-color-text-secondary)', margin: 0, lineHeight: '1.4' };
const subHeaderStyle: React.CSSProperties = { fontSize: '13px', fontWeight: '600', margin: '0 0 8px' };
const sectionStyle: React.CSSProperties = { padding: '12px', background: 'var(--mps-color-surface, #f0f2f5)', borderRadius: '8px' };
const emptyStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--mps-color-text-secondary)', fontStyle: 'italic' };
