/**
 * Saved search management panel. Allows the user to save the current
 * filter/sort configuration, load previously saved searches, delete,
 * pin, and export/import searches as JSON.
 *
 * @module ui/sidebar/SavedSearches
 */

import React, { useState, useCallback, useRef } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { Button } from '@/design-system/primitives/Button';
import { useSidebarData } from '@/ui/sidebar/sidebar-context';

/** Props for the {@link SavedSearches} component. */
export interface SavedSearchesProps {
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * The saved searches management panel. Lists all saved searches with
 * load, pin, delete, and export/import capabilities.
 *
 * @example
 * ```tsx
 * <SavedSearches />
 * ```
 */
export const SavedSearches: React.FC<SavedSearchesProps> = ({ className }) => {
  const {
    savedSearches: searches,
    addSavedSearch,
    deleteSavedSearch,
    togglePinSavedSearch,
    setSavedSearchFrequency,
    runSavedSearch,
    exportSavedSearches,
    importSavedSearches,
  } = useSidebarData();
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    addSavedSearch(newName.trim());
    setNewName('');
  }, [newName, addSavedSearch]);

  const handleExport = useCallback(async () => {
    const json = await exportSavedSearches();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketplacesucks-saved-searches.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportSavedSearches]);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      importSavedSearches(text);
      e.target.value = '';
    },
    [importSavedSearches],
  );

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    borderRadius: 'var(--mps-radius-sm)',
    backgroundColor: 'var(--mps-color-surface)',
    color: 'var(--mps-color-text-primary)',
    outline: 'none',
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--mps-spacing-xxl)',
    color: 'var(--mps-color-text-secondary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    backgroundColor: 'var(--mps-color-surface)',
    borderRadius: 'var(--mps-radius-md)',
    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    borderTop: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
  };

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Sort: pinned first, then by creation date desc
  const sorted = [...searches].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <PanelLayout title="Saved Searches" className={className}>
      {/* Save current search */}
      <div style={{ display: 'flex', gap: 'var(--mps-spacing-sm)', padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)' }}>
        <input
          type="text"
          style={inputStyle}
          placeholder="Name this search..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <Button size="sm" onClick={handleSave} disabled={!newName.trim()}>
          Save
        </Button>
      </div>

      {/* Search list */}
      {sorted.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 'var(--mps-font-size-xl)', marginBottom: 'var(--mps-spacing-sm)' }}>
            &#x1F4BE;
          </div>
          <div>No saved searches yet.</div>
          <div style={{ marginTop: 'var(--mps-spacing-xs)' }}>
            Set your filters and sort, then save the combination for quick access later.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mps-spacing-xs)', padding: 'var(--mps-spacing-xs) var(--mps-spacing-md)' }}>
          {sorted.map((search) => (
            <div key={search.id} style={cardStyle}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={nameStyle}>
                  {search.isPinned ? '\u{1F4CC} ' : ''}{search.name}
                </div>
                <div style={metaStyle}>
                  {search.query ? `"${search.query}"` : 'All listings'}
                  {' \u00B7 '}
                  Created {formatDate(search.createdAt)}
                  {search.resultCount != null && ` \u00B7 ${search.resultCount} results`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mps-spacing-xxs)' }}>
                <select
                  aria-label="Alert frequency"
                  title="Alert frequency"
                  value={search.frequency}
                  onChange={(e) =>
                    setSavedSearchFrequency(
                      search.id,
                      e.target.value as 'realtime' | 'hourly' | 'daily' | 'manual',
                    )
                  }
                  style={{
                    fontSize: 'var(--mps-font-size-xs)',
                    padding: '2px 4px',
                    border: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
                    borderRadius: 'var(--mps-radius-sm)',
                    background: 'var(--mps-color-surface)',
                    color: 'var(--mps-color-text-primary)',
                  }}
                >
                  <option value="realtime">Realtime</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="manual">Manual</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => runSavedSearch(search)}>Load</Button>
                <Button variant="ghost" size="sm" onClick={() => togglePinSavedSearch(search.id)}>
                  {search.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => deleteSavedSearch(search.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export / Import */}
      <div style={footerStyle}>
        <Button variant="ghost" size="sm" onClick={handleExport} disabled={searches.length === 0}>
          Export as JSON
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
    </PanelLayout>
  );
};
