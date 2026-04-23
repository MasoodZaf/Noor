import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useRouter } from 'expo-router';
import { useTheme, fonts } from '../../../context/ThemeContext';
import { sanitizeArabicText } from '../../../utils/arabic';

// Common transliteration / Urdu-romanised alternate names known to South Asian users
const SURAH_ALTERNATE_NAMES: Record<number, string> = {
    1: 'fatiha hamd opening',
    2: 'baqara baqarah bakara cow',
    3: 'imran aal-e-imran ali imran',
    4: 'nisa nisaa women',
    5: 'maidah maida table spread',
    6: 'anam cattle',
    7: 'araf heights',
    9: 'tawbah taubah repentance baraat',
    12: 'yusuf joseph',
    14: 'ibrahim abraham',
    18: 'kahf cave',
    19: 'maryam mary',
    24: 'noor nur light',
    31: 'luqman',
    36: 'ya-sin yaseen ya sin yasin',
    55: 'rahman rehman ar-rahman',
    56: 'waqia waqiah inevitable',
    57: 'hadid iron',
    62: 'juma jumuah friday',
    67: 'mulk tabarak dominion',
    76: 'insan dahr human time',
    78: 'naba news',
    87: 'ala most high',
    89: 'fajr dawn',
    93: 'duha morning hours',
    94: 'sharh inshirah relief',
    99: 'zalzala earthquake',
    100: 'adiyat',
    108: 'kausar kawthar',
    109: 'kafirun kafiroon disbelievers',
    110: 'nasr victory',
    111: 'lahab masad flame',
    112: 'ikhlas tawhid sincerity',
    113: 'falaq dawn',
    114: 'nas mankind',
};

const POPULAR_TAFSEERS = [
    { id: 'ibn_kathir', title: 'Tafsir Ibn Kathir', author: 'Isma\'il ibn Kathir', desc: 'Highly regarded, widely used classical tafsir.' },
    { id: 'jalalayn', title: 'Tafsir al-Jalalayn', author: 'Al-Mahalli & As-Suyuti', desc: 'Concise and brief, excellent for beginners.' },
    { id: 'sadi', title: 'Tafsir As-Sa\'di', author: 'Abdur-Rahman as-Sa\'di', desc: 'Clear, modern, and easy to understand.' },
    { id: 'maarif', title: 'Ma\'ariful Qur\'an', author: 'Muhammad Shafi Usmani', desc: 'Detailed and widely used in South Asia.' },
    { id: 'tabari', title: 'Tafsir al-Tabari', author: 'Muhammad ibn Jarir al-Tabari', desc: 'Classical, comprehensive, and historically significant.' }
];

export default function QuranIndexScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabase();
    const { theme } = useTheme();

    // Back chevron: pop the stack if possible, otherwise fall back to Home tab
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    };

    const [surahs, setSurahs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'surah' | 'juz' | 'tafseer'>('surah');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!db) return;
        const loadAllSurahs = async () => {
            try {
                const results = await db?.getAllAsync('SELECT * FROM surahs ORDER BY number ASC');
                setSurahs(Array.isArray(results) ? results : []);
            } catch (error) {
                console.error('Error fetching all Surahs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAllSurahs();
    }, [db]);

    const q = searchQuery.toLowerCase().trim();
    // Strip diacritics from both query and Arabic name so e.g. "فاتحة" matches "فَاتِحَة"
    const qStripped = sanitizeArabicText(q);
    const filteredSurahs = surahs.filter(s => {
        if (!q) return true;
        const altNames = SURAH_ALTERNATE_NAMES[s.number] ?? '';
        return (
            s.name_english.toLowerCase().includes(q) ||
            sanitizeArabicText(s.name_arabic).includes(qStripped) ||
            (s.name_transliteration && s.name_transliteration.toLowerCase().includes(q)) ||
            altNames.includes(q)
        );
    });

    const juzArray = Array.from({ length: 30 }, (_, i) => i + 1);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Loading Mushaf...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={goBack} hitSlop={10} style={{ marginLeft: -6, marginRight: 4, paddingVertical: 4 }}>
                            <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { marginBottom: 0, color: theme.textPrimary }]}>Al-Quran</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/search?scope=quran' as any)}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Feather name="search" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={[styles.searchBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="search" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search Surah..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        keyboardAppearance={theme.isDark ? 'dark' : 'light'}
                    />
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    {(['surah', 'juz', 'tafseer'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabBtn, activeTab === tab && [styles.tabBtnActive, { borderColor: theme.accent }]]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === tab && { color: theme.textPrimary, fontWeight: 'bold' }]}>
                                {tab === 'surah' ? 'Surah' : tab === 'juz' ? 'Juz' : 'Tafseer'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            >
                {activeTab === 'surah' ? (
                    filteredSurahs.length === 0 && searchQuery.trim().length > 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
                            <Feather name="search" size={36} color={theme.textTertiary} />
                            <Text style={{ color: theme.textSecondary, fontSize: 15 }}>No surahs found for "{searchQuery}"</Text>
                        </View>
                    ) :
                    filteredSurahs.map(surah => (
                        <TouchableOpacity
                            key={surah.number}
                            style={[styles.surahCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                            onPress={() => router.push(`/quran/${surah.number}`)}
                            activeOpacity={0.75}
                        >
                            {/* Surah number */}
                            <Text style={[styles.surahNumber, { color: theme.textPrimary }]}>{surah.number}</Text>

                            {/* Arabic name */}
                            <Text style={[styles.arabicName, { color: theme.textPrimary }]}>{surah.name_arabic}</Text>

                            {/* English name + meta */}
                            <View style={styles.nameBlock}>
                                <Text style={[styles.engName, { color: theme.textPrimary }]}>{surah.name_english}</Text>
                                {surah.name_transliteration && surah.name_transliteration !== surah.name_english && (
                                    <Text style={[styles.metaText, { color: theme.accent, fontStyle: 'italic' }]} numberOfLines={1}>{surah.name_transliteration}</Text>
                                )}
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                    {surah.revelation_type
                                        ? surah.revelation_type.charAt(0).toUpperCase() + surah.revelation_type.slice(1).toLowerCase()
                                        : ''}{surah.ayah_count ? ` • ${surah.ayah_count} verses` : ''}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : activeTab === 'juz' ? (
                    <View style={styles.juzGrid}>
                        {juzArray.map(juzNum => (
                            <TouchableOpacity
                                key={juzNum}
                                style={[styles.juzCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                onPress={() => router.push(`/quran/juz/${juzNum}`)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.juzTitle, { color: theme.textPrimary }]}>Juz {juzNum}</Text>
                                <Feather name="book-open" size={16} color={theme.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {POPULAR_TAFSEERS.map(tafseer => (
                            <TouchableOpacity
                                key={tafseer.id}
                                style={[styles.tafseerCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                onPress={() => router.push(`/quran/tafseer/${tafseer.id}`)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.tafseerIconBox, { backgroundColor: theme.accentLight }]}>
                                    <Feather name="book" size={20} color={theme.accent} />
                                </View>
                                <View style={styles.tafseerInfo}>
                                    <Text style={[styles.tafseerTitle, { color: theme.textPrimary }]}>{tafseer.title}</Text>
                                    <Text style={[styles.tafseerAuthor, { color: theme.accent }]}>{tafseer.author}</Text>
                                    <Text style={[styles.tafseerDesc, { color: theme.textSecondary }]} numberOfLines={2}>{tafseer.desc}</Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 30,
        marginBottom: 16,
        fontFamily: fonts.serifBold,
        letterSpacing: -0.3,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        marginBottom: 16,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    tabContainer: {
        flexDirection: 'row',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderColor: 'transparent',
    },
    tabBtnActive: {},
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 48,
        gap: 10,
    },
    // ── Surah card ─────────────────────────────────────────────────────────────
    surahCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    surahNumber: {
        width: 44,
        fontSize: 20,
        fontFamily: fonts.mono,
    },
    arabicName: {
        width: 110,
        fontSize: 22,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    nameBlock: {
        flex: 1,
        paddingLeft: 12,
    },
    // Surah name in editorial serif italic per the Falah Qurʾān index design
    engName: {
        fontSize: 19,
        fontFamily: fonts.serifBold,
        marginBottom: 3,
    },
    metaText: {
        fontSize: 12,
        fontFamily: fonts.body,
    },
    // ── Juz grid ───────────────────────────────────────────────────────────────
    juzGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    juzCard: {
        width: '48%',
        borderRadius: 16,
        padding: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        gap: 10,
    },
    juzTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    // ── Tafseer ────────────────────────────────────────────────────────────────
    tafseerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    tafseerIconBox: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    tafseerInfo: {
        flex: 1,
        marginRight: 12,
    },
    tafseerTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    tafseerAuthor: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 3,
    },
    tafseerDesc: {
        fontSize: 12,
        lineHeight: 18,
    },
});
