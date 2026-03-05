import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Rect, G } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import moment from 'moment-hijri';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Localization from 'expo-localization';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── AlAdhan API ──────────────────────────────────────────────────────────────
const ALADHAN_API = 'https://api.aladhan.com/v1';

// ─── BigDataCloud Reverse Geocoding (free, no key, district-level precision) ──
const reverseGeocode = async (lat: number, lon: number): Promise<{ locality: string; countryCode: string }> => {
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    return {
        locality: d.locality || d.city || d.principalSubdivision || '',
        countryCode: d.countryCode || '',
    };
};

// ISO country code → { method: AlAdhan method ID, school: 0=Shafi'i 1=Hanafi }
// Reference: https://aladhan.com/calculation-methods
const COUNTRY_METHODS: Record<string, { method: number; school: number }> = {
    // South Asia
    PK: { method: 1, school: 1 }, BD: { method: 1, school: 1 },
    AF: { method: 1, school: 1 }, IN: { method: 1, school: 0 },
    // Gulf / Arabian Peninsula
    SA: { method: 4, school: 0 }, AE: { method: 8, school: 0 },
    KW: { method: 9, school: 0 }, QA: { method: 10, school: 0 },
    BH: { method: 8, school: 0 }, OM: { method: 8, school: 0 },
    YE: { method: 4, school: 0 },
    // North Africa
    EG: { method: 5, school: 0 }, MA: { method: 21, school: 0 },
    DZ: { method: 19, school: 0 }, TN: { method: 18, school: 0 },
    LY: { method: 3,  school: 0 },
    // Levant / Middle East
    JO: { method: 23, school: 0 }, SY: { method: 5, school: 0 },
    IQ: { method: 3,  school: 0 }, LB: { method: 3, school: 0 },
    PS: { method: 3,  school: 0 },
    // Iran
    IR: { method: 7, school: 0 },
    // Turkey
    TR: { method: 13, school: 1 },
    // Southeast Asia
    ID: { method: 20, school: 0 }, MY: { method: 17, school: 0 },
    SG: { method: 11, school: 0 },
    // Central Asia
    KZ: { method: 14, school: 1 }, UZ: { method: 1, school: 1 },
    // North America
    US: { method: 2, school: 0 }, CA: { method: 2, school: 0 },
    // Europe
    GB: { method: 15, school: 0 }, FR: { method: 12, school: 0 },
    DE: { method: 3,  school: 0 }, NL: { method: 3, school: 0 },
    BE: { method: 3,  school: 0 },
    // Russia
    RU: { method: 14, school: 1 },
    // Oceania / Rest of World
    AU: { method: 3, school: 0 }, NZ: { method: 3, school: 0 },
};
const DEFAULT_METHOD = { method: 3, school: 0 }; // Muslim World League fallback

// Cache key — unique per day + rough location (avoids stale data & unnecessary refetches)
const prayerCacheKey = (lat: number, lng: number) => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `@prayer_${date}_${Math.round(lat * 10)}_${Math.round(lng * 10)}`;
};

// Fetch timings for a given Unix timestamp (defaults to now)
const fetchAlAdhan = async (lat: number, lng: number, method: number, school: number, date?: Date) => {
    const ts = date ? Math.floor(date.getTime() / 1000) : Math.floor(Date.now() / 1000);
    const url = `${ALADHAN_API}/timings/${ts}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AlAdhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error('AlAdhan API error');
    return json.data;
};

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [prayers, setPrayers] = useState<any[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);
    const [locationName, setLocationName] = useState('Locating...');
    const [greeting, setGreeting] = useState('As-salamu alaykum');
    const [hijriDate, setHijriDate] = useState('');

    const pulseAnim = useRef(new Animated.Value(0)).current;

    const [completedPrayers, setCompletedPrayers] = useState<string[]>([]);
    const [envGradient, setEnvGradient] = useState<readonly [string, string]>(['#FF9A9E', '#FECFEF']); // Dynamic Time Gradient
    const [dayAya, setDayAya] = useState<{ arabic: string; translation: string; surahName: string; surahNumber: number; numberInSurah: number } | null>(null);

    // Unique per day key
    const todayStorageKey = `prayers_completed_${new Date().toDateString()}`;

    const loadCompletedPrayers = async () => {
        try {
            const stored = await AsyncStorage.getItem(todayStorageKey);
            if (stored) {
                setCompletedPrayers(JSON.parse(stored));
            }
        } catch (e) {
            console.warn("Failed to load prayers", e);
        }
    };

    const togglePrayer = async (id: string) => {
        // Physical click feedback!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newList = completedPrayers.includes(id) ? completedPrayers.filter(p => p !== id) : [...completedPrayers, id];
        setCompletedPrayers(newList);

        try {
            await AsyncStorage.setItem(todayStorageKey, JSON.stringify(newList));
        } catch (e) {
            console.error("Failed to save state", e);
        }
    };

    // Calculate dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    useEffect(() => {
        setGreeting(getGreeting());

        // ── Daily Aya (date-deterministic, cached per day) ────────────────
        (async () => {
            const dateStr = new Date().toISOString().split('T')[0];
            const ayaKey = `@daily_aya_${dateStr}`;
            try {
                const cached = await AsyncStorage.getItem(ayaKey);
                if (cached) {
                    setDayAya(JSON.parse(cached));
                } else {
                    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
                    const ayahNumber = (dayOfYear % 6236) + 1;
                    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/editions/quran-uthmani,en.sahih`);
                    const json = await res.json();
                    if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 2) {
                        const aya = {
                            arabic: json.data[0].text,
                            translation: json.data[1].text,
                            surahName: json.data[0].surah.englishName,
                            surahNumber: json.data[0].surah.number,
                            numberInSurah: json.data[0].numberInSurah,
                        };
                        setDayAya(aya);
                        AsyncStorage.setItem(ayaKey, JSON.stringify(aya)).catch(() => {});
                    }
                }
            } catch (_) {}
        })();

        // Start infinite pulsing animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();

        (async () => {
            // Request Notification Permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            // Location Permissions
            let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                setLocationName('Location Denied');
                return;
            }

            let location;
            try {
                location = await Location.getCurrentPositionAsync({});
            } catch (error) {
                console.warn("Location unavailable, falling back to Makkah", error);
                location = { coords: { latitude: 21.4225, longitude: 39.8262 } };
                // Using Makkah coordinates if location is fully denied or unavailable
            }

            const { latitude, longitude } = location.coords;
            const coordinates = new Coordinates(latitude, longitude);

            // ── BigDataCloud: single call for display name + country code ─────
            let resolvedCity = 'Locating...';
            let isoCode = '';
            try {
                const geo = await reverseGeocode(latitude, longitude);
                resolvedCity = geo.locality || 'Locating...';
                isoCode = geo.countryCode;
            } catch (_) {
                resolvedCity = location.coords.latitude === 21.4225 ? 'Makkah' : 'Locating...';
            }
            setLocationName(resolvedCity);
            const { method: apiMethod, school: apiSchool } = COUNTRY_METHODS[isoCode] ?? DEFAULT_METHOD;

            // Adhan.js offline params (school mapped from API school value)
            let offlineParams = apiMethod === 1 ? CalculationMethod.Karachi()
                              : apiMethod === 2 ? CalculationMethod.NorthAmerica()
                              : CalculationMethod.MuslimWorldLeague();
            if (apiSchool === 1) offlineParams.madhab = Madhab.Hanafi;

            let todayPrayers: any = null;
            let tomorrowFajr: Date | null = null;
            let nowTime = new Date().getTime();
            let hijriString = '';

            // ── Check daily cache ─────────────────────────────────────────────
            const cacheKey = prayerCacheKey(latitude, longitude);
            try {
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    const { prayers: cp, hijri: ch, tomorrowFajrMs } = JSON.parse(cached);
                    todayPrayers = {
                        Fajr:    new Date(cp.Fajr),
                        Dhuhr:   new Date(cp.Dhuhr),
                        Asr:     new Date(cp.Asr),
                        Maghrib: new Date(cp.Maghrib),
                        Isha:    new Date(cp.Isha),
                    };
                    hijriString  = ch;
                    tomorrowFajr = tomorrowFajrMs ? new Date(tomorrowFajrMs) : null;
                }
            } catch {}

            // ── Fetch from AlAdhan API (today + tomorrow in parallel) ─────────
            if (!todayPrayers) {
                try {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const [todayResult, tomorrowResult] = await Promise.allSettled([
                        fetchAlAdhan(latitude, longitude, apiMethod, apiSchool),
                        fetchAlAdhan(latitude, longitude, apiMethod, apiSchool, tomorrow),
                    ]);

                    if (todayResult.status === 'fulfilled') {
                        const td = todayResult.value;
                        const t  = td.timings;
                        const gd = td.date.gregorian.date; // DD-MM-YYYY
                        todayPrayers = {
                            Fajr:    moment(`${gd} ${t.Fajr}`,    'DD-MM-YYYY HH:mm').toDate(),
                            Dhuhr:   moment(`${gd} ${t.Dhuhr}`,   'DD-MM-YYYY HH:mm').toDate(),
                            Asr:     moment(`${gd} ${t.Asr}`,     'DD-MM-YYYY HH:mm').toDate(),
                            Maghrib: moment(`${gd} ${t.Maghrib}`,  'DD-MM-YYYY HH:mm').toDate(),
                            Isha:    moment(`${gd} ${t.Isha}`,    'DD-MM-YYYY HH:mm').toDate(),
                        };
                        const h = td.date.hijri;
                        hijriString = `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
                    }

                    if (tomorrowResult.status === 'fulfilled') {
                        const tm   = tomorrowResult.value;
                        const tmgd = tm.date.gregorian.date;
                        tomorrowFajr = moment(`${tmgd} ${tm.timings.Fajr}`, 'DD-MM-YYYY HH:mm').toDate();
                    }

                    // Persist to cache for the rest of the day
                    if (todayPrayers) {
                        await AsyncStorage.setItem(cacheKey, JSON.stringify({
                            prayers: {
                                Fajr:    todayPrayers.Fajr.getTime(),
                                Dhuhr:   todayPrayers.Dhuhr.getTime(),
                                Asr:     todayPrayers.Asr.getTime(),
                                Maghrib: todayPrayers.Maghrib.getTime(),
                                Isha:    todayPrayers.Isha.getTime(),
                            },
                            hijri:          hijriString,
                            tomorrowFajrMs: tomorrowFajr?.getTime() ?? null,
                        }));
                    }
                } catch (err) {
                    console.warn('AlAdhan API failed, using offline Adhan.js:', err);
                }
            }

            // ── Offline fallback (Adhan.js) if API + cache both fail ──────────
            if (!todayPrayers) {
                const offlineTimes = new PrayerTimes(coordinates, new Date(), offlineParams);
                todayPrayers = {
                    Fajr:    offlineTimes.fajr,
                    Dhuhr:   offlineTimes.dhuhr,
                    Asr:     offlineTimes.asr,
                    Maghrib: offlineTimes.maghrib,
                    Isha:    offlineTimes.isha,
                };
                hijriString = moment().format('iDo iMMMM').toUpperCase();
            }

            setHijriDate(hijriString);

            const list = [
                { id: 'fajr', name: 'Fajr', time: moment(todayPrayers.Fajr).format('hh:mm A'), date: todayPrayers.Fajr, icon: 'sunrise' },
                { id: 'dhuhr', name: 'Dhuhr', time: moment(todayPrayers.Dhuhr).format('hh:mm A'), date: todayPrayers.Dhuhr, icon: 'sun' },
                { id: 'asr', name: 'Asr', time: moment(todayPrayers.Asr).format('hh:mm A'), date: todayPrayers.Asr, icon: 'cloud' },
                { id: 'maghrib', name: 'Maghrib', time: moment(todayPrayers.Maghrib).format('hh:mm A'), date: todayPrayers.Maghrib, icon: 'sunset' },
                { id: 'isha', name: 'Isha', time: moment(todayPrayers.Isha).format('hh:mm A'), date: todayPrayers.Isha, icon: 'moon' },
            ];

            // Determine active/next manually since we might be using raw API dates
            let currentId = 'none';
            let nextId = 'none';

            for (let i = 0; i < list.length; i++) {
                if (nowTime >= list[i].date.getTime()) {
                    currentId = list[i].id;
                }
                if (nowTime < list[i].date.getTime() && nextId === 'none') {
                    nextId = list[i].id;
                }
            }

            // Set beautiful dynamic gradient based on active prayer time (Morning, Noon, Evening, Night)
            if (currentId === 'fajr') {
                setEnvGradient(['#FFD194', '#70E1F5']); // Morning / Sunrise
            } else if (currentId === 'dhuhr' || currentId === 'asr') {
                setEnvGradient(['#4CA1AF', '#C4E0E5']); // Noon / Bright Blue Sky
            } else if (currentId === 'maghrib') {
                setEnvGradient(['#FF4E50', '#F9D423']); // Evening / Sunset
            } else if (currentId === 'isha') {
                setEnvGradient(['#141E30', '#243B55']); // Night / Dark Sapphire
            } else {
                setEnvGradient(['#FFD194', '#70E1F5']); // Default Morning
            }

            const formattedList = list.map(p => ({
                ...p,
                isNext: p.id === nextId
            }));

            setPrayers(formattedList);
            await loadCompletedPrayers();

            // Schedule Notifications (only if permission granted)
            if (finalStatus === 'granted') {
                const scheduleAdhans = async () => {
                    await Notifications.cancelAllScheduledNotificationsAsync();
                    const nowMs = new Date().getTime();

                    for (const prayer of list) {
                        if (prayer.date.getTime() > nowMs) {
                            try {
                                await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: `Time for ${prayer.name}`,
                                        body: `It is currently time to pray ${prayer.name}. Come to prayer, come to success.`,
                                        sound: true,
                                        color: '#C9A84C',
                                    },
                                    trigger: {
                                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                                        date: prayer.date,
                                    },
                                });
                            } catch (e) {
                                console.error("Failed to schedule notification:", e);
                            }
                        }
                    }

                    // Also schedule tomorrow's Fajr if we have it
                    if (tomorrowFajr && tomorrowFajr.getTime() > nowMs) {
                        try {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: 'Time for Fajr',
                                    body: 'Fajr time has begun. Rise for prayer, come to success.',
                                    sound: true,
                                    color: '#C9A84C',
                                },
                                trigger: {
                                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                                    date: tomorrowFajr,
                                },
                            });
                        } catch (_) {}
                    }
                };
                scheduleAdhans();
            }

            let activeNextId = nextId;
            let activeNextTime = list.find(p => p.id === nextId)?.date as Date;

            // Handle After-Isha Edge Case (Next prayer is tomorrow's Fajr)
            if (!activeNextId || activeNextId === 'none') {
                activeNextId = 'fajr';
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Use API-fetched tomorrow Fajr, fall back to offline Adhan.js
                if (tomorrowFajr) {
                    activeNextTime = tomorrowFajr;
                } else {
                    const tomorrowOffline = new PrayerTimes(coordinates, tomorrow, offlineParams);
                    activeNextTime = tomorrowOffline.fajr;
                }
                setNextPrayerName('Fajr');
            } else if (activeNextId && activeNextId !== 'none') {
                setNextPrayerName(activeNextId.charAt(0).toUpperCase() + activeNextId.slice(1));
            } else {
                setNextPrayerName('Fajr');
            }

            let previousPrayerTimeObj;
            if (currentId === 'none') {
                // Between tomorrow's Fajr and Today's Isha or start of day
                previousPrayerTimeObj = new Date().setHours(0, 0, 0, 0);
            } else {
                previousPrayerTimeObj = list.find(p => p.id === currentId)?.date as Date;
            }

            const totalDuration = activeNextTime.getTime() - new Date(previousPrayerTimeObj).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = activeNextTime.getTime() - now;

                if (diff <= 0) {
                    setCountdown('0h 0m');
                    setFillPercentage(1);
                } else {
                    const d = moment.duration(diff);
                    setCountdown(`${Math.floor(d.asHours())}h ${d.minutes()}m`);

                    const elapsed = now - new Date(previousPrayerTimeObj).getTime();
                    const percentage = Math.max(0, Math.min(1, elapsed / totalDuration));
                    setFillPercentage(percentage);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 60000);
            setLoading(false);
            return () => clearInterval(interval);
        })();
    }, []);

    // Outer Glow Scaling Animation mapped from 1 to 1.15
    const animatedScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12]
    });

    // Outer Glow Opacity mapped from bold to invisible
    const animatedOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0]
    });

    const radius = 120;
    const strokeWidth = 3;
    const cx = 150;
    const cy = 150;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (fillPercentage * circumference);

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#FF9A9E" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}
                contentContainerStyle={styles.scrollContent}
            >

                {/* Ambient Dynamic Header Widget with Liquid Glass */}
                <View style={styles.ambientWidgetContainer}>
                    <LinearGradient
                        colors={envGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />

                    {/* Decorative abstract shapes behind glass */}
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />

                    <BlurView intensity={40} tint="light" style={[styles.glassLayer, { paddingTop: insets.top + 10 }]}>
                        <View style={styles.headerRow}>
                            <View>
                                <Text style={styles.greetingText}>{greeting}</Text>
                                <Text style={styles.locationText}>{locationName}</Text>
                            </View>
                            {hijriDate ? (
                                <View style={styles.dateBadge}>
                                    <Text style={styles.dateText}>{hijriDate}</Text>
                                </View>
                            ) : (
                                <View style={[styles.dateBadge, { opacity: 0 }]} />
                            )}
                        </View>

                        {/* Innovative Pulsing Timer Orb */}
                        <View style={styles.progressContainer}>
                            <Animated.View style={[
                                styles.auraLayer,
                                {
                                    transform: [{ scale: animatedScale }],
                                    opacity: animatedOpacity
                                }
                            ]}>
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 150 }]} />
                            </Animated.View>

                            <Svg width={240} height={240} viewBox="0 0 300 300">
                                <Defs>
                                    <SvgLinearGradient id="gradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <Stop offset="0%" stopColor="#FFFFFF" />
                                        <Stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
                                    </SvgLinearGradient>
                                </Defs>

                                {/* Background subtle ring */}
                                <Circle cx={cx} cy={cy} r={radius} stroke="rgba(255, 255, 255, 0.2)" strokeWidth={strokeWidth} fill="none" />

                                {/* Fill Ring */}
                                <Circle
                                    cx={cx}
                                    cy={cy}
                                    r={radius}
                                    stroke="url(#gradientActive)"
                                    strokeWidth={strokeWidth * 1.5}
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    transform={`rotate(-90 ${cx} ${cy})`}
                                />
                            </Svg>

                            <View style={styles.countdownCenter}>
                                <Text style={styles.tillText}>Time to</Text>
                                <Text style={styles.prayerHeroText}>{nextPrayerName}</Text>
                                <View style={styles.countdownBadge}>
                                    <Text style={styles.countdownTime}>{countdown}</Text>
                                </View>
                            </View>
                        </View>
                    </BlurView>
                </View>

                {/* Prayer Timeline List with Soft Pastel Shadows */}
                <View style={styles.prayersList}>
                    {prayers.map((prayer) => {
                        const isNext = prayer.isNext;
                        const isChecked = completedPrayers.includes(prayer.id);

                        return (
                            <TouchableOpacity
                                key={prayer.name}
                                activeOpacity={0.8}
                                onPress={() => togglePrayer(prayer.id)}
                            >
                                <View style={[styles.prayerCard, isNext && styles.prayerCardNext]}>
                                    <View style={styles.prayerLeft}>
                                        <View style={[styles.iconOrb, isNext && styles.iconOrbNext]}>
                                            <Feather name={prayer.icon as any} size={18} color={isNext ? '#FFFFFF' : '#8A8A8A'} />
                                        </View>
                                        <View>
                                            <Text style={[styles.prayerName, isNext && styles.prayerNameNext]}>{prayer.name}</Text>
                                            {isNext && <Text style={styles.nextSubtitle}>Next Prayer</Text>}
                                        </View>
                                    </View>

                                    <View style={styles.prayerRight}>
                                        <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]}>{prayer.time}</Text>
                                        <View style={[styles.checkCircle, isChecked && styles.checkCircleActive]}>
                                            {isChecked && <View style={styles.checkFill} />}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Daily Aya */}
                {dayAya && (
                    <View style={styles.dayAyaSection}>
                        <View style={styles.dayAyaHeader}>
                            <Text style={styles.sectionTitle}>Verse of the Day</Text>
                            <Text style={styles.dayAyaRef}>
                                {dayAya.surahName} • {dayAya.surahNumber}:{dayAya.numberInSurah}
                            </Text>
                        </View>
                        <View style={styles.dayAyaCard}>
                            <Text style={styles.dayAyaArabic}>{dayAya.arabic}</Text>
                            <View style={styles.dayAyaDivider} />
                            <Text style={styles.dayAyaTranslation}>{dayAya.translation}</Text>
                        </View>
                    </View>
                )}

                {/* High-end Quick Tools */}
                <View style={styles.toolsSection}>
                    <Text style={styles.sectionTitle}>Library</Text>
                    <View style={styles.toolsGrid}>
                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/tasbih')}>
                            <View style={styles.toolGradient}>
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#f2930d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Circle cx="12" cy="10" r="8" strokeDasharray="2 3" />
                                    <Path d="M12 18 V23 M10 21 h4" />
                                    <Circle cx="12" cy="18" r="1.5" fill="#f2930d" />
                                </Svg>
                                <Text style={styles.toolText}>Tasbih</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/zakat')}>
                            <View style={styles.toolGradient}>
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#f2930d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M10 8 A 4 4 0 1 0 14 16 A 5 5 0 0 1 10 8 Z" fill="#f2930d" />
                                </Svg>
                                <Text style={styles.toolText}>Zakat</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/duas')}>
                            <View style={styles.toolGradient}>
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#f2930d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M7 11C7 11 5 15 5 18C5 19.5 6.5 21 8 21C9.5 21 11 19 11 19C11 19 13 21 14.5 21C16 21 17.5 19.5 17.5 18C17.5 15 15.5 11 15.5 11" />
                                    <Path d="M11 19V10C11 8.5 10 7 8 7C6.5 7 5 8.5 5 10" />
                                    <Path d="M14.5 19V10C14.5 8.5 15.5 7 17.5 7C19 7 20.5 8.5 20.5 10" />
                                    <Path d="M11 13H14.5" />
                                </Svg>
                                <Text style={styles.toolText}>Duas</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF8F0',
    },
    ambientWidgetContainer: {
        width: '100%',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.4)',
        top: -100,
        right: -100,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.2)',
        bottom: -50,
        left: -80,
    },
    glassLayer: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 250,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 10,
        marginBottom: 20,
    },
    greetingText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    locationText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    dateBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        height: 300,
        width: '100%',
    },
    auraLayer: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
    },
    countdownCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tillText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    prayerHeroText: {
        color: '#FFFFFF',
        fontSize: 52,
        fontWeight: '300',
        letterSpacing: -1.5,
        lineHeight: 60,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    countdownBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    countdownTime: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    prayersList: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 12,
    },
    prayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF', // New light mode card
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    prayerCardNext: {
        borderColor: 'rgba(242, 147, 13, 0.3)', // Sunrise orange trim
        backgroundColor: '#FFF8F0',
        transform: [{ scale: 1.02 }],
        shadowColor: '#f2930d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    prayerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconOrb: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconOrbNext: {
        backgroundColor: '#f2930d',
    },
    prayerName: {
        color: '#1A1A1A',
        fontSize: 17,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    prayerNameNext: {
        color: '#f2930d',
        fontWeight: 'bold',
        fontSize: 18,
    },
    nextSubtitle: {
        color: '#8A8A8A',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    prayerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    prayerTime: {
        color: '#1A1A1A',
        fontSize: 16,
        letterSpacing: 0.5,
        fontWeight: '600',
    },
    prayerTimeNext: {
        color: '#f2930d',
        fontWeight: '700',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleActive: {
        borderColor: '#f2930d',
    },
    checkFill: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#f2930d',
    },
    dayAyaSection: {
        marginTop: 36,
        paddingHorizontal: 20,
    },
    dayAyaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    dayAyaRef: {
        color: '#f2930d',
        fontSize: 13,
        fontWeight: '500',
    },
    dayAyaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(242, 147, 13, 0.1)',
    },
    dayAyaArabic: {
        color: '#1A1A1A',
        fontSize: 26,
        lineHeight: 46,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 4,
    },
    dayAyaDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginVertical: 16,
    },
    dayAyaTranslation: {
        color: '#5A5A5A',
        fontSize: 15,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    toolsSection: {
        marginTop: 40,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    toolsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 20,
    },
    toolCard: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    toolGradient: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
    },
    toolText: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        letterSpacing: 0.5,
    },
});
