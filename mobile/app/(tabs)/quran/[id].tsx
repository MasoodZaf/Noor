import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts } from '../../../context/ThemeContext';
import { useReciter, RECITERS as GLOBAL_RECITERS } from '../../../context/ReciterContext';
import { createAudioPlayer } from 'expo-audio';
import { useAudio } from '../../../context/AudioContext';
import { useFonts } from 'expo-font';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import { sanitizeArabicText } from '../../../utils/arabic';
import { useTheme } from '../../../context/ThemeContext';
import { useNetworkMode } from '../../../context/NetworkModeContext';

// ─── APIs ─────────────────────────────────────────────────────────────────────
import { QURAN_API, ALQURAN_CLOUD_API as AUDIO_API } from '../../../utils/apis';

// Audio CDN — verses.quran.com (download.quranicaudio.com no longer serves these paths)
const AUDIO_CDN = 'https://verses.quran.com/';
const FAWAZ_API = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';

const FAWAZ_EDITIONS: Record<string, string> = {
    english: 'eng-muftitaqiusmani',
    indonesian: 'ind-indonesianislam',
    french: 'fra-muhammadhameedu',
    bengali: 'ben-muhiuddinkhan',
    turkish: 'tur-diyanetisleri',
};

const ALQURAN_EDITIONS: Record<string, string> = {
    urdu: 'ur.jalandhry', // default; overridden by urduEdition state when language=urdu
};

// Urdu translation options shown when language === 'urdu'
const URDU_EDITIONS = [
    { id: 'ur.jalandhry', name: 'Fateh M. Jalandhry', nameUrdu: 'جالندھری' },
    { id: 'ur.ahmedali',  name: 'Ahmed Ali',           nameUrdu: 'احمد علی' },
    { id: 'ur.ahmedraza', name: 'Ahmed Raza Khan',     nameUrdu: 'احمد رضا خان' },
    { id: 'ur.maududi',   name: "Maariful Qur'an",     nameUrdu: 'معارف القرآن' },
];

// Quran.com v4 caps `per_page` at 50 — surahs longer than that (Al-Fatiha is fine, but
// e.g. Al-Baqarah/286, Ash-Shu'ara/227, Al-A'raf/206) lost ayahs from #51 onward. Loop
// until `meta.total_count` is reached so every verse is fetched.
const fetchAllSurahVerses = async (
    surahId: number,
    reciterId: number,
    signal?: AbortSignal,
): Promise<any[]> => {
    const PAGE_SIZE = 50; // Quran.com v4 hard cap
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
        const total = json.meta?.total_count ?? json.pagination?.total_records ?? 0;
        if (allVerses.length >= total || verses.length < PAGE_SIZE) break;
        page++;
        if (page > 20) break; // safety: longest surah Al-Baqarah needs 6 pages at 50/page
    }
    return allVerses;
};

const fetchTranslationTexts = async (surahId: number, language: string, editionOverride?: string): Promise<string[]> => {
    const alquranEdition = editionOverride || ALQURAN_EDITIONS[language];
    if (alquranEdition) {
        const res = await fetch(`${AUDIO_API}/surah/${surahId}/${alquranEdition}`);
        if (!res.ok) throw new Error(`AlQuran Cloud ${res.status}`);
        const json = await res.json();
        if (json.code !== 200) throw new Error('AlQuran Cloud error');
        return (json.data?.ayahs || []).map((a: any) => a.text);
    }
    const edition = FAWAZ_EDITIONS[language] || FAWAZ_EDITIONS.english;
    const res = await fetch(`${FAWAZ_API}/editions/${edition}/${surahId}.json`);
    if (!res.ok) throw new Error(`Fawaz ${res.status}`);
    const json = await res.json();
    return (json.chapter || []).map((v: any) => v.text);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// sanitizeArabicText is imported from utils/arabic — strips Uthmani annotation marks
// (U+06D6–U+06DC, U+06DF–U+06E8, U+06EA–U+06ED) that fonts render as stray glyphs.
// Keeps U+06DD (end-of-ayah ۝) and U+06E9 (sajdah ۩).

// Strip tashkeel (harakat) for Simple Arabic mode — removes U+064B–U+065F and U+0670 superscript alef.
const stripDiacritics = (text: string): string =>
    text.replace(/[\u064B-\u065F\u0670]/g, '');

const BISMILLAH_FULL    = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const BISMILLAH_SIMPLE  = stripDiacritics(BISMILLAH_FULL);

// 1️⃣ Madinah Mushaf (QPC Hafs)  — Scheherazade, full Uthmani text
// 2️⃣ IndoPak Script              — Noto Naskh Arabic, same Unicode text (text_indopak_nastaleeq
//    uses PDMS proprietary encoding incompatible with standard Unicode fonts)
// 3️⃣ Simple Arabic               — system font, diacritics stripped (lightweight/accessibility mode)
const ARABIC_FONTS: { id: string; name: string; family: string | undefined; field: string }[] = [
    { id: 'uthmani', name: 'Madinah Mushaf (QPC Hafs)', family: 'ScheherazadeNew_400Regular', field: 'text_uthmani' },
    { id: 'indopak', name: 'IndoPak Script',             family: 'NotoNaskhArabic_400Regular', field: 'text_indopak' },
    { id: 'simple',  name: 'Simple Arabic',              family: undefined,                    field: 'text_simple'  },
];

// Reciters — Quran.com recitation IDs (audio field in verses API)
// IDs verified against api.quran.com/api/v4/recitations
const RECITERS = [
    { id: 7,  name: 'Mishary Al-Afasy',        label: 'Mishary Al-Afasy',        country: 'Kuwait 🇰🇼' },
    { id: 1,  name: 'Abdul Basit (Murattal)',   label: 'Abdul Basit Abd Samad',   country: 'Egypt 🇪🇬' },
    { id: 3,  name: 'Abdur-Rahman Al-Sudais',   label: 'Abdur-Rahman Al-Sudais',  country: 'Saudi Arabia 🇸🇦' },
    { id: 5,  name: 'Abu Bakr Al-Shatri',       label: 'Abu Bakr Al-Shatri',      country: 'Saudi Arabia 🇸🇦' },
];

// ─── Tajweed ───────────────────────────────────────────────────────────────────
const TAJWEED_RULES = [
    { id: 'ghunnah',  label: 'Ghunnah',  color: '#E8912A' },
    { id: 'idgham',   label: 'Idgham',   color: '#3B82C4' },
    { id: 'ikhfa',    label: 'Ikhfa',    color: '#8E44AD' },
    { id: 'madd',     label: 'Madd',     color: '#22A06B' },
    { id: 'qalqalah', label: 'Qalqalah', color: '#E84040' },
] as const;

type TajweedRuleId = typeof TAJWEED_RULES[number]['id'];

// Sets of Arabic base letters (without diacritics)
const IDGHAM_SET   = new Set(['ي','ر','م','ل','و','ن']);
const IKHFA_SET    = new Set(['ت','ث','ج','د','ذ','ز','س','ش','ص','ض','ط','ظ','ف','ق','ك']);
const QALQALAH_SET = new Set(['ق','ط','ب','ج','د']);

/** Returns the first Arabic base letter in a word (skips diacritics, hamza seats, etc.) */
function firstBaseLetter(word: string): string {
    for (const ch of word) {
        const cp = ch.codePointAt(0) ?? 0;
        if (cp >= 0x0621 && cp <= 0x06D3) return ch;
    }
    return '';
}

/**
 * Classify a single word for its dominant Tajweed rule.
 * nextWordText is the first word of the NEXT word in the verse (for cross-word rules).
 */
// Memoize detectTajweed results — the function is pure so the same (word, nextWord)
// always produces the same result. Avoids 5000+ regex evaluations per render.
const _tajweedCache = new Map<string, TajweedRuleId | null>();

function detectTajweed(wordText: string, nextWordText?: string): TajweedRuleId | null {
    const key = wordText + '\x00' + (nextWordText ?? '');
    if (_tajweedCache.has(key)) return _tajweedCache.get(key)!;

    const cache = (r: TajweedRuleId | null) => { _tajweedCache.set(key, r); return r; };

    // 1. Ghunnah — noon or meem with shadda (نّ / مّ)
    if (/[نم]\u0651/.test(wordText)) return cache('ghunnah');

    // 2. Qalqalah — one of ق ط ب ج د carrying a sukoon
    if (/[قطبجد]\u0652/.test(wordText)) return cache('qalqalah');

    // 3. Madd — clear long-vowel markers in the Uthmani text:
    //    • U+0622 alef-with-madda (آ)
    //    • U+06E4 small high madda (ۤ)
    //    • U+0670 superscript alef (ٰ)
    //    • Waw or ya carrying a sukoon (وْ / يْ)
    if (/[\u0622\u06E4\u0670]/.test(wordText) || /[وي]\u0652/.test(wordText)) return cache('madd');

    // 4. Cross-word rules: noon-sakinah or tanween at word-end → check next word's first letter
    const bare = wordText.replace(/\s/g, '');
    const endsNoonSakinah = /ن\u0652$/.test(bare);
    const endsTanween     = /[\u064B\u064C\u064D]$/.test(bare);

    if ((endsNoonSakinah || endsTanween) && nextWordText) {
        const first = firstBaseLetter(nextWordText);
        if (IDGHAM_SET.has(first))  return cache('idgham');
        if (IKHFA_SET.has(first))   return cache('ikhfa');
    }

    return cache(null);
}

const toArabicDigits = (num: number) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (w) => arabicNumbers[parseInt(w, 10)]);
};

const getTranslationFromRow = (row: any, language: string): string => {
    switch (language) {
        case 'urdu': return row.text_urdu || row.text_english || '';
        case 'indonesian': return row.text_ind || row.text_english || '';
        case 'french': return row.text_fra || row.text_english || '';
        case 'bengali': return row.text_ben || row.text_english || '';
        case 'turkish': return row.text_tur || row.text_english || '';
        default: return row.text_english || '';
    }
};

// Build ayah objects from raw verse data (from API) + translations + indopak texts
// verses[] come from Quran.com v4 with words=true&audio=7
// indopakTexts[] come from AlQuran Cloud quran-indopak edition (standard Unicode, renders with any Naskh font)
const buildAyahs = (surahId: number, verses: any[], translations: string[], indopakTexts: string[] = []) => {
    if (__DEV__ && translations.length > 0 && translations.length !== verses.length) {
        console.warn(`[Noor/Quran] Surah ${surahId}: translations.length=${translations.length} but verses.length=${verses.length} — trailing ayahs will show empty translation.`);
    }
    if (__DEV__ && indopakTexts.length > 0 && indopakTexts.length !== verses.length) {
        console.warn(`[Noor/Quran] Surah ${surahId}: indopakTexts.length=${indopakTexts.length} but verses.length=${verses.length} — trailing ayahs will fall back to Uthmani text.`);
    }
    return verses.map((v, i) => ({
        id: `${surahId}_${i + 1}`,
        surah_number: surahId,
        ayah_number: i + 1,
        text_uthmani: sanitizeArabicText(v.text_uthmani || ''),
        text_indopak: indopakTexts[i] || sanitizeArabicText(v.text_uthmani || ''),
        text_simple: stripDiacritics(sanitizeArabicText(v.text_uthmani || '')),
        text_translation: translations[i] || '',
        // Per-verse audio from Quranic Audio CDN (reciter: Mishary Al-Afasy)
        audio: v.audio?.url ? `${AUDIO_CDN}${v.audio.url}` : null,
        // Word-split uthmani text (excludes verse-end glyph)
        words: (v.words || [])
            .filter((w: any) => w.char_type_name === 'word')
            .map((w: any) => ({ text: w.text_uthmani || '', position: w.position as number })),
        // Timing segments: [[seg_idx, word_position (1-based), start_ms, end_ms], ...]
        // Timestamps are relative to the verse audio file
        segments: (v.audio?.segments || []) as number[][],
    }));
};

const { width } = Dimensions.get('window');

// ─── Quran-specific brand palette (fixed terracotta — decorative, not theme-swappable) ──
const QURAN_ACCENT = '#8C4B40';   // Islamic terracotta — verse numbers, tafseer accents
const QURAN_GOLD   = '#C9A84C';   // Gold — Meccan/Madinan badge, progress spinner

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuranReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();
    const { theme } = useTheme();

    const surahId = typeof id === 'string' ? parseInt(id, 10) : 1;

    const { soundRef: globalSoundRef, setAudioState, audioState } = useAudio();
    const { isOfflineMode } = useNetworkMode();

    const [fontsLoaded] = useFonts({ ScheherazadeNew_400Regular, NotoNaskhArabic_400Regular, NotoNastaliqUrdu_400Regular });

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahInfo, setSurahInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentAyahIndex, setCurrentAyahIndex] = useState<number | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
    const [showContinuePrompt, setShowContinuePrompt] = useState(false);
    const [pendingNextIndex, setPendingNextIndex] = useState<number>(0);
    const flatListRef = useRef<FlatList>(null);

    // Stores raw verse objects from API — reused on language switch (avoids re-fetching Arabic)
    const arabicCacheRef = useRef<any[] | null>(null);
    // Stores IndoPak texts from AlQuran Cloud — fetched once per surah, reused on language/reciter switch
    const indopakCacheRef = useRef<string[]>([]);
    const prevLanguageRef = useRef<string>(language);

    // Timing segments for currently playing ayah — used in playback status callback
    const currentSegmentsRef = useRef<number[][]>([]);

    // true = full-surah auto-advance mode (main play button); false = single ayah mode (pill tap)
    const autoPlayRef = useRef(false);

    // Load timeout timer — clears when verse loads successfully, fires to skip on network failure
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Generation counter — incremented on each new verse; callbacks check this to discard stale events
    const generationRef = useRef(0);

    // Urdu translator selection (only active when language === 'urdu')
    const [urduEdition, setUrduEdition] = useState(URDU_EDITIONS[0].id);
    const [showUrduPicker, setShowUrduPicker] = useState(false);

    // Reciter selection — hoisted to the global ReciterContext so the Profile
    // "Tweaks" picker and the Quran reader stay in sync, and the choice persists.
    const { reciter: selectedReciter, setReciter: setSelectedReciter } = useReciter();
    const [showReciterPicker, setShowReciterPicker] = useState(false);
    const prevReciterIdRef = useRef(selectedReciter.id);

    // ── Bookmarks (#21) ────────────────────────────────────────────────────────
    type AyahBookmark = {
        surah_number: number;
        ayah_number: number;
        surah_name: string;
        arabic_snippet: string;
        saved_at: number;
    };
    const BOOKMARK_KEY = '@noor/quran_bookmarks';
    const [bookmarks, setBookmarks] = useState<AyahBookmark[]>([]);
    const [showBookmarks, setShowBookmarks] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(BOOKMARK_KEY).then(raw => {
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setBookmarks(parsed);
            } catch {}
        }).catch(() => {});
    }, []);

    const isBookmarked = (surahNum: number, ayahNum: number) =>
        bookmarks.some(b => b.surah_number === surahNum && b.ayah_number === ayahNum);

    const toggleBookmark = (ayah: any) => {
        const surahNum = ayah.surah_number;
        const ayahNum = ayah.ayah_number;
        const exists = isBookmarked(surahNum, ayahNum);
        const next = exists
            ? bookmarks.filter(b => !(b.surah_number === surahNum && b.ayah_number === ayahNum))
            : [
                ...bookmarks,
                {
                    surah_number: surahNum,
                    ayah_number: ayahNum,
                    surah_name: surahInfo?.name_english ?? `Surah ${surahNum}`,
                    arabic_snippet: (ayah.text_uthmani || '').slice(0, 60),
                    saved_at: Date.now(),
                } as AyahBookmark,
            ];
        setBookmarks(next);
        AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(next)).catch(() => {});
        if (!exists && Platform.OS !== 'web') {
            // Light haptic confirms the save (only on add — removal is a clear visual change already)
        }
    };

    const jumpToBookmark = (b: AyahBookmark) => {
        setShowBookmarks(false);
        if (b.surah_number === surahId) {
            // Same surah — scroll to the ayah index
            const idx = ayahs.findIndex(a => a.ayah_number === b.ayah_number);
            if (idx >= 0) {
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
                }, 200);
            }
        } else {
            router.push(`/(tabs)/quran/${b.surah_number}` as any);
        }
    };

    // Throttle position/duration state updates — update UI at most every 4th callback tick
    // (updateInterval=250ms → effective UI refresh ~1 per second, enough for progress bar)
    const posTickRef = useRef(0);

    // Audio Player State
    const [durationMillis, setDurationMillis] = useState(1);
    const [positionMillis, setPositionMillis] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const playbackSpeedRef = useRef(1.0); // ref so playNextAyah always reads the current speed (avoids stale closure)
    const SPEEDS = [0.75, 1.0, 1.25, 1.5];

    // Keep ref in sync with state so async callbacks always read the latest speed
    useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

    const formatAudioTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    // Tafseer
    const [tafseerTexts, setTafseerTexts] = useState<Record<string, string>>({});
    const [openTafseers, setOpenTafseers] = useState<Set<string>>(new Set());
    const [loadingTafseers, setLoadingTafseers] = useState<Set<string>>(new Set());


    // Language → Quran.com tafsir ID + display name
    // ID 169 = Ibn Kathir Abridged (English)
    // ID 160 = تفسیر ابنِ کثیر (Urdu)
    const TAFSIR_BY_LANG: Record<string, { id: number; name: string }> = {
        english:    { id: 169, name: 'Ibn Kathir (Abridged)' },
        urdu:       { id: 160, name: 'تفسیر ابنِ کثیر' },
        indonesian: { id: 169, name: 'Ibn Kathir (Abridged)' },
        french:     { id: 169, name: 'Ibn Kathir (Abridged)' },
        bengali:    { id: 169, name: 'Ibn Kathir (Abridged)' },
        turkish:    { id: 169, name: 'Ibn Kathir (Abridged)' },
    };

    // Cache key includes language so switching language forces a fresh fetch.
    // e.g. "1_1_urdu", "1_1_english" — different entries per language.
    const tafsirCacheKey = (ayahId: string) => `${ayahId}_${language}`;

    // ayahKey = React state key (ayah.id, e.g. "1_1")
    // surahNum + ayahNum used to build the Quran.com verse key (e.g. "1:1")
    // The API REQUIRES colon-separated verse keys — underscore format silently
    // returns wrong tafsir content (confirmed mismatch bug).
    const toggleTafseer = async (ayahKey: string, surahNum: number, ayahNum: number) => {
        const cacheKey = tafsirCacheKey(ayahKey);
        if (openTafseers.has(cacheKey)) {
            setOpenTafseers(prev => { const s = new Set(prev); s.delete(cacheKey); return s; });
            return;
        }
        if (tafseerTexts[cacheKey]) {
            setOpenTafseers(prev => new Set(prev).add(cacheKey));
            return;
        }
        setLoadingTafseers(prev => new Set(prev).add(cacheKey));
        try {
            const { id: tafsirId } = TAFSIR_BY_LANG[language] ?? TAFSIR_BY_LANG.english;
            const verseKey = `${surahNum}:${ayahNum}`;  // colon format required by API
            const res = await fetch(`${QURAN_API}/tafsirs/${tafsirId}/by_ayah/${verseKey}`);
            const json = await res.json();
            const raw = json?.tafsir?.text || 'Tafseer not available.';
            const clean = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            setTafseerTexts(prev => ({ ...prev, [cacheKey]: clean }));
            setOpenTafseers(prev => new Set(prev).add(cacheKey));
        } catch {
            setTafseerTexts(prev => ({ ...prev, [cacheKey]: 'Could not load tafseer. Please check your connection.' }));
            setOpenTafseers(prev => new Set(prev).add(cacheKey));
        } finally {
            setLoadingTafseers(prev => { const s = new Set(prev); s.delete(cacheKey); return s; });
        }
    };

    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    // Tajweed
    const [tajweedEnabled, setTajweedEnabled] = useState(false);
    const [enabledRules, setEnabledRules] = useState<Set<TajweedRuleId>>(
        () => new Set(TAJWEED_RULES.map(r => r.id))
    );
    const toggleTajweedRule = (id: TajweedRuleId) => {
        setEnabledRules(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Initial load: fetch Arabic + words + audio + translation ──────────────
    useEffect(() => {
        if (!surahId) return;

        arabicCacheRef.current = null;
        indopakCacheRef.current = [];
        prevLanguageRef.current = language;
        // Reset per-ayah panel state so stale spinners/text from the previous surah are cleared
        setTafseerTexts({});
        setOpenTafseers(new Set());
        setLoadingTafseers(new Set());
        let mounted = true;

        // Render full surah from bundled SQLite (Uthmani + IndoPak + EN/UR are all
        // present, all 6236 ayahs verified). Used by both forced-offline mode and as
        // the primary render path in online mode (API then upgrades audio/word-segments).
        const renderFromSqlite = async (): Promise<boolean> => {
            if (!db) return false;
            try {
                const surah = await db.getFirstAsync<{ number: number; name_english: string; name_arabic: string; ayah_count: number; revelation_place: string }>('SELECT * FROM surahs WHERE number = ?', [surahId]);
                if (!mounted) return false;
                setSurahInfo({
                    ...surah,
                    bismillah_pre: surah?.number !== 1 && surah?.number !== 9,
                });
                const rows = await db.getAllAsync(
                    'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                    [surahId]
                ) as any[];
                if (!mounted || rows.length === 0) return false;
                const offlineVerses = rows.map((r: any) => ({
                    text_uthmani: sanitizeArabicText(r.text_arabic || ''),
                    audio: null,
                    words: [],
                    segments: [],
                }));
                const indopakTexts = rows.map((r: any) => sanitizeArabicText(r.text_arabic_indopak || r.text_arabic || ''));
                const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                arabicCacheRef.current = offlineVerses;
                indopakCacheRef.current = indopakTexts;
                setAyahs(buildAyahs(surahId, offlineVerses, translationTexts, indopakTexts));
                return true;
            } catch (dbErr) {
                console.error('[Noor/Quran] SQLite load failed:', dbErr);
                return false;
            }
        };

        const loadSurah = async () => {
            setLoading(true);
            setIsOffline(isOfflineMode);

            // ── Step 1: render immediately from bundled SQLite ──
            // Long surahs (Al-Baqarah/286, Ash-Shu'ara/227) render fully and instantly,
            // independent of network reliability or API pagination.
            const sqliteOk = await renderFromSqlite();
            if (sqliteOk && mounted) setLoading(false);

            if (isOfflineMode) {
                if (!sqliteOk && mounted) setLoading(false);
                return;
            }

            // ── Step 2: upgrade with online data (audio URLs, word-timing segments,
            // CDN translations) — non-blocking. If it fails, we keep the SQLite render.
            try {
                // Fetch chapter info + verified verses (with word segments + audio) + translation + IndoPak in parallel
                // words=true → word-split text for highlighting
                // audio=7 → Mishary Al-Afasy per-verse audio URLs + word timing segments
                // quran-indopak → AlQuran Cloud IndoPak edition (standard Unicode, different diacritics from Uthmani)
                // Use manual AbortController — AbortSignal.timeout() is not reliably available on all Hermes versions
                const controller = new AbortController();
                const fetchTimeout = setTimeout(() => controller.abort(), 20000);
                const [chapterResult, versesResult, translationResult, indopakResult] = await Promise.allSettled([
                    fetch(`${QURAN_API}/chapters/${surahId}`, { signal: controller.signal }),
                    fetchAllSurahVerses(surahId, selectedReciter.id, controller.signal),
                    fetchTranslationTexts(surahId, language),
                    fetch(`${AUDIO_API}/surah/${surahId}/quran-indopak`, { signal: controller.signal }),
                ]);
                clearTimeout(fetchTimeout);

                if (!mounted) return;

                if (chapterResult.status === 'fulfilled' && chapterResult.value.ok) {
                    const json = await chapterResult.value.json();
                    const ch = json.chapter;
                    if (mounted) setSurahInfo({
                        number: surahId,
                        name_english: ch.name_simple,
                        name_arabic: ch.name_arabic,
                        name_meaning: ch.translated_name?.name || '',
                        revelation_type: ch.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
                        total_ayahs: ch.verses_count,
                        bismillah_pre: ch.bismillah_pre,
                    });
                }

                let verses: any[] = [];
                if (versesResult.status === 'fulfilled') {
                    verses = versesResult.value;
                }

                let translationTexts: string[] = [];
                if (translationResult.status === 'fulfilled') {
                    translationTexts = translationResult.value;
                } else if (db) {
                    // Fawaz CDN / AlQuran Cloud unreachable — fall back to local SQLite translations
                    console.warn('[Noor/Translation] CDN fetch failed, using SQLite fallback:', (translationResult as PromiseRejectedResult).reason);
                    try {
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                    } catch { }
                }

                if (indopakResult.status === 'fulfilled' && indopakResult.value.ok) {
                    const json = await indopakResult.value.json();
                    const apiIndopak = (json.data?.ayahs || []).map((a: any) =>
                        sanitizeArabicText(a.text || '')
                    );
                    if (apiIndopak.length > 0) indopakCacheRef.current = apiIndopak;
                }

                // Only upgrade if the API returned a complete verse set. A short response
                // (network drop mid-pagination, CDN error) would shrink the on-screen surah,
                // so we keep the SQLite render in that case.
                const expectedCount = (await db?.getFirstAsync<{ ayah_count: number }>(
                    'SELECT ayah_count FROM surahs WHERE number = ?', [surahId]
                ))?.ayah_count ?? 0;

                if (verses.length > 0 && (expectedCount === 0 || verses.length === expectedCount)) {
                    arabicCacheRef.current = verses;
                    if (mounted) setAyahs(buildAyahs(surahId, verses, translationTexts, indopakCacheRef.current));
                } else if (__DEV__) {
                    console.warn(`[Noor/Quran] API upgrade skipped — verses=${verses.length}, expected=${expectedCount}. Keeping SQLite render.`);
                }
            } catch (error: any) {
                // SQLite already rendered in Step 1 — nothing visible to do here.
                if (__DEV__) console.warn('[Noor/Quran] Online upgrade failed, keeping SQLite render:', error?.message || error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadSurah();

        return () => {
            mounted = false;
            // Full teardown so a queued didJustFinish setTimeout can't spawn a new player
            // for the OLD surah after we've navigated to a different one (#19).
            autoPlayRef.current = false;
            ++generationRef.current;
            if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
            if (globalSoundRef.current) {
                try { globalSoundRef.current.pause(); } catch {}
                try { globalSoundRef.current.remove(); } catch {}
                globalSoundRef.current = null;
            }
            setAudioState(prev => ({ ...prev, isPlaying: false, isVisible: false }));
        };
    }, [surahId, db, isOfflineMode]);

    // ── Language change: update translation only, preserve Arabic cache ────────
    useEffect(() => {
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;

        const cache = arabicCacheRef.current;
        if (!cache || ayahs.length === 0) return;

        let cancelled = false;

        const updateTranslation = async () => {
            setTranslationLoading(true);
            try {
                const translationTexts = await fetchTranslationTexts(surahId, language, language === 'urdu' ? urduEdition : undefined);
                if (cancelled) return;
                setAyahs(buildAyahs(surahId, cache, translationTexts, indopakCacheRef.current));
            } catch {
                if (cancelled) return;
                if (db) {
                    try {
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        if (cancelled) return;
                        const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                        setAyahs(buildAyahs(surahId, cache, translationTexts, indopakCacheRef.current));
                    } catch { }
                }
            } finally {
                if (!cancelled) setTranslationLoading(false);
            }
        };

        updateTranslation();
        return () => { cancelled = true; };
    }, [language]);

    // ── Urdu edition change: re-fetch translation with new edition ────────────
    useEffect(() => {
        if (language !== 'urdu') return;
        const cache = arabicCacheRef.current;
        if (!cache || ayahs.length === 0) return;
        let cancelled = false;
        const update = async () => {
            setTranslationLoading(true);
            try {
                const texts = await fetchTranslationTexts(surahId, 'urdu', urduEdition);
                if (!cancelled) setAyahs(buildAyahs(surahId, cache, texts, indopakCacheRef.current));
            } catch (e) {
                console.warn('[Noor/Translation] Urdu edition fetch failed:', e);
            } finally {
                if (!cancelled) setTranslationLoading(false);
            }
        };
        update();
        return () => { cancelled = true; };
    }, [urduEdition]);

    // ── Reciter change: re-fetch audio URLs, preserve Arabic text + translation cache ──
    useEffect(() => {
        if (!selectedReciter || prevReciterIdRef.current === selectedReciter.id) return;
        prevReciterIdRef.current = selectedReciter.id;

        const cache = arabicCacheRef.current;
        if (!cache || ayahs.length === 0) return;

        // Stop any active playback first
        handleStop();

        let cancelled = false;

        const refetchAudio = async () => {
            setTranslationLoading(true);
            try {
                const ctl = new AbortController();
                const t = setTimeout(() => ctl.abort(), 20000);
                const newVerses = await fetchAllSurahVerses(surahId, selectedReciter.id, ctl.signal)
                    .finally(() => clearTimeout(t));
                if (cancelled) return;
                // Merge new audio URLs + segments into existing ayahs (preserve translations)
                setAyahs(prev => prev.map((ayah, i) => ({
                    ...ayah,
                    audio: newVerses[i]?.audio?.url ? `${AUDIO_CDN}${newVerses[i].audio.url}` : ayah.audio,
                    segments: (newVerses[i]?.audio?.segments || ayah.segments) as number[][],
                })));
                arabicCacheRef.current = newVerses;
            } catch {
                // Keep existing audio URLs if fetch fails
            } finally {
                if (!cancelled) setTranslationLoading(false);
            }
        };

        refetchAudio();
        return () => { cancelled = true; };
    }, [selectedReciter.id]);

    // Keep local isPlaying in sync with global audio state, and tear down our autoplay
    // chain whenever the audio slot stops belonging to us. This catches two cases the
    // didJustFinish gate alone can't:
    //   #20 — Mini player ✕ resets audioState (sourceCategory=null) but the queued
    //         setTimeout in our chain would otherwise create a fresh player and resume.
    //   #19 — A second Quran reader (different surahId) claims the slot via setAudioState;
    //         our background screen would otherwise reclaim it on its next didJustFinish.
    useEffect(() => {
        const isOurSurah = audioState.sourceCategory === 'quran' && audioState.sourceId === surahInfo?.number;
        if (isOurSurah) {
            setIsPlaying(audioState.isPlaying);
        } else {
            // Slot is no longer ours — invalidate any deferred autoplay continuations.
            autoPlayRef.current = false;
            ++generationRef.current;
            if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
            setIsPlaying(false);
            setShowContinuePrompt(false);
        }
    }, [audioState.isPlaying, audioState.sourceCategory, audioState.sourceId, surahInfo?.number]);

    // ── Audio ──────────────────────────────────────────────────────────────────
    const playNextAyah = async (index: number) => {
        if (index >= ayahs.length) {
            setIsPlaying(false);
            setCurrentAyahIndex(null);
            return;
        }

        const ayah = ayahs[index];
        if (!ayah.audio) {
            playNextAyah(index + 1);
            return;
        }

        try {
            // Clear any pending load timeout from previous verse
            if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }

            // Bump generation — all callbacks from the previous player will see a stale gen and exit
            const gen = ++generationRef.current;

            // Remove previous player — pause first so ExoPlayer stops immediately
            if (globalSoundRef.current) {
                const old = globalSoundRef.current;
                globalSoundRef.current = null;
                try { old.pause(); } catch {}
                try { old.remove(); } catch {}
            }

            posTickRef.current = 0;
            // iOS: 100ms for tight word-sync. Android: 150ms — bridge is heavier, still fine for highlighting.
            const player = createAudioPlayer({ uri: ayah.audio }, { updateInterval: Platform.OS === 'android' ? 150 : 100 });
            globalSoundRef.current = player;

            // Apply current playback speed to the new player immediately (avoids resetting to 1x on verse advance)
            if (playbackSpeedRef.current !== 1.0) {
                try { player.setPlaybackRate(playbackSpeedRef.current); } catch {}
            }

            setCurrentAyahIndex(index);
            setCurrentWordIndex(-1);
            setIsPlaying(true);
            setShowContinuePrompt(false);
            currentSegmentsRef.current = ayah.segments;

            // Disable animated scroll on Android — scroll animation competes with ExoPlayer init
            flatListRef.current?.scrollToIndex({ index, animated: Platform.OS !== 'android', viewPosition: 0.3 });

            setAudioState(s => ({
                ...s,
                isVisible: true,
                isPlaying: true,
                title: `${surahInfo?.name_english} - Ayah ${ayah.ayah_number}`,
                reciter: selectedReciter.label,
                sourceId: surahInfo?.number,
                sourceCategory: 'quran',
            }));

            // iOS: play() is called immediately — pre-set playTriggered so the isLoaded
            //       callback doesn't call play() a second time and cause a stutter.
            // Android: play() is deferred until isLoaded fires (ExoPlayer requirement).
            let playTriggered = Platform.OS === 'ios';
            let playStarted  = false; // true once status.playing fires — used by load timeout on iOS
            let didFinish = false;

            player.addListener('playbackStatusUpdate', (status) => {
                // Discard stale callbacks from a previous verse's player
                if (generationRef.current !== gen) return;

                // Track when audio actually starts playing (both platforms)
                if (status.playing && !playStarted) {
                    playStarted = true;
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                        loadTimeoutRef.current = null;
                    }
                }

                // Android: trigger play() once loaded AND buffer is stable.
                // isBuffering=true means ExoPlayer is still filling its buffer —
                // calling play() now causes an audible stutter; wait for the next tick.
                if (!playTriggered && status.isLoaded && !status.isBuffering) {
                    playTriggered = true;
                    if (!status.playing) player.play();
                }

                // Handle network/decode errors — skip to next verse instead of silently stopping
                if ((status as any).error && !didFinish) {
                    didFinish = true;
                    currentSegmentsRef.current = [];
                    setCurrentWordIndex(-1);
                    if (autoPlayRef.current) {
                        setTimeout(() => {
                            // Re-check at fire time — autoplay may have been cancelled
                            // (#19/#20: surah switch or external stop while we were waiting).
                            if (!autoPlayRef.current || generationRef.current !== gen) return;
                            playNextAyah(index + 1);
                        }, Platform.OS === 'android' ? 300 : 150);
                    } else {
                        setIsPlaying(false);
                        setAudioState(s => ({ ...s, isPlaying: false }));
                    }
                    return;
                }

                const posMs = status.currentTime * 1000;
                const durMs = (status.duration || 0) * 1000;

                // ── Word-by-word highlighting — runs on every tick (100ms) for tight sync ──
                const segs = currentSegmentsRef.current;
                if (segs.length > 0) {
                    let activeWord = -1;
                    for (const seg of segs) {
                        // seg: [seg_idx, word_position (1-based), start_ms, end_ms]
                        if (posMs >= seg[2] && posMs <= seg[3]) {
                            activeWord = seg[1];
                            break;
                        }
                    }
                    setCurrentWordIndex(prev => prev !== activeWord ? activeWord : prev);
                }

                // ── Progress bar — throttled to every 3rd tick (~300ms) to reduce re-renders ──
                posTickRef.current += 1;
                if (posTickRef.current % 3 === 0) {
                    setPositionMillis(posMs);
                    setDurationMillis(durMs || 1);
                    setAudioState(s => ({
                        ...s,
                        positionMs: posMs,
                        durationMs: durMs || 1,
                        isPlaying: status.playing,
                    }));
                }

                // Guard: didJustFinish can fire more than once on Android — only act on the first
                if (status.didJustFinish && !didFinish) {
                    didFinish = true;
                    setCurrentWordIndex(-1);
                    currentSegmentsRef.current = [];
                    if (autoPlayRef.current) {
                        // Android: ExoPlayer.release() is async — give it 50ms to fully release
                        // audio focus before the next player requests it, preventing overlap/glitch.
                        // iOS: next event-loop tick (0ms) is sufficient for AVPlayer teardown.
                        setTimeout(() => {
                            // Re-check at fire time — autoplay may have been cancelled in the
                            // meantime (#19/#20: surah switch or external stop). Without this gate,
                            // a queued continuation creates a new player after the user has moved on.
                            if (!autoPlayRef.current || generationRef.current !== gen) return;
                            playNextAyah(index + 1);
                        }, Platform.OS === 'android' ? 50 : 0);
                    } else {
                        // Single-ayah mode: show continue/stop prompt
                        setPendingNextIndex(index + 1);
                        setShowContinuePrompt(true);
                    }
                }
            });

            // iOS: play immediately — AVPlayer buffers and starts when ready
            if (Platform.OS === 'ios') player.play();

            // Load timeout: if audio hasn't actually started playing within 12 s
            // (network failure, slow CDN, or silent iOS AVPlayer failure), skip verse.
            // Uses playStarted (not playTriggered) so it works on iOS too —
            // playTriggered is pre-set to true on iOS, but playStarted only flips
            // when status.playing fires, which confirms audio actually started.
            loadTimeoutRef.current = setTimeout(() => {
                loadTimeoutRef.current = null;
                if (generationRef.current !== gen) return; // already moved to next verse
                if (!playStarted) {
                    currentSegmentsRef.current = [];
                    setCurrentWordIndex(-1);
                    if (autoPlayRef.current) {
                        playNextAyah(index + 1);
                    } else {
                        setIsPlaying(false);
                        setAudioState(s => ({ ...s, isPlaying: false }));
                    }
                }
            }, 12000);
        } catch (error) {
            console.error('Playback Error:', error);
            playNextAyah(index + 1);
        }
    };

    const togglePlay = () => {
        if (!surahInfo || ayahs.length === 0 || isOfflineMode) return;
        const player = globalSoundRef.current;
        if (player && player.isLoaded) {
            if (isPlaying) {
                player.pause();
                setIsPlaying(false); // update immediately — don't wait for next status callback
                setAudioState(s => ({ ...s, isPlaying: false }));
            } else {
                autoPlayRef.current = true; // resuming full-surah playback
                player.play();
                setIsPlaying(true);
                setAudioState(s => ({ ...s, isPlaying: true }));
            }
            return;
        }
        autoPlayRef.current = true; // full-surah auto-advance mode
        playNextAyah(currentAyahIndex ?? 0);
    };

    const skipBack = () => {
        const player = globalSoundRef.current;
        if (!player) return;
        player.seekTo(Math.max(0, (positionMillis - 10000) / 1000)).catch(() => {});
    };

    const skipForward = () => {
        const player = globalSoundRef.current;
        if (!player) return;
        player.seekTo(Math.min(durationMillis, (positionMillis + 10000)) / 1000).catch(() => {});
    };

    const cycleSpeed = () => {
        const nextIndex = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
        const next = SPEEDS[nextIndex];
        setPlaybackSpeed(next);
        playbackSpeedRef.current = next; // sync ref immediately so in-flight callbacks read the new speed
        if (globalSoundRef.current) {
            // playbackRate is a getter-only property on both iOS and Android —
            // must use the setPlaybackRate() method.
            try { globalSoundRef.current.setPlaybackRate(next); } catch {}
        }
    };

    const handleStop = () => {
        autoPlayRef.current = false;
        ++generationRef.current; // invalidate any in-flight playbackStatusUpdate callbacks
        setShowContinuePrompt(false);
        setIsPlaying(false);
        setCurrentAyahIndex(null);
        setCurrentWordIndex(-1);
        if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
        if (globalSoundRef.current) {
            // pause() before remove() — Android ExoPlayer needs both for instant audio cutoff,
            // otherwise a tail keeps playing while the new reciter starts → two reciters at once.
            try { globalSoundRef.current.pause(); } catch {}
            try { globalSoundRef.current.remove(); } catch {}
            globalSoundRef.current = null;
        }
        setAudioState(s => ({ ...s, isPlaying: false }));
    };

    const handleContinue = () => {
        setShowContinuePrompt(false);
        playNextAyah(pendingNextIndex);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading || !fontsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={QURAN_GOLD} />
                <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Opening Surah...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.surahTitle, { color: theme.textPrimary }]}>{surahInfo?.name_english || 'Al-Fatihah'}</Text>
                    <Feather name="chevron-down" size={16} color={theme.textPrimary} style={{ marginLeft: 4, marginTop: 4 }} />
                </View>
                <View style={styles.headerRight}>
                    {/* Bookmarks list (#21) — opens a modal showing all saved ayahs. */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowBookmarks(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`View bookmarks${bookmarks.length > 0 ? `, ${bookmarks.length} saved` : ''}`}
                    >
                        <Feather name="bookmark" size={22} color={bookmarks.length > 0 ? QURAN_GOLD : theme.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowSettings(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Reading settings"
                    >
                        <Feather name="settings" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
            {isOffline && (
                <View style={styles.offlineBanner}>
                    <Feather name="wifi-off" size={12} color="#92400e" />
                    <Text style={styles.offlineBannerText}>
                        {isOfflineMode ? 'Offline mode — audio disabled' : 'No connection — reading from local vault'}
                    </Text>
                </View>
            )}

            {/* Ayah List */}
            <FlatList
                ref={flatListRef}
                data={ayahs}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingVertical: 0, paddingBottom: 160 }}
                initialNumToRender={15}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={false}
                ListHeaderComponent={
                    <View style={[styles.surahHero, { borderBottomColor: theme.border, backgroundColor: theme.bgSecondary }]}>
                        <Text style={[styles.surahHeroArabic, { fontFamily: 'ScheherazadeNew_400Regular', color: theme.textPrimary }]}>
                            {surahInfo?.name_arabic}
                        </Text>
                        <Text style={[styles.surahHeroEnglish, { color: theme.textPrimary }]}>
                            {surahInfo?.number}. {surahInfo?.name_english}
                        </Text>
                        {!!surahInfo?.name_meaning && (
                            <Text style={[styles.surahHeroMeaning, { color: theme.textSecondary }]}>
                                {surahInfo.name_meaning}
                            </Text>
                        )}
                        <View style={styles.surahHeroMeta}>
                            <View style={[styles.surahHeroBadge, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.surahHeroBadgeText, { color: theme.textSecondary }]}>
                                    {surahInfo?.total_ayahs} Ayahs
                                </Text>
                            </View>
                            <View style={[styles.surahHeroBadge, {
                                backgroundColor: surahInfo?.revelation_type === 'Meccan' ? `${QURAN_GOLD}18` : `${theme.accent}18`,
                            }]}>
                                <Text style={[styles.surahHeroBadgeText, {
                                    color: surahInfo?.revelation_type === 'Meccan' ? QURAN_GOLD : theme.accent,
                                }]}>
                                    {surahInfo?.revelation_type}
                                </Text>
                            </View>
                            {translationLoading && (
                                <ActivityIndicator size="small" color={QURAN_GOLD} style={{ marginLeft: 6 }} />
                            )}
                        </View>
                    </View>
                }
                renderItem={({ item: ayah, index }) => {
                    const isCurrent = currentAyahIndex === index;
                    return (
                        <View style={[styles.ayahContainer, { borderColor: theme.border }, isCurrent && [styles.ayahContainerActive, { backgroundColor: theme.accentLight }]]}>
                            {index === 0 && surahInfo?.bismillah_pre && (
                                <View style={[styles.bismillahBannerBlock, { backgroundColor: theme.bgSecondary, borderColor: theme.borderStrong }]}>
                                    <Text style={[styles.bismillahText, { fontFamily: selectedFont.family, color: theme.textPrimary }]}>
                                        {selectedFont.id === 'simple' ? BISMILLAH_SIMPLE : BISMILLAH_FULL}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.ayahHeader}>
                                <TouchableOpacity
                                    style={[styles.ayahPillBadge, { backgroundColor: theme.bgSecondary }, isCurrent && { backgroundColor: QURAN_ACCENT }]}
                                    onPress={() => { autoPlayRef.current = false; playNextAyah(index); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Play ayah ${ayah.surah_number}:${ayah.ayah_number}`}
                                    accessibilityState={{ selected: isCurrent }}
                                >
                                    <Text style={[styles.ayahPillText, { color: theme.textSecondary }, isCurrent && { color: '#FFFFFF' }]}>
                                        {ayah.surah_number}:{ayah.ayah_number}
                                    </Text>
                                    <Feather
                                        name={isCurrent && isPlaying ? 'volume-2' : 'play'}
                                        size={14}
                                        color={isCurrent ? '#FFFFFF' : theme.textSecondary}
                                        style={{ marginLeft: 6 }}
                                    />
                                </TouchableOpacity>
                                {/* Bookmark toggle (#21). Stores {surah, ayah} in AsyncStorage so the
                                    user can return to a verse later via the header bookmarks list. */}
                                <TouchableOpacity
                                    style={styles.bookmarkBtn}
                                    onPress={() => toggleBookmark(ayah)}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel={isBookmarked(ayah.surah_number, ayah.ayah_number) ? 'Remove bookmark' : 'Bookmark ayah'}
                                    accessibilityState={{ selected: isBookmarked(ayah.surah_number, ayah.ayah_number) }}
                                >
                                    <Feather
                                        name="bookmark"
                                        size={18}
                                        color={isBookmarked(ayah.surah_number, ayah.ayah_number) ? QURAN_GOLD : theme.textTertiary}
                                        style={{
                                            // Filled-look via opacity when bookmarked. expo-vector-icons
                                            // doesn't ship a filled bookmark in Feather; fall back to colour cue.
                                        }}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.arabicContentWrapper}>
                                {/*
                                 * Per-word rendering for the ACTIVE ayah:
                                 * Each word from the Quran.com API is a complete Unicode string
                                 * (base letters + all combining marks for that word).
                                 * Rendering whole words as nested <Text> spans is safe because
                                 * Arabic shaping is applied independently per word — only
                                 * character-level splitting across word boundaries causes
                                 * combining-mark displacement, which we avoid here.
                                 *
                                 * For inactive ayahs we keep a single <Text> block (faster,
                                 * preserves any cross-word ligatures in the font).
                                 */}
                                {(isCurrent || tajweedEnabled) && ayah.words && ayah.words.length > 0 ? (
                                    <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.85 }]}>
                                        {ayah.words.map((w: any, wi: number) => {
                                            // 1. Playback highlight takes highest priority
                                            const active = isCurrent && currentWordIndex !== -1 && currentWordIndex === w.position;
                                            if (active) {
                                                return (
                                                    <Text key={wi} style={[styles.arabicWordActive, { color: theme.textPrimary }]}>
                                                        {w.text}{wi < ayah.words.length - 1 ? ' ' : ''}
                                                    </Text>
                                                );
                                            }
                                            // 2. Tajweed coloring — applied when enabled and rule matches
                                            if (tajweedEnabled) {
                                                const nextWord = ayah.words[wi + 1];
                                                const ruleId = detectTajweed(w.text, nextWord?.text);
                                                if (ruleId && enabledRules.has(ruleId)) {
                                                    const ruleColor = TAJWEED_RULES.find(r => r.id === ruleId)?.color;
                                                    return (
                                                        <Text key={wi} style={{ color: ruleColor, fontWeight: '600' }}>
                                                            {w.text}{wi < ayah.words.length - 1 ? ' ' : ''}
                                                        </Text>
                                                    );
                                                }
                                            }
                                            // 3. Default word colour
                                            return (
                                                <Text key={wi} style={{ color: theme.textPrimary }}>
                                                    {w.text}{wi < ayah.words.length - 1 ? ' ' : ''}
                                                </Text>
                                            );
                                        })}
                                    </Text>
                                ) : (
                                    <Text style={[
                                        styles.arabicText,
                                        { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.6, color: theme.textPrimary },
                                        isCurrent && { color: QURAN_ACCENT }
                                    ]}>
                                        {ayah[selectedFont.field] || ayah.text_uthmani}
                                    </Text>
                                )}
                            </View>

                            <Text style={[
                                styles.translationText,
                                { color: theme.textSecondary },
                                language === 'urdu' && {
                                    fontFamily: 'NotoNastaliqUrdu_400Regular',
                                    fontSize: 20,
                                    textAlign: 'right',
                                    lineHeight: 42,
                                    writingDirection: 'rtl',
                                }
                            ]}>
                                {ayah.text_translation}
                            </Text>

                            {/* Urdu translation picker */}
                            {language === 'urdu' && (
                                <TouchableOpacity
                                    style={styles.urduPickerBtn}
                                    onPress={() => setShowUrduPicker(true)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change Urdu translation edition"
                                >
                                    <Text style={[styles.urduPickerLabel, { color: QURAN_ACCENT }]}>
                                        {URDU_EDITIONS.find(e => e.id === urduEdition)?.name ?? 'Translation'}
                                    </Text>
                                    <Feather name="chevron-down" size={14} color={QURAN_ACCENT} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            )}

                            {/* ── Per-ayah action bar ── */}
                            {(() => {
                                const ck = tafsirCacheKey(ayah.id);
                                return (
                            <View style={[styles.ayahActionBar, { borderTopColor: theme.border }]}>
                                {/* Tafsirs */}
                                <TouchableOpacity
                                    style={styles.ayahActionBtn}
                                    onPress={() => toggleTafseer(ayah.id, ayah.surah_number, ayah.ayah_number)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Show tafsir"
                                    accessibilityState={{ expanded: openTafseers.has(ck) }}
                                >
                                    <Feather name="book-open" size={13} color={openTafseers.has(ck) ? QURAN_ACCENT : theme.textTertiary} />
                                    <Text style={[styles.ayahActionLabel, { color: openTafseers.has(ck) ? QURAN_ACCENT : theme.textTertiary }]}>
                                        Tafsirs
                                    </Text>
                                    {loadingTafseers.has(ck) && <ActivityIndicator size="small" color={QURAN_ACCENT} style={{ marginLeft: 3 }} />}
                                </TouchableOpacity>

                            </View>
                                );
                            })()}

                            {/* Tafseer expandable box */}
                            {openTafseers.has(tafsirCacheKey(ayah.id)) && tafseerTexts[tafsirCacheKey(ayah.id)] && (
                                <View style={[styles.tafseerBox, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                                    <View style={styles.tafseerBoxHeader}>
                                        <Feather name="book-open" size={13} color={QURAN_ACCENT} />
                                        <Text style={styles.tafseerBoxTitle}>
                                            {(TAFSIR_BY_LANG[language] ?? TAFSIR_BY_LANG.english).name} — {ayah.surah_number}:{ayah.ayah_number}
                                        </Text>
                                    </View>
                                    <Text style={[
                                        styles.tafseerBoxText,
                                        { color: theme.textSecondary },
                                        language === 'urdu' && { textAlign: 'right', writingDirection: 'rtl', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', lineHeight: 30 },
                                    ]}>
                                        {tafseerTexts[tafsirCacheKey(ayah.id)]}
                                    </Text>
                                </View>
                            )}

                        </View>
                    );
                }}
                onScrollToIndexFailed={(info) => {
                    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
                }}
            />

            {/* Continue / Stop Prompt — shown after each ayah finishes */}
            {showContinuePrompt && (
                <View style={[styles.continuePrompt, { backgroundColor: theme.bgCard, borderTopColor: theme.border }]}>
                    <Text style={[styles.continuePromptText, { color: theme.textPrimary }]}>
                        {pendingNextIndex >= ayahs.length
                            ? 'Surah completed'
                            : `Continue to Ayah ${ayahs[pendingNextIndex]?.ayah_number}?`}
                    </Text>
                    <View style={styles.continuePromptButtons}>
                        <TouchableOpacity
                            style={styles.stopButton}
                            onPress={handleStop}
                            accessibilityRole="button"
                            accessibilityLabel="Stop playback"
                        >
                            <Feather name="square" size={14} color="#8C4B40" />
                            <Text style={styles.stopButtonText}>Stop</Text>
                        </TouchableOpacity>
                        {pendingNextIndex < ayahs.length && (
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                                accessibilityRole="button"
                                accessibilityLabel="Continue to next ayah"
                            >
                                <Text style={styles.continueButtonText}>Continue</Text>
                                <Feather name="play" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Docked Audio Player */}
            <View style={[styles.audioPlayerContainer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.bg, borderTopColor: theme.border }]}>
                <View style={[styles.audioPlayerPanel, { backgroundColor: theme.bgCard }]}>
                    <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: theme.bgSecondary }]}
                        onPress={togglePlay}
                        accessibilityRole="button"
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                    >
                        <Feather name={isPlaying ? 'pause' : 'play'} size={22} color={theme.textPrimary} style={{ marginLeft: isPlaying ? 0 : 2 }} />
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                        <Text style={[styles.audioTitle, { color: theme.textPrimary }]}>{surahInfo?.name_english}</Text>
                        <TouchableOpacity
                            onPress={() => setShowReciterPicker(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Reciter ${selectedReciter.name}, tap to change`}
                        >
                            <Text style={[styles.audioSubtitle, { color: theme.accent }]} numberOfLines={1}>
                                {isPlaying || positionMillis > 0
                                    ? `${selectedReciter.name}  •  ${formatAudioTime(positionMillis)} / ${formatAudioTime(durationMillis)}`
                                    : selectedReciter.name}
                            </Text>
                            <Feather name="chevron-up" size={12} color={theme.accent} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.audioControlsRight}>
                        <TouchableOpacity
                            onPress={cycleSpeed}
                            style={[styles.speedBtn, { backgroundColor: theme.bgSecondary }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Playback speed ${playbackSpeed} times`}
                            accessibilityHint="Tap to cycle playback speed"
                        >
                            <Text style={[styles.audioSpeed, { color: theme.textPrimary }]}>{playbackSpeed}x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.skipBtn}
                            onPress={skipBack}
                            accessibilityRole="button"
                            accessibilityLabel="Previous ayah"
                        >
                            <Feather name="skip-back" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.skipBtn}
                            onPress={skipForward}
                            accessibilityRole="button"
                            accessibilityLabel="Next ayah"
                        >
                            <Feather name="skip-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* ─── Reciter Picker Modal ─────────────────────────────────────────────── */}
            <Modal
                transparent
                animationType="slide"
                visible={showReciterPicker}
                onRequestClose={() => setShowReciterPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: theme.bgCard }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose Reciter</Text>
                            <TouchableOpacity
                                onPress={() => setShowReciterPicker(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close reciter picker"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }]}>
                            Changing reciter will reload audio for this surah
                        </Text>
                        {RECITERS.map(reciter => (
                            <TouchableOpacity
                                key={reciter.id}
                                style={[
                                    styles.urduEditionRow,
                                    { borderColor: theme.border },
                                    selectedReciter.id === reciter.id && { backgroundColor: theme.accentLight, borderColor: theme.accent },
                                ]}
                                onPress={() => {
                                    // Persist via context — match shape to the global reciter list
                                    // so the Profile "Tweaks" picker shows the same entry.
                                    const globalMatch = GLOBAL_RECITERS.find(g => g.id === reciter.id);
                                    if (globalMatch) setSelectedReciter(globalMatch);
                                    setShowReciterPicker(false);
                                }}
                                activeOpacity={0.75}
                                accessibilityRole="radio"
                                accessibilityLabel={`${reciter.name}, ${reciter.country}`}
                                accessibilityState={{ selected: selectedReciter.id === reciter.id, checked: selectedReciter.id === reciter.id }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.urduEditionName, { color: theme.textPrimary }]}>{reciter.name}</Text>
                                    <Text style={[styles.urduEditionNameUrdu, { color: theme.textSecondary }]}>{reciter.country}</Text>
                                </View>
                                {selectedReciter.id === reciter.id && (
                                    <Feather name="check-circle" size={20} color={QURAN_ACCENT} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal
                transparent={true}
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: 0, backgroundColor: theme.bgCard }]}>
                        {/* Sticky header — stays above scroll area */}
                        <View style={[styles.modalHeader, { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 0 }]}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Reading Settings</Text>
                            <TouchableOpacity
                                onPress={() => setShowSettings(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close settings"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 20 }}>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Reciter</Text>
                        <View style={[styles.settingsGroup, { backgroundColor: theme.bgSecondary }]}>
                            {RECITERS.map(reciter => (
                                <TouchableOpacity
                                    key={reciter.id}
                                    style={[styles.settingOption, { borderBottomColor: theme.border }, selectedReciter.id === reciter.id && styles.settingOptionActive]}
                                    onPress={() => {
                                        const globalMatch = GLOBAL_RECITERS.find(g => g.id === reciter.id);
                                        if (globalMatch) setSelectedReciter(globalMatch);
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityLabel={`${reciter.name}, ${reciter.country}`}
                                    accessibilityState={{ selected: selectedReciter.id === reciter.id, checked: selectedReciter.id === reciter.id }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.settingOptionText, { color: theme.textPrimary }, selectedReciter.id === reciter.id && { color: QURAN_ACCENT }]}>
                                            {reciter.name}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 1 }}>{reciter.country}</Text>
                                    </View>
                                    {selectedReciter.id === reciter.id && <Feather name="check" size={18} color={QURAN_ACCENT} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Arabic Font Style</Text>
                        <View style={[styles.settingsGroup, { backgroundColor: theme.bgSecondary }]}>
                            {ARABIC_FONTS.map(font => (
                                <TouchableOpacity
                                    key={font.id}
                                    style={[styles.settingOption, { borderBottomColor: theme.border }, selectedFont.id === font.id && styles.settingOptionActive]}
                                    onPress={() => setSelectedFont(font)}
                                    accessibilityRole="radio"
                                    accessibilityLabel={`Arabic font: ${font.name}`}
                                    accessibilityState={{ selected: selectedFont.id === font.id, checked: selectedFont.id === font.id }}
                                >
                                    <Text style={[styles.settingOptionText, { color: theme.textPrimary }, selectedFont.id === font.id && { color: QURAN_ACCENT }]}>
                                        {font.name}
                                    </Text>
                                    {selectedFont.id === font.id && <Feather name="check" size={18} color={QURAN_ACCENT} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Text Size ({fontSize}pt)</Text>
                        <View style={[styles.sizeControlGroup, { backgroundColor: theme.bgSecondary }]}>
                            <TouchableOpacity
                                style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]}
                                onPress={() => setFontSize(Math.max(20, fontSize - 2))}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease text size"
                            >
                                <Feather name="minus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.sizePreviewIndicator}>Aa</Text>
                            <TouchableOpacity
                                style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]}
                                onPress={() => setFontSize(Math.min(56, fontSize + 2))}
                                accessibilityRole="button"
                                accessibilityLabel="Increase text size"
                            >
                                <Feather name="plus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* ── Tajweed Rules ── */}
                        {/* Tajweed colour-coding only works with Uthmani font — regex patterns target Uthmani codepoints */}
                        <View style={styles.tajweedHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Tajweed Rules</Text>
                                {selectedFont.id !== 'uthmani' && (
                                    <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                                        Requires Madinah Mushaf font
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.tajweedToggle, { backgroundColor: theme.bgSecondary, borderColor: theme.border }, tajweedEnabled && selectedFont.id === 'uthmani' && styles.tajweedToggleOn, selectedFont.id !== 'uthmani' && { opacity: 0.4 }]}
                                onPress={() => {
                                    if (selectedFont.id !== 'uthmani') return; // silently block
                                    setTajweedEnabled(v => !v);
                                }}
                                activeOpacity={selectedFont.id !== 'uthmani' ? 1 : 0.7}
                                accessibilityRole="switch"
                                accessibilityLabel="Tajweed colour coding"
                                accessibilityState={{ checked: tajweedEnabled && selectedFont.id === 'uthmani', disabled: selectedFont.id !== 'uthmani' }}
                            >
                                <Text style={[styles.tajweedToggleText, { color: theme.textSecondary }, tajweedEnabled && selectedFont.id === 'uthmani' && styles.tajweedToggleTextOn]}>
                                    {tajweedEnabled && selectedFont.id === 'uthmani' ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tajweedChips}>
                            {TAJWEED_RULES.map(rule => {
                                const fontOk = selectedFont.id === 'uthmani';
                                const active = fontOk && tajweedEnabled && enabledRules.has(rule.id);
                                return (
                                    <TouchableOpacity
                                        key={rule.id}
                                        style={[
                                            styles.tajweedChip,
                                            { borderColor: rule.color, backgroundColor: theme.bgCard },
                                            active && { backgroundColor: rule.color + '18' },
                                            (!tajweedEnabled || !fontOk) && { opacity: 0.4 },
                                        ]}
                                        onPress={() => fontOk && tajweedEnabled && toggleTajweedRule(rule.id)}
                                        activeOpacity={fontOk && tajweedEnabled ? 0.7 : 1}
                                        accessibilityRole="checkbox"
                                        accessibilityLabel={`Tajweed rule ${rule.label}`}
                                        accessibilityState={{ checked: active, disabled: !tajweedEnabled || !fontOk }}
                                    >
                                        <View style={[styles.tajweedDot, { backgroundColor: rule.color }]} />
                                        <Text style={[styles.tajweedChipText, { color: theme.textSecondary }, active && { color: rule.color }]}>
                                            {rule.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Urdu Translation Picker Modal */}
            <Modal
                transparent
                animationType="slide"
                visible={showUrduPicker}
                onRequestClose={() => setShowUrduPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: theme.bgCard }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>اردو ترجمہ</Text>
                            <TouchableOpacity
                                onPress={() => setShowUrduPicker(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close Urdu translation picker"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x" size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }]}>
                            Select Urdu Translation
                        </Text>
                        {URDU_EDITIONS.map(ed => (
                            <TouchableOpacity
                                key={ed.id}
                                style={[
                                    styles.urduEditionRow,
                                    { borderColor: theme.border },
                                    urduEdition === ed.id && { backgroundColor: theme.accentLight, borderColor: theme.accent },
                                ]}
                                onPress={() => { setUrduEdition(ed.id); setShowUrduPicker(false); }}
                                activeOpacity={0.75}
                                accessibilityRole="radio"
                                accessibilityLabel={`Urdu edition: ${ed.name}`}
                                accessibilityState={{ selected: urduEdition === ed.id, checked: urduEdition === ed.id }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.urduEditionName, { color: theme.textPrimary }]}>{ed.name}</Text>
                                    <Text style={[styles.urduEditionNameUrdu, { color: theme.textSecondary }]}>{ed.nameUrdu}</Text>
                                </View>
                                {urduEdition === ed.id && (
                                    <Feather name="check-circle" size={20} color={QURAN_ACCENT} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* ─── Bookmarks Modal (#21) ───────────────────────────────────────── */}
            <Modal
                transparent
                animationType="slide"
                visible={showBookmarks}
                onRequestClose={() => setShowBookmarks(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: theme.bgCard, maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Bookmarks</Text>
                            <TouchableOpacity
                                onPress={() => setShowBookmarks(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close bookmarks"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {bookmarks.length === 0 ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
                                <Feather name="bookmark" size={36} color={theme.textTertiary} />
                                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>No bookmarks yet</Text>
                                <Text style={{ color: theme.textTertiary, fontSize: 12, textAlign: 'center', paddingHorizontal: 32 }}>
                                    Tap the bookmark icon next to any ayah to save it for later.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={[...bookmarks].sort((a, b) => b.saved_at - a.saved_at)}
                                keyExtractor={(b) => `${b.surah_number}:${b.ayah_number}`}
                                renderItem={({ item: b }) => (
                                    <TouchableOpacity
                                        style={[styles.urduEditionRow, { borderColor: theme.border }]}
                                        onPress={() => jumpToBookmark(b)}
                                        activeOpacity={0.75}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Jump to ${b.surah_name} ayah ${b.surah_number}:${b.ayah_number}`}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.urduEditionName, { color: theme.textPrimary }]}>
                                                {b.surah_name} · {b.surah_number}:{b.ayah_number}
                                            </Text>
                                            {!!b.arabic_snippet && (
                                                <Text style={[styles.urduEditionNameUrdu, { color: theme.textSecondary }]} numberOfLines={1}>
                                                    {b.arabic_snippet}
                                                </Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => toggleBookmark({ surah_number: b.surah_number, ayah_number: b.ayah_number })}
                                            hitSlop={10}
                                            accessibilityRole="button"
                                            accessibilityLabel="Remove bookmark"
                                        >
                                            <Feather name="trash-2" size={18} color={theme.textTertiary} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                                style={{ marginBottom: 8 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    actionButton: {
        width: 30,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Surah title — editorial serif italic per the Falah reader design
    surahTitle: {
        fontSize: 22,
        fontFamily: fonts.serif,
        marginLeft: 8,
    },
    // ── Surah hero header (scrolls with content) ─────────────────────────────
    surahHero: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 28,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    surahHeroArabic: {
        fontSize: 52,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 80,
    },
    surahHeroEnglish: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    surahHeroMeaning: {
        fontSize: 15,
        textAlign: 'center',
        marginTop: 4,
        fontStyle: 'italic',
    },
    surahHeroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
    },
    surahHeroBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    surahHeroBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#fef3c7',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
    },
    offlineBannerText: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '600',
    },
    bismillahBannerBlock: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 4,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        marginHorizontal: 16,
    },
    bismillahText: {
        fontSize: 32,
        textAlign: 'center',
    },
    ayahContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    ayahContainerActive: {},
    ayahHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    bookmarkBtn: {
        padding: 6,
    },
    ayahPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    ayahPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    arabicContentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    ayahDecorativeContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        position: 'relative',
    },
    ayahDecorativeMark: {
        color: QURAN_ACCENT,
        fontSize: 32,
        position: 'absolute',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    ayahNumberText: {
        color: QURAN_ACCENT,
        fontSize: 11,
        fontWeight: 'bold',
        position: 'absolute',
    },
    arabicText: {
        textAlign: 'right',
        flexShrink: 1,
    },
    // Active (highlighted) word during recitation
    arabicWordActive: {
        backgroundColor: 'rgba(244, 209, 37, 0.55)',
        borderRadius: 3,
    },
    // Non-active words in the reciting ayah — subtle dim
    arabicWordIdle: {},
    translationText: {
        fontSize: 17,
        lineHeight: 28,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'left',
    },
    // ── Per-ayah action bar ───────────────────────────────────────────────────
    ayahActionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    ayahActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 6,
        flex: 1,
        justifyContent: 'center',
    },
    ayahActionLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    ayahActionDivider: {
        width: StyleSheet.hairlineWidth,
        height: 18,
    },
    // ── Tafseer ───────────────────────────────────────────────────────────────
    tafseerBox: {
        marginTop: 12,
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: QURAN_GOLD,
        borderWidth: 1,
    },
    tafseerBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    tafseerBoxTitle: {
        color: QURAN_ACCENT,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tafseerBoxText: {
        fontSize: 15,
        lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    // ── Continue / Stop prompt ────────────────────────────────────────────────
    continuePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    continuePromptText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    continuePromptButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: QURAN_ACCENT,
    },
    stopButtonText: {
        color: QURAN_ACCENT,
        fontSize: 13,
        fontWeight: '600',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: QURAN_ACCENT,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    // ── Audio Player ──────────────────────────────────────────────────────────
    audioPlayerContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    audioPlayerPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioInfo: {
        flex: 1,
        marginLeft: 12,
    },
    audioTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    audioSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    audioControlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    audioSpeed: {
        fontSize: 14,
        fontWeight: '600',
    },
    speedBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    skipBtn: {
        padding: 4,
    },
    // ── Settings Modal ────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '88%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    settingLabel: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    settingsGroup: {
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    settingOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    settingOptionActive: {
        backgroundColor: 'rgba(140, 75, 64, 0.05)',
    },
    settingOptionText: {
        fontSize: 16,
    },
    sizeControlGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        padding: 12,
    },
    sizeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizePreviewIndicator: {
        color: QURAN_ACCENT,
        fontSize: 20,
        fontWeight: '500',
    },

    // ── Tajweed ──
    tajweedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 12,
    },
    tajweedToggle: {
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
    },
    tajweedToggleOn: {
        backgroundColor: QURAN_ACCENT,
        borderColor: QURAN_ACCENT,
    },
    tajweedToggleText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tajweedToggleTextOn: {
        color: '#FFFFFF',
    },
    tajweedChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tajweedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    tajweedDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 7,
    },
    tajweedChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // ── Urdu picker ───────────────────────────────────────────────────────────
    urduPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(46,204,148,0.25)',
        backgroundColor: 'rgba(46,204,148,0.08)',
    },
    urduPickerLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    urduEditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    urduEditionName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    urduEditionNameUrdu: {
        fontSize: 16,
        fontFamily: 'NotoNastaliqUrdu_400Regular',
        textAlign: 'right',
    },
});
