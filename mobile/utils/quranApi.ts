// Quran.com v4 API client helpers. Base URL lives in utils/apis.ts.

import { QURAN_API } from './apis';

const PAGE_SIZE = 50; // Quran.com v4 hard cap

/**
 * Quran.com v4 caps `per_page` at 50 — long surahs (Al-Baqarah/286,
 * Ash-Shu'ara/227, Al-A'raf/206, …) silently lose ayahs past #50. Loop until
 * we either reach `meta.total_count` or get a short page.
 *
 * Why two break conditions: `total > 0 && allVerses.length >= total` is the
 * primary signal, but if the response omits the count (it occasionally does),
 * we fall back to "page returned less than PAGE_SIZE" so we never break the
 * loop on a zero-total reading the first 50 verses as the whole surah.
 */
export async function fetchAllSurahVerses(
    surahId: number,
    reciterId: number,
    signal?: AbortSignal,
): Promise<any[]> {
    let page = 1;
    let allVerses: any[] = [];
    while (true) {
        const res = await fetch(
            `${QURAN_API}/verses/by_chapter/${surahId}?words=true&word_fields=text_uthmani&fields=text_uthmani&audio=${reciterId}&per_page=${PAGE_SIZE}&page=${page}`,
            { signal }
        );
        if (!res.ok) throw new Error(`Quran.com ${res.status}`);
        const json = await res.json();
        const verses: any[] = json.verses || [];
        allVerses = allVerses.concat(verses);
        const total = Number(json.meta?.total_count ?? json.pagination?.total_records ?? 0);
        if (total > 0 && allVerses.length >= total) break;
        if (verses.length < PAGE_SIZE) break;
        page++;
        if (page > 20) break; // safety: longest surah Al-Baqarah needs 6 pages at 50/page
    }
    return allVerses;
}
