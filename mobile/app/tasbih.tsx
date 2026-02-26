import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const PRESETS = [
    { id: 'subhanallah', label: 'Subhanallah', target: 33, arabic: 'سُبْحَانَ ٱللَّٰهِ' },
    { id: 'alhamdulillah', label: 'Alhamdulillah', target: 33, arabic: 'ٱلْحَمْدُ لِلَّٰهِ' },
    { id: 'allahuakbar', label: 'Allahu Akbar', target: 34, arabic: 'اللَّهُ أَكْبَرُ' },
    { id: 'custom', label: 'Custom', target: 100, arabic: 'أَسْتَغْفِرُ اللَّهَ' },
];

export default function TasbihScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [count, setCount] = useState(0);
    const [activePreset, setActivePreset] = useState(PRESETS[0]);

    // Animations
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Smoothly animate the ring when count changes
    useEffect(() => {
        const progress = Math.min(count / activePreset.target, 1);
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true, // For strokeDashoffset, useNativeDriver might not work perfectly with SVGs but we map it through state or setNativeProps if needed, actually we might need a listener or just let React re-render. Since it's SVG, we can't use native driver for strokeDashoffset directly without createAnimatedComponent.
        }).start();
    }, [count, activePreset]);

    const handlePress = () => {
        // Haptic feedback
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Heavy feedback on completion of target
            if (count + 1 === activePreset.target) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }

        setCount(prev => prev + 1);

        // Pulse animation
        scaleAnim.setValue(0.95);
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
        }).start();
    };

    const handleReset = () => {
        setCount(0);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const handlePresetChange = (preset: typeof PRESETS[0]) => {
        setActivePreset(preset);
        setCount(0);
    };

    const radius = width * 0.35;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(count / activePreset.target, 1);
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tasbih</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.arabicContainer}>
                    <Text style={styles.arabicText}>{activePreset.arabic}</Text>
                    <Text style={styles.translationText}>{activePreset.label}</Text>
                </View>

                <Animated.View style={[styles.counterWrapper, { transform: [{ scale: scaleAnim }] }]}>
                    <Svg width={width} height={width} viewBox={`0 0 ${width} ${width}`}>
                        <Defs>
                            <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#C9A84C" />
                                <Stop offset="100%" stopColor="#8A7030" />
                            </LinearGradient>
                        </Defs>

                        <Circle
                            cx={width / 2}
                            cy={width / 2}
                            r={radius}
                            stroke="rgba(255, 255, 255, 0.03)"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />

                        <Circle
                            cx={width / 2}
                            cy={width / 2}
                            r={radius}
                            stroke="url(#goldGradient)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${width / 2} ${width / 2})`}
                        />
                    </Svg>

                    <TouchableOpacity
                        style={styles.tapArea}
                        activeOpacity={0.8}
                        onPress={handlePress}
                    >
                        <View style={styles.tapInner}>
                            <Text style={styles.countText}>{count}</Text>
                            <Text style={styles.targetText}>/ {activePreset.target}</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Feather name="refresh-ccw" size={20} color="#9A9590" />
                </TouchableOpacity>

                <View style={styles.presetsContainer}>
                    {PRESETS.map((preset) => (
                        <TouchableOpacity
                            key={preset.id}
                            style={[
                                styles.presetCard,
                                activePreset.id === preset.id && styles.presetCardActive
                            ]}
                            onPress={() => handlePresetChange(preset)}
                        >
                            <Text style={[
                                styles.presetLabel,
                                activePreset.id === preset.id && styles.presetLabelActive
                            ]}>
                                {preset.label}
                            </Text>
                            <Text style={[
                                styles.presetTarget,
                                activePreset.id === preset.id && styles.presetTargetActive
                            ]}>
                                {preset.target}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
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
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    arabicContainer: {
        alignItems: 'center',
        marginBottom: 40,
        height: 100,
        justifyContent: 'center',
    },
    arabicText: {
        color: '#C9A84C',
        fontSize: 42,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 8,
    },
    translationText: {
        color: '#9A9590',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    counterWrapper: {
        width: width,
        height: width,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tapArea: {
        position: 'absolute',
        width: width * 0.55,
        height: width * 0.55,
        borderRadius: width * 0.275,
        backgroundColor: 'rgba(201, 168, 76, 0.02)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
        shadowColor: '#C9A84C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    tapInner: {
        alignItems: 'center',
    },
    countText: {
        color: '#E8E6E1',
        fontSize: 72,
        fontWeight: '200',
        letterSpacing: -2,
    },
    targetText: {
        color: '#C9A84C',
        fontSize: 18,
        fontWeight: '600',
        marginTop: -5,
    },
    resetButton: {
        marginTop: -10,
        padding: 15,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    presetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 40,
    },
    presetCard: {
        width: (width - 60) / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
    },
    presetCardActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.15)',
        borderColor: 'rgba(201, 168, 76, 0.3)',
        transform: [{ scale: 1.02 }],
        shadowColor: '#C9A84C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    presetLabel: {
        color: '#E8E6E1',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 6,
    },
    presetLabelActive: {
        color: '#C9A84C',
        fontWeight: '600',
    },
    presetTarget: {
        color: '#9A9590',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    presetTargetActive: {
        color: '#E8E6E1',
    },
});
