import React, { useState, useEffect, useRef } from 'react';
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
import { useDatabase } from '../../../../context/DatabaseContext';

const { width } = Dimensions.get('window');
const HIFZ_KEY = '@hifz_entries';

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

    const { db } = useDatabase();
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Drill state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [phase, setPhase] = useState<'drill' | 'rating' | 'done'>('drill');
    const [chosenRating, setChosenRating] = useState<typeof RATINGS[0] | null>(null);

    // Reveal animation
    const revealAnim = useRef(new Animated.Value(0)).current;
    // Card slide animation
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchAyahs();
    }, [surahId]);

    async function fetchAyahs() {
        setLoading(true);
        setError('');
        try {
            if (!db) throw new Error('DB not ready');
            const rows = await db.getAllAsync(
                `SELECT ayah_number, text_arabic, text_english
                 FROM ayahs WHERE surah_id = ?
                 ORDER BY ayah_number ASC`,
                [Number(surahId)]
            ) as any[];
            if (!rows.length) throw new Error('No ayahs found');
            setAyahs(rows.map(r => ({
                numberInSurah: r.ayah_number,
                arabic: r.text_arabic,
                translation: r.text_english,
            })));
        } catch (e) {
            setError('Could not load ayahs from offline vault.');
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
            const entries: HifzEntry[] = raw ? JSON.parse(raw) : [];
            const idx = entries.findIndex(e => e.surahId === Number(surahId));
            if (idx !== -1) {
                entries[idx] = applySM2(entries[idx], rating.quality);
                await AsyncStorage.setItem(HIFZ_KEY, JSON.stringify(entries));
            }
        } catch (e) {
            console.error('SM2 save error', e);
        }
        setPhase('done');
    }

    const progress = ayahs.length > 0 ? (currentIdx + 1) / ayahs.length : 0;
    const currentAyah = ayahs[currentIdx];

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Loading {decodeURIComponent(surahName ?? '')}...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <Feather name="alert-circle" size={48} color="rgba(201,168,76,0.5)" />
                <Text style={styles.errorTitle}>Failed to load</Text>
                <Text style={styles.errorDesc}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchAyahs}>
                    <Text style={styles.retryText}>Retry</Text>
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
            <View style={[styles.doneContainer, { paddingTop: insets.top }]}>
                <LinearGradient colors={['rgba(201,168,76,0.12)', 'rgba(31,78,61,0.08)', '#FDF8F0']} style={StyleSheet.absoluteFill} />
                <TouchableOpacity style={[styles.headerBack, { marginTop: 10, marginLeft: 20 }]} onPress={() => router.back()}>
                    <Feather name="x" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.doneContent}>
                    <Text style={styles.doneEmoji}>
                        {rating.quality === 0 ? '😓' : rating.quality === 3 ? '💪' : rating.quality === 4 ? '✅' : '🌟'}
                    </Text>
                    <Text style={styles.doneTitle}>Session Complete!</Text>
                    <Text style={styles.doneSurah}>{decodeURIComponent(surahName ?? '')}</Text>

                    <View style={[styles.ratingResult, { borderColor: rating.color + '40', backgroundColor: rating.color + '10' }]}>
                        <Text style={[styles.ratingResultLabel, { color: rating.color }]}>{rating.label}</Text>
                        <Text style={styles.ratingResultDesc}>{rating.desc}</Text>
                    </View>

                    <View style={styles.doneStats}>
                        <View style={styles.doneStat}>
                            <Feather name="layers" size={20} color="#C9A84C" />
                            <Text style={styles.doneStatNum}>{ayahs.length}</Text>
                            <Text style={styles.doneStatLabel}>Ayahs reviewed</Text>
                        </View>
                        <View style={styles.doneStatDivider} />
                        <View style={styles.doneStat}>
                            <Feather name="clock" size={20} color="#C9A84C" />
                            <Text style={styles.doneStatNum}>{nextIntervalMsg}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                        <Text style={styles.doneBtnText}>Back to Tracker</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Rating screen ─────────────────────────────────────────────────────────
    if (phase === 'rating') {
        return (
            <View style={[styles.ratingContainer, { paddingTop: insets.top }]}>
                <LinearGradient colors={['rgba(201,168,76,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={styles.ratingHeader}>
                    <Text style={styles.ratingHeaderTitle}>How well did you recall?</Text>
                    <Text style={styles.ratingHeaderSub}>
                        {decodeURIComponent(surahName ?? '')} · {ayahs.length} ayahs
                    </Text>
                </View>

                <View style={styles.ratingCards}>
                    {RATINGS.map((r) => (
                        <TouchableOpacity
                            key={r.label}
                            style={[styles.ratingCard, { borderColor: r.color + '50' }]}
                            onPress={() => submitRating(r)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[r.color + '15', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={[styles.ratingCardLabel, { color: r.color }]}>{r.label}</Text>
                            <Text style={styles.ratingCardDesc}>{r.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.ratingHint}>
                    Your answer adjusts when this surah will appear for review next.
                </Text>
            </View>
        );
    }

    // ── Main Drill ────────────────────────────────────────────────────────────
    return (
        <View style={[styles.drillContainer, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.drillHeader}>
                <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
                    <Feather name="x" size={22} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.drillSurahName}>{decodeURIComponent(surahName ?? '')}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>
                <Text style={styles.drillProgress}>{currentIdx + 1}/{ayahs.length}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.drillScroll}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.ayahCard, { transform: [{ translateX: slideAnim }] }]}>
                    {/* Ayah number */}
                    <View style={styles.ayahNumRow}>
                        <View style={styles.ayahNumBadge}>
                            <Text style={styles.ayahNumText}>{currentAyah?.numberInSurah}</Text>
                        </View>
                        <Text style={styles.ayahHint}>Recite from memory</Text>
                    </View>

                    {/* Translation (always visible as a hint) */}
                    <View style={styles.translationBox}>
                        <Text style={styles.translationLabel}>TRANSLATION</Text>
                        <Text style={styles.translationText}>{currentAyah?.translation}</Text>
                    </View>

                    {/* Arabic — revealed on tap */}
                    {!revealed ? (
                        <TouchableOpacity style={styles.revealBtn} onPress={reveal} activeOpacity={0.8}>
                            <LinearGradient colors={['#C9A84C', '#8A702D']} style={styles.revealBtnGradient}>
                                <Feather name="eye" size={20} color="#FDF8F0" />
                                <Text style={styles.revealBtnText}>Reveal Arabic</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <Animated.View style={[styles.arabicBox, {
                            opacity: revealAnim,
                            transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                        }]}>
                            <Text style={styles.arabicText}>{currentAyah?.arabic}</Text>
                        </Animated.View>
                    )}

                    {/* Next button */}
                    {revealed && (
                        <Animated.View style={{ opacity: revealAnim }}>
                            <TouchableOpacity style={styles.nextBtn} onPress={nextAyah}>
                                <Text style={styles.nextBtnText}>
                                    {currentIdx + 1 < ayahs.length ? 'Next Ayah' : 'Finish Review'}
                                </Text>
                                <Feather
                                    name={currentIdx + 1 < ayahs.length ? 'arrow-right' : 'check'}
                                    size={20}
                                    color="#FDF8F0"
                                />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom hint */}
            {!revealed && (
                <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 16 }]}>
                    <Text style={styles.bottomHintText}>Try to recall the Arabic before revealing</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF8F0', gap: 16 },
    loadingText: { color: '#5E5C58', fontSize: 16 },
    errorTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: '700' },
    errorDesc: { color: '#5E5C58', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
    retryBtn: {
        backgroundColor: '#C9A84C', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20,
    },
    retryText: { color: '#FDF8F0', fontWeight: '700', fontSize: 16 },

    // ── Drill ────────────────────────────────────────────────────────────────
    drillContainer: { flex: 1, backgroundColor: '#FDF8F0' },
    drillHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerBack: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center',
    },
    drillSurahName: { color: '#1A1A1A', fontSize: 14, fontWeight: '600', marginBottom: 6 },
    progressBar: {
        height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: '#C9A84C', borderRadius: 2 },
    drillProgress: { color: '#5E5C58', fontSize: 13, fontWeight: '600', minWidth: 40, textAlign: 'right' },

    drillScroll: { flexGrow: 1, padding: 20 },

    ayahCard: {
        backgroundColor: '#FFFFFF', borderRadius: 28, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 16,
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.1)',
    },
    ayahNumRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
    },
    ayahNumBadge: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(201,168,76,0.12)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    },
    ayahNumText: { color: '#C9A84C', fontSize: 15, fontWeight: '700' },
    ayahHint: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },

    translationBox: {
        backgroundColor: 'rgba(31,78,61,0.05)', borderRadius: 16, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(31,78,61,0.1)',
    },
    translationLabel: {
        color: '#5E5C58', fontSize: 10, fontWeight: '700',
        letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase',
    },
    translationText: { color: '#374151', fontSize: 15, lineHeight: 24 },

    revealBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 8 },
    revealBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16,
    },
    revealBtnText: { color: '#FDF8F0', fontSize: 16, fontWeight: '700' },

    arabicBox: {
        backgroundColor: 'rgba(201,168,76,0.06)', borderRadius: 20, padding: 20,
        marginBottom: 20, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    },
    arabicText: {
        color: '#C9A84C', fontSize: 28, lineHeight: 52, textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },

    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, backgroundColor: '#1F4E3D',
        paddingVertical: 16, borderRadius: 20,
    },
    nextBtnText: { color: '#FDF8F0', fontSize: 16, fontWeight: '700' },

    bottomHint: {
        alignItems: 'center', paddingTop: 12,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)',
    },
    bottomHintText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },

    // ── Rating ───────────────────────────────────────────────────────────────
    ratingContainer: { flex: 1, backgroundColor: '#FDF8F0', paddingHorizontal: 24 },
    ratingHeader: { alignItems: 'center', paddingVertical: 48 },
    ratingHeaderTitle: { color: '#1A1A1A', fontSize: 24, fontWeight: '800', marginBottom: 8 },
    ratingHeaderSub: { color: '#5E5C58', fontSize: 15 },
    ratingCards: { gap: 14 },
    ratingCard: {
        borderRadius: 20, padding: 20, borderWidth: 1.5,
        overflow: 'hidden',
    },
    ratingCardLabel: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    ratingCardDesc: { color: '#5E5C58', fontSize: 14 },
    ratingHint: {
        textAlign: 'center', color: '#9CA3AF', fontSize: 13,
        marginTop: 28, fontStyle: 'italic',
    },

    // ── Done ─────────────────────────────────────────────────────────────────
    doneContainer: { flex: 1, backgroundColor: '#FDF8F0' },
    doneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    doneEmoji: { fontSize: 64, marginBottom: 16 },
    doneTitle: { color: '#1A1A1A', fontSize: 26, fontWeight: '800', marginBottom: 6 },
    doneSurah: { color: '#5E5C58', fontSize: 16, marginBottom: 28 },
    ratingResult: {
        borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
        alignItems: 'center', marginBottom: 28, width: '100%',
    },
    ratingResultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    ratingResultDesc: { color: '#5E5C58', fontSize: 14 },
    doneStats: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 20,
        width: '100%', marginBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    },
    doneStat: { flex: 1, alignItems: 'center', gap: 6 },
    doneStatNum: { color: '#1A1A1A', fontSize: 13, fontWeight: '700', textAlign: 'center' },
    doneStatLabel: { color: '#9CA3AF', fontSize: 11, textAlign: 'center' },
    doneStatDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
    doneBtn: {
        backgroundColor: '#C9A84C', width: '100%', paddingVertical: 16,
        borderRadius: 20, alignItems: 'center',
    },
    doneBtnText: { color: '#FDF8F0', fontSize: 17, fontWeight: '700' },
});
