import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Rect, G, Text as SvgText, Path, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Kaaba Coordinates
const MECCA_LAT = 21.422487;
const MECCA_LON = 39.826206;

const ALADHAN_QIBLA = 'https://api.aladhan.com/v1/qibla';

// ── Sensor smoothing constants ─────────────────────────────────────────────────
// EMA alpha: lower = smoother but slower to respond, higher = faster but noisier
// Android sensors are much noisier — use lower alpha
const ALPHA = Platform.OS === 'android' ? 0.12 : 0.25;
// Minimum ms between heading state updates (throttle)
const MIN_UPDATE_MS = Platform.OS === 'android' ? 48 : 30;
// Alignment tolerance in degrees — Android needs wider window
const ALIGN_THRESHOLD = Platform.OS === 'android' ? 5 : 3;

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

const qiblaCacheKey = (lat: number, lng: number) =>
    `@qibla_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;

export default function QiblaScreen() {
    const insets = useSafeAreaInsets();
    const [heading, setHeading] = useState(0);
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [locationReady, setLocationReady] = useState(false);
    const [distance, setDistance] = useState(0);
    const [cityName, setCityName] = useState('');
    const [qiblaSource, setQiblaSource] = useState<'api' | 'cache' | 'offline'>('api');
    const [errorMsg, setErrorMsg] = useState('');
    // 0=unreliable 1=low 2=medium 3=high (Android only; iOS always 3)
    const [sensorAccuracy, setSensorAccuracy] = useState(3);

    // EMA state stored in refs (no re-render on each sensor tick)
    const smoothedSinRef = useRef(0);
    const smoothedCosRef = useRef(1); // initialise pointing North
    const lastUpdateRef  = useRef(0);

    const calculateDistance = (lat1: number, lon1: number) => {
        const getRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371; // km
        const dLat = getRad(MECCA_LAT - lat1);
        const dLon = getRad(MECCA_LON - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(getRad(lat1)) * Math.cos(getRad(MECCA_LAT)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const calculateQibla = (lat1: number, lon1: number) => {
        const toRad = (val: number) => (val * Math.PI) / 180;
        const toDeg = (val: number) => (val * 180) / Math.PI;

        const phi1 = toRad(lat1);
        const phi2 = toRad(MECCA_LAT);
        const deltaLambda = toRad(MECCA_LON - lon1);

        const y = Math.sin(deltaLambda);
        const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);

        let bearing = toDeg(Math.atan2(y, x));
        return (bearing + 360) % 360;
    };

    useEffect(() => {
        let headingSub: Location.LocationSubscription | null = null;
        let isMounted = true;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (isMounted) setErrorMsg('Permission to access location was denied');
                return;
            }

            let location;
            try {
                location = await Location.getCurrentPositionAsync({});
            } catch (error) {
                location = { coords: { latitude: 21.4225, longitude: 39.8262 } };
            }
            const { latitude, longitude } = location.coords;

            if (isMounted) {
                try {
                    const geo = await reverseGeocode(latitude, longitude);
                    if (isMounted && geo.locality) {
                        setCityName(geo.countryCode ? `${geo.locality}, ${geo.countryCode}` : geo.locality);
                    }
                } catch (_) { }

                const cacheKey = qiblaCacheKey(latitude, longitude);
                let qiblaSet = false;
                try {
                    const cached = await AsyncStorage.getItem(cacheKey);
                    if (cached) {
                        const dir = parseFloat(cached);
                        if (!isNaN(dir) && isMounted) {
                            setQiblaDirection(dir);
                            setQiblaSource('cache');
                            qiblaSet = true;
                        }
                    }
                } catch (_) { }

                if (!qiblaSet) {
                    try {
                        const qiblaRes = await fetch(`${ALADHAN_QIBLA}/${latitude}/${longitude}`);
                        const qiblaData = await qiblaRes.json();
                        if (qiblaData.code === 200 && qiblaData.data?.direction != null) {
                            const dir: number = qiblaData.data.direction;
                            if (isMounted) {
                                setQiblaDirection(dir);
                                setQiblaSource('api');
                            }
                            AsyncStorage.setItem(cacheKey, String(dir)).catch(() => { });
                            qiblaSet = true;
                        }
                    } catch (e) { }
                }

                if (!qiblaSet && isMounted) {
                    setQiblaDirection(calculateQibla(latitude, longitude));
                    setQiblaSource('offline');
                }

                setDistance(Math.round(calculateDistance(latitude, longitude)));
                if (isMounted) setLocationReady(true);
            }

            headingSub = await Location.watchHeadingAsync((headingData) => {
                // Throttle: skip updates that arrive too quickly
                const now = Date.now();
                if (now - lastUpdateRef.current < MIN_UPDATE_MS) return;
                lastUpdateRef.current = now;

                // Prefer trueHeading (includes magnetic declination); fall back to magHeading
                const rawAngle = headingData.trueHeading >= 0
                    ? headingData.trueHeading
                    : headingData.magHeading;
                if (rawAngle < 0) return; // sensor not ready yet

                // EMA filter on sin/cos components — correctly handles 0°/360° wrap
                const rawRad = (rawAngle * Math.PI) / 180;
                smoothedSinRef.current = ALPHA * Math.sin(rawRad) + (1 - ALPHA) * smoothedSinRef.current;
                smoothedCosRef.current = ALPHA * Math.cos(rawRad) + (1 - ALPHA) * smoothedCosRef.current;

                let smoothed = (Math.atan2(smoothedSinRef.current, smoothedCosRef.current) * 180) / Math.PI;
                if (smoothed < 0) smoothed += 360;

                if (isMounted) {
                    setHeading(smoothed);
                    // accuracy is 0–3 on Android; iOS doesn't populate it reliably
                    if (Platform.OS === 'android' && headingData.accuracy !== undefined) {
                        setSensorAccuracy(headingData.accuracy);
                    }
                }
            });

            if (!isMounted && headingSub) {
                headingSub.remove();
            }
        })();

        return () => {
            isMounted = false;
            if (headingSub) {
                headingSub.remove();
            }
        };
    }, []);

    const dif = Math.abs(((heading - qiblaDirection) % 360 + 360) % 360);
    const normalizedDif = dif > 180 ? 360 - dif : dif;
    const isAligned = locationReady && normalizedDif < ALIGN_THRESHOLD;
    const needsCalibration = Platform.OS === 'android' && sensorAccuracy < 2;

    useEffect(() => {
        if (isAligned) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    }, [isAligned]);

    if (errorMsg) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="alert-triangle" size={50} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
        );
    }

    if (!locationReady) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#11d452" />
                <Text style={styles.locatingText}>Calibrating Sensors...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Qibla Compass</Text>
                <View style={styles.locationPill}>
                    <Feather name="map-pin" size={14} color="#11d452" />
                    <Text style={styles.headerSubtitle}>
                        {cityName ? cityName : 'Locating...'}
                    </Text>
                </View>
            </View>

            <View style={styles.compassContainer}>
                <Svg width={width * 0.9} height={width * 0.9} viewBox="0 0 400 400">
                    <Defs>
                        <RadialGradient id="glowG" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="0%" stopColor={isAligned ? "#11d452" : "#facc15"} stopOpacity="0.2" />
                            <Stop offset="100%" stopColor={isAligned ? "#11d452" : "#facc15"} stopOpacity="0" />
                        </RadialGradient>
                        <SvgLinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#22c55e" />
                            <Stop offset="100%" stopColor="#11d452" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#facc15" />
                            <Stop offset="100%" stopColor="#eab308" />
                        </SvgLinearGradient>
                    </Defs>

                    {/* Outer Glow */}
                    <Circle cx="200" cy="200" r="180" fill="url(#glowG)" />

                    {/* Outer Ring */}
                    <Circle cx="200" cy="200" r="170" stroke="#E8EBE8" strokeWidth="2" fill="none" />

                    {/* Aligned Accent Ring */}
                    {isAligned && (
                        <Circle cx="200" cy="200" r="170" stroke="#11d452" strokeWidth="4" fill="none" />
                    )}

                    {/* Rotation wrapper */}
                    <G transform={`rotate(${-heading}, 200, 200)`}>
                        {/* Dial Marks */}
                        {Array.from({ length: 72 }).map((_, i) => {
                            const angle = i * 5;
                            const isMajor = i % 18 === 0;
                            const isMedium = i % 6 === 0;

                            return (
                                <Line
                                    key={i}
                                    x1="200" y1={isMedium ? 30 : 35}
                                    x2="200" y2="45"
                                    stroke={isMajor ? "#ef4444" : isMedium ? "#1A1A1A" : "#9ca3af"}
                                    strokeWidth={isMajor ? 4 : isMedium ? 2 : 1}
                                    transform={`rotate(${angle} 200 200)`}
                                />
                            );
                        })}

                        {/* Cardinal Letters */}
                        <SvgText x="199" y="25" fill="#ef4444" fontSize="26" fontWeight="900" textAnchor="middle">N</SvgText>
                        <SvgText x="382" y="206" fill="#1A1A1A" fontSize="18" fontWeight="700" textAnchor="middle">E</SvgText>
                        <SvgText x="200" y="394" fill="#1A1A1A" fontSize="18" fontWeight="700" textAnchor="middle">S</SvgText>
                        <SvgText x="18" y="206" fill="#1A1A1A" fontSize="18" fontWeight="700" textAnchor="middle">W</SvgText>

                        {/* Qibla Indicator Arrow */}
                        <G transform={`rotate(${qiblaDirection}, 200, 200)`}>
                            <Line x1="200" y1="200" x2="200" y2="100" stroke={isAligned ? "#11d452" : "#facc15"} strokeWidth="4" strokeDasharray="6,4" />

                            <G transform="translate(186, 40)">
                                <Rect width="28" height="30" fill="#1A1A1A" rx="4" />
                                <Rect width="28" height="6" y="8" fill="#facc15" />
                                <Path d="M14 0 L28 0 L28 10 L14 10 Z" fill="#facc15" opacity="0.3" />
                            </G>
                        </G>
                    </G>

                    {/* Center Point */}
                    <Circle cx="200" cy="200" r="10" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="3" />
                    <Circle cx="200" cy="200" r="3" fill="#11d452" />
                </Svg>
            </View>

            {/* Calibration warning — Android only, shown when accuracy is low */}
            {needsCalibration && (
                <View style={styles.calibrationBanner}>
                    <Feather name="alert-circle" size={16} color="#f59e0b" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.calibrationTitle}>Sensor needs calibration</Text>
                        <Text style={styles.calibrationSub}>Move your phone in a figure-8 motion to improve accuracy</Text>
                    </View>
                    <View style={styles.accuracyDots}>
                        {[0, 1, 2].map(i => (
                            <View key={i} style={[styles.accuracyDot, { backgroundColor: i < sensorAccuracy ? '#22c55e' : '#D1D5DB' }]} />
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.footerSection}>
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>{distance}</Text>
                        <Text style={styles.metricUnit}>kilometers</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Direction</Text>
                        <Text style={[styles.metricValue, isAligned && { color: '#11d452' }]}>{Math.round(qiblaDirection)}°</Text>
                        <Text style={styles.metricUnit}>{qiblaSource} source</Text>
                    </View>
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.statusBanner, isAligned ? styles.statusAligned : styles.statusSearching]}
                >
                    <Feather name={isAligned ? "check-circle" : "compass"} size={22} color="#FFFFFF" />
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusTitle}>
                            {isAligned ? 'Perfectly Aligned' : 'Searching for Qibla'}
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {isAligned
                                ? 'You are facing the Kaaba.'
                                : `${Math.round(normalizedDif)}° off — rotate your phone slowly.`}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f8f6' },
    header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 10 },
    headerTitle: { color: '#1A1A1A', fontSize: 32, fontWeight: 'bold', letterSpacing: -0.5 },
    locationPill: { flexDirection: 'row', alignItems: 'center', marginTop: 4, opacity: 0.8 },
    headerSubtitle: { color: '#1A1A1A', fontSize: 14, marginLeft: 6, fontWeight: '500' },
    compassContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    locatingText: { color: '#1A1A1A', fontSize: 16, marginTop: 24, fontWeight: '600' },
    errorText: { color: '#ef4444', fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
    footerSection: { paddingHorizontal: 24, paddingBottom: 40 },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
    metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
    metricLabel: { color: '#9ca3af', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
    metricValue: { color: '#111827', fontSize: 24, fontWeight: '800' },
    metricUnit: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginTop: 2 },
    calibrationBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 24, marginBottom: 12,
        backgroundColor: '#FEF3C7', borderRadius: 16,
        padding: 12, borderWidth: 1, borderColor: '#FDE68A',
    },
    calibrationTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
    calibrationSub: { fontSize: 11, color: '#B45309', lineHeight: 16, marginTop: 1 },
    accuracyDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    accuracyDot: { width: 8, height: 8, borderRadius: 4 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
    statusAligned: { backgroundColor: '#11d452', shadowColor: '#11d452' },
    statusSearching: { backgroundColor: '#111827', shadowColor: '#000' },
    statusTextContainer: { marginLeft: 16 },
    statusTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    statusSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
});
