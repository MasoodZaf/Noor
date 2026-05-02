/**
 * Central API endpoints — single source of truth for all external services.
 * Was previously duplicated across 5+ screens; consolidated to prevent drift.
 */

export const QURAN_API = 'https://api.quran.com/api/v4';
export const ALQURAN_CLOUD_API = 'https://api.alquran.cloud/v1';
export const FAWAZ_HADITH = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';
export const FAWAZ_QURAN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';
export const ALADHAN_API = 'https://api.aladhan.com/v1';
export const QURANI_BASE = 'https://api.qurani.ai/gw/qh/v1';

/**
 * Central AsyncStorage keys — every persisted user state lives here.
 * Naming convention: `@noor/<domain>_<purpose>` for new keys; legacy keys
 * (without prefix) are preserved as-is to keep existing user data readable.
 */
export const STORAGE_KEYS = {
    // Prayer / Salah
    prayerSettings: '@prayer_settings',
    notifPrefs: '@noor/notif_prefs',
    // Hifz tracker — SM-2 spaced repetition entries
    hifzEntries: '@hifz_entries',
    // Bookmarks
    duaBookmarks: '@dua_bookmarks',
    hadithBookmarks: '@noor/hadith_bookmarks',
    // Hijri / daily content
    dailyAyahCache: '@noor/daily_ayah_cache',
    // Ramadan
    ramadanNotifPref: '@noor/ramadan_notif',
    // Qibla
    qiblaCache: '@noor/qibla_cache',
} as const;
