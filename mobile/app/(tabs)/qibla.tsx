import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

    // Magnetometer Animation bindings
    const [compassRingAnim] = useState(new Animated.Value(0));

    // Great Circle formula to calculate exact bearing vs Mecca
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
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const qiblaAngle = calculateQibla(latitude, longitude);
            setQiblaDirection(qiblaAngle);
            setDistance(Math.round(calculateDistance(latitude, longitude)));
            setLocationReady(true);
        })();

        // Hardware Magnetometer listening loop for absolute smooth 60fps pointing
        Magnetometer.setUpdateInterval(50);
        const subscription = Magnetometer.addListener((data) => {
            // Need to convert x,y raw coordinates to Heading Deg (0-360)
            let rawAngle = Math.atan2(data.y, data.x) * (180 / Math.PI);
            rawAngle = rawAngle >= 0 ? rawAngle : rawAngle + 360;
            // Native Sensor offset heuristics depending on typical iOS rotation axes
            const deviceHeading = Math.round(rawAngle);
            setHeading(deviceHeading);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Compass visual smoothing calculation vs the magnetic pole
    let compassRotation = 360 - heading;
    // Map overlay to point absolute exactly at the computed Qibla target relative to phone rotation
    let qiblaArrowRotation = qiblaDirection - heading;

    // Soft smoothing visual
    Animated.timing(compassRingAnim, {
        toValue: compassRotation,
        duration: 200, // micro tick
        easing: Easing.linear,
        useNativeDriver: true,
    }).start();

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

    // Determine correctness "snap" effect
    // If the device's North alignment roughly equals Qibla within 2 degrees leeway
    const dif = Math.abs((heading - qiblaDirection) % 360);
    const isAligned = dif < 3 || dif > 357;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Qibla Compass</Text>
                <Text style={styles.headerSubtitle}>Locate the Kaaba instantly anywhere.</Text>
            </View>

            <View style={styles.compassWrapper}>
                {/* Visual Radar Ring Underlay */}
                <Animated.View style={[
                    styles.radarAura,
                    isAligned && { backgroundColor: 'rgba(201, 168, 76, 0.2)' }
                ]} />

                <View style={styles.compassCenter}>
                    {/* Primary Compass Ring (Points North Always natively) */}
                    <Animated.View
                        style={[
                            styles.compassRing,
                            { transform: [{ rotate: `${compassRotation}deg` }] }
                        ]}
                    >
                        <View style={styles.northIndicator} />
                        {/* Dial marks */}
                        <View style={styles.dialMarks}>
                            <Text style={[styles.dialText, { top: -25, left: -6 }]}>N</Text>
                            <Text style={[styles.dialText, { bottom: -25, left: -6 }]}>S</Text>
                            <Text style={[styles.dialText, { top: 125, left: 153 }]}>E</Text>
                            <Text style={[styles.dialText, { top: 125, left: -160 }]}>W</Text>
                        </View>
                    </Animated.View>

                    {/* Qibla Direction True Arrow overlay mapped on top of rotation ring */}
                    <Animated.View style={[
                        styles.qiblaNeedleContainer,
                        { transform: [{ rotate: `${qiblaArrowRotation}deg` }] }
                    ]}>
                        <LinearGradient
                            colors={isAligned ? ['#C9A84C', '#FFD700'] : ['#E8E6E1', '#9A9590']}
                            style={styles.qiblaNeedleStem}
                        />
                        <View style={[styles.qiblaNeedleHead, isAligned && { borderBottomColor: '#C9A84C' }]} />

                        {/* Little Kaaba Box representing the target */}
                        <View style={styles.kaabaOrb}>
                            <View style={styles.kaabaBox}>
                                <View style={styles.kaabaDoor} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* Locking Feedback glow ring */}
                    {isAligned && (
                        <View style={styles.lockedGlow} />
                    )}
                </View>

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
                        <Text style={styles.infoLabel}>Degrees</Text>
                        <Text style={[styles.infoData, isAligned && { color: '#C9A84C' }]}>
                            {Math.round(qiblaDirection)}°
                        </Text>
                    </View>
                </LinearGradient>

                <View style={[styles.statusPill, isAligned && styles.statusPillAligned]}>
                    <Feather name={isAligned ? "check-circle" : "compass"} size={16} color={isAligned ? "#0C0F0E" : "#C9A84C"} style={{ marginRight: 8 }} />
                    <Text style={[styles.statusText, isAligned && styles.statusTextAligned]}>
                        {isAligned ? 'Qibla found. You are aligned.' : 'Rotate Phone to align arrow.'}
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
    header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20 },
    headerTitle: { color: '#E8E6E1', fontSize: 32, fontWeight: '300', letterSpacing: 0.5 },
    headerSubtitle: { color: '#9A9590', fontSize: 15, marginTop: 4 },
    compassWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    radarAura: { position: 'absolute', width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45, backgroundColor: 'rgba(255,255,255,0.02)' },
    compassCenter: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
    compassRing: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 2, borderColor: 'rgba(201, 168, 76, 0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255, 0.02)' },
    northIndicator: { position: 'absolute', top: 0, width: 4, height: 20, backgroundColor: '#E53E3E', borderRadius: 2 },
    dialMarks: { ...StyleSheet.absoluteFillObject },
    dialText: { position: 'absolute', color: '#9A9590', fontSize: 18, fontWeight: 'bold' },
    qiblaNeedleContainer: { position: 'absolute', width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
    qiblaNeedleStem: { position: 'absolute', top: 150, width: 4, height: 120, borderRadius: 2 },
    qiblaNeedleHead: { position: 'absolute', top: 30, width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#E8E6E1' },
    kaabaOrb: { position: 'absolute', top: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
    kaabaBox: { width: 16, height: 16, backgroundColor: '#000', borderWidth: 1, borderColor: '#C9A84C' },
    kaabaDoor: { position: 'absolute', bottom: 0, left: 6, width: 4, height: 8, backgroundColor: '#C9A84C' },
    lockedGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, borderWidth: 4, borderColor: 'rgba(201, 168, 76, 0.5)' },
    infoWrapper: { paddingHorizontal: 24, paddingBottom: 50 },
    infoCard: { flexDirection: 'row', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
    infoBlock: { flex: 1, alignItems: 'center' },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    infoLabel: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    infoData: { color: '#E8E6E1', fontSize: 28, fontWeight: '300' },
    smTxt: { fontSize: 14, color: '#9A9590' },
    statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 30, backgroundColor: 'rgba(201, 168, 76, 0.1)', borderWidth: 1, borderColor: 'rgba(201, 168, 76, 0.3)' },
    statusText: { color: '#C9A84C', fontSize: 15, fontWeight: '600' },
    statusPillAligned: { backgroundColor: '#C9A84C' },
    statusTextAligned: { color: '#0C0F0E' }
});
