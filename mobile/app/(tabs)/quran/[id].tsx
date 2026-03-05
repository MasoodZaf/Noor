import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useAudio } from '../../../context/AudioContext';

// ─── APIs ─────────────────────────────────────────────────────────────────────
// Arabic text (Uthmani + IndoPak scripts)
const ARABIC_API = 'https://api.alquran.cloud/v1';

// Translations — Fawaz Quran API (most languages)
const FAWAZ_API = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';

// Fawaz edition identifiers (all verified 200 on jsdelivr CDN)
const FAWAZ_EDITIONS: Record<string, string> = {
    english: 'eng-muftitaqiusmani',     // Mufti Taqi Usmani
    indonesian: 'ind-indonesianislam',  // Indonesian Ministry of Religious Affairs
    french: 'fra-muhammadhameedu',      // Muhammad Hameedullah
    bengali: 'ben-muhiuddinkhan',       // Muhiuddin Khan
    turkish: 'tur-diyanetisleri',       // Diyanet İşleri Başkanlığı
};

// AlQuran Cloud edition identifiers — used when Fawaz CDN blocks the language
// (All Urdu editions are 403 on jsdelivr as of 2025)
const ALQURAN_EDITIONS: Record<string, string> = {
    urdu: 'ur.jalandhry',  // Fateh Muhammad Jalandhry — most widely read in South Asia
};

// Unified translation fetcher — picks the right API per language
const fetchTranslationTexts = async (surahId: number, language: string): Promise<string[]> => {
    const alquranEdition = ALQURAN_EDITIONS[language];
    if (alquranEdition) {
        // AlQuran Cloud path
        const res = await fetch(`${ARABIC_API}/surah/${surahId}/${alquranEdition}`);
        if (!res.ok) throw new Error(`AlQuran Cloud ${res.status}`);
        const json = await res.json();
        if (json.code !== 200) throw new Error('AlQuran Cloud error');
        return (json.data?.ayahs || []).map((a: any) => a.text);
    }
    // Fawaz CDN path
    const edition = FAWAZ_EDITIONS[language] || FAWAZ_EDITIONS.english;
    const res = await fetch(`${FAWAZ_API}/editions/${edition}/${surahId}.json`);
    if (!res.ok) throw new Error(`Fawaz ${res.status}`);
    const json = await res.json();
    return (json.chapter || []).map((v: any) => v.text);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ARABIC_FONTS = [
    { id: 'default', name: 'Standard Auto (Default System)', family: undefined, field: 'text_arabic' },
    { id: 'indopak', name: 'Indo-Pak Majeedi Text', family: undefined, field: 'text_arabic_indopak' },
    { id: 'uthmani', name: 'Uthmani Script (Mishafi)', family: Platform.OS === 'ios' ? 'Mishafi' : 'sans-serif', field: 'text_arabic' },
    { id: 'naskh', name: 'Traditional Naskh (Damascus)', family: Platform.OS === 'ios' ? 'Damascus' : 'serif', field: 'text_arabic' },
    { id: 'thick', name: 'Thick Arabic (Farah/Arial)', family: Platform.OS === 'ios' ? 'Farah' : 'sans-serif-condensed', field: 'text_arabic' }
];

const cleanArabicText = (text: string, surahNumber: number, ayahNumber: number) => {
    if (!text) return '';
    if (surahNumber !== 1 && surahNumber !== 9 && ayahNumber === 1) {
        let cleaned = text.replace(/^[\u0000-\u001F\uFEFF]*بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
        cleaned = cleaned.replace(/^[\u0000-\u001F\uFEFF]*بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/, '');
        return cleaned;
    }
    return text;
};

const toArabicDigits = (num: number) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (w) => arabicNumbers[parseInt(w, 10)]);
};

// Get translation text from a local DB row based on language
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

// Build merged ayah objects from separate text arrays
const buildAyahs = (surahId: number, uthmani: string[], indopak: string[], translations: string[]) =>
    uthmani.map((arabicText, i) => ({
        id: `${surahId}_${i + 1}`,
        surah_number: surahId,
        ayah_number: i + 1,
        text_arabic: arabicText,
        text_arabic_indopak: indopak[i] || arabicText,
        text_translation: translations[i] || '',
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

    const { soundRef: globalSoundRef, setAudioState } = useAudio();

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahInfo, setSurahInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Arabic text cache — fetched once per surah, not re-fetched on language switch
    const arabicCacheRef = useRef<{ uthmani: string[]; indopak: string[] } | null>(null);
    // Tracks last language used so we can detect real changes vs initial mount
    const prevLanguageRef = useRef<string>(language);

    // Audio Player State
    const [durationMillis, setDurationMillis] = useState(1);
    const [positionMillis, setPositionMillis] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const SPEEDS = [0.75, 1.0, 1.25, 1.5];

    const formatAudioTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    // ── Initial load: fetch Arabic (uthmani + indopak) + current translation ──
    useEffect(() => {
        if (!id) return;

        arabicCacheRef.current = null;
        prevLanguageRef.current = language;

        const loadSurah = async () => {
            setLoading(true);
            try {
                // Fetch Arabic scripts and translation in parallel
                const [arabicResult, translationResult] = await Promise.allSettled([
                    fetch(`${ARABIC_API}/surah/${surahId}/editions/quran-uthmani,quran-indopak`),
                    fetchTranslationTexts(surahId, language),
                ]);

                // Parse Arabic (AlQuran Cloud)
                let uthmaniTexts: string[] = [];
                let indopakTexts: string[] = [];
                if (arabicResult.status === 'fulfilled' && arabicResult.value.ok) {
                    const arabicJson = await arabicResult.value.json();
                    const editions: any[] = arabicJson.data;
                    const uthmaniEd = editions.find((e: any) => e.edition.identifier === 'quran-uthmani');
                    const indopakEd = editions.find((e: any) => e.edition.identifier === 'quran-indopak');
                    uthmaniTexts = (uthmaniEd?.ayahs || []).map((a: any) => a.text);
                    indopakTexts = (indopakEd?.ayahs || []).map((a: any) => a.text);
                    setSurahInfo({
                        number: surahId,
                        name_english: uthmaniEd?.englishName || '',
                        name_arabic: uthmaniEd?.name || '',
                        revelation_type: uthmaniEd?.revelationType || '',
                        total_ayahs: uthmaniTexts.length,
                    });
                }

                const translationTexts = translationResult.status === 'fulfilled' ? translationResult.value : [];

                if (uthmaniTexts.length === 0) throw new Error('Arabic fetch failed');

                arabicCacheRef.current = { uthmani: uthmaniTexts, indopak: indopakTexts };
                setAyahs(buildAyahs(surahId, uthmaniTexts, indopakTexts, translationTexts));

            } catch {
                // Offline fallback: local SQLite DB
                if (db) {
                    try {
                        const surah = await db.getFirstAsync('SELECT * FROM surahs WHERE number = ?', [surahId]);
                        setSurahInfo(surah);
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        const uthmaniTexts = rows.map((r: any) => r.text_arabic || '');
                        const indopakTexts = rows.map((r: any) => r.text_arabic_indopak || r.text_arabic || '');
                        const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                        arabicCacheRef.current = { uthmani: uthmaniTexts, indopak: indopakTexts };
                        setAyahs(buildAyahs(surahId, uthmaniTexts, indopakTexts, translationTexts));
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
            if (globalSoundRef.current) globalSoundRef.current.unloadAsync();
        };
    }, [surahId]);

    // ── Language change: re-fetch translation only, reuse cached Arabic ────────
    useEffect(() => {
        // Skip on initial mount (prevLanguageRef already matches current language)
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;

        const cache = arabicCacheRef.current;
        if (!cache) return; // Initial load not complete yet

        const updateTranslation = async () => {
            setTranslationLoading(true);
            try {
                const translationTexts = await fetchTranslationTexts(surahId, language);
                setAyahs(buildAyahs(surahId, cache.uthmani, cache.indopak, translationTexts));
            } catch {
                // Fallback: local DB translations
                if (db) {
                    try {
                        const rows = await db.getAllAsync(
                            'SELECT * FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
                            [surahId]
                        ) as any[];
                        const translationTexts = rows.map((r: any) => getTranslationFromRow(r, language));
                        setAyahs(buildAyahs(surahId, cache.uthmani, cache.indopak, translationTexts));
                    } catch {}
                }
            } finally {
                setTranslationLoading(false);
            }
        };

        updateTranslation();
    }, [language]);

    // ── Audio ─────────────────────────────────────────────────────────────────
    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPositionMillis(status.positionMillis);
            setDurationMillis(status.durationMillis || 1);
            setAudioState(s => ({
                ...s,
                positionMs: status.positionMillis,
                durationMs: status.durationMillis || 1,
                isPlaying: status.isPlaying,
            }));
            if (status.didJustFinish) {
                setIsPlaying(false);
                globalSoundRef.current?.setPositionAsync(0);
            }
        }
    };

    const togglePlay = async () => {
        if (!surahInfo) return;
        try {
            if (globalSoundRef.current) {
                if (isPlaying) {
                    await globalSoundRef.current.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await globalSoundRef.current.playAsync();
                    setIsPlaying(true);
                }
            } else {
                const numStr = String(surahInfo.number).padStart(3, '0');
                const url = `https://server8.mp3quran.net/afs/${numStr}.mp3`;
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
                const { sound } = await Audio.Sound.createAsync(
                    { uri: url },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                globalSoundRef.current = sound;
                setAudioState(s => ({
                    ...s,
                    isVisible: true,
                    isPlaying: true,
                    title: surahInfo?.name_english || 'Quran',
                    reciter: 'Mishary Al-Afasy',
                }));
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    };

    const skipBack = async () => {
        if (!globalSoundRef.current) return;
        const target = Math.max(0, positionMillis - 10000);
        await globalSoundRef.current.setPositionAsync(target);
    };

    const skipForward = async () => {
        if (!globalSoundRef.current) return;
        const target = Math.min(durationMillis, positionMillis + 10000);
        await globalSoundRef.current.setPositionAsync(target);
    };

    const cycleSpeed = async () => {
        const nextIndex = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
        const next = SPEEDS[nextIndex];
        setPlaybackSpeed(next);
        if (globalSoundRef.current) {
            await globalSoundRef.current.setRateAsync(next, true);
        }
    };

    const progressPercentage = (positionMillis / durationMillis) * 100;

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Opening Surah...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Header */}
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
                <TouchableOpacity style={styles.goalContainer} onPress={() => {}}>
                    <Text style={styles.goalText}>{surahInfo?.total_ayahs || ''} Ayahs</Text>
                    <Text style={[styles.goalText, { color: surahInfo?.revelation_type === 'Meccan' ? '#C9A84C' : '#2ECC71', marginLeft: 8 }]}>
                        {surahInfo?.revelation_type || ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <FlatList
                data={ayahs}
                horizontal={true}
                pagingEnabled={true}
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item: ayah, index }) => (
                    <ScrollView
                        style={{ width }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {index === 0 && surahInfo?.number !== 1 && surahInfo?.number !== 9 && (
                            <View style={styles.bismillahBannerBlock}>
                                <Text style={[styles.bismillahText, { fontFamily: selectedFont.family }]}>
                                    بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                </Text>
                            </View>
                        )}
                        <View style={styles.ayahContainer}>
                            <View style={styles.ayahHeader}>
                                <View style={styles.ayahPillBadge}>
                                    <Text style={styles.ayahPillText}>Aya {ayah.surah_number}:{ayah.ayah_number}</Text>
                                    <Feather name="chevron-down" size={14} color="#5E5C58" style={{ marginLeft: 4, marginTop: 1 }} />
                                </View>
                            </View>

                            <View style={styles.arabicContentWrapper}>
                                <View style={styles.ayahDecorativeContainer}>
                                    <Text style={styles.ayahDecorativeMark}>۝</Text>
                                    <Text style={styles.ayahNumberText}>{toArabicDigits(ayah.ayah_number)}</Text>
                                </View>
                                <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize: fontSize, lineHeight: fontSize * 1.6 }]}>
                                    {cleanArabicText(
                                        ayah[selectedFont.field || 'text_arabic'] || ayah.text_arabic,
                                        ayah.surah_number,
                                        ayah.ayah_number
                                    )}
                                </Text>
                            </View>

                            <Text style={[
                                styles.translationText,
                                (language === 'urdu' || language === 'arabic') && {
                                    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                                    fontSize: 18,
                                    textAlign: 'right',
                                    lineHeight: 32,
                                }
                            ]}>
                                {ayah.text_translation}
                            </Text>
                        </View>
                    </ScrollView>
                )}
            />

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
                                : 'Mishary Al-Afasy'}
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
    translationText: {
        color: '#4A4A4A',
        fontSize: 17,
        lineHeight: 28,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'left',
    },
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
    }
});
