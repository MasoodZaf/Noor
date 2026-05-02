/**
 * Prayer-time helpers — pure logic extracted from app/(tabs)/index/index.tsx
 * so it can be unit-tested without pulling in the whole Home screen.
 *
 * Key responsibilities:
 *   • Map ISO country codes to AlAdhan calculation method + Madhab (Asr school).
 *   • Identify the next prayer in a sorted timing set.
 *   • Compute time-until-prayer for the home screen ticker.
 */

export interface PrayerMethod {
    method: number;   // AlAdhan method ID (0=Shia Ithna-Ashari, 1=Karachi, 2=NA, etc.)
    school: number;   // 0=Standard, 1=Hanafi (Asr ruling)
}

export const DEFAULT_METHOD: PrayerMethod = { method: 3, school: 0 }; // MWL, Shafi/Standard

/**
 * Country → method/school. Sourced from the COUNTRY_METHODS table on the
 * Home screen. ISO code is uppercase 2-letter (`PK`, `US`, etc.). Lookup is
 * case-insensitive at the call site via toUpperCase.
 */
export const COUNTRY_METHODS: Readonly<Record<string, PrayerMethod>> = Object.freeze({
    // South Asia — Hanafi madhab + Karachi method
    PK: { method: 1, school: 1 }, // Pakistan
    IN: { method: 1, school: 1 }, // India
    BD: { method: 1, school: 1 }, // Bangladesh
    AF: { method: 1, school: 1 }, // Afghanistan
    LK: { method: 1, school: 1 }, // Sri Lanka
    NP: { method: 1, school: 1 }, // Nepal

    // Middle East
    SA: { method: 4, school: 0 }, // Saudi Arabia (Umm al-Qura)
    AE: { method: 8, school: 0 }, // UAE (Gulf Region)
    KW: { method: 9, school: 0 }, // Kuwait
    QA: { method: 10, school: 0 }, // Qatar
    EG: { method: 5, school: 0 }, // Egypt
    JO: { method: 5, school: 0 }, // Jordan
    PS: { method: 5, school: 0 }, // Palestine
    SY: { method: 5, school: 0 }, // Syria
    IR: { method: 7, school: 0 }, // Iran (Tehran)
    TR: { method: 13, school: 1 }, // Turkey (Diyanet, Hanafi)

    // North America
    US: { method: 2, school: 0 }, // ISNA
    CA: { method: 2, school: 0 },

    // Europe
    GB: { method: 3, school: 0 }, // MWL
    FR: { method: 12, school: 0 }, // UOIF
    DE: { method: 3, school: 0 },

    // Southeast Asia
    ID: { method: 11, school: 0 }, // Indonesia (Kemenag, Shafi)
    MY: { method: 11, school: 0 }, // Malaysia
    SG: { method: 11, school: 0 }, // Singapore
});

/** Resolve country code → prayer method, falling back to MWL Standard. */
export function methodForCountry(isoCode: string | null | undefined): PrayerMethod {
    if (!isoCode) return DEFAULT_METHOD;
    return COUNTRY_METHODS[isoCode.toUpperCase()] ?? DEFAULT_METHOD;
}

export interface PrayerTime {
    name: string;
    time: Date;
}

/**
 * Pick the next upcoming prayer from a sorted list (Fajr → Isha).
 * If all of today's prayers have passed, returns null — caller should fall
 * back to tomorrow's Fajr.
 */
export function nextPrayer(prayers: PrayerTime[], now: Date = new Date()): PrayerTime | null {
    const t = now.getTime();
    return prayers.find(p => p.time.getTime() > t) ?? null;
}

/**
 * Format ms remaining as "Hh Mm" (or "Mm" if under an hour). Returns "Now"
 * for non-positive values.
 */
export function formatTimeUntil(ms: number): string {
    if (ms <= 0) return 'Now';
    const totalMin = Math.floor(ms / 60_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

/** True if a Date falls on the same calendar day as the reference. */
export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
