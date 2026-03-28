import { describe, it, expect } from 'vitest';
import { createSavedSearch, validateSavedSearch } from './saved-search';

describe('createSavedSearch', () => {
  it('creates with required fields and defaults', () => {
    const search = createSavedSearch({ name: 'Test', query: 'iphone' });
    expect(search.name).toBe('Test');
    expect(search.query).toBe('iphone');
    expect(search.id).toBeTruthy();
    expect(search.filters).toEqual({});
    expect(search.sort).toBeNull();
    expect(search.notifications).toEqual({
      enabled: false,
      frequency: 'manual',
      showBadge: true,
      playSound: false,
    });
    expect(search.lastRunAt).toBeNull();
    expect(search.resultCount).toBeNull();
    expect(search.isPinned).toBe(false);
    expect(typeof search.createdAt).toBe('number');
    expect(typeof search.updatedAt).toBe('number');
  });

  it('generates unique IDs', () => {
    const s1 = createSavedSearch({ name: 'A', query: 'a' });
    const s2 = createSavedSearch({ name: 'B', query: 'b' });
    expect(s1.id).not.toBe(s2.id);
  });

  it('uses provided ID', () => {
    const search = createSavedSearch({ id: 'custom-id', name: 'Test', query: 'q' });
    expect(search.id).toBe('custom-id');
  });

  it('uses provided notification settings', () => {
    const search = createSavedSearch({
      name: 'Test',
      query: 'q',
      notifications: { enabled: true, frequency: 'hourly' },
    });
    expect(search.notifications.enabled).toBe(true);
    expect(search.notifications.frequency).toBe('hourly');
    expect(search.notifications.showBadge).toBe(true); // default
  });

  it('uses provided filters and sort', () => {
    const search = createSavedSearch({
      name: 'Test',
      query: 'q',
      filters: { 'price-range': { min: 100, max: 400 } },
      sort: { sorterId: 'price', direction: 'asc' },
    });
    expect(search.filters).toEqual({ 'price-range': { min: 100, max: 400 } });
    expect(search.sort).toEqual({ sorterId: 'price', direction: 'asc' });
  });
});

describe('validateSavedSearch', () => {
  it('returns true for valid search', () => {
    const search = createSavedSearch({ name: 'Test', query: 'q' });
    expect(validateSavedSearch(search)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateSavedSearch(null)).toBe(false);
  });

  it('returns false for empty name', () => {
    const search = createSavedSearch({ name: 'Test', query: 'q' });
    expect(validateSavedSearch({ ...search, name: '' })).toBe(false);
  });

  it('returns false for invalid notification frequency', () => {
    const search = createSavedSearch({ name: 'Test', query: 'q' });
    expect(validateSavedSearch({
      ...search,
      notifications: { ...search.notifications, frequency: 'invalid' },
    })).toBe(false);
  });

  it('returns false for invalid sort direction', () => {
    const search = createSavedSearch({ name: 'Test', query: 'q' });
    expect(validateSavedSearch({
      ...search,
      sort: { sorterId: 'price', direction: 'sideways' },
    })).toBe(false);
  });

  it('accepts null sort', () => {
    const search = createSavedSearch({ name: 'Test', query: 'q' });
    expect(validateSavedSearch(search)).toBe(true); // sort defaults to null
  });

  it('validates sort with valid direction', () => {
    const search = createSavedSearch({
      name: 'Test', query: 'q',
      sort: { sorterId: 'price', direction: 'asc' },
    });
    expect(validateSavedSearch(search)).toBe(true);
  });
});
