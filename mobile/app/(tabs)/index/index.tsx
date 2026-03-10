import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Animated, Easing, Modal, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import moment from 'moment-hijri';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../../../context/DatabaseContext';

// ─── AlAdhan API ──────────────────────────────────────────────────────────────
const ALADHAN_API = 'https://api.aladhan.com/v1';

// ─── Prayer settings persistence ─────────────────────────────────────────────
const PRAYER_SETTINGS_KEY = '@prayer_settings';
const NOTIF_PREFS_KEY = '@notif_prefs';
const DEFAULT_NOTIF_PREFS = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

// ─── Quick actions with fixed Islamic-themed gradients ────────────────────────
const QUICK_ACTIONS = [
    { title: 'Salah',   icon: 'user',       route: '/salah',  gradient: ['#4A2C6E', '#7B4FA6'] as const },
    { title: 'Tasbih',  icon: 'refresh-cw', route: '/tasbih', gradient: ['#1A5C38', '#2E9D60'] as const },
    { title: 'Zakat',   icon: 'heart',      route: '/zakat',  gradient: ['#92650A', '#C9A84C'] as const },
    { title: 'Duas',    icon: 'book-open',  route: '/duas',   gradient: ['#1B3A6B', '#2B6CB0'] as const },
];

// ─── Calculation methods exposed to users ────────────────────────────────────
// id: -1 = Auto (country-based), others map to AlAdhan method IDs
const CALC_METHODS = [
    { id: -1,  name: 'Auto (location-based)',    region: 'Recommended' },
    { id: 3,   name: 'Muslim World League',       region: 'Global / Default' },
    { id: 1,   name: 'Univ. of Karachi',          region: 'South Asia' },
    { id: 2,   name: 'ISNA',                      region: 'North America' },
    { id: 4,   name: 'Umm Al-Qura, Makkah',       region: 'Saudi Arabia / Gulf' },
    { id: 5,   name: 'Egyptian Authority',         region: 'Egypt / North Africa' },
    { id: 7,   name: 'Tehran',                     region: 'Iran' },
    { id: 16,  name: 'Jafari / Shia',              region: 'Shia Muslims' },
];

// ─── BigDataCloud Reverse Geocoding ──────────────────────────────────────────
const reverseGeocode = async (lat: number, lon: number): Promise<{ locality: string; countryCode: string }> => {
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    return { locality: d.locality || d.city || d.principalSubdivision || '', countryCode: d.countryCode || '' };
};

// ─── Country → method mapping ─────────────────────────────────────────────────
const COUNTRY_METHODS: Record<string, { method: number; school: number }> = {
    PK: { method: 1, school: 1 }, BD: { method: 1, school: 1 },
    AF: { method: 1, school: 1 }, IN: { method: 1, school: 0 },
    SA: { method: 4, school: 0 }, AE: { method: 8, school: 0 },
    KW: { method: 9, school: 0 }, QA: { method: 10, school: 0 },
    BH: { method: 8, school: 0 }, OM: { method: 8, school: 0 },
    YE: { method: 4, school: 0 }, EG: { method: 5, school: 0 },
    MA: { method: 21, school: 0 }, DZ: { method: 19, school: 0 },
    TN: { method: 18, school: 0 }, LY: { method: 3, school: 0 },
    JO: { method: 23, school: 0 }, SY: { method: 5, school: 0 },
    IQ: { method: 3, school: 0 }, LB: { method: 3, school: 0 },
    PS: { method: 3, school: 0 }, IR: { method: 7, school: 0 },
    TR: { method: 13, school: 1 }, ID: { method: 20, school: 0 },
    MY: { method: 17, school: 0 }, SG: { method: 11, school: 0 },
    KZ: { method: 14, school: 1 }, UZ: { method: 1, school: 1 },
    US: { method: 2, school: 0 }, CA: { method: 2, school: 0 },
    GB: { method: 15, school: 0 }, FR: { method: 12, school: 0 },
    DE: { method: 3, school: 0 }, NL: { method: 3, school: 0 },
    BE: { method: 3, school: 0 }, RU: { method: 14, school: 1 },
    AU: { method: 3, school: 0 }, NZ: { method: 3, school: 0 },
};
const DEFAULT_METHOD = { method: 3, school: 0 }; // MWL fallback

// Cache key includes method+school so changing settings doesn't serve stale data
const prayerCacheKey = (lat: number, lng: number, method: number, school: number) => {
    const date = new Date().toISOString().split('T')[0];
    return `@prayer_${date}_${Math.round(lat * 100)}_${Math.round(lng * 100)}_m${method}_s${school}`;
};

const fetchAlAdhan = async (lat: number, lng: number, method: number, school: number, date?: Date) => {
    const ts = date ? Math.floor(date.getTime() / 1000) : Math.floor(Date.now() / 1000);
    const url = `${ALADHAN_API}/timings/${ts}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AlAdhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error('AlAdhan API error');
    return json.data;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabase();

    const [loading, setLoading] = useState(true);
    const [prayers, setPrayers] = useState<any[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [currentPrayerId, setCurrentPrayerId] = useState('none');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);
    const [locationName, setLocationName] = useState('Locating...');
    const [greeting, setGreeting] = useState('As-salamu alaykum');
    const [hijriDate, setHijriDate] = useState('');
    const [completedPrayers, setCompletedPrayers] = useState<string[]>([]);
    const [envGradient, setEnvGradient] = useState<readonly [string, string, ...string[]]>(['#FF9A9E', '#FECFEF']);
    const [themeTextColor, setThemeTextColor] = useState('#FFFFFF');
    const [themeSubTextColor, setThemeSubTextColor] = useState('rgba(255,255,255,0.8)');
    const [dayAya, setDayAya] = useState<{ arabic: string; translation: string; surahName: string; surahNumber: number; numberInSurah: number } | null>(null);

    // Prayer settings — { method: -1 means Auto, school: 0=Standard 1=Hanafi }
    const [prayerSettings, setPrayerSettings] = useState<{ method: number; school: number }>({ method: -1, school: 0 });
    const [showPrayerSettings, setShowPrayerSettings] = useState(false);
    // Draft values used inside the modal before applying
    const [draftMethod, setDraftMethod] = useState(-1);
    const [draftSchool, setDraftSchool] = useState(0);

    // Notification prefs
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(DEFAULT_NOTIF_PREFS);

    // Refs for cross-call persistence without triggering re-renders
    const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
    const autoMethodRef = useRef<{ method: number; school: number }>(DEFAULT_METHOD);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const tomorrowFajrRef = useRef<Date | null>(null);

    const pulseAnim = useRef(new Animated.Value(0)).current;

    const todayStorageKey = `prayers_completed_${new Date().toDateString()}`;

    const loadCompletedPrayers = async () => {
        try {
            const stored = await AsyncStorage.getItem(todayStorageKey);
            if (stored) setCompletedPrayers(JSON.parse(stored));
        } catch { }
    };

    const togglePrayer = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newList = completedPrayers.includes(id) ? completedPrayers.filter(p => p !== id) : [...completedPrayers, id];
        setCompletedPrayers(newList);
        try { await AsyncStorage.setItem(todayStorageKey, JSON.stringify(newList)); } catch { }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // ── Core prayer loading — called on mount and when settings change ─────────
    const loadPrayers = useCallback(async (lat: number, lng: number, method: number, school: number) => {
        // Clear any existing countdown timer
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        const coordinates = new Coordinates(lat, lng);

        // Adhan.js offline params (mapped from AlAdhan method ID)
        let offlineParams = method === 1 ? CalculationMethod.Karachi()
            : method === 2 ? CalculationMethod.NorthAmerica()
                : CalculationMethod.MuslimWorldLeague();
        if (school === 1) offlineParams.madhab = Madhab.Hanafi;

        const { status: finalStatus } = await Notifications.getPermissionsAsync();

        let todayPrayers: any = null;
        let tomorrowFajr: Date | null = null;
        const nowTime = new Date().getTime();
        let hijriString = '';

        // ── Daily cache (includes method+school so method changes bust cache) ──
        const cacheKey = prayerCacheKey(lat, lng, method, school);
        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const { prayers: cp, hijri: ch, tomorrowFajrMs } = JSON.parse(cached);
                todayPrayers = {
                    Fajr: new Date(cp.Fajr), Dhuhr: new Date(cp.Dhuhr),
                    Asr: new Date(cp.Asr), Maghrib: new Date(cp.Maghrib), Isha: new Date(cp.Isha),
                };
                hijriString = ch;
                tomorrowFajr = tomorrowFajrMs ? new Date(tomorrowFajrMs) : null;
            }
        } catch { }

        // ── Offline calculation (adhan.js) — always primary ───────────────────
        if (!todayPrayers) {
            const offlineTimes    = new PrayerTimes(coordinates, new Date(), offlineParams);
            const offlineTomorrow = new PrayerTimes(coordinates, (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), offlineParams);
            todayPrayers = {
                Fajr: offlineTimes.fajr, Dhuhr: offlineTimes.dhuhr,
                Asr: offlineTimes.asr, Maghrib: offlineTimes.maghrib, Isha: offlineTimes.isha,
            };
            tomorrowFajr   = offlineTomorrow.fajr;
            hijriString    = moment().format('iD iMMMM iYYYY').toUpperCase();

            // Cache offline result so subsequent loads are instant
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                prayers: {
                    Fajr: todayPrayers.Fajr.getTime(), Dhuhr: todayPrayers.Dhuhr.getTime(),
                    Asr: todayPrayers.Asr.getTime(), Maghrib: todayPrayers.Maghrib.getTime(),
                    Isha: todayPrayers.Isha.getTime(),
                },
                hijri: hijriString,
                tomorrowFajrMs: tomorrowFajr?.getTime() ?? null,
            })).catch(() => {});

            // Try to enrich hijri string from AlAdhan in background (non-blocking)
            fetchAlAdhan(lat, lng, method, school).then(td => {
                const h = td?.date?.hijri;
                if (h) {
                    const richHijri = `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
                    setHijriDate(richHijri);
                }
            }).catch(() => {});
        }

        setHijriDate(hijriString);

        const list = [
            { id: 'fajr',    name: 'Fajr',    time: moment(todayPrayers.Fajr).format('hh:mm A'),    date: todayPrayers.Fajr,    icon: 'sunrise' },
            { id: 'dhuhr',   name: 'Dhuhr',   time: moment(todayPrayers.Dhuhr).format('hh:mm A'),   date: todayPrayers.Dhuhr,   icon: 'sun' },
            { id: 'asr',     name: 'Asr',     time: moment(todayPrayers.Asr).format('hh:mm A'),     date: todayPrayers.Asr,     icon: 'cloud' },
            { id: 'maghrib', name: 'Maghrib', time: moment(todayPrayers.Maghrib).format('hh:mm A'), date: todayPrayers.Maghrib, icon: 'sunset' },
            { id: 'isha',    name: 'Isha',    time: moment(todayPrayers.Isha).format('hh:mm A'),    date: todayPrayers.Isha,    icon: 'moon' },
        ];

        let activePrayerId = 'none';
        let nextId = 'none';
        for (let i = 0; i < list.length; i++) {
            if (nowTime >= list[i].date.getTime()) activePrayerId = list[i].id;
            if (nowTime < list[i].date.getTime() && nextId === 'none') nextId = list[i].id;
        }

        let txtColor = '#FFFFFF';
        let subTxtColor = 'rgba(255,255,255,0.8)';
        if (activePrayerId === 'fajr') {
            setEnvGradient(['#E6E6FA', '#E0F2F7']);
            txtColor = '#1B3022'; subTxtColor = 'rgba(27,48,34,0.7)';
        } else if (activePrayerId === 'dhuhr') {
            setEnvGradient(['#f4d125', '#f97316']);
            txtColor = '#142d1a'; subTxtColor = 'rgba(20,45,26,0.8)';
        } else if (activePrayerId === 'asr') {
            setEnvGradient(['#fefce8', '#fef3c7']);
            txtColor = '#1E293B'; subTxtColor = 'rgba(30,41,59,0.7)';
        } else if (activePrayerId === 'maghrib') {
            setEnvGradient(['#ff7e5f', '#feb47b', '#86a8e7']);
        } else {
            setEnvGradient(['#3b458a', '#1e244d']);
        }
        setThemeTextColor(txtColor);
        setThemeSubTextColor(subTxtColor);
        setCurrentPrayerId(activePrayerId);

        setPrayers(list.map(p => ({ ...p, isNext: p.id === nextId })));
        await loadCompletedPrayers();

        // Store tomorrow Fajr for use in notification toggle
        tomorrowFajrRef.current = tomorrowFajr;

        // ── Schedule notifications ────────────────────────────────────────────
        if (finalStatus === 'granted') {
            let prefs = DEFAULT_NOTIF_PREFS as Record<string, boolean>;
            try {
                const saved = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
                if (saved) prefs = JSON.parse(saved);
            } catch { }
            await Notifications.cancelAllScheduledNotificationsAsync();
            const nowMs = new Date().getTime();
            for (const prayer of list) {
                if (prefs[prayer.id] && prayer.date.getTime() > nowMs) {
                    try {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: `Time for ${prayer.name}`,
                                body: `It is currently time to pray ${prayer.name}. Come to prayer, come to success.`,
                                sound: true, color: '#C9A84C',
                            },
                            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.date },
                        });
                    } catch { }
                }
            }
            if (prefs['fajr'] && tomorrowFajr && tomorrowFajr.getTime() > nowMs) {
                try {
                    await Notifications.scheduleNotificationAsync({
                        content: { title: 'Time for Fajr', body: 'Fajr time has begun. Rise for prayer, come to success.', sound: true, color: '#C9A84C' },
                        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrowFajr },
                    });
                } catch { }
            }
        }

        // ── Countdown timer ───────────────────────────────────────────────────
        let activeNextId = nextId;
        let activeNextTime: Date;

        if (!activeNextId || activeNextId === 'none') {
            activeNextId = 'fajr';
            if (tomorrowFajr) {
                activeNextTime = tomorrowFajr;
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                activeNextTime = new PrayerTimes(coordinates, tomorrow, offlineParams).fajr;
            }
            setNextPrayerName('Fajr');
        } else {
            activeNextTime = list.find(p => p.id === activeNextId)!.date;
            setNextPrayerName(activeNextId.charAt(0).toUpperCase() + activeNextId.slice(1));
        }

        const previousMs = activePrayerId === 'none'
            ? new Date().setHours(0, 0, 0, 0)
            : list.find(p => p.id === activePrayerId)!.date.getTime();

        const totalDuration = activeNextTime.getTime() - previousMs;

        const updateTimer = () => {
            const now = new Date().getTime();
            const diff = activeNextTime.getTime() - now;
            if (diff <= 0) {
                setCountdown('0h 0m');
                setFillPercentage(1);
            } else {
                const d = moment.duration(diff);
                setCountdown(`${Math.floor(d.asHours())}h ${d.minutes()}m`);
                setFillPercentage(Math.max(0, Math.min(1, (now - previousMs) / totalDuration)));
            }
        };
        updateTimer();
        timerIntervalRef.current = setInterval(updateTimer, 60000);

        setLoading(false);
    }, []);

    // ── Startup: daily aya + pulse animation + location → load prayers ─────────
    useEffect(() => {
        setGreeting(getGreeting());

        // Daily Aya — SQLite primary, no network required
        (async () => {
            const dateStr = new Date().toISOString().split('T')[0];
            const ayaKey = `@daily_aya_${dateStr}`;
            try {
                const cached = await AsyncStorage.getItem(ayaKey);
                if (cached) {
                    setDayAya(JSON.parse(cached));
                    return;
                }
                if (!db) return;
                const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
                // Map deterministic day → global ayah index (1-based, wraps over 6236 ayahs)
                const globalAyahIdx = (dayOfYear % 6236) + 1;
                // SQLite ayahs table uses (surah_id, ayah_number) — derive from global index
                // ayahs are ordered globally as inserted (surah 1 ayah 1 = row 1, etc.)
                const row = await db.getFirstAsync(
                    `SELECT a.ayah_number, a.text_arabic, a.text_english, s.name_english, s.id as surah_id
                     FROM ayahs a JOIN surahs s ON s.id = a.surah_id
                     ORDER BY a.id LIMIT 1 OFFSET ?`,
                    [globalAyahIdx - 1]
                ) as any;
                if (row) {
                    const aya = {
                        arabic: row.text_arabic,
                        translation: row.text_english,
                        surahName: row.name_english,
                        surahNumber: row.surah_id,
                        numberInSurah: row.ayah_number,
                    };
                    setDayAya(aya);
                    AsyncStorage.setItem(ayaKey, JSON.stringify(aya)).catch(() => { });
                }
            } catch { }
        })();

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        // Load notification prefs
        AsyncStorage.getItem(NOTIF_PREFS_KEY).then(saved => {
            if (saved) setNotifPrefs(JSON.parse(saved));
        }).catch(() => { });

        // Location + prayer loading
        (async () => {
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                setLocationName('Location Denied');
                setLoading(false);
                return;
            }

            let location;
            try {
                location = await Location.getCurrentPositionAsync({});
            } catch {
                location = { coords: { latitude: 21.4225, longitude: 39.8262 } };
            }

            const { latitude, longitude } = location.coords;

            let isoCode = '';
            try {
                const geo = await reverseGeocode(latitude, longitude);
                setLocationName(geo.locality || 'Locating...');
                isoCode = geo.countryCode;
            } catch {
                setLocationName(latitude === 21.4225 ? 'Makkah' : 'Locating...');
            }

            // Store location for later (settings change re-fetch)
            coordsRef.current = { lat: latitude, lng: longitude };
            autoMethodRef.current = COUNTRY_METHODS[isoCode] ?? DEFAULT_METHOD;

            // Read user-saved settings (overrides auto)
            let effectiveMethod = autoMethodRef.current.method;
            let effectiveSchool = autoMethodRef.current.school;
            try {
                const saved = await AsyncStorage.getItem(PRAYER_SETTINGS_KEY);
                if (saved) {
                    const s: { method: number; school: number } = JSON.parse(saved);
                    setPrayerSettings(s);
                    setDraftMethod(s.method);
                    setDraftSchool(s.school);
                    if (s.method !== -1) {
                        effectiveMethod = s.method;
                        effectiveSchool = s.school;
                    }
                }
            } catch { }

            await loadPrayers(latitude, longitude, effectiveMethod, effectiveSchool);
        })();

        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, []);

    // ── Apply settings: save + re-fetch prayer times ───────────────────────────
    const applyPrayerSettings = async () => {
        const settings = { method: draftMethod, school: draftSchool };
        try { await AsyncStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(settings)); } catch { }
        setPrayerSettings(settings);
        setShowPrayerSettings(false);

        if (!coordsRef.current) return;
        const { lat, lng } = coordsRef.current;
        const effectiveMethod = draftMethod === -1 ? autoMethodRef.current.method : draftMethod;
        const effectiveSchool = draftMethod === -1 ? autoMethodRef.current.school : draftSchool;
        loadPrayers(lat, lng, effectiveMethod, effectiveSchool);
    };

    const toggleNotif = async (id: string) => {
        const newPrefs = { ...notifPrefs, [id]: !notifPrefs[id] };
        setNotifPrefs(newPrefs);
        try { await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(newPrefs)); } catch { }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        const nowMs = Date.now();
        for (const prayer of prayers) {
            if (newPrefs[prayer.id] && prayer.date.getTime() > nowMs) {
                try {
                    await Notifications.scheduleNotificationAsync({
                        content: { title: `Time for ${prayer.name}`, body: `It is time to pray ${prayer.name}. Come to prayer, come to success.`, sound: true, color: '#C9A84C' },
                        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.date },
                    });
                } catch { }
            }
        }
        if (newPrefs['fajr'] && tomorrowFajrRef.current && tomorrowFajrRef.current.getTime() > nowMs) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: { title: 'Time for Fajr', body: 'Fajr time has begun. Rise for prayer, come to success.', sound: true, color: '#C9A84C' },
                    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrowFajrRef.current },
                });
            } catch { }
        }
    };

    const openPrayerSettings = () => {
        // Sync draft to current saved settings before opening
        setDraftMethod(prayerSettings.method);
        setDraftSchool(prayerSettings.school);
        setShowPrayerSettings(true);
    };

    // ── SVG ring ──────────────────────────────────────────────────────────────
    const animatedScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
    const animatedOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (fillPercentage * circumference);

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#FF9A9E" />
            </View>
        );
    }

    const currentMethodName = prayerSettings.method === -1
        ? `Auto · ${CALC_METHODS.find(m => m.id === autoMethodRef.current.method)?.name ?? 'MWL'}`
        : CALC_METHODS.find(m => m.id === prayerSettings.method)?.name ?? 'Custom';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.profileAvatar, { backgroundColor: 'rgba(244, 209, 37, 0.2)' }]}>
                        <Feather name="user" size={24} color={envGradient[0]} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Noor</Text>
                        <Text style={styles.headerSubtitle}>{greeting}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/discover/ask' as any)}>
                        <Feather name="search" size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={() => setShowNotifModal(true)}>
                        <Feather name="bell" size={20} color="#1A1A1A" />
                        {Object.values(notifPrefs).some(v => v) && <View style={styles.notificationDot} />}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Prayer Hero */}
                <View style={styles.heroSection}>
                    <LinearGradient colors={envGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                        <Feather name={prayers.find(p => p.id === currentPrayerId)?.icon || 'sun'} size={200} color="rgba(0,0,0,0.06)" style={styles.heroBgIcon} />
                        <View style={styles.heroContent}>
                            <View style={styles.heroTag}>
                                <Feather name="sun" size={14} color={themeTextColor} />
                                <Text style={[styles.heroTagText, { color: themeTextColor }]}>CURRENT PRAYER</Text>
                            </View>
                            <Text style={[styles.heroPrayerName, { color: themeTextColor }]}>
                                {currentPrayerId && currentPrayerId !== 'none' ? prayers.find(p => p.id === currentPrayerId)?.name : 'Isha'}
                            </Text>
                            <Text style={[styles.heroPrayerTime, { color: themeTextColor }]}>
                                {currentPrayerId && currentPrayerId !== 'none' ? prayers.find(p => p.id === currentPrayerId)?.time : ''}
                            </Text>
                            <View style={[styles.heroNextBox, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                                <View style={styles.heroNextLeft}>
                                    <Feather name="clock" size={16} color={themeTextColor} />
                                    <Text style={[styles.heroNextText, { color: themeTextColor }]}>Next: {nextPrayerName} in {countdown}</Text>
                                </View>
                                <TouchableOpacity style={[styles.heroRemindBtn, { backgroundColor: '#142d1a' }]}>
                                    <Text style={[styles.heroRemindBtnText, { color: '#FFFFFF' }]}>REMIND ME</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <View style={styles.quickActionsGrid}>
                        {QUICK_ACTIONS.map((tool, idx) => (
                            <View key={idx} style={styles.quickToolItem}>
                                <TouchableOpacity onPress={() => router.push(tool.route as any)} activeOpacity={0.82}>
                                    <LinearGradient colors={tool.gradient} style={styles.quickToolIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <Feather name={tool.icon as any} size={26} color="#FFFFFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                                <Text style={styles.quickToolText}>{tool.title}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Prayer Times List */}
                <View style={styles.prayersListContainer}>
                    <View style={styles.prayersListHeader}>
                        <Text style={styles.prayerListTitle}>Prayer Times</Text>
                        {/* Location tag + settings gear */}
                        <View style={styles.prayerHeaderRight}>
                            <View style={styles.locationTag}>
                                <Feather name="map-pin" size={12} color={envGradient[0]} style={{ marginRight: 4 }} />
                                <Text style={[styles.locationTagName, { color: envGradient[0] }]}>{locationName}</Text>
                            </View>
                            <TouchableOpacity style={styles.settingsGear} onPress={openPrayerSettings}>
                                <Feather name="settings" size={16} color="#5A5A5A" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Active calculation method pill */}
                    <TouchableOpacity style={styles.methodPill} onPress={openPrayerSettings}>
                        <Feather name="sliders" size={11} color="#5A5A5A" />
                        <Text style={styles.methodPillText}>{currentMethodName}</Text>
                        <Feather name="chevron-right" size={11} color="#A0A0A0" />
                    </TouchableOpacity>

                    <View style={styles.prayersList}>
                        {prayers.map((prayer) => {
                            const isActive = prayer.id === currentPrayerId || (currentPrayerId === 'none' && prayer.id === 'isha');
                            return (
                                <View
                                    key={prayer.name}
                                    style={[
                                        styles.prayerListItem,
                                        isActive && [styles.prayerListItemActive, { borderColor: envGradient[0], backgroundColor: 'rgba(244, 209, 37, 0.15)' }]
                                    ]}
                                >
                                    <View style={styles.prayerListLeft}>
                                        <Feather name={prayer.icon as any} size={20} color={isActive ? envGradient[0] : '#A0A0A0'} />
                                        <Text style={[styles.prayerListName, isActive && { color: '#1A1A1A', fontWeight: 'bold' }]}>
                                            {prayer.name}
                                        </Text>
                                    </View>
                                    <View style={styles.prayerListRight}>
                                        <Text style={[styles.prayerListTime, isActive && { color: '#1A1A1A', fontWeight: 'bold' }]}>
                                            {prayer.time}
                                        </Text>
                                        {isActive && <Feather name="bell" size={14} color={envGradient[0]} style={{ marginLeft: 8 }} />}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Verse of the Day */}
                {dayAya && (
                    <View style={styles.verseSection}>
                        <Text style={styles.prayerListTitle}>Verse of the Day</Text>
                        <View style={styles.verseCard}>
                            <Text style={styles.verseArabicText}>{dayAya.arabic}</Text>
                            <Text style={styles.verseText}>"{dayAya.translation}"</Text>
                            <View style={styles.verseFooter}>
                                <Text style={[styles.verseRef, { color: envGradient[0] }]}>
                                    SURAH {dayAya.surahName.toUpperCase()} [{dayAya.surahNumber}:{dayAya.numberInSurah}]
                                </Text>
                                <View style={styles.verseActions}>
                                    <Feather name="share-2" size={18} color="#FFFFFF" style={{ marginRight: 16 }} />
                                    <Feather name="bookmark" size={18} color="#FFFFFF" />
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ── Notification Settings Bottom Sheet ───────────────────────── */}
            <Modal
                visible={showNotifModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNotifModal(false)}
            >
                <View style={styles.sheetOverlay}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={styles.sheetTitle}>Prayer Notifications</Text>
                                <Text style={styles.sheetSubtitle}>Toggle alerts for each prayer</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowNotifModal(false)} style={styles.sheetCloseBtn}>
                                <Feather name="x" size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>
                        {[
                            { id: 'fajr',    name: 'Fajr',    icon: 'sunrise', time: prayers.find(p => p.id === 'fajr')?.time },
                            { id: 'dhuhr',   name: 'Dhuhr',   icon: 'sun',     time: prayers.find(p => p.id === 'dhuhr')?.time },
                            { id: 'asr',     name: 'Asr',     icon: 'cloud',   time: prayers.find(p => p.id === 'asr')?.time },
                            { id: 'maghrib', name: 'Maghrib', icon: 'sunset',  time: prayers.find(p => p.id === 'maghrib')?.time },
                            { id: 'isha',    name: 'Isha',    icon: 'moon',    time: prayers.find(p => p.id === 'isha')?.time },
                        ].map(p => (
                            <View key={p.id} style={styles.notifRow}>
                                <View style={[styles.notifIcon, { backgroundColor: notifPrefs[p.id] ? '#f4d12520' : '#F0EDE620' }]}>
                                    <Feather name={p.icon as any} size={18} color={notifPrefs[p.id] ? '#f4d125' : '#B0A88A'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.notifPrayerName}>{p.name}</Text>
                                    {p.time && <Text style={styles.notifPrayerTime}>{p.time}</Text>}
                                </View>
                                <Switch
                                    value={!!notifPrefs[p.id]}
                                    onValueChange={() => toggleNotif(p.id)}
                                    trackColor={{ false: '#E4DCC8', true: '#f4d125' }}
                                    thumbColor={notifPrefs[p.id] ? '#FFFFFF' : '#FFFFFF'}
                                    ios_backgroundColor="#E4DCC8"
                                />
                            </View>
                        ))}
                        <View style={styles.notifFooter}>
                            <Feather name="info" size={13} color="#B0A88A" />
                            <Text style={styles.notifFooterText}>Notifications require device permission to be granted.</Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Prayer Settings Bottom Sheet ──────────────────────────────── */}
            <Modal
                visible={showPrayerSettings}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPrayerSettings(false)}
            >
                <View style={styles.sheetOverlay}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
                        {/* Handle */}
                        <View style={styles.sheetHandle} />

                        {/* Header */}
                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={styles.sheetTitle}>Prayer Time Settings</Text>
                                <Text style={styles.sheetSubtitle}>Changes apply immediately</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPrayerSettings(false)} style={styles.sheetCloseBtn}>
                                <Feather name="x" size={20} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>

                        {/* Calculation Method */}
                        <Text style={styles.sheetSectionLabel}>CALCULATION METHOD</Text>
                        <ScrollView style={styles.methodScrollList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                            {CALC_METHODS.map(m => {
                                const isSelected = draftMethod === m.id;
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[styles.methodRow, isSelected && styles.methodRowActive]}
                                        onPress={() => setDraftMethod(m.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.methodRadio, isSelected && styles.methodRadioActive]}>
                                            {isSelected && <View style={styles.methodRadioDot} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.methodName, isSelected && { color: '#1A1A1A', fontWeight: '700' }]}>
                                                {m.name}
                                            </Text>
                                            <Text style={styles.methodRegion}>{m.region}</Text>
                                        </View>
                                        {isSelected && <Feather name="check" size={16} color="#f4d125" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Asr Juristic Method (only when a specific method is chosen) */}
                        {draftMethod !== -1 && (
                            <View>
                                <Text style={[styles.sheetSectionLabel, { marginTop: 16 }]}>ASR CALCULATION</Text>
                                <View style={styles.asrToggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.asrOption, draftSchool === 0 && styles.asrOptionActive]}
                                        onPress={() => setDraftSchool(0)}
                                    >
                                        <Text style={[styles.asrOptionTitle, draftSchool === 0 && styles.asrOptionTitleActive]}>Standard</Text>
                                        <Text style={styles.asrOptionSub}>Shafi'i · Maliki · Hanbali</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.asrOption, draftSchool === 1 && styles.asrOptionActive]}
                                        onPress={() => setDraftSchool(1)}
                                    >
                                        <Text style={[styles.asrOptionTitle, draftSchool === 1 && styles.asrOptionTitleActive]}>Hanafi</Text>
                                        <Text style={styles.asrOptionSub}>Later Asr time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Apply button */}
                        <TouchableOpacity style={styles.applyBtn} onPress={applyPrayerSettings}>
                            <Text style={styles.applyBtnText}>Apply Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: 'rgba(253, 248, 240, 0.95)', zIndex: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: '#8A8A8A', fontWeight: '500' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notificationDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53E3E', borderWidth: 1, borderColor: '#FDF8F0' },
    notifRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDE6' },
    notifIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    notifPrayerName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    notifPrayerTime: { fontSize: 12, color: '#8A8A8A', marginTop: 1 },
    notifFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 4 },
    notifFooterText: { flex: 1, fontSize: 11, color: '#B0A88A', lineHeight: 16 },
    scrollContent: { flexGrow: 1, paddingBottom: 100 },
    heroSection: { paddingHorizontal: 16, paddingTop: 8 },
    heroCard: { borderRadius: 24, padding: 24, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
    heroBgIcon: { position: 'absolute', top: -40, right: -40 },
    heroContent: { position: 'relative', zIndex: 2 },
    heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    heroTagText: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
    heroPrayerName: { fontSize: 42, fontWeight: 'bold', letterSpacing: -1, marginBottom: 4 },
    heroPrayerTime: { fontSize: 18, fontWeight: '500', marginBottom: 32 },
    heroNextBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, paddingLeft: 16, borderRadius: 30 },
    heroNextLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroNextText: { fontSize: 14, fontWeight: '700' },
    heroRemindBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    heroRemindBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    quickActionsContainer: { marginTop: 24, paddingHorizontal: 16 },
    quickActionsGrid: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    quickToolItem: { alignItems: 'center', gap: 10 },
    quickToolIconBox: {
        width: 76, height: 76, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    },
    quickToolIconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quickToolText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
    prayersListContainer: { marginTop: 32, paddingHorizontal: 16 },
    prayersListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    prayerListTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    prayerHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    locationTag: { flexDirection: 'row', alignItems: 'center' },
    locationTagName: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    settingsGear: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFEFEF', alignItems: 'center', justifyContent: 'center' },
    methodPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
        backgroundColor: '#EFEFEF', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, marginBottom: 14,
    },
    methodPillText: { fontSize: 11, color: '#5A5A5A', fontWeight: '600' },
    prayersList: { gap: 12 },
    prayerListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
    prayerListItemActive: { borderWidth: 2 },
    prayerListLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    prayerListName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    prayerListRight: { flexDirection: 'row', alignItems: 'center' },
    prayerListTime: { fontSize: 15, fontWeight: '500', color: '#5A5A5A' },
    verseSection: { marginTop: 32, paddingHorizontal: 16 },
    verseCard: { backgroundColor: '#0E2B12', padding: 24, borderRadius: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    verseArabicText: { fontSize: 26, color: '#FFFFFF', lineHeight: 46, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', marginBottom: 20 },
    verseText: { fontSize: 16, fontWeight: '400', color: '#FFFFFF', lineHeight: 26, fontStyle: 'italic', marginBottom: 24 },
    verseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
    verseRef: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    verseActions: { flexDirection: 'row', alignItems: 'center' },
    // ── Prayer Settings Sheet ─────────────────────────────────────────────────
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FAFAFA', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, maxHeight: '85%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    sheetSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
    sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFEFEF', alignItems: 'center', justifyContent: 'center' },
    sheetSectionLabel: { fontSize: 11, fontWeight: '700', color: '#8A8A8A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    methodScrollList: { maxHeight: 280, marginBottom: 4 },
    methodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 4, backgroundColor: '#F4F4F4' },
    methodRowActive: { backgroundColor: 'rgba(244, 209, 37, 0.15)', borderWidth: 1.5, borderColor: '#f4d125' },
    methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCCCCC', alignItems: 'center', justifyContent: 'center' },
    methodRadioActive: { borderColor: '#f4d125' },
    methodRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f4d125' },
    methodName: { fontSize: 14, color: '#3A3A3A', fontWeight: '500' },
    methodRegion: { fontSize: 11, color: '#9A9A9A', marginTop: 1 },
    asrToggleContainer: { flexDirection: 'row', gap: 10 },
    asrOption: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F4F4F4', alignItems: 'center' },
    asrOptionActive: { backgroundColor: 'rgba(244, 209, 37, 0.15)', borderWidth: 1.5, borderColor: '#f4d125' },
    asrOptionTitle: { fontSize: 14, fontWeight: '600', color: '#5A5A5A' },
    asrOptionTitleActive: { color: '#1A1A1A' },
    asrOptionSub: { fontSize: 11, color: '#9A9A9A', marginTop: 3, textAlign: 'center' },
    applyBtn: { backgroundColor: '#1E293B', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    applyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
