import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../../context/DatabaseContext';
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

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

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceError, setVoiceError] = useState('');

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

    // Voice recognition event handlers
    useSpeechRecognitionEvent('start', () => {
        setIsListening(true);
        setVoiceError('');
        startPulse();
    });

    useSpeechRecognitionEvent('end', () => {
        setIsListening(false);
        stopPulse();
    });

    useSpeechRecognitionEvent('result', (event) => {
        const transcript = event.results[0]?.transcript ?? '';
        if (transcript) setSearchQuery(transcript);
    });

    useSpeechRecognitionEvent('error', (event) => {
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
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Hadith Library</Text>
                <TouchableOpacity style={styles.headerAction}>
                    <Feather name="bookmark" size={24} color="#1A1A1A" />
                </TouchableOpacity>
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
                    <View style={[styles.searchInputWrapper, isListening && styles.searchInputListening]}>
                        <Feather
                            name={isListening ? 'mic' : 'search'}
                            size={20}
                            color={isListening ? '#ef4444' : searchQuery ? '#11d452' : '#8A8A8A'}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={isListening ? 'Listening...' : 'Search hadiths by keyword...'}
                            placeholderTextColor={isListening ? '#ef4444' : '#8A8A8A'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            editable={!isListening}
                        />
                        {searchQuery.length > 0 && !isListening && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
                                <Feather name="x-circle" size={18} color="#8A8A8A" />
                            </TouchableOpacity>
                        )}
                        {/* Mic button — only shown when native speech module is available */}
                        {speechAvailable && (
                            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                <TouchableOpacity
                                    style={[styles.micBtn, isListening && styles.micBtnActive]}
                                    onPress={toggleVoiceSearch}
                                    activeOpacity={0.7}
                                >
                                    <Feather name={isListening ? 'mic-off' : 'mic'} size={16} color={isListening ? '#FFFFFF' : '#5A5A5A'} />
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

                {/* Display Results OR Collections */}
                {searchQuery.length > 0 ? (
                    <View style={styles.resultsSection}>
                        {isSearching ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#11d452" />
                                <Text style={styles.loadingText}>Searching...</Text>
                            </View>
                        ) : searchResults.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="search" size={40} color="#CCC" />
                                <Text style={styles.emptyTitle}>No results found</Text>
                                <Text style={styles.emptySubtitle}>Try different keywords or a shorter phrase</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.resultCount}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>
                                {searchResults.map((hadith, index) => (
                                    <View key={index} style={styles.hadithCard}>
                                        <View style={styles.hadithHeader}>
                                            <Text style={styles.hadithBookTag}>
                                                {hadith.book_slug.toUpperCase()} · {hadith.hadith_number}
                                            </Text>
                                            <Text style={styles.narratorTag} numberOfLines={1}>{hadith.narrator}</Text>
                                        </View>
                                        <Text style={styles.arabicText}>{hadith.text_arabic}</Text>
                                        <View style={styles.divider} />
                                        <Text style={styles.englishText}>{hadith.text_english}</Text>
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity style={styles.actionBtn}>
                                                <Feather name="share-2" size={18} color="#5E5C58" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.actionBtn}>
                                                <Feather name="bookmark" size={18} color="#5E5C58" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Core Collections</Text>
                        <View style={styles.collectionsGrid}>
                            {COLLECTIONS.map(col => (
                                <TouchableOpacity
                                    key={col.id}
                                    style={styles.collectionGridItem}
                                    activeOpacity={0.85}
                                    onPress={() => router.push(`/hadith/${col.id}` as any)}
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
                        <TouchableOpacity style={styles.premiumBanner}>
                            <View style={styles.bannerIcon}>
                                <Feather name="wifi" size={24} color="#FDF8F0" />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>Live · Fawaz Hadith API</Text>
                                <Text style={styles.bannerSubtitle}>
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
        backgroundColor: '#f6f8f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 10,
        marginBottom: 20,
    },
    headerTitle: {
        color: '#1A1A1A',
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: -0.5,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.05)',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchInputListening: {
        borderColor: '#ef4444',
        backgroundColor: '#fff5f5',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: '#1A1A1A',
        fontSize: 15,
        height: '100%',
    },
    micBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F0F0F0',
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
        color: '#1A1A1A',
        fontSize: 20,
        fontWeight: 'bold',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    resultCount: {
        color: '#8A8A8A',
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
        color: '#1A1A1A',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8A8A8A',
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
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.35,
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
        backgroundColor: '#11d452', // Green banner
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
        color: '#FDF8F0',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    bannerSubtitle: {
        color: 'rgba(12, 15, 14, 0.7)',
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
        color: '#5E5C58',
        fontSize: 14,
    },
    noResultsText: {
        color: '#5E5C58',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    hadithCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    hadithHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    hadithBookTag: {
        color: '#11d452',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: 'rgba(17, 212, 82, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    narratorTag: {
        color: '#5E5C58',
        fontSize: 13,
        fontStyle: 'italic',
    },
    arabicText: {
        color: '#1A1A1A',
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 40,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 20,
    },
    englishText: {
        color: '#5E5C58',
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
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
    }
});
