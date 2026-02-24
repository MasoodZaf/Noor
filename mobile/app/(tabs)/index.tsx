import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes, Prayer } from 'adhan';
import moment from 'moment';

// ── Types ──────────────────────────────────────────────────────────
interface PrayerItem {
    id: string;
    name: string;
    time: string;
    date: Date;
    icon: keyof typeof Feather.glyphMap;
    isNext: boolean;
}

// ── Hijri Date Conversion (Kuwaiti algorithm) ──────────────────────
function toHijri(date: Date): { day: number; month: number; year: number } {
    const jd = Math.floor((date.getTime() - new Date(1970, 0, 1).getTime()) / 86400000) + 2440588;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const lRemainder = l - 10631 * n + 354;
    const j =
        Math.floor((10985 - lRemainder) / 5316) *
            Math.floor((50 * lRemainder) / 17719) +
        Math.floor(lRemainder / 5670) *
            Math.floor((43 * lRemainder) / 15238);
    const lFinal =
        lRemainder -
        Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
        29;
    const month = Math.floor((24 * lFinal) / 709);
    const day = lFinal - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    return { day, month, year };
}

const HIJRI_MONTHS = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijjah',
];

function formatHijriDate(date: Date): string {
    const h = toHijri(date);
    return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

// ── Component ──────────────────────────────────────────────────────
export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prayers, setPrayers] = useState<PrayerItem[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);
    const [hijriDate, setHijriDate] = useState('');
    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                // ── Location permission ──
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (isMounted) {
                        setError('Location permission is required to calculate prayer times. Please enable it in Settings.');
                        setLoading(false);
                    }
                    return;
                }

                // ── Get position ──
                let location: Location.LocationObject;
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                } catch {
                    if (isMounted) {
                        setError('Unable to determine your location. Please check GPS settings and try again.');
                        setLoading(false);
                    }
                    return;
                }

                // ── Reverse geocode for city name ──
                try {
                    const [place] = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });
                    if (place && isMounted) {
                        setLocationName(place.city || place.region || '');
                    }
                } catch {
                    // Non-critical — silently ignore
                }

                // ── Calculate prayer times ──
                const coordinates = new Coordinates(location.coords.latitude, location.coords.longitude);
                const params = CalculationMethod.MuslimWorldLeague();
                const date = new Date();

                const prayerTimes = new PrayerTimes(coordinates, date, params);

                const list: PrayerItem[] = [
                    { id: 'fajr', name: 'Fajr', time: moment(prayerTimes.fajr).format('hh:mm A'), date: prayerTimes.fajr, icon: 'sunrise', isNext: false },
                    { id: 'dhuhr', name: 'Dhuhr', time: moment(prayerTimes.dhuhr).format('hh:mm A'), date: prayerTimes.dhuhr, icon: 'sun', isNext: false },
                    { id: 'asr', name: 'Asr', time: moment(prayerTimes.asr).format('hh:mm A'), date: prayerTimes.asr, icon: 'cloud', isNext: false },
                    { id: 'maghrib', name: 'Maghrib', time: moment(prayerTimes.maghrib).format('hh:mm A'), date: prayerTimes.maghrib, icon: 'sunset', isNext: false },
                    { id: 'isha', name: 'Isha', time: moment(prayerTimes.isha).format('hh:mm A'), date: prayerTimes.isha, icon: 'moon', isNext: false },
                ];

                const nextId = prayerTimes.nextPrayer();
                const currentId = prayerTimes.currentPrayer();

                const formattedList = list.map(p => ({
                    ...p,
                    isNext: p.id === nextId,
                }));

                if (!isMounted) return;

                setPrayers(formattedList);
                setHijriDate(formatHijriDate(date));

                if (nextId !== Prayer.None) {
                    setNextPrayerName(nextId.charAt(0).toUpperCase() + nextId.slice(1));

                    const nextPrayerTime = prayerTimes.timeForPrayer(nextId) as Date;
                    const previousPrayerTime: Date =
                        currentId === Prayer.None
                            ? new Date(new Date(date).setHours(0, 0, 0, 0))
                            : (prayerTimes.timeForPrayer(currentId) as Date);

                    const totalDuration = nextPrayerTime.getTime() - previousPrayerTime.getTime();

                    const updateTimer = () => {
                        const now = Date.now();
                        const diff = nextPrayerTime.getTime() - now;

                        if (diff <= 0) {
                            setCountdown('0h 0m');
                            setFillPercentage(1);
                        } else {
                            const d = moment.duration(diff);
                            setCountdown(`${Math.floor(d.asHours())}h ${d.minutes()}m`);

                            const elapsed = now - previousPrayerTime.getTime();
                            const percentage = Math.max(0, Math.min(1, elapsed / totalDuration));
                            setFillPercentage(percentage);
                        }
                    };

                    updateTimer();
                    intervalRef.current = setInterval(updateTimer, 60000);
                } else {
                    setNextPrayerName('None');
                    setCountdown('--');
                }

                if (isMounted) setLoading(false);
            } catch {
                if (isMounted) {
                    setError('Something went wrong while loading prayer times. Please restart the app.');
                    setLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    // ── SVG Circular progress ──
    const radius = 110;
    const strokeWidth = 6;
    const cx = 150;
    const cy = 150;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - fillPercentage * circumference;

    // ── Error state ──
    if (error) {
        return (
            <View style={[styles.container, styles.centeredContent, { paddingTop: insets.top }]}>
                <Feather name="alert-circle" size={48} color="#C9A84C" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setError(null);
                        setLoading(true);
                    }}
                >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Loading state ──
    if (loading) {
        return (
            <View style={[styles.container, styles.centeredContent]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Calculating prayer times...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header - Dynamic Hijri Date & Location */}
                <View style={styles.header}>
                    <Text style={styles.dateText}>{hijriDate}</Text>
                    {locationName ? (
                        <Text style={styles.locationText}>{locationName}</Text>
                    ) : null}
                </View>

                {/* Circular Progress Countdown */}
                <View style={styles.progressContainer}>
                    <Svg width={300} height={300} viewBox="0 0 300 300">
                        <Defs>
                            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#1F4E3D" />
                                <Stop offset="100%" stopColor="#C9A84C" />
                            </LinearGradient>
                        </Defs>

                        {/* Background Track */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Active Progress Ring */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke="url(#gradient)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    </Svg>

                    <View style={styles.countdownCenter}>
                        <Text style={styles.countdownTime}>{countdown}</Text>
                        <Text style={styles.countdownLabel}>until {nextPrayerName}</Text>
                    </View>
                </View>

                {/* Prayers List */}
                <View style={styles.prayersList}>
                    {prayers.map((prayer) => (
                        <View
                            key={prayer.id}
                            style={[
                                styles.prayerCard,
                                prayer.isNext && styles.prayerCardActive,
                            ]}
                        >
                            <View style={styles.prayerLeft}>
                                <Feather
                                    name={prayer.icon}
                                    size={20}
                                    color={prayer.isNext ? '#C9A84C' : '#5E5C58'}
                                />
                                <Text style={[styles.prayerName, prayer.isNext && styles.prayerNameActive]}>
                                    {prayer.name}
                                </Text>
                            </View>

                            <View style={styles.prayerRight}>
                                {prayer.isNext && (
                                    <Text style={styles.nextBadge}>Next</Text>
                                )}
                                <Text style={[styles.prayerTime, prayer.isNext && styles.prayerTimeActive]}>
                                    {prayer.time}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Locate Me & Mosque Finder */}
                <TouchableOpacity
                    style={styles.locateCard}
                    activeOpacity={0.7}
                    onPress={() => router.push('/mosque-finder')}
                >
                    <View style={styles.locateIconContainer}>
                        <Feather name="map-pin" size={22} color="#C9A84C" />
                    </View>
                    <View style={styles.locateTextGroup}>
                        <Text style={styles.locateTitle}>Locate Me</Text>
                        <Text style={styles.locateSubtitle}>
                            {locationName
                                ? `${locationName} · Find nearby mosques`
                                : 'Find mosques near you on the map'}
                        </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#5E5C58" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    centeredContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        gap: 6,
    },
    dateText: {
        color: '#9A9590',
        fontSize: 14,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    locationText: {
        color: '#5E5C58',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    loadingText: {
        color: '#9A9590',
        fontSize: 14,
        marginTop: 16,
    },
    errorText: {
        color: '#E8E6E1',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginHorizontal: 40,
        lineHeight: 24,
    },
    retryButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: 'rgba(31, 78, 61, 0.4)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    retryButtonText: {
        color: '#C9A84C',
        fontSize: 15,
        fontWeight: '600',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        position: 'relative',
        height: 300,
    },
    countdownCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownTime: {
        color: '#E8E6E1',
        fontSize: 48,
        fontWeight: '300',
        letterSpacing: -1,
        marginBottom: 4,
    },
    countdownLabel: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    prayersList: {
        paddingHorizontal: 24,
        marginTop: 30,
        gap: 12,
    },
    prayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    prayerCardActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.15)',
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    prayerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    prayerName: {
        color: '#E8E6E1',
        fontSize: 17,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    prayerNameActive: {
        color: '#C9A84C',
        fontWeight: '600',
    },
    prayerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    nextBadge: {
        color: '#C9A84C',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    prayerTime: {
        color: '#9A9590',
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    prayerTimeActive: {
        color: '#E8E6E1',
        fontWeight: '600',
    },
    locateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.12)',
        borderRadius: 16,
        marginHorizontal: 24,
        marginTop: 24,
        padding: 18,
        gap: 14,
    },
    locateIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locateTextGroup: {
        flex: 1,
    },
    locateTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
    },
    locateSubtitle: {
        color: '#9A9590',
        fontSize: 12,
        marginTop: 3,
    },
});
