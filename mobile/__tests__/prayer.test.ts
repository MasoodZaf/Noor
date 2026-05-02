import {
    methodForCountry,
    nextPrayer,
    formatTimeUntil,
    isSameDay,
    DEFAULT_METHOD,
    COUNTRY_METHODS,
    type PrayerTime,
} from '../utils/prayer';

describe('methodForCountry', () => {
    it('returns Karachi/Hanafi for South Asian countries', () => {
        expect(methodForCountry('PK')).toEqual({ method: 1, school: 1 });
        expect(methodForCountry('IN')).toEqual({ method: 1, school: 1 });
        expect(methodForCountry('BD')).toEqual({ method: 1, school: 1 });
    });

    it('returns ISNA for North America', () => {
        expect(methodForCountry('US')).toEqual({ method: 2, school: 0 });
        expect(methodForCountry('CA')).toEqual({ method: 2, school: 0 });
    });

    it('returns Umm al-Qura for Saudi Arabia', () => {
        expect(methodForCountry('SA')).toEqual({ method: 4, school: 0 });
    });

    it('handles lowercase input', () => {
        expect(methodForCountry('pk')).toEqual({ method: 1, school: 1 });
    });

    it('falls back to MWL/Standard for unknown countries', () => {
        expect(methodForCountry('XX')).toEqual(DEFAULT_METHOD);
        expect(methodForCountry('')).toEqual(DEFAULT_METHOD);
    });

    it('handles null/undefined input', () => {
        expect(methodForCountry(null)).toEqual(DEFAULT_METHOD);
        expect(methodForCountry(undefined)).toEqual(DEFAULT_METHOD);
    });
});

describe('COUNTRY_METHODS', () => {
    it('every entry has a valid method (0-15) and school (0 or 1)', () => {
        for (const [iso, m] of Object.entries(COUNTRY_METHODS)) {
            expect(iso).toMatch(/^[A-Z]{2}$/);
            expect(m.method).toBeGreaterThanOrEqual(0);
            expect(m.method).toBeLessThanOrEqual(15);
            expect([0, 1]).toContain(m.school);
        }
    });

    it('is frozen to prevent accidental mutation', () => {
        expect(Object.isFrozen(COUNTRY_METHODS)).toBe(true);
    });
});

describe('nextPrayer', () => {
    const morning = (h: number, m = 0) => new Date(2026, 4, 2, h, m, 0);
    const prayers: PrayerTime[] = [
        { name: 'Fajr',    time: morning(5, 15) },
        { name: 'Dhuhr',   time: morning(12, 30) },
        { name: 'Asr',     time: morning(15, 45) },
        { name: 'Maghrib', time: morning(18, 50) },
        { name: 'Isha',    time: morning(20, 10) },
    ];

    it('returns Fajr at midnight', () => {
        expect(nextPrayer(prayers, morning(0, 30))?.name).toBe('Fajr');
    });

    it('returns Dhuhr after Fajr', () => {
        expect(nextPrayer(prayers, morning(8, 0))?.name).toBe('Dhuhr');
    });

    it('returns Maghrib after Asr', () => {
        expect(nextPrayer(prayers, morning(17, 0))?.name).toBe('Maghrib');
    });

    it('returns null after Isha (caller falls back to tomorrow Fajr)', () => {
        expect(nextPrayer(prayers, morning(23, 0))).toBeNull();
    });

    it('handles empty prayer list', () => {
        expect(nextPrayer([], morning(8, 0))).toBeNull();
    });
});

describe('formatTimeUntil', () => {
    it('formats hours and minutes', () => {
        expect(formatTimeUntil(2 * 60 * 60 * 1000 + 35 * 60 * 1000)).toBe('2h 35m');
    });

    it('formats just minutes when under an hour', () => {
        expect(formatTimeUntil(45 * 60 * 1000)).toBe('45m');
    });

    it('returns "Now" for zero or negative time', () => {
        expect(formatTimeUntil(0)).toBe('Now');
        expect(formatTimeUntil(-1000)).toBe('Now');
    });

    it('rounds down to the minute', () => {
        expect(formatTimeUntil(59_999)).toBe('0m');
        expect(formatTimeUntil(60_000)).toBe('1m');
    });
});

describe('isSameDay', () => {
    it('true for two times on the same date', () => {
        expect(isSameDay(new Date('2026-05-02T01:00'), new Date('2026-05-02T23:59'))).toBe(true);
    });

    it('false across midnight', () => {
        expect(isSameDay(new Date('2026-05-02T23:59'), new Date('2026-05-03T00:01'))).toBe(false);
    });

    it('false for same day-of-month but different month/year', () => {
        expect(isSameDay(new Date('2026-05-02'), new Date('2026-04-02'))).toBe(false);
        expect(isSameDay(new Date('2026-05-02'), new Date('2025-05-02'))).toBe(false);
    });
});
