/**
 * SM-2 spaced-repetition algorithm — used by the Hifz tracker to schedule
 * surah review intervals based on the user's self-rated recall quality.
 *
 * Quality ratings:
 *   0 = Again (failed — start over)
 *   3 = Hard
 *   4 = Good
 *   5 = Easy
 *
 * On any rating < 3, the interval resets to 1 day; otherwise the interval
 * grows: 1d → 6d → previousInterval × easeFactor. The easeFactor itself
 * drifts up on Easy ratings and down on Hard ones, with a floor of 1.3.
 *
 * "Memorized" status is granted only after at least 4 successful repetitions
 * AND the interval has grown to ≥21 days — both conditions catch surahs that
 * just got lucky on a couple of recent reviews.
 */

export type Quality = 0 | 3 | 4 | 5;

export type HifzStatus = 'learning' | 'memorized' | 'needs_review';

export interface HifzEntry {
    surahId: number;
    surahName: string;
    arabicName: string;
    totalAyahs: number;
    status: HifzStatus;
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string; // YYYY-MM-DD
    lastReview: string | null;
    addedAt: string; // YYYY-MM-DD
}

export const MEMORIZED_REPS = 4;
export const MEMORIZED_INTERVAL_DAYS = 21;
export const MIN_EASE_FACTOR = 1.3;

/**
 * Returns a NEW entry with updated SM-2 fields. Pure — does not mutate input
 * and uses an injectable `now` for deterministic tests.
 */
export function applySM2(
    entry: HifzEntry,
    quality: Quality,
    now: Date = new Date()
): HifzEntry {
    const { easeFactor, interval, repetitions } = entry;
    const newEF = Math.max(MIN_EASE_FACTOR, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    let newInterval: number;
    let newReps: number;

    if (quality < 3) {
        newReps = 0;
        newInterval = 1;
    } else {
        newReps = repetitions + 1;
        if (repetitions === 0) newInterval = 1;
        else if (repetitions === 1) newInterval = 6;
        else newInterval = Math.round(interval * newEF);
    }

    const next = new Date(now);
    next.setDate(next.getDate() + newInterval);

    const status: HifzStatus =
        quality < 3 ? 'needs_review' :
        newReps >= MEMORIZED_REPS && newInterval >= MEMORIZED_INTERVAL_DAYS ? 'memorized' :
        'learning';

    return {
        ...entry,
        easeFactor: newEF,
        interval: newInterval,
        repetitions: newReps,
        nextReview: toIsoDate(next),
        lastReview: toIsoDate(now),
        status,
    };
}

/** A fresh entry — interval 0, no reviews yet, due today. */
export function newHifzEntry(
    surah: { number: number; name_english: string; name_arabic: string; ayah_count: number },
    now: Date = new Date()
): HifzEntry {
    const today = toIsoDate(now);
    return {
        surahId: surah.number,
        surahName: surah.name_english,
        arabicName: surah.name_arabic,
        totalAyahs: surah.ayah_count,
        status: 'learning',
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: today,
        lastReview: null,
        addedAt: today,
    };
}

export function toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

/** True if the given entry's next review is today or earlier. */
export function isDue(entry: HifzEntry, now: Date = new Date()): boolean {
    return entry.nextReview <= toIsoDate(now);
}
