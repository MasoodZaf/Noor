import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableWithoutFeedback, TouchableOpacity,
    Dimensions, Platform, Animated, ScrollView, BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const PRESETS = [
    { id: 'subhanallah',  label: 'Subhanallah',  target: 33,  arabic: 'سُبْحَانَ ٱللَّٰهِ' },
    { id: 'alhamdulillah', label: 'Alhamdulillah', target: 33, arabic: 'ٱلْحَمْدُ لِلَّٰهِ' },
    { id: 'allahuakbar',  label: 'Allahu Akbar', target: 34,  arabic: 'اللَّهُ أَكْبَرُ' },
    { id: 'custom',       label: 'Custom',        target: 100, arabic: 'أَسْتَغْفِرُ اللَّهَ' },
];

// ── Arc geometry ───────────────────────────────────────────────────────────────
// The arc fills the bottom portion of the screen.
// Quadratic bezier: left-off-screen → apex at top-center → right-off-screen
const ARC_H = Math.min(Math.round(height * 0.38), 310);
const P0 = { x: -55, y: ARC_H - 8 };
const P1 = { x: width / 2, y: ARC_H * 0.14 };      // apex
const P2 = { x: width + 55, y: ARC_H - 8 };

const bezier = (t: number) => {
    const mt = 1 - t;
    return {
        x: mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x,
        y: mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y,
    };
};

const ARC_PATH = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

// ── Bead layout ────────────────────────────────────────────────────────────────
const VISIBLE = 11;   // beads visible at once
const BEAD_R  = 23;   // bead radius dp
const T_START = 0.07;
const T_END   = 0.93;
const T_STEP  = (T_END - T_START) / (VISIBLE - 1);

// Pre-compute fixed bead centres on the bezier
const BEAD_POS = Array.from({ length: VISIBLE }, (_, i) =>
    bezier(T_START + i * T_STEP)
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function TasbihScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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

    // Use ref so rapid taps always read the latest count without stale closure
    const countRef = useRef(0);

    const inRoundCount  = count % activePreset.target;
    const roundNum      = Math.floor(count / activePreset.target);
    const inWindowCount = inRoundCount % VISIBLE; // 0-based index of the "next" bead

    // Per-bead scale + glow animated values
    const beadScales = useRef(
        Array.from({ length: VISIBLE }, () => new Animated.Value(1))
    ).current;
    const beadGlows = useRef(
        Array.from({ length: VISIBLE }, () => new Animated.Value(0))
    ).current;

    // ── Persistence ────────────────────────────────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem(`@tasbih_${activePreset.id}`).then(val => {
            const loaded = val !== null ? parseInt(val, 10) : 0;
            countRef.current = loaded;
            setCount(loaded);
        });
    }, [activePreset.id]);

    useEffect(() => {
        AsyncStorage.setItem(`@tasbih_${activePreset.id}`, String(count));
    }, [count, activePreset.id]);

    // ── Press handler ──────────────────────────────────────────────────────────
    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Animate the bead currently being counted
        const current   = countRef.current;
        const beadIdx   = (current % activePreset.target) % VISIBLE;

        // Scale: pop up then settle
        beadScales[beadIdx].stopAnimation();
        Animated.sequence([
            Animated.spring(beadScales[beadIdx], {
                toValue: 1.55,
                useNativeDriver: true,
                friction: 3,
                tension: 280,
            }),
            Animated.spring(beadScales[beadIdx], {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
                tension: 120,
            }),
        ]).start();

        // Glow: flash then fade
        beadGlows[beadIdx].setValue(1);
        Animated.timing(beadGlows[beadIdx], {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
        }).start();

        countRef.current = current + 1;
        setCount(prev => prev + 1);

        // Target-complete haptic
        if ((current + 1) % activePreset.target === 0 && Platform.OS !== 'web') {
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 80);
        }
    };

    const handleReset = () => {
        countRef.current = 0;
        setCount(0);
        beadScales.forEach(s => s.setValue(1));
        beadGlows.forEach(g => g.setValue(0));
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.headerBtn}>
                    <Feather name="arrow-left" size={22} color="#2C2C2C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tasbih</Text>
                <TouchableOpacity onPress={handleReset} style={styles.headerBtn}>
                    <Feather name="refresh-cw" size={19} color="#2C2C2C" />
                </TouchableOpacity>
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
                        style={[styles.pill, activePreset.id === preset.id && styles.pillActive]}
                        onPress={() => setActivePreset(preset)}
                    >
                        <Text style={[styles.pillText, activePreset.id === preset.id && styles.pillTextActive]}>
                            {preset.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ── Tap area (counter + beads) ── */}
            <TouchableWithoutFeedback onPress={handlePress}>
                <View style={styles.mainArea}>

                    {/* Arabic dhikr */}
                    <Text style={styles.arabicText}>{activePreset.arabic}</Text>

                    {/* Count N/target */}
                    <Text style={styles.countText}>{inRoundCount}/{activePreset.target}</Text>

                    {/* Round label */}
                    <View style={styles.roundRow}>
                        <Text style={styles.roundText}>Round {roundNum + 1}</Text>
                        <Feather name="edit-2" size={13} color="#4AADA0" style={{ marginLeft: 5 }} />
                    </View>

                    {/* ── Arc + pearl beads ── */}
                    <View style={styles.arcContainer}>
                        {/* Teal string */}
                        <Svg
                            width={width}
                            height={ARC_H}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        >
                            <Path
                                d={ARC_PATH}
                                stroke="#5BBDB5"
                                strokeWidth={2.2}
                                fill="none"
                                opacity={0.5}
                            />
                        </Svg>

                        {/* Pearl beads */}
                        {BEAD_POS.map((pos, i) => {
                            const isCounted = i < inWindowCount;
                            const isNext    = i === inWindowCount;

                            const glowColor = beadGlows[i].interpolate({
                                inputRange:  [0, 1],
                                outputRange: ['rgba(91,189,181,0)', 'rgba(91,189,181,0.55)'],
                            });

                            return (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.beadOuter,
                                        {
                                            left: pos.x - BEAD_R,
                                            top:  pos.y - BEAD_R,
                                            transform: [{ scale: beadScales[i] }],
                                            // iOS shadow — colour changes with state
                                            shadowColor: isCounted ? '#2E8B84' : '#8B7045',
                                        },
                                    ]}
                                >
                                    {/* Glow ring (fades in/out on tap) */}
                                    <Animated.View
                                        style={[
                                            styles.beadGlow,
                                            { backgroundColor: glowColor },
                                        ]}
                                        pointerEvents="none"
                                    />

                                    {/* Pearl body (overflow hidden so highlight clips) */}
                                    <View style={[
                                        styles.beadBody,
                                        {
                                            backgroundColor: isCounted
                                                ? '#9FD5CF'     // teal pearl (counted)
                                                : '#EDE5CC',    // cream pearl (uncounted)
                                            borderColor: isCounted
                                                ? 'rgba(74,173,160,0.28)'
                                                : 'rgba(180,155,100,0.25)',
                                        },
                                    ]}>
                                        {/* Top-left highlight spot → gives 3-D pearl look */}
                                        <View style={[
                                            styles.beadHighlight,
                                            isCounted && { backgroundColor: 'rgba(255,255,255,0.42)' },
                                        ]} />
                                        {/* Bottom-right shadow crescent */}
                                        <View style={[
                                            styles.beadShadowCrescent,
                                            isCounted && { backgroundColor: 'rgba(30,110,105,0.18)' },
                                        ]} />
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </View>

                    {/* Tap hint */}
                    <Text style={styles.tapHint}>Tap anywhere to count</Text>
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF7EF',
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 52,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
        letterSpacing: 0.2,
    },

    // ── Presets ──
    presetRow: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 14,
        gap: 8,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E4DCC8',
    },
    pillActive: {
        backgroundColor: '#4AADA0',
        borderColor: '#4AADA0',
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5A5040',
    },
    pillTextActive: {
        color: '#FFFFFF',
    },

    // ── Main content ──
    mainArea: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 10,
    },
    arabicText: {
        fontSize: 34,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        color: '#2C2C2C',
        marginBottom: 18,
        textAlign: 'center',
    },
    countText: {
        fontSize: 70,
        fontWeight: '200',
        color: '#1A1A1A',
        letterSpacing: -1,
        lineHeight: 78,
    },
    roundRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 6,
    },
    roundText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4AADA0',
    },
    tapHint: {
        fontSize: 12,
        color: '#B0A88A',
        fontWeight: '500',
        letterSpacing: 0.3,
        marginTop: 10,
    },

    // ── Arc ──
    arcContainer: {
        position: 'relative',
        width: width,
        height: ARC_H,
        marginTop: 4,
    },

    // ── Bead layers ──
    // Outer: handles shadow + scale transform (no overflow:hidden so shadow shows)
    beadOuter: {
        position: 'absolute',
        width: BEAD_R * 2,
        height: BEAD_R * 2,
        borderRadius: BEAD_R,
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.38,
        shadowRadius: 6,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Glow ring — same size as bead, rendered behind body (sibling order)
    beadGlow: {
        position: 'absolute',
        width: BEAD_R * 2 + 14,
        height: BEAD_R * 2 + 14,
        borderRadius: BEAD_R + 7,
    },
    // Pearl surface — overflow:hidden clips the highlight/shadow overlays
    beadBody: {
        width: BEAD_R * 2,
        height: BEAD_R * 2,
        borderRadius: BEAD_R,
        overflow: 'hidden',
        borderWidth: 1,
    },
    // Top-left bright spot (simulates specular reflection on a sphere)
    beadHighlight: {
        position: 'absolute',
        width: BEAD_R * 0.72,
        height: BEAD_R * 0.56,
        borderRadius: BEAD_R * 0.3,
        backgroundColor: 'rgba(255,255,255,0.65)',
        top: BEAD_R * 0.1,
        left: BEAD_R * 0.12,
    },
    // Bottom-right dark crescent (simulates shadow on the opposite side of the sphere)
    beadShadowCrescent: {
        position: 'absolute',
        width: BEAD_R * 1.1,
        height: BEAD_R * 0.9,
        borderRadius: BEAD_R * 0.55,
        backgroundColor: 'rgba(100,80,30,0.15)',
        bottom: -BEAD_R * 0.1,
        right: -BEAD_R * 0.1,
    },
});
