import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useSort<T extends Record<string, any>>(data: T[], defaultKey?: string) {
  const [sort, setSort] = useState<SortConfig>({ key: defaultKey || '', direction: 'asc' });

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  const toggleSort = (key: string) => {
    setSort(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
    );
  };

  const getSortIcon = (key: string): string => {
    if (sort.key !== key) return '\u25B2';
    return sort.direction === 'asc' ? '\u25B2' : '\u25BC';
  };

  return { sorted, sort, toggleSort, getSortIcon };
}
