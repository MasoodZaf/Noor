import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Alert, BackHandler, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
// expo-notifications availability — removed from Expo Go on Android SDK 53+.
// We hold a runtime reference to read permission status for the UI hint;
// the actual scheduling lives in utils/notifications and is a no-op on
// platforms where the native module isn't linked.
let NotificationsRuntime: typeof import('expo-notifications') | null = null;
try { NotificationsRuntime = require('expo-notifications'); } catch (_) {}
import moment from 'moment-hijri';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
    RAMADAN_NOTIF_PREF_KEY,
    scheduleRamadanNotifications,
    cancelRamadanNotifications,
} from '../../../utils/notifications';

// ── AlAdhan API ────────────────────────────────────────────────────────────────
const ALADHAN = 'https://api.aladhan.com/v1';

// Cache geocode results for 24h — BigDataCloud is a free service with no SLA.
// Key is rounded to ~1km precision; value is the locality string.
const GEO_CACHE_KEY = (lat: number, lon: number) =>
    `@noor/geocode_${Math.round(lat * 10)}_${Math.round(lon * 10)}`;

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const cacheKey = GEO_CACHE_KEY(lat, lon);
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) return cached;
    } catch { /* ignore */ }

    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    const locality = d.locality || d.city || d.principalSubdivision || '';
    if (locality) {
        AsyncStorage.setItem(cacheKey, locality).catch(() => {});
    }
    return locality;
};

// Use local date (YYYY-MM-DD) so keys reset at local midnight, not UTC midnight.
// toLocaleDateString('en-CA') returns YYYY-MM-DD in the device's local timezone.
const todayKey = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const storageKey = (suffix: string) => `@ramadan_${suffix}_${todayKey()}`;
const streakKey = '@ramadan_streak';
const streakDateKey = '@ramadan_streak_date'; // tracks which local date was last counted
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
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.08)" strokeWidth={6} fill="none" />
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
    const { theme } = useTheme();
    const { language } = useLanguage();

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);
    useFocusEffect(useCallback(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
        return () => sub.remove();
    }, [goBack]));

    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState<Timings | null>(null);
    const [fasted, setFasted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [pagesRead, setPagesRead] = useState(0);
    const [now, setNow] = useState(new Date());
    const [locationName, setLocationName] = useState('');
    const [notifsDenied, setNotifsDenied] = useState(false);
    const [ramadanNotifEnabled, setRamadanNotifEnabled] = useState(true);
    // Gates the scheduling effect so the default `enabled=true` doesn't briefly
    // schedule notifications before AsyncStorage resolves the user's saved toggle.
    const [ramadanPrefsLoaded, setRamadanPrefsLoaded] = useState(false);

    // Live clock tick
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load Ramadan notification toggle (default on)
            const notifPref = await AsyncStorage.getItem(RAMADAN_NOTIF_PREF_KEY);
            if (!mountedRef.current) return;
            setRamadanNotifEnabled(notifPref !== 'false');
            setRamadanPrefsLoaded(true);

            // Load today's fasting status
            const fastedVal = await AsyncStorage.getItem(fastedKey());
            if (!mountedRef.current) return;
            setFasted(fastedVal === 'true');

            // Load pages read
            const pages = await AsyncStorage.getItem(pagesKey());
            if (!mountedRef.current) return;
            setPagesRead(pages ? parseInt(pages, 10) : 0);

            // Load streak
            const streakVal = await AsyncStorage.getItem(streakKey);
            if (!mountedRef.current) return;
            setStreak(streakVal ? parseInt(streakVal, 10) : 0);

            // Load or fetch sehri/iftar timings
            const cached = await AsyncStorage.getItem(timingsKey());
            if (!mountedRef.current) return;
            if (cached) {
                const t = JSON.parse(cached);
                setTimings({ ...t, sehriDate: new Date(t.sehriDate), iftarDate: new Date(t.iftarDate) });
            } else {
                await fetchTimings();
            }
        } catch (_) {}
        if (mountedRef.current) setLoading(false);
    }, []);

    const fetchTimings = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (!mountedRef.current || status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({});
            if (!mountedRef.current) return;
            const { latitude, longitude } = loc.coords;

            // BigDataCloud: district-level reverse geocoding
            try {
                const locality = await reverseGeocode(latitude, longitude);
                if (mountedRef.current && locality) setLocationName(locality);
            } catch (_) {}

            // H9: use saved prayer method instead of hardcoded method=1
            let prayerMethod = 1; // default: University of Karachi
            try {
                const settingsRaw = await AsyncStorage.getItem('@prayer_settings');
                if (settingsRaw) {
                    const settings = JSON.parse(settingsRaw);
                    if (typeof settings.method === 'number' && settings.method > 0) {
                        prayerMethod = settings.method;
                    }
                }
            } catch {}

            const ts = Math.floor(Date.now() / 1000);
            // latitudeAdjustmentMethod=3 (Angle Based) — keeps Fajr/Maghrib sane at high latitudes (UK/Nordic/Canada)
            const res = await fetch(`${ALADHAN}/timings/${ts}?latitude=${latitude}&longitude=${longitude}&method=${prayerMethod}&latitudeAdjustmentMethod=3`);
            const json = await res.json();

            if (json.code === 200) {
                if (!mountedRef.current) return;
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

                // Permission hint only — actual scheduling is driven by the
                // effect below so timing data, language, and enabled toggle all
                // funnel through one path.
                if (NotificationsRuntime) {
                    const { status: notifStatus } = await NotificationsRuntime.getPermissionsAsync();
                    if (!mountedRef.current) return;
                    if (notifStatus !== 'granted') setNotifsDenied(true);
                }
            }
        } catch (e) {
            console.warn('Ramadan timings fetch failed:', e);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Single source of truth for Ramadan notification scheduling: fires whenever
    // timings, language, or the enabled toggle changes — after prefs are loaded.
    // The util cancels stale IDs on every call, so it's safe to invoke
    // repeatedly. When enabled=false it cancels and returns.
    useEffect(() => {
        if (!NotificationsRuntime || !ramadanPrefsLoaded) return;
        if (!timings) {
            // No timings yet: clear any stale IDs from a prior install/version.
            cancelRamadanNotifications().catch(() => {});
            return;
        }
        scheduleRamadanNotifications(timings.sehriDate, timings.iftarDate, language, ramadanNotifEnabled)
            .catch(e => console.warn('[Noor/Ramadan] Schedule failed:', e));
    }, [ramadanPrefsLoaded, timings, language, ramadanNotifEnabled]);

    const toggleRamadanNotif = async () => {
        Haptics.selectionAsync();
        const next = !ramadanNotifEnabled;
        setRamadanNotifEnabled(next);
        try { await AsyncStorage.setItem(RAMADAN_NOTIF_PREF_KEY, String(next)); } catch {}
        // Scheduling driven by the effect that watches ramadanNotifEnabled.
    };

    const toggleFasted = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newVal = !fasted;
        try {
            // Persist first — only flip UI state if storage succeeds, so refresh/restart stays consistent
            await AsyncStorage.setItem(fastedKey(), String(newVal));
            setFasted(newVal);

            // H10: Only count/uncount today once — prevent toggling from inflating streak
            const today = todayKey();
            const lastStreakDate = await AsyncStorage.getItem(streakDateKey);

            if (newVal && lastStreakDate !== today) {
                // Marking fasted for the first time today — increment streak
                const newStreak = streak + 1;
                await AsyncStorage.setItem(streakKey, String(newStreak));
                await AsyncStorage.setItem(streakDateKey, today);
                setStreak(newStreak);
            } else if (!newVal && lastStreakDate === today) {
                // Unmarking fasted for today — undo this day's streak increment
                const newStreak = Math.max(0, streak - 1);
                await AsyncStorage.setItem(streakKey, String(newStreak));
                await AsyncStorage.removeItem(streakDateKey);
                setStreak(newStreak);
            }
        } catch (e) {
            console.warn('[Noor/Ramadan] Toggle fasted failed:', e);
        }
    };

    const adjustPages = async (delta: number) => {
        const next = Math.max(0, Math.min(604, pagesRead + delta)); // 604 pages in Quran
        setPagesRead(next);
        await AsyncStorage.setItem(pagesKey(), String(next)).catch(() => {});
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
    // Hijri month index 8 = Ramadan (1-indexed: 9). Outside Ramadan we still want the
    // tracker available (voluntary fasts: Mondays/Thursdays, Ayyamul Beed, Ashura, etc.)
    // but the header should reflect the actual month — saying "Ramadan" during Shawwal
    // confused users (#26).
    const isRamadan = moment().iMonth() === 8;
    const screenTitle = isRamadan ? 'Ramadan' : 'Fasting Tracker';

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, backgroundColor: theme.bg }]}>
                <ActivityIndicator color={theme.gold} size="large" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Fetching fasting times…</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={goBack}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{screenTitle}</Text>
                    {locationName ? <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{locationName}</Text> : null}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Hijri Date */}
                <Text style={[styles.hijriDate, { color: theme.gold }]}>{hijriDate}</Text>

                {/* Fast Progress Ring */}
                <View style={styles.ringSection}>
                    <View style={styles.ringWrapper}>
                        <ProgressRing pct={fastPct} size={200} color={theme.gold} />
                        <View style={styles.ringCenter}>
                            <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>{isFasting ? 'Fasting' : now < (timings?.sehriDate ?? now) ? 'Sehri' : 'Iftar'}</Text>
                            <Text style={[styles.ringTime, { color: theme.textPrimary }]}>
                                {isFasting ? timeToIftar : now < (timings?.sehriDate ?? now) ? timeToSehri : '—'}
                            </Text>
                            <Text style={[styles.ringSubLabel, { color: theme.textSecondary }]}>{isFasting ? 'until Iftar' : 'remaining'}</Text>
                        </View>
                    </View>
                </View>

                {/* Sehri / Iftar Times */}
                <View style={[styles.timingsRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={styles.timingCard}>
                        <Feather name="sunrise" size={20} color={theme.gold} style={{ marginBottom: 8 }} />
                        <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Sehri</Text>
                        <Text style={[styles.timingTime, { color: theme.textPrimary }]}>{timings ? formatTime(timings.sehriDate) : '—'}</Text>
                        <Text style={[styles.timingCountdown, { color: theme.gold }]}>{timings && now < timings.sehriDate ? `in ${timeToSehri}` : 'passed'}</Text>
                    </View>
                    <View style={[styles.timingDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.timingCard}>
                        <Feather name="sunset" size={20} color={theme.gold} style={{ marginBottom: 8 }} />
                        <Text style={[styles.timingLabel, { color: theme.textSecondary }]}>Iftar</Text>
                        <Text style={[styles.timingTime, { color: theme.textPrimary }]}>{timings ? formatTime(timings.iftarDate) : '—'}</Text>
                        <Text style={[styles.timingCountdown, { color: theme.gold }]}>{timings && now < timings.iftarDate ? `in ${timeToIftar}` : 'break fast'}</Text>
                    </View>
                </View>

                {/* Notification permission nudge */}
                {notifsDenied && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 12 }}>
                        <Feather name="bell-off" size={14} color={theme.textTertiary} />
                        <Text style={{ fontSize: 12, color: theme.textTertiary, flex: 1 }}>
                            Sehri/Iftar reminders disabled — enable notifications in Settings.
                        </Text>
                    </View>
                )}

                {/* Sehri & Iftar alerts toggle — only fires during the Hijri month of Ramadan */}
                <View style={[styles.notifToggleRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="bell" size={18} color={ramadanNotifEnabled ? theme.gold : theme.textTertiary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '500' }}>Sehri & Iftar alerts</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {isRamadan ? 'Active during Ramadan' : 'Activates when Ramadan begins'}
                        </Text>
                    </View>
                    <Switch
                        value={ramadanNotifEnabled}
                        onValueChange={toggleRamadanNotif}
                        trackColor={{ false: theme.border, true: theme.gold }}
                        thumbColor={'#FFFFFF'}
                        ios_backgroundColor={theme.border}
                    />
                </View>

                {/* Today's Fast Toggle */}
                <TouchableOpacity
                    style={[styles.fastToggle, { borderColor: theme.borderStrong }, fasted && { backgroundColor: theme.gold, borderColor: theme.gold }]}
                    onPress={toggleFasted}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityLabel="Mark today as fasted"
                    accessibilityState={{ checked: fasted }}
                >
                    <Feather name={fasted ? 'check-circle' : 'circle'} size={24} color={fasted ? theme.textInverse : theme.gold} />
                    <Text style={[styles.fastToggleText, { color: theme.gold }, fasted && { color: theme.textInverse }]}>
                        {fasted ? 'Fasting today ✓' : 'Mark today as fasted'}
                    </Text>
                </TouchableOpacity>

                {/* Streak */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{streak}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                        <Feather name="zap" size={16} color={theme.gold} style={{ marginTop: 4 }} />
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <View style={styles.pagesRow}>
                            <TouchableOpacity
                                onPress={() => adjustPages(-1)}
                                style={styles.pageBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease pages read"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="minus" size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{pagesRead}</Text>
                            <TouchableOpacity
                                onPress={() => adjustPages(1)}
                                style={styles.pageBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Increase pages read"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Feather name="plus" size={16} color={theme.gold} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pages Read Today</Text>
                        <Text style={[styles.statSub, { color: theme.textTertiary }]}>{604 - pagesRead} pages to Khatm</Text>
                    </View>
                </View>

                {/* Dua for Breaking Fast */}
                <View style={[styles.duaCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.duaTitle, { color: theme.gold }]}>Dua for Breaking Fast</Text>
                    <Text style={[styles.duaArabic, { color: theme.textPrimary }]}>اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ</Text>
                    <View style={[styles.duaDivider, { backgroundColor: theme.border }]} />
                    <Text style={[styles.duaTranslation, { color: theme.textSecondary }]}>"O Allah! I fasted for You, and I believe in You, and I put my trust in You, and with Your sustenance I break my fast."</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingText: { marginTop: 16, fontSize: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 64 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerTitle: { fontSize: 22, fontWeight: '500', textAlign: 'center' },
    headerSub: { fontSize: 13, textAlign: 'center', marginTop: 2 },
    scroll: { paddingBottom: 60 },
    hijriDate: { fontSize: 14, textAlign: 'center', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    ringSection: { alignItems: 'center', marginVertical: 16 },
    ringWrapper: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    ringCenter: { position: 'absolute', alignItems: 'center' },
    ringLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    ringTime: { fontSize: 32, fontWeight: '300', marginVertical: 4 },
    ringSubLabel: { fontSize: 11 },
    timingsRow: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
    notifToggleRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
    timingCard: { flex: 1, alignItems: 'center' },
    timingDivider: { width: 1 },
    timingLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    timingTime: { fontSize: 22, fontWeight: '300' },
    timingCountdown: { fontSize: 12, marginTop: 4 },
    fastToggle: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16,
        gap: 14, padding: 18, borderRadius: 20, borderWidth: 1,
        backgroundColor: 'rgba(201,168,76,0.05)',
    },
    fastToggleText: { fontSize: 16, fontWeight: '600' },
    statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center' },
    statNumber: { fontSize: 36, fontWeight: '300' },
    statLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    statSub: { fontSize: 11, marginTop: 4 },
    pagesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageBtn: { padding: 6 },
    duaCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 24 },
    duaTitle: { fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
    duaArabic: {
        fontSize: 22, lineHeight: 40, textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        includeFontPadding: false,
    },
    duaDivider: { height: 1, marginVertical: 16 },
    duaTranslation: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
