/**
 * Language helpers — central mappings between the app's language enum,
 * SQLite translation columns, Quran.com API language codes, and Fawaz CDN
 * edition slugs. Was duplicated across search.tsx, hadith/[id].tsx, and the
 * Discover screens before consolidation.
 */

export type Language = 'english' | 'urdu' | 'indonesian' | 'french' | 'bengali' | 'turkish';

export const LANGUAGES: readonly Language[] = ['english', 'urdu', 'indonesian', 'french', 'bengali', 'turkish'];

export const LANGUAGE_DISPLAY: Record<Language, string> = {
    english: 'English',
    urdu: 'Urdu (اردو)',
    indonesian: 'Indonesian',
    french: 'Français',
    bengali: 'Bengali (বাংলা)',
    turkish: 'Türkçe',
};

/**
 * SQLite column on `ayahs` / `hadith` tables that holds the translation for
 * each language. English is the default fallback.
 */
export function translationCol(lang: Language): string {
    switch (lang) {
        case 'urdu':       return 'text_urdu';
        case 'indonesian': return 'text_ind';
        case 'french':     return 'text_fra';
        case 'bengali':    return 'text_ben';
        case 'turkish':    return 'text_tur';
        default:           return 'text_english';
    }
}

/** Two-letter code used by quran.com's `/translations` API. */
export function quranApiLang(lang: Language): string {
    switch (lang) {
        case 'urdu':       return 'ur';
        case 'indonesian': return 'id';
        case 'french':     return 'fr';
        case 'bengali':    return 'bn';
        case 'turkish':    return 'tr';
        default:           return 'en';
    }
}

/** Three-letter prefix used by Fawaz CDN edition slugs (e.g. eng-bukhari). */
export function fawazLangCode(lang: Language): string {
    switch (lang) {
        case 'urdu':       return 'urd';
        case 'indonesian': return 'ind';
        case 'french':     return 'fra';
        case 'bengali':    return 'ben';
        case 'turkish':    return 'tur';
        default:           return 'eng';
    }
}

/** True when the language is right-to-left for layout purposes. */
export function isRtl(lang: Language): boolean {
    return lang === 'urdu';
}
