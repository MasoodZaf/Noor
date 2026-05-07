import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../../context/DatabaseContext';
import { getLocalUserId } from '../../utils/userId';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function QaidaScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db, isReady } = useDatabase();
    const { theme } = useTheme();

    const [progress, setProgress] = useState(0);
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    // Back chevron: pop the stack if possible, otherwise fall back to Home tab
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    };

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

            const progRow = await db.getFirstAsync<{ current_lesson_id: number }>(
                'SELECT current_lesson_id FROM qaida_progress WHERE user_id = ?',
                [userId]
            );

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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.gold} />
            </View>
        );
    }

    const currentLesson = lessons[progress] || lessons[lessons.length - 1];

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity
                        onPress={goBack}
                        hitSlop={10}
                        style={{ marginLeft: -6, marginRight: 6, paddingVertical: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Noorani Qaida</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Quick Action */}
                <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.accent }]}
                    onPress={() => router.push(`/qaida/${progress + 1}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Continue lesson ${progress + 1}: ${lessons[progress]?.title || 'Finished'}`}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: theme.gold }]}>
                        <Feather name="play" size={20} color={theme.textInverse} />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={[styles.quickActionSub, { color: theme.textSecondary }]}>CONTINUE PREVIOUS</Text>
                        <Text style={[styles.quickActionTitle, { color: theme.textInverse }]}>Lesson {progress + 1}: {lessons[progress]?.title || 'Finished'}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ ...styles.sectionTitle, marginBottom: 0, color: theme.textPrimary }}>Interactive Lessons</Text>
                    {lessons.length > 4 && (
                        <TouchableOpacity
                            onPress={() => setShowAll(v => !v)}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={showAll ? 'Show fewer lessons' : 'View all lessons'}
                        >
                            <Text style={{ color: theme.gold, fontWeight: 'bold', fontSize: 13 }}>
                                {showAll ? 'Show Less' : 'View All'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Lessons Grid (Zig-Zag kid-friendly path layout) */}
                <View style={styles.lessonsGrid}>
                    {(showAll ? lessons : lessons.slice(0, 4)).map((lesson, index) => {
                        const isCompleted = index < progress;
                        const isCurrent = index === progress;
                        const isLocked = index > progress;

                        return (
                            <TouchableOpacity
                                key={lesson.id}
                                style={[
                                    styles.lessonCard,
                                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                                    isLocked && styles.lessonCardLocked,
                                    isCurrent && [styles.lessonCardCurrent, { borderColor: theme.gold }]
                                ]}
                                activeOpacity={isLocked ? 1 : 0.8}
                                onPress={() => !isLocked && router.push(`/qaida/${lesson.id}`)}
                                accessibilityRole="button"
                                accessibilityLabel={`Lesson ${lesson.id}: ${lesson.title}, ${isLocked ? 'locked' : isCurrent ? 'continue' : 'completed'}`}
                                accessibilityState={{ disabled: isLocked, selected: isCurrent }}
                            >
                                <View style={styles.lessonRight}>
                                    {isCompleted ? (
                                        <View style={[styles.statusOrb, { backgroundColor: '#4ECDC4' }]}>
                                            <Feather name="check" size={16} color={theme.textInverse} />
                                        </View>
                                    ) : isCurrent ? (
                                        <View style={[styles.statusOrb, { backgroundColor: theme.gold }]}>
                                            <Feather name="play" size={16} color={theme.textInverse} style={{ marginLeft: 2 }} />
                                        </View>
                                    ) : (
                                        <View style={[styles.statusOrb, { backgroundColor: theme.bgInput }]}>
                                            <Feather name="lock" size={14} color={theme.textTertiary} />
                                        </View>
                                    )}
                                </View>

                                <View style={[styles.arabicBox, { backgroundColor: theme.bgInput }]}>
                                    <Text style={[styles.arabicText, { color: isLocked ? theme.textTertiary : lesson.color }]}>{lesson.arabic_icon}</Text>
                                </View>
                                <Text style={[styles.lessonTitleMain, { color: theme.textPrimary }, isLocked && { color: theme.textTertiary }]}>{lesson.id}. {lesson.title}</Text>
                                <Text style={[styles.lessonSub, { color: theme.textSecondary }, isLocked && { color: theme.textTertiary }]}>{isLocked ? 'Not Started' : isCurrent ? 'Continue' : 'Completed'}</Text>
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },
    content: { paddingHorizontal: 20, paddingTop: 10 },
    quickActionCard: {
        width: '100%', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', marginBottom: 24,
    },
    quickActionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    quickActionSub: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
    quickActionTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    lessonsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    lessonCard: {
        width: (width - 40 - 16) / 2, aspectRatio: 1, borderRadius: 16, padding: 16,
        position: 'relative', flexDirection: 'column', justifyContent: 'flex-end', borderWidth: 1,
    },
    lessonCardCurrent: { borderWidth: 2, transform: [{ scale: 1.02 }] },
    lessonCardLocked: { opacity: 0.6 },
    lessonRight: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
    statusOrb: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    arabicBox: {
        width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        marginBottom: 'auto',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    },
    arabicText: { fontSize: 24, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif' },
    lessonTitleMain: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    lessonSub: { fontSize: 11, fontWeight: '500' },
});
