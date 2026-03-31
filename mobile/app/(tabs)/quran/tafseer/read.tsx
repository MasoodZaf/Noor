import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, Modal, ScrollView, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../../context/DatabaseContext';
import { useLanguage } from '../../../../context/LanguageContext';
import { sanitizeArabicText } from '../../../../utils/arabic';
import { useTheme } from '../../../../context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const TAFSEER_META: Record<string, { title: string; author: string; totalVolumes: number; ids?: { english?: number; urdu?: number; arabic?: number } }> = {
    ibn_kathir: { title: 'Tafsir Ibn Kathir', author: "Isma'il ibn Kathir", totalVolumes: 10, ids: { english: 169, urdu: 160, arabic: 14 } },
    jalalayn: { title: 'Tafsir al-Jalalayn', author: 'Al-Mahalli & As-Suyuti', totalVolumes: 1, ids: { arabic: 16 } },
    sadi: { title: "Tafsir As-Sa'di", author: "Abdur-Rahman as-Sa'di", totalVolumes: 10, ids: { arabic: 91, english: 169 } },
    maarif: { title: "Ma'ariful Qur'an", author: 'Muhammad Shafi Usmani', totalVolumes: 8, ids: { english: 168, urdu: 159 } },
    tabari: { title: 'Tafsir al-Tabari', author: 'Muhammad ibn Jarir al-Tabari', totalVolumes: 24, ids: { arabic: 15, english: 169, urdu: 160 } },
};

// quran.com tafsir fallback IDs
const TAFSIR_EN_ID = 169;
const TAFSIR_UR_ID = 160;

const ARABIC_FONTS = [
    { id: 'default', name: 'Standard Auto (Default System)', family: undefined },
    { id: 'uthmani', name: 'Uthmani Script (Mishafi)', family: Platform.OS === 'ios' ? 'Mishafi' : 'sans-serif' },
    { id: 'naskh', name: 'Traditional Naskh (Damascus)', family: Platform.OS === 'ios' ? 'Damascus' : 'serif' },
    { id: 'indopak', name: 'Indo-Pak Majeedi Text', family: Platform.OS === 'ios' ? 'Al Nile' : 'monospace' },
];

const toArabicDigits = (n: number) => {
    const d = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n).replace(/[0-9]/g, w => d[parseInt(w, 10)]);
};

const stripHtml = (html: string) =>
    html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

// ─── Ayah Card (per page) ─────────────────────────────────────────────────────
const AyahPage = React.memo(({
    ayah, surahName, language, meta, selectedFont, fontSize, tafseerIdKey, theme
}: {
    ayah: any; surahName: string; language: string;
    meta: any;
    selectedFont: { id: string; name: string; family: string | undefined };
    fontSize: number;
    tafseerIdKey: string;
    theme: import('../../../../context/ThemeContext').AppTheme;
}) => {
    const isFirstInSurah = ayah.ayah_number === 1;
    const [tafseerText, setTafseerText] = useState<string | null>(null);
    const [tafseerLoading, setTafseerLoading] = useState(false);
    const [tafseerFailed, setTafseerFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleToggleTafseer = async () => {
        // If already loaded (and not an error), just toggle visibility
        if (tafseerText !== null && !tafseerFailed) {
            setExpanded(!expanded);
            return;
        }
        setExpanded(true);
        setTafseerFailed(false);
        setTafseerLoading(true);
        try {
            // Determine best ID for current language + requested tafsir
            let fetchId = language === 'urdu' ? TAFSIR_UR_ID : TAFSIR_EN_ID;
            if (language === 'urdu' && meta.ids?.urdu) fetchId = meta.ids.urdu;
            else if (language === 'english' && meta.ids?.english) fetchId = meta.ids.english;
            else if (meta.ids?.arabic && language !== 'urdu' && language !== 'english') fetchId = meta.ids.arabic;
            else if (meta.ids?.arabic && tafseerIdKey === 'tabari') fetchId = meta.ids.arabic; // Default Tabari to AR if urdu/english fallback doesn't apply well enough or just enforce it. Actually, the fallback mapping above handles Tabari's english/urdu versions.

            const res = await fetch(
                `https://api.quran.com/api/v4/tafsirs/${fetchId}/by_ayah/${ayah.surah_number}:${ayah.ayah_number}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'FalahApp/1.0 (Mobile)',
                    }
                }
            );

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();
            setTafseerText(
                data.tafsir?.text
                    ? stripHtml(data.tafsir.text)
                    : language === 'urdu' ? 'تفسیر دستیاب نہیں ہے۔' : 'Tafseer not available.'
            );
        } catch (error: any) {
            console.warn('[Noor/Tafseer] Fetch failed:', error);
            setTafseerFailed(true);
            setTafseerText(null); // reset so next tap retries
        } finally {
            setTafseerLoading(false);
        }
    };

    const isUrdu = language === 'urdu';

    return (
        <ScrollView
            style={{ width, backgroundColor: theme.bg }}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Surah divider on first ayah of surah */}
            {isFirstInSurah && (
                <View style={styles.surahDivider}>
                    <Text style={[styles.surahDividerName, { color: theme.accent }]}>{surahName}</Text>
                    {ayah.surah_number !== 1 && ayah.surah_number !== 9 && (
                        <View style={[styles.bismillahBannerBlock, { backgroundColor: theme.bgSecondary, borderColor: theme.borderStrong }]}>
                            <Text style={[styles.bismillahText, { fontFamily: selectedFont.family, color: theme.textPrimary }]}>
                                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.ayahContainer}>
                {/* Top row: badge + exegesis toggle */}
                <View style={styles.ayahTopRow}>
                    <View style={[styles.ayahPillBadge, { backgroundColor: theme.bgSecondary }]}>
                        <Text style={[styles.ayahPillText, { color: theme.textSecondary }]}>
                            Aya {ayah.surah_number}:{ayah.ayah_number}
                        </Text>
                        <Feather name="chevron-down" size={14} color={theme.textSecondary} style={{ marginLeft: 4, marginTop: 1 }} />
                    </View>
                    <TouchableOpacity onPress={handleToggleTafseer} style={[styles.exegesisBtn, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                        <Text style={[styles.exegesisBtnText, { color: theme.accent }]}>
                            {expanded ? 'Hide Exegesis' : 'Read Exegesis'}
                        </Text>
                        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={theme.accent} />
                    </TouchableOpacity>
                </View>

                {/* Arabic text + decorative marker */}
                <View style={styles.arabicContentWrapper}>
                    <View style={styles.ayahDecorativeContainer}>
                        <Text style={styles.ayahDecorativeMark}>۝</Text>
                        <Text style={styles.ayahNumberText}>{toArabicDigits(ayah.ayah_number)}</Text>
                    </View>
                    <Text style={[
                        styles.arabicText,
                        { fontFamily: selectedFont.family, fontSize, lineHeight: fontSize * 1.6, color: theme.textPrimary },
                    ]}>
                        {ayah.text_arabic}
                    </Text>
                </View>

                {/* Translation */}
                {ayah.text_translation ? (
                    <Text style={[
                        styles.translationText,
                        { color: theme.textSecondary },
                        isUrdu && {
                            fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                            fontSize: 18, textAlign: 'right', lineHeight: 32, fontStyle: 'normal',
                        },
                    ]}>
                        {ayah.text_translation}
                    </Text>
                ) : null}

                {/* Expandable tafseer */}
                {expanded && (
                    <View style={[styles.tafseerBody, { borderTopColor: theme.border }]}>
                        <View style={[styles.quoteBar, { backgroundColor: theme.accent }]} />
                        <View style={{ flex: 1 }}>
                            {tafseerLoading ? (
                                <ActivityIndicator color={theme.accent} style={{ alignSelf: 'flex-start', marginVertical: 16 }} />
                            ) : tafseerFailed ? (
                                <TouchableOpacity onPress={handleToggleTafseer} style={{ marginVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather name="refresh-cw" size={14} color={theme.accent} />
                                    <Text style={{ color: theme.accent, fontSize: 13 }}>Failed to load — tap to retry</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[
                                    styles.tafseerText,
                                    { color: theme.textSecondary },
                                    isUrdu && {
                                        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                                        fontSize: 17, textAlign: 'right', lineHeight: 30, fontStyle: 'normal',
                                    },
                                ]}>
                                    <Text style={[styles.tafseerAuthor, { color: theme.accent }]}>[{meta.author}]{'  '}</Text>
                                    {tafseerText}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TafseerReadScreen() {
    const { book, volume } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();
    const { theme } = useTheme();

    const tafseerId = typeof book === 'string' ? book : 'ibn_kathir';
    const volumeIndex = typeof volume === 'string' ? parseInt(volume, 10) : 1;
    const meta = TAFSEER_META[tafseerId] || TAFSEER_META['ibn_kathir'];

    const [loading, setLoading] = useState(true);
    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahMap, setSurahMap] = useState<Record<number, string>>({});

    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(30);

    useEffect(() => {
        if (!db) return;

        const load = async () => {
            setLoading(true);
            try {
                const surahsPerVol = Math.ceil(114 / meta.totalVolumes);
                const startSurah = (volumeIndex - 1) * surahsPerVol + 1;
                const endSurah = Math.min(startSurah + surahsPerVol - 1, 114);

                const surahsData: any[] = await db.getAllAsync(
                    'SELECT number, name_english FROM surahs WHERE number >= ? AND number <= ?',
                    [startSurah, endSurah]
                );
                const map: Record<number, string> = {};
                surahsData.forEach(s => { map[s.number] = s.name_english; });
                setSurahMap(map);

                const rows: any[] = await db.getAllAsync(
                    'SELECT * FROM ayahs WHERE surah_number >= ? AND surah_number <= ? ORDER BY surah_number ASC, ayah_number ASC',
                    [startSurah, endSurah]
                );

                const merged = rows.map(r => ({
                    id: `${r.surah_number}_${r.ayah_number}`,
                    surah_number: r.surah_number,
                    ayah_number: r.ayah_number,
                    text_arabic: sanitizeArabicText(r.text_arabic || ''),
                    text_translation: language === 'urdu'
                        ? (r.text_urdu || r.text_english || '')
                        : (r.text_english || ''),
                }));
                setAyahs(merged);
            } catch (e) {
                console.error('Tafseer volume load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [db, tafseerId, volumeIndex]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Compiling Volume {volumeIndex}...</Text>
            </View>
        );
    }

    const firstSurah = ayahs[0]?.surah_number;
    const lastSurah = ayahs[ayahs.length - 1]?.surah_number;

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header — matches Juz/Surah reader */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>{meta.title}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
                        <Feather name="settings" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sub-header */}
            <View style={[styles.subHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.subHeaderText, { color: theme.textSecondary }]}>Vol {volumeIndex} • {ayahs.length} Ayahs</Text>
                <Text style={[styles.subHeaderRight, { color: theme.textSecondary }]}>
                    {surahMap[firstSurah] || ''}{lastSurah !== firstSurah ? ` → ${surahMap[lastSurah] || ''}` : ''}
                </Text>
            </View>

            {/* Horizontal paginated FlatList */}
            <FlatList
                data={ayahs}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ flex: 1 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <AyahPage
                        ayah={item}
                        surahName={surahMap[item.surah_number] || ''}
                        language={language}
                        meta={meta}
                        selectedFont={selectedFont}
                        fontSize={fontSize}
                        tafseerIdKey={tafseerId}
                        theme={theme}
                    />
                )}
                ListFooterComponent={
                    <View style={[styles.completionPage, { backgroundColor: theme.bg }]}>
                        <Feather name="check-circle" size={36} color={theme.accent} />
                        <Text style={[styles.completionText, { color: theme.textPrimary }]}>End of Volume {volumeIndex}</Text>
                        <Text style={[styles.completionSub, { color: theme.textSecondary }]}>{meta.title}</Text>
                    </View>
                }
            />

            {/* Settings Modal */}
            <Modal
                transparent
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20, backgroundColor: theme.bgCard }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Reading Settings</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <Feather name="x" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Arabic Font Style</Text>
                        <View style={[styles.settingsGroup, { backgroundColor: theme.bgSecondary }]}>
                            {ARABIC_FONTS.map(font => (
                                <TouchableOpacity
                                    key={font.id}
                                    style={[styles.settingOption, { borderBottomColor: theme.border }, selectedFont.id === font.id && styles.settingOptionActive]}
                                    onPress={() => setSelectedFont(font)}
                                >
                                    <Text style={[styles.settingOptionText, { color: theme.textPrimary }, selectedFont.id === font.id && { color: theme.accent }]}>
                                        {font.name}
                                    </Text>
                                    {selectedFont.id === font.id && <Feather name="check" size={18} color={theme.accent} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Text Size ({fontSize}pt)</Text>
                        <View style={[styles.sizeControlGroup, { backgroundColor: theme.bgSecondary }]}>
                            <TouchableOpacity style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]} onPress={() => setFontSize(Math.max(20, fontSize - 2))}>
                                <Feather name="minus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.sizePreviewIndicator, { color: theme.accent }]}>Aa</Text>
                            <TouchableOpacity style={[styles.sizeBtn, { backgroundColor: theme.bgInput }]} onPress={() => setFontSize(Math.min(56, fontSize + 2))}>
                                <Feather name="plus" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const TAFSEER_ACCENT = '#8C4B40'; // terracotta — decorative, fixed

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingText: { marginTop: 16 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    actionButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', marginLeft: 8, flexShrink: 1 },

    subHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 14,
        borderBottomWidth: 1,
    },
    subHeaderText: { fontSize: 13 },
    subHeaderRight: { fontSize: 13 },

    // Page content
    pageContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

    // Surah divider
    surahDivider: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
    surahDividerName: {
        fontSize: 16, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
    },
    bismillahBannerBlock: {
        paddingVertical: 14, paddingHorizontal: 20,
        borderRadius: 4, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
        width: '100%', marginTop: 4,
    },
    bismillahText: { fontSize: 30, textAlign: 'center' },

    // Ayah area
    ayahContainer: { paddingVertical: 10 },
    ayahTopRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    ayahPillBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    },
    ayahPillText: { fontSize: 12, fontWeight: '600' },
    exegesisBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 6, paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    exegesisBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginRight: 4 },

    arabicContentWrapper: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'flex-end', marginBottom: 20,
    },
    ayahDecorativeContainer: {
        width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
        marginLeft: 12, position: 'relative',
    },
    ayahDecorativeMark: {
        color: TAFSEER_ACCENT, fontSize: 32, position: 'absolute',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    ayahNumberText: { color: TAFSEER_ACCENT, fontSize: 11, fontWeight: 'bold', position: 'absolute' },
    arabicText: { textAlign: 'right', flexShrink: 1 },

    translationText: {
        fontSize: 17, lineHeight: 28, fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        marginBottom: 8,
    },

    // Tafseer section
    tafseerBody: {
        flexDirection: 'row',
        marginTop: 16,
        marginBottom: 10,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    quoteBar: {
        width: 3,
        borderRadius: 1.5, marginRight: 16,
    },
    tafseerText: {
        flex: 1, fontSize: 15, lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    tafseerAuthor: { fontWeight: '700' },

    // Completion footer page
    completionPage: {
        width, alignItems: 'center', justifyContent: 'center',
        paddingTop: 80, paddingHorizontal: 32,
    },
    completionText: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 6 },
    completionSub: { fontSize: 14, textAlign: 'center' },

    // Settings modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    settingLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    settingsGroup: { borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
    settingOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1,
    },
    settingOptionActive: { backgroundColor: 'rgba(140,75,64,0.05)' },
    settingOptionText: { fontSize: 16 },
    sizeControlGroup: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 16, padding: 12,
    },
    sizeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    sizePreviewIndicator: { fontSize: 20, fontWeight: '500' },
});
