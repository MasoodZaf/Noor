import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { AudioPlayer, setAudioModeAsync } from 'expo-audio';

interface AudioState {
    isPlaying: boolean;
    isVisible: boolean;
    title: string;
    reciter: string;
    positionMs: number;
    durationMs: number;
    sourceId: string | number | null;
    sourceCategory: string | null;
}

interface AudioContextType {
    audioState: AudioState;
    soundRef: React.MutableRefObject<AudioPlayer | null>;
    setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
    stopAudio: () => void;
    /** expo-av screens register their stop callback here so stopAudio() can halt them too */
    expAvStopRef: React.MutableRefObject<(() => void) | null>;
}

const DEFAULT_STATE: AudioState = {
    isPlaying: false,
    isVisible: false,
    title: '',
    reciter: 'Mishary Al-Afasy',
    positionMs: 0,
    durationMs: 1,
    sourceId: null,
    sourceCategory: null,
};

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [audioState, setAudioState] = useState<AudioState>(DEFAULT_STATE);
    const soundRef = useRef<AudioPlayer | null>(null);
    const expAvStopRef = useRef<(() => void) | null>(null);

    // Initialize audio session once — options differ per platform
    useEffect(() => {
        if (Platform.OS === 'ios') {
            setAudioModeAsync({
                playsInSilentMode: true,       // iOS only — play even when ring/mute switch is off
                shouldPlayInBackground: false,
                interruptionMode: 'doNotMix',
            }).catch(() => {});
        } else {
            // Android: playsInSilentMode not supported
            // shouldRouteThroughEarpiece: false → use loudspeaker (STREAM_MUSIC), not earpiece
            setAudioModeAsync({
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
                interruptionMode: 'duckOthers',
            }).catch(() => {});
        }
    }, []);

    const stopAudio = () => {
        // Stop expo-audio (Quran reader) — finally guarantees null even if remove() throws
        try { soundRef.current?.remove(); } catch {} finally { soundRef.current = null; }
        // Stop any registered expo-av player (qaida, audio-player, recitation)
        try { expAvStopRef.current?.(); } catch {} finally { expAvStopRef.current = null; }
        setAudioState(DEFAULT_STATE);
    };

    return (
        <AudioContext.Provider value={{ audioState, soundRef, setAudioState, stopAudio, expAvStopRef }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioContext);
    if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
    return ctx;
}
