import { QURAN_API, FAWAZ_HADITH, FAWAZ_QURAN, ALADHAN_API, ALQURAN_CLOUD_API, QURANI_BASE, STORAGE_KEYS } from '../utils/apis';

describe('API endpoints', () => {
    it('Quran.com v4 endpoint matches the documented base URL', () => {
        expect(QURAN_API).toBe('https://api.quran.com/api/v4');
    });

    it('Fawaz hadith CDN points to the @1 tag', () => {
        expect(FAWAZ_HADITH).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/fawazahmed0\/hadith-api@1$/);
    });

    it('Fawaz quran CDN points to the @1 tag', () => {
        expect(FAWAZ_QURAN).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/gh\/fawazahmed0\/quran-api@1$/);
    });

    it('AlAdhan v1 endpoint is HTTPS', () => {
        expect(ALADHAN_API).toMatch(/^https:\/\//);
    });

    it('AlQuran Cloud v1 endpoint is HTTPS', () => {
        expect(ALQURAN_CLOUD_API).toMatch(/^https:\/\//);
    });

    it('Qurani.ai gateway endpoint is HTTPS', () => {
        expect(QURANI_BASE).toMatch(/^https:\/\/api\.qurani\.ai/);
    });

    it('all endpoints use HTTPS', () => {
        const endpoints = [QURAN_API, FAWAZ_HADITH, FAWAZ_QURAN, ALADHAN_API, ALQURAN_CLOUD_API, QURANI_BASE];
        for (const url of endpoints) {
            expect(url.startsWith('https://')).toBe(true);
        }
    });
});

describe('STORAGE_KEYS', () => {
    it('does not have duplicate keys (would cause cross-feature data overwrite)', () => {
        const values = Object.values(STORAGE_KEYS);
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
    });

    it('every key starts with @ (AsyncStorage convention)', () => {
        for (const v of Object.values(STORAGE_KEYS)) {
            expect(v.startsWith('@')).toBe(true);
        }
    });

    it('preserves legacy unprefixed keys for existing user data compatibility', () => {
        // These keys don't have the @noor/ prefix — keeping them stable preserves
        // bookmarks/settings users already have in AsyncStorage on their devices.
        expect(STORAGE_KEYS.prayerSettings).toBe('@prayer_settings');
        expect(STORAGE_KEYS.duaBookmarks).toBe('@dua_bookmarks');
        expect(STORAGE_KEYS.hifzEntries).toBe('@hifz_entries');
    });
});
