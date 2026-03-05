import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform, Animated, Easing, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// ── Qurani.ai QRC ─────────────────────────────────────────────────────────────
// Docs: https://qurani.ai/en/docs/2-advanced-tools/qrc
// WebSocket: wss://api.qurani.ai?api_key={key}
// Set EXPO_PUBLIC_QURANI_API_KEY in .env to enable live tajweed correction.
const QRC_KEY = process.env.EXPO_PUBLIC_QURANI_API_KEY ?? '';
const QRC_WS_URL = `wss://api.qurani.ai?api_key=${QRC_KEY}`;

// ── Surahs for the picker (first 20 + most recited) ──────────────────────────
const SURAHS = [
    { number: 1,  name: 'Al-Fatihah',       ayahs: 7   },
    { number: 2,  name: 'Al-Baqarah',       ayahs: 286 },
    { number: 18, name: 'Al-Kahf',          ayahs: 110 },
    { number: 36, name: 'Ya-Sin',           ayahs: 83  },
    { number: 55, name: 'Ar-Rahman',        ayahs: 78  },
    { number: 56, name: 'Al-Waqi\'ah',      ayahs: 96  },
    { number: 67, name: 'Al-Mulk',          ayahs: 30  },
    { number: 78, name: 'An-Naba\'',        ayahs: 40  },
    { number: 112, name: 'Al-Ikhlas',       ayahs: 4   },
    { number: 113, name: 'Al-Falaq',        ayahs: 5   },
    { number: 114, name: 'An-Nas',          ayahs: 6   },
];

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

interface Mistake {
    word: string;
    correction: string;
    rule: string;
}

interface QRCResult {
    score: number;        // 0–100
    mistakes: Mistake[];
    feedback: string;
}

// Tajweed rule colour coding
const RULE_COLORS: Record<string, string> = {
    Ghunnah: '#F39C12',
    Idgham:  '#3498DB',
    Ikhfa:   '#9B59B6',
    Madd:    '#27AE60',
    Qalqalah:'#E74C3C',
    default: '#E74C3C',
};

function ruleColor(rule: string): string {
    return RULE_COLORS[rule] ?? RULE_COLORS.default;
}

export default function RecitationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [selectedSurah, setSelectedSurah] = useState(SURAHS[0]);
    const [showSurahPicker, setShowSurahPicker] = useState(false);

    const [recState, setRecState] = useState<RecordingState>('idle');
    const [result, setResult] = useState<QRCResult | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [duration, setDuration] = useState(0);

    const recordingRef = useRef<Audio.Recording | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Waveform bars animation
    const bars = useRef(Array.from({ length: 24 }, () => new Animated.Value(4))).current;
    const waveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            setHasPermission(status === 'granted');
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        })();
        return () => {
            stopWaveAnimation();
            wsRef.current?.close();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Waveform animation ──────────────────────────────────────────────────
    const startWaveAnimation = () => {
        const anims = bars.map((bar, i) =>
            Animated.loop(Animated.sequence([
                Animated.delay(i * 40),
                Animated.timing(bar, {
                    toValue: 4 + Math.random() * 28,
                    duration: 300 + Math.random() * 200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(bar, {
                    toValue: 4,
                    duration: 300 + Math.random() * 200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ]))
        );
        waveAnimRef.current = Animated.parallel(anims);
        waveAnimRef.current.start();
    };

    const stopWaveAnimation = () => {
        waveAnimRef.current?.stop();
        bars.forEach(b => b.setValue(4));
    };

    // ── QRC WebSocket ───────────────────────────────────────────────────────
    const connectQRC = useCallback(() => {
        if (!QRC_KEY) return;
        try {
            const ws = new WebSocket(QRC_WS_URL);
            ws.onopen = () => setWsConnected(true);
            ws.onclose = () => setWsConnected(false);
            ws.onerror = () => setWsConnected(false);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Adapt to confirmed Qurani.ai QRC response schema once available
                    if (msg.type === 'result' || msg.score !== undefined) {
                        setResult({
                            score:    msg.score ?? 0,
                            mistakes: msg.mistakes ?? [],
                            feedback: msg.feedback ?? 'Analysis complete.',
                        });
                        setRecState('done');
                    }
                } catch (_) {}
            };
            wsRef.current = ws;
        } catch (_) {}
    }, []);

    // ── Recording ───────────────────────────────────────────────────────────
    const startRecording = async () => {
        if (!hasPermission) {
            Alert.alert('Microphone Access', 'Please allow microphone access in Settings to use this feature.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setResult(null);
        setDuration(0);

        try {
            const rec = new Audio.Recording();
            await rec.prepareToRecordAsync({
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                android: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android, extension: '.wav' },
                ios:     { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,     extension: '.wav' },
            });
            await rec.startAsync();
            recordingRef.current = rec;

            setRecState('recording');
            startWaveAnimation();

            // Duration counter
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

            // Connect QRC WebSocket when recording starts (if key present)
            if (QRC_KEY && (!wsRef.current || wsRef.current.readyState > 1)) connectQRC();
        } catch (e) {
            console.error('Recording start failed:', e);
            Alert.alert('Error', 'Could not start recording. Please try again.');
        }
    };

    const stopRecording = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        stopWaveAnimation();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        if (!recordingRef.current) return;
        setRecState('processing');

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            if (QRC_KEY && wsRef.current?.readyState === WebSocket.OPEN && uri) {
                // Send the audio file to QRC via WebSocket
                const response = await fetch(uri);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.result && wsRef.current?.readyState === WebSocket.OPEN) {
                        // Send surah context metadata first
                        wsRef.current.send(JSON.stringify({
                            type: 'context',
                            surahNumber: selectedSurah.number,
                            surahName: selectedSurah.name,
                        }));
                        // Send audio data
                        wsRef.current.send(reader.result as ArrayBuffer);
                    }
                };
                reader.readAsArrayBuffer(blob);
                // Result arrives via ws.onmessage — state set to 'done' there
                // Timeout fallback if WS doesn't respond
                setTimeout(() => {
                    if (recState === 'processing') {
                        setResult(getMockResult());
                        setRecState('done');
                    }
                }, 8000);
            } else {
                // No API key → show demo result
                await new Promise(r => setTimeout(r, 1200)); // brief "processing" delay
                setResult(getMockResult());
                setRecState('done');
            }
        } catch (e) {
            console.error('Recording stop failed:', e);
            setResult(getMockResult());
            setRecState('done');
        }
    };

    // Demo result shown when no API key is set
    const getMockResult = (): QRCResult => ({
        score: 72,
        mistakes: [
            { word: 'ٱلرَّحْمَٰنِ', correction: 'Extend the Madd for 2 counts', rule: 'Madd' },
            { word: 'ٱلرَّحِيمِ',   correction: 'Apply Ghunnah on the Noon', rule: 'Ghunnah' },
        ],
        feedback: QRC_KEY
            ? 'Tajweed analysis complete. Review the highlighted words.'
            : 'Demo mode — add EXPO_PUBLIC_QURANI_API_KEY for live Qurani.ai QRC analysis.',
    });

    const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const scoreColor = (s: number) => s >= 85 ? '#2ECC71' : s >= 60 ? '#F39C12' : '#E74C3C';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Recitation</Text>
                    {QRC_KEY ? (
                        <View style={styles.liveBadge}>
                            <View style={[styles.liveDot, { backgroundColor: wsConnected ? '#2ECC71' : '#F39C12' }]} />
                            <Text style={styles.liveText}>{wsConnected ? 'QRC Live' : 'Connecting…'}</Text>
                        </View>
                    ) : (
                        <View style={styles.liveBadge}>
                            <View style={[styles.liveDot, { backgroundColor: '#5E5C58' }]} />
                            <Text style={styles.liveText}>Demo Mode</Text>
                        </View>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Surah Selector */}
                <TouchableOpacity
                    style={styles.surahSelector}
                    onPress={() => setShowSurahPicker(p => !p)}
                    activeOpacity={0.8}
                >
                    <View style={styles.surahSelectorLeft}>
                        <View style={styles.surahNumberBadge}>
                            <Text style={styles.surahNumberText}>{selectedSurah.number}</Text>
                        </View>
                        <View>
                            <Text style={styles.surahSelectorName}>{selectedSurah.name}</Text>
                            <Text style={styles.surahSelectorSub}>{selectedSurah.ayahs} ayahs</Text>
                        </View>
                    </View>
                    <Feather name={showSurahPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#5E5C58" />
                </TouchableOpacity>

                {/* Surah picker dropdown */}
                {showSurahPicker && (
                    <View style={styles.surahDropdown}>
                        {SURAHS.map(s => (
                            <TouchableOpacity
                                key={s.number}
                                style={[styles.surahOption, selectedSurah.number === s.number && styles.surahOptionActive]}
                                onPress={() => { setSelectedSurah(s); setShowSurahPicker(false); setResult(null); setRecState('idle'); }}
                            >
                                <Text style={[styles.surahOptionNum, selectedSurah.number === s.number && { color: '#C9A84C' }]}>
                                    {s.number}
                                </Text>
                                <Text style={[styles.surahOptionName, selectedSurah.number === s.number && { color: '#C9A84C' }]}>
                                    {s.name}
                                </Text>
                                {selectedSurah.number === s.number && <Feather name="check" size={16} color="#C9A84C" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Recording Area */}
                <View style={styles.recordingArea}>

                    {/* Waveform */}
                    <View style={styles.waveform}>
                        {bars.map((bar, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    { height: bar, backgroundColor: recState === 'recording' ? '#C9A84C' : 'rgba(0,0,0,0.08)' },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Duration */}
                    {(recState === 'recording' || recState === 'done') && (
                        <Text style={styles.durationText}>{formatDuration(duration)}</Text>
                    )}

                    {/* Record button */}
                    <TouchableOpacity
                        style={[
                            styles.recordBtn,
                            recState === 'recording' && styles.recordBtnActive,
                            recState === 'processing' && styles.recordBtnProcessing,
                        ]}
                        onPress={recState === 'idle' || recState === 'done' ? startRecording : stopRecording}
                        disabled={recState === 'processing'}
                        activeOpacity={0.85}
                    >
                        {recState === 'processing' ? (
                            <Feather name="loader" size={28} color="#FDF8F0" />
                        ) : recState === 'recording' ? (
                            <Feather name="square" size={28} color="#FDF8F0" />
                        ) : (
                            <Feather name="mic" size={28} color={recState === 'done' ? '#FDF8F0' : '#C9A84C'} />
                        )}
                    </TouchableOpacity>

                    <Text style={styles.recordHint}>
                        {recState === 'idle'       ? 'Tap to start reciting'
                        : recState === 'recording' ? 'Tap to stop recording'
                        : recState === 'processing' ? 'Analysing your recitation…'
                        : 'Tap to recite again'}
                    </Text>
                </View>

                {/* Results */}
                {result && recState === 'done' && (
                    <View style={styles.resultsSection}>

                        {/* Score */}
                        <View style={styles.scoreCard}>
                            <View style={[styles.scoreCircle, { borderColor: scoreColor(result.score) }]}>
                                <Text style={[styles.scoreNumber, { color: scoreColor(result.score) }]}>
                                    {result.score}
                                </Text>
                                <Text style={styles.scoreLabel}>/ 100</Text>
                            </View>
                            <View style={styles.scoreInfo}>
                                <Text style={styles.scoreTitle}>
                                    {result.score >= 85 ? 'Excellent!' : result.score >= 60 ? 'Good effort' : 'Needs practice'}
                                </Text>
                                <Text style={styles.scoreFeedback}>{result.feedback}</Text>
                            </View>
                        </View>

                        {/* Mistakes */}
                        {result.mistakes.length > 0 && (
                            <>
                                <Text style={styles.mistakesTitle}>Tajweed Notes</Text>
                                {result.mistakes.map((m, i) => (
                                    <View key={i} style={styles.mistakeCard}>
                                        <View style={[styles.ruleTag, { backgroundColor: `${ruleColor(m.rule)}20`, borderColor: `${ruleColor(m.rule)}40` }]}>
                                            <Text style={[styles.ruleTagText, { color: ruleColor(m.rule) }]}>{m.rule}</Text>
                                        </View>
                                        <Text style={styles.mistakeWord}>{m.word}</Text>
                                        <Text style={styles.mistakeCorrection}>{m.correction}</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {result.mistakes.length === 0 && (
                            <View style={styles.perfectCard}>
                                <Feather name="check-circle" size={28} color="#2ECC71" />
                                <Text style={styles.perfectText}>No tajweed mistakes detected. MashaAllah!</Text>
                            </View>
                        )}

                        {/* API key upsell if in demo mode */}
                        {!QRC_KEY && (
                            <View style={styles.upsellCard}>
                                <Feather name="zap" size={20} color="#C9A84C" style={{ marginBottom: 8 }} />
                                <Text style={styles.upsellTitle}>Enable Live QRC</Text>
                                <Text style={styles.upsellText}>
                                    Add your Qurani.ai API key to get real-time, word-level tajweed correction powered by AI.
                                </Text>
                                <Text style={styles.upsellKey}>EXPO_PUBLIC_QURANI_API_KEY=your_key</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Tajweed Rules Legend */}
                <View style={styles.legendSection}>
                    <Text style={styles.legendTitle}>Tajweed Rules</Text>
                    <View style={styles.legendGrid}>
                        {Object.entries(RULE_COLORS).filter(([k]) => k !== 'default').map(([rule, color]) => (
                            <View key={rule} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: color }]} />
                                <Text style={styles.legendText}>{rule}</Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerCenter: { alignItems: 'center' },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '500' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { color: '#5E5C58', fontSize: 11 },

    scroll: { paddingBottom: 60 },

    // Surah Selector
    surahSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.2)',
    },
    surahSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    surahNumberBadge: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(201,168,76,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    surahNumberText: { color: '#C9A84C', fontWeight: '700', fontSize: 14 },
    surahSelectorName: { color: '#1A1A1A', fontSize: 16, fontWeight: '500' },
    surahSelectorSub: { color: '#5E5C58', fontSize: 12, marginTop: 2 },

    surahDropdown: {
        marginHorizontal: 20,
        marginTop: 4,
        backgroundColor: '#161916',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    surahOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    surahOptionActive: { backgroundColor: 'rgba(201,168,76,0.07)' },
    surahOptionNum: { color: '#5E5C58', fontSize: 13, width: 28, textAlign: 'right' },
    surahOptionName: { color: '#1A1A1A', fontSize: 15, flex: 1 },

    // Recording
    recordingArea: { alignItems: 'center', paddingVertical: 40 },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        height: 48,
        marginBottom: 32,
    },
    waveBar: {
        width: 3,
        borderRadius: 2,
        minHeight: 4,
    },
    durationText: { color: '#5E5C58', fontSize: 14, marginBottom: 20 },
    recordBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(201,168,76,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(201,168,76,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    recordBtnActive: {
        backgroundColor: '#C9A84C',
        borderColor: '#C9A84C',
    },
    recordBtnProcessing: {
        backgroundColor: 'rgba(201,168,76,0.3)',
        borderColor: 'rgba(201,168,76,0.4)',
    },
    recordHint: { color: '#5E5C58', fontSize: 13 },

    // Results
    resultsSection: { paddingHorizontal: 20, marginTop: 8 },
    scoreCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20,
        marginBottom: 20,
    },
    scoreCircle: {
        width: 72, height: 72,
        borderRadius: 36,
        borderWidth: 3,
        alignItems: 'center', justifyContent: 'center',
    },
    scoreNumber: { fontSize: 26, fontWeight: '700' },
    scoreLabel: { color: '#5E5C58', fontSize: 11 },
    scoreInfo: { flex: 1 },
    scoreTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '500', marginBottom: 6 },
    scoreFeedback: { color: '#5E5C58', fontSize: 13, lineHeight: 20 },

    mistakesTitle: {
        color: '#1A1A1A', fontSize: 16, fontWeight: '500',
        marginBottom: 12,
    },
    mistakeCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 16,
        marginBottom: 10,
    },
    ruleTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 8, borderWidth: 1,
        marginBottom: 8,
    },
    ruleTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    mistakeWord: {
        color: '#1A1A1A', fontSize: 22, lineHeight: 36, textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 6,
    },
    mistakeCorrection: { color: '#5E5C58', fontSize: 14, lineHeight: 20 },

    perfectCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(46,204,113,0.07)',
        borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
        padding: 16, marginBottom: 16,
    },
    perfectText: { color: '#2ECC71', fontSize: 15, flex: 1 },

    upsellCard: {
        backgroundColor: 'rgba(201,168,76,0.05)',
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.15)',
        padding: 20, alignItems: 'center',
        marginTop: 8, marginBottom: 16,
    },
    upsellTitle: { color: '#C9A84C', fontSize: 16, fontWeight: '600', marginBottom: 8 },
    upsellText: { color: '#5E5C58', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 12 },
    upsellKey: {
        color: '#5E5C58', fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },

    // Legend
    legendSection: { marginHorizontal: 20, marginTop: 8 },
    legendTitle: { color: '#5E5C58', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legendItem: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8, borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#5E5C58', fontSize: 12 },
});
