import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Coordinates, Qibla } from 'adhan';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.8;

// Makkah coordinates
const MAKKAH_LAT = 21.4225;
const MAKKAH_LNG = 39.8262;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function getDirectionLetter(heading: number): string {
    if (heading >= 337.5 || heading < 22.5) return 'N';
    if (heading >= 22.5 && heading < 67.5) return 'NE';
    if (heading >= 67.5 && heading < 112.5) return 'E';
    if (heading >= 112.5 && heading < 157.5) return 'SE';
    if (heading >= 157.5 && heading < 202.5) return 'S';
    if (heading >= 202.5 && heading < 247.5) return 'SW';
    if (heading >= 247.5 && heading < 292.5) return 'W';
    if (heading >= 292.5 && heading < 337.5) return 'NW';
    return '';
}

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const [heading, setHeading] = useState(0);
    const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Get GPS and calculate Qibla direction
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const coords = new Coordinates(location.coords.latitude, location.coords.longitude);
                setQiblaBearing(Qibla(coords));
                setDistance(haversineDistance(
                    location.coords.latitude,
                    location.coords.longitude,
                    MAKKAH_LAT,
                    MAKKAH_LNG,
                ));
            } catch {
                // Fall back gracefully — compass still works, just no Qibla needle
            }
            setLoading(false);
        })();
    }, []);

    // Magnetometer subscription
    useEffect(() => {
        Magnetometer.setUpdateInterval(150);
        const subscription = Magnetometer.addListener((data) => {
            let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
            angle = Math.round((angle + 360) % 360);
            setHeading(angle);
        });

        return () => subscription.remove();
    }, []);

    const compassRotation = 360 - heading;

    if (loading) {
        return (
            <View style={[styles.container, styles.centeredContent, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Finding Qibla direction...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Top Text */}
            <View style={styles.header}>
                <Text style={styles.titleText}>Makkah al-Mukarramah</Text>
                <Text style={styles.subtitleText}>
                    {distance !== null ? `${distance.toLocaleString()} km` : 'Calculating...'}
                </Text>
            </View>

            {/* Compass */}
            <View style={styles.compassWrapper}>
                <View style={[styles.compassDial, { transform: [{ rotate: `${compassRotation}deg` }] }]}>

                    {/* SVG: ring, tick marks, and cardinal labels */}
                    <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox="0 0 200 200">
                        <Circle cx="100" cy="100" r="95" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" fill="transparent" />
                        {/* Tick marks for cardinal directions */}
                        <Rect x="99" y="8" width="2" height="12" fill="#9A9590" rx="1" />
                        <Rect x="99" y="180" width="2" height="12" fill="rgba(255,255,255,0.15)" rx="1" />
                        <Rect x="8" y="99" width="12" height="2" fill="rgba(255,255,255,0.15)" rx="1" />
                        <Rect x="180" y="99" width="12" height="2" fill="rgba(255,255,255,0.15)" rx="1" />
                        {/* Cardinal labels */}
                        <SvgText x="100" y="32" fill="#E8E6E1" fontSize="13" fontWeight="600" textAnchor="middle">N</SvgText>
                        <SvgText x="100" y="196" fill="rgba(255,255,255,0.3)" fontSize="11" textAnchor="middle">S</SvgText>
                        <SvgText x="192" y="104" fill="rgba(255,255,255,0.3)" fontSize="11" textAnchor="middle">E</SvgText>
                        <SvgText x="10" y="104" fill="rgba(255,255,255,0.3)" fontSize="11" textAnchor="middle">W</SvgText>
                    </Svg>

                    {/* Qibla Needle — absolutely positioned outside SVG, inside compass dial */}
                    {qiblaBearing !== null && (
                        <View
                            style={[
                                styles.needleContainer,
                                { transform: [{ rotate: `${qiblaBearing}deg` }] },
                            ]}
                        >
                            <View style={styles.qiblaNeedle} />
                            <View style={styles.kaabaIcon} />
                        </View>
                    )}
                </View>

                {/* Fixed Center Pin (doesn't rotate) */}
                <View style={styles.centerPin} />
            </View>

            {/* Degrees readout */}
            <View style={styles.readingContainer}>
                <Text style={styles.degreesText}>{heading}°</Text>
                <Text style={styles.directionText}>{getDirectionLetter(heading)}</Text>
                {qiblaBearing !== null && (
                    <Text style={styles.qiblaBearingText}>Qibla at {Math.round(qiblaBearing)}°</Text>
                )}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
        alignItems: 'center',
    },
    centeredContent: {
        justifyContent: 'center',
    },
    loadingText: {
        color: '#9A9590',
        fontSize: 14,
        marginTop: 16,
    },
    header: {
        marginTop: 40,
        alignItems: 'center',
    },
    titleText: {
        color: '#E8E6E1',
        fontSize: 22,
        fontWeight: '300',
        letterSpacing: 1,
    },
    subtitleText: {
        color: '#9A9590',
        fontSize: 14,
        letterSpacing: 0.5,
        marginTop: 6,
    },
    compassWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    compassDial: {
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: COMPASS_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    needleContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qiblaNeedle: {
        position: 'absolute',
        top: 20,
        width: 2,
        height: COMPASS_SIZE / 2 - 20,
        backgroundColor: '#C9A84C',
    },
    kaabaIcon: {
        position: 'absolute',
        top: 10,
        width: 14,
        height: 16,
        backgroundColor: '#C9A84C',
        borderRadius: 2,
    },
    centerPin: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1F4E3D',
        borderWidth: 2,
        borderColor: '#C9A84C',
    },
    readingContainer: {
        marginBottom: 60,
        alignItems: 'center',
    },
    degreesText: {
        color: '#E8E6E1',
        fontSize: 56,
        fontWeight: '200',
        letterSpacing: -1,
    },
    directionText: {
        color: '#C9A84C',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 2,
        marginTop: 4,
    },
    qiblaBearingText: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 8,
        letterSpacing: 0.5,
    },
});
