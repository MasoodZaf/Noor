import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
    Platform, ActivityIndicator, KeyboardAvoidingView, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useNetworkMode } from '../context/NetworkModeContext';

// ─── APIs ─────────────────────────────────────────────────────────────────────
const QURANI_BASE = 'https://api.qurani.ai/gw/qh/v1';

type Scope = 'quran' | 'hadith' | 'fiqh';

interface QuranResult {
    type: 'quran';
    ref: string;
    surahName: string;
    arabic: string;
    english: string;
}

interface HadithResult {
    type: 'hadith' | 'fiqh';
    collection: string;
    number: string | number;
    narrator: string;
    arabic: string;
    english: string;
}

type Result = QuranResult | HadithResult;

const SCOPE_LABELS: Record<Scope, string> = { quran: 'Quran', hadith: 'Hadith', fiqh: 'Fiqh' };
const SCOPE_ICONS: Record<Scope, React.ComponentProps<typeof Feather>['name']> = {
    quran: 'book-open',
    hadith: 'feather',
    fiqh: 'layers',
};

// ─── Fawaz Hadith API ─────────────────────────────────────────────────────────
const FAWAZ_HADITH = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

const LANG_EDITIONS: Record<string, Record<string, string>> = {
    bukhari:  { english: 'eng-bukhari',  urdu: 'urd-bukhari',  indonesian: 'ind-bukhari',  french: 'fra-bukhari',  bengali: 'ben-bukhari',  turkish: 'tur-bukhari'  },
    muslim:   { english: 'eng-muslim',   urdu: 'urd-muslim',   indonesian: 'ind-muslim',   french: 'fra-muslim',   bengali: 'ben-muslim',   turkish: 'tur-muslim'   },
    tirmidhi: { english: 'eng-tirmidhi', urdu: 'urd-tirmidhi', indonesian: 'ind-tirmidhi', french: 'eng-tirmidhi', bengali: 'ben-tirmidhi', turkish: 'tur-tirmidhi' },
    abudawud: { english: 'eng-abudawud', urdu: 'urd-abudawud', indonesian: 'ind-abudawud', french: 'fra-abudawud', bengali: 'ben-abudawud', turkish: 'tur-abudawud' },
    nasai:    { english: 'eng-nasai',    urdu: 'urd-nasai',    indonesian: 'ind-nasai',    french: 'fra-nasai',    bengali: 'ben-nasai',    turkish: 'tur-nasai'    },
    ibnmajah: { english: 'eng-ibnmajah', urdu: 'urd-ibnmajah', indonesian: 'ind-ibnmajah', french: 'fra-ibnmajah', bengali: 'ben-ibnmajah', turkish: 'tur-ibnmajah' },
    malik:    { english: 'eng-malik',    urdu: 'urd-malik',    indonesian: 'ind-malik',    french: 'fra-malik',    bengali: 'ben-malik',    turkish: 'tur-malik'    },
};

async function fetchHadithTranslations(
    items: Array<{ collection: string; number: string | number }>,
    lang: Language
): Promise<Record<string, string>> {
    if (lang === 'english') return {};
    const settled = await Promise.allSettled(
        items.map(async ({ collection, number }) => {
            const slug = collection.toLowerCase();
            const edition = LANG_EDITIONS[slug]?.[lang] ?? LANG_EDITIONS[slug]?.['english'];
            if (!edition) return { key: `${slug}:${number}`, text: '' };
            const ctl = new AbortController();
            setTimeout(() => ctl.abort(), 5000);
            const res = await fetch(
                `${FAWAZ_HADITH}/editions/${edition}/${number}.json`,
                { signal: ctl.signal }
            );
            if (!res.ok) return { key: `${slug}:${number}`, text: '' };
            const json = await res.json();
            const text: string = Array.isArray(json?.hadiths)
                ? (json.hadiths[0]?.text ?? '')
                : (json?.text ?? '');
            return { key: `${slug}:${number}`, text };
        })
    );
    const map: Record<string, string> = {};
    for (const r of settled) {
        if (r.status === 'fulfilled' && r.value.text) map[r.value.key] = r.value.text;
    }
    return map;
}

// ─── Language helpers ─────────────────────────────────────────────────────────
type Language = 'english' | 'urdu' | 'indonesian' | 'french' | 'bengali' | 'turkish';

function translationCol(lang: Language): string {
    switch (lang) {
        case 'urdu':       return 'text_urdu';
        case 'indonesian': return 'text_ind';
        case 'french':     return 'text_fra';
        case 'bengali':    return 'text_ben';
        case 'turkish':    return 'text_tur';
        default:           return 'text_english';
    }
}

function quranApiLang(lang: Language): string {
    switch (lang) {
        case 'urdu':       return 'ur';
        case 'indonesian': return 'id';
        case 'french':     return 'fr';
        case 'bengali':    return 'bn';
        case 'turkish':    return 'tr';
        default:           return 'en';
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildFtsParam(query: string): string {
    return query
        .replace(/['"*^()[\]{}|!]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(w => `"${w}"*`)
        .join(' ');
}

function collectionLabel(slug: string): string {
    const MAP: Record<string, string> = {
        bukhari: 'Bukhari',
        muslim: 'Muslim',
        tirmidhi: 'Tirmidhi',
        abudawud: 'Abu Dawud',
        nasai: "Nasa'i",
        ibnmajah: 'Ibn Majah',
        malik: 'Malik',
        riyadussaliheen: 'Riyad us-Saliheen',
    };
    return MAP[slug?.toLowerCase()] ?? slug?.toUpperCase() ?? 'Hadith';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();
    const { theme } = useTheme();
    const { isOfflineMode } = useNetworkMode();
    const { scope: scopeParam, q: qParam } = useLocalSearchParams<{ scope?: string; q?: string }>();
    const inputRef = useRef<TextInput>(null);

    const initialScope: Scope =
        scopeParam === 'hadith' ? 'hadith' :
        scopeParam === 'fiqh'   ? 'fiqh'   : 'quran';

    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const [scope, setScope] = useState<Scope>(initialScope);
    const [query, setQuery] = useState(qParam ?? '');
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchFailed, setSearchFailed] = useState(false);

    // Auto-run search if a query was passed via params
    useEffect(() => {
        if (qParam && qParam.trim().length >= 2) runSearch(qParam, initialScope);
    }, []);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            setTimeout(() => inputRef.current?.focus(), 200);
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
            return () => sub.remove();
        }, [goBack])
    );

    // Re-run search when scope changes (if there's an active query)
    useEffect(() => {
        if (query.trim().length >= 2) runSearch(query, scope);
        else setResults([]);
    }, [scope]);

    // Debounced search on query change
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        const timer = setTimeout(() => runSearch(query, scope), 400);
        return () => clearTimeout(timer);
    }, [query]);

    const runSearch = async (q: string, s: Scope) => {
        setLoading(true);
        setSearchFailed(false);
        try {
            if (s === 'quran') await searchQuran(q, language);
            else await searchHadithOrFiqh(q, s as 'hadith' | 'fiqh');
        } catch (error: any) {
            if (!mountedRef.current) return;
            const isNetworkError =
                error?.name === 'TypeError' ||
                error?.message?.includes('Network request failed') ||
                error?.message?.includes('Failed to fetch');
            setSearchFailed(isNetworkError);
            setResults([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    // ── Quran search ──────────────────────────────────────────────────────────
    const searchQuran = async (q: string, lang: Language) => {
        const col = translationCol(lang);
        const apiLang = quranApiLang(lang);

        // 1. Online: Qurani.ai — supplement with SQLite for language translation
        if (db && !isOfflineMode) {
            try {
                const ctl2 = new AbortController();
                setTimeout(() => ctl2.abort(), 6000);
                const res = await fetch(
                    `${QURANI_BASE}/search/${encodeURIComponent(q)}?language=${apiLang}&limit=15&exactSearch=false`,
                    { signal: ctl2.signal }
                );
                const json = await res.json();
                if (json.code === 200 && json.data?.ayahs?.length) {
                    const ayahs: any[] = json.data.ayahs;
                    // Validate that surah/ayah numbers are integers within Quran bounds
                    // before splicing them into the SQL VALUES clause (prevents injection).
                    const validatedRefs = ayahs
                        .filter((a: any) =>
                            Number.isInteger(a.surah?.number) && a.surah.number >= 1 && a.surah.number <= 114 &&
                            Number.isInteger(a.numberInSurah) && a.numberInSurah >= 1
                        )
                        .map((a: any) => `(${a.surah.number},${a.numberInSurah})`);
                    if (validatedRefs.length === 0) { setResults([]); return; }
                    const refs = validatedRefs.join(',');
                    const transRows = await db.getAllAsync<any>(
                        `SELECT surah_number, ayah_number, ${col} AS translation
                         FROM ayahs
                         WHERE (surah_number, ayah_number) IN (VALUES ${refs})`
                    ).catch(() => [] as any[]);
                    const transMap: Record<string, string> = {};
                    for (const r of transRows) {
                        transMap[`${r.surah_number}:${r.ayah_number}`] = r.translation ?? '';
                    }
                    setResults(ayahs.map((a: any): QuranResult => ({
                        type: 'quran',
                        ref: `${a.surah?.number ?? ''}:${a.numberInSurah ?? ''}`,
                        surahName: a.surah?.englishName ?? '',
                        arabic: a.text ?? '',
                        english: transMap[`${a.surah?.number}:${a.numberInSurah}`]
                            || a.translation
                            || '',
                    })));
                    return;
                }
            } catch (e: any) {
                if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
                    console.warn('[Noor/Search] Qurani.ai timed out, falling back to SQLite');
                }
                // fall through to offline search
            }
        }

        // 2. Offline: SQLite LIKE on English text, display in selected language
        if (!db) { setResults([]); return; }
        try {
            const rows = await db.getAllAsync<any>(
                `SELECT a.surah_number, a.ayah_number, a.text_arabic,
                        a.text_english, a.${col} AS translation,
                        s.name_english AS surah_en
                 FROM ayahs a
                 JOIN surahs s ON a.surah_number = s.number
                 WHERE a.text_english LIKE ?
                 LIMIT 20`,
                [`%${q}%`]
            );
            setResults(rows.map((r): QuranResult => ({
                type: 'quran',
                ref: `${r.surah_number}:${r.ayah_number}`,
                surahName: r.surah_en ?? '',
                arabic: r.text_arabic ?? '',
                english: r.translation || r.text_english || '',
            })));
        } catch {
            setResults([]);
        }
    };

    // ── Hadith / Fiqh search ─────────────────────────────────────────────────
    // Hadith  → Sahih collections (Bukhari, Muslim): authentic narrations
    // Fiqh    → Sunan collections (Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik):
    //           ruling-oriented books used as primary fiqh sources
    const searchHadithOrFiqh = async (q: string, s: 'hadith' | 'fiqh') => {
        if (!db) { setResults([]); return; }
        const collections = s === 'hadith'
            ? ['bukhari', 'muslim']
            : ['abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik'];
        const placeholders = collections.map(() => '?').join(', ');
        let mapped: HadithResult[] = [];
        try {
            const rows = await db.getAllAsync<any>(
                `SELECT h.collection_slug, h.hadith_number,
                        h.arabic_text, h.english_text, h.narrator_chain
                 FROM hadiths_fts fts
                 JOIN hadiths h ON h.id = fts.rowid
                 WHERE hadiths_fts MATCH ?
                   AND h.collection_slug IN (${placeholders})
                 ORDER BY rank
                 LIMIT 20`,
                [buildFtsParam(q), ...collections]
            );
            mapped = rows.map((r): HadithResult => ({
                type: s,
                collection: r.collection_slug ?? '',
                number: r.hadith_number ?? '',
                narrator: r.narrator_chain ?? '',
                arabic: r.arabic_text ?? '',
                english: r.english_text ?? '',
            }));
        } catch {
            try {
                const rows = await db.getAllAsync<any>(
                    `SELECT collection_slug, hadith_number,
                            arabic_text, english_text, narrator_chain
                     FROM hadiths
                     WHERE english_text LIKE ?
                       AND collection_slug IN (${placeholders})
                     LIMIT 20`,
                    [`%${q}%`, ...collections]
                );
                mapped = rows.map((r): HadithResult => ({
                    type: s,
                    collection: r.collection_slug ?? '',
                    number: r.hadith_number ?? '',
                    narrator: r.narrator_chain ?? '',
                    arabic: r.arabic_text ?? '',
                    english: r.english_text ?? '',
                }));
            } catch {
                setResults([]);
                return;
            }
        }

        // Fetch translations in selected language from Fawaz CDN
        const transMap = await fetchHadithTranslations(
            mapped.map(r => ({ collection: r.collection, number: r.number })),
            language
        );
        setResults(mapped.map(r => ({
            ...r,
            english: transMap[`${r.collection}:${r.number}`] || r.english,
        })));
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    const renderQuranCard = ({ item }: { item: QuranResult }) => (
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.cardTopRow}>
                <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                    <Text style={[styles.badgeText, { color: theme.accent }]}>{item.ref}</Text>
                </View>
                <Text style={[styles.surahName, { color: theme.textSecondary }]}>{item.surahName}</Text>
            </View>
            {!!item.arabic && (
                <Text style={[styles.arabicText, { color: theme.textPrimary }]}>{item.arabic}</Text>
            )}
            {!!item.english && (
                <Text style={[styles.englishText, { color: theme.textSecondary }]}>{item.english}</Text>
            )}
        </View>
    );

    const renderHadithCard = ({ item }: { item: HadithResult }) => (
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View style={styles.cardTopRow}>
                <View style={[styles.badge, {
                    backgroundColor: item.type === 'fiqh'
                        ? 'rgba(201,168,76,0.12)'
                        : theme.accentLight,
                }]}>
                    <Text style={[styles.badgeText, {
                        color: item.type === 'fiqh' ? theme.gold : theme.accent,
                    }]}>
                        {collectionLabel(item.collection)} · {item.number}
                    </Text>
                </View>
                {!!item.narrator && (
                    <Text style={[styles.narratorText, { color: theme.textSecondary }]} numberOfLines={1}>{item.narrator}</Text>
                )}
            </View>
            {!!item.arabic && (
                <Text style={[styles.arabicText, { color: theme.textPrimary }]}>{item.arabic}</Text>
            )}
            {!!item.arabic && !!item.english && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            {!!item.english && (
                <Text style={[styles.englishText, { color: theme.textSecondary }]} numberOfLines={6}>{item.english}</Text>
            )}
        </View>
    );

    const renderItem = useCallback(({ item }: { item: Result }) => {
        if (item.type === 'quran') return renderQuranCard({ item });
        return renderHadithCard({ item: item as HadithResult });
    }, []);

    const isEmpty = !loading && query.trim().length >= 2 && results.length === 0;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
                <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: theme.bgInput }]}>
                    <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={[styles.searchBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder={`Search ${SCOPE_LABELS[scope]}…`}
                        placeholderTextColor={theme.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {loading && (
                        <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 8 }} />
                    )}
                    {!loading && query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                            <Feather name="x" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Scope tabs */}
            <View style={[styles.tabs, { borderBottomColor: theme.border, backgroundColor: theme.bg }]}>
                {(['quran', 'hadith', 'fiqh'] as Scope[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.tab, { backgroundColor: theme.bgInput }, scope === s && [styles.tabActive, { backgroundColor: theme.accentLight, borderColor: theme.accentLight }]]}
                        onPress={() => setScope(s)}
                        activeOpacity={0.75}
                    >
                        <Feather
                            name={SCOPE_ICONS[s]}
                            size={14}
                            color={scope === s ? theme.accent : theme.textSecondary}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.tabText, { color: theme.textSecondary }, scope === s && [styles.tabTextActive, { color: theme.accent }]]}>
                            {SCOPE_LABELS[s]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Results */}
            {query.trim().length < 2 ? (
                <View style={styles.placeholder}>
                    <Feather name="search" size={48} color={theme.textTertiary} />
                    <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>Search Islamic Knowledge</Text>
                    <Text style={[styles.placeholderSub, { color: theme.textSecondary }]}>
                        {scope === 'quran'
                            ? 'Search Quranic verses by topic, keyword, or phrase'
                            : scope === 'hadith'
                            ? 'Search hadith collections by keyword or topic'
                            : 'Search Islamic rulings and jurisprudence'}
                    </Text>
                    <View style={styles.exampleChips}>
                        {(scope === 'quran'
                            ? ['patience', 'gratitude', 'forgiveness', 'mercy']
                            : scope === 'hadith'
                            ? ['prayer', 'fasting', 'honesty', 'charity']
                            : ['wudu', 'zakat conditions', 'prayer travel', 'halal']
                        ).map(ex => (
                            <TouchableOpacity
                                key={ex}
                                style={[styles.exampleChip, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                onPress={() => setQuery(ex)}
                            >
                                <Text style={[styles.exampleChipText, { color: theme.textPrimary }]}>{ex}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : isEmpty ? (
                <View style={styles.placeholder}>
                    {searchFailed ? (
                        <>
                            <Feather name="wifi-off" size={40} color={theme.textTertiary} />
                            <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>Search unavailable</Text>
                            <Text style={[styles.placeholderSub, { color: theme.textSecondary }]}>Check your connection and try again</Text>
                        </>
                    ) : (
                        <>
                            <Feather name="inbox" size={40} color={theme.textTertiary} />
                            <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>No results for "{query}"</Text>
                            <Text style={[styles.placeholderSub, { color: theme.textSecondary }]}>Try a shorter keyword or different phrase</Text>
                        </>
                    )}
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) =>
                        item.type === 'quran'
                            ? `q:${(item as QuranResult).ref}`
                            : `h:${(item as HadithResult).collection}:${(item as HadithResult).number}`
                    }
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        results.length > 0 ? (
                            <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                            </Text>
                        ) : null
                    }
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 46,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabActive: {},
    tabText: { fontSize: 13, fontWeight: '600' },
    tabTextActive: { fontWeight: '700' },

    // Placeholder
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 10,
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 8,
    },
    placeholderSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    exampleChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
    },
    exampleChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    exampleChipText: { fontSize: 13, fontWeight: '500' },

    // List
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60, gap: 12 },
    resultCount: { fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },

    // Cards
    card: {
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 10,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    surahName: { fontSize: 13, fontWeight: '500', flex: 1 },
    narratorText: { fontSize: 12, fontStyle: 'italic', flex: 1 },
    arabicText: {
        fontSize: 22,
        lineHeight: 38,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 12,
    },
    divider: { height: 1, marginVertical: 12 },
    englishText: { fontSize: 14, lineHeight: 22 },
});
