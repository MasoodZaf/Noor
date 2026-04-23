import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity,
    Dimensions, Platform, Animated, ScrollView, BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useTheme, fonts } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const PRESETS = [
    { id: 'subhanallah',    label: 'Subhanallah',    target: 33,  arabic: 'سُبْحَانَ ٱللَّٰهِ' },
    { id: 'alhamdulillah',  label: 'Alhamdulillah',  target: 33,  arabic: 'ٱلْحَمْدُ لِلَّٰهِ' },
    { id: 'allahuakbar',    label: 'Allahu Akbar',   target: 34,  arabic: 'اللَّهُ أَكْبَرُ' },
    { id: 'astaghfirullah', label: 'Astaghfirullah', target: 100, arabic: 'أَسْتَغْفِرُ اللَّهَ' },
];

// ── Ring geometry ─────────────────────────────────────────────────────────────
const RING_SIZE = Math.min(width - 72, 300);
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TasbihScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    }, [router]);
    useFocusEffect(useCallback(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
        return () => sub.remove();
    }, [goBack]));

    const [count, setCount] = useState(0);
    const [activePreset, setActivePreset] = useState(PRESETS[0]);
    // User-controllable feedback toggles (#9). Defaults: both on.
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);

    // Load persisted toggle prefs once on mount
    useEffect(() => {
        AsyncStorage.getItem('@noor/tasbih_sound').then(v => { if (v === '0') setSoundEnabled(false); });
        AsyncStorage.getItem('@noor/tasbih_haptics').then(v => { if (v === '0') setHapticsEnabled(false); });
    }, []);

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        AsyncStorage.setItem('@noor/tasbih_sound', next ? '1' : '0').catch(() => {});
    };
    const toggleHaptics = () => {
        const next = !hapticsEnabled;
        setHapticsEnabled(next);
        if (next && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        AsyncStorage.setItem('@noor/tasbih_haptics', next ? '1' : '0').catch(() => {});
    };

    // Use ref so rapid taps always read the latest count without stale closure
    const countRef = useRef(0);

    // ── Click sound ────────────────────────────────────────────────────────────
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Audio mode is configured globally by AudioContext — no need to set it here
                const { sound } = await Audio.Sound.createAsync(
                    require('../assets/tasbih_click.wav'),
                    { volume: 0.7 }
                );
                if (mounted) soundRef.current = sound;
            } catch { /* sound is optional */ }
        })();
        return () => {
            mounted = false;
            soundRef.current?.unloadAsync();
            soundRef.current = null;
        };
    }, []);

    // ── Current round progress (cycles 0..target-1, rolls over on target) ─────
    const inRoundCount = count % activePreset.target;
    const progressPct = inRoundCount / activePreset.target;

    // Ring fill — smooth spring animation of strokeDashoffset on every count
    const ringProgress = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(ringProgress, {
            toValue: progressPct,
            useNativeDriver: false, // strokeDashoffset is JS-side only
            tension: 180,
            friction: 16,
        }).start();
    }, [progressPct]);
    const strokeDashoffset = ringProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [RING_CIRC, 0],
    });

    // Tap pulse — subtle scale on the whole ring on each count
    const pulseScale = useRef(new Animated.Value(1)).current;

    // ── Persistence ────────────────────────────────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem(`@noor/tasbih_${activePreset.id}`).then(val => {
            const loaded = val !== null ? parseInt(val, 10) : 0;
            countRef.current = loaded;
            setCount(loaded);
        });
    }, [activePreset.id]);

    useEffect(() => {
        AsyncStorage.setItem(`@noor/tasbih_${activePreset.id}`, String(count)).catch(() => {});
    }, [count, activePreset.id]);

    // ── Press handler ──────────────────────────────────────────────────────────
    const handlePress = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Play click sound (rewind to start for rapid taps)
        if (soundEnabled) soundRef.current?.replayAsync().catch(() => {});

        // Pulse animation — quick scale up then settle
        pulseScale.stopAnimation();
        Animated.sequence([
            Animated.timing(pulseScale, { toValue: 1.04, duration: 80, useNativeDriver: true }),
            Animated.spring(pulseScale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }),
        ]).start();

        const current = countRef.current;
        countRef.current = current + 1;
        setCount(prev => prev + 1);

        // Target-complete haptic
        if ((current + 1) % activePreset.target === 0 && hapticsEnabled && Platform.OS !== 'web') {
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 80);
        }
    };

    const handleReset = () => {
        countRef.current = 0;
        setCount(0);
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
                    <Feather name="arrow-left" size={22} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Tasbih</Text>
                <View style={styles.headerActionsRow}>
                    {/* Sound toggle (#9) */}
                    <TouchableOpacity onPress={toggleSound} style={styles.headerBtnSmall} hitSlop={6}>
                        <Feather
                            name={soundEnabled ? 'volume-2' : 'volume-x'}
                            size={18}
                            color={soundEnabled ? theme.textPrimary : theme.textTertiary}
                        />
                    </TouchableOpacity>
                    {/* Haptics toggle (#9) */}
                    <TouchableOpacity onPress={toggleHaptics} style={styles.headerBtnSmall} hitSlop={6}>
                        <Feather
                            name={hapticsEnabled ? 'smartphone' : 'slash'}
                            size={18}
                            color={hapticsEnabled ? theme.textPrimary : theme.textTertiary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Preset pills ── */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.presetRow}
            >
                {PRESETS.map(preset => (
                    <TouchableOpacity
                        key={preset.id}
                        style={[
                            styles.pill,
                            { backgroundColor: theme.bgCard, borderColor: theme.border },
                            activePreset.id === preset.id && { backgroundColor: theme.gold, borderColor: theme.gold },
                        ]}
                        onPress={() => setActivePreset(preset)}
                    >
                        <Text style={[
                            styles.pillText,
                            { color: theme.textSecondary },
                            activePreset.id === preset.id && { color: theme.textInverse },
                        ]}>
                            {preset.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ── Tap area (ring + digital counter) ── */}
            <TouchableWithoutFeedback onPress={handlePress}>
                <View style={styles.mainArea}>

                    {/* Arabic dhikr */}
                    {/* Arabic dhikr — scaled by user's Tweaks → Arabic Scale */}
                    <Text style={[styles.arabicText, { color: theme.textPrimary, fontSize: 38 * theme.arabicScale }]}>
                        {activePreset.arabic}
                    </Text>

                    {/* Progress ring with centered digital count */}
                    <Animated.View style={[styles.ringWrapper, { transform: [{ scale: pulseScale }] }]}>
                        <Svg width={RING_SIZE} height={RING_SIZE}>
                            {/* Background track */}
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_R}
                                stroke={theme.border}
                                strokeWidth={RING_STROKE}
                                fill="none"
                                opacity={0.45}
                            />
                            {/* Progress arc */}
                            <AnimatedCircle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_R}
                                stroke={theme.gold}
                                strokeWidth={RING_STROKE}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${RING_CIRC}`}
                                strokeDashoffset={strokeDashoffset}
                                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                            />
                        </Svg>
                        <View style={styles.ringInner}>
                            <Text style={[styles.countText, { color: theme.textPrimary }]}>
                                {inRoundCount}
                                <Text style={[styles.countSeparator, { color: theme.textTertiary }]}>/{activePreset.target}</Text>
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Tap hint */}
                    <Text style={[styles.tapHint, { color: theme.textTertiary }]}>Tap anywhere to count</Text>
                </View>
            </TouchableWithoutFeedback>

            {/* Labeled Reset button (#10) — outside the tap-anywhere area so it doesn't
                also trigger a count. The previous tiny header refresh icon was easy to miss. */}
            <View style={styles.resetRow}>
                <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={handleReset}
                    activeOpacity={0.8}
                >
                    <Feather name="refresh-cw" size={16} color={theme.textPrimary} />
                    <Text style={[styles.resetBtnText, { color: theme.textPrimary }]}>Reset Counter</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: insets.bottom }} />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 52,
    },
    headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerBtnSmall: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600', letterSpacing: 0.2 },

    // ── Presets ──
    presetRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18, gap: 8 },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    pillText: { fontSize: 13, fontWeight: '600' },

    // ── Main content ──
    mainArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
    arabicText: {
        fontSize: 38,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 36,
        textAlign: 'center',
    },

    // ── Ring + digital counter ──
    ringWrapper: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringInner: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Big digital counter — mono per the Falah design's "tactile clock" feel
    countText: {
        fontSize: 82,
        fontFamily: fonts.mono,
        letterSpacing: -2,
        lineHeight: 92,
        textAlign: 'center',
    },
    countSeparator: { fontSize: 38, fontFamily: fonts.mono },

    tapHint: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.3,
        marginTop: 32,
    },
    resetRow: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
    resetBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 24, borderWidth: 1.5,
    },
    resetBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
