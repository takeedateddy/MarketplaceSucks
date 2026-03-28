/**
 * Export/import utilities for saved searches.
 * Provides JSON serialization and deserialization with validation
 * so users can back up and restore their search configurations.
 *
 * @module search-io
 */

import type { SavedSearch } from '@/core/models/saved-search';
import { validateSavedSearch } from '@/core/models/saved-search';

/** Export format wrapper with version for future compatibility */
export interface SearchExport {
  readonly version: 1;
  readonly exportedAt: string;
  readonly searches: readonly SavedSearch[];
}

/**
 * Serialize saved searches to a JSON string for export.
 *
 * @param searches - The saved searches to export
 * @returns JSON string ready for download
 */
export function exportSearches(searches: SavedSearch[]): string {
  const data: SearchExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    searches,
  };
  return JSON.stringify(data, null, 2);
}

/** Result of an import attempt */
export interface ImportResult {
  /** Successfully imported searches (with new IDs) */
  readonly imported: SavedSearch[];
  /** Number of entries that failed validation */
  readonly skipped: number;
  /** Error messages for skipped entries */
  readonly errors: string[];
}

/**
 * Parse and validate a JSON string of exported searches.
 * Generates new IDs for each imported search to avoid conflicts.
 *
 * @param json - The JSON string to import
 * @returns Import result with validated searches and error details
 */
export function importSearches(json: string): ImportResult {
  const imported: SavedSearch[] = [];
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { imported: [], skipped: 0, errors: ['Invalid JSON'] };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { imported: [], skipped: 0, errors: ['Expected an object'] };
  }

  const data = parsed as Record<string, unknown>;

  // Support both wrapped format { version, searches: [...] } and bare array [...]
  let rawSearches: unknown[];
  if (Array.isArray(data)) {
    rawSearches = data;
  } else if (Array.isArray(data.searches)) {
    rawSearches = data.searches;
  } else {
    return { imported: [], skipped: 0, errors: ['No searches array found'] };
  }

  for (let i = 0; i < rawSearches.length; i++) {
    const entry = rawSearches[i];
    if (validateSavedSearch(entry)) {
      // Generate new ID to avoid conflicts
      const newId = generateImportId();
      imported.push({ ...entry, id: newId });
    } else {
      errors.push(`Entry ${i}: failed validation`);
    }
  }

  return {
    imported,
    skipped: errors.length,
    errors,
  };
}

function generateImportId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = (n: number): string =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}
