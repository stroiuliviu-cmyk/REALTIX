// resources/js/Features/Assistant/hooks/useLanguage.ts
//
// Limba curentă a interfeței (RO/RU), persistată în localStorage ('realtix_lang').

import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../types';
import { translate, type TranslationKey } from '../i18n';

const LANG_KEY = 'realtix_lang';

function readLanguage(): Language {
  if (typeof window === 'undefined') return 'ro';
  return window.localStorage.getItem(LANG_KEY) === 'ru' ? 'ru' : 'ro';
}

export interface UseLanguage {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

export function useLanguage(): UseLanguage {
  const [language, setLanguageState] = useState<Language>(readLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, language);
    } catch {
      // stocare indisponibilă — ignorăm
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language): void => setLanguageState(lang), []);

  const toggle = useCallback(
    (): void => setLanguageState((prev) => (prev === 'ro' ? 'ru' : 'ro')),
    [],
  );

  const t = useCallback((key: TranslationKey): string => translate(language, key), [language]);

  return { language, setLanguage, toggle, t };
}
