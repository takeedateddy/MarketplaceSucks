/**
 * Filter controls panel organized in collapsible FilterGroup sections.
 *
 * Each section groups related filter controls (keyword inputs, price
 * sliders, condition checkboxes, etc.) using design-system primitives.
 *
 * @module ui/sidebar/FilterPanel
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { FilterGroup } from '@/design-system/composites/FilterGroup';
import { Button } from '@/design-system/primitives/Button';

/** Internal state shape for all filter controls. */
interface FilterState {
  keywords: string;
  excludeKeywords: string;
  priceMin: string;
  priceMax: string;
  maxDistance: string;
  conditions: Record<string, boolean>;
  datePosted: string;
  minTrustScore: string;
  minImageQuality: string;
  priceRatingTiers: Record<string, boolean>;
}

const DEFAULT_FILTERS: FilterState = {
  keywords: '',
  excludeKeywords: '',
  priceMin: '',
  priceMax: '',
  maxDistance: '',
  conditions: {
    new: false,
    like_new: false,
    good: false,
    fair: false,
    salvage: false,
  },
  datePosted: 'any',
  minTrustScore: '',
  minImageQuality: '',
  priceRatingTiers: {
    steal: false,
    'great-deal': false,
    'good-price': false,
    'fair-price': false,
    'above-market': false,
    high: false,
    overpriced: false,
  },
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  salvage: 'Salvage',
};

const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const PRICE_RATING_LABELS: Record<string, string> = {
  steal: 'Steal',
  'great-deal': 'Great Deal',
  'good-price': 'Good Price',
  'fair-price': 'Fair Price',
  'above-market': 'Above Market',
  high: 'High',
  overpriced: 'Overpriced',
};

/** Shared inline styles for form elements. */
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

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--mps-spacing-sm)',
  alignItems: 'center',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--mps-spacing-xs)',
  fontSize: 'var(--mps-font-size-sm)',
  color: 'var(--mps-color-text-primary)',
  cursor: 'pointer',
};

const fieldGap: React.CSSProperties = { marginBottom: 'var(--mps-spacing-sm)' };

/**
 * The filter controls panel rendered in the sidebar's "Filters" tab.
 * Groups controls into collapsible sections using {@link FilterGroup}.
 *
 * @example
 * ```tsx
 * <FilterPanel />
 * ```
 */
export const FilterPanel: React.FC<{ className?: string }> = ({ className }) => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const updateField = useCallback(
    <K extends keyof FilterState>(field: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleCondition = useCallback((key: string) => {
    setFilters((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: !prev.conditions[key] },
    }));
  }, []);

  const togglePriceRating = useCallback((key: string) => {
    setFilters((prev) => ({
      ...prev,
      priceRatingTiers: { ...prev.priceRatingTiers, [key]: !prev.priceRatingTiers[key] },
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const activeCount = (): number => {
    let count = 0;
    if (filters.keywords) count++;
    if (filters.excludeKeywords) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.maxDistance) count++;
    if (Object.values(filters.conditions).some(Boolean)) count++;
    if (filters.datePosted !== 'any') count++;
    if (filters.minTrustScore) count++;
    if (filters.minImageQuality) count++;
    if (Object.values(filters.priceRatingTiers).some(Boolean)) count++;
    return count;
  };

  return (
    <PanelLayout
      title="Filters"
      className={className}
      actions={
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Reset ({activeCount()})
        </Button>
      }
    >
      {/* Keywords */}
      <FilterGroup label="Keywords" defaultExpanded>
        <div style={fieldGap}>
          <label style={labelStyle}>Include keywords</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g. iPhone, vintage"
            value={filters.keywords}
            onChange={(e) => updateField('keywords', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Exclude keywords</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="e.g. broken, parts"
            value={filters.excludeKeywords}
            onChange={(e) => updateField('excludeKeywords', e.target.value)}
          />
        </div>
      </FilterGroup>

      {/* Price */}
      <FilterGroup label="Price">
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Min</label>
            <input
              type="number"
              style={inputStyle}
              placeholder="$0"
              min={0}
              value={filters.priceMin}
              onChange={(e) => updateField('priceMin', e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Max</label>
            <input
              type="number"
              style={inputStyle}
              placeholder="No max"
              min={0}
              value={filters.priceMax}
              onChange={(e) => updateField('priceMax', e.target.value)}
            />
          </div>
        </div>
      </FilterGroup>

      {/* Location / Distance */}
      <FilterGroup label="Location">
        <div>
          <label style={labelStyle}>Max distance (miles)</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="Any distance"
            min={0}
            value={filters.maxDistance}
            onChange={(e) => updateField('maxDistance', e.target.value)}
          />
        </div>
      </FilterGroup>

      {/* Condition */}
      <FilterGroup label="Condition">
        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
          <label key={key} style={{ ...checkboxRowStyle, ...fieldGap }}>
            <input
              type="checkbox"
              checked={filters.conditions[key] ?? false}
              onChange={() => toggleCondition(key)}
            />
            {label}
          </label>
        ))}
      </FilterGroup>

      {/* Date Posted */}
      <FilterGroup label="Date Posted">
        <select
          style={inputStyle}
          value={filters.datePosted}
          onChange={(e) => updateField('datePosted', e.target.value)}
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Seller Trust */}
      <FilterGroup label="Seller Trust">
        <div>
          <label style={labelStyle}>Minimum trust score (0-100)</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="No minimum"
            min={0}
            max={100}
            value={filters.minTrustScore}
            onChange={(e) => updateField('minTrustScore', e.target.value)}
          />
        </div>
      </FilterGroup>

      {/* Image Quality */}
      <FilterGroup label="Image Quality">
        <div>
          <label style={labelStyle}>Max AI score (0-100, lower = more real)</label>
          <input
            type="number"
            style={inputStyle}
            placeholder="No filter"
            min={0}
            max={100}
            value={filters.minImageQuality}
            onChange={(e) => updateField('minImageQuality', e.target.value)}
          />
        </div>
      </FilterGroup>

      {/* Price Rating */}
      <FilterGroup label="Price Rating">
        {Object.entries(PRICE_RATING_LABELS).map(([key, label]) => (
          <label key={key} style={{ ...checkboxRowStyle, ...fieldGap }}>
            <input
              type="checkbox"
              checked={filters.priceRatingTiers[key] ?? false}
              onChange={() => togglePriceRating(key)}
            />
            {label}
          </label>
        ))}
      </FilterGroup>
    </PanelLayout>
  );
};
