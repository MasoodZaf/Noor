import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../context/DatabaseContext';
import { getLocalUserId } from '../../utils/userId';

const { width } = Dimensions.get('window');

export default function QaidaScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db, isReady } = useDatabase();

    const [progress, setProgress] = useState(0);
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!db || !isReady) return;
        try {
            // Load all lessons
            const rows = await db.getAllAsync('SELECT * FROM qaida_lessons ORDER BY id ASC');
            setLessons(rows);

            const userId = await getLocalUserId();

            // Ensure a progress row always exists for this user (first-time users)
            await db.runAsync(
                `INSERT OR IGNORE INTO qaida_progress (user_id, current_lesson_id) VALUES (?, 1)`,
                [userId]
            );

            const progRow = await db.getFirstAsync(
                'SELECT current_lesson_id FROM qaida_progress WHERE user_id = ?',
                [userId]
            ) as any;

            if (progRow) {
                // current_lesson_id points to the next lesson to do.
                // completed count = current_lesson_id - 1
                setProgress(progRow.current_lesson_id - 1);
            }
        } catch (err) {
            console.error("Qaida load error:", err);
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    if (!isReady || loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#f4d125" />
            </View>
        );
    }

    const currentLesson = lessons[progress] || lessons[lessons.length - 1];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Noorani Qaida</Text>
                </View>
                <View style={styles.starBadge}>
                    <Feather name="star" size={24} color="#FFD166" />
                    <Text style={styles.starText}>{progress * 15 + 5}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Hero Journey Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroSub}>Assalamu Alaikum, Ahmed!</Text>
                            <Text style={styles.heroTitle}>Keep learning!</Text>
                        </View>
                        <View style={styles.heroIconBox}>
                            <Feather name="award" size={24} color="#f4d125" />
                        </View>
                    </View>

                    {/* Progress Track */}
                    <View style={styles.trackContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                            <Text style={{ ...styles.trackText, marginTop: 0 }}>Total Progress</Text>
                            <Text style={{ ...styles.heroTitle, fontSize: 18, color: '#f4d125', marginBottom: 0 }}>
                                {lessons.length > 0 ? Math.round((progress / lessons.length) * 100) : 0}%
                            </Text>
                        </View>
                        <View style={styles.trackBg}>
                            <View style={[styles.trackFill, { width: `${lessons.length > 0 ? (progress / lessons.length) * 100 : 0}%` }]} />
                        </View>
                        <Text style={[styles.trackText, { marginTop: 8, fontSize: 12, opacity: 0.6 }]}>{progress} of {lessons.length} Lessons Completed</Text>
                    </View>
                </View>

                {/* Quick Action */}
                <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => router.push(`/qaida/${progress + 1}`)}
                >
                    <View style={styles.quickActionIcon}>
                        <Feather name="play" size={20} color="#1A1A1A" />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={styles.quickActionSub}>CONTINUE PREVIOUS</Text>
                        <Text style={styles.quickActionTitle}>Lesson {progress + 1}: {lessons[progress]?.title || 'Finished'}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#8A8A8A" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>Interactive Lessons</Text>
                    <Text style={{ color: '#f4d125', fontWeight: 'bold', fontSize: 13 }}>View All</Text>
                </View>

                {/* Lessons Grid (Zig-Zag kid-friendly path layout) */}
                <View style={styles.lessonsGrid}>
                    {lessons.map((lesson, index) => {
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
                                onPress={() => !isLocked && router.push(`/qaida/${lesson.id}`)}
                            >
                                <View style={styles.lessonRight}>
                                    {isCompleted ? (
                                        <View style={[styles.statusOrb, { backgroundColor: '#4ECDC4' }]}>
                                            <Feather name="check" size={16} color="#FDF8F0" />
                                        </View>
                                    ) : isCurrent ? (
                                        <View style={[styles.statusOrb, { backgroundColor: '#FFD166' }]}>
                                            <Feather name="play" size={16} color="#FDF8F0" style={{ marginLeft: 2 }} />
                                        </View>
                                    ) : (
                                        <View style={[styles.statusOrb, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                                            <Feather name="lock" size={14} color="#5E5C58" />
                                        </View>
                                    )}
                                </View>

                                <View style={[styles.arabicBox]}>
                                    <Text style={[styles.arabicText, { color: isLocked ? '#5E5C58' : lesson.color }]}>{lesson.arabic_icon}</Text>
                                </View>
                                <Text style={[styles.lessonTitleMain, isLocked && { color: '#8A8A8A' }]}>{lesson.id}. {lesson.title}</Text>
                                <Text style={[styles.lessonSub, isLocked && { color: '#A0A0A0' }]}>{isLocked ? 'Not Started' : isCurrent ? 'Continue' : 'Completed'}</Text>
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
        backgroundColor: '#f8f8f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        letterSpacing: 0.5,
    },
    starBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    starText: {
        color: '#1A1A1A',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 6,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    heroCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(244, 209, 37, 0.2)', // primary/20
        borderWidth: 1,
        borderColor: 'rgba(244, 209, 37, 0.3)',
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    heroIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTitle: {
        color: '#1A1A1A',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    heroSub: {
        color: '#5E5C58',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    trackContainer: {
        marginTop: 4,
    },
    trackBg: {
        height: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    trackFill: {
        height: '100%',
        backgroundColor: '#f4d125',
        borderRadius: 6,
    },
    trackText: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    quickActionCard: {
        width: '100%',
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#f4d125',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionSub: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    quickActionTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 2,
    },
    sectionTitle: {
        color: '#1A1A1A',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    lessonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    lessonCard: {
        width: (width - 40 - 16) / 2, // 2 columns
        aspectRatio: 1, // Make it square
        borderRadius: 16,
        padding: 16,
        position: 'relative',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        borderWidth: 1,
    },
    lessonCardCurrent: {
        borderColor: '#f4d125',
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
    },
    lessonCardLocked: {
        opacity: 0.6,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderColor: 'rgba(0,0,0,0.05)',
    },
    lessonRight: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },
    statusOrb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arabicBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'auto', // Pushes text to bottom
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    arabicText: {
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    lessonTitleMain: {
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    lessonSub: {
        color: '#5E5C58',
        fontSize: 11,
        fontWeight: '500',
    },
});
