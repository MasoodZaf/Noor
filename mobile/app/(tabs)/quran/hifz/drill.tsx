import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applySM2, HifzEntry } from './index';

async function checkOnline(): Promise<boolean> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        await fetch('https://1.1.1.1', { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(t);
        return true;
    } catch { return false; }
}
import { useDatabase } from '../../../../context/DatabaseContext';
import { sanitizeArabicText } from '../../../../utils/arabic';
import { useTheme } from '../../../../context/ThemeContext';

const { width } = Dimensions.get('window');
const HIFZ_KEY = '@noor/hifz_entries';

interface Ayah {
    numberInSurah: number;
    arabic: string;
    translation: string;
}

// Rating config
const RATINGS: { label: string; quality: 0 | 3 | 4 | 5; color: string; desc: string }[] = [
    { label: 'Again', quality: 0, color: '#E53E3E', desc: 'Couldn\'t recall' },
    { label: 'Hard', quality: 3, color: '#F59E0B', desc: 'With difficulty' },
    { label: 'Good', quality: 4, color: '#3B82F6', desc: 'Recalled correctly' },
    { label: 'Easy', quality: 5, color: '#22C55E', desc: 'Perfect recall' },
];

export default function DrillScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { surahId, surahName } = useLocalSearchParams<{ surahId: string; surahName: string }>();
    const { theme } = useTheme();

    const { db, isReady } = useDatabase();
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Drill state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [phase, setPhase] = useState<'drill' | 'rating' | 'done'>('drill');
    const [chosenRating, setChosenRating] = useState<typeof RATINGS[0] | null>(null);

    // Reveal animation
    const revealAnim = useRef(new Animated.Value(0)).current;
    // Card slide animation
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Wait for db to be ready before fetching — db starts null due to 500ms init delay.
    // Adding db to deps means this re-fires automatically when the DB becomes available.
    useEffect(() => {
        if (db && surahId) fetchAyahs();
    }, [surahId, db]);

    async function fetchAyahs() {
        setLoading(true);
        setError('');
        try {
            // Check network connectivity first
            const online = await checkOnline();
            if (!online) throw new Error('NO_NETWORK');
            if (!db || !isReady) throw new Error('Offline vault not ready. Please wait a moment and retry.');
            if (!surahId) throw new Error('Invalid surah selected.');
            const rows = await db.getAllAsync(
                `SELECT ayah_number, text_arabic, text_english
                 FROM ayahs WHERE surah_id = ?
                 ORDER BY ayah_number ASC`,
                [Number(surahId)]
            ) as any[];
            if (!rows.length) throw new Error('No ayahs found');
            setAyahs(rows.map(r => ({
                numberInSurah: r.ayah_number,
                arabic: sanitizeArabicText(r.text_arabic || ''),
                translation: r.text_english,
            })));
        } catch (e: any) {
            if (e?.message === 'NO_NETWORK') {
                setError('NO_NETWORK');
            } else {
                setError('Could not load ayahs. Please check your connection and retry.');
            }
        } finally {
            setLoading(false);
        }
    }

    function reveal() {
        setRevealed(true);
        Animated.spring(revealAnim, {
            toValue: 1, useNativeDriver: true, tension: 60, friction: 8,
        }).start();
    }

    function nextAyah() {
        Animated.sequence([
            Animated.timing(slideAnim, { toValue: -width, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            if (currentIdx + 1 >= ayahs.length) {
                setPhase('rating');
            } else {
                setCurrentIdx(i => i + 1);
                setRevealed(false);
                revealAnim.setValue(0);
                slideAnim.setValue(width);
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
            }
        });
    }

    async function submitRating(rating: typeof RATINGS[0]) {
        setChosenRating(rating);
        try {
            const raw = await AsyncStorage.getItem(HIFZ_KEY);
            // Guard before write: user may have navigated away during the await
            if (!isMountedRef.current) return;
            const entries: HifzEntry[] = raw ? JSON.parse(raw) : [];
            const idx = entries.findIndex(e => e.surahId === Number(surahId));
            if (idx !== -1) {
                entries[idx] = applySM2(entries[idx], rating.quality);
                await AsyncStorage.setItem(HIFZ_KEY, JSON.stringify(entries));
            }
        } catch (e) {
            console.error('SM2 save error', e);
        }
        if (isMountedRef.current) {
            setPhase('done');
        }
    }

    const progress = ayahs.length > 0 ? (currentIdx + 1) / ayahs.length : 0;
    const currentAyah = ayahs[currentIdx];

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.gold} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    {!isReady ? 'Preparing offline vault…' : `Loading ${decodeURIComponent(surahName ?? '')}…`}
                </Text>
            </View>
        );
    }

    if (error) {
        const isOfflineError = error === 'NO_NETWORK';
        return (
            <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
                <Feather name={isOfflineError ? 'wifi-off' : 'alert-circle'} size={48} color={isOfflineError ? '#c0392b' : theme.accentLight} />
                <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>
                    {isOfflineError ? 'No Internet Connection' : 'Failed to load'}
                </Text>
                <Text style={[styles.errorDesc, { color: theme.textSecondary }]}>
                    {isOfflineError
                        ? 'Hifz drill requires an active internet connection to load Quran data. Please connect and try again.'
                        : error}
                </Text>
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: isOfflineError ? '#c0392b' : theme.gold }]} onPress={() => { if (db && surahId) fetchAyahs(); }}>
                    <Text style={[styles.retryText, { color: theme.textInverse }]}>{isOfflineError ? 'Try Again' : 'Retry'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()}>
                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>← Back to Tracker</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Done screen ───────────────────────────────────────────────────────────
    if (phase === 'done') {
        const rating = chosenRating!;
        const nextIntervalMsg =
            rating.quality === 0 ? 'Review again tomorrow'
                : rating.quality === 3 ? 'Review in 1–3 days'
                    : rating.quality === 4 ? 'Review in ~6 days'
                        : 'Excellent! Review in 2+ weeks';

        return (
            <View style={[styles.doneContainer, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
                <LinearGradient colors={['rgba(201,168,76,0.12)', 'rgba(31,78,61,0.08)', 'transparent']} style={StyleSheet.absoluteFill} />
                <TouchableOpacity style={[styles.headerBack, { marginTop: 10, marginLeft: 20, backgroundColor: theme.bgInput }]} onPress={() => router.back()}>
                    <Feather name="x" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.doneContent}>
                    <Text style={styles.doneEmoji}>
                        {rating.quality === 0 ? '😓' : rating.quality === 3 ? '💪' : rating.quality === 4 ? '✅' : '🌟'}
                    </Text>
                    <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>Session Complete!</Text>
                    <Text style={[styles.doneSurah, { color: theme.textSecondary }]}>{decodeURIComponent(surahName ?? '')}</Text>

                    <View style={[styles.ratingResult, { borderColor: rating.color + '40', backgroundColor: rating.color + '10' }]}>
                        <Text style={[styles.ratingResultLabel, { color: rating.color }]}>{rating.label}</Text>
                        <Text style={[styles.ratingResultDesc, { color: theme.textSecondary }]}>{rating.desc}</Text>
                    </View>

                    <View style={[styles.doneStats, { backgroundColor: theme.bgCard }]}>
                        <View style={styles.doneStat}>
                            <Feather name="layers" size={20} color={theme.gold} />
                            <Text style={[styles.doneStatNum, { color: theme.textPrimary }]}>{ayahs.length}</Text>
                            <Text style={[styles.doneStatLabel, { color: theme.textTertiary }]}>Ayahs reviewed</Text>
                        </View>
                        <View style={[styles.doneStatDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.doneStat}>
                            <Feather name="clock" size={20} color={theme.gold} />
                            <Text style={[styles.doneStatNum, { color: theme.textPrimary }]}>{nextIntervalMsg}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.gold }]} onPress={() => router.back()}>
                        <Text style={[styles.doneBtnText, { color: theme.textInverse }]}>Back to Tracker</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Rating screen ─────────────────────────────────────────────────────────
    if (phase === 'rating') {
        return (
            <View style={[styles.ratingContainer, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
                <LinearGradient colors={['rgba(201,168,76,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={styles.ratingHeader}>
                    <Text style={[styles.ratingHeaderTitle, { color: theme.textPrimary }]}>How well did you recall?</Text>
                    <Text style={[styles.ratingHeaderSub, { color: theme.textSecondary }]}>
                        {decodeURIComponent(surahName ?? '')} · {ayahs.length} ayahs
                    </Text>
                </View>

                <View style={styles.ratingCards}>
                    {RATINGS.map((r) => (
                        <TouchableOpacity
                            key={r.label}
                            style={[styles.ratingCard, { borderColor: r.color + '50', backgroundColor: theme.bgCard }]}
                            onPress={() => submitRating(r)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[r.color + '15', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={[styles.ratingCardLabel, { color: r.color }]}>{r.label}</Text>
                            <Text style={[styles.ratingCardDesc, { color: theme.textSecondary }]}>{r.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.ratingHint, { color: theme.textTertiary }]}>
                    Your answer adjusts when this surah will appear for review next.
                </Text>
            </View>
        );
    }

    // ── Main Drill ────────────────────────────────────────────────────────────
    return (
        <View style={[styles.drillContainer, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.drillHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={[styles.headerBack, { backgroundColor: theme.bgInput }]} onPress={() => router.back()}>
                    <Feather name="x" size={22} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.drillSurahName, { color: theme.textPrimary }]}>{decodeURIComponent(surahName ?? '')}</Text>
                    <View style={[styles.progressBar, { backgroundColor: theme.bgInput }]}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.gold }]} />
                    </View>
                </View>
                <Text style={[styles.drillProgress, { color: theme.textSecondary }]}>{currentIdx + 1}/{ayahs.length}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.drillScroll}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.ayahCard, { transform: [{ translateX: slideAnim }], backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    {/* Ayah number */}
                    <View style={styles.ayahNumRow}>
                        <View style={[styles.ayahNumBadge, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                            <Text style={[styles.ayahNumText, { color: theme.gold }]}>{currentAyah?.numberInSurah}</Text>
                        </View>
                        <Text style={[styles.ayahHint, { color: theme.textTertiary }]}>Recite from memory</Text>
                    </View>

                    {/* Translation (always visible as a hint) */}
                    <View style={[styles.translationBox, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.translationLabel, { color: theme.textTertiary }]}>TRANSLATION</Text>
                        <Text style={[styles.translationText, { color: theme.textSecondary }]}>{currentAyah?.translation}</Text>
                    </View>

                    {/* Arabic — revealed on tap */}
                    {!revealed ? (
                        <TouchableOpacity style={styles.revealBtn} onPress={reveal} activeOpacity={0.8}>
                            <LinearGradient colors={[theme.gold, theme.accent]} style={styles.revealBtnGradient}>
                                <Feather name="eye" size={20} color={theme.textInverse} />
                                <Text style={[styles.revealBtnText, { color: theme.textInverse }]}>Reveal Arabic</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <Animated.View style={[styles.arabicBox, {
                            backgroundColor: theme.bgSecondary,
                            borderColor: theme.border,
                            opacity: revealAnim,
                            transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                        }]}>
                            <Text style={[styles.arabicText, { color: theme.gold }]}>{currentAyah?.arabic}</Text>
                        </Animated.View>
                    )}

                    {/* Next button */}
                    {revealed && (
                        <Animated.View style={{ opacity: revealAnim }}>
                            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.accent }]} onPress={nextAyah}>
                                <Text style={[styles.nextBtnText, { color: theme.textInverse }]}>
                                    {currentIdx + 1 < ayahs.length ? 'Next Ayah' : 'Finish Review'}
                                </Text>
                                <Feather
                                    name={currentIdx + 1 < ayahs.length ? 'arrow-right' : 'check'}
                                    size={20}
                                    color={theme.textInverse}
                                />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom hint */}
            {!revealed && (
                <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
                    <Text style={[styles.bottomHintText, { color: theme.textTertiary }]}>Try to recall the Arabic before revealing</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { fontSize: 16 },
    errorTitle: { fontSize: 20, fontWeight: '700' },
    errorDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
    retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
    retryText: { fontWeight: '700', fontSize: 16 },

    // ── Drill ────────────────────────────────────────────────────────────────
    drillContainer: { flex: 1 },
    drillHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerBack: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    drillSurahName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    drillProgress: { fontSize: 13, fontWeight: '600', minWidth: 40, textAlign: 'right' },

    drillScroll: { flexGrow: 1, padding: 20 },

    ayahCard: {
        borderRadius: 28, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 16,
        borderWidth: 1,
    },
    ayahNumRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    ayahNumBadge: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    ayahNumText: { fontSize: 15, fontWeight: '700' },
    ayahHint: { fontSize: 13, fontStyle: 'italic' },

    translationBox: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
    translationLabel: {
        fontSize: 10, fontWeight: '700',
        letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase',
    },
    translationText: { fontSize: 15, lineHeight: 24 },

    revealBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 8 },
    revealBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16,
    },
    revealBtnText: { fontSize: 16, fontWeight: '700' },

    arabicBox: { borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1 },
    arabicText: {
        fontSize: 28, lineHeight: 52, textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },

    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16, borderRadius: 20,
    },
    nextBtnText: { fontSize: 16, fontWeight: '700' },

    bottomHint: { alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
    bottomHintText: { fontSize: 13, fontStyle: 'italic' },

    // ── Rating ───────────────────────────────────────────────────────────────
    ratingContainer: { flex: 1, paddingHorizontal: 24 },
    ratingHeader: { alignItems: 'center', paddingVertical: 48 },
    ratingHeaderTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    ratingHeaderSub: { fontSize: 15 },
    ratingCards: { gap: 14 },
    ratingCard: { borderRadius: 20, padding: 20, borderWidth: 1.5, overflow: 'hidden' },
    ratingCardLabel: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    ratingCardDesc: { fontSize: 14 },
    ratingHint: { textAlign: 'center', fontSize: 13, marginTop: 28, fontStyle: 'italic' },

    // ── Done ─────────────────────────────────────────────────────────────────
    doneContainer: { flex: 1 },
    doneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    doneEmoji: { fontSize: 64, marginBottom: 16 },
    doneTitle: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
    doneSurah: { fontSize: 16, marginBottom: 28 },
    ratingResult: {
        borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
        alignItems: 'center', marginBottom: 28, width: '100%',
    },
    ratingResultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    ratingResultDesc: { fontSize: 14 },
    doneStats: {
        flexDirection: 'row', borderRadius: 20, padding: 20,
        width: '100%', marginBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    },
    doneStat: { flex: 1, alignItems: 'center', gap: 6 },
    doneStatNum: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    doneStatLabel: { fontSize: 11, textAlign: 'center' },
    doneStatDivider: { width: 1 },
    doneBtn: { width: '100%', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
    doneBtnText: { fontSize: 17, fontWeight: '700' },
});
