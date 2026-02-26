import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const QAIDA_LESSONS = [
    { id: '1', title: 'The Alphabet', sub: 'Single Letters (Huroof)', color: '#FF6B6B', arabic: 'ا ب ت' },
    { id: '2', title: 'Joint Letters', sub: 'Recognizing shapes', color: '#4ECDC4', arabic: 'بت' },
    { id: '3', title: 'Harakaat', sub: 'Fatha, Kasra, Damma', color: '#45B7D1', arabic: 'بَ بِ بُ' },
    { id: '4', title: 'Tanween', sub: 'Double vowel sounds', color: '#96CEB4', arabic: 'بً بٍ بٌ' },
    { id: '5', title: 'Sukoon', sub: 'Resting sound', color: '#FFEEAD', arabic: 'بْ' },
    { id: '6', title: 'Shaddah', sub: 'Double consonant', color: '#D4A5A5', arabic: 'بّ' },
    { id: '7', title: 'Maddah', sub: 'Stretching sounds', color: '#9B5DE5', arabic: 'آ' },
    { id: '8', title: 'Reading Practice', sub: 'Full words', color: '#F15BB5', arabic: 'قُرْآن' },
];

export default function QaidaScreen() {
    const insets = useSafeAreaInsets();
    const [progress, setProgress] = useState(2); // Mock progress out of 8

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Noorani Qaida</Text>
                    <Text style={styles.headerSub}>Fun & easy learning for kids!</Text>
                </View>
                <View style={styles.starBadge}>
                    <Feather name="star" size={24} color="#FFD166" />
                    <Text style={styles.starText}>35</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Hero Journey Card */}
                <LinearGradient
                    colors={['rgba(255, 107, 107, 0.2)', 'rgba(69, 183, 209, 0.1)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroIconBox}>
                            <Text style={{ fontSize: 32 }}>🚀</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.heroTitle}>Your Journey</Text>
                            <Text style={styles.heroSub}>You are on Lesson {progress + 1}!</Text>
                        </View>
                    </View>

                    {/* Progress Track */}
                    <View style={styles.trackContainer}>
                        <View style={styles.trackBg}>
                            <View style={[styles.trackFill, { width: `${(progress / QAIDA_LESSONS.length) * 100}%` }]} />
                        </View>
                        <Text style={styles.trackText}>{progress}/{QAIDA_LESSONS.length} Lessons Completed</Text>
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>All Lessons</Text>

                {/* Lessons Grid (Zig-Zag kid-friendly path layout) */}
                <View style={styles.lessonsGrid}>
                    {QAIDA_LESSONS.map((lesson, index) => {
                        const isCompleted = index < progress;
                        const isCurrent = index === progress;
                        const isLocked = index > progress;

                        return (
                            <TouchableOpacity
                                key={lesson.id}
                                style={[
                                    styles.lessonCard,
                                    isLocked && styles.lessonCardLocked,
                                    isCurrent && styles.lessonCardCurrent
                                ]}
                                activeOpacity={isLocked ? 1 : 0.8}
                            >
                                <View style={styles.lessonRight}>
                                    {isCompleted ? (
                                        <View style={[styles.statusOrb, { backgroundColor: '#4ECDC4' }]}>
                                            <Feather name="check" size={16} color="#0C0F0E" />
                                        </View>
                                    ) : isCurrent ? (
                                        <View style={[styles.statusOrb, { backgroundColor: '#FFD166' }]}>
                                            <Feather name="play" size={16} color="#0C0F0E" style={{ marginLeft: 2 }} />
                                        </View>
                                    ) : (
                                        <View style={[styles.statusOrb, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                            <Feather name="lock" size={14} color="#9A9590" />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.lessonContent}>
                                    <View style={[styles.arabicBox, { backgroundColor: isLocked ? 'rgba(255,255,255,0.05)' : lesson.color }]}>
                                        <Text style={[styles.arabicText, isLocked && { color: '#5E5C58' }]}>{lesson.arabic}</Text>
                                    </View>
                                    <Text style={[styles.lessonTitle, isLocked && { color: '#9A9590' }]}>Lesson {lesson.id}</Text>
                                    <Text style={[styles.lessonTitleMain, isLocked && { color: '#5E5C58' }]}>{lesson.title}</Text>
                                    <Text style={[styles.lessonSub, isLocked && { color: '#5E5C58' }]}>{lesson.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ height: 40 }} />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E8E6E1',
        letterSpacing: 0.5,
    },
    headerSub: {
        color: '#4ECDC4',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    starBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 209, 102, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 209, 102, 0.3)',
    },
    starText: {
        color: '#FFD166',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 6,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    heroIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroTitle: {
        color: '#E8E6E1',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    heroSub: {
        color: '#F15BB5',
        fontSize: 15,
        fontWeight: '600',
    },
    trackContainer: {
        marginTop: 10,
    },
    trackBg: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    trackFill: {
        height: '100%',
        backgroundColor: '#FFD166',
        borderRadius: 6,
    },
    trackText: {
        color: '#E8E6E1',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'right',
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    lessonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    lessonCard: {
        width: (width - 40 - 16) / 2, // 2 columns
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
    },
    lessonCardCurrent: {
        borderColor: '#FFD166',
        borderWidth: 2,
        backgroundColor: 'rgba(255, 209, 102, 0.05)',
        transform: [{ scale: 1.02 }],
    },
    lessonCardLocked: {
        opacity: 0.6,
    },
    lessonRight: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },
    statusOrb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lessonContent: {
        alignItems: 'flex-start',
    },
    arabicBox: {
        width: 60,
        height: 60,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    arabicText: {
        color: '#0C0F0E',
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    lessonTitle: {
        color: '#9A9590',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    lessonTitleMain: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    lessonSub: {
        color: '#9A9590',
        fontSize: 12,
    },
});
