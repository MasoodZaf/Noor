import React, { createContext, useContext, useRef, useState } from 'react';
import { Audio } from 'expo-av';

interface AudioState {
    isPlaying: boolean;
    isVisible: boolean;
    title: string;
    reciter: string;
    positionMs: number;
    durationMs: number;
}

interface AudioContextType {
    audioState: AudioState;
    soundRef: React.MutableRefObject<Audio.Sound | null>;
    setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
    stopAudio: () => Promise<void>;
}

const DEFAULT_STATE: AudioState = {
    isPlaying: false,
    isVisible: false,
    title: '',
    reciter: 'Mishary Al-Afasy',
    positionMs: 0,
    durationMs: 1,
};

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [audioState, setAudioState] = useState<AudioState>(DEFAULT_STATE);
    const soundRef = useRef<Audio.Sound | null>(null);

    const stopAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync().catch(() => {});
            await soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
        }
        setAudioState(DEFAULT_STATE);
    };

    return (
        <AudioContext.Provider value={{ audioState, soundRef, setAudioState, stopAudio }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioContext);
    if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
    return ctx;
}
