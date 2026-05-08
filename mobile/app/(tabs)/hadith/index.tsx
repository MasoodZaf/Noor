import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Easing, Share, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../../../context/DatabaseContext';
import { useTheme, fonts } from '../../../context/ThemeContext';

const BOOKMARKS_KEY = '@hadith_bookmarks';
// expo-speech-recognition requires a native build — not available in Expo Go
// Guard it so the app doesn't crash when running without a custom dev client
let ExpoSpeechRecognitionModule: {
    abort(): void;
    requestPermissionsAsync(): Promise<{ granted: boolean }>;
    start(opts: object): void;
} = {
    abort: () => {},
    requestPermissionsAsync: async () => ({ granted: false }),
    start: () => {},
};
let useSpeechRecognitionEvent: (event: string, cb: (e?: any) => void) => void = () => {};
let speechAvailable = false;
try {
    const mod = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
    speechAvailable = true;
} catch {
    // Running in Expo Go — voice search disabled
}

// CARD_WIDTH computed inside component via useWindowDimensions (see HadithScreen)

const COLLECTIONS = [
    {
        id: 'bukhari',
        title: 'Sahih al-Bukhari',
        arabic: 'صحيح البخاري',
        count: 7563, books: 97,
        badge: 'Sahih',
        gradient: ['#0A3D1F', '#0E5228', '#0A3D1F'] as const,
        accent: '#4ade80',
    },
    {
        id: 'muslim',
        title: 'Sahih Muslim',
        arabic: 'صحيح مسلم',
        count: 3033, books: 57,
        badge: 'Sahih',
        gradient: ['#0A1628', '#0E2444', '#0A1628'] as const,
        accent: '#93c5fd',
    },
    {
        id: 'tirmidhi',
        title: 'Jami at-Tirmidhi',
        arabic: 'جامع الترمذي',
        count: 3956, books: 50,
        badge: "Jami'",
        gradient: ['#3B0A14', '#5C1520', '#3B0A14'] as const,
        accent: '#fca5a5',
    },
    {
        id: 'abudawud',
        title: 'Sunan Abu Dawud',
        arabic: 'سنن أبي داود',
        count: 5274, books: 43,
        badge: 'Sunan',
        gradient: ['#1C1306', '#2E1F08', '#1C1306'] as const,
        accent: '#fcd34d',
    },
];

export default function HadithScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const CARD_WIDTH = (width - 48 - 12) / 2;

    // Back chevron: pop the stack if possible, otherwise fall back to Home tab
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [showBookmarks, setShowBookmarks] = useState(false);

    // Load bookmarks on mount
    useEffect(() => {
        let mounted = true;
        AsyncStorage.getItem(BOOKMARKS_KEY).then(stored => {
            if (!mounted || !stored) return;
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Validate each entry has the minimum required fields before trusting it
                    const valid = parsed.filter(
                        (b: any) => b && typeof b === 'object' &&
                            typeof b.book_slug === 'string' && b.book_slug.length > 0 &&
                            (typeof b.hadith_number === 'number' || typeof b.hadith_number === 'string')
                    );
                    setBookmarks(valid);
                }
            } catch {
                // Corrupted storage — reset to empty
                AsyncStorage.removeItem(BOOKMARKS_KEY).catch(() => {});
            }
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);

    const shareHadith = async (hadith: any) => {
        try {
            const lines = [
                hadith.text_arabic || '',
                '',
                hadith.text_english || '',
                '',
                `— ${hadith.book_slug?.toUpperCase()} ${hadith.hadith_number}`,
            ].filter((l, i) => i !== 1 || hadith.text_arabic);
            await Share.share({ message: lines.join('\n').trim() });
        } catch (_) {}
    };

    const isBookmarked = (hadith: any) =>
        bookmarks.some(b => b.book_slug === hadith.book_slug && b.hadith_number === hadith.hadith_number);

    const toggleBookmark = async (hadith: any) => {
        const already = isBookmarked(hadith);
        const updated = already
            ? bookmarks.filter(b => !(b.book_slug === hadith.book_slug && b.hadith_number === hadith.hadith_number))
            : [...bookmarks, hadith];
        setBookmarks(updated);
        await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated)).catch(() => {});
    };

    // Mount guard — prevents setState after unmount (voice recognition events fire asynchronously)
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    // Pulse animation for mic button while listening
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

    const startPulse = () => {
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        );
        pulseLoop.current.start();
    };

    const stopPulse = () => {
        pulseLoop.current?.stop();
        pulseAnim.setValue(1);
    };

    // Stop animation on unmount to prevent memory leak
    useEffect(() => () => { pulseLoop.current?.stop(); }, []);

    // Voice recognition event handlers — all guarded with mountedRef to prevent
    // setState calls after the component has unmounted (events fire asynchronously)
    useSpeechRecognitionEvent('start', () => {
        if (!mountedRef.current) return;
        setIsListening(true);
        setVoiceError('');
        startPulse();
    });

    useSpeechRecognitionEvent('end', () => {
        if (!mountedRef.current) return;
        setIsListening(false);
        stopPulse();
    });

    useSpeechRecognitionEvent('result', (event) => {
        if (!mountedRef.current) return;
        const transcript = event.results[0]?.transcript ?? '';
        if (transcript) setSearchQuery(transcript);
    });

    useSpeechRecognitionEvent('error', (event) => {
        if (!mountedRef.current) return;
        setIsListening(false);
        stopPulse();
        if (event.error !== 'aborted') {
            setVoiceError(event.message || 'Voice input failed. Please try again.');
        }
    });

    const toggleVoiceSearch = async () => {
        if (isListening) {
            ExpoSpeechRecognitionModule.abort();
            return;
        }
        setVoiceError('');
        setSearchQuery('');
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            setVoiceError('Microphone permission denied.');
            return;
        }
        ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            maxAlternatives: 1,
            continuous: false,
        });
    };

    useEffect(() => {
        if (!db || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                // FTS5 prefix search — sanitise query, strip special FTS chars
                const clean = searchQuery.replace(/['"*^()[\]{}|!]/g, ' ').trim();
                const ftsParam = clean.split(/\s+/).filter(Boolean).map(w => `"${w}"*`).join(' ');

                const results = await db?.getAllAsync(
                    `SELECT
                        h.collection_slug as book_slug,
                        h.hadith_number,
                        h.arabic_text as text_arabic,
                        h.english_text as text_english,
                        h.narrator_chain as narrator
                    FROM hadiths_fts fts
                    JOIN hadiths h ON h.id = fts.rowid
                    WHERE hadiths_fts MATCH ?
                    ORDER BY rank
                    LIMIT 30`,
                    [ftsParam]
                );

                setSearchResults(results as any[]);
            } catch (error) {
                // Fallback: LIKE search across english text + narrator
                try {
                    const fallback = await db?.getAllAsync(
                        `SELECT
                            collection_slug as book_slug,
                            hadith_number,
                            arabic_text as text_arabic,
                            english_text as text_english,
                            narrator_chain as narrator
                        FROM hadiths
                        WHERE english_text LIKE ? OR narrator_chain LIKE ?
                        LIMIT 30`,
                        [`%${searchQuery}%`, `%${searchQuery}%`]
                    );
                    setSearchResults(fallback as any[]);
                } catch { }
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, db]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.headerBack}
                        onPress={goBack}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Hadith Library</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.headerAction, { backgroundColor: theme.bgInput }]}
                        onPress={() => router.push('/search?scope=hadith' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Search hadiths"
                    >
                        <Feather name="search" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerAction, { backgroundColor: showBookmarks ? theme.accent : theme.bgInput }]}
                        onPress={() => { setShowBookmarks(v => !v); setSearchQuery(''); }}
                        accessibilityRole="button"
                        accessibilityLabel={showBookmarks ? 'Show all hadiths' : `View bookmarks${bookmarks.length > 0 ? `, ${bookmarks.length} saved` : ''}`}
                        accessibilityState={{ selected: showBookmarks }}
                    >
                        <Feather name="bookmark" size={22} color={showBookmarks ? '#fff' : theme.textPrimary} />
                        {bookmarks.length > 0 && !showBookmarks && (
                            <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                alwaysBounceVertical={true}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchInputWrapper, { backgroundColor: theme.bgCard, borderColor: theme.border }, isListening && styles.searchInputListening]}>
                        <Feather
                            name={isListening ? 'mic' : 'search'}
                            size={20}
                            color={isListening ? '#ef4444' : searchQuery ? theme.accent : theme.textSecondary}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={[styles.searchInput, { color: theme.textPrimary }]}
                            placeholder={isListening ? 'Listening...' : 'Search hadiths by keyword...'}
                            placeholderTextColor={isListening ? '#ef4444' : theme.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            editable={!isListening}
                        />
                        {searchQuery.length > 0 && !isListening && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                style={{ marginRight: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Clear search"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="x-circle" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                        {/* Mic button — only shown when native speech module is available */}
                        {speechAvailable && (
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    style={[styles.micBtn, { backgroundColor: theme.bgSecondary }, isListening && styles.micBtnActive]}
                                    onPress={toggleVoiceSearch}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={isListening ? 'Stop voice search' : 'Start voice search'}
                                >
                                    <Feather name={isListening ? 'mic-off' : 'mic'} size={16} color={isListening ? '#FFFFFF' : theme.textSecondary} />
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                    {/* Voice error message */}
                    {voiceError.length > 0 && (
                        <Text style={styles.voiceError}>{voiceError}</Text>
                    )}
                    {/* Listening hint */}
                    {isListening && (
                        <View style={styles.listeningHint}>
                            <View style={styles.listeningDot} />
                            <View style={styles.listeningDot} />
                            <View style={styles.listeningDot} />
                            <Text style={styles.listeningHintText}>Speak now — tap mic to stop</Text>
                        </View>
                    )}
                </View>

                {/* Bookmarks view */}
                {showBookmarks ? (
                    <View style={styles.resultsSection}>
                        {bookmarks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="bookmark" size={40} color={theme.textTertiary} />
                                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No bookmarks yet</Text>
                                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Tap the bookmark icon on any hadith to save it here</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.resultCount, { color: theme.textSecondary }]}>{bookmarks.length} saved hadith{bookmarks.length !== 1 ? 's' : ''}</Text>
                                {bookmarks.map((hadith) => (
                                    <View key={`${hadith.book_slug}-${hadith.hadith_number}`} style={[styles.hadithCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={styles.hadithHeader}>
                                            <Text style={[styles.hadithBookTag, { color: theme.accent, backgroundColor: theme.accentLight }]}>
                                                {hadith.book_slug?.toUpperCase()} · {hadith.hadith_number}
                                            </Text>
                                            <Text style={[styles.narratorTag, { color: theme.textSecondary }]} numberOfLines={1}>{hadith.narrator}</Text>
                                        </View>
                                        <Text style={[styles.arabicText, { color: theme.textPrimary }]}>{hadith.text_arabic}</Text>
                                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                        <Text style={[styles.englishText, { color: theme.textSecondary }]}>{hadith.text_english}</Text>
                                        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: theme.bgInput }]}
                                                onPress={() => toggleBookmark(hadith)}
                                                accessibilityRole="button"
                                                accessibilityLabel="Remove bookmark"
                                            >
                                                <Feather name="bookmark" size={18} color={theme.accent} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                ) : searchQuery.length > 0 ? (
                    <View style={styles.resultsSection}>
                        {isSearching ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={theme.accent} />
                                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Searching...</Text>
                            </View>
                        ) : searchResults.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="search" size={40} color={theme.textTertiary} />
                                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No results found</Text>
                                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Try different keywords or a shorter phrase</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.resultCount, { color: theme.textSecondary }]}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>
                                {searchResults.map((hadith) => (
                                    <View key={`${hadith.book_slug}-${hadith.hadith_number}`} style={[styles.hadithCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={styles.hadithHeader}>
                                            <Text style={[styles.hadithBookTag, { color: theme.accent, backgroundColor: theme.accentLight }]}>
                                                {hadith.book_slug.toUpperCase()} · {hadith.hadith_number}
                                            </Text>
                                            <Text style={[styles.narratorTag, { color: theme.textSecondary }]} numberOfLines={1}>{hadith.narrator}</Text>
                                        </View>
                                        <Text style={[styles.arabicText, { color: theme.textPrimary }]}>{hadith.text_arabic}</Text>
                                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                                        <Text style={[styles.englishText, { color: theme.textSecondary }]}>{hadith.text_english}</Text>
                                        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: theme.bgInput }]}
                                                onPress={() => shareHadith(hadith)}
                                                accessibilityRole="button"
                                                accessibilityLabel="Share hadith"
                                            >
                                                <Feather name="share-2" size={18} color={theme.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: isBookmarked(hadith) ? theme.accentLight : theme.bgInput }]}
                                                onPress={() => toggleBookmark(hadith)}
                                                accessibilityRole="button"
                                                accessibilityLabel={isBookmarked(hadith) ? 'Remove bookmark' : 'Bookmark hadith'}
                                                accessibilityState={{ selected: isBookmarked(hadith) }}
                                            >
                                                <Feather name="bookmark" size={18} color={isBookmarked(hadith) ? theme.accent : theme.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Core Collections</Text>

                        <View style={styles.collectionsGrid}>
                            {COLLECTIONS.map(col => (
                                <TouchableOpacity
                                    key={col.id}
                                    // width/height are applied here (not in StyleSheet) because CARD_WIDTH
                                    // is derived from useWindowDimensions inside the component — referencing
                                    // it from module-level StyleSheet.create crashes under Hermes on Android.
                                    style={[styles.collectionGridItem, { width: CARD_WIDTH, height: CARD_WIDTH * 1.35 }]}
                                    activeOpacity={0.85}
                                    onPress={() => router.push(`/hadith/${col.id}` as any)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${col.title}, ${col.count.toLocaleString()} hadiths`}
                                >
                                    <LinearGradient colors={col.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.categoryCard}>
                                        {/* Background geometric decoration — large Rub el Hizb star */}
                                        <Text style={styles.bgStarDecor}>۞</Text>
                                        {/* Subtle inner frame */}
                                        <View style={[styles.innerFrame, { borderColor: col.accent + '25' }]} />

                                        {/* Badge */}
                                        <View style={[styles.collectionBadge, { backgroundColor: col.accent + '22', borderColor: col.accent + '55' }]}>
                                            <Text style={[styles.collectionBadgeText, { color: col.accent }]}>{col.badge}</Text>
                                        </View>

                                        {/* Arabic calligraphy name */}
                                        <View style={styles.arabicNameArea}>
                                            <Text style={styles.arabicCollectionName}>{col.arabic}</Text>
                                        </View>

                                        {/* Bottom info */}
                                        <View style={styles.cardBottom}>
                                            <View style={[styles.accentLine, { backgroundColor: col.accent }]} />
                                            <Text style={styles.gridListTitle} numberOfLines={2}>{col.title}</Text>
                                            <Text style={[styles.gridListCount, { color: col.accent }]}>
                                                {col.count.toLocaleString()} Hadiths
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Source Banner */}
                        <TouchableOpacity
                            style={[styles.premiumBanner, { backgroundColor: theme.accent }]}
                            accessibilityRole="button"
                            accessibilityLabel="Live Fawaz Hadith API: full collections with grades and 6 languages"
                        >
                            <View style={styles.bannerIcon}>
                                <Feather name="wifi" size={24} color={theme.textInverse} />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={[styles.bannerTitle, { color: theme.textInverse }]}>Live · Fawaz Hadith API</Text>
                                <Text style={[styles.bannerSubtitle, { color: theme.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                                    Full collections with grades & 6 languages. Offline vault as fallback.
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingHorizontal: 24,
        paddingTop: 10,
        marginBottom: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerBack: { marginLeft: -6, marginRight: 6, paddingVertical: 4 },
    headerTitle: {
        fontSize: 30,
        fontFamily: fonts.serif,
        letterSpacing: -0.3,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 200,
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1.5,
    },
    searchInputListening: {
        borderColor: '#ef4444',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
    },
    micBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micBtnActive: {
        backgroundColor: '#ef4444',
    },
    voiceError: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    listeningHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
    },
    listeningDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        opacity: 0.8,
    },
    listeningHintText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    resultCount: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    collectionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    collectionGridItem: {
        // width/height applied inline where used — depend on runtime CARD_WIDTH
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    categoryCard: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        padding: 14,
        justifyContent: 'space-between',
    },
    bgStarDecor: {
        position: 'absolute',
        fontSize: 160,
        color: 'rgba(255,255,255,0.05)',
        bottom: -20,
        right: -20,
        lineHeight: 160,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        includeFontPadding: false,
    },
    innerFrame: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    collectionBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    collectionBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    arabicNameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    arabicCollectionName: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 26,
        textAlign: 'center',
        lineHeight: 44,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        includeFontPadding: false,
    },
    cardBottom: {
        gap: 4,
    },
    accentLine: {
        height: 1.5,
        borderRadius: 1,
        width: 32,
        marginBottom: 6,
        opacity: 0.8,
    },
    gridListTitle: {
        color: 'rgba(255,255,255,0.95)',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    gridListCount: {
        fontSize: 11,
        fontWeight: '600',
    },
    premiumBanner: {
        marginHorizontal: 24,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    bannerSubtitle: {
        fontSize: 13,
    },
    resultsSection: {
        paddingHorizontal: 24,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    noResultsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    hadithCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
    },
    hadithHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    hadithBookTag: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    narratorTag: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    arabicText: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 40,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        includeFontPadding: false,
    },
    divider: {
        height: 1,
        marginVertical: 20,
    },
    englishText: {
        fontSize: 15,
        lineHeight: 24,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 12,
    }
});
