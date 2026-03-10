import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Modal, FlatList, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../../context/DatabaseContext';
import { useLanguage } from '../../../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';

// ─── APIs ─────────────────────────────────────────────────────────────────────
// Arabic text — Quran.com v4 API (verified against King Fahd Complex Medina Mushaf)
const QURAN_API = 'https://api.quran.com/api/v4';

// Translation APIs (Fawaz CDN + AlQuran Cloud fallback)
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

const fetchTranslationTexts = async (juzId: number, language: string): Promise<string[]> => {
    const alquranEdition = ALQURAN_EDITIONS[language];
    if (alquranEdition) {
        const res = await fetch(`${AUDIO_API}/juz/${juzId}/${alquranEdition}`);
        if (!res.ok) throw new Error(`AlQuran Cloud ${res.status}`);
        const json = await res.json();
        if (json.code !== 200) throw new Error('AlQuran Cloud error');
        return (json.data?.ayahs || []).map((a: any) => a.text);
    }
    const edition = FAWAZ_EDITIONS[language] || FAWAZ_EDITIONS.english;
    const res = await fetch(`${FAWAZ_API}/editions/${edition}/juzs/${juzId}.json`);
    if (!res.ok) throw new Error(`Fawaz ${res.status}`);
    const json = await res.json();
    return (json.chapter || []).map((v: any) => v.text);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Two dedicated Quran fonts — no system font fallbacks
const ARABIC_FONTS = [
    { id: 'uthmani', name: 'Uthmani Naskh (Scheherazade)', family: 'ScheherazadeNew_400Regular' },
    { id: 'indopak', name: 'Indo-Pak Nastaleeq (Noto Naskh)', family: 'NotoNaskhArabic_400Regular' },
];

const toArabicDigits = (num: number) => {
    const d = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, w => d[parseInt(w, 10)]);
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

const JUZ_BOUNDARIES = [
    { juz: 1, start: { surah: 1, ayah: 1 }, end: { surah: 2, ayah: 141 } },
    { juz: 2, start: { surah: 2, ayah: 142 }, end: { surah: 2, ayah: 252 } },
    { juz: 3, start: { surah: 2, ayah: 253 }, end: { surah: 3, ayah: 92 } },
    { juz: 4, start: { surah: 3, ayah: 93 }, end: { surah: 4, ayah: 23 } },
    { juz: 5, start: { surah: 4, ayah: 24 }, end: { surah: 4, ayah: 147 } },
    { juz: 6, start: { surah: 4, ayah: 148 }, end: { surah: 5, ayah: 81 } },
    { juz: 7, start: { surah: 5, ayah: 82 }, end: { surah: 6, ayah: 110 } },
    { juz: 8, start: { surah: 6, ayah: 111 }, end: { surah: 7, ayah: 87 } },
    { juz: 9, start: { surah: 7, ayah: 88 }, end: { surah: 8, ayah: 40 } },
    { juz: 10, start: { surah: 8, ayah: 41 }, end: { surah: 9, ayah: 92 } },
    { juz: 11, start: { surah: 9, ayah: 93 }, end: { surah: 11, ayah: 5 } },
    { juz: 12, start: { surah: 11, ayah: 6 }, end: { surah: 12, ayah: 52 } },
    { juz: 13, start: { surah: 12, ayah: 53 }, end: { surah: 14, ayah: 52 } },
    { juz: 14, start: { surah: 15, ayah: 1 }, end: { surah: 16, ayah: 128 } },
    { juz: 15, start: { surah: 17, ayah: 1 }, end: { surah: 18, ayah: 74 } },
    { juz: 16, start: { surah: 18, ayah: 75 }, end: { surah: 20, ayah: 135 } },
    { juz: 17, start: { surah: 21, ayah: 1 }, end: { surah: 22, ayah: 78 } },
    { juz: 18, start: { surah: 23, ayah: 1 }, end: { surah: 25, ayah: 20 } },
    { juz: 19, start: { surah: 25, ayah: 21 }, end: { surah: 27, ayah: 55 } },
    { juz: 20, start: { surah: 27, ayah: 56 }, end: { surah: 29, ayah: 45 } },
    { juz: 21, start: { surah: 29, ayah: 46 }, end: { surah: 33, ayah: 30 } },
    { juz: 22, start: { surah: 33, ayah: 31 }, end: { surah: 36, ayah: 27 } },
    { juz: 23, start: { surah: 36, ayah: 28 }, end: { surah: 39, ayah: 31 } },
    { juz: 24, start: { surah: 39, ayah: 32 }, end: { surah: 41, ayah: 46 } },
    { juz: 25, start: { surah: 41, ayah: 47 }, end: { surah: 45, ayah: 37 } },
    { juz: 26, start: { surah: 46, ayah: 1 }, end: { surah: 51, ayah: 30 } },
    { juz: 27, start: { surah: 51, ayah: 31 }, end: { surah: 57, ayah: 29 } },
    { juz: 28, start: { surah: 58, ayah: 1 }, end: { surah: 66, ayah: 12 } },
    { juz: 29, start: { surah: 67, ayah: 1 }, end: { surah: 77, ayah: 50 } },
    { juz: 30, start: { surah: 78, ayah: 1 }, end: { surah: 114, ayah: 6 } },
];

const { width } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
export default function JuzReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();

    const juzId = typeof id === 'string' ? parseInt(id, 10) : 1;

    const [fontsLoaded] = useFonts({ ScheherazadeNew_400Regular, NotoNaskhArabic_400Regular });

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahMap, setSurahMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [translationLoading, setTranslationLoading] = useState(false);

    const arabicCacheRef = useRef<{ uthmani: string; indopak: string }[] | null>(null);
    const surahInfoCacheRef = useRef<{ surah_number: number; ayah_number: number }[] | null>(null);
    const prevLanguageRef = useRef<string>(language);

    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        arabicCacheRef.current = null;
        surahInfoCacheRef.current = null;
        prevLanguageRef.current = language;

        const loadJuz = async () => {
            setLoading(true);
            try {
                // Fetch verified Arabic text + translations in parallel
                // Arabic source: Quran.com v4 — verified against King Fahd Complex Medina Mushaf
                const [versesResult, translationResult] = await Promise.allSettled([
                    fetch(`${QURAN_API}/verses/by_juz/${juzId}?words=false&fields=text_uthmani,text_indopak_nastaleeq&per_page=300&page=1`),
                    fetchTranslationTexts(juzId, language),
                ]);

                let verses: any[] = [];
                if (versesResult.status === 'fulfilled' && versesResult.value.ok) {
                    const json = await versesResult.value.json();
                    verses = json.verses || [];
                }

                if (verses.length === 0) throw new Error('Arabic fetch failed');

                // Build surah name map from SQLite (most reliable)
                const surahNumbers = [...new Set(verses.map((v: any) => parseInt(v.verse_key.split(':')[0], 10)))];
                if (db) {
                    const placeholders = surahNumbers.map(() => '?').join(',');
                    const surahsData: any[] = await db.getAllAsync(
                        `SELECT number, name_english FROM surahs WHERE number IN (${placeholders})`,
                        surahNumbers
                    );
                    const map: Record<number, string> = {};
                    surahsData.forEach(s => { map[s.number] = s.name_english; });
                    setSurahMap(map);
                }

                const translationTexts = translationResult.status === 'fulfilled' ? translationResult.value : [];

                arabicCacheRef.current = verses.map((v: any) => ({
                    uthmani: v.text_uthmani || '',
                    indopak: v.text_indopak_nastaleeq || v.text_uthmani || '',
                }));
                surahInfoCacheRef.current = verses.map((v: any) => {
                    const [s, a] = v.verse_key.split(':');
                    return { surah_number: parseInt(s, 10), ayah_number: parseInt(a, 10) };
                });

                const merged = verses.map((v: any, i: number) => {
                    const [s, a] = v.verse_key.split(':');
                    const surahNum = parseInt(s, 10);
                    const ayahNum = parseInt(a, 10);
                    return {
                        id: v.verse_key,
                        surah_number: surahNum,
                        surah_name: surahMap[surahNum] || `Surah ${surahNum}`,
                        ayah_number: ayahNum,
                        text_uthmani: v.text_uthmani || '',
                        text_indopak: v.text_indopak_nastaleeq || v.text_uthmani || '',
                        text_translation: translationTexts[i] || '',
                    };
                });
                setAyahs(merged);

            } catch {
                if (db) {
                    try {
                        const boundary = JUZ_BOUNDARIES.find(j => j.juz === juzId);
                        if (!boundary) return;
                        const surahsData: any[] = await db.getAllAsync(
                            'SELECT number, name_english FROM surahs WHERE number >= ? AND number <= ?',
                            [boundary.start.surah, boundary.end.surah]
                        );
                        const map: Record<number, string> = {};
                        surahsData.forEach(s => { map[s.number] = s.name_english; });
                        setSurahMap(map);

                        const allAyahs: any[] = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number >= ? AND surah_number <= ? ORDER BY surah_number ASC, ayah_number ASC',
                            [boundary.start.surah, boundary.end.surah]
                        );
                        const filtered = allAyahs.filter(a => {
                            if (a.surah_number === boundary.start.surah && a.ayah_number < boundary.start.ayah) return false;
                            if (a.surah_number === boundary.end.surah && a.ayah_number > boundary.end.ayah) return false;
                            return true;
                        });
                        arabicCacheRef.current = filtered.map(r => ({
                            uthmani: r.text_arabic || '',
                            indopak: r.text_arabic_indopak || r.text_arabic || '',
                        }));
                        surahInfoCacheRef.current = filtered.map(r => ({ surah_number: r.surah_number, ayah_number: r.ayah_number }));
                        const merged = filtered.map(r => ({
                            id: `${r.surah_number}_${r.ayah_number}`,
                            surah_number: r.surah_number,
                            surah_name: map[r.surah_number] || '',
                            ayah_number: r.ayah_number,
                            text_uthmani: r.text_arabic || '',
                            text_indopak: r.text_arabic_indopak || r.text_arabic || '',
                            text_translation: getTranslationFromRow(r, language),
                        }));
                        setAyahs(merged);
                    } catch (dbErr) { console.error('DB fallback failed:', dbErr); }
                }
            } finally {
                setLoading(false);
            }
        };
        loadJuz();
    }, [juzId]);

    // ── Language change ────────────────────────────────────────────────────────
    useEffect(() => {
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;
        const arabicCache = arabicCacheRef.current;
        const surahInfoCache = surahInfoCacheRef.current;
        if (!arabicCache || !surahInfoCache) return;

        const updateTranslation = async () => {
            setTranslationLoading(true);
            try {
                const translationTexts = await fetchTranslationTexts(juzId, language);
                const merged = arabicCache.map((texts, i) => ({
                    id: `${surahInfoCache[i].surah_number}_${surahInfoCache[i].ayah_number}`,
                    surah_number: surahInfoCache[i].surah_number,
                    surah_name: surahMap[surahInfoCache[i].surah_number] || '',
                    ayah_number: surahInfoCache[i].ayah_number,
                    text_uthmani: texts.uthmani,
                    text_indopak: texts.indopak,
                    text_translation: translationTexts[i] || '',
                }));
                setAyahs(merged);
            } catch {
                if (db) {
                    try {
                        const boundary = JUZ_BOUNDARIES.find(j => j.juz === juzId);
                        if (!boundary) return;
                        const allAyahs: any[] = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number >= ? AND surah_number <= ? ORDER BY surah_number ASC, ayah_number ASC',
                            [boundary.start.surah, boundary.end.surah]
                        );
                        const filtered = allAyahs.filter(a => {
                            if (a.surah_number === boundary.start.surah && a.ayah_number < boundary.start.ayah) return false;
                            if (a.surah_number === boundary.end.surah && a.ayah_number > boundary.end.ayah) return false;
                            return true;
                        });
                        const merged = arabicCache.map((texts, i) => ({
                            id: `${surahInfoCache[i].surah_number}_${surahInfoCache[i].ayah_number}`,
                            surah_number: surahInfoCache[i].surah_number,
                            surah_name: surahMap[surahInfoCache[i].surah_number] || '',
                            ayah_number: surahInfoCache[i].ayah_number,
                            text_uthmani: texts.uthmani,
                            text_indopak: texts.indopak,
                            text_translation: getTranslationFromRow(filtered[i] || {}, language),
                        }));
                        setAyahs(merged);
                    } catch { }
                }
            } finally {
                setTranslationLoading(false);
            }
        };
        updateTranslation();
    }, [language]);

    if (loading || !fontsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Opening Juz {id}...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header — matches Surah reader */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.surahTitle}>Juz {id}</Text>
                    <Feather name="chevron-down" size={16} color="#1A1A1A" style={{ marginLeft: 4, marginTop: 4 }} />
                </View>
                <View style={styles.headerRight}>
                    {translationLoading && <ActivityIndicator size="small" color="#C9A84C" style={{ marginRight: 8 }} />}
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
                        <Feather name="settings" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sub-header */}
            <View style={styles.subHeader}>
                <Text style={styles.subHeaderText}>Juz {id} • {ayahs.length} Ayahs</Text>
                <Text style={styles.subHeaderRight}>
                    {surahMap[ayahs[0]?.surah_number] || ''} → {surahMap[ayahs[ayahs.length - 1]?.surah_number] || ''}
                </Text>
            </View>

            {/* Horizontal paged FlatList — one ayah per page */}
            <FlatList
                data={ayahs}
                horizontal={true}
                pagingEnabled={true}
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item: ayah }) => {
                    const isFirstInSurah = ayah.ayah_number === 1;
                    return (
                        <ScrollView
                            style={{ width }}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Surah divider on first ayah of a new surah */}
                            {isFirstInSurah && (
                                <View style={styles.surahDivider}>
                                    <Text style={styles.surahDividerName}>{ayah.surah_name}</Text>
                                    {ayah.surah_number !== 1 && ayah.surah_number !== 9 && (
                                        <View style={styles.bismillahBannerBlock}>
                                            <Text style={[styles.bismillahText, { fontFamily: selectedFont.family }]}>
                                                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.ayahContainer}>
                                {/* Ayah pill badge */}
                                <View style={styles.ayahHeader}>
                                    <View style={styles.ayahPillBadge}>
                                        <Text style={styles.ayahPillText}>
                                            Aya {ayah.surah_number}:{ayah.ayah_number}
                                        </Text>
                                        <Feather name="chevron-down" size={14} color="#5E5C58" style={{ marginLeft: 4, marginTop: 1 }} />
                                    </View>
                                </View>

                                {/* Arabic text with decorative marker */}
                                <View style={styles.arabicContentWrapper}>
                                    <View style={styles.ayahDecorativeContainer}>
                                        <Text style={styles.ayahDecorativeMark}>۝</Text>
                                        <Text style={styles.ayahNumberText}>{toArabicDigits(ayah.ayah_number)}</Text>
                                    </View>
                                    <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.6 }]}>
                                        {selectedFont.id === 'indopak' ? ayah.text_indopak : ayah.text_uthmani}
                                    </Text>
                                </View>

                                {/* Translation */}
                                <Text style={[
                                    styles.translationText,
                                    (language === 'urdu') && {
                                        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                                        fontSize: 18, textAlign: 'right', lineHeight: 32,
                                    }
                                ]}>
                                    {ayah.text_translation}
                                </Text>
                            </View>
                        </ScrollView>
                    );
                }}
            />

            {/* Settings Modal — matches Surah reader */}
            <Modal transparent visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reading Settings</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <Feather name="x" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
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
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF6E3' },
    loadingText: { color: '#5E5C58', marginTop: 16 },

    // Header — identical to Surah reader
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    actionButton: { width: 30, height: 40, alignItems: 'center', justifyContent: 'center' },
    surahTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },

    subHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    subHeaderText: { color: '#5E5C58', fontSize: 13 },
    subHeaderRight: { color: '#5E5C58', fontSize: 13 },

    // Surah divider
    surahDivider: { alignItems: 'center', paddingVertical: 20, marginBottom: 10 },
    surahDividerName: {
        color: '#8C4B40', fontSize: 16, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
    },
    bismillahBannerBlock: {
        backgroundColor: '#C5D8B8', paddingVertical: 14, paddingHorizontal: 20,
        borderRadius: 4, borderWidth: 2, borderColor: '#5B8C5A',
        alignItems: 'center', justifyContent: 'center',
        width: '100%', marginTop: 4,
    },
    bismillahText: { color: '#1A1A1A', fontSize: 32, textAlign: 'center' },

    // Ayah page
    ayahContainer: { paddingHorizontal: 20, paddingVertical: 24 },
    ayahHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16 },
    ayahPillBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAE2CF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    ayahPillText: { color: '#5E5C58', fontSize: 12, fontWeight: '600' },
    arabicContentWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 },
    ayahDecorativeContainer: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 12, position: 'relative' },
    ayahDecorativeMark: { color: '#8C4B40', fontSize: 32, position: 'absolute', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif' },
    ayahNumberText: { color: '#8C4B40', fontSize: 11, fontWeight: 'bold', position: 'absolute' },
    arabicText: { color: '#1A1A1A', textAlign: 'right', flexShrink: 1 },
    translationText: { color: '#4A4A4A', fontSize: 17, lineHeight: 28, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

    // Settings modal — matches Surah reader
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FDF6E3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '600' },
    settingLabel: { color: '#5E5C58', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    settingsGroup: { backgroundColor: '#F4EBD9', borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
    settingOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    settingOptionActive: { backgroundColor: 'rgba(140,75,64,0.05)' },
    settingOptionText: { color: '#1A1A1A', fontSize: 16 },
    sizeControlGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4EBD9', borderRadius: 16, padding: 12 },
    sizeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EAE2CF', alignItems: 'center', justifyContent: 'center' },
    sizePreviewIndicator: { color: '#8C4B40', fontSize: 20, fontWeight: '500' },
});
