// resources/js/Features/Assistant/hooks/useFavorites.ts
//
// Favorite locale, persistate în localStorage ('realtix_favorites').
// La Faza C se înlocuiește cu API-ul real, păstrând aceeași interfață.

import { useCallback, useEffect, useState } from 'react';
import type { ListingCard, ListingSource } from '../types';

const FAV_KEY = 'realtix_favorites';

/** Cheie de unicitate: un obiect o singură dată, indiferent de sursă. */
const keyOf = (id: string, source: ListingSource): string => `${source}:${id}`;

function readFavorites(): ListingCard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ListingCard[]) : [];
  } catch {
    return [];
  }
}

export interface UseFavorites {
  favorites: ListingCard[];
  count: number;
  isFavorite: (id: string, source: ListingSource) => boolean;
  toggle: (card: ListingCard) => void;
  remove: (id: string, source: ListingSource) => void;
}

export function useFavorites(): UseFavorites {
  const [favorites, setFavorites] = useState<ListingCard[]>(readFavorites);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch {
      // stocare indisponibilă / quota plină — ignorăm
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (id: string, source: ListingSource): boolean =>
      favorites.some((f) => keyOf(f.id, f.source) === keyOf(id, source)),
    [favorites],
  );

  const toggle = useCallback((card: ListingCard): void => {
    setFavorites((prev) => {
      const k = keyOf(card.id, card.source);
      const exists = prev.some((f) => keyOf(f.id, f.source) === k);
      return exists ? prev.filter((f) => keyOf(f.id, f.source) !== k) : [...prev, card];
    });
  }, []);

  const remove = useCallback((id: string, source: ListingSource): void => {
    const k = keyOf(id, source);
    setFavorites((prev) => prev.filter((f) => keyOf(f.id, f.source) !== k));
  }, []);

  return { favorites, count: favorites.length, isFavorite, toggle, remove };
}
