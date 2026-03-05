import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';

// ─── Fawaz Hadith API (no auth required) ──────────────────────────────────────
// Same CDN as the Quran API already integrated. 440+ editions, 90+ languages.
const FAWAZ_HADITH = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// Arabic script editions per collection
const ARA_EDITIONS: Record<string, string> = {
    bukhari:  'ara-bukhari',
    muslim:   'ara-muslim',
    tirmidhi: 'ara-tirmidhi',
    abudawud: 'ara-abudawud',
};

// Translation editions per collection × language
// French is missing for Tirmidhi — falls back to English
const LANG_EDITIONS: Record<string, Record<string, string>> = {
    bukhari: {
        english: 'eng-bukhari', urdu: 'urd-bukhari',
        indonesian: 'ind-bukhari', french: 'fra-bukhari',
        bengali: 'ben-bukhari', turkish: 'tur-bukhari',
    },
    muslim: {
        english: 'eng-muslim', urdu: 'urd-muslim',
        indonesian: 'ind-muslim', french: 'fra-muslim',
        bengali: 'ben-muslim', turkish: 'tur-muslim',
    },
    tirmidhi: {
        english: 'eng-tirmidhi', urdu: 'urd-tirmidhi',
        indonesian: 'ind-tirmidhi', french: 'eng-tirmidhi',
        bengali: 'ben-tirmidhi', turkish: 'tur-tirmidhi',
    },
    abudawud: {
        english: 'eng-abudawud', urdu: 'urd-abudawud',
        indonesian: 'ind-abudawud', french: 'fra-abudawud',
        bengali: 'ben-abudawud', turkish: 'tur-abudawud',
    },
};

const ITEMS_PER_PAGE = 30;

// ─── Types & Helpers ──────────────────────────────────────────────────────────
interface HadithItem {
    id: string;
    hadith_number: number;
    book_slug: string;
    text_arabic: string;
    text_translation: string;
    grade: string;
    section: string;
}

// Merge Arabic + translation arrays into display items
const buildHadiths = (
    collectionId: string,
    araHadiths: any[],
    trHadiths: any[],
    sections: Record<string, string>
): HadithItem[] =>
    araHadiths.map((ara, i) => {
        const tr = trHadiths[i];
        const sectionKey = String(ara.reference?.book ?? '');
        return {
            id: String(ara.hadithnumber),
            hadith_number: ara.hadithnumber,
            book_slug: collectionId,
            text_arabic: ara.text ?? '',
            text_translation: tr?.text ?? '',
            grade: tr?.grades?.[0]?.grade ?? '',
            section: sections[sectionKey] ?? '',
        };
    });

// DB fallback — get translation column by language
const getTranslationFromRow = (row: any, lang: string): string => {
    switch (lang) {
        case 'urdu':       return row.text_urdu    || row.text_english || '';
        case 'indonesian': return row.text_ind     || row.text_english || '';
        case 'french':     return row.text_fra     || row.text_english || '';
        case 'bengali':    return row.text_ben     || row.text_english || '';
        case 'turkish':    return row.text_tur     || row.text_english || '';
        default:           return row.text_english || '';
    }
};

// Grade colour: Sahih → green, Hasan → amber, Da'if → red
const gradeColor = (grade: string) => {
    const g = grade.toLowerCase();
    if (g.includes('sahih'))                                    return '#2ECC71';
    if (g.includes('hasan'))                                    return '#F39C12';
    if (g.includes("da'if") || g.includes('daif') || g.includes('weak')) return '#E74C3C';
    return '#9A9590';
};

// ─── Collection meta ──────────────────────────────────────────────────────────
const COLLECTIONS_META: Record<string, { title: string; count: number; color: string }> = {
    bukhari:  { title: 'Sahih al-Bukhari',  count: 7563, color: '#C9A84C' },
    muslim:   { title: 'Sahih Muslim',      count: 3033, color: '#1F4E3D' },
    tirmidhi: { title: 'Jami at-Tirmidhi',  count: 3956, color: '#4A3E2D' },
    abudawud: { title: 'Sunan Abu Dawud',   count: 5274, color: '#2C3E50' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HadithCollectionScreen() {
    const { id }    = useLocalSearchParams();
    const router    = useRouter();
    const insets    = useSafeAreaInsets();
    const { db }    = useDatabase();
    const { language } = useLanguage();

    const collectionId = typeof id === 'string' ? id : 'bukhari';
    const meta         = COLLECTIONS_META[collectionId] ?? COLLECTIONS_META.bukhari;

    const [hadiths,      setHadiths]      = useState<HadithItem[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [loadingMore,  setLoadingMore]  = useState(false);
    const [hasMore,      setHasMore]      = useState(true);
    const [usingApi,     setUsingApi]     = useState(false);
    const [displayOffset, setDisplayOffset] = useState(0);

    // Full in-memory collection — avoids refetch on pagination / language switch
    const allHadithsRef  = useRef<HadithItem[]>([]);
    // Cached Arabic raws — reused when only translation changes
    const araRawRef      = useRef<any[]>([]);
    const metaSectionsRef = useRef<Record<string, string>>({});
    const prevLanguageRef = useRef<string>(language);

    // ── Fetch full collection from Fawaz API ───────────────────────────────────
    const loadFromApi = async (lang: string, arabicAlreadyCached: boolean) => {
        const araEdition  = ARA_EDITIONS[collectionId];
        const langEdition = LANG_EDITIONS[collectionId]?.[lang]
                         ?? LANG_EDITIONS[collectionId]?.english;

        const fetches: Promise<Response>[] = arabicAlreadyCached
            ? [fetch(`${FAWAZ_HADITH}/editions/${langEdition}.min.json`)]
            : [
                fetch(`${FAWAZ_HADITH}/editions/${araEdition}.min.json`),
                fetch(`${FAWAZ_HADITH}/editions/${langEdition}.min.json`),
              ];

        const results = await Promise.allSettled(fetches);

        let araHadiths: any[] = arabicAlreadyCached ? araRawRef.current : [];
        let trHadiths:  any[] = [];

        if (!arabicAlreadyCached) {
            const araResult = results[0];
            const trResult  = results[1];
            if (araResult.status === 'fulfilled' && araResult.value.ok) {
                const json = await araResult.value.json();
                araHadiths = json.hadiths ?? [];
                metaSectionsRef.current = json.metadata?.section ?? {};
                araRawRef.current = araHadiths;
            }
            if (trResult?.status === 'fulfilled' && trResult.value.ok) {
                const json = await trResult.value.json();
                trHadiths = json.hadiths ?? [];
            }
        } else {
            const trResult = results[0];
            if (trResult?.status === 'fulfilled' && trResult.value.ok) {
                const json = await trResult.value.json();
                trHadiths = json.hadiths ?? [];
            }
        }

        if (araHadiths.length === 0) throw new Error('Arabic fetch failed');

        const built = buildHadiths(collectionId, araHadiths, trHadiths, metaSectionsRef.current);
        allHadithsRef.current = built;
        setUsingApi(true);
        setDisplayOffset(0);
        setHasMore(built.length > ITEMS_PER_PAGE);
        setHadiths(built.slice(0, ITEMS_PER_PAGE));
    };

    // ── DB fallback (offline) ─────────────────────────────────────────────────
    const loadFromDb = async (lang: string, dbOffset: number, isInitial: boolean) => {
        if (!db) return;
        setUsingApi(false);
        const rows = await db.getAllAsync(
            `SELECT collection_slug AS book_slug, hadith_number,
                    arabic_text AS text_arabic, english_text AS text_english,
                    urdu_text AS text_urdu, narrator_chain AS narrator
             FROM hadiths WHERE collection_slug = ?
             ORDER BY CAST(hadith_number AS INTEGER) ASC
             LIMIT ? OFFSET ?`,
            [collectionId, ITEMS_PER_PAGE, dbOffset]
        ) as any[];

        if (rows.length < ITEMS_PER_PAGE) setHasMore(false);

        const mapped: HadithItem[] = rows.map(r => ({
            id:               `${r.book_slug}-${r.hadith_number}`,
            hadith_number:    Number(r.hadith_number),
            book_slug:        r.book_slug ?? '',
            text_arabic:      r.text_arabic ?? '',
            text_translation: getTranslationFromRow(r, lang),
            grade:            '',
            section:          '',
        }));

        setHadiths(prev => isInitial ? mapped : [...prev, ...mapped]);
    };

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        araRawRef.current      = [];
        allHadithsRef.current  = [];
        prevLanguageRef.current = language;
        setLoading(true);
        setHadiths([]);
        setHasMore(true);
        setDisplayOffset(0);
        setUsingApi(false);

        (async () => {
            try {
                await loadFromApi(language, false);
            } catch {
                try {
                    await loadFromDb(language, 0, true);
                } catch (e) {
                    console.error('Hadith load failed:', e);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [collectionId]);

    // ── Language change ───────────────────────────────────────────────────────
    useEffect(() => {
        if (prevLanguageRef.current === language) return;
        prevLanguageRef.current = language;

        if (usingApi && araRawRef.current.length > 0) {
            // Reuse cached Arabic — only fetch new translation
            (async () => {
                try {
                    await loadFromApi(language, true);
                } catch {
                    // Remap whatever we have with best-effort (keeps existing hadiths)
                }
            })();
        } else {
            // DB mode — reload with new language from beginning
            setLoading(true);
            setHadiths([]);
            setHasMore(true);
            setDisplayOffset(0);
            (async () => {
                try {
                    await loadFromDb(language, 0, true);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [language, usingApi]);

    // ── In-memory pagination (API mode) / DB pagination (offline mode) ─────────
    const handleLoadMore = () => {
        if (loadingMore || !hasMore || loading) return;

        if (usingApi) {
            // Slice next batch from in-memory array — instant, no network
            const nextOffset = displayOffset + ITEMS_PER_PAGE;
            const batch = allHadithsRef.current.slice(nextOffset, nextOffset + ITEMS_PER_PAGE);
            if (batch.length === 0) { setHasMore(false); return; }
            if (batch.length < ITEMS_PER_PAGE) setHasMore(false);
            setDisplayOffset(nextOffset);
            setHadiths(prev => [...prev, ...batch]);
        } else {
            // DB pagination
            setLoadingMore(true);
            const nextOffset = displayOffset + ITEMS_PER_PAGE;
            setDisplayOffset(nextOffset);
            loadFromDb(language, nextOffset, false).finally(() => setLoadingMore(false));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const renderHadith = ({ item, index }: { item: HadithItem; index: number }) => {
        // Show section header when the chapter changes
        const prevItem = hadiths[index - 1];
        const showSection = item.section && item.section !== prevItem?.section;

        return (
            <View>
                {showSection && (
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionText, { color: meta.color }]}>{item.section}</Text>
                    </View>
                )}
                <View style={styles.hadithCard}>
                    {/* Badge row */}
                    <View style={styles.cardTopRow}>
                        <View style={[styles.bookBadge, { backgroundColor: meta.color + '20' }]}>
                            <Text style={[styles.badgeText, { color: meta.color }]}>
                                {meta.title.toUpperCase()} {item.hadith_number}
                            </Text>
                        </View>
                        {item.grade ? (
                            <View style={[styles.gradeBadge, { borderColor: gradeColor(item.grade) + '60' }]}>
                                <View style={[styles.gradeDot, { backgroundColor: gradeColor(item.grade) }]} />
                                <Text style={[styles.gradeText, { color: gradeColor(item.grade) }]}>
                                    {item.grade}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Arabic */}
                    <Text style={styles.arabicText}>{item.text_arabic}</Text>

                    <View style={styles.divider} />

                    {/* Translation */}
                    <Text style={[
                        styles.translationText,
                        language === 'urdu' && {
                            fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
                            fontSize: 18, textAlign: 'right', lineHeight: 32,
                        }
                    ]}>
                        {item.text_translation}
                    </Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Feather name="share-2" size={18} color="#9A9590" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Feather name="bookmark" size={18} color="#9A9590" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 100 }} />;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={meta.color} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={meta.color} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: meta.color }]}>{meta.title}</Text>
                    <Text style={styles.headerSubtitle}>
                        {usingApi
                            ? `${allHadithsRef.current.length.toLocaleString()} Hadiths · Live`
                            : `${meta.count.toLocaleString()} Hadiths · Offline`}
                    </Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Feather name="filter" size={22} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={meta.color} />
                    <Text style={styles.loadingText}>Loading {meta.title}...</Text>
                    {usingApi === false && (
                        <Text style={styles.loadingSubtext}>Fetching full collection…</Text>
                    )}
                </View>
            ) : (
                <FlatList
                    data={hadiths}
                    keyExtractor={(item, i) => `${item.id}-${i}`}
                    renderItem={renderHadith}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F0E' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    filterButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
    headerTitle:  { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
    headerSubtitle: {
        color: '#9A9590', fontSize: 12, marginTop: 4,
        letterSpacing: 0.5, textTransform: 'uppercase',
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText:    { color: '#9A9590', marginTop: 16, fontSize: 15 },
    loadingSubtext: { color: '#5E5C58', marginTop: 6, fontSize: 12 },
    listContent:    { paddingHorizontal: 20, paddingTop: 24 },
    sectionHeader: {
        paddingVertical: 10, paddingHorizontal: 4,
        marginBottom: 12, marginTop: 8,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    sectionText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    hadithCard: {
        backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
        padding: 24, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    cardTopRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8,
    },
    bookBadge:  { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    badgeText:  { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    gradeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
        borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)',
    },
    gradeDot:   { width: 6, height: 6, borderRadius: 3 },
    gradeText:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
    arabicText: {
        color: '#E8E6E1', fontSize: 22, lineHeight: 40,
        textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
    translationText: { color: '#9A9590', fontSize: 15, lineHeight: 24 },
    actionRow: {
        flexDirection: 'row', justifyContent: 'flex-end', gap: 16,
        marginTop: 20, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    },
    actionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
    footerLoader: { paddingVertical: 30, alignItems: 'center' },
});
