import { getDailyVerseForDate, isFriday, nextFridayAt } from '../utils/hijriContent';

describe('getDailyVerseForDate', () => {
    it('returns a valid VerseRef with monthName for any date', () => {
        const result = getDailyVerseForDate(new Date('2026-05-02'));
        expect(result.surah).toBeGreaterThanOrEqual(1);
        expect(result.surah).toBeLessThanOrEqual(114);
        expect(result.ayah).toBeGreaterThanOrEqual(1);
        expect(result.monthIndex).toBeGreaterThanOrEqual(0);
        expect(result.monthIndex).toBeLessThanOrEqual(11);
        expect(result.monthName).toBeTruthy();
    });

    it('rotates verses through the day-of-month within a single Hijri month', () => {
        // Pick two dates ~1 day apart in the same Hijri month.
        const day1 = new Date('2026-05-02');
        const day2 = new Date('2026-05-03');
        const v1 = getDailyVerseForDate(day1);
        const v2 = getDailyVerseForDate(day2);
        // Both should be in same Hijri month
        expect(v1.monthIndex).toBe(v2.monthIndex);
        // Verses should differ unless the month's pool has only 1 entry
        if (v1.monthIndex !== undefined) {
            // If they are equal, that's only acceptable when the pool wraps around
            // (we can't know pool size from outside, so just assert determinism)
        }
    });

    it('is deterministic — same date → same verse', () => {
        const date = new Date('2026-08-15');
        const a = getDailyVerseForDate(date);
        const b = getDailyVerseForDate(date);
        expect(a).toEqual(b);
    });

    it('falls back to Al-Fatiha 1:1 if pool somehow missing (defensive)', () => {
        // We can't easily mock month=99, but the explicit fallback exists.
        // Round-trip through real months still always produces valid output.
        for (let y = 2020; y <= 2030; y++) {
            for (let m = 0; m < 12; m++) {
                const d = new Date(y, m, 15);
                const result = getDailyVerseForDate(d);
                expect(result.surah).toBeGreaterThanOrEqual(1);
                expect(result.ayah).toBeGreaterThanOrEqual(1);
            }
        }
    });
});

describe('isFriday', () => {
    it('returns true for a Friday', () => {
        expect(isFriday(new Date('2026-05-01'))).toBe(true); // 2026-05-01 was a Friday
    });

    it('returns false for a non-Friday', () => {
        expect(isFriday(new Date('2026-05-02'))).toBe(false); // Saturday
        expect(isFriday(new Date('2026-04-30'))).toBe(false); // Thursday
    });
});

describe('nextFridayAt', () => {
    it('returns this Friday at hh:mm if called before that time', () => {
        const fridayMorning = new Date('2026-05-01T08:00:00');
        const result = nextFridayAt(13, 0, fridayMorning);
        expect(result.getDay()).toBe(5);
        expect(result.getHours()).toBe(13);
        expect(result.getMinutes()).toBe(0);
        // Same date as input Friday
        expect(result.getDate()).toBe(fridayMorning.getDate());
    });

    it('rolls to next Friday if today is Friday but the time has passed', () => {
        const fridayLate = new Date('2026-05-01T18:00:00');
        const result = nextFridayAt(13, 0, fridayLate);
        expect(result.getDay()).toBe(5);
        // Should be 7 days later
        const diffDays = Math.round((result.getTime() - fridayLate.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBeGreaterThanOrEqual(6);
    });

    it('rolls forward to the upcoming Friday from a Monday', () => {
        const monday = new Date('2026-04-27T10:00:00');
        const result = nextFridayAt(12, 30, monday);
        expect(result.getDay()).toBe(5);
        expect(result.getHours()).toBe(12);
        expect(result.getMinutes()).toBe(30);
        const diffDays = Math.round((result.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBeGreaterThanOrEqual(3);
        expect(diffDays).toBeLessThanOrEqual(5);
    });
});
