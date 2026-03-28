import { describe, it, expect } from 'vitest';
import { exportSearches, importSearches } from './search-io';
import { createSavedSearch } from '@/core/models/saved-search';

describe('exportSearches', () => {
  it('exports to valid JSON with version and timestamp', () => {
    const searches = [createSavedSearch({ name: 'Test', query: 'iphone' })];
    const json = exportSearches(searches);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.searches).toHaveLength(1);
    expect(parsed.searches[0].name).toBe('Test');
  });

  it('exports empty array', () => {
    const json = exportSearches([]);
    const parsed = JSON.parse(json);
    expect(parsed.searches).toEqual([]);
  });
});

describe('importSearches', () => {
  it('imports valid wrapped format', () => {
    const searches = [createSavedSearch({ name: 'Test', query: 'q' })];
    const json = exportSearches(searches);
    const result = importSearches(json);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].name).toBe('Test');
    expect(result.skipped).toBe(0);
  });

  it('generates new IDs on import', () => {
    const original = createSavedSearch({ name: 'Test', query: 'q' });
    const json = exportSearches([original]);
    const result = importSearches(json);
    expect(result.imported[0].id).not.toBe(original.id);
  });

  it('imports bare array format', () => {
    const search = createSavedSearch({ name: 'Bare', query: 'q' });
    const json = JSON.stringify([search]);
    const result = importSearches(json);
    expect(result.imported).toHaveLength(1);
  });

  it('returns error for invalid JSON', () => {
    const result = importSearches('not json{{{');
    expect(result.imported).toEqual([]);
    expect(result.errors).toContain('Invalid JSON');
  });

  it('returns error for non-object', () => {
    const result = importSearches('"just a string"');
    expect(result.errors[0]).toContain('Expected an object');
  });

  it('returns error when no searches array found', () => {
    const result = importSearches('{"foo": "bar"}');
    expect(result.errors[0]).toContain('No searches array');
  });

  it('skips invalid entries and reports count', () => {
    const valid = createSavedSearch({ name: 'Good', query: 'q' });
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      searches: [valid, { invalid: true }, valid],
    });
    const result = importSearches(json);
    expect(result.imported).toHaveLength(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('handles empty searches array', () => {
    const json = JSON.stringify({ version: 1, searches: [] });
    const result = importSearches(json);
    expect(result.imported).toEqual([]);
    expect(result.skipped).toBe(0);
  });
});
