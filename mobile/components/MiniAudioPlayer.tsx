import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';

export default function MiniAudioPlayer() {
    const { audioState, soundRef, stopAudio, setAudioState } = useAudio();
    const { isVisible, isPlaying, title, reciter, positionMs, durationMs } = audioState;

    if (!isVisible) return null;

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
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Text style={styles.title} numberOfLines={1}>{title || 'Quran'}</Text>
                <Text style={styles.reciter} numberOfLines={1}>{reciter}</Text>
            </View>
            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton} onPress={togglePlay}>
                    <Feather name={isPlaying ? 'pause' : 'play'} size={22} color="#C9A84C" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={stopAudio}>
                    <Feather name="x" size={20} color="#9A9590" />
                </TouchableOpacity>
            </View>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 60, backgroundColor: '#1A1F1D',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 2,
    },
    infoContainer: { flex: 1, justifyContent: 'center' },
    title: { color: '#E8E6E1', fontSize: 14, fontWeight: '500' },
    reciter: { color: '#9A9590', fontSize: 12, marginTop: 2 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    controlButton: { padding: 4 },
    progressBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, backgroundColor: 'rgba(255,255,255,0.1)',
    },
    progressFill: { height: '100%', backgroundColor: '#C9A84C' },
});
