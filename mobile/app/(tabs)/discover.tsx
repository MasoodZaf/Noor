import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Svg, { Circle, Line, Rect, G, Text as SvgText, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        let subscription: Location.LocationSubscription;

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            subscription = await Location.watchHeadingAsync((headingData) => {
                const newHeading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
                setHeading(newHeading);
            });
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    // Placeholder Makkah bearing for UI demonstration (e.g. 247 deg from Pakistan)
    // Later to be calculated dynamically from GPS
    const qiblaBearing = 247;

    // Rotate the entire compass so North is always pointing physically North
    // and the Qibla needle relative to it.
    const compassRotation = 360 - heading;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Top Text Segment */}
                <View style={styles.header}>
                    <Text style={styles.titleText}>Makkah al-Mukarramah</Text>
                    <Text style={styles.subtitleText}>4,520 km</Text>
                </View>

                {/* Noor Inspired Premium Islamic Compass */}
                <View style={[styles.compassWrapper, { height: width }]}>
                    <View style={[styles.compassDial, { transform: [{ rotate: `-${heading}deg` }] }]}>
                        <Svg width={width * 0.9} height={width * 0.9} viewBox="0 0 400 400">
                            {/* Outer sleek ring */}
                            <Circle cx="200" cy="200" r="180" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" fill="rgba(201, 168, 76, 0.02)" />

                            {/* Inner geometric ring */}
                            <Circle cx="200" cy="200" r="110" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" fill="transparent" />

                            {/* Tick Marks for 360 degrees */}
                            {Array.from({ length: 72 }).map((_, i) => {
                                const angle = i * 5;
                                const isMajor = i % 18 === 0; // N, E, S, W
                                const isMedium = i % 6 === 0; // Every 30 deg

                                if (isMajor) return null; // Skip where letters go

                                return (
                                    <Line
                                        key={i}
                                        x1="200" y1={isMedium ? 25 : 30}
                                        x2="200" y2="40"
                                        stroke={isMedium ? "rgba(201, 168, 76, 0.5)" : "rgba(255, 255, 255, 0.15)"}
                                        strokeWidth={isMedium ? 2 : 1}
                                        transform={`rotate(${angle} 200 200)`}
                                    />
                                );
                            })}

                            {/* Cardinal Directions */}
                            <SvgText x="200" y="38" fill="#C9A84C" fontSize="24" fontWeight="600" textAnchor="middle">N</SvgText>
                            <SvgText x="372" y="208" fill="#9A9590" fontSize="18" fontWeight="500" textAnchor="middle">E</SvgText>
                            <SvgText x="200" y="378" fill="#9A9590" fontSize="18" fontWeight="500" textAnchor="middle">S</SvgText>
                            <SvgText x="28" y="208" fill="#9A9590" fontSize="18" fontWeight="500" textAnchor="middle">W</SvgText>

                            {/* Qibla Needle */}
                            <G transform={`rotate(${qiblaBearing}, 200, 200)`}>
                                {/* Dashed Needle Line */}
                                <Line x1="200" y1="190" x2="200" y2="85" stroke="#C9A84C" strokeWidth="2" strokeDasharray="6,6" opacity="0.8" />

                                {/* Arrow pointing to Kaaba */}
                                <Path d="M194 95 L200 85 L206 95 Z" fill="#C9A84C" />

                                {/* Kaaba Icon */}
                                <G transform="translate(188, 55)">
                                    {/* Base Kaaba */}
                                    <Rect width="24" height="28" fill="#0C0F0E" stroke="#C9A84C" strokeWidth="1.5" rx="2" />
                                    {/* Golden band (Kiswah detail) */}
                                    <Line x1="0" y1="8" x2="24" y2="8" stroke="#C9A84C" strokeWidth="2" />
                                    <Line x1="0" y1="13" x2="24" y2="13" stroke="#C9A84C" strokeWidth="1" />
                                    {/* Door approximation */}
                                    <Rect x="14" y="15" width="6" height="13" fill="#C9A84C" rx="1" />
                                </G>
                            </G>

                            {/* Center Pin: Rub el Hizb (8-pointed star) */}
                            <G transform="translate(200, 200)">
                                <Rect x="-8" y="-8" width="16" height="16" fill="#1F4E3D" stroke="#C9A84C" strokeWidth="1.5" transform="rotate(0)" />
                                <Rect x="-8" y="-8" width="16" height="16" fill="#1F4E3D" stroke="#C9A84C" strokeWidth="1.5" transform="rotate(45)" />
                                <Circle cx="0" cy="0" r="3" fill="#C9A84C" />
                            </G>
                        </Svg>
                    </View>
                </View>

                {/* Bottom Degrees reading */}
                <View style={styles.readingContainer}>
                    <Text style={styles.degreesText}>{Math.round(heading)}°</Text>
                    <Text style={styles.directionText}>
                        {getDirectionLetter(heading)}
                    </Text>
                </View>

                {/* Explore Features Segment */}
                <View style={styles.exploreSection}>
                    <Text style={styles.sectionTitle}>Explore</Text>

                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/ask')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="message-circle" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Ask AiDeen</Text>
                            <Text style={styles.exploreSubtitle}>AI-powered Islamic Q&A companion</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/halal')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="map-pin" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Halal Places</Text>
                            <Text style={styles.exploreSubtitle}>Find restaurants & mosques near you</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/live')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="video" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Makkah Live</Text>
                            <Text style={styles.exploreSubtitle}>Watch live streams from the Holy Sites</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

// Helper utility
function getDirectionLetter(heading: number) {
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
        width: '100%',
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
        marginTop: 40,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
    },
    compassDial: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    readingContainer: {
        marginBottom: 60,
        alignItems: 'center',
    },
    degreesText: {
        color: '#E8E6E1',
        fontSize: 64,
        fontWeight: '200',
        letterSpacing: -1.5,
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
    },
    directionText: {
        color: '#C9A84C',
        fontSize: 20,
        fontWeight: '500',
        letterSpacing: 2,
        marginTop: 4,
    },
    exploreSection: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    exploreCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    exploreIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    exploreContent: {
        flex: 1,
    },
    exploreTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    exploreSubtitle: {
        color: '#9A9590',
        fontSize: 13,
    }
});
