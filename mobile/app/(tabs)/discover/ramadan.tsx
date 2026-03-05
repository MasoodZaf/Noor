import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
// expo-notifications is unavailable in Expo Go on Android (removed SDK 53+).
// Dynamically require to avoid a hard crash in Expo Go.
let Notifications: typeof import('expo-notifications') | null = null;
try { Notifications = require('expo-notifications'); } catch (_) {}
import moment from 'moment-hijri';
import Svg, { Circle } from 'react-native-svg';

// ── AlAdhan API ────────────────────────────────────────────────────────────────
const ALADHAN = 'https://api.aladhan.com/v1';

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    return d.locality || d.city || d.principalSubdivision || '';
};

const todayKey = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const storageKey = (suffix: string) => `@ramadan_${suffix}_${todayKey()}`;
const streakKey = '@ramadan_streak';
const pagesKey = () => storageKey('pages');
const fastedKey = () => storageKey('fasted');
const timingsKey = () => `@ramadan_timings_${todayKey()}`;

interface Timings {
    sehri: string;   // "HH:mm"
    iftar: string;
    sehriDate: Date;
    iftarDate: Date;
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatTime(date: Date): string {
    const h = date.getHours() % 12 || 12;
    const m = pad(date.getMinutes());
    return `${h}:${m} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}
function countdown(to: Date): string {
    const diff = to.getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Progress ring helper
function ProgressRing({ pct, size, color }: { pct: number; size: number; color: string }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={6} fill="none" />
            <Circle
                cx={size / 2} cy={size / 2} r={r}
                stroke={color} strokeWidth={6} fill="none"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - Math.min(1, pct))}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </Svg>
    );
}

export default function RamadanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState<Timings | null>(null);
    const [fasted, setFasted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [pagesRead, setPagesRead] = useState(0);
    const [now, setNow] = useState(new Date());
    const [locationName, setLocationName] = useState('');

    // Live clock tick
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load today's fasting status
            const fastedVal = await AsyncStorage.getItem(fastedKey());
            setFasted(fastedVal === 'true');

            // Load pages read
            const pages = await AsyncStorage.getItem(pagesKey());
            setPagesRead(pages ? parseInt(pages, 10) : 0);

            // Load streak
            const streakVal = await AsyncStorage.getItem(streakKey);
            setStreak(streakVal ? parseInt(streakVal, 10) : 0);

            // Load or fetch sehri/iftar timings
            const cached = await AsyncStorage.getItem(timingsKey());
            if (cached) {
                const t = JSON.parse(cached);
                setTimings({ ...t, sehriDate: new Date(t.sehriDate), iftarDate: new Date(t.iftarDate) });
            } else {
                await fetchTimings();
            }
        } catch (_) {}
        setLoading(false);
    }, []);

    const fetchTimings = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;

            // BigDataCloud: district-level reverse geocoding
            try {
                const locality = await reverseGeocode(latitude, longitude);
                if (locality) setLocationName(locality);
            } catch (_) {}

            const ts = Math.floor(Date.now() / 1000);
            const res = await fetch(`${ALADHAN}/timings/${ts}?latitude=${latitude}&longitude=${longitude}&method=1`);
            const json = await res.json();

            if (json.code === 200) {
                const gd = json.data.date.gregorian.date; // DD-MM-YYYY
                const sehriDate = moment(`${gd} ${json.data.timings.Fajr}`, 'DD-MM-YYYY HH:mm').toDate();
                const iftarDate = moment(`${gd} ${json.data.timings.Maghrib}`, 'DD-MM-YYYY HH:mm').toDate();

                const t: Timings = {
                    sehri: json.data.timings.Fajr,
                    iftar: json.data.timings.Maghrib,
                    sehriDate,
                    iftarDate,
                };
                setTimings(t);
                await AsyncStorage.setItem(timingsKey(), JSON.stringify({
                    ...t,
                    sehriDate: sehriDate.getTime(),
                    iftarDate: iftarDate.getTime(),
                }));

                // Schedule sehri & iftar notifications (skipped in Expo Go on Android)
                if (Notifications) {
                    const { status: notifStatus } = await Notifications.getPermissionsAsync();
                    if (notifStatus === 'granted') {
                        if (sehriDate.getTime() > Date.now()) {
                            await Notifications.scheduleNotificationAsync({
                                content: { title: 'Sehri Time Ending', body: 'Fajr is approaching. Stop eating and prepare for Suhoor.', sound: true },
                                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(sehriDate.getTime() - 10 * 60 * 1000) },
                            }).catch(() => {});
                        }
                        if (iftarDate.getTime() > Date.now()) {
                            await Notifications.scheduleNotificationAsync({
                                content: { title: 'Iftar Time', body: 'Allahu Akbar! It is time to break your fast. Bismillah.', sound: true },
                                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: iftarDate },
                            }).catch(() => {});
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Ramadan timings fetch failed:', e);
        }
    };

    useEffect(() => { loadData(); }, []);

    const toggleFasted = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newVal = !fasted;
        setFasted(newVal);
        await AsyncStorage.setItem(fastedKey(), String(newVal));

        // Update streak
        if (newVal) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            await AsyncStorage.setItem(streakKey, String(newStreak));
        } else if (streak > 0) {
            const newStreak = streak - 1;
            setStreak(newStreak);
            await AsyncStorage.setItem(streakKey, String(newStreak));
        }
    };

    const adjustPages = async (delta: number) => {
        const next = Math.max(0, Math.min(604, pagesRead + delta)); // 604 pages in Quran
        setPagesRead(next);
        await AsyncStorage.setItem(pagesKey(), String(next));
        Haptics.selectionAsync();
    };

    // Fast progress (0→1 from sehri to iftar)
    const fastPct = timings
        ? Math.max(0, Math.min(1, (now.getTime() - timings.sehriDate.getTime()) / (timings.iftarDate.getTime() - timings.sehriDate.getTime())))
        : 0;
    const isFasting = timings ? now >= timings.sehriDate && now < timings.iftarDate : false;
    const timeToIftar = timings ? countdown(timings.iftarDate) : '—';
    const timeToSehri = timings ? countdown(timings.sehriDate) : '—';

    const hijriDate = moment().format('iDo iMMMM iYYYY [AH]');

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
                <ActivityIndicator color="#C9A84C" size="large" />
                <Text style={styles.loadingText}>Fetching Ramadan timings…</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Ramadan</Text>
                    {locationName ? <Text style={styles.headerSub}>{locationName}</Text> : null}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Hijri Date */}
                <Text style={styles.hijriDate}>{hijriDate}</Text>

                {/* Fast Progress Ring */}
                <View style={styles.ringSection}>
                    <View style={styles.ringWrapper}>
                        <ProgressRing pct={fastPct} size={200} color="#C9A84C" />
                        <View style={styles.ringCenter}>
                            <Text style={styles.ringLabel}>{isFasting ? 'Fasting' : now < (timings?.sehriDate ?? now) ? 'Sehri' : 'Iftar'}</Text>
                            <Text style={styles.ringTime}>
                                {isFasting ? timeToIftar : now < (timings?.sehriDate ?? now) ? timeToSehri : '—'}
                            </Text>
                            <Text style={styles.ringSubLabel}>{isFasting ? 'until Iftar' : 'remaining'}</Text>
                        </View>
                    </View>
                </View>

                {/* Sehri / Iftar Times */}
                <View style={styles.timingsRow}>
                    <View style={styles.timingCard}>
                        <Feather name="sunrise" size={20} color="#C9A84C" style={{ marginBottom: 8 }} />
                        <Text style={styles.timingLabel}>Sehri</Text>
                        <Text style={styles.timingTime}>{timings ? formatTime(timings.sehriDate) : '—'}</Text>
                        <Text style={styles.timingCountdown}>{timings && now < timings.sehriDate ? `in ${timeToSehri}` : 'passed'}</Text>
                    </View>
                    <View style={styles.timingDivider} />
                    <View style={styles.timingCard}>
                        <Feather name="sunset" size={20} color="#C9A84C" style={{ marginBottom: 8 }} />
                        <Text style={styles.timingLabel}>Iftar</Text>
                        <Text style={styles.timingTime}>{timings ? formatTime(timings.iftarDate) : '—'}</Text>
                        <Text style={styles.timingCountdown}>{timings && now < timings.iftarDate ? `in ${timeToIftar}` : 'break fast'}</Text>
                    </View>
                </View>

                {/* Today's Fast Toggle */}
                <TouchableOpacity style={[styles.fastToggle, fasted && styles.fastToggleActive]} onPress={toggleFasted} activeOpacity={0.8}>
                    <Feather name={fasted ? 'check-circle' : 'circle'} size={24} color={fasted ? '#0C0F0E' : '#C9A84C'} />
                    <Text style={[styles.fastToggleText, fasted && styles.fastToggleTextActive]}>
                        {fasted ? 'Fasting today ✓' : 'Mark today as fasted'}
                    </Text>
                </TouchableOpacity>

                {/* Streak */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{streak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                        <Feather name="zap" size={16} color="#C9A84C" style={{ marginTop: 4 }} />
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.pagesRow}>
                            <TouchableOpacity onPress={() => adjustPages(-1)} style={styles.pageBtn}>
                                <Feather name="minus" size={16} color="#9A9590" />
                            </TouchableOpacity>
                            <Text style={styles.statNumber}>{pagesRead}</Text>
                            <TouchableOpacity onPress={() => adjustPages(1)} style={styles.pageBtn}>
                                <Feather name="plus" size={16} color="#C9A84C" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.statLabel}>Pages Read Today</Text>
                        <Text style={styles.statSub}>{604 - pagesRead} pages to Khatm</Text>
                    </View>
                </View>

                {/* Dua for Breaking Fast */}
                <View style={styles.duaCard}>
                    <Text style={styles.duaTitle}>Dua for Breaking Fast</Text>
                    <Text style={styles.duaArabic}>اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ</Text>
                    <View style={styles.duaDivider} />
                    <Text style={styles.duaTranslation}>"O Allah! I fasted for You, and I believe in You, and I put my trust in You, and with Your sustenance I break my fast."</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F0E' },
    loadingText: { color: '#9A9590', marginTop: 16, fontSize: 14 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 64,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerTitle: { color: '#E8E6E1', fontSize: 22, fontWeight: '500', textAlign: 'center' },
    headerSub: { color: '#9A9590', fontSize: 13, textAlign: 'center', marginTop: 2 },

    scroll: { paddingBottom: 60 },

    hijriDate: {
        color: '#C9A84C',
        fontSize: 14,
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 8,
        textTransform: 'uppercase',
    },

    // Ring
    ringSection: { alignItems: 'center', marginVertical: 16 },
    ringWrapper: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center' },
    ringLabel: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    ringTime: { color: '#E8E6E1', fontSize: 32, fontWeight: '300', marginVertical: 4 },
    ringSubLabel: { color: '#5E5C58', fontSize: 11 },

    // Timings
    timingsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20,
        marginBottom: 16,
    },
    timingCard: { flex: 1, alignItems: 'center' },
    timingDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
    timingLabel: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    timingTime: { color: '#E8E6E1', fontSize: 22, fontWeight: '300' },
    timingCountdown: { color: '#C9A84C', fontSize: 12, marginTop: 4 },

    // Toggle
    fastToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 16,
        gap: 14,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.3)',
        backgroundColor: 'rgba(201,168,76,0.05)',
    },
    fastToggleActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
    fastToggleText: { color: '#C9A84C', fontSize: 16, fontWeight: '600' },
    fastToggleTextActive: { color: '#0C0F0E' },

    // Stats
    statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20,
        alignItems: 'center',
    },
    statNumber: { color: '#E8E6E1', fontSize: 36, fontWeight: '300' },
    statLabel: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    statSub: { color: '#5E5C58', fontSize: 11, marginTop: 4 },
    pagesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageBtn: { padding: 6 },

    // Dua card
    duaCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.1)',
        padding: 24,
    },
    duaTitle: { color: '#C9A84C', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
    duaArabic: {
        color: '#E8E6E1',
        fontSize: 22,
        lineHeight: 40,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    duaDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
    duaTranslation: { color: '#9A9590', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
