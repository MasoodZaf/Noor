import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';

export default function MiniAudioPlayer() {
    const { audioState, soundRef, stopAudio, setAudioState } = useAudio();
    const { theme } = useTheme();
    const pathname = usePathname();
    const { isVisible, isPlaying, title, reciter, positionMs, durationMs } = audioState;

    // Quran reader has its own full player panel — hide the mini player there to avoid duplication
    if (!isVisible || pathname.startsWith('/quran/')) return null;

    const progressPct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    const togglePlay = () => {
        const player = soundRef.current;
        if (!player || !player.isLoaded) return;
        if (isPlaying) {
            player.pause();
            setAudioState(s => ({ ...s, isPlaying: false }));
        } else {
            player.play();
            setAudioState(s => ({ ...s, isPlaying: true }));
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bgCard, borderTopColor: theme.border }]}>
            <View style={styles.infoContainer}>
                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>{title || 'Quran'}</Text>
                <Text style={[styles.reciter, { color: theme.textSecondary }]} numberOfLines={1}>{reciter}</Text>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton} onPress={togglePlay}>
                    <Feather name={isPlaying ? 'pause' : 'play'} size={22} color={theme.gold} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={stopAudio}>
                    <Feather name="x" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.gold }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 60,
        borderTopWidth: 1,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 2,
    },
    infoContainer: { flex: 1, justifyContent: 'center' },
    title: { fontSize: 14, fontWeight: '500' },
    reciter: { fontSize: 12, marginTop: 2 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    controlButton: { padding: 4 },
    progressBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2,
    },
    progressFill: { height: '100%' },
});
