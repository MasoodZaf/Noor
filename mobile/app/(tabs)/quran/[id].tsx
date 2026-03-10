import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createAudioPlayer } from 'expo-audio';
import { useAudio } from '../../../context/AudioContext';
import { useFonts } from 'expo-font';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';

// ─── APIs ─────────────────────────────────────────────────────────────────────
// Arabic text — Quran.com v4 API (verified against King Fahd Complex Medina Mushaf)
const QURAN_API = 'https://api.quran.com/api/v4';

// Audio CDN — verses.quran.com (download.quranicaudio.com no longer serves these paths)
const AUDIO_CDN = 'https://verses.quran.com/';

// Translations — AlQuran Cloud (urdu) + Fawaz CDN (others)
const AUDIO_API = 'https://api.alquran.cloud/v1';
const FAWAZ_API = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';

const FAWAZ_EDITIONS: Record<string, string> = {
    english: 'eng-muftitaqiusmani',
    indonesian: 'ind-indonesianislam',
    french: 'fra-muhammadhameedu',
    bengali: 'ben-muhiuddinkhan',
    turkish: 'tur-diyanetisleri',
};

const ALQURAN_EDITIONS: Record<string, string> = {
    urdu: 'ur.jalandhry',
};

const fetchTranslationTexts = async (surahId: number, language: string): Promise<string[]> => {
    const alquranEdition = ALQURAN_EDITIONS[language];
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
const ARABIC_FONTS = [
    { id: 'uthmani', name: 'Uthmani Naskh (Scheherazade)', family: 'ScheherazadeNew_400Regular', field: 'text_uthmani' },
    { id: 'indopak', name: 'Indo-Pak Nastaleeq (Noto Naskh)', family: 'NotoNaskhArabic_400Regular', field: 'text_indopak' },
];

// Reciters — Quran.com recitation IDs (audio field in verses API)
const RECITERS = [
    { id: 7, name: 'Mishary Al-Afasy', label: 'Mishary Al-Afasy' },
    { id: 1, name: 'Abdul Basit (Murattal)', label: 'Abdul Basit Abdul Samad' },
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
function detectTajweed(wordText: string, nextWordText?: string): TajweedRuleId | null {
    // 1. Ghunnah — noon or meem with shadda (نّ / مّ)
    if (/[نم]\u0651/.test(wordText)) return 'ghunnah';

    // 2. Qalqalah — one of ق ط ب ج د carrying a sukoon
    if (/[قطبجد]\u0652/.test(wordText)) return 'qalqalah';

    // 3. Madd — clear long-vowel markers in the Uthmani text:
    //    • U+0622 alef-with-madda (آ)
    //    • U+06E4 small high madda (ۤ)
    //    • U+0670 superscript alef (ٰ)
    //    • Waw or ya carrying a sukoon (وْ / يْ)
    if (/[\u0622\u06E4\u0670]/.test(wordText) || /[وي]\u0652/.test(wordText)) return 'madd';

    // 4. Cross-word rules: noon-sakinah or tanween at word-end → check next word's first letter
    const bare = wordText.replace(/\s/g, '');
    const endsNoonSakinah = /ن\u0652$/.test(bare);
    const endsTanween     = /[\u064B\u064C\u064D]$/.test(bare);

    if ((endsNoonSakinah || endsTanween) && nextWordText) {
        const first = firstBaseLetter(nextWordText);
        if (IDGHAM_SET.has(first))  return 'idgham';
        if (IKHFA_SET.has(first))   return 'ikhfa';
    }

    return null;
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

// Build ayah objects from raw verse data (from API) + translations
// verses[] come from Quran.com v4 with words=true&audio=7
const buildAyahs = (surahId: number, verses: any[], translations: string[]) =>
    verses.map((v, i) => ({
        id: `${surahId}_${i + 1}`,
        surah_number: surahId,
        ayah_number: i + 1,
        text_uthmani: v.text_uthmani || '',
        text_indopak: v.text_indopak_nastaleeq || v.text_uthmani || '',
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

const { width } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuranReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();

    const surahId = typeof id === 'string' ? parseInt(id, 10) : 1;

    const { soundRef: globalSoundRef, setAudioState, audioState } = useAudio();

    const [fontsLoaded] = useFonts({ ScheherazadeNew_400Regular, NotoNaskhArabic_400Regular });

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
    const prevLanguageRef = useRef<string>(language);

    // Timing segments for currently playing ayah — used in playback status callback
    const currentSegmentsRef = useRef<number[][]>([]);

    // true = full-surah auto-advance mode (main play button); false = single ayah mode (pill tap)
    const autoPlayRef = useRef(false);

    // Load timeout timer — clears when verse loads successfully, fires to skip on network failure
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reciter selection
    const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]);
    const prevReciterIdRef = useRef(RECITERS[0].id);

    // Throttle position/duration state updates — update UI at most every 4th callback tick
    // (updateInterval=250ms → effective UI refresh ~1 per second, enough for progress bar)
    const posTickRef = useRef(0);

    // Audio Player State
    const [durationMillis, setDurationMillis] = useState(1);
    const [positionMillis, setPositionMillis] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const SPEEDS = [0.75, 1.0, 1.25, 1.5];

    const formatAudioTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    // Tafseer
    const [tafseerTexts, setTafseerTexts] = useState<Record<string, string>>({});
    const [openTafseers, setOpenTafseers] = useState<Set<string>>(new Set());
    const [loadingTafseers, setLoadingTafseers] = useState<Set<string>>(new Set());

    const toggleTafseer = async (ayahKey: string) => {
        if (openTafseers.has(ayahKey)) {
            setOpenTafseers(prev => { const s = new Set(prev); s.delete(ayahKey); return s; });
            return;
        }
        if (tafseerTexts[ayahKey]) {
            setOpenTafseers(prev => new Set(prev).add(ayahKey));
            return;
        }
        setLoadingTafseers(prev => new Set(prev).add(ayahKey));
        try {
            const res = await fetch(`${QURAN_API}/tafsirs/169/by_ayah/${ayahKey}`);
            const json = await res.json();
            const raw = json?.tafsir?.text || 'Tafseer not available.';
            const clean = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            setTafseerTexts(prev => ({ ...prev, [ayahKey]: clean }));
            setOpenTafseers(prev => new Set(prev).add(ayahKey));
        } catch {
            setTafseerTexts(prev => ({ ...prev, [ayahKey]: 'Could not load tafseer. Please check your connection.' }));
            setOpenTafseers(prev => new Set(prev).add(ayahKey));
        } finally {
            setLoadingTafseers(prev => { const s = new Set(prev); s.delete(ayahKey); return s; });
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
        prevLanguageRef.current = language;

        const loadSurah = async () => {
            setLoading(true);
            try {
                // Fetch chapter info + verified verses (with word segments + audio) + translation in parallel
                // words=true → word-split text for highlighting
                // audio=7 → Mishary Al-Afasy per-verse audio URLs + word timing segments
                const [chapterResult, versesResult, translationResult] = await Promise.allSettled([
                    fetch(`${QURAN_API}/chapters/${surahId}`),
                    fetch(`${QURAN_API}/verses/by_chapter/${surahId}?words=true&word_fields=text_uthmani&fields=text_uthmani,text_indopak_nastaleeq&audio=${selectedReciter.id}&per_page=300&page=1`),
                    fetchTranslationTexts(surahId, language),
                ]);

                if (chapterResult.status === 'fulfilled' && chapterResult.value.ok) {
                    const json = await chapterResult.value.json();
                    const ch = json.chapter;
                    setSurahInfo({
                        number: surahId,
                        name_english: ch.name_simple,
                        name_arabic: ch.name_arabic,
                        revelation_type: ch.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
                        total_ayahs: ch.verses_count,
                        bismillah_pre: ch.bismillah_pre,
                    });
                }

                let verses: any[] = [];
                if (versesResult.status === 'fulfilled' && versesResult.value.ok) {
                    const json = await versesResult.value.json();
                    verses = json.verses || [];
                }

                const translationTexts = translationResult.status === 'fulfilled' ? translationResult.value : [];

                if (verses.length === 0) throw new Error('Verse fetch failed');

                arabicCacheRef.current = verses;
                setAyahs(buildAyahs(surahId, verses, translationTexts));

            } catch {
                // Offline fallback: local SQLite DB (no word segments)
                setIsOffline(true);
                if (db) {
                    try {
                        const surah = await db.getFirstAsync('SELECT * FROM surahs WHERE number = ?', [surahId]) as any;
                        setSurahInfo({
                            ...surah,
                            bismillah_pre: surah?.number !== 1 && surah?.number !== 9,
                        });
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        // Build offline verse objects (no audio or word segments)
                        const offlineVerses = rows.map((r: any) => ({
                            text_uthmani: r.text_arabic || '',
                            text_indopak_nastaleeq: r.text_arabic_indopak || r.text_arabic || '',
                            audio: null,
                            words: [],
                            segments: [],
                        }));
                        const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                        arabicCacheRef.current = offlineVerses;
                        setAyahs(buildAyahs(surahId, offlineVerses, translationTexts));
                    } catch (dbErr) {
                        console.error('DB fallback failed:', dbErr);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        loadSurah();

        return () => {
            if (globalSoundRef.current) {
                try { globalSoundRef.current.remove(); } catch {}
            }
        };
    }, [surahId, db]);

    // ── Language change: update translation only, preserve Arabic cache ────────
    useEffect(() => {
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;

        const cache = arabicCacheRef.current;
        if (!cache || ayahs.length === 0) return;

        const updateTranslation = async () => {
            setTranslationLoading(true);
            try {
                const translationTexts = await fetchTranslationTexts(surahId, language);
                setAyahs(buildAyahs(surahId, cache, translationTexts));
            } catch {
                if (db) {
                    try {
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                        setAyahs(buildAyahs(surahId, cache, translationTexts));
                    } catch { }
                }
            } finally {
                setTranslationLoading(false);
            }
        };

        updateTranslation();
    }, [language]);

    // ── Reciter change: re-fetch audio URLs, preserve Arabic text + translation cache ──
    useEffect(() => {
        if (prevReciterIdRef.current === selectedReciter.id) return;
        prevReciterIdRef.current = selectedReciter.id;

        const cache = arabicCacheRef.current;
        if (!cache || ayahs.length === 0) return;

        // Stop any active playback first
        handleStop();

        const refetchAudio = async () => {
            setTranslationLoading(true);
            try {
                const res = await fetch(
                    `${QURAN_API}/verses/by_chapter/${surahId}?words=true&word_fields=text_uthmani&fields=text_uthmani,text_indopak_nastaleeq&audio=${selectedReciter.id}&per_page=300&page=1`
                );
                if (!res.ok) throw new Error(`Verse fetch ${res.status}`);
                const json = await res.json();
                const newVerses: any[] = json.verses || [];
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
                setTranslationLoading(false);
            }
        };

        refetchAudio();
    }, [selectedReciter.id]);

    // Keep local isPlaying in sync with global audio state
    useEffect(() => {
        const isOurSurah = audioState.sourceCategory === 'quran' && audioState.sourceId === surahInfo?.number;
        if (isOurSurah) {
            setIsPlaying(audioState.isPlaying);
        } else {
            setIsPlaying(false);
        }
    }, [audioState.isPlaying, audioState.sourceId, surahInfo?.number]);

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

            // Remove previous player — pause first so ExoPlayer stops immediately (async remove)
            if (globalSoundRef.current) {
                const old = globalSoundRef.current;
                globalSoundRef.current = null;
                try { old.pause(); } catch {}
                try { old.remove(); } catch {}
            }

            posTickRef.current = 0;
            // expo-audio — updateInterval:250ms reduces callback frequency (less audio thread contention)
            const player = createAudioPlayer({ uri: ayah.audio }, { updateInterval: 250 });
            globalSoundRef.current = player;

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

            // Two closure-level guards:
            // playTriggered — ensures play() is called exactly once after load (Android)
            // didFinish     — prevents didJustFinish from firing twice (ExoPlayer quirk)
            let playTriggered = false;
            let didFinish = false;

            player.addListener('playbackStatusUpdate', (status) => {
                // Ensure playback starts on Android (ExoPlayer must be loaded first)
                if (!playTriggered && status.isLoaded) {
                    playTriggered = true;
                    // Clear load timeout — audio loaded successfully
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                        loadTimeoutRef.current = null;
                    }
                    if (!status.playing) player.play();
                }

                // Handle network/decode errors — skip to next verse instead of silently stopping
                if ((status as any).error && !didFinish) {
                    didFinish = true;
                    currentSegmentsRef.current = [];
                    setCurrentWordIndex(-1);
                    if (autoPlayRef.current) {
                        setTimeout(() => playNextAyah(index + 1), 300);
                    } else {
                        setIsPlaying(false);
                        setAudioState(s => ({ ...s, isPlaying: false }));
                    }
                    return;
                }

                const posMs = status.currentTime * 1000;
                const durMs = (status.duration || 0) * 1000;

                // Throttle progress bar updates: update state every 2nd tick (~2× per second)
                // This halves the number of FlatList re-renders without noticeable UI lag
                posTickRef.current += 1;
                if (posTickRef.current % 2 === 0) {
                    setPositionMillis(posMs);
                    setDurationMillis(durMs || 1);
                    setAudioState(s => ({
                        ...s,
                        positionMs: posMs,
                        durationMs: durMs || 1,
                        isPlaying: status.playing,
                    }));
                }

                // Word-by-word highlighting
                const segs = currentSegmentsRef.current;
                if (segs.length > 0) {
                    let activeWord = -1;
                    for (const seg of segs) {
                        if (posMs >= seg[2] && posMs <= seg[3]) {
                            activeWord = seg[1];
                            break;
                        }
                    }
                    setCurrentWordIndex(activeWord);
                }

                // Guard: didJustFinish can fire more than once on Android — only act on the first
                if (status.didJustFinish && !didFinish) {
                    didFinish = true;
                    setCurrentWordIndex(-1);
                    currentSegmentsRef.current = [];
                    if (autoPlayRef.current) {
                        // Full-surah mode: defer via setTimeout so this callback fully exits
                        // before the old player is removed and the new one is created.
                        // Without the defer, ExoPlayer can overlap two streams briefly.
                        setTimeout(() => playNextAyah(index + 1), 100);
                    } else {
                        // Single-ayah mode: show continue/stop prompt
                        setPendingNextIndex(index + 1);
                        setShowContinuePrompt(true);
                    }
                }
            });

            // iOS: can call play() immediately (AVPlayer buffers and starts when ready)
            // Android: play() will be triggered by the isLoaded check in the listener above
            if (Platform.OS === 'ios') player.play();

            // Load timeout: if audio doesn't load within 12 s (network failure/slow CDN), skip verse
            loadTimeoutRef.current = setTimeout(() => {
                loadTimeoutRef.current = null;
                if (!playTriggered && globalSoundRef.current === player) {
                    console.warn('[Quran] Audio load timeout — skipping verse', index);
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
        if (!surahInfo || ayahs.length === 0) return;
        const player = globalSoundRef.current;
        if (player && player.isLoaded) {
            if (isPlaying) {
                player.pause();
            } else {
                autoPlayRef.current = true; // resuming full-surah playback
                player.play();
            }
            return;
        }
        autoPlayRef.current = true; // full-surah auto-advance mode
        playNextAyah(currentAyahIndex ?? 0);
    };

    const skipBack = () => {
        const player = globalSoundRef.current;
        if (!player) return;
        player.seekTo(Math.max(0, (positionMillis - 10000) / 1000));
    };

    const skipForward = () => {
        const player = globalSoundRef.current;
        if (!player) return;
        player.seekTo(Math.min(durationMillis, (positionMillis + 10000)) / 1000);
    };

    const cycleSpeed = () => {
        const nextIndex = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
        const next = SPEEDS[nextIndex];
        setPlaybackSpeed(next);
        if (globalSoundRef.current) {
            globalSoundRef.current.playbackRate = next;
        }
    };

    const handleStop = () => {
        autoPlayRef.current = false;
        setShowContinuePrompt(false);
        setIsPlaying(false);
        setCurrentAyahIndex(null);
        setCurrentWordIndex(-1);
        if (globalSoundRef.current) {
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Opening Surah...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.surahTitle}>{surahInfo?.name_english || 'Al-Fatihah'}</Text>
                    <Feather name="chevron-down" size={16} color="#1A1A1A" style={{ marginLeft: 4, marginTop: 4 }} />
                </View>
                <View style={styles.headerRight}>
                    {translationLoading && (
                        <ActivityIndicator size="small" color="#C9A84C" style={{ marginRight: 8 }} />
                    )}
                    <TouchableOpacity style={styles.actionButton}>
                        <Feather name="info" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
                        <Feather name="settings" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.subHeader}>
                <Text style={styles.subHeaderText}>{surahInfo?.number}. {surahInfo?.name_english}</Text>
                <View style={styles.goalContainer}>
                    <Text style={styles.goalText}>{surahInfo?.total_ayahs || surahInfo?.ayah_count || ''} Ayahs</Text>
                    <Text style={[styles.goalText, { color: surahInfo?.revelation_type === 'Meccan' ? '#C9A84C' : '#2ECC71', marginLeft: 8 }]}>
                        {surahInfo?.revelation_type || ''}
                    </Text>
                </View>
            </View>

            {isOffline && (
                <View style={styles.offlineBanner}>
                    <Feather name="wifi-off" size={12} color="#92400e" />
                    <Text style={styles.offlineBannerText}>Reading from offline vault</Text>
                </View>
            )}

            {/* Ayah List */}
            <FlatList
                ref={flatListRef}
                data={ayahs}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingVertical: 10, paddingBottom: 160 }}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item: ayah, index }) => {
                    const isCurrent = currentAyahIndex === index;
                    return (
                        <View style={[styles.ayahContainer, isCurrent && styles.ayahContainerActive]}>
                            {index === 0 && surahInfo?.bismillah_pre && (
                                <View style={styles.bismillahBannerBlock}>
                                    <Text style={[styles.bismillahText, { fontFamily: selectedFont.family }]}>
                                        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                    </Text>
                                </View>
                            )}
                            <View style={styles.ayahHeader}>
                                <TouchableOpacity
                                    style={[styles.ayahPillBadge, isCurrent && { backgroundColor: '#8C4B40' }]}
                                    onPress={() => { autoPlayRef.current = false; playNextAyah(index); }}
                                >
                                    <Text style={[styles.ayahPillText, isCurrent && { color: '#FFFFFF' }]}>
                                        {ayah.surah_number}:{ayah.ayah_number}
                                    </Text>
                                    <Feather
                                        name={isCurrent && isPlaying ? 'volume-2' : 'play'}
                                        size={14}
                                        color={isCurrent ? '#FFFFFF' : '#5E5C58'}
                                        style={{ marginLeft: 6 }}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.arabicContentWrapper}>
                                <View style={styles.ayahDecorativeContainer}>
                                    <Text style={[styles.ayahDecorativeMark, isCurrent && { color: '#8C4B40' }]}>۝</Text>
                                    <Text style={[styles.ayahNumberText, isCurrent && { color: '#8C4B40' }]}>
                                        {toArabicDigits(ayah.ayah_number)}
                                    </Text>
                                </View>

                                {/* Word-by-word rendering (audio highlight OR Tajweed coloring) */}
                                {(isCurrent && ayah.words.length > 0) || (tajweedEnabled && ayah.words.length > 0) ? (
                                    <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.8 }]}>
                                        {ayah.words.map((word: { text: string; position: number }, wi: number) => {
                                            // Detect tajweed rule for this word (cross-word: pass next word's text)
                                            const rule = tajweedEnabled
                                                ? detectTajweed(word.text, ayah.words[wi + 1]?.text)
                                                : null;
                                            const ruleColor = (rule && enabledRules.has(rule))
                                                ? TAJWEED_RULES.find(r => r.id === rule)!.color
                                                : null;

                                            // Audio highlight overrides Tajweed color on the active word
                                            const isActiveWord = isCurrent && currentWordIndex === word.position;
                                            return (
                                                <Text
                                                    key={word.position}
                                                    style={[
                                                        isActiveWord ? styles.arabicWordActive : (isCurrent ? styles.arabicWordIdle : null),
                                                        ruleColor && !isActiveWord ? { color: ruleColor } : null,
                                                    ]}
                                                >
                                                    {word.text}{' '}
                                                </Text>
                                            );
                                        })}
                                    </Text>
                                ) : (
                                    <Text style={[
                                        styles.arabicText,
                                        { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.6 },
                                        isCurrent && { color: '#8C4B40' }
                                    ]}>
                                        {ayah[selectedFont.field] || ayah.text_uthmani}
                                    </Text>
                                )}
                            </View>

                            <Text style={[
                                styles.translationText,
                                language === 'urdu' && {
                                    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                                    fontSize: 18,
                                    textAlign: 'right',
                                    lineHeight: 32,
                                }
                            ]}>
                                {ayah.text_translation}
                            </Text>

                            {/* Tafseer toggle row */}
                            <TouchableOpacity
                                style={styles.tafseerToggleRow}
                                onPress={() => toggleTafseer(ayah.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.tafseerToggleLabel}>Maariful Quran</Text>
                                {loadingTafseers.has(ayah.id) ? (
                                    <ActivityIndicator size="small" color="#8C4B40" style={{ marginLeft: 6 }} />
                                ) : (
                                    <Feather
                                        name={openTafseers.has(ayah.id) ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color="#8C4B40"
                                        style={{ marginLeft: 6 }}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Tafseer expandable box */}
                            {openTafseers.has(ayah.id) && tafseerTexts[ayah.id] && (
                                <View style={styles.tafseerBox}>
                                    <View style={styles.tafseerBoxHeader}>
                                        <Feather name="book-open" size={13} color="#8C4B40" />
                                        <Text style={styles.tafseerBoxTitle}>Maariful Quran — {ayah.surah_number}:{ayah.ayah_number}</Text>
                                    </View>
                                    <Text style={styles.tafseerBoxText}>{tafseerTexts[ayah.id]}</Text>
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
                <View style={styles.continuePrompt}>
                    <Text style={styles.continuePromptText}>
                        {pendingNextIndex >= ayahs.length
                            ? 'Surah completed'
                            : `Continue to Ayah ${ayahs[pendingNextIndex]?.ayah_number}?`}
                    </Text>
                    <View style={styles.continuePromptButtons}>
                        <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                            <Feather name="square" size={14} color="#8C4B40" />
                            <Text style={styles.stopButtonText}>Stop</Text>
                        </TouchableOpacity>
                        {pendingNextIndex < ayahs.length && (
                            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                                <Text style={styles.continueButtonText}>Continue</Text>
                                <Feather name="play" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Docked Audio Player */}
            <View style={[styles.audioPlayerContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.audioPlayerPanel}>
                    <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
                        <Feather name={isPlaying ? 'pause' : 'play'} size={22} color="#1A1A1A" style={{ marginLeft: isPlaying ? 0 : 2 }} />
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                        <Text style={styles.audioTitle}>{surahInfo?.name_english}</Text>
                        <Text style={styles.audioSubtitle}>
                            {isPlaying || positionMillis > 0
                                ? `${formatAudioTime(positionMillis)} / ${formatAudioTime(durationMillis)}`
                                : selectedReciter.name}
                        </Text>
                    </View>
                    <View style={styles.audioControlsRight}>
                        <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn}>
                            <Text style={styles.audioSpeed}>{playbackSpeed}x</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.skipBtn} onPress={skipBack}>
                            <Feather name="skip-back" size={20} color="#5E5C58" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.skipBtn} onPress={skipForward}>
                            <Feather name="skip-forward" size={20} color="#5E5C58" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Settings Modal */}
            <Modal
                transparent={true}
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reading Settings</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <Feather name="x" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.settingLabel}>Reciter</Text>
                        <View style={styles.settingsGroup}>
                            {RECITERS.map(reciter => (
                                <TouchableOpacity
                                    key={reciter.id}
                                    style={[styles.settingOption, selectedReciter.id === reciter.id && styles.settingOptionActive]}
                                    onPress={() => setSelectedReciter(reciter)}
                                >
                                    <Text style={[styles.settingOptionText, selectedReciter.id === reciter.id && { color: '#8C4B40' }]}>
                                        {reciter.name}
                                    </Text>
                                    {selectedReciter.id === reciter.id && <Feather name="check" size={18} color="#8C4B40" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingLabel}>Arabic Font Style</Text>
                        <View style={styles.settingsGroup}>
                            {ARABIC_FONTS.map(font => (
                                <TouchableOpacity
                                    key={font.id}
                                    style={[styles.settingOption, selectedFont.id === font.id && styles.settingOptionActive]}
                                    onPress={() => setSelectedFont(font)}
                                >
                                    <Text style={[styles.settingOptionText, selectedFont.id === font.id && { color: '#8C4B40' }]}>
                                        {font.name}
                                    </Text>
                                    {selectedFont.id === font.id && <Feather name="check" size={18} color="#8C4B40" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingLabel}>Text Size ({fontSize}pt)</Text>
                        <View style={styles.sizeControlGroup}>
                            <TouchableOpacity style={styles.sizeBtn} onPress={() => setFontSize(Math.max(20, fontSize - 2))}>
                                <Feather name="minus" size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                            <Text style={styles.sizePreviewIndicator}>Aa</Text>
                            <TouchableOpacity style={styles.sizeBtn} onPress={() => setFontSize(Math.min(56, fontSize + 2))}>
                                <Feather name="plus" size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* ── Tajweed Rules ── */}
                        <View style={styles.tajweedHeader}>
                            <Text style={styles.settingLabel}>Tajweed Rules</Text>
                            <TouchableOpacity
                                style={[styles.tajweedToggle, tajweedEnabled && styles.tajweedToggleOn]}
                                onPress={() => setTajweedEnabled(v => !v)}
                            >
                                <Text style={[styles.tajweedToggleText, tajweedEnabled && styles.tajweedToggleTextOn]}>
                                    {tajweedEnabled ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tajweedChips}>
                            {TAJWEED_RULES.map(rule => {
                                const active = tajweedEnabled && enabledRules.has(rule.id);
                                return (
                                    <TouchableOpacity
                                        key={rule.id}
                                        style={[
                                            styles.tajweedChip,
                                            { borderColor: rule.color },
                                            active && { backgroundColor: rule.color + '18' },
                                            !tajweedEnabled && { opacity: 0.4 },
                                        ]}
                                        onPress={() => tajweedEnabled && toggleTajweedRule(rule.id)}
                                        activeOpacity={tajweedEnabled ? 0.7 : 1}
                                    >
                                        <View style={[styles.tajweedDot, { backgroundColor: rule.color }]} />
                                        <Text style={[styles.tajweedChipText, active && { color: rule.color }]}>
                                            {rule.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF6E3',
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
    surahTitle: {
        color: '#1A1A1A',
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    subHeaderText: {
        color: '#5E5C58',
        fontSize: 13,
    },
    goalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    goalText: {
        color: '#5E5C58',
        fontSize: 13,
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
        backgroundColor: '#C5D8B8',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#5B8C5A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        marginHorizontal: 16,
    },
    bismillahText: {
        color: '#1A1A1A',
        fontSize: 32,
        textAlign: 'center',
    },
    ayahContainer: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    ayahContainerActive: {
        backgroundColor: 'rgba(140, 75, 64, 0.05)',
    },
    ayahHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 16,
    },
    ayahPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EAE2CF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    ayahPillText: {
        color: '#5E5C58',
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
        color: '#8C4B40',
        fontSize: 32,
        position: 'absolute',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    ayahNumberText: {
        color: '#8C4B40',
        fontSize: 11,
        fontWeight: 'bold',
        position: 'absolute',
    },
    arabicText: {
        color: '#1A1A1A',
        textAlign: 'right',
        flexShrink: 1,
    },
    // Active (highlighted) word during recitation
    arabicWordActive: {
        color: '#1A1A1A',
        backgroundColor: 'rgba(244, 209, 37, 0.55)',
        borderRadius: 3,
    },
    // Non-active words in the reciting ayah — subtle dim
    arabicWordIdle: {
        color: 'rgba(140, 75, 64, 0.55)',
    },
    translationText: {
        color: '#4A4A4A',
        fontSize: 17,
        lineHeight: 28,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'left',
    },
    // ── Tafseer ───────────────────────────────────────────────────────────────
    tafseerToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(140,75,64,0.07)',
    },
    tafseerToggleLabel: {
        color: '#8C4B40',
        fontSize: 12,
        fontWeight: '600',
    },
    tafseerBox: {
        marginTop: 12,
        backgroundColor: '#FFF8EC',
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#C9A84C',
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.2)',
    },
    tafseerBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    tafseerBoxTitle: {
        color: '#8C4B40',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tafseerBoxText: {
        color: '#3A3A3A',
        fontSize: 15,
        lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    // ── Continue / Stop prompt ────────────────────────────────────────────────
    continuePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F4EBD9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(140,75,64,0.15)',
    },
    continuePromptText: {
        color: '#1A1A1A',
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
        borderColor: '#8C4B40',
    },
    stopButtonText: {
        color: '#8C4B40',
        fontSize: 13,
        fontWeight: '600',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#8C4B40',
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
        backgroundColor: '#FDF6E3',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    audioPlayerPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4EBD9',
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
        backgroundColor: '#EAE2CF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioInfo: {
        flex: 1,
        marginLeft: 12,
    },
    audioTitle: {
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: '600',
    },
    audioSubtitle: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 2,
    },
    audioControlsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    audioSpeed: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '600',
    },
    speedBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#EAE2CF',
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
        backgroundColor: '#FDF6E3',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '600',
    },
    settingLabel: {
        color: '#5E5C58',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    settingsGroup: {
        backgroundColor: '#F4EBD9',
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
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    settingOptionActive: {
        backgroundColor: 'rgba(140, 75, 64, 0.05)',
    },
    settingOptionText: {
        color: '#1A1A1A',
        fontSize: 16,
    },
    sizeControlGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F4EBD9',
        borderRadius: 16,
        padding: 12,
    },
    sizeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EAE2CF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizePreviewIndicator: {
        color: '#8C4B40',
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
        backgroundColor: '#F0EDE6',
        borderWidth: 1,
        borderColor: '#D8D3C8',
    },
    tajweedToggleOn: {
        backgroundColor: '#8C4B40',
        borderColor: '#8C4B40',
    },
    tajweedToggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A8A8A',
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
        backgroundColor: '#FAFAF8',
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
        color: '#3A3A3A',
    },
});
