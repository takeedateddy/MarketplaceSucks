import { describe, it, expect, vi } from 'vitest';
import type { ISorter, SortDirection } from '../interfaces/sorter.interface';

function createRegistry() {
  const sorters = new Map<string, ISorter>();
  return {
    register(sorter: ISorter): void {
      if (sorters.has(sorter.id)) {
        console.warn(`[MPS] Sorter "${sorter.id}" is already registered. Overwriting.`);
      }
      sorters.set(sorter.id, sorter);
    },
    unregister(id: string): void { sorters.delete(id); },
    getAll(): ISorter[] { return Array.from(sorters.values()); },
    get(id: string): ISorter | undefined { return sorters.get(id); },
    has(id: string): boolean { return sorters.has(id); },
    get size(): number { return sorters.size; },
  };
}

function mockSorter(id: string): ISorter {
  return { id, displayName: id, defaultDirection: 'asc' as SortDirection, sort: () => 0 };
}

describe('SortRegistry', () => {
  it('registers and retrieves sorters', () => {
    const reg = createRegistry();
    const s = mockSorter('price');
    reg.register(s);
    expect(reg.get('price')).toBe(s);
    expect(reg.has('price')).toBe(true);
    expect(reg.size).toBe(1);
  });

  it('returns undefined for unregistered sorter', () => {
    const reg = createRegistry();
    expect(reg.get('nope')).toBeUndefined();
  });

  it('unregisters sorter', () => {
    const reg = createRegistry();
    reg.register(mockSorter('price'));
    reg.unregister('price');
    expect(reg.has('price')).toBe(false);
  });

  it('getAll returns all sorters', () => {
    const reg = createRegistry();
    reg.register(mockSorter('a'));
    reg.register(mockSorter('b'));
    expect(reg.getAll()).toHaveLength(2);
  });

  it('warns on duplicate registration', () => {
    const reg = createRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reg.register(mockSorter('price'));
    reg.register(mockSorter('price'));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
