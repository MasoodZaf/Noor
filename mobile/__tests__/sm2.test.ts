import { applySM2, newHifzEntry, isDue, toIsoDate, MIN_EASE_FACTOR, type HifzEntry } from '../utils/sm2';

const FIXED_NOW = new Date('2026-05-02T12:00:00');

const baseSurah = {
    number: 67,
    name_english: 'Al-Mulk',
    name_arabic: 'الملك',
    ayah_count: 30,
};

describe('newHifzEntry', () => {
    it('creates a fresh entry due today', () => {
        const e = newHifzEntry(baseSurah, FIXED_NOW);
        expect(e.surahId).toBe(67);
        expect(e.repetitions).toBe(0);
        expect(e.interval).toBe(0);
        expect(e.easeFactor).toBe(2.5);
        expect(e.status).toBe('learning');
        expect(e.nextReview).toBe('2026-05-02');
        expect(e.lastReview).toBeNull();
        expect(e.addedAt).toBe('2026-05-02');
    });
});

describe('applySM2 — first review', () => {
    it('quality 4 (Good) on a fresh entry → interval 1, reps 1', () => {
        const e = newHifzEntry(baseSurah, FIXED_NOW);
        const next = applySM2(e, 4, FIXED_NOW);
        expect(next.repetitions).toBe(1);
        expect(next.interval).toBe(1);
        expect(next.nextReview).toBe('2026-05-03');
        expect(next.status).toBe('learning');
    });

    it('quality 5 (Easy) on a fresh entry → ease bumps up', () => {
        const e = newHifzEntry(baseSurah, FIXED_NOW);
        const next = applySM2(e, 5, FIXED_NOW);
        expect(next.easeFactor).toBeGreaterThan(2.5);
        expect(next.repetitions).toBe(1);
    });

    it('quality 3 (Hard) on a fresh entry → ease drifts down but stays ≥ 1.3', () => {
        const e = newHifzEntry(baseSurah, FIXED_NOW);
        const next = applySM2(e, 3, FIXED_NOW);
        expect(next.easeFactor).toBeLessThan(2.5);
        expect(next.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
    });

    it('quality 0 (Again) → interval resets to 1, reps to 0, status needs_review', () => {
        const e: HifzEntry = { ...newHifzEntry(baseSurah, FIXED_NOW), repetitions: 5, interval: 30 };
        const next = applySM2(e, 0, FIXED_NOW);
        expect(next.repetitions).toBe(0);
        expect(next.interval).toBe(1);
        expect(next.status).toBe('needs_review');
    });
});

describe('applySM2 — interval growth', () => {
    it('second successful review goes from interval 1 → 6', () => {
        let e = newHifzEntry(baseSurah, FIXED_NOW);
        e = applySM2(e, 4, FIXED_NOW); // first review
        const second = applySM2(e, 4, FIXED_NOW);
        expect(second.repetitions).toBe(2);
        expect(second.interval).toBe(6);
    });

    it('third successful review uses easeFactor multiplier', () => {
        let e = newHifzEntry(baseSurah, FIXED_NOW);
        e = applySM2(e, 4, FIXED_NOW);
        e = applySM2(e, 4, FIXED_NOW);
        const third = applySM2(e, 4, FIXED_NOW);
        expect(third.repetitions).toBe(3);
        expect(third.interval).toBeGreaterThanOrEqual(13);
        expect(third.interval).toBeLessThanOrEqual(16);
    });

    it('long streak of Easy ratings reaches memorized status', () => {
        let e = newHifzEntry(baseSurah, FIXED_NOW);
        for (let i = 0; i < 5; i++) e = applySM2(e, 5, FIXED_NOW);
        expect(e.status).toBe('memorized');
        expect(e.repetitions).toBeGreaterThanOrEqual(4);
        expect(e.interval).toBeGreaterThanOrEqual(21);
    });

    it('does NOT mark memorized at fewer than 4 reps even with large interval', () => {
        const fakeEntry: HifzEntry = {
            ...newHifzEntry(baseSurah, FIXED_NOW),
            repetitions: 2,
            interval: 30,
            easeFactor: 2.6,
        };
        const next = applySM2(fakeEntry, 4, FIXED_NOW);
        expect(next.repetitions).toBe(3);
        expect(next.status).toBe('learning');
    });
});

describe('applySM2 — easeFactor floor', () => {
    it('repeated Hard ratings clamp ease at 1.3', () => {
        let e = newHifzEntry(baseSurah, FIXED_NOW);
        for (let i = 0; i < 30; i++) e = applySM2(e, 3, FIXED_NOW);
        expect(e.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
        // Should hit the floor exactly after enough Hard reps
        expect(e.easeFactor).toBeCloseTo(MIN_EASE_FACTOR, 2);
    });
});

describe('applySM2 — does not mutate input', () => {
    it('input entry is unchanged after applySM2', () => {
        const e = newHifzEntry(baseSurah, FIXED_NOW);
        const snapshot = JSON.stringify(e);
        applySM2(e, 5, FIXED_NOW);
        expect(JSON.stringify(e)).toBe(snapshot);
    });
});

describe('isDue', () => {
    it('returns true when nextReview is today', () => {
        const e: HifzEntry = { ...newHifzEntry(baseSurah, FIXED_NOW) };
        expect(isDue(e, FIXED_NOW)).toBe(true);
    });

    it('returns true when nextReview is in the past', () => {
        const e: HifzEntry = { ...newHifzEntry(baseSurah, FIXED_NOW), nextReview: '2026-04-01' };
        expect(isDue(e, FIXED_NOW)).toBe(true);
    });

    it('returns false when nextReview is in the future', () => {
        const e: HifzEntry = { ...newHifzEntry(baseSurah, FIXED_NOW), nextReview: '2026-12-25' };
        expect(isDue(e, FIXED_NOW)).toBe(false);
    });
});

describe('toIsoDate', () => {
    it('formats Date as YYYY-MM-DD', () => {
        expect(toIsoDate(new Date('2026-05-02T15:30:00'))).toBe('2026-05-02');
    });
});
