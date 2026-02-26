import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
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
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    // Calculate progress based on target, or unlimited if custom (mod 100 maybe? Let's treat target as cycle)
    const progress = Math.min(count / activePreset.target, 1);
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tasbih</Text>
                <View style={{ width: 40 }} /> {/* Placeholder for balance */}
            </View>

            {/* Content */}
            <View style={styles.content}>

                {/* Active Arabic Text */}
                <View style={styles.arabicContainer}>
                    <Text style={styles.arabicText}>{activePreset.arabic}</Text>
                    <Text style={styles.translationText}>{activePreset.label}</Text>
                </View>

                {/* Circular Counter */}
                <View style={styles.counterWrapper}>
                    <Svg width={width} height={width} viewBox={`0 0 ${width} ${width}`}>
                        <Circle
                            cx={width / 2}
                            cy={width / 2}
                            r={radius}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx={width / 2}
                            cy={width / 2}
                            r={radius}
                            stroke="#C9A84C"
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
                        activeOpacity={0.7}
                        onPress={handlePress}
                    >
                        <Text style={styles.countText}>{count}</Text>
                        <Text style={styles.targetText}>/ {activePreset.target}</Text>
                    </TouchableOpacity>
                </View>

                {/* Reset Button */}
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <Feather name="refresh-ccw" size={20} color="#9A9590" />
                </TouchableOpacity>

                {/* Presets Grid */}
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
        color: '#E8E6E1',
        fontSize: 36,
        fontWeight: 'bold',
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
        width: width * 0.5,
        height: width * 0.5,
        borderRadius: width * 0.25,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    countText: {
        color: '#E8E6E1',
        fontSize: 64,
        fontWeight: '200',
        letterSpacing: -2,
    },
    targetText: {
        color: '#C9A84C',
        fontSize: 18,
        fontWeight: '500',
        marginTop: -5,
    },
    resetButton: {
        marginTop: -20,
        padding: 15,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        width: (width - 60) / 2, // 2 columns
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    presetCardActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    presetLabel: {
        color: '#E8E6E1',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    presetLabelActive: {
        color: '#C9A84C',
    },
    presetTarget: {
        color: '#9A9590',
        fontSize: 12,
    },
    presetTargetActive: {
        color: 'rgba(201, 168, 76, 0.7)',
    },
});
