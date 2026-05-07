/**
 * On-demand text translation with AsyncStorage caching.
 *
 * Used as a fallback for non-English / non-Urdu languages on datasets that
 * only ship vetted EN + UR translations (currently: Duas). For Quran/Hadith
 * we use Fawaz CDN editions instead — see utils/language.ts.
 *
 * Strategy:
 *   1. Hash(text + lang) → AsyncStorage cache hit → return immediately.
 *   2. Cache miss → call Google Translate's free web endpoint (no key).
 *   3. Persist result. On any failure, return the source text unchanged.
 *
 * After first view per language, results are offline. The endpoint can
 * rate-limit; callers should treat translation as best-effort.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { quranApiLang, type Language } from './language';

const CACHE_PREFIX = '@noor/tr_';

function hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

function cacheKey(text: string, langCode: string): string {
    return `${CACHE_PREFIX}${langCode}_${hash(text)}`;
}

export async function translateText(source: string, language: Language): Promise<string> {
    if (!source) return source;
    const code = quranApiLang(language);
    if (code === 'en') return source;

    const key = cacheKey(source, code);
    try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) return cached;
    } catch { /* ignore cache read errors */ }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${code}&dt=t&q=${encodeURIComponent(source)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`translate ${res.status}`);
        const data = await res.json();
        // Response shape: [[[seg, originalSeg, ...], ...], ...]
        const segments: any[] = Array.isArray(data?.[0]) ? data[0] : [];
        const translated = segments.map(s => (Array.isArray(s) ? s[0] : '')).join('');
        if (!translated) throw new Error('empty translation');
        AsyncStorage.setItem(key, translated).catch(() => { /* persist best-effort */ });
        return translated;
    } catch (e) {
        if (__DEV__) console.warn('[translateText] failed', e);
        return source;
    }
}

/**
 * Hook: takes an array of English source strings and returns the array
 * translated to `language`. While a translation is pending it returns the
 * English source so the UI never blanks out.
 *
 * For 'english' it returns the input unchanged. For 'urdu', callers should
 * prefer the seeded `translation_ur` column — pass urdu to this only when
 * no seeded translation exists.
 */
export function useTranslatedTexts(sources: string[], language: Language): string[] {
    const [out, setOut] = useState<string[]>(sources);
    const sig = sources.join('') + '|' + language;

    useEffect(() => {
        if (language === 'english') {
            setOut(sources);
            return;
        }
        let cancelled = false;
        setOut(sources);
        Promise.all(sources.map(s => translateText(s, language)))
            .then(results => { if (!cancelled) setOut(results); })
            .catch(() => { /* keep english fallback */ });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig]);

    return out;
}
