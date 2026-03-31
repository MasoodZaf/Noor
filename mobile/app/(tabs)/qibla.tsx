import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Svg, {
    Circle, Line, G, Text as SvgText, Path, Defs,
    LinearGradient as SvgLinearGradient, Stop, RadialGradient, Rect,
} from 'react-native-svg';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.88, 340);

const MECCA_LAT = 21.422487;
const MECCA_LON = 39.826206;
const ALADHAN_QIBLA = 'https://api.aladhan.com/v1/qibla';

// Smoothing alpha: balance between responsiveness and jitter suppression.
// Android sensors are noisier so use a lower alpha; iOS Core Motion is already fused.
const ALPHA = Platform.OS === 'android' ? 0.18 : 0.25;
const MIN_UPDATE_MS = 16;
const ALIGN_THRESHOLD = Platform.OS === 'android' ? 5 : 3;
const RENDER_THRESHOLD_DEG = Platform.OS === 'android' ? 0.3 : 0.1;

// Cache geocode results — BigDataCloud is a free service with no SLA.
// Key is rounded to ~1km precision; value is JSON-stringified { locality, countryCode }.
const GEO_CACHE_KEY = (lat: number, lon: number) =>
    `@noor/geocode_${Math.round(lat * 10)}_${Math.round(lon * 10)}`;

const reverseGeocode = async (lat: number, lon: number): Promise<{ locality: string; countryCode: string }> => {
    const cacheKey = GEO_CACHE_KEY(lat, lon);
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }

    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    const result = {
        locality: d.locality || d.city || d.principalSubdivision || '',
        countryCode: d.countryCode || '',
    };
    if (result.locality) {
        AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }
    return result;
};

const qiblaCacheKey = (lat: number, lng: number) =>
    `@noor/qibla_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;

export default function QiblaScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const [heading, setHeading] = useState(0);
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [locationReady, setLocationReady] = useState(false);
    const [distance, setDistance] = useState(0);
    const [cityName, setCityName] = useState('');
    const [qiblaSource, setQiblaSource] = useState<'api' | 'cache' | 'offline'>('api');
    const [errorMsg, setErrorMsg] = useState('');
    const [sensorAccuracy, setSensorAccuracy] = useState(0); // start uncalibrated until first heading update
    const [headingReady, setHeadingReady] = useState(false); // true after first valid sensor reading

    const smoothedSinRef = useRef(0);
    const smoothedCosRef = useRef(1);
    const lastUpdateRef = useRef(0);
    const lastRenderedHeadingRef = useRef(-1);

    const calculateDistance = (lat1: number, lon1: number) => {
        const getRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = getRad(MECCA_LAT - lat1);
        const dLon = getRad(MECCA_LON - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(getRad(lat1)) * Math.cos(getRad(MECCA_LAT)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const calculateQibla = (lat1: number, lon1: number) => {
        const toRad = (val: number) => (val * Math.PI) / 180;
        const toDeg = (val: number) => (val * 180) / Math.PI;
        const phi1 = toRad(lat1);
        const phi2 = toRad(MECCA_LAT);
        const deltaLambda = toRad(MECCA_LON - lon1);
        const y = Math.sin(deltaLambda);
        const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };

    // Location + Qibla direction: fetch once on mount
    useEffect(() => {
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
            } catch {
                location = { coords: { latitude: 21.4225, longitude: 39.8262 } };
            }
            const { latitude, longitude } = location.coords;

            if (!isMounted) return;

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
                        if (isMounted) { setQiblaDirection(dir); setQiblaSource('api'); }
                        AsyncStorage.setItem(cacheKey, String(dir)).catch(() => { });
                        qiblaSet = true;
                    }
                } catch (_) { }
            }

            if (!qiblaSet && isMounted) {
                setQiblaDirection(calculateQibla(latitude, longitude));
                setQiblaSource('offline');
            }

            if (isMounted) {
                setDistance(Math.round(calculateDistance(latitude, longitude)));
                setLocationReady(true);
            }
        })();

        return () => { isMounted = false; };
    }, []);

    // Heading subscription: start when screen is focused, stop when screen loses focus
    useFocusEffect(
        useCallback(() => {
            let active = true;
            let headingSub: Location.LocationSubscription | null = null;

            (async () => {
                headingSub = await Location.watchHeadingAsync((headingData) => {
                    if (!active) return;
                    const now = Date.now();
                    if (now - lastUpdateRef.current < MIN_UPDATE_MS) return;
                    lastUpdateRef.current = now;
                    // Prefer trueHeading (corrects for magnetic declination); fall back to magHeading.
                    // On Android, trueHeading requires a GPS fix — magHeading is the raw compass bearing.
                    const trueH = headingData.trueHeading;
                    const magH = headingData.magHeading;
                    const rawAngle = (trueH !== undefined && trueH > 0) ? trueH : (magH >= 0 ? magH : -1);
                    if (rawAngle < 0) return;
                    const rawRad = (rawAngle * Math.PI) / 180;

                    smoothedSinRef.current = ALPHA * Math.sin(rawRad) + (1 - ALPHA) * smoothedSinRef.current;
                    smoothedCosRef.current = ALPHA * Math.cos(rawRad) + (1 - ALPHA) * smoothedCosRef.current;
                    let smoothed = (Math.atan2(smoothedSinRef.current, smoothedCosRef.current) * 180) / Math.PI;
                    if (smoothed < 0) smoothed += 360;

                    // Skip render if change is below threshold — avoids jitter-driven re-renders
                    const lastRendered = lastRenderedHeadingRef.current;
                    if (lastRendered >= 0) {
                        const renderDelta = Math.abs(smoothed - lastRendered);
                        const normalizedRenderDelta = renderDelta > 180 ? 360 - renderDelta : renderDelta;
                        if (normalizedRenderDelta < RENDER_THRESHOLD_DEG) return;
                    }
                    lastRenderedHeadingRef.current = smoothed;

                    setHeadingReady(true);
                    setHeading(smoothed);
                    const acc = headingData.accuracy;
                    if (acc !== undefined && acc !== null) {
                        if (Platform.OS === 'android') {
                            // Android: accuracy is 0–3 calibration level (3 = best)
                            setSensorAccuracy(acc);
                        } else {
                            // iOS: accuracy is in degrees (negative = uncalibrated)
                            if (acc < 0)        setSensorAccuracy(0); // uncalibrated
                            else if (acc <= 10) setSensorAccuracy(3); // excellent
                            else if (acc <= 25) setSensorAccuracy(2); // acceptable
                            else                setSensorAccuracy(1); // poor
                        }
                    } else {
                        // accuracy unavailable — assume needs calibration
                        setSensorAccuracy(1);
                    }
                });

                // Component may have blurred while watchHeadingAsync was awaiting
                if (!active && headingSub) headingSub.remove();
            })();

            return () => {
                active = false;
                if (headingSub) headingSub.remove();
            };
        }, [])
    );

    const dif = Math.abs(((heading - qiblaDirection) % 360 + 360) % 360);
    const normalizedDif = dif > 180 ? 360 - dif : dif;
    const isAligned = locationReady && normalizedDif < ALIGN_THRESHOLD;
    const needsCalibration = sensorAccuracy < 2;
    const needleRotation = qiblaDirection - heading;

    useEffect(() => {
        if (isAligned) {
            // Double-pulse: notification success + brief heavy impact for clear "locked on" feel
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const t = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 180);
            return () => clearTimeout(t);
        }
    }, [isAligned]);

    if (errorMsg) {
        const isPermissionError = errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('denied');
        return (
            <View style={[styles.centered, { backgroundColor: theme.bg }]}>
                <Feather name="alert-triangle" size={50} color={theme.gold} />
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>{errorMsg}</Text>
                {isPermissionError && (
                    <TouchableOpacity
                        style={[styles.settingsBtn, { backgroundColor: theme.gold }]}
                        onPress={() => Linking.openSettings()}
                    >
                        <Feather name="settings" size={16} color={theme.textInverse} style={{ marginRight: 8 }} />
                        <Text style={[styles.settingsBtnText, { color: theme.textInverse }]}>Open Settings</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (!locationReady || !headingReady) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.gold} />
                <Text style={[styles.locatingText, { color: theme.textSecondary }]}>
                    {locationReady ? 'Locking compass...' : 'Calibrating Sensors...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Qibla Compass</Text>
                <View style={styles.locationPill}>
                    <Feather name="map-pin" size={13} color={theme.gold} />
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {cityName || 'Locating...'}
                    </Text>
                </View>
            </View>

            {/* ── Compass (always brass/ivory — physical compass aesthetic) ── */}
            <View style={styles.compassContainer}>
                <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox="0 0 400 400">
                    <Defs>
                        <RadialGradient id="brassFrame" cx="35%" cy="28%" rx="70%" ry="70%">
                            <Stop offset="0%"   stopColor="#F0E090" />
                            <Stop offset="18%"  stopColor="#D4B040" />
                            <Stop offset="45%"  stopColor="#A07820" />
                            <Stop offset="72%"  stopColor="#6A4A10" />
                            <Stop offset="100%" stopColor="#3A2408" />
                        </RadialGradient>
                        <RadialGradient id="brassBezel" cx="38%" cy="30%" rx="62%" ry="62%">
                            <Stop offset="0%"   stopColor="#ECD878" />
                            <Stop offset="30%"  stopColor="#C8A030" />
                            <Stop offset="60%"  stopColor="#8C6418" />
                            <Stop offset="100%" stopColor="#4A3008" />
                        </RadialGradient>
                        <RadialGradient id="dialFace" cx="42%" cy="36%" rx="58%" ry="58%">
                            <Stop offset="0%"   stopColor="#FAF6EA" />
                            <Stop offset="45%"  stopColor="#F4EDD8" />
                            <Stop offset="80%"  stopColor="#EEE3C4" />
                            <Stop offset="100%" stopColor="#E8D8B0" />
                        </RadialGradient>
                        <SvgLinearGradient id="redNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%"   stopColor="#5C0A0A" />
                            <Stop offset="35%"  stopColor="#9A1818" />
                            <Stop offset="55%"  stopColor="#C02020" />
                            <Stop offset="75%"  stopColor="#9A1818" />
                            <Stop offset="100%" stopColor="#5C0A0A" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="silverNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%"   stopColor="#606060" />
                            <Stop offset="35%"  stopColor="#C0C0C0" />
                            <Stop offset="55%"  stopColor="#E8E8E8" />
                            <Stop offset="75%"  stopColor="#C0C0C0" />
                            <Stop offset="100%" stopColor="#787878" />
                        </SvgLinearGradient>
                        <RadialGradient id="centerCap" cx="38%" cy="32%" rx="62%" ry="62%">
                            <Stop offset="0%"   stopColor="#E8D480" />
                            <Stop offset="60%"  stopColor="#C09028" />
                            <Stop offset="100%" stopColor="#7A5818" />
                        </RadialGradient>
                        <RadialGradient id="alignGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="0%"   stopColor="#C8A040" stopOpacity="0.28" />
                            <Stop offset="100%" stopColor="#C8A040" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    {/* Outer frame */}
                    <Circle cx="200" cy="200" r="197" fill="url(#brassFrame)" />
                    <Path d="M 130 22 A 178 178 0 0 1 270 22 A 148 148 0 0 0 130 22 Z" fill="white" opacity="0.30" />
                    <Circle cx="200" cy="200" r="183" fill="url(#brassBezel)" />
                    <Circle cx="200" cy="200" r="174" fill="#B89028" />
                    <Circle cx="200" cy="200" r="172" fill="url(#dialFace)" />
                    {isAligned && <Circle cx="200" cy="200" r="172" fill="url(#alignGlow)" />}

                    {/* World map watermark */}
                    {[
                        "M 118 150 C 138 136, 178 130, 225 132 C 258 133, 284 142, 286 155 C 288 168, 264 175, 232 178 C 210 181, 186 183, 162 177 C 138 171, 120 162, 118 150 Z",
                        "M 250 173 C 260 170, 270 176, 272 190 C 274 204, 264 216, 255 218 C 246 220, 239 210, 238 196 C 237 182, 244 175, 250 173 Z",
                        "M 278 175 C 298 172, 316 180, 318 193 C 320 204, 304 212, 285 210 C 272 208, 268 198, 272 186 C 274 179, 276 176, 278 175 Z",
                        "M 202 178 C 218 174, 236 182, 238 200 C 240 218, 233 240, 220 250 C 207 260, 194 255, 189 238 C 184 221, 186 198, 195 185 C 198 181, 200 179, 202 178 Z",
                        "M 282 212 C 300 207, 322 213, 325 228 C 328 243, 312 252, 293 250 C 274 248, 264 236, 268 221 C 271 212, 276 213, 282 212 Z",
                        "M 80 142 C 100 130, 132 134, 140 152 C 148 170, 132 186, 114 188 C 96 190, 76 178, 72 160 C 68 144, 72 148, 80 142 Z",
                        "M 106 195 C 122 188, 138 196, 142 215 C 146 234, 136 258, 118 264 C 100 270, 84 258, 80 238 C 76 218, 86 202, 100 196 Z",
                    ].map((d, i) => (
                        <Path key={i} d={d} fill="#A08020" opacity="0.16" />
                    ))}

                    {/* Rotating dial — ticks + numbers follow device heading */}
                    <G transform={`rotate(${-heading}, 200, 200)`}>
                        <Circle cx="200" cy="200" r="166" fill="none" stroke="#B89830" strokeWidth="0.5" strokeOpacity="0.35" />
                        {Array.from({ length: 72 }).map((_, i) => {
                            const angle = i * 5;
                            const isMajor = angle % 30 === 0;
                            const isMedium = angle % 10 === 0;
                            const outerR = 166;
                            const innerR = isMajor ? 150 : isMedium ? 157 : 162;
                            const rad = ((angle - 90) * Math.PI) / 180;
                            return (
                                <Line
                                    key={i}
                                    x1={200 + outerR * Math.cos(rad)} y1={200 + outerR * Math.sin(rad)}
                                    x2={200 + innerR * Math.cos(rad)} y2={200 + innerR * Math.sin(rad)}
                                    stroke={isMajor ? '#907010' : isMedium ? '#A88020' : '#C4A040'}
                                    strokeWidth={isMajor ? 2 : isMedium ? 1.2 : 0.6}
                                />
                            );
                        })}
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = i * 30;
                            if (angle === 0) return null;
                            const rad = ((angle - 90) * Math.PI) / 180;
                            const r = 138;
                            return (
                                <SvgText
                                    key={i}
                                    x={200 + r * Math.cos(rad)}
                                    y={200 + r * Math.sin(rad)}
                                    fill="#987818"
                                    fontSize="13"
                                    fontWeight="600"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                >
                                    {angle.toString()}
                                </SvgText>
                            );
                        })}
                    </G>

                    {/* Kaaba — fixed at top of compass, does NOT rotate */}
                    <Path d="M 200 36 L 206 26 L 194 26 Z" fill="#1E1008" />
                    <Rect x="191" y="4" width="18" height="23" fill="#1E1008" rx="2" />
                    <Rect x="191" y="4" width="18" height="4"  fill="#3A2210" rx="2" />
                    <Rect x="191" y="10" width="18" height="4" fill="#C8A030" />
                    <Rect x="196" y="16" width="8"  height="11" fill="#B08820" rx="1" />
                    <Path d="M 191 4 L 185 8 L 185 27 L 191 27 Z" fill="#120A04" opacity="0.8" />
                    <Path d="M 191 10 L 185 12 L 185 16 L 191 14 Z" fill="#A07820" opacity="0.8" />

                    {/* Needle — rotates to point toward Qibla */}
                    <G transform={`rotate(${needleRotation}, 200, 200)`}>
                        {/* Drop shadow */}
                        <Path d="M 200 68 L 215 108 L 207 108 L 207 215 L 193 215 L 193 108 L 185 108 Z" fill="rgba(0,0,0,0.15)" transform="translate(3,5)" />
                        <Path d="M 200 215 L 205 208 L 205 305 L 200 318 L 195 305 L 195 208 Z" fill="rgba(0,0,0,0.10)" transform="translate(3,5)" />
                        {/* Arrow head + shaft (Qibla side) */}
                        <Path d="M 200 68 L 215 108 L 207 108 L 207 215 L 193 215 L 193 108 L 185 108 Z" fill="url(#redNeedle)" />
                        {/* Highlight */}
                        <Path d="M 200 68 L 203 95 L 200 68 Z" fill="rgba(255,255,255,0.22)" />
                        {/* Tail (opposite side) */}
                        <Path d="M 200 215 L 205 208 L 205 305 L 200 318 L 195 305 L 195 208 Z" fill="url(#silverNeedle)" />
                        <Path d="M 200 215 L 202 265 L 200 215 Z" fill="rgba(255,255,255,0.32)" />
                    </G>

                    {/* Center cap */}
                    <Circle cx="200" cy="200" r="16" fill="rgba(0,0,0,0.2)" transform="translate(2,3)" />
                    <Circle cx="200" cy="200" r="16" fill="url(#centerCap)" />
                    <Circle cx="200" cy="200" r="11" fill="#D4A830" />
                    <Circle cx="200" cy="200" r="7"  fill="#8B6018" />
                    <Circle cx="200" cy="200" r="3.5" fill="#4A3008" />

                    {isAligned && (
                        <Circle cx="200" cy="200" r="172" stroke="#C8A040" strokeWidth="3" fill="none" strokeOpacity="0.7" />
                    )}
                </Svg>
            </View>

            {/* Calibration warning */}
            {needsCalibration && (
                <View style={[styles.calibrationBanner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="alert-circle" size={16} color={theme.gold} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.calibrationTitle, { color: theme.textPrimary }]}>Sensor needs calibration</Text>
                        <Text style={[styles.calibrationSub, { color: theme.textSecondary }]}>Move your phone in a figure-8 motion</Text>
                    </View>
                    <View style={styles.accuracyDots}>
                        {[0, 1, 2].map(i => (
                            <View key={i} style={[styles.accuracyDot, { backgroundColor: i < sensorAccuracy ? theme.gold : theme.border }]} />
                        ))}
                    </View>
                </View>
            )}

            {/* Footer metrics */}
            <View style={styles.footerSection}>
                <View style={styles.metricsRow}>
                    <View style={[styles.metricCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>Distance</Text>
                        <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{distance}</Text>
                        <Text style={[styles.metricUnit, { color: theme.textTertiary }]}>kilometers</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>Direction</Text>
                        <Text style={[styles.metricValue, { color: isAligned ? theme.gold : theme.textPrimary }]}>{Math.round(qiblaDirection)}°</Text>
                        <Text style={[styles.metricUnit, { color: theme.textTertiary }]}>{qiblaSource} source</Text>
                    </View>
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                        styles.statusBanner,
                        isAligned
                            ? { backgroundColor: theme.isDark ? '#1A1200' : 'rgba(201,168,76,0.08)', borderColor: theme.gold }
                            : { backgroundColor: theme.bgCard, borderColor: theme.border },
                    ]}
                >
                    <Feather name={isAligned ? 'check-circle' : 'compass'} size={22} color={isAligned ? theme.gold : theme.textSecondary} />
                    <View style={styles.statusTextContainer}>
                        <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                            {isAligned ? 'Facing the Qibla' : 'Searching for Qibla'}
                        </Text>
                        <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                            {isAligned
                                ? 'You are facing the Kaaba. Allahu Akbar.'
                                : `${Math.round(normalizedDif)}° off — rotate your phone slowly.`}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 24, paddingTop: 10, marginBottom: 4 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.5 },
    locationPill: { flexDirection: 'row', alignItems: 'center', marginTop: 4, opacity: 0.85 },
    headerSubtitle: { fontSize: 13, marginLeft: 5, fontWeight: '500' },
    compassContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    locatingText: { fontSize: 16, marginTop: 24, fontWeight: '600' },
    errorText: { fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
    settingsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    settingsBtnText: { fontWeight: '600', fontSize: 15 },
    footerSection: { paddingHorizontal: 24, paddingBottom: 36 },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
    metricCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1 },
    metricLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
    metricValue: { fontSize: 24, fontWeight: '800' },
    metricUnit: { fontSize: 10, fontWeight: '600', marginTop: 2 },
    calibrationBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 24, marginBottom: 12,
        borderRadius: 16, padding: 12, borderWidth: 1,
    },
    calibrationTitle: { fontSize: 13, fontWeight: '700' },
    calibrationSub: { fontSize: 11, lineHeight: 16, marginTop: 1 },
    accuracyDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    accuracyDot: { width: 8, height: 8, borderRadius: 4 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
    statusTextContainer: { marginLeft: 16, flex: 1 },
    statusTitle: { fontSize: 17, fontWeight: 'bold' },
    statusSubtitle: { fontSize: 12, marginTop: 2 },
});
