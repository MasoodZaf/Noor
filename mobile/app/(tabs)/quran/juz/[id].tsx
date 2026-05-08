import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../../context/DatabaseContext';
import { useLanguage } from '../../../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import { sanitizeArabicText } from '../../../../utils/arabic';
import { useTheme } from '../../../../context/ThemeContext';
import { useNetworkMode } from '../../../../context/NetworkModeContext';

// Fetch with an AbortController-based timeout (ms). RN's default socket timeout
// can be 60s+, which makes the juz reader feel frozen in offline mode.
const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: ctl.signal });
    } finally {
        clearTimeout(t);
    }
};

// ─── APIs ─────────────────────────────────────────────────────────────────────
import { QURAN_API, ALQURAN_CLOUD_API as AUDIO_API, FAWAZ_QURAN as FAWAZ_API } from '../../../../utils/apis';

const FAWAZ_EDITIONS: Record<string, string> = {
    english:    'eng-muftitaqiusmani',
    indonesian: 'ind-indonesianislam',
    french:     'fra-muhammadhameedu',
    bengali:    'ben-muhiuddinkhan',
    turkish:    'tur-diyanetisleri',
};

const ALQURAN_EDITIONS: Record<string, string> = {
    urdu: 'ur.jalandhry',
};


// Simpler array-based fetcher (used as primary) — returns texts in juz verse order
const fetchTranslationArray = async (juzId: number, language: string): Promise<string[]> => {
    const alquranEdition = ALQURAN_EDITIONS[language];
    if (alquranEdition) {
        const res = await fetchWithTimeout(`${AUDIO_API}/juz/${juzId}/${alquranEdition}`);
        if (!res.ok) throw new Error(`AlQuran Cloud ${res.status}`);
        const json = await res.json();
        if (json.code !== 200) throw new Error('AlQuran Cloud error');
        return (json.data?.ayahs || []).map((a: any) => a.text);
    }
    const edition = FAWAZ_EDITIONS[language] || FAWAZ_EDITIONS.english;
    const res = await fetchWithTimeout(`${FAWAZ_API}/editions/${edition}/juzs/${juzId}.json`);
    if (!res.ok) throw new Error(`Fawaz ${res.status}`);
    const json = await res.json();
    return (json.chapter || []).map((v: any) => v.text);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ARABIC_FONTS = [
    { id: 'uthmani', name: 'Uthmani Naskh (Scheherazade)', family: 'ScheherazadeNew_400Regular' },
    { id: 'indopak', name: 'Indo-Pak Nastaleeq (Noto Naskh)', family: 'NotoNaskhArabic_400Regular' },
];

const BISMILLAH_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

const toArabicDigits = (num: number) => {
    const d = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, w => d[parseInt(w, 10)]);
};

const getTranslationFromRow = (row: any, language: string): string => {
    switch (language) {
        case 'urdu':       return row.text_urdu       || row.text_english || '';
        case 'indonesian': return row.text_ind        || row.text_english || '';
        case 'french':     return row.text_fra        || row.text_english || '';
        case 'bengali':    return row.text_ben        || row.text_english || '';
        case 'turkish':    return row.text_tur        || row.text_english || '';
        default:           return row.text_english || '';
    }
};

const JUZ_BOUNDARIES = [
    { juz: 1,  start: { surah: 1,   ayah: 1   }, end: { surah: 2,   ayah: 141 } },
    { juz: 2,  start: { surah: 2,   ayah: 142 }, end: { surah: 2,   ayah: 252 } },
    { juz: 3,  start: { surah: 2,   ayah: 253 }, end: { surah: 3,   ayah: 92  } },
    { juz: 4,  start: { surah: 3,   ayah: 93  }, end: { surah: 4,   ayah: 23  } },
    { juz: 5,  start: { surah: 4,   ayah: 24  }, end: { surah: 4,   ayah: 147 } },
    { juz: 6,  start: { surah: 4,   ayah: 148 }, end: { surah: 5,   ayah: 81  } },
    { juz: 7,  start: { surah: 5,   ayah: 82  }, end: { surah: 6,   ayah: 110 } },
    { juz: 8,  start: { surah: 6,   ayah: 111 }, end: { surah: 7,   ayah: 87  } },
    { juz: 9,  start: { surah: 7,   ayah: 88  }, end: { surah: 8,   ayah: 40  } },
    { juz: 10, start: { surah: 8,   ayah: 41  }, end: { surah: 9,   ayah: 92  } },
    { juz: 11, start: { surah: 9,   ayah: 93  }, end: { surah: 11,  ayah: 5   } },
    { juz: 12, start: { surah: 11,  ayah: 6   }, end: { surah: 12,  ayah: 52  } },
    { juz: 13, start: { surah: 12,  ayah: 53  }, end: { surah: 14,  ayah: 52  } },
    { juz: 14, start: { surah: 15,  ayah: 1   }, end: { surah: 16,  ayah: 128 } },
    { juz: 15, start: { surah: 17,  ayah: 1   }, end: { surah: 18,  ayah: 74  } },
    { juz: 16, start: { surah: 18,  ayah: 75  }, end: { surah: 20,  ayah: 135 } },
    { juz: 17, start: { surah: 21,  ayah: 1   }, end: { surah: 22,  ayah: 78  } },
    { juz: 18, start: { surah: 23,  ayah: 1   }, end: { surah: 25,  ayah: 20  } },
    { juz: 19, start: { surah: 25,  ayah: 21  }, end: { surah: 27,  ayah: 55  } },
    { juz: 20, start: { surah: 27,  ayah: 56  }, end: { surah: 29,  ayah: 45  } },
    { juz: 21, start: { surah: 29,  ayah: 46  }, end: { surah: 33,  ayah: 30  } },
    { juz: 22, start: { surah: 33,  ayah: 31  }, end: { surah: 36,  ayah: 27  } },
    { juz: 23, start: { surah: 36,  ayah: 28  }, end: { surah: 39,  ayah: 31  } },
    { juz: 24, start: { surah: 39,  ayah: 32  }, end: { surah: 41,  ayah: 46  } },
    { juz: 25, start: { surah: 41,  ayah: 47  }, end: { surah: 45,  ayah: 37  } },
    { juz: 26, start: { surah: 46,  ayah: 1   }, end: { surah: 51,  ayah: 30  } },
    { juz: 27, start: { surah: 51,  ayah: 31  }, end: { surah: 57,  ayah: 29  } },
    { juz: 28, start: { surah: 58,  ayah: 1   }, end: { surah: 66,  ayah: 12  } },
    { juz: 29, start: { surah: 67,  ayah: 1   }, end: { surah: 77,  ayah: 50  } },
    { juz: 30, start: { surah: 78,  ayah: 1   }, end: { surah: 114, ayah: 6   } },
];

// Fetch all pages from Quran.com — handles juzs with more than 300 verses
const fetchAllJuzVerses = async (juzId: number): Promise<any[]> => {
    const PAGE_SIZE = 300;
    let page = 1;
    let allVerses: any[] = [];
    while (true) {
        const res = await fetchWithTimeout(
            `${QURAN_API}/verses/by_juz/${juzId}?words=false&fields=text_uthmani,text_indopak_nastaleeq&per_page=${PAGE_SIZE}&page=${page}`
        );
        if (!res.ok) throw new Error(`Quran.com ${res.status}`);
        const json = await res.json();
        const verses: any[] = json.verses || [];
        allVerses = allVerses.concat(verses);
        if (allVerses.length >= json.meta?.total_count || verses.length < PAGE_SIZE) break;
        page++;
    }
    return allVerses;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function JuzReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();
    const { theme } = useTheme();
    const { isOfflineMode } = useNetworkMode();

    const juzId = typeof id === 'string' ? parseInt(id, 10) : 1;

    // Load a juz from the local SQLite vault (shared by offline mode and online fallback)
    const loadJuzFromDb = async (
        targetJuzId: number,
        targetLanguage: string,
    ): Promise<{
        cache: { uthmani: string; indopak: string; surah_number: number; ayah_number: number; surah_name: string }[];
        translations: string[];
    } | null> => {
        if (!db) return null;
        const boundary = JUZ_BOUNDARIES.find(j => j.juz === targetJuzId);
        if (!boundary) return null;

        const surahNumbers = Array.from(
            { length: boundary.end.surah - boundary.start.surah + 1 },
            (_, i) => boundary.start.surah + i
        );
        const nameMap: Record<number, string> = {};
        const placeholders = surahNumbers.map(() => '?').join(',');
        const surahsData: any[] = await db.getAllAsync(
            `SELECT number, name_english FROM surahs WHERE number IN (${placeholders})`,
            surahNumbers
        );
        surahsData.forEach(s => { nameMap[s.number] = s.name_english; });

        const allAyahs: any[] = await db.getAllAsync(
            'SELECT * FROM ayahs WHERE surah_number >= ? AND surah_number <= ? ORDER BY surah_number ASC, ayah_number ASC',
            [boundary.start.surah, boundary.end.surah]
        );
        const filtered = allAyahs.filter(a => {
            if (a.surah_number === boundary.start.surah && a.ayah_number < boundary.start.ayah) return false;
            if (a.surah_number === boundary.end.surah && a.ayah_number > boundary.end.ayah) return false;
            return true;
        });

        const cache = filtered.map(r => ({
            surah_number: r.surah_number,
            ayah_number: r.ayah_number,
            surah_name: nameMap[r.surah_number] || `Surah ${r.surah_number}`,
            uthmani: sanitizeArabicText(r.text_arabic || ''),
            indopak: sanitizeArabicText(r.text_arabic_indopak || r.text_arabic || ''),
        }));
        const translations = filtered.map(r => getTranslationFromRow(r, targetLanguage));
        return { cache, translations };
    };

    const [fontsLoaded] = useFonts({
        ScheherazadeNew_400Regular,
        NotoNaskhArabic_400Regular,
        NotoNastaliqUrdu_400Regular,
    });

    // Each item in `ayahs` is either an ayah object or a surah-divider sentinel
    type AyahItem = {
        type: 'ayah';
        id: string;
        surah_number: number;
        surah_name: string;
        ayah_number: number;
        text_uthmani: string;
        text_indopak: string;
        text_translation: string;
        show_bismillah: boolean; // true when this ayah is the first of a surah that needs bismillah
    };
    type DividerItem = {
        type: 'divider';
        id: string;
        surah_number: number;
        surah_name: string;
        show_bismillah: boolean;
    };
    type ListItem = AyahItem | DividerItem;

    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [totalAyahs, setTotalAyahs] = useState(0);
    const [firstSurahName, setFirstSurahName] = useState('');
    const [lastSurahName, setLastSurahName] = useState('');

    // Caches for translation refresh without re-fetching Arabic
    const arabicCacheRef = useRef<{ uthmani: string; indopak: string; surah_number: number; ayah_number: number; surah_name: string }[] | null>(null);
    const prevLanguageRef = useRef<string>(language);

    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    // Build list items (ayahs + surah-divider sentinels) from raw verse data + translations
    const buildItems = (
        verses: { uthmani: string; indopak: string; surah_number: number; ayah_number: number; surah_name: string }[],
        translations: string[]
    ): ListItem[] => {
        const result: ListItem[] = [];
        let lastSurahNum = -1;

        verses.forEach((v, i) => {
            const isFirstInSurah = v.surah_number !== lastSurahNum;
            // Bismillah shown before the first ayah of every surah EXCEPT surah 1 (bismillah IS ayah 1)
            // and surah 9 (no bismillah by scholarly consensus)
            const showBismillah = isFirstInSurah && v.surah_number !== 1 && v.surah_number !== 9;

            if (isFirstInSurah) {
                result.push({
                    type: 'divider',
                    id: `divider_${v.surah_number}`,
                    surah_number: v.surah_number,
                    surah_name: v.surah_name,
                    show_bismillah: showBismillah,
                });
                lastSurahNum = v.surah_number;
            }

            result.push({
                type: 'ayah',
                id: `${v.surah_number}_${v.ayah_number}`,
                surah_number: v.surah_number,
                surah_name: v.surah_name,
                ayah_number: v.ayah_number,
                text_uthmani: v.uthmani,
                text_indopak: v.indopak,
                text_translation: translations[i] || '',
                show_bismillah: false,
            });
        });

        return result;
    };

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        arabicCacheRef.current = null;
        prevLanguageRef.current = language;
        setItems([]);

        let cancelled = false;

        const applyDbResult = (dbResult: { cache: any[]; translations: string[] } | null) => {
            if (!dbResult) return false;
            arabicCacheRef.current = dbResult.cache;
            setTotalAyahs(dbResult.cache.length);
            if (dbResult.cache.length > 0) {
                setFirstSurahName(dbResult.cache[0].surah_name);
                setLastSurahName(dbResult.cache[dbResult.cache.length - 1].surah_name);
            }
            setItems(buildItems(dbResult.cache, dbResult.translations));
            return true;
        };

        const loadJuz = async () => {
            setLoading(true);

            // Forced offline mode: skip network entirely, use local vault
            if (isOfflineMode) {
                try {
                    const dbResult = await loadJuzFromDb(juzId, language);
                    if (cancelled) return;
                    applyDbResult(dbResult);
                } catch (dbErr) {
                    console.error('[Noor/Juz] Offline SQLite load failed:', dbErr);
                } finally {
                    if (!cancelled) setLoading(false);
                }
                return;
            }

            try {
                const [versesResult, translationResult] = await Promise.allSettled([
                    fetchAllJuzVerses(juzId),
                    fetchTranslationArray(juzId, language),
                ]);
                if (cancelled) return;

                let verses: any[] = [];
                if (versesResult.status === 'fulfilled') {
                    verses = versesResult.value;
                }
                if (verses.length === 0) throw new Error('Arabic fetch failed');

                // Build surah name map from SQLite
                const surahNumbers = [...new Set(verses.map((v: any) => parseInt(v.verse_key.split(':')[0], 10)))];
                const nameMap: Record<number, string> = {};
                if (db) {
                    const placeholders = surahNumbers.map(() => '?').join(',');
                    const surahsData: any[] = await db.getAllAsync(
                        `SELECT number, name_english FROM surahs WHERE number IN (${placeholders})`,
                        surahNumbers
                    );
                    surahsData.forEach(s => { nameMap[s.number] = s.name_english; });
                }

                const translations = translationResult.status === 'fulfilled' ? translationResult.value : [];

                // Build the cache using the LOCAL nameMap (not stale state)
                const cache = verses.map((v: any) => {
                    const [s, a] = v.verse_key.split(':');
                    const surahNum = parseInt(s, 10);
                    return {
                        surah_number: surahNum,
                        ayah_number: parseInt(a, 10),
                        surah_name: nameMap[surahNum] || `Surah ${surahNum}`,
                        uthmani: sanitizeArabicText(v.text_uthmani || ''),
                        indopak: sanitizeArabicText(v.text_indopak_nastaleeq || v.text_uthmani || ''),
                    };
                });
                arabicCacheRef.current = cache;

                setTotalAyahs(cache.length);
                if (cache.length > 0) {
                    setFirstSurahName(cache[0].surah_name);
                    setLastSurahName(cache[cache.length - 1].surah_name);
                }
                setItems(buildItems(cache, translations));

            } catch {
                // API failed — fall back to SQLite
                try {
                    const dbResult = await loadJuzFromDb(juzId, language);
                    if (cancelled) return;
                    applyDbResult(dbResult);
                } catch (dbErr) {
                    console.error('[Noor/Juz] SQLite fallback failed:', dbErr);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadJuz();
        return () => { cancelled = true; };
    }, [juzId, isOfflineMode]);

    // ── Language change — only refresh translations ────────────────────────────
    useEffect(() => {
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;
        const cache = arabicCacheRef.current;
        if (!cache || cache.length === 0) return;

        let cancelled = false;
        const updateTranslation = async () => {
            setTranslationLoading(true);

            // Forced offline mode: skip the network and use SQLite translations
            if (isOfflineMode) {
                try {
                    const dbResult = await loadJuzFromDb(juzId, language);
                    if (!cancelled && dbResult) setItems(buildItems(cache, dbResult.translations));
                } catch (dbErr) {
                    console.warn('[Noor/Juz] Offline translation load failed:', dbErr);
                } finally {
                    if (!cancelled) setTranslationLoading(false);
                }
                return;
            }

            try {
                const translations = await fetchTranslationArray(juzId, language);
                if (!cancelled) setItems(buildItems(cache, translations));
            } catch {
                try {
                    const dbResult = await loadJuzFromDb(juzId, language);
                    if (!cancelled && dbResult) setItems(buildItems(cache, dbResult.translations));
                } catch (dbErr) {
                    console.warn('[Noor/Juz] SQLite translation fallback failed:', dbErr);
                }
            } finally {
                if (!cancelled) setTranslationLoading(false);
            }
        };
        updateTranslation();
        return () => { cancelled = true; };
    }, [language, isOfflineMode]);

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading || !fontsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.gold} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Opening Juz {id}...</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: ListItem }) => {
        // Surah divider row
        if (item.type === 'divider') {
            return (
                <View style={[styles.surahDivider, { borderBottomColor: theme.border, backgroundColor: theme.bgSecondary }]}>
                    <View style={[styles.surahDividerLine, { backgroundColor: theme.border }]} />
                    <Text style={[styles.surahDividerName, { color: theme.accent }]}>{item.surah_name}</Text>
                    <View style={[styles.surahDividerLine, { backgroundColor: theme.border }]} />
                    {item.show_bismillah && (
                        <View style={[styles.bismillahBlock, { borderColor: theme.borderStrong }]}>
                            <Text style={[styles.bismillahText, { fontFamily: selectedFont.family, color: theme.textPrimary }]}>
                                {BISMILLAH_TEXT}
                            </Text>
                        </View>
                    )}
                </View>
            );
        }

        // Ayah row
        const ayah = item as AyahItem;
        const arabicText = selectedFont.id === 'indopak' ? ayah.text_indopak : ayah.text_uthmani;

        return (
            <View style={[styles.ayahContainer, { borderBottomColor: theme.border }]}>
                {/* Badge */}
                <View style={styles.ayahHeader}>
                    <View style={[styles.ayahPill, { backgroundColor: theme.bgSecondary }]}>
                        <Text style={[styles.ayahPillText, { color: theme.textSecondary }]}>
                            {ayah.surah_number}:{ayah.ayah_number}
                        </Text>
                    </View>
                </View>

                {/* Arabic */}
                <Text
                    textBreakStrategy="simple"
                    allowFontScaling={false}
                    style={[
                        styles.arabicText,
                        { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.75, color: theme.textPrimary },
                    ]}
                >
                    {arabicText}
                </Text>

                {/* Translation */}
                <Text style={[
                    styles.translationText,
                    { color: theme.textSecondary },
                    language === 'urdu' && {
                        fontFamily: 'NotoNastaliqUrdu_400Regular',
                        fontSize: 18, textAlign: 'right', lineHeight: 36, writingDirection: 'rtl',
                        includeFontPadding: false,
                    },
                ]}>
                    {ayah.text_translation}
                </Text>
            </View>
        );
    };

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
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Juz {id}</Text>
                </View>
                <View style={styles.headerRight}>
                    {translationLoading && <ActivityIndicator size="small" color={theme.gold} style={{ marginRight: 8 }} />}
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

            {/* Sub-header */}
            <View style={[styles.subHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.subHeaderText, { color: theme.textSecondary }]}>
                    {totalAyahs} Ayahs
                </Text>
                <Text style={[styles.subHeaderRange, { color: theme.textSecondary }]}>
                    {firstSurahName}{lastSurahName && lastSurahName !== firstSurahName ? ` → ${lastSurahName}` : ''}
                </Text>
            </View>

            {/* Vertical ayah list */}
            <FlatList
                data={items}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                initialNumToRender={12}
                maxToRenderPerBatch={15}
                windowSize={8}
                removeClippedSubviews={false}
            />

            {/* Settings Modal */}
            <Modal transparent visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: theme.bgCard }]}>
                        <View style={styles.modalHeader}>
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

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Arabic Font Style</Text>
                        <View style={[styles.settingsGroup, { backgroundColor: theme.bgSecondary }]}>
                            {ARABIC_FONTS.map(font => (
                                <TouchableOpacity
                                    key={font.id}
                                    style={[styles.settingOption, { borderBottomColor: theme.border },
                                        selectedFont.id === font.id && { backgroundColor: `${theme.accent}0D` }]}
                                    onPress={() => setSelectedFont(font)}
                                    accessibilityRole="radio"
                                    accessibilityLabel={`Arabic font: ${font.name}`}
                                    accessibilityState={{ selected: selectedFont.id === font.id, checked: selectedFont.id === font.id }}
                                >
                                    <Text style={[styles.settingOptionText, { color: theme.textPrimary },
                                        selectedFont.id === font.id && { color: theme.accent }]}>
                                        {font.name}
                                    </Text>
                                    {selectedFont.id === font.id && <Feather name="check" size={18} color={theme.accent} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Text Size ({fontSize}pt)</Text>
                        <View style={[styles.sizeRow, { backgroundColor: theme.bgSecondary }]}>
                            <TouchableOpacity
                                style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]}
                                onPress={() => setFontSize(f => Math.max(20, f - 2))}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease text size"
                            >
                                <Feather name="minus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.sizeSample, { color: theme.accent }]}>Aa</Text>
                            <TouchableOpacity
                                style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]}
                                onPress={() => setFontSize(f => Math.min(56, f + 2))}
                                accessibilityRole="button"
                                accessibilityLabel="Increase text size"
                            >
                                <Feather name="plus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingText: { marginTop: 16, fontSize: 15 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    actionButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },

    subHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
    },
    subHeaderText: { fontSize: 13 },
    subHeaderRange: { fontSize: 13 },

    // Surah divider
    surahDivider: {
        alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20,
    },
    surahDividerLine: { height: 1, width: '100%', marginVertical: 8 },
    surahDividerName: {
        fontSize: 15, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.5,
        paddingHorizontal: 16,
    },
    bismillahBlock: {
        marginTop: 12, paddingVertical: 14, paddingHorizontal: 20,
        borderRadius: 4, borderWidth: 1.5,
        alignItems: 'center', width: '100%',
    },
    bismillahText: { fontSize: 28, textAlign: 'center', includeFontPadding: false },

    // Ayah card
    ayahContainer: {
        paddingHorizontal: 20, paddingVertical: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ayahHeader: { flexDirection: 'row', marginBottom: 14 },
    ayahPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
    ayahPillText: { fontSize: 12, fontWeight: '600' },
    arabicText: { textAlign: 'right', writingDirection: 'rtl', includeFontPadding: false },
    translationText: {
        marginTop: 14, fontSize: 16, lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },

    // Settings modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    settingLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    settingsGroup: { borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
    settingOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    settingOptionText: { fontSize: 15 },
    sizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 12 },
    sizeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    sizeSample: { fontSize: 20, fontWeight: '500' },
});
