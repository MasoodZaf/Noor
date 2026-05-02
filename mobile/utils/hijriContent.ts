// Hijri-month-themed verse selection for the Daily Ayah notification.
// Each month carries a small curated pool of ayahs whose subject matter aligns
// with the month's significance. We rotate through the pool by Hijri day-of-month
// so users see different verses across the month, then loop.
//
// moment-hijri iMonth() is 0-indexed: 0=Muharram, 8=Ramadan, 11=Dhul Hijjah.
// moment-hijri iDate() is 1-indexed day-of-Hijri-month.

import moment from 'moment-hijri';

export type VerseRef = { surah: number; ayah: number };

const MONTH_VERSES: Record<number, VerseRef[]> = {
    0: [ // Muharram — sacred month, Day of Ashura, hijrah, patience
        { surah: 9,   ayah: 36  },  // Sacred months
        { surah: 2,   ayah: 155 },  // Patience under trial
        { surah: 2,   ayah: 156 },
        { surah: 2,   ayah: 157 },
        { surah: 39,  ayah: 10  },  // Reward of the patient
        { surah: 9,   ayah: 40  },  // Allah with us in the cave
        { surah: 8,   ayah: 30  },  // The hijrah
    ],
    1: [ // Safar — tawakkul, dispelling superstition
        { surah: 9,   ayah: 51  },  // Only what Allah has decreed
        { surah: 65,  ayah: 3   },  // Whoever relies on Allah, He suffices
        { surah: 11,  ayah: 6   },  // No creature whose provision is not on Allah
        { surah: 64,  ayah: 11  },  // No calamity except by Allah's permission
    ],
    2: [ // Rabi al-Awwal — Mawlid, sirah of the Prophet ﷺ
        { surah: 33,  ayah: 21  },  // The best example in Allah's Messenger
        { surah: 21,  ayah: 107 },  // Mercy to all the worlds
        { surah: 48,  ayah: 29  },  // Muhammad ﷺ is the messenger of Allah
        { surah: 33,  ayah: 56  },  // Send blessings on the Prophet
        { surah: 9,   ayah: 128 },  // A messenger from yourselves
    ],
    3: [ // Rabi al-Thani — gratitude, brotherhood
        { surah: 49,  ayah: 10  },  // Believers are but brothers
        { surah: 49,  ayah: 13  },  // Made into peoples and tribes to know
        { surah: 14,  ayah: 7   },  // If you are grateful, I will increase
        { surah: 16,  ayah: 18  },  // If you count Allah's favours…
    ],
    4: [ // Jumada al-Awwal — perseverance, time
        { surah: 11,  ayah: 115 },  // Be patient — Allah does not waste reward
        { surah: 3,   ayah: 200 },  // Be patient, persevere, stand firm
        { surah: 103, ayah: 1   },  // By time
        { surah: 103, ayah: 2   },
        { surah: 103, ayah: 3   },
    ],
    5: [ // Jumada al-Thani — striving, service
        { surah: 29,  ayah: 69  },  // Those who strive in Us — We guide them
        { surah: 47,  ayah: 7   },  // If you help Allah, He will help you
        { surah: 22,  ayah: 78  },  // Strive in Allah's cause as you ought
    ],
    6: [ // Rajab — sacred, Isra & Miʿraj, repentance
        { surah: 17,  ayah: 1   },  // Glory to Him who took His servant by night
        { surah: 39,  ayah: 53  },  // Despair not of the mercy of Allah
        { surah: 66,  ayah: 8   },  // Turn to Allah in sincere repentance
        { surah: 25,  ayah: 70  },  // Allah will replace evils with good deeds
    ],
    7: [ // Shaʿban — preparation for Ramadan
        { surah: 24,  ayah: 35  },  // The Light verse
        { surah: 2,   ayah: 183 },  // Fasting was prescribed
        { surah: 2,   ayah: 286 },  // Allah does not burden a soul beyond what it can bear
        { surah: 13,  ayah: 28  },  // In the remembrance of Allah hearts find rest
    ],
    8: [ // Ramadan — fasting, the Qurʾan, Laylat al-Qadr
        { surah: 2,   ayah: 185 },  // Ramadan, in which the Qur'an was revealed
        { surah: 2,   ayah: 186 },  // I am near, I respond
        { surah: 2,   ayah: 187 },  // Permitted at night to be with your wives
        { surah: 97,  ayah: 1   },  // We sent it down on the Night of Power
        { surah: 97,  ayah: 2   },
        { surah: 97,  ayah: 3   },
        { surah: 97,  ayah: 4   },
        { surah: 97,  ayah: 5   },
        { surah: 17,  ayah: 9   },  // This Qur'an guides to that which is most upright
        { surah: 54,  ayah: 17  },  // We have made the Qur'an easy
        { surah: 73,  ayah: 20  },  // Recite of the Qur'an what is easy
        { surah: 96,  ayah: 1   },  // Read! In the name of your Lord
    ],
    9: [ // Shawwal — six fasts, fulfilling obligations, Eid
        { surah: 5,   ayah: 1   },  // Fulfil your obligations
        { surah: 5,   ayah: 3   },  // Today I have perfected your religion
        { surah: 9,   ayah: 18  },  // The mosques of Allah are maintained by…
    ],
    10: [ // Dhul Qaʿdah — sacred, preparing for Hajj
        { surah: 22,  ayah: 27  },  // And proclaim the Hajj
        { surah: 9,   ayah: 36  },  // Sacred months
        { surah: 2,   ayah: 197 },  // The Hajj is in known months
    ],
    11: [ // Dhul Hijjah — the ten nights, Hajj, Eid al-Adha
        { surah: 89,  ayah: 1   },  // By the dawn
        { surah: 89,  ayah: 2   },  // And by ten nights
        { surah: 22,  ayah: 28  },  // That they may witness benefits for themselves
        { surah: 22,  ayah: 37  },  // Neither their flesh nor blood reaches Allah
        { surah: 2,   ayah: 196 },  // Complete the Hajj and ʿumrah for Allah
        { surah: 108, ayah: 2   },  // So pray to your Lord and sacrifice
    ],
};

// Display name for each Hijri month — surfaced in the notification title so the
// user immediately sees the contextual frame.
const MONTH_NAMES: Record<number, string> = {
    0: 'Muharram',         1: 'Safar',           2: "Rabi' al-Awwal",
    3: "Rabi' al-Thani",   4: 'Jumada al-Awwal', 5: 'Jumada al-Thani',
    6: 'Rajab',            7: "Sha'ban",         8: 'Ramadan',
    9: 'Shawwal',         10: "Dhul Qa'dah",    11: 'Dhul Hijjah',
};

/**
 * Returns the (surah, ayah) reference whose subject matches the Hijri month
 * the given Gregorian date falls in. Rotates through that month's pool by Hijri
 * day so users see fresh content each day.
 */
export function getDailyVerseForDate(date: Date): {
    surah: number;
    ayah: number;
    monthName: string;
    monthIndex: number;
} {
    const m = moment(date);
    const monthIndex = m.iMonth();
    const day = m.iDate();
    const pool = MONTH_VERSES[monthIndex];
    const monthName = MONTH_NAMES[monthIndex] ?? '';
    if (!pool || pool.length === 0) {
        // Should never happen — every month above is populated. Fall back to
        // Surah Al-Fatiha verse 1 to guarantee we always return something valid.
        return { surah: 1, ayah: 1, monthName, monthIndex };
    }
    const v = pool[(day - 1) % pool.length];
    return { surah: v.surah, ayah: v.ayah, monthName, monthIndex };
}

/** True if the given Gregorian date falls on a Friday. */
export function isFriday(date: Date): boolean {
    return date.getDay() === 5;
}

/** Returns the next Friday at hh:mm local time (today if it's Friday and time hasn't passed yet). */
export function nextFridayAt(hour: number, minute: number, from: Date = new Date()): Date {
    const d = new Date(from);
    d.setHours(hour, minute, 0, 0);
    const daysUntilFriday = (5 - d.getDay() + 7) % 7;
    if (daysUntilFriday === 0 && d.getTime() <= from.getTime()) {
        d.setDate(d.getDate() + 7);
    } else {
        d.setDate(d.getDate() + daysUntilFriday);
    }
    return d;
}
