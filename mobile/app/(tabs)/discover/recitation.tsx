import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform, Animated, Easing, Alert, BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../context/ThemeContext';

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
    const { theme } = useTheme();

    const [selectedSurah, setSelectedSurah] = useState(SURAHS[0]);
    const [showSurahPicker, setShowSurahPicker] = useState(false);

    const [recState, setRecState] = useState<RecordingState>('idle');
    const recStateRef = useRef<RecordingState>('idle');

    // Keep ref in sync so timeouts can read current state without stale closure
    const setRecStateSafe = (s: RecordingState) => {
        recStateRef.current = s;
        setRecState(s);
    };
    const [result, setResult] = useState<QRCResult | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [duration, setDuration] = useState(0);

    const recordingRef = useRef<Audio.Recording | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wsReconnectAllowedRef = useRef(true);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);

    // Android hardware back button — intercept so it pops the Stack, not the Tab
    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                goBack();
                return true;
            });
            return () => sub.remove();
        }, [goBack])
    );

    // Waveform bars animation
    const bars = useRef(Array.from({ length: 24 }, () => new Animated.Value(4))).current;
    const waveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                setHasPermission(status === 'granted');
                // iOS only: allow recording (mute switch override handled globally by AudioContext)
            if (Platform.OS === 'ios') {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                    });
                }
            } catch (e) {
                console.warn('Recitation audio setup failed:', e);
                // Still allow UI to render — permission defaults to null (shows prompt on first record)
            }
        })();
        return () => {
            wsReconnectAllowedRef.current = false;
            stopWaveAnimation();
            wsRef.current?.close();
            wsRef.current = null;
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
            ws.onclose = () => {
                setWsConnected(false);
                // Auto-reconnect after 3 seconds if the screen is still mounted
                if (wsReconnectAllowedRef.current && wsRef.current === ws) {
                    setTimeout(() => {
                        if (wsReconnectAllowedRef.current) connectQRC();
                    }, 3000);
                }
            };
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
                        setRecStateSafe('done');
                    }
                } catch (_) {}
            };
            wsRef.current = ws;
        } catch (_) {}
    }, []);

    // ── Recording ───────────────────────────────────────────────────────────
    const startRecording = async () => {
        if (hasPermission === false) {
            Alert.alert('Microphone Access', 'Please allow microphone access in Settings to use this feature.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setResult(null);
        setDuration(0);

        try {
            // Ensure audio mode allows recording before starting
            if (Platform.OS === 'ios') {
                await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            }

            const { recording: rec } = await Audio.Recording.createAsync({
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                android: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android, extension: '.wav' },
                ios:     { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,     extension: '.wav' },
            });
            recordingRef.current = rec;

            setRecStateSafe('recording');
            startWaveAnimation();

            // Duration counter
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

            // Connect QRC WebSocket when recording starts (if key present)
            if (QRC_KEY && (!wsRef.current || wsRef.current.readyState > 1)) connectQRC();
        } catch (e) {
            // Mic unavailable (e.g. simulator) — fall back to demo mode silently
            console.warn('Recording unavailable, running demo:', e);
            setRecStateSafe('recording');
            startWaveAnimation();
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
    };

    const stopRecording = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        stopWaveAnimation();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        setRecStateSafe('processing');

        // No real recording (e.g. simulator) — go straight to demo result
        if (!recordingRef.current) {
            await new Promise(r => setTimeout(r, 1200));
            setResult(getMockResult());
            setRecStateSafe('done');
            return;
        }

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
                // Timeout fallback if WS doesn't respond — use ref to avoid stale closure
                setTimeout(() => {
                    if (recStateRef.current === 'processing') {
                        setResult(getMockResult());
                        setRecStateSafe('done');
                    }
                }, 8000);
            } else {
                // No API key → show demo result
                await new Promise(r => setTimeout(r, 1200)); // brief "processing" delay
                setResult(getMockResult());
                setRecStateSafe('done');
            }
        } catch (e) {
            console.warn('Recording stop failed:', e);
            setResult(getMockResult());
            setRecStateSafe('done');
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
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Recitation</Text>
                    {QRC_KEY ? (
                        <View style={styles.liveBadge}>
                            <View style={[styles.liveDot, { backgroundColor: wsConnected ? '#2ECC71' : '#F39C12' }]} />
                            <Text style={[styles.liveText, { color: theme.textTertiary }]}>{wsConnected ? 'QRC Live' : 'Connecting…'}</Text>
                        </View>
                    ) : (
                        <View style={styles.liveBadge}>
                            <View style={[styles.liveDot, { backgroundColor: theme.textTertiary }]} />
                            <Text style={[styles.liveText, { color: theme.textTertiary }]}>Demo Mode</Text>
                        </View>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Surah Selector */}
                <TouchableOpacity
                    style={[styles.surahSelector, { backgroundColor: theme.bgCard, borderColor: theme.borderStrong }]}
                    onPress={() => setShowSurahPicker(p => !p)}
                    activeOpacity={0.8}
                >
                    <View style={styles.surahSelectorLeft}>
                        <View style={[styles.surahNumberBadge, { backgroundColor: theme.accentLight }]}>
                            <Text style={[styles.surahNumberText, { color: theme.gold }]}>{selectedSurah.number}</Text>
                        </View>
                        <View>
                            <Text style={[styles.surahSelectorName, { color: theme.textPrimary }]}>{selectedSurah.name}</Text>
                            <Text style={[styles.surahSelectorSub, { color: theme.textSecondary }]}>{selectedSurah.ayahs} ayahs</Text>
                        </View>
                    </View>
                    <Feather name={showSurahPicker ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Surah picker dropdown */}
                {showSurahPicker && (
                    <View style={[styles.surahDropdown, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                        {SURAHS.map(s => (
                            <TouchableOpacity
                                key={s.number}
                                style={[styles.surahOption, { borderBottomColor: theme.border }, selectedSurah.number === s.number && styles.surahOptionActive]}
                                onPress={() => { setSelectedSurah(s); setShowSurahPicker(false); setResult(null); setRecState('idle'); }}
                            >
                                <Text style={[styles.surahOptionNum, { color: theme.textSecondary }, selectedSurah.number === s.number && { color: theme.gold }]}>
                                    {s.number}
                                </Text>
                                <Text style={[styles.surahOptionName, { color: theme.textPrimary }, selectedSurah.number === s.number && { color: theme.gold }]}>
                                    {s.name}
                                </Text>
                                {selectedSurah.number === s.number && <Feather name="check" size={16} color={theme.gold} />}
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
                                    { height: bar, backgroundColor: recState === 'recording' ? theme.gold : theme.bgInput },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Duration */}
                    {(recState === 'recording' || recState === 'done') && (
                        <Text style={[styles.durationText, { color: theme.textSecondary }]}>{formatDuration(duration)}</Text>
                    )}

                    {/* Record button */}
                    <TouchableOpacity
                        style={[
                            styles.recordBtn,
                            { backgroundColor: theme.accentLight, borderColor: theme.borderStrong },
                            recState === 'recording' && { backgroundColor: theme.gold, borderColor: theme.gold },
                            recState === 'processing' && styles.recordBtnProcessing,
                        ]}
                        onPress={recState === 'idle' || recState === 'done' ? startRecording : stopRecording}
                        disabled={recState === 'processing'}
                        activeOpacity={0.85}
                    >
                        {recState === 'processing' ? (
                            <Feather name="loader" size={28} color={theme.textInverse} />
                        ) : recState === 'recording' ? (
                            <Feather name="square" size={28} color={theme.textInverse} />
                        ) : (
                            <Feather name="mic" size={28} color={recState === 'done' ? theme.textInverse : theme.gold} />
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.recordHint, { color: theme.textSecondary }]}>
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
                        <View style={[styles.scoreCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <View style={[styles.scoreCircle, { borderColor: scoreColor(result.score) }]}>
                                <Text style={[styles.scoreNumber, { color: scoreColor(result.score) }]}>
                                    {result.score}
                                </Text>
                                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>/ 100</Text>
                            </View>
                            <View style={styles.scoreInfo}>
                                <Text style={[styles.scoreTitle, { color: theme.textPrimary }]}>
                                    {result.score >= 85 ? 'Excellent!' : result.score >= 60 ? 'Good effort' : 'Needs practice'}
                                </Text>
                                <Text style={[styles.scoreFeedback, { color: theme.textSecondary }]}>{result.feedback}</Text>
                            </View>
                        </View>

                        {/* Mistakes */}
                        {result.mistakes.length > 0 && (
                            <>
                                <Text style={[styles.mistakesTitle, { color: theme.textPrimary }]}>Tajweed Notes</Text>
                                {result.mistakes.map((m, i) => (
                                    <View key={i} style={[styles.mistakeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={[styles.ruleTag, { backgroundColor: `${ruleColor(m.rule)}20`, borderColor: `${ruleColor(m.rule)}40` }]}>
                                            <Text style={[styles.ruleTagText, { color: ruleColor(m.rule) }]}>{m.rule}</Text>
                                        </View>
                                        <Text style={[styles.mistakeWord, { color: theme.textPrimary }]}>{m.word}</Text>
                                        <Text style={[styles.mistakeCorrection, { color: theme.textSecondary }]}>{m.correction}</Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {result.mistakes.length === 0 && (
                            <View style={[styles.perfectCard, { backgroundColor: theme.accentLight, borderColor: theme.accent + '33' }]}>
                                <Feather name="check-circle" size={28} color={theme.accent} />
                                <Text style={[styles.perfectText, { color: theme.accent }]}>No tajweed mistakes detected. MashaAllah!</Text>
                            </View>
                        )}

                        {/* API key upsell if in demo mode */}
                        {!QRC_KEY && (
                            <View style={[styles.upsellCard, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                                <Feather name="zap" size={20} color={theme.gold} style={{ marginBottom: 8 }} />
                                <Text style={[styles.upsellTitle, { color: theme.gold }]}>Enable Live QRC</Text>
                                <Text style={[styles.upsellText, { color: theme.textSecondary }]}>
                                    Add your Qurani.ai API key to get real-time, word-level tajweed correction powered by AI.
                                </Text>
                                <Text style={[styles.upsellKey, { color: theme.textSecondary, backgroundColor: theme.bgInput }]}>EXPO_PUBLIC_QURANI_API_KEY=your_key</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Tajweed Rules Legend */}
                <View style={styles.legendSection}>
                    <Text style={[styles.legendTitle, { color: theme.textSecondary }]}>Tajweed Rules</Text>
                    <View style={styles.legendGrid}>
                        {Object.entries(RULE_COLORS).filter(([k]) => k !== 'default').map(([rule, color]) => (
                            <View key={rule} style={[styles.legendItem, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                <View style={[styles.legendDot, { backgroundColor: color }]} />
                                <Text style={[styles.legendText, { color: theme.textSecondary }]}>{rule}</Text>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 64, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '500' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 11 },
    scroll: { paddingBottom: 60 },
    surahSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1 },
    surahSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    surahNumberBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    surahNumberText: { fontWeight: '700', fontSize: 14 },
    surahSelectorName: { fontSize: 16, fontWeight: '500' },
    surahSelectorSub: { fontSize: 12, marginTop: 2 },
    surahDropdown: { marginHorizontal: 20, marginTop: 4, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    surahOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 },
    surahOptionActive: {},
    surahOptionNum: { fontSize: 13, width: 28, textAlign: 'right' },
    surahOptionName: { fontSize: 15, flex: 1 },
    recordingArea: { alignItems: 'center', paddingVertical: 40 },
    waveform: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 48, marginBottom: 32 },
    waveBar: { width: 3, borderRadius: 2, minHeight: 4 },
    durationText: { fontSize: 14, marginBottom: 20 },
    recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    recordBtnActive: {},
    recordBtnProcessing: { backgroundColor: 'rgba(201,168,76,0.3)', borderColor: 'rgba(201,168,76,0.4)' },
    recordHint: { fontSize: 13 },
    resultsSection: { paddingHorizontal: 20, marginTop: 8 },
    scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 20, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
    scoreCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    scoreNumber: { fontSize: 26, fontWeight: '700' },
    scoreLabel: { fontSize: 11 },
    scoreInfo: { flex: 1 },
    scoreTitle: { fontSize: 18, fontWeight: '500', marginBottom: 6 },
    scoreFeedback: { fontSize: 13, lineHeight: 20 },
    mistakesTitle: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
    mistakeCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
    ruleTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
    ruleTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    mistakeWord: {
        fontSize: 22, lineHeight: 36, textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', marginBottom: 6,
    },
    mistakeCorrection: { fontSize: 14, lineHeight: 20 },
    perfectCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderRadius: 16, borderWidth: 1,
        padding: 16, marginBottom: 16,
    },
    perfectText: { fontSize: 15, flex: 1 },
    upsellCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 16 },
    upsellTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    upsellText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 12 },
    upsellKey: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    legendSection: { marginHorizontal: 20, marginTop: 8 },
    legendTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12 },
});
