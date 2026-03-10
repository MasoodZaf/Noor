import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useDatabase } from '../../context/DatabaseContext';
import { getLocalUserId } from '../../utils/userId';

const { width } = Dimensions.get('window');

interface QaidaItem {
    text: string;
    audio: string | null;
    tts?: string; // optional override for TTS (e.g. letter name in Arabic)
}

export default function QaidaLessonScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();

    const [lesson, setLesson] = useState<any>(null);
    const [content, setContent] = useState<QaidaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Speak the Arabic text using TTS (falls back from URL → TTS)
    const playSound = async (item: QaidaItem, index: number) => {
        if (playingId === index) {
            // Tap again = stop
            Speech.stop();
            if (soundRef.current) {
                await soundRef.current.stopAsync().catch(() => {});
                await soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }
            setPlayingId(null);
            return;
        }

        // Stop any currently playing audio
        Speech.stop();
        if (soundRef.current) {
            await soundRef.current.stopAsync().catch(() => {});
            await soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
        }

        setPlayingId(index);

        // Try URL audio first (if available and not dead)
        if (item.audio) {
            try {
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
                const { sound } = await Audio.Sound.createAsync(
                    { uri: item.audio },
                    { shouldPlay: true }
                );
                soundRef.current = sound;
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && (status.didJustFinish || (status as any).error)) {
                        setPlayingId(null);
                        sound.unloadAsync();
                        soundRef.current = null;
                    }
                });
                return;
            } catch {
                // URL failed — fall through to TTS
            }
        }

        // TTS fallback — speak the Arabic text
        const textToSpeak = item.tts ?? item.text;
        Speech.speak(textToSpeak, {
            language: 'ar',
            rate: 0.75,   // slower for learners
            pitch: 1.0,
            onDone: () => setPlayingId(null),
            onStopped: () => setPlayingId(null),
            onError: () => setPlayingId(null),
        });
    };

    useEffect(() => {
        if (!db || !id) return;

        const loadLesson = async () => {
            const lessonIdStr = id as string;
            try {
                // Get lesson meta
                const lessonRow = await db.getFirstAsync(
                    'SELECT * FROM qaida_lessons WHERE id = ?',
                    [lessonIdStr]
                );
                setLesson(lessonRow);

                // Get content
                const contentRow = await db.getFirstAsync(
                    'SELECT content_json FROM qaida_content WHERE lesson_id = ?',
                    [lessonIdStr]
                ) as any;

                if (contentRow) {
                    setContent(JSON.parse(contentRow.content_json));
                }
            } catch (err) {
                console.error("Failed to load qaida lesson:", err);
            } finally {
                setLoading(false);
            }
        };

        loadLesson();
    }, [db, id]);

    const handleComplete = async () => {
        if (!db || !id) return;
        const lessonId = parseInt(id as string, 10);
        const nextLessonId = lessonId + 1;
        try {
            const userId = await getLocalUserId();
            // Ensure row exists
            await db.runAsync(
                `INSERT OR IGNORE INTO qaida_progress (user_id, current_lesson_id) VALUES (?, ?)`,
                [userId, nextLessonId]
            );
            // Advance only forward (never go back)
            await db.runAsync(
                `UPDATE qaida_progress SET current_lesson_id = ? WHERE user_id = ? AND current_lesson_id < ?`,
                [nextLessonId, userId, nextLessonId]
            );
            router.back();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#f4d125" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Lesson {id}</Text>
                    <Text style={styles.subtitle}>{lesson?.title}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.grid}>
                    {content.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.charCard,
                                playingId === index && styles.charCardPlaying
                            ]}
                            activeOpacity={0.7}
                            onPress={() => playSound(item, index)}
                        >
                            <Text style={[
                                styles.arabicChar,
                                { color: lesson?.color || '#1A1A1A' },
                                playingId === index && { transform: [{ scale: 1.1 }] }
                            ]}>
                                {item.text}
                            </Text>
                            <View style={[styles.audioBadge, playingId === index && styles.audioBadgePlaying]}>
                                <Feather
                                    name={playingId === index ? "volume-2" : "volume-1"}
                                    size={10}
                                    color={playingId === index ? "#FFFFFF" : "#A0A0A0"}
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                    <Text style={styles.completeButtonText}>Finish Lesson</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerText: { flex: 1, alignItems: 'center' },
    title: { fontSize: 14, color: '#5E5C58', fontWeight: 'bold', textTransform: 'uppercase' },
    subtitle: { fontSize: 18, color: '#1A1A1A', fontWeight: 'bold' },
    scrollContent: { padding: 20, paddingBottom: 100 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
    },
    charCard: {
        width: (width - 70) / 3,
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    arabicChar: {
        fontSize: 36,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    charCardPlaying: {
        borderColor: '#f4d125',
        borderWidth: 2,
        backgroundColor: '#FFFBEB',
    },
    audioBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioBadgePlaying: {
        backgroundColor: '#f4d125',
    },
    completeButton: {
        backgroundColor: '#1E293B',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    completeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
