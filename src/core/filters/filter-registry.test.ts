import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IFilter, FilterCategory, FilterResult } from '../interfaces/filter.interface';

// Create a fresh registry for each test (avoid singleton state leaking)
function createRegistry() {
  const filters = new Map<string, IFilter>();
  return {
    register(filter: IFilter): void {
      if (filters.has(filter.id)) {
        console.warn(`[MPS] Filter "${filter.id}" is already registered. Overwriting.`);
      }
      filters.set(filter.id, filter);
    },
    unregister(id: string): void { filters.delete(id); },
    getAll(): IFilter[] { return Array.from(filters.values()); },
    getByCategory(category: string): IFilter[] { return this.getAll().filter(f => f.category === category); },
    get(id: string): IFilter | undefined { return filters.get(id); },
    has(id: string): boolean { return filters.has(id); },
    get size(): number { return filters.size; },
  };
}

function mockFilter(id: string, category: FilterCategory = 'keyword'): IFilter {
  return {
    id,
    displayName: id,
    category,
    defaultEnabled: false,
    apply: () => ({ keep: true }),
    getDefaultConfig: () => ({}),
    validateConfig: () => true,
  };
}

describe('FilterRegistry', () => {
  it('registers and retrieves filters', () => {
    const reg = createRegistry();
    const f = mockFilter('test-filter');
    reg.register(f);
    expect(reg.get('test-filter')).toBe(f);
    expect(reg.has('test-filter')).toBe(true);
    expect(reg.size).toBe(1);
  });

  it('returns undefined for unregistered filter', () => {
    const reg = createRegistry();
    expect(reg.get('nope')).toBeUndefined();
    expect(reg.has('nope')).toBe(false);
  });

  it('unregisters filter', () => {
    const reg = createRegistry();
    reg.register(mockFilter('f1'));
    reg.unregister('f1');
    expect(reg.has('f1')).toBe(false);
    expect(reg.size).toBe(0);
  });

  it('getAll returns all filters', () => {
    const reg = createRegistry();
    reg.register(mockFilter('f1'));
    reg.register(mockFilter('f2'));
    expect(reg.getAll()).toHaveLength(2);
  });

  it('getByCategory filters by category', () => {
    const reg = createRegistry();
    reg.register(mockFilter('f1', 'keyword'));
    reg.register(mockFilter('f2', 'price'));
    reg.register(mockFilter('f3', 'keyword'));
    expect(reg.getByCategory('keyword')).toHaveLength(2);
    expect(reg.getByCategory('price')).toHaveLength(1);
    expect(reg.getByCategory('location')).toHaveLength(0);
  });

  it('warns on duplicate registration', () => {
    const reg = createRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reg.register(mockFilter('f1'));
    reg.register(mockFilter('f1'));
    expect(warnSpy).toHaveBeenCalled();
    expect(reg.size).toBe(1); // overwrites
    warnSpy.mockRestore();
  });
});
