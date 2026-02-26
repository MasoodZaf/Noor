import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [heading, setHeading] = useState(0);

    useEffect(() => {
        Magnetometer.setUpdateInterval(50);
        const subscription = Magnetometer.addListener((data) => {
            let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
            angle = Math.round((angle + 360) % 360);
            setHeading(angle);
        });

        return () => subscription && subscription.remove();
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

                {/* Premium Swiss-watch style Compass */}
                <View style={[styles.compassWrapper, { height: width, marginVertical: 20 }]}>
                    <View style={[styles.compassDial, { transform: [{ rotate: `${compassRotation}deg` }] }]}>
                        <Svg width={width * 0.8} height={width * 0.8} viewBox="0 0 200 200">
                            {/* Outer sleek border */}
                            <Circle cx="100" cy="100" r="95" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" fill="transparent" />

                            {/* North Indicator */}
                            <Text style={[styles.northText, { top: -20 }]}>N</Text>

                            {/* Qibla Needle (Gold) */}
                            <View style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: [{ rotate: `${qiblaBearing}deg` }]
                            }}>
                                <View style={styles.qiblaNeedle} />
                                {/* Small Kaaba representation */}
                                <View style={styles.kaabaIcon} />
                            </View>

                        </Svg>
                    </View>

                    {/* Fixed Center Pin */}
                    <View style={styles.centerPin} />
                </View>

                {/* Bottom Degrees reading */}
                <View style={styles.readingContainer}>
                    <Text style={styles.degreesText}>{heading}°</Text>
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    compassDial: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    northText: {
        position: 'absolute',
        color: '#9A9590',
        fontSize: 16,
        fontWeight: '500',
        alignSelf: 'center',
    },
    qiblaNeedle: {
        position: 'absolute',
        top: 20,
        width: 2,
        height: width * 0.4 - 20,
        backgroundColor: '#C9A84C', // Gold
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
        backgroundColor: '#1F4E3D', // Forest Green
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
