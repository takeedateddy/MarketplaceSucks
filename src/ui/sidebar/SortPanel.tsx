/**
 * Sort option selector panel. Provides a radio-button style list
 * of sort options for ordering marketplace listings.
 *
 * @module ui/sidebar/SortPanel
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';

/** A single sort option definition. */
interface SortOption {
  id: string;
  label: string;
  description: string;
}

/** Available sort options in display order. */
const SORT_OPTIONS: SortOption[] = [
  { id: 'price-asc', label: 'Price: Low to High', description: 'Cheapest listings first' },
  { id: 'price-desc', label: 'Price: High to Low', description: 'Most expensive listings first' },
  { id: 'date-desc', label: 'Date: Newest First', description: 'Most recently posted' },
  { id: 'date-asc', label: 'Date: Oldest First', description: 'Earliest posted' },
  { id: 'distance-asc', label: 'Distance: Nearest', description: 'Closest to your location' },
  { id: 'alpha-asc', label: 'Alphabetical: A-Z', description: 'Title alphabetical order' },
  { id: 'trust-desc', label: 'Seller Trust: Highest', description: 'Most trusted sellers first' },
  { id: 'price-rating', label: 'Price Rating: Best Deals', description: 'Best price ratings first' },
  { id: 'heat-desc', label: 'Heat Score: Hottest', description: 'Most popular listings first' },
  { id: 'forecast-asc', label: 'Selling Speed: Fastest', description: 'Predicted to sell soonest' },
];

/** Props for the {@link SortPanel} component. */
export interface SortPanelProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A panel displaying all available sort options as a radio-button
 * style list. Selecting an option applies it immediately.
 *
 * @example
 * ```tsx
 * <SortPanel />
 * ```
 */
export const SortPanel: React.FC<SortPanelProps> = ({ className }) => {
  const [selectedSort, setSelectedSort] = useState<string>('date-desc');

  const handleSelect = useCallback((id: string) => {
    setSelectedSort(id);
  }, []);

  const optionStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    cursor: 'pointer',
    backgroundColor: isSelected ? 'var(--mps-color-primary)' : 'transparent',
    color: isSelected ? '#fff' : 'var(--mps-color-text-primary)',
    borderRadius: 'var(--mps-radius-sm)',
    transition: `background-color var(--mps-duration-fast) var(--mps-easing-ease)`,
    fontFamily: 'var(--mps-font-family-primary)',
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
  };

  const descStyle = (isSelected: boolean): React.CSSProperties => ({
    fontSize: 'var(--mps-font-size-xs)',
    color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--mps-color-text-secondary)',
  });

  const radioStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: 'var(--mps-radius-full)',
    border: `var(--mps-border-width-medium) solid ${
      isSelected ? '#fff' : 'var(--mps-color-border)'
    }`,
    backgroundColor: isSelected ? 'var(--mps-color-primary)' : 'transparent',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const dotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: '#fff',
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--mps-spacing-xxs)',
    padding: 'var(--mps-spacing-sm)',
  };

  return (
    <PanelLayout title="Sort" className={className}>
      <div style={listStyle} role="radiogroup" aria-label="Sort options">
        {SORT_OPTIONS.map((option) => {
          const isSelected = selectedSort === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              style={optionStyle(isSelected)}
              onClick={() => handleSelect(option.id)}
            >
              <div style={radioStyle(isSelected)}>
                {isSelected && <div style={dotStyle} />}
              </div>
              <div>
                <div style={labelStyle}>{option.label}</div>
                <div style={descStyle(isSelected)}>{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </PanelLayout>
  );
};
