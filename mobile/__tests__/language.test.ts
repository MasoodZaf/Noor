import {
    LANGUAGES,
    LANGUAGE_DISPLAY,
    translationCol,
    quranApiLang,
    fawazLangCode,
    isRtl,
    type Language,
} from '../utils/language';

describe('LANGUAGES', () => {
    it('contains exactly the 6 supported languages', () => {
        expect(LANGUAGES).toHaveLength(6);
        expect(LANGUAGES).toContain('english');
        expect(LANGUAGES).toContain('urdu');
        expect(LANGUAGES).toContain('indonesian');
        expect(LANGUAGES).toContain('french');
        expect(LANGUAGES).toContain('bengali');
        expect(LANGUAGES).toContain('turkish');
    });

    it('every language has a display label', () => {
        for (const lang of LANGUAGES) {
            expect(LANGUAGE_DISPLAY[lang]).toBeTruthy();
        }
    });

    it('Urdu and Bengali display labels include native script', () => {
        expect(LANGUAGE_DISPLAY.urdu).toMatch(/اردو/);
        expect(LANGUAGE_DISPLAY.bengali).toMatch(/বাংলা/);
    });
});

describe('translationCol', () => {
    it('returns the canonical column name for each language', () => {
        expect(translationCol('english')).toBe('text_english');
        expect(translationCol('urdu')).toBe('text_urdu');
        expect(translationCol('indonesian')).toBe('text_ind');
        expect(translationCol('french')).toBe('text_fra');
        expect(translationCol('bengali')).toBe('text_ben');
        expect(translationCol('turkish')).toBe('text_tur');
    });

    it('falls back to text_english for unknown languages (defensive)', () => {
        expect(translationCol('klingon' as Language)).toBe('text_english');
    });
});

describe('quranApiLang', () => {
    it('returns 2-letter codes used by quran.com', () => {
        expect(quranApiLang('english')).toBe('en');
        expect(quranApiLang('urdu')).toBe('ur');
        expect(quranApiLang('indonesian')).toBe('id');
        expect(quranApiLang('french')).toBe('fr');
        expect(quranApiLang('bengali')).toBe('bn');
        expect(quranApiLang('turkish')).toBe('tr');
    });
});

describe('fawazLangCode', () => {
    it('returns 3-letter codes used by Fawaz CDN edition slugs', () => {
        expect(fawazLangCode('english')).toBe('eng');
        expect(fawazLangCode('urdu')).toBe('urd');
        expect(fawazLangCode('indonesian')).toBe('ind');
        expect(fawazLangCode('french')).toBe('fra');
        expect(fawazLangCode('bengali')).toBe('ben');
        expect(fawazLangCode('turkish')).toBe('tur');
    });

    it('all codes are exactly 3 characters', () => {
        for (const lang of LANGUAGES) {
            expect(fawazLangCode(lang)).toHaveLength(3);
        }
    });
});

describe('isRtl', () => {
    it('returns true for Urdu', () => {
        expect(isRtl('urdu')).toBe(true);
    });

    it('returns false for LTR languages', () => {
        expect(isRtl('english')).toBe(false);
        expect(isRtl('indonesian')).toBe(false);
        expect(isRtl('french')).toBe(false);
        expect(isRtl('bengali')).toBe(false);
        expect(isRtl('turkish')).toBe(false);
    });
});
