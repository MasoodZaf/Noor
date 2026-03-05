import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Mock data based directly on your Supabase Hifz Progress Schema
const mockHifzData = [
    { surah: 114, name: 'An-Nas', status: 'memorized', interval: 14, nextReview: 'Today' },
    { surah: 113, name: 'Al-Falaq', status: 'memorized', interval: 12, nextReview: 'Tomorrow' },
    { surah: 112, name: 'Al-Ikhlas', status: 'needs_review', interval: 2, nextReview: 'Due Now' },
    { surah: 67, name: 'Al-Mulk', status: 'learning', interval: 1, nextReview: 'Learning' },
    { surah: 36, name: 'Ya-Sin', status: 'learning', interval: 1, nextReview: 'Learning' },
];

export default function HifzTrackerScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'review'>('dashboard');

    // Ring animation for the main mastery ring
    const [progressAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: 78, // Let's say 78% of target is met
            duration: 1500,
            useNativeDriver: true,
        }).start();
    }, []);

    // SVG Ring specific calculation
    const radius = 60;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    // Hardcoded to 78% for demo, but can bind cleanly to Animated using standard patterns later
    const currentDashoffset = circumference - (0.78 * circumference);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hifz Memory Tracker</Text>
                <TouchableOpacity style={styles.actionButton}>
                    <Feather name="plus" size={24} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {/* Custom Tab Bar */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'review' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('review')}
                >
                    <Text style={[styles.tabText, activeTab === 'review' && styles.tabTextActive]}>SRS Review
                        <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeTab === 'dashboard' ? (
                    <>
                        {/* Premium Data Vis Header */}
                        <LinearGradient
                            colors={['rgba(201, 168, 76, 0.15)', 'rgba(31, 78, 61, 0.05)']}
                            style={styles.statsCard}
                        >
                            <View style={styles.radialContainer}>
                                <Svg width={150} height={150} viewBox="0 0 150 150">
                                    <Defs>
                                        <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <Stop offset="0%" stopColor="#C9A84C" />
                                            <Stop offset="100%" stopColor="#8A702D" />
                                        </SvgGradient>
                                    </Defs>
                                    <Circle
                                        cx="75" cy="75" r={radius}
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth={strokeWidth}
                                        fill="none"
                                    />
                                    <Circle
                                        cx="75" cy="75" r={radius}
                                        stroke="url(#grad)"
                                        strokeWidth={strokeWidth}
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={currentDashoffset}
                                        strokeLinecap="round"
                                        transform="rotate(-90 75 75)"
                                    />
                                </Svg>
                                <View style={styles.radialTextContainer}>
                                    <Text style={styles.radialNumber}>78<Text style={styles.radialPercent}>%</Text></Text>
                                    <Text style={styles.radialLabel}>Mastery</Text>
                                </View>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>5</Text>
                                    <Text style={styles.statLabel}>Active Surahs</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>1,402</Text>
                                    <Text style={styles.statLabel}>Ayahs Memorized</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <Text style={styles.sectionTitle}>Learning Pipeline</Text>
                        <View style={styles.pipeline}>
                            {mockHifzData.filter(d => d.status === 'learning').map((surah, idx) => (
                                <View key={idx} style={styles.surahRow}>
                                    <View style={styles.surahIcon}>
                                        <Feather name="book-open" size={20} color="#9A9590" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.surahName}>{surah.name}</Text>
                                        <Text style={styles.surahSub}>Currently Memorizing</Text>
                                    </View>
                                    <View style={styles.statusPill}>
                                        <Text style={styles.statusPillText}>Learning</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.srsHeader}>
                            <Feather name="activity" size={40} color="#C9A84C" style={{ marginBottom: 16 }} />
                            <Text style={styles.srsTitle}>Spaced Repetition</Text>
                            <Text style={styles.srsDesc}>Our algorithm (SM-2) intelligently calculates exactly when you need to review a verse before you forget it.</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Due for Review</Text>

                        {mockHifzData.filter(d => d.status === 'needs_review' || d.status === 'learning').map((surah, idx) => (
                            <TouchableOpacity key={idx} style={styles.reviewCard}>
                                <LinearGradient
                                    colors={['rgba(201, 168, 76, 0.1)', 'transparent']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.reviewRow}>
                                    <View>
                                        <Text style={styles.reviewSurah}>{surah.name}</Text>
                                        <Text style={[
                                            styles.reviewDue,
                                            surah.nextReview === 'Due Now' && { color: '#E53E3E', fontWeight: 'bold' } // Flag red for due now
                                        ]}>{surah.nextReview}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.startBtn}>
                                        <Feather name="play" size={16} color="#0C0F0E" />
                                        <Text style={styles.startBtnText}>Start Drill</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    actionButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    tabBtnActive: {
        borderBottomColor: '#C9A84C',
    },
    tabText: {
        color: '#5E5C58',
        fontSize: 15,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#C9A84C',
    },
    badge: {
        backgroundColor: '#E53E3E',
        borderRadius: 10,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        transform: [{ translateY: -2 }]
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    statsCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
        alignItems: 'center',
    },
    radialContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    radialTextContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radialNumber: {
        color: '#E8E6E1',
        fontSize: 36,
        fontWeight: 'bold',
    },
    radialPercent: {
        fontSize: 20,
        color: '#C9A84C',
    },
    radialLabel: {
        color: '#9A9590',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 24,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        color: '#E8E6E1',
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 4,
    },
    statLabel: {
        color: '#9A9590',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    pipeline: {
        gap: 12,
    },
    surahRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.02)',
    },
    surahIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    surahName: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    surahSub: {
        color: '#9A9590',
        fontSize: 13,
    },
    statusPill: {
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    statusPillText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    srsHeader: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
    },
    srsTitle: {
        color: '#E8E6E1',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
    },
    srsDesc: {
        color: '#9A9590',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    reviewCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
        marginBottom: 16,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    reviewSurah: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    reviewDue: {
        color: '#9A9590',
        fontSize: 13,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C9A84C',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    startBtnText: {
        color: '#0C0F0E',
        fontSize: 14,
        fontWeight: 'bold',
    }
});
