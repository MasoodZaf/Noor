import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import moment from 'moment-hijri';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Platform, KeyboardAvoidingView,
    FlatList, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

// ─── Fawaz Hadith API ─────────────────────────────────────────────────────────
import { FAWAZ_HADITH } from '../../../utils/apis';

// Translation editions per collection × language (mirrors hadith/[id].tsx)
const LANG_EDITIONS: Record<string, Record<string, string>> = {
    bukhari:  { english: 'eng-bukhari',  urdu: 'urd-bukhari',  indonesian: 'ind-bukhari',  french: 'fra-bukhari',  bengali: 'ben-bukhari',  turkish: 'tur-bukhari'  },
    muslim:   { english: 'eng-muslim',   urdu: 'urd-muslim',   indonesian: 'ind-muslim',   french: 'fra-muslim',   bengali: 'ben-muslim',   turkish: 'tur-muslim'   },
    tirmidhi: { english: 'eng-tirmidhi', urdu: 'urd-tirmidhi', indonesian: 'ind-tirmidhi', bengali: 'ben-tirmidhi', turkish: 'tur-tirmidhi' }, // No French Tirmidhi on CDN — falls back to English
    abudawud: { english: 'eng-abudawud', urdu: 'urd-abudawud', indonesian: 'ind-abudawud', french: 'fra-abudawud', bengali: 'ben-abudawud', turkish: 'tur-abudawud' },
    nasai:    { english: 'eng-nasai',    urdu: 'urd-nasai',    indonesian: 'ind-nasai',    french: 'fra-nasai',    bengali: 'ben-nasai',    turkish: 'tur-nasai'    },
    ibnmajah: { english: 'eng-ibnmajah', urdu: 'urd-ibnmajah', indonesian: 'ind-ibnmajah', french: 'fra-ibnmajah', bengali: 'ben-ibnmajah', turkish: 'tur-ibnmajah' },
    malik:    { english: 'eng-malik',    urdu: 'urd-malik',    indonesian: 'ind-malik',    french: 'fra-malik',    bengali: 'ben-malik',    turkish: 'tur-malik'    },
};

// Fetch translations for a list of hadith in the selected language.
// Uses individual Fawaz CDN files in parallel (jsdelivr CDN — fast & cached).
// Falls back gracefully: missing edition → English text already in result.
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
            const t = setTimeout(() => ctl.abort(), 5000);
            const res = await fetch(
                `${FAWAZ_HADITH}/editions/${edition}/${number}.json`,
                { signal: ctl.signal }
            ).finally(() => clearTimeout(t));
            if (!res.ok) return { key: `${slug}:${number}`, text: '' };
            const json = await res.json();
            // Fawaz individual file: { hadithnumber, text, arabic } or { hadiths: [...] }
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

// Maps app language → SQLite ayahs column for translation
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

// Maps app language → Qurani.ai API language code
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

// ─── Search types ─────────────────────────────────────────────────────────────
type Scope = 'quran' | 'hadith' | 'fiqh';

interface QuranResult  { type: 'quran';  ref: string; surahName: string; arabic: string; english: string; }
interface HadithResult { type: 'hadith' | 'fiqh'; collection: string; number: string | number; narrator: string; arabic: string; english: string; }
type Result = QuranResult | HadithResult;

const QURANI_BASE = 'https://api.qurani.ai/gw/qh/v1';

const SCOPE_CONFIG: { id: Scope; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { id: 'quran',  label: 'Quran',  icon: 'book-open' },
    { id: 'hadith', label: 'Hadith', icon: 'feather'   },
    { id: 'fiqh',   label: 'Fiqh',   icon: 'layers'    },
];

const EXAMPLE_QUERIES: Record<Scope, string[]> = {
    quran:  ['patience', 'gratitude', 'mercy', 'forgiveness'],
    hadith: ['prayer', 'fasting', 'honesty', 'charity'],
    fiqh:   ['wudu', 'prayer travel', 'zakat', 'halal food'],
};

function buildFtsParam(q: string): string {
    return q.replace(/['"*^()[\]{}|!]/g, ' ').trim()
        .split(/\s+/).filter(Boolean).map(w => `"${w}"*`).join(' ');
}

function collectionLabel(slug: string): string {
    const MAP: Record<string, string> = {
        bukhari: 'Bukhari', muslim: 'Muslim', tirmidhi: 'Tirmidhi',
        abudawud: 'Abu Dawud', nasai: "Nasa'i", ibnmajah: 'Ibn Majah',
        malik: 'Malik', riyadussaliheen: 'Riyad us-Saliheen',
    };
    return MAP[slug?.toLowerCase()] ?? slug?.toUpperCase() ?? 'Hadith';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    // Hijri month 9 (0-indexed = 8) is Ramadan
    const isRamadan = useMemo(() => moment().iMonth() === 8, []);
    const { db } = useDatabase();
    const { language } = useLanguage();

    // Back chevron: pop the stack if possible, otherwise fall back to Home tab
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    };
    const { theme } = useTheme();
    const inputRef = useRef<TextInput>(null);

    const [scope,   setScope]   = useState<Scope>('quran');
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);

    const isSearching = query.trim().length >= 2;

    // ── Re-run when scope changes with active query ───────────────────────────
    useEffect(() => {
        if (isSearching) runSearch(query, scope);
        else setResults([]);
    }, [scope]);

    // ── Debounced search on query change ──────────────────────────────────────
    useEffect(() => {
        if (!isSearching) { setResults([]); return; }
        const t = setTimeout(() => runSearch(query, scope), 400);
        return () => clearTimeout(t);
    }, [query]);

    const runSearch = async (q: string, s: Scope) => {
        setLoading(true);
        try {
            if (s === 'quran') await searchQuran(q, language);
            else await searchHadith(q, s as 'hadith' | 'fiqh');
        } finally {
            setLoading(false);
        }
    };

    const searchQuran = async (q: string, lang: Language) => {
        const col = translationCol(lang);
        const apiLang = quranApiLang(lang);

        // Online: Qurani.ai — returns Arabic text; supplement with SQLite for translation
        if (db) {
            try {
                const ctl2 = new AbortController();
                const t2 = setTimeout(() => ctl2.abort(), 6000);
                const res = await fetch(
                    `${QURANI_BASE}/search/${encodeURIComponent(q)}?language=${apiLang}&limit=15&exactSearch=false`,
                    { signal: ctl2.signal }
                ).finally(() => clearTimeout(t2));
                const json = await res.json();
                if (json.code === 200 && json.data?.ayahs?.length) {
                    const ayahs: any[] = json.data.ayahs;
                    // Validate refs are integers in Quran bounds before splicing into SQL
                    const validatedRefs = ayahs
                        .filter((a: any) =>
                            Number.isInteger(a.surah?.number) && a.surah.number >= 1 && a.surah.number <= 114 &&
                            Number.isInteger(a.numberInSurah) && a.numberInSurah >= 1
                        )
                        .map((a: any) => `(${a.surah.number},${a.numberInSurah})`);
                    if (validatedRefs.length === 0) { setResults([]); return; }
                    const refs = validatedRefs.join(',');
                    type TransRow = { surah_number: number; ayah_number: number; translation: string };
                    const transRows: TransRow[] = await db.getAllAsync<TransRow>(
                        `SELECT surah_number, ayah_number, ${col} AS translation
                         FROM ayahs
                         WHERE (surah_number, ayah_number) IN (VALUES ${refs})`
                    ).catch(() => []);
                    const transMap: Record<string, string> = {};
                    for (const r of transRows) {
                        transMap[`${r.surah_number}:${r.ayah_number}`] = r.translation ?? '';
                    }
                    setResults(ayahs
                        .filter((a: any) =>
                            Number.isInteger(a.surah?.number) && a.surah.number >= 1 && a.surah.number <= 114 &&
                            Number.isInteger(a.numberInSurah) && a.numberInSurah >= 1
                        )
                        .map((a: any): QuranResult => ({
                            type: 'quran',
                            ref: `${a.surah.number}:${a.numberInSurah}`,
                            surahName: a.surah?.englishName ?? '',
                            arabic: a.text ?? '',
                            english: transMap[`${a.surah.number}:${a.numberInSurah}`]
                                || a.translation
                                || '',
                        })));
                    return;
                }
            } catch { /* fall through to offline */ }
        }

        // Offline: SQLite LIKE search on English (users type in Latin script)
        // Display translation in the selected language column
        if (!db) { setResults([]); return; }
        try {
            const rows = await db.getAllAsync<any>(
                `SELECT a.surah_number, a.ayah_number, a.text_arabic,
                        a.text_english, a.${col} AS translation,
                        s.name_english AS surah_en
                 FROM ayahs a JOIN surahs s ON a.surah_number = s.number
                 WHERE a.text_english LIKE ? LIMIT 20`,
                [`%${q}%`]
            );
            setResults(rows.map((r): QuranResult => ({
                type: 'quran',
                ref: `${r.surah_number}:${r.ayah_number}`,
                surahName: r.surah_en ?? '',
                arabic: r.text_arabic ?? '',
                english: r.translation || r.text_english || '',
            })));
        } catch { setResults([]); }
    };

    const searchHadith = async (q: string, s: 'hadith' | 'fiqh') => {
        if (!db) { setResults([]); return; }

        // Hadith  → Sahih collections (Bukhari, Muslim): authentic narrations
        // Fiqh    → Sunan collections (Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik)
        const collections = s === 'hadith'
            ? ['bukhari', 'muslim']
            : ['abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik'];
        const placeholders = collections.map(() => '?').join(', ');

        let mapped: HadithResult[] = [];
        try {
            const rows = await db.getAllAsync<any>(
                `SELECT h.collection_slug, h.hadith_number, h.arabic_text, h.english_text, h.narrator_chain
                 FROM hadiths_fts fts JOIN hadiths h ON h.id = fts.rowid
                 WHERE hadiths_fts MATCH ?
                   AND h.collection_slug IN (${placeholders})
                 ORDER BY rank LIMIT 20`,
                [buildFtsParam(q), ...collections]
            );
            mapped = rows.map((r): HadithResult => ({
                type: s, collection: r.collection_slug ?? '', number: r.hadith_number ?? '',
                narrator: r.narrator_chain ?? '', arabic: r.arabic_text ?? '', english: r.english_text ?? '',
            }));
        } catch {
            try {
                const rows = await db.getAllAsync<any>(
                    `SELECT collection_slug, hadith_number, arabic_text, english_text, narrator_chain
                     FROM hadiths
                     WHERE english_text LIKE ?
                       AND collection_slug IN (${placeholders})
                     LIMIT 20`,
                    [`%${q}%`, ...collections]
                );
                mapped = rows.map((r): HadithResult => ({
                    type: s, collection: r.collection_slug ?? '', number: r.hadith_number ?? '',
                    narrator: r.narrator_chain ?? '', arabic: r.arabic_text ?? '', english: r.english_text ?? '',
                }));
            } catch { setResults([]); return; }
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

    // ── Result card renderers ─────────────────────────────────────────────────
    const renderResult = useCallback(({ item, index }: { item: Result; index: number }) => {
        if (item.type === 'quran') {
            return (
                <View style={[styles.resultCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={styles.resultCardTop}>
                        <View style={[styles.resultBadge, { backgroundColor: theme.accentLight }]}>
                            <Text style={[styles.resultBadgeText, { color: theme.accent }]}>{item.ref}</Text>
                        </View>
                        <Text style={[styles.resultMeta, { color: theme.textSecondary }]}>{item.surahName}</Text>
                    </View>
                    {!!item.arabic && <Text style={[styles.resultArabic, { color: theme.textPrimary }]}>{item.arabic}</Text>}
                    {!!item.english && <Text style={[styles.resultEnglish, { color: theme.textSecondary }]} numberOfLines={4}>{item.english}</Text>}
                </View>
            );
        }
        const h = item as HadithResult;
        const badgeColor = h.type === 'fiqh' ? 'rgba(201,168,76,0.12)' : 'rgba(59,130,246,0.1)';
        const textColor  = h.type === 'fiqh' ? theme.gold : '#3b82f6';
        return (
            <View style={[styles.resultCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <View style={styles.resultCardTop}>
                    <View style={[styles.resultBadge, { backgroundColor: badgeColor }]}>
                        <Text style={[styles.resultBadgeText, { color: textColor }]}>
                            {collectionLabel(h.collection)} · {h.number}
                        </Text>
                    </View>
                    {!!h.narrator && <Text style={[styles.resultMeta, { color: theme.textSecondary }]} numberOfLines={1}>{h.narrator}</Text>}
                </View>
                {!!h.arabic && <Text style={[styles.resultArabic, { color: theme.textPrimary }]}>{h.arabic}</Text>}
                {!!h.arabic && !!h.english && <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />}
                {!!h.english && <Text style={[styles.resultEnglish, { color: theme.textSecondary }]} numberOfLines={6}>{h.english}</Text>}
            </View>
        );
    }, [theme]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* ── Sticky header + search ─────────────────────────────────── */}
            <View style={[styles.stickyTop, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
                {/* Title row */}
                <View style={styles.titleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity
                            onPress={goBack}
                            hitSlop={10}
                            style={{ marginLeft: -6, marginRight: 6, paddingVertical: 4 }}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={[styles.titleText, { color: theme.textPrimary }]}>Explore Deen</Text>
                            <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>Search or browse tools</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.aiDeenBtn}
                        onPress={() => router.push('/search' as any)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Open AiDeen Islamic search"
                    >
                        <LinearGradient
                            colors={['#11d452', '#0a9a3b']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.aiDeenGrad}
                        >
                            <Feather name="message-circle" size={16} color="#fff" />
                            <Text style={styles.aiDeenLabel}>AiDeen</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Search bar */}
                <View style={[styles.searchCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="search" size={20} color={isSearching ? theme.textPrimary : theme.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search Quran, Hadith & Fiqh…"
                        placeholderTextColor={theme.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={() => { if (isSearching) runSearch(query, scope); }}
                    />
                    {loading && <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 8 }} />}
                    {!loading && query.length > 0 && (
                        <TouchableOpacity
                            onPress={() => { setQuery(''); setResults([]); Keyboard.dismiss(); }}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Feather name="x" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Scope pills */}
                <View style={styles.scopeRow}>
                    {SCOPE_CONFIG.map(s => (
                        <TouchableOpacity
                            key={s.id}
                            style={[styles.scopePill, { backgroundColor: theme.bgInput }, scope === s.id && { backgroundColor: theme.textPrimary }]}
                            onPress={() => setScope(s.id)}
                            activeOpacity={0.75}
                            accessibilityRole="tab"
                            accessibilityLabel={`Filter by ${s.label}`}
                            accessibilityState={{ selected: scope === s.id }}
                        >
                            <Feather
                                name={s.icon}
                                size={13}
                                color={scope === s.id ? theme.bg : theme.textSecondary}
                                style={{ marginRight: 5 }}
                            />
                            <Text style={[styles.scopePillText, { color: scope === s.id ? theme.bg : theme.textSecondary }, scope === s.id && { fontWeight: '700' }]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* ── Content area ───────────────────────────────────────────── */}
            {isSearching ? (
                /* Search results */
                results.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={40} color={theme.textTertiary} />
                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No results for "{query}"</Text>
                        <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Try a shorter keyword or different phrase</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={renderResult}
                        contentContainerStyle={styles.resultsList}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            results.length > 0 ? (
                                <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                                    {results.length} result{results.length !== 1 ? 's' : ''} · {scope}
                                </Text>
                            ) : null
                        }
                    />
                )
            ) : (
                /* Default tools view */
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.toolsContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Example queries */}
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Try searching</Text>
                    <View style={styles.exampleChips}>
                        {EXAMPLE_QUERIES[scope].map(ex => (
                            <TouchableOpacity
                                key={ex}
                                style={[styles.exampleChip, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                onPress={() => { setQuery(ex); inputRef.current?.focus(); }}
                                activeOpacity={0.75}
                                accessibilityRole="button"
                                accessibilityLabel={`Search for ${ex}`}
                            >
                                <Feather name="search" size={12} color={theme.textSecondary} style={{ marginRight: 5 }} />
                                <Text style={[styles.exampleChipText, { color: theme.textPrimary }]}>{ex}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Daily Tools */}
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Daily Tools</Text>

                    <View style={styles.gridRow}>
                        <TouchableOpacity style={[styles.gridTile, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.push('/discover/halal' as any)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Halal places: find food and mosques near you">
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#fee2e2' }]}>
                                    <Feather name="map-pin" size={22} color="#ef4444" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>Halal Places</Text>
                                <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>Find food & mosques near you</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.gridTile, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.push('/discover/live' as any)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Makkah Live: holy streams">
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#dbeafe' }]}>
                                    <Feather name="video" size={22} color="#3b82f6" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>Makkah Live</Text>
                                <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>Holy streams active 24/7</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.gridRow}>
                        <TouchableOpacity style={[styles.gridTile, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.push('/discover/ramadan' as any)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={isRamadan ? 'Ramadan: sehri, iftar and fast tracker' : 'Fasting: track your fasts and prayer times'}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#fef9c3' }]}>
                                    <Feather name="moon" size={22} color="#eab308" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>{isRamadan ? 'Ramadan' : 'Fasting'}</Text>
                                <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>{isRamadan ? 'Sehri, Iftar & fast tracker' : 'Track your fasts & prayer times'}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.gridTile, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => router.push('/discover/recitation' as any)} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Recitation: AI tajweed correction">
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#dcfce7' }]}>
                                    <Feather name="mic" size={22} color="#22c55e" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>Recitation</Text>
                                <Text style={[styles.gridSubtitle, { color: theme.textSecondary }]}>AI tajweed correction</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Islamic Library tile — hidden until content is ready */}
                </ScrollView>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Sticky top ────────────────────────────────────────────────────────────
    stickyTop: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    titleText: { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.5 },
    subtitleText: { fontSize: 13, marginTop: 2 },

    // AiDeen compact button
    aiDeenBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#11d452',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    aiDeenGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        gap: 6,
    },
    aiDeenLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Search bar
    searchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 16 },

    // Scope pills
    scopeRow: { flexDirection: 'row', gap: 8 },
    scopePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    scopePillText: { fontSize: 13, fontWeight: '600' },

    // ── Search results ────────────────────────────────────────────────────────
    resultsList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60, gap: 12 },
    resultCount: { fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3, textTransform: 'capitalize' },
    resultCard: {
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    resultCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    resultBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    resultMeta: { fontSize: 12, flex: 1 },
    resultArabic: {
        fontSize: 22, lineHeight: 38, textAlign: 'right', marginBottom: 10,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        includeFontPadding: false,
    },
    resultDivider: { height: 1, marginVertical: 10 },
    resultEnglish: { fontSize: 14, lineHeight: 22 },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 8 },
    emptySub: { fontSize: 14, textAlign: 'center' },

    // ── Tools view ────────────────────────────────────────────────────────────
    toolsContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    exampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    exampleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    exampleChipText: { fontSize: 13 },

    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, paddingLeft: 2 },

    gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 14 },
    gridTile: {
        flex: 1, borderRadius: 22, padding: 18,
        borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { marginBottom: 16 },
    gridIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    gridTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    gridSubtitle: { fontSize: 12, lineHeight: 17 },

    horizontalTile: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 18, padding: 16, marginTop: 8,
        borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5,
    },
    horizontalIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    horizontalTextContent: { flex: 1 },
    horizontalTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    horizontalSubtitle: { fontSize: 12 },
});
