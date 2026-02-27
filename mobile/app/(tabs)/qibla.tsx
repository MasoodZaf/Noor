import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Rect, G, Text as SvgText, Path, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Kaaba Coordinates
const MECCA_LAT = 21.422487;
const MECCA_LON = 39.826206;

export default function QiblaScreen() {
    const insets = useSafeAreaInsets();
    const [heading, setHeading] = useState(0);
    const [qiblaDirection, setQiblaDirection] = useState(0);
    const [locationReady, setLocationReady] = useState(false);
    const [distance, setDistance] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

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

    useEffect(() => {
        let headingSub: Location.LocationSubscription | null = null;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            setQiblaDirection(calculateQibla(latitude, longitude));
            setDistance(Math.round(calculateDistance(latitude, longitude)));
            setLocationReady(true);

            headingSub = await Location.watchHeadingAsync((headingData) => {
                // Native OS sensor-fusion via CoreLocation. Handles Tilt/Yaw perfectly natively!
                // Using un-rounded decimal degrees ensures silky smooth sub-degree rotation on SVG frame
                const rawAngle = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
                setHeading(rawAngle);
            });
        })();

        return () => {
            if (headingSub) {
                headingSub.remove();
            }
        };
    }, []);

    // Is the phone actively pointing at Kaaba?
    const dif = Math.abs((heading - qiblaDirection) % 360);
    // Suppress vibration triggers until location is fully acquired
    const isAligned = locationReady && (dif < 3 || dif > 357);

    // Physical locking mechanism haptic feedback
    useEffect(() => {
        if (isAligned) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    }, [isAligned]);

    if (errorMsg) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="alert-triangle" size={50} color="#E53E3E" />
                <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
        );
    }

    if (!locationReady) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.locatingText}>Calibrating Sensors...</Text>
            </View>
        );
    }
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Qibla Compass</Text>
                <Text style={styles.headerSubtitle}>Locate the Kaaba instantly anywhere.</Text>
            </View>

            <View style={styles.compassContainer}>
                {/* SVG implementation ensures flawless geometry rendering and zero clipping */}
                <Svg width={width * 0.9} height={width * 0.9} viewBox="0 0 400 400">

                    {/* Central Gradient Definitions */}
                    <Defs>
                        <RadialGradient id="glowG" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="0%" stopColor="#C9A84C" stopOpacity="0.3" />
                            <Stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
                        </RadialGradient>
                        <SvgLinearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="#FFD700" />
                            <Stop offset="1" stopColor="#C9A84C" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="#0F9A5A" />
                            <Stop offset="1" stopColor="#1F4E3D" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#FF5A5F" />
                            <Stop offset="1" stopColor="#E53E3E" />
                        </SvgLinearGradient>
                    </Defs>

                    {/* Glow Effect behind compass if aligned */}
                    {isAligned && (
                        <Circle cx="200" cy="200" r="200" fill="url(#glowG)" />
                    )}

                    {/* Outer frame */}
                    <Circle cx="200" cy="200" r="180" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" fill="url(#emeraldGrad)" fillOpacity="0.05" />

                    {/* Inner Track */}
                    <Circle cx="200" cy="200" r="140" stroke="rgba(201, 168, 76, 0.1)" strokeWidth="1" fill="transparent" />

                    {isAligned && (
                        <Circle cx="200" cy="200" r="180" stroke="url(#goldGrad)" strokeWidth="4" fill="transparent" />
                    )}

                    {/* Rotation wrapper to orient compass housing so North is strictly "up" (inverse of phone heading) */}
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
                                    stroke={isMajor ? "#E53E3E" : isMedium ? "rgba(201, 168, 76, 0.5)" : "rgba(255, 255, 255, 0.15)"}
                                    strokeWidth={isMajor ? 4 : isMedium ? 2 : 1}
                                    transform={`rotate(${angle} 200 200)`}
                                />
                            );
                        })}

                        {/* Exact Cardinal Letters anchored perfectly */}
                        <SvgText x="199" y="25" fill="url(#redGrad)" fontSize="24" fontWeight="800" textAnchor="middle">N</SvgText>
                        <SvgText x="382" y="206" fill="#E8E6E1" fontSize="18" fontWeight="600" textAnchor="middle">E</SvgText>
                        <SvgText x="200" y="394" fill="#E8E6E1" fontSize="18" fontWeight="600" textAnchor="middle">S</SvgText>
                        <SvgText x="18" y="206" fill="#E8E6E1" fontSize="18" fontWeight="600" textAnchor="middle">W</SvgText>

                        {/* Qibla Indicator Arrow rotated exactly relative to true North */}
                        <G transform={`rotate(${qiblaDirection}, 200, 200)`}>

                            {/* Target Ray Line */}
                            <Line x1="200" y1="200" x2="200" y2="80" stroke={isAligned ? "url(#goldGrad)" : "rgba(201, 168, 76, 0.3)"} strokeWidth="3" strokeDasharray="4,4" />

                            {/* Pointer Head */}
                            <Path d="M188 85 L200 60 L212 85 Z" fill={isAligned ? "url(#goldGrad)" : "#E8E6E1"} />

                            {/* Kaaba floating icon at target bounds */}
                            <G transform="translate(186, 25)">
                                <Rect width="28" height="30" fill="#0C0F0E" stroke={isAligned ? "url(#goldGrad)" : "rgba(255,255,255,0.7)"} strokeWidth="2" rx="3" />
                                {/* Kiswah Gold lines */}
                                <Line x1="0" y1="8" x2="28" y2="8" stroke={isAligned ? "url(#goldGrad)" : "rgba(255,255,255,0.7)"} strokeWidth="2" />
                                <Line x1="0" y1="12" x2="28" y2="12" stroke={isAligned ? "url(#goldGrad)" : "rgba(255,255,255,0.5)"} strokeWidth="1" />
                            </G>
                        </G>
                    </G>

                    {/* Central Anchor Pin (Fixed relative to the screen, does not rotate) */}
                    <G transform="translate(200, 200)">
                        <Circle cx="0" cy="0" r="14" fill="#1F4E3D" stroke="url(#goldGrad)" strokeWidth="2" />
                        <Circle cx="0" cy="0" r="5" fill="#FFD700" />
                        <Line x1="0" y1="-8" x2="0" y2="-120" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.8" />
                        <Path d="M-6 -120 L0 -130 L6 -120 Z" fill="url(#goldGrad)" opacity="0.8" />
                    </G>
                </Svg>
            </View>

            <View style={styles.infoWrapper}>
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
                    style={styles.infoCard}
                >
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Distance</Text>
                        <Text style={styles.infoData}>{distance} <Text style={styles.smTxt}>KM</Text></Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Heading</Text>
                        <Text style={[styles.infoData, isAligned && { color: '#C9A84C' }]}>
                            {Math.round(heading)}°
                        </Text>
                    </View>
                </LinearGradient>

                <View style={[styles.statusPill, isAligned && styles.statusPillAligned]}>
                    <Feather name={isAligned ? "check-circle" : "compass"} size={16} color={isAligned ? "#0C0F0E" : "#C9A84C"} style={{ marginRight: 8 }} />
                    <Text style={[styles.statusText, isAligned && styles.statusTextAligned]}>
                        {isAligned ? 'Qibla found. You are aligned.' : 'Rotate Phone to point at Kaaba.'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F0E' },
    locatingText: { color: '#9A9590', fontSize: 16, marginTop: 20 },
    errorText: { color: '#E53E3E', fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
    header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 },
    headerTitle: { color: '#E8E6E1', fontSize: 32, fontWeight: '300', letterSpacing: 0.5 },
    headerSubtitle: { color: '#9A9590', fontSize: 15, marginTop: 4 },
    compassContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    infoWrapper: { paddingHorizontal: 24, paddingBottom: 50 },
    infoCard: { flexDirection: 'row', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
    infoBlock: { flex: 1, alignItems: 'center' },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    infoLabel: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    infoData: { color: '#E8E6E1', fontSize: 28, fontWeight: '300', fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light' },
    smTxt: { fontSize: 14, color: '#9A9590' },
    statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 30, backgroundColor: 'rgba(201, 168, 76, 0.1)', borderWidth: 1, borderColor: 'rgba(201, 168, 76, 0.3)' },
    statusText: { color: '#C9A84C', fontSize: 15, fontWeight: '600' },
    statusPillAligned: { backgroundColor: '#C9A84C' },
    statusTextAligned: { color: '#0C0F0E' }
});
