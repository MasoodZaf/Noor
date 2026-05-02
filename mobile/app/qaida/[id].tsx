import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useDatabase } from '../../context/DatabaseContext';
import { getLocalUserId } from '../../utils/userId';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

// ── Authentic Quran.com word-by-word audio ────────────────────────────────────
// Source: download.quranicaudio.com/wbw — Mishary Al-Afasy recitation
// Lesson 1 letters sourced from Muqatta'at (Quranic chapter openings) where
// each letter is pronounced as its full name (e.g. أَلِف، لَام، مِيم).
// Lesson 8 words sourced from Al-Fatiha 1:1–5 (most authentic Quranic source).
const WBW_BASE = 'https://download.quranicaudio.com/wbw/';
const wbw = (s: number, a: number, w: number) =>
    `${WBW_BASE}${String(s).padStart(3, '0')}_${String(a).padStart(3, '0')}_${String(w).padStart(3, '0')}.mp3`;

// Key: lessonId → itemIndex → audio URL
// Lesson 1 alphabet order: ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و ه ء ي
const AUTHENTIC_AUDIO: Record<number, Record<number, string>> = {
    1: {
        0:  wbw(2,  1, 1),  // ا — Al-Baqarah 2:1 (الم) word 1
        5:  wbw(40, 1, 1),  // ح — Ghafir 40:1 (حم) word 1
        9:  wbw(10, 1, 3),  // ر — Yunus 10:1 (الر) word 3
        11: wbw(26, 1, 2),  // س — Al-Shu'ara 26:1 (طسم) word 2
        13: wbw(7,  1, 4),  // ص — Al-A'raf 7:1 (المص) word 4
        15: wbw(20, 1, 1),  // ط — Ta-Ha 20:1 (طه) word 1
        17: wbw(19, 1, 4),  // ع — Maryam 19:1 (كهيعص) word 4
        20: wbw(50, 1, 1),  // ق — Qaf 50:1 (ق) word 1
        21: wbw(19, 1, 1),  // ك — Maryam 19:1 (كهيعص) word 1
        22: wbw(2,  1, 2),  // ل — Al-Baqarah 2:1 (الم) word 2
        23: wbw(2,  1, 3),  // م — Al-Baqarah 2:1 (الم) word 3
        24: wbw(68, 1, 1),  // ن — Al-Qalam 68:1 (ن) word 1
        26: wbw(19, 1, 2),  // ه — Maryam 19:1 (كهيعص) word 2
        28: wbw(36, 1, 1),  // ي — Ya-Sin 36:1 (يس) word 1
    },
    8: {
        // Al-Fatiha word-by-word (Mishary Al-Afasy)
        // Lesson 8 order: بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ قُرْآن رَبِّ الْحَمْدُ إِيَّاكَ نَعْبُدُ
        0: wbw(1, 1, 1),  // بِسْمِ — Al-Fatiha 1:1 word 1
        1: wbw(1, 1, 2),  // اللَّهِ — Al-Fatiha 1:1 word 2
        2: wbw(1, 1, 3),  // الرَّحْمٰنِ — Al-Fatiha 1:1 word 3
        3: wbw(1, 1, 4),  // الرَّحِيمِ — Al-Fatiha 1:1 word 4
        5: wbw(1, 2, 3),  // رَبِّ — Al-Fatiha 1:2 word 3
        6: wbw(1, 2, 1),  // الْحَمْدُ — Al-Fatiha 1:2 word 1
        7: wbw(1, 5, 1),  // إِيَّاكَ — Al-Fatiha 1:5 word 1
        8: wbw(1, 5, 2),  // نَعْبُدُ — Al-Fatiha 1:5 word 2
    },
};

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

    const { theme } = useTheme();
    const { stopAudio: stopGlobalAudio, expAvStopRef } = useAudio();
    const [lesson, setLesson] = useState<any>(null);
    const [content, setContent] = useState<QaidaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Register/unregister our stop function so the Quran player can stop us
    useEffect(() => {
        expAvStopRef.current = () => {
            Speech.stop();
            soundRef.current?.stopAsync().catch(() => {});
            soundRef.current?.unloadAsync().catch(() => {});
            soundRef.current = null;
            setPlayingId(null);
        };
        return () => { expAvStopRef.current = null; };
    }, [expAvStopRef]);

    // Play authentic audio: wbw CDN → DB URL → Arabic TTS fallback
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

        // Stop expo-audio (Quran reader) before starting expo-av playback
        stopGlobalAudio();
        setPlayingId(index);

        const lessonId = lesson?.id as number | undefined;

        // 1. Authentic wbw audio (Mishary Al-Afasy from quranicaudio.com)
        const authenticUrl = lessonId != null ? AUTHENTIC_AUDIO[lessonId]?.[index] : undefined;
        const audioUrl = authenticUrl ?? item.audio ?? null;

        if (audioUrl) {
            try {
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
                const { sound } = await Audio.Sound.createAsync(
                    { uri: audioUrl },
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

        // 2. TTS fallback — speaks the letter name / text in Arabic
        const textToSpeak = item.tts ?? item.text;
        Speech.speak(textToSpeak, {
            language: 'ar',
            rate: 0.65,   // slow for learners
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
                const contentRow = await db.getFirstAsync<{ content_json: string }>(
                    'SELECT content_json FROM qaida_content WHERE lesson_id = ?',
                    [lessonIdStr]
                );

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
            console.error('[Noor/Qaida] Progress save failed:', err);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loader, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.gold} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: theme.textSecondary }]}>Lesson {id}</Text>
                    <Text style={[styles.subtitle, { color: theme.textPrimary }]}>{lesson?.title}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.grid, { direction: 'rtl' }]}>
                    {content.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.charCard,
                                { backgroundColor: theme.bgCard, borderColor: theme.border },
                                playingId === index && { borderColor: theme.gold, borderWidth: 2, backgroundColor: theme.gold + '15' },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => playSound(item, index)}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.text}, ${playingId === index ? 'tap to stop' : 'tap to hear pronunciation'}`}
                            accessibilityState={{ selected: playingId === index }}
                        >
                            <Text style={[
                                styles.arabicChar,
                                { color: lesson?.color || theme.textPrimary },
                                playingId === index && { transform: [{ scale: 1.1 }] }
                            ]}>
                                {item.text}
                            </Text>
                            <View style={[styles.audioBadge, { backgroundColor: theme.bgInput }, playingId === index && { backgroundColor: theme.gold }]}>
                                <Feather
                                    name={playingId === index ? "volume-2" : "volume-1"}
                                    size={10}
                                    color={playingId === index ? theme.textInverse : theme.textSecondary}
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.completeButton, { backgroundColor: theme.accent }]}
                    onPress={handleComplete}
                    accessibilityRole="button"
                    accessibilityLabel="Finish lesson"
                >
                    <Text style={[styles.completeButtonText, { color: theme.textInverse }]}>Finish Lesson</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerText: { flex: 1, alignItems: 'center' },
    title: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
    subtitle: { fontSize: 18, fontWeight: 'bold' },
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
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
    },
    arabicChar: {
        fontSize: 36,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    audioBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completeButton: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    completeButtonText: { fontSize: 16, fontWeight: 'bold' },
});
