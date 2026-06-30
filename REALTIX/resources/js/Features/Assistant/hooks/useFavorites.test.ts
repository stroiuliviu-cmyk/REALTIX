// resources/js/Features/Assistant/hooks/useFavorites.test.ts

import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import type { ListingCard } from '../types';

const cardA: ListingCard = {
  id: 'rt-1', source: 'internal', title: 'A', dealType: 'sale',
  propertyType: 'apartment', price: 50000, currency: 'EUR', city: 'Chișinău',
  url: '/properties/rt-1', isExternal: false,
};
const cardB: ListingCard = {
  id: 'rt-2', source: 'external', title: 'B', dealType: 'rent',
  propertyType: 'apartment', price: 400, currency: 'EUR', city: 'Chișinău',
  url: '/properties/rt-2', isExternal: true,
};

describe('useFavorites', () => {
  beforeEach(() => window.localStorage.clear());

  it('adaugă, scoate și deduplică după (source,id)', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggle(cardA));
    expect(result.current.count).toBe(1);
    expect(result.current.isFavorite('rt-1', 'internal')).toBe(true);

    // toggle din nou scoate
    act(() => result.current.toggle(cardA));
    expect(result.current.count).toBe(0);

    act(() => {
      result.current.toggle(cardA);
      result.current.toggle(cardB);
    });
    expect(result.current.count).toBe(2);

    act(() => result.current.remove('rt-1', 'internal'));
    expect(result.current.count).toBe(1);
    expect(result.current.isFavorite('rt-1', 'internal')).toBe(false);
    expect(result.current.isFavorite('rt-2', 'external')).toBe(true);
  });

  it('persistă între reload-uri (localStorage)', () => {
    const first = renderHook(() => useFavorites());
    act(() => first.result.current.toggle(cardB));
    expect(first.result.current.count).toBe(1);

    // „reload": un nou mount citește din localStorage
    const second = renderHook(() => useFavorites());
    expect(second.result.current.count).toBe(1);
    expect(second.result.current.isFavorite('rt-2', 'external')).toBe(true);
  });
});
