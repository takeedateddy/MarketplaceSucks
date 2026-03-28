/**
 * Settings panel for extension preferences and feature toggles.
 *
 * @module Settings
 */

import { useState } from 'react';

interface SettingsState {
  theme: 'auto' | 'light' | 'dark';
  hiddenListingBehavior: 'hide' | 'dim';
  historyRetentionDays: number;
  priceDataRetentionDays: number;
  enableSellerTrust: boolean;
  enablePriceRating: boolean;
  enableImageAnalysis: boolean;
  enableHeatTracking: boolean;
  enableSalesForecast: boolean;
  enableListingHistory: boolean;
  autoScanImages: boolean;
}

const defaultSettings: SettingsState = {
  theme: 'auto',
  hiddenListingBehavior: 'dim',
  historyRetentionDays: 30,
  priceDataRetentionDays: 90,
  enableSellerTrust: true,
  enablePriceRating: true,
  enableImageAnalysis: false,
  enableHeatTracking: true,
  enableSalesForecast: true,
  enableListingHistory: true,
  autoScanImages: false,
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={headerStyle}>Settings</h3>

      {/* Appearance */}
      <section>
        <h4 style={subHeaderStyle}>Appearance</h4>
        <label style={labelStyle}>Theme</label>
        <select style={selectStyle} value={settings.theme} onChange={(e) => update('theme', e.target.value as SettingsState['theme'])}>
          <option value="auto">Auto (match Facebook)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>

        <label style={{ ...labelStyle, marginTop: '8px' }}>Hidden listings</label>
        <select style={selectStyle} value={settings.hiddenListingBehavior} onChange={(e) => update('hiddenListingBehavior', e.target.value as 'hide' | 'dim')}>
          <option value="dim">Dim (show faded)</option>
          <option value="hide">Hide completely</option>
        </select>
      </section>

      {/* Features */}
      <section>
        <h4 style={subHeaderStyle}>Features</h4>
        <ToggleRow label="Seller Trust Scoring" checked={settings.enableSellerTrust} onChange={(v) => update('enableSellerTrust', v)} />
        <ToggleRow label="Price Rating" checked={settings.enablePriceRating} onChange={(v) => update('enablePriceRating', v)} />
        <ToggleRow label="Image Analysis" checked={settings.enableImageAnalysis} onChange={(v) => update('enableImageAnalysis', v)} />
        <ToggleRow label="Heat Tracking" checked={settings.enableHeatTracking} onChange={(v) => update('enableHeatTracking', v)} />
        <ToggleRow label="Sales Forecast" checked={settings.enableSalesForecast} onChange={(v) => update('enableSalesForecast', v)} />
        <ToggleRow label="Listing History" checked={settings.enableListingHistory} onChange={(v) => update('enableListingHistory', v)} />
        <ToggleRow label="Auto-scan images" checked={settings.autoScanImages} onChange={(v) => update('autoScanImages', v)} />
      </section>

      {/* Data */}
      <section>
        <h4 style={subHeaderStyle}>Data Retention</h4>
        <label style={labelStyle}>History retention (days)</label>
        <input style={selectStyle} type="number" min="7" max="365" value={settings.historyRetentionDays} onChange={(e) => update('historyRetentionDays', parseInt(e.target.value) || 30)} />
        <label style={{ ...labelStyle, marginTop: '8px' }}>Price data retention (days)</label>
        <input style={selectStyle} type="number" min="30" max="365" value={settings.priceDataRetentionDays} onChange={(e) => update('priceDataRetentionDays', parseInt(e.target.value) || 90)} />
      </section>

      {/* About */}
      <section style={{ borderTop: '1px solid var(--mps-color-border)', paddingTop: '12px' }}>
        <h4 style={subHeaderStyle}>About</h4>
        <div style={{ fontSize: '12px', color: 'var(--mps-color-text-secondary)', lineHeight: '1.6' }}>
          <div>MarketplaceSucks v0.1.0</div>
          <div>All data is stored locally. No external API calls.</div>
          <div style={{ marginTop: '4px' }}>
            <a href="https://github.com/takeedateddy/MarketplaceSucks" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mps-color-info, #1877f2)' }}>
              GitHub
            </a>
            {' | '}
            <span>MIT License</span>
            {' | '}
            <span>Built by Takeeda LLC</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', cursor: 'pointer' }}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const headerStyle: React.CSSProperties = { fontSize: '15px', fontWeight: '600', margin: 0 };
const subHeaderStyle: React.CSSProperties = { fontSize: '13px', fontWeight: '600', margin: '0 0 8px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '500', color: 'var(--mps-color-text-secondary)', display: 'block', marginBottom: '4px' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '6px 10px', border: '1px solid var(--mps-color-border)', borderRadius: '6px', fontSize: '13px', background: 'var(--mps-color-surface)' };
