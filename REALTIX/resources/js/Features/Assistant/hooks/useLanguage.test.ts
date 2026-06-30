// resources/js/Features/Assistant/hooks/useLanguage.test.ts

import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLanguage } from './useLanguage';

describe('useLanguage', () => {
  beforeEach(() => window.localStorage.clear());

  it('default RO, comută RO/RU și t() întoarce textele corecte', () => {
    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe('ro');
    expect(result.current.t('btn.favorite')).toBe('Favorit');

    act(() => result.current.toggle());
    expect(result.current.language).toBe('ru');
    expect(result.current.t('btn.favorite')).toBe('В избранное');

    act(() => result.current.setLanguage('ro'));
    expect(result.current.language).toBe('ro');
    expect(result.current.t('btn.contact')).toBe('Contactează');
  });

  it('persistă limba între reload-uri (localStorage)', () => {
    const first = renderHook(() => useLanguage());
    act(() => first.result.current.setLanguage('ru'));

    const second = renderHook(() => useLanguage());
    expect(second.result.current.language).toBe('ru');
  });
});
