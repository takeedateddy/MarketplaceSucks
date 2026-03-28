/**
 * Settings panel for extension preferences, feature toggles, theme
 * selection, and data retention configuration.
 *
 * @module ui/sidebar/Settings
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { Button } from '@/design-system/primitives/Button';

/** All user-configurable settings. */
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

const DEFAULT_SETTINGS: SettingsState = {
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

/** Props for the {@link Settings} component. */
export interface SettingsProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/** Shared inline styles. */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
  fontSize: 'var(--mps-font-size-sm)',
  fontFamily: 'var(--mps-font-family-primary)',
  border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
  borderRadius: 'var(--mps-radius-sm)',
  backgroundColor: 'var(--mps-color-surface)',
  color: 'var(--mps-color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--mps-font-size-xs)',
  fontWeight: 'var(--mps-font-weight-medium)' as never,
  color: 'var(--mps-color-text-secondary)',
  marginBottom: 'var(--mps-spacing-xxs)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--mps-font-size-sm)',
  fontWeight: 'var(--mps-font-weight-semibold)' as never,
  color: 'var(--mps-color-text-primary)',
  marginBottom: 'var(--mps-spacing-sm)',
};

const sectionStyle: React.CSSProperties = {
  padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
  borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--mps-spacing-xs) 0',
  fontSize: 'var(--mps-font-size-sm)',
  fontFamily: 'var(--mps-font-family-primary)',
  color: 'var(--mps-color-text-primary)',
  cursor: 'pointer',
};

const toggleTrackStyle = (checked: boolean): React.CSSProperties => ({
  width: '36px',
  height: '20px',
  borderRadius: 'var(--mps-radius-full)',
  backgroundColor: checked ? 'var(--mps-color-primary)' : 'var(--mps-color-border)',
  position: 'relative',
  transition: `background-color var(--mps-duration-fast) var(--mps-easing-ease)`,
  cursor: 'pointer',
  flexShrink: 0,
});

const toggleKnobStyle = (checked: boolean): React.CSSProperties => ({
  width: '16px',
  height: '16px',
  borderRadius: 'var(--mps-radius-full)',
  backgroundColor: '#fff',
  position: 'absolute',
  top: '2px',
  left: checked ? '18px' : '2px',
  transition: `left var(--mps-duration-fast) var(--mps-easing-ease)`,
  boxShadow: 'var(--mps-shadow-sm)',
});

/**
 * Extension settings panel with appearance controls, feature toggles,
 * data retention settings, and about information.
 *
 * @example
 * ```tsx
 * <Settings />
 * ```
 */
export const Settings: React.FC<SettingsProps> = ({ className }) => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  const update = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  /** Toggle switch sub-component. */
  const Toggle: React.FC<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }> = ({ label, description, checked, onChange }) => (
    <label style={toggleRowStyle}>
      <div>
        <div>{label}</div>
        {description && (
          <div style={{ fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)', marginTop: '1px' }}>
            {description}
          </div>
        )}
      </div>
      <div
        style={toggleTrackStyle(checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked); } }}
      >
        <div style={toggleKnobStyle(checked)} />
      </div>
    </label>
  );

  return (
    <PanelLayout
      title="Settings"
      className={className}
      actions={
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset to Defaults
        </Button>
      }
    >
      {/* Appearance */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Appearance</div>
        <div style={{ marginBottom: 'var(--mps-spacing-sm)' }}>
          <label style={labelStyle}>Theme</label>
          <select
            style={inputStyle}
            value={settings.theme}
            onChange={(e) => update('theme', e.target.value as SettingsState['theme'])}
          >
            <option value="auto">Auto (match Facebook)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Hidden listing behavior</label>
          <select
            style={inputStyle}
            value={settings.hiddenListingBehavior}
            onChange={(e) => update('hiddenListingBehavior', e.target.value as 'hide' | 'dim')}
          >
            <option value="dim">Dim (show faded)</option>
            <option value="hide">Hide completely</option>
          </select>
        </div>
      </div>

      {/* Feature toggles */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Features</div>
        <Toggle
          label="Seller Trust Scoring"
          description="Evaluate sellers based on account age, ratings, and behavior"
          checked={settings.enableSellerTrust}
          onChange={(v) => update('enableSellerTrust', v)}
        />
        <Toggle
          label="Price Rating"
          description="Compare prices against similar listings"
          checked={settings.enablePriceRating}
          onChange={(v) => update('enablePriceRating', v)}
        />
        <Toggle
          label="Image Analysis"
          description="Detect AI-generated and stock images"
          checked={settings.enableImageAnalysis}
          onChange={(v) => update('enableImageAnalysis', v)}
        />
        <Toggle
          label="Auto-scan Images"
          description="Automatically analyze images as you browse"
          checked={settings.autoScanImages}
          onChange={(v) => update('autoScanImages', v)}
        />
        <Toggle
          label="Heat Tracking"
          description="Track listing popularity and engagement velocity"
          checked={settings.enableHeatTracking}
          onChange={(v) => update('enableHeatTracking', v)}
        />
        <Toggle
          label="Sales Forecast"
          description="Predict how quickly listings will sell"
          checked={settings.enableSalesForecast}
          onChange={(v) => update('enableSalesForecast', v)}
        />
        <Toggle
          label="Listing History"
          description="Track and dim previously viewed listings"
          checked={settings.enableListingHistory}
          onChange={(v) => update('enableListingHistory', v)}
        />
      </div>

      {/* Data retention */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Data Retention</div>
        <div style={{ marginBottom: 'var(--mps-spacing-sm)' }}>
          <label style={labelStyle}>History retention (days)</label>
          <input
            type="number"
            style={inputStyle}
            min={7}
            max={365}
            value={settings.historyRetentionDays}
            onChange={(e) => update('historyRetentionDays', parseInt(e.target.value) || 30)}
          />
        </div>
        <div>
          <label style={labelStyle}>Price data retention (days)</label>
          <input
            type="number"
            style={inputStyle}
            min={30}
            max={365}
            value={settings.priceDataRetentionDays}
            onChange={(e) => update('priceDataRetentionDays', parseInt(e.target.value) || 90)}
          />
        </div>
      </div>

      {/* About */}
      <div style={{ padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)' }}>
        <div style={sectionTitleStyle}>About</div>
        <div style={{ fontSize: 'var(--mps-font-size-xs)', color: 'var(--mps-color-text-secondary)', lineHeight: 'var(--mps-line-height-relaxed)' as never, fontFamily: 'var(--mps-font-family-primary)' }}>
          <div>MarketplaceSucks v0.1.0</div>
          <div>All data is stored locally in your browser. No external API calls.</div>
        </div>
      </div>
    </PanelLayout>
  );
};
