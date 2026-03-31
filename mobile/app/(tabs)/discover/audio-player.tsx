import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, BackHandler, Animated, Easing,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { useAudio } from '../../../context/AudioContext';

// ── helpers ───────────────────────────────────────────────────────────────────
function formatTime(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function AudioPlayerScreen() {
    const { streamUrl, webUrl, title, author, duration, color } = useLocalSearchParams<{
        streamUrl: string;
        webUrl: string;
        title: string;
        author: string;
        duration: string;
        color: string;
    }>();

    const router   = useRouter();
    const insets   = useSafeAreaInsets();
    const { theme } = useTheme();
    const { stopAudio: stopGlobalAudio, expAvStopRef } = useAudio();
    const accentColor = color ?? theme.gold;

    // ── decide mode ───────────────────────────────────────────────────────────
    // If streamUrl is provided → native expo-av player
    // Otherwise → WebView with webUrl (archive.org / islamhouse page)
    const useNative = !!streamUrl;

    // ── expo-av state ─────────────────────────────────────────────────────────
    const soundRef        = useRef<Audio.Sound | null>(null);
    const [avLoading,     setAvLoading]     = useState(false);
    const [avError,       setAvError]       = useState<string | null>(null);
    const [isPlaying,     setIsPlaying]     = useState(false);
    const [positionMs,    setPositionMs]    = useState(0);
    const [durationMs,    setDurationMs]    = useState(0);
    const [buffering,     setBuffering]     = useState(false);
    const [speedIdx,      setSpeedIdx]      = useState(1); // default 1.0×
    const isDragging      = useRef(false);
    const seekTrackWidth  = useRef(300); // updated by onLayout — avoids hardcoded value

    // ── waveform animation ────────────────────────────────────────────────────
    const bars = useRef(Array.from({ length: 32 }, () => new Animated.Value(4))).current;
    const waveAnim = useRef<Animated.CompositeAnimation | null>(null);

    const startWave = () => {
        const anims = bars.map((bar, i) =>
            Animated.loop(Animated.sequence([
                Animated.delay(i * 30),
                Animated.timing(bar, {
                    toValue: 6 + Math.random() * 26,
                    duration: 400 + Math.random() * 300,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(bar, {
                    toValue: 4,
                    duration: 400 + Math.random() * 300,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ]))
        );
        waveAnim.current = Animated.parallel(anims);
        waveAnim.current.start();
    };

    const stopWave = () => {
        waveAnim.current?.stop();
        bars.forEach(b => b.setValue(4));
    };

    // ── back navigation ───────────────────────────────────────────────────────
    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover/articles' as any);
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                goBack(); return true;
            });
            return () => sub.remove();
        }, [goBack])
    );

    // ── load audio ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!useNative) return;

        // Stop expo-audio (Quran reader) before starting expo-av playback
        stopGlobalAudio();

        let mounted = true;
        setAvLoading(true);
        setAvError(null);

        (async () => {
            try {
                if (Platform.OS === 'ios') {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                    });
                } else {
                    await Audio.setAudioModeAsync({
                        shouldDuckAndroid: true,
                        staysActiveInBackground: true,
                    });
                }
                const { sound } = await Audio.Sound.createAsync(
                    { uri: streamUrl },
                    { shouldPlay: false, progressUpdateIntervalMillis: 500 },
                    (status: AVPlaybackStatus) => {
                        if (!mounted || !status.isLoaded) return;
                        setPositionMs(status.positionMillis ?? 0);
                        setDurationMs(status.durationMillis ?? 0);
                        setBuffering(status.isBuffering ?? false);
                        if (status.isPlaying) {
                            if (!waveAnim.current) startWave();
                        } else {
                            stopWave();
                        }
                    }
                );
                if (!mounted) { sound.unloadAsync(); return; }
                soundRef.current = sound;
                const status = await sound.getStatusAsync();
                if (status.isLoaded) setDurationMs(status.durationMillis ?? 0);
                setAvLoading(false);
            } catch (e: any) {
                if (mounted) {
                    setAvLoading(false);
                    setAvError(e?.message ?? 'Could not load audio. Check your internet connection.');
                }
            }
        })();

        // Register stop function so expo-audio (Quran reader) can stop us
        expAvStopRef.current = () => {
            soundRef.current?.stopAsync().catch(() => {});
            soundRef.current?.unloadAsync().catch(() => {});
            soundRef.current = null;
            setIsPlaying(false);
            stopWave();
        };

        return () => {
            mounted = false;
            expAvStopRef.current = null;
            stopWave();
            soundRef.current?.unloadAsync().catch(() => {});
            soundRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamUrl]);

    const togglePlay = async () => {
        const sound = soundRef.current;
        if (!sound) return;
        try {
            const status = await sound.getStatusAsync();
            if (!status.isLoaded) return;
            if (status.isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
            } else {
                await sound.playAsync();
                setIsPlaying(true);
            }
        } catch {}
    };

    const seek = async (ratio: number) => {
        const sound = soundRef.current;
        if (!sound || !durationMs) return;
        try {
            await sound.setPositionAsync(ratio * durationMs);
            setPositionMs(ratio * durationMs);
        } catch {}
    };

    const cycleSpeed = async () => {
        const next = (speedIdx + 1) % SPEEDS.length;
        setSpeedIdx(next);
        try {
            await soundRef.current?.setRateAsync(SPEEDS[next], true);
        } catch {}
    };

    const skipSeconds = async (secs: number) => {
        const target = Math.max(0, Math.min(positionMs + secs * 1000, durationMs));
        await seek(target / durationMs);
    };

    // ── WebView mode ──────────────────────────────────────────────────────────
    const [webLoading, setWebLoading] = useState(true);
    const [webReload,  setWebReload]  = useState(0);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.bgCard }]}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="chevron-left" size={26} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {title ?? 'Audio'}
                    </Text>
                    {!!author && (
                        <Text style={[styles.headerAuthor, { color: accentColor }]} numberOfLines={1}>
                            {author}
                        </Text>
                    )}
                </View>
                {useNative ? (
                    <TouchableOpacity
                        style={styles.speedBtn}
                        onPress={cycleSpeed}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={[styles.speedText, { color: theme.textSecondary }]}>
                            {SPEEDS[speedIdx]}×
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.speedBtn}
                        onPress={() => { setWebLoading(true); setWebReload(k => k + 1); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Native expo-av Player ─────────────────────────────────────── */}
            {useNative ? (
                <View style={[styles.nativePlayer, { backgroundColor: theme.bg }]}>
                    {/* Cover / icon area */}
                    <View style={[styles.coverArea, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                        <View style={[styles.coverIcon, { backgroundColor: `${accentColor}20` }]}>
                            <Feather name="headphones" size={52} color={accentColor} />
                        </View>
                        {/* Waveform */}
                        <View style={styles.waveform}>
                            {bars.map((bar, i) => (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.waveBar,
                                        {
                                            height: bar,
                                            backgroundColor: isPlaying ? accentColor : theme.bgInput,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Track info */}
                    <Text style={[styles.trackTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                        {title}
                    </Text>
                    <Text style={[styles.trackAuthor, { color: accentColor }]} numberOfLines={1}>
                        {author}
                    </Text>
                    {!!duration && (
                        <Text style={[styles.trackDuration, { color: theme.textSecondary }]}>
                            {duration}
                        </Text>
                    )}

                    {/* Loading / error */}
                    {avLoading && (
                        <View style={styles.avStatus}>
                            <ActivityIndicator color={accentColor} />
                            <Text style={[styles.avStatusText, { color: theme.textSecondary }]}>
                                Buffering audio…
                            </Text>
                        </View>
                    )}
                    {!!avError && (
                        <View style={styles.avStatus}>
                            <Feather name="alert-circle" size={20} color="#E74C3C" />
                            <Text style={[styles.avStatusText, { color: '#E74C3C' }]} numberOfLines={2}>
                                {avError}
                            </Text>
                        </View>
                    )}

                    {/* Progress bar */}
                    {!avLoading && !avError && (
                        <View style={styles.progressSection}>
                            {/* Tap-to-seek track */}
                            <TouchableOpacity
                                style={[styles.seekTrack, { backgroundColor: theme.bgInput }]}
                                onLayout={(e) => { seekTrackWidth.current = e.nativeEvent.layout.width; }}
                                onPress={(e) => {
                                    const { locationX } = e.nativeEvent;
                                    seek(locationX / seekTrackWidth.current);
                                }}
                                activeOpacity={1}
                            >
                                <View
                                    style={[
                                        styles.seekFill,
                                        {
                                            backgroundColor: accentColor,
                                            width: durationMs > 0
                                                ? `${(positionMs / durationMs) * 100}%` as any
                                                : '0%',
                                        },
                                    ]}
                                />
                                {/* Thumb */}
                                <View
                                    style={[
                                        styles.seekThumb,
                                        {
                                            backgroundColor: accentColor,
                                            left: durationMs > 0
                                                ? `${(positionMs / durationMs) * 100}%` as any
                                                : '0%',
                                        },
                                    ]}
                                />
                            </TouchableOpacity>
                            <View style={styles.timeRow}>
                                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                                    {formatTime(positionMs)}
                                </Text>
                                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                                    {durationMs > 0 ? formatTime(durationMs) : (duration ?? '--:--')}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Controls */}
                    {!avLoading && !avError && (
                        <View style={styles.controls}>
                            {/* −30s */}
                            <TouchableOpacity style={styles.controlBtn} onPress={() => skipSeconds(-30)}>
                                <Feather name="rotate-ccw" size={22} color={theme.textSecondary} />
                                <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>30</Text>
                            </TouchableOpacity>

                            {/* −10s */}
                            <TouchableOpacity style={styles.controlBtn} onPress={() => skipSeconds(-10)}>
                                <Feather name="skip-back" size={22} color={theme.textPrimary} />
                            </TouchableOpacity>

                            {/* Play / Pause */}
                            <TouchableOpacity
                                style={[styles.playBtn, { backgroundColor: accentColor }]}
                                onPress={togglePlay}
                                disabled={!!buffering}
                            >
                                {buffering
                                    ? <ActivityIndicator color={theme.textInverse} />
                                    : <Feather
                                        name={isPlaying ? 'pause' : 'play'}
                                        size={28}
                                        color={theme.textInverse}
                                        style={isPlaying ? undefined : { marginLeft: 3 }}
                                    />
                                }
                            </TouchableOpacity>

                            {/* +10s */}
                            <TouchableOpacity style={styles.controlBtn} onPress={() => skipSeconds(10)}>
                                <Feather name="skip-forward" size={22} color={theme.textPrimary} />
                            </TouchableOpacity>

                            {/* +30s */}
                            <TouchableOpacity style={styles.controlBtn} onPress={() => skipSeconds(30)}>
                                <Feather name="rotate-cw" size={22} color={theme.textSecondary} />
                                <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>30</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                /* ── WebView mode ─────────────────────────────────────────── */
                <View style={{ flex: 1 }}>
                    {webLoading && (
                        <View style={styles.webLoading}>
                            <ActivityIndicator size="large" color={theme.gold} />
                            <Text style={[styles.webLoadingText, { color: theme.textSecondary }]}>
                                Loading player…
                            </Text>
                        </View>
                    )}
                    <WebView
                        key={webReload}
                        source={{ uri: webUrl ?? '' }}
                        style={styles.webview}
                        onLoadEnd={() => setWebLoading(false)}
                        javaScriptEnabled
                        domStorageEnabled
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
                        originWhitelist={['*']}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1 },
    header:          {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 56,
        borderBottomWidth: 1,
    },
    backBtn:         { width: 36, alignItems: 'flex-start' },
    headerCenter:    { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    headerTitle:     { fontSize: 16, fontWeight: '600' },
    headerAuthor:    { fontSize: 11, marginTop: 1 },
    speedBtn:        { width: 36, alignItems: 'flex-end' },
    speedText:       { fontSize: 13, fontWeight: '600' },

    // ── native player ──
    nativePlayer:    { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
    coverArea:       {
        width: '100%', borderRadius: 24, borderWidth: 1,
        alignItems: 'center', paddingVertical: 28, marginBottom: 28,
        gap: 20,
    },
    coverIcon:       { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
    waveform:        { flexDirection: 'row', alignItems: 'center', gap: 3, height: 44 },
    waveBar:         { width: 3, borderRadius: 2, minHeight: 4 },

    trackTitle:      { fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 28, marginBottom: 6 },
    trackAuthor:     { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 4 },
    trackDuration:   { fontSize: 13, marginBottom: 24 },

    avStatus:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    avStatusText:    { fontSize: 13, flex: 1 },

    progressSection: { width: '100%', marginBottom: 28 },
    seekTrack:       {
        width: '100%', height: 6, borderRadius: 3,
        position: 'relative', overflow: 'visible', marginBottom: 8,
    },
    seekFill:        { height: 6, borderRadius: 3, position: 'absolute', top: 0, left: 0 },
    seekThumb:       {
        position: 'absolute', top: -5, marginLeft: -8,
        width: 16, height: 16, borderRadius: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 3,
    },
    timeRow:         { flexDirection: 'row', justifyContent: 'space-between' },
    timeText:        { fontSize: 12 },

    controls:        { flexDirection: 'row', alignItems: 'center', gap: 20 },
    controlBtn:      { alignItems: 'center', minWidth: 36 },
    controlLabel:    { fontSize: 10, marginTop: 2 },
    playBtn:         { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },

    // ── webview mode ──
    webLoading:      { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 5 },
    webLoadingText:  { fontSize: 14 },
    webview:         { flex: 1 },
});
