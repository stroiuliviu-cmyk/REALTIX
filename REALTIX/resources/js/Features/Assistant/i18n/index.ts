// resources/js/Features/Assistant/i18n/index.ts
//
// Agregă dicționarele RO/RU. `ro` definește setul canonic de chei.

import type { Language } from '../types';
import { ro } from './ro';
import { ru } from './ru';

export type TranslationKey = keyof typeof ro;

export const translations: Record<Language, Record<TranslationKey, string>> = {
  ro,
  ru,
};

/** Traduce o cheie în limba dată, cu fallback pe RO, apoi pe cheia însăși. */
export function translate(language: Language, key: TranslationKey): string {
  return translations[language][key] ?? translations.ro[key] ?? key;
}

/** Sugestiile (prompt-uri) din ecranul gol — copie UI, nu „date". */
export const SUGGESTIONS: Record<Language, string[]> = {
  ro: [
    'Apartament 2 camere în Buiucani sub 60.000 €',
    'Casă de închiriat lângă Chișinău',
    'Garsonieră în Centru, gata de mutat',
    'Apartament nou în Telecentru cu parcare',
    'Arată-mi agenții imobiliare',
  ],
  ru: [
    '2-комнатная в Буюканах до 60 000 €',
    'Дом в аренду рядом с Кишинёвом',
    'Студия в Центре, под заселение',
    'Новая квартира в Телецентре с парковкой',
    'Покажи агентства недвижимости',
  ],
};
