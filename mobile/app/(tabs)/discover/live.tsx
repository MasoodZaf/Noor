import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Animated, Linking, Platform, BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PLAYER_HEIGHT = width * 0.5625; // 16:9

// Official Saudi Broadcasting channels (channel IDs are stable — never change)
// Makkah: قناة القران الكريم (Saudi Quran TV) — UCos52azQNBgW63_9uDJoPDA
// Madinah: قناة السنة النبوية (Saudi Sunnah TV) — UCROKYPep-UuODNwyipe6JMw
// Al-Aqsa: Al-Quds channel live stream
const STREAMS = [
    {
        id: '1',
        title: 'Makkah Al-Mukarramah',
        subtitle: 'Masjid Al-Haram · Live 24/7',
        location: 'Saudi Arabia',
        color: '#1E5631',
        icon: '🕋',
        // YouTube live_stream?channel= embeds the currently active live broadcast from the channel
        channelId: 'UCos52azQNBgW63_9uDJoPDA',
        youtubeUrl: 'https://www.youtube.com/@SaudiQuranTv/live',
    },
    {
        id: '2',
        title: 'Al-Madinah Al-Munawwarah',
        subtitle: 'Masjid An-Nabawi · Live 24/7',
        location: 'Saudi Arabia',
        color: '#1B3A6B',
        icon: '🕌',
        channelId: 'UCROKYPep-UuODNwyipe6JMw',
        youtubeUrl: 'https://www.youtube.com/@SaudiSunnahTv/live',
    },
    {
        id: '3',
        title: 'Al-Aqsa Mosque',
        subtitle: 'Masjid Al-Aqsa · Live',
        location: 'Palestine',
        color: '#4A1C40',
        icon: '🏛️',
        channelId: 'UCBqoNJiL4yWYqyNOpkTXzpA',
        youtubeUrl: 'https://www.youtube.com/@alaqsa/live',
    },
];

// Build the YouTube embed URI directly — avoids double-embedding (WebView→HTML→iframe).
// live_stream?channel= loads the active live broadcast from the channel.
const buildEmbedUri = (channelId: string) =>
    `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1`;

export default function LiveScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeStream, setActiveStream] = useState(STREAMS[0]);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);
    useFocusEffect(useCallback(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
        return () => sub.remove();
    }, [goBack]));
    const [playerKey, setPlayerKey] = useState(0); // force WebView remount on stream change
    const [embedError, setEmbedError] = useState(false);

    // Pulsing live dot
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const switchStream = (stream: typeof STREAMS[0]) => {
        setActiveStream(stream);
        setEmbedError(false);
        setPlayerKey(k => k + 1); // remount WebView for clean load
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Broadcasts</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* ── In-app YouTube Player ── */}
                <View style={styles.playerWrapper}>
                    {embedError ? (
                        /* Fallback card when YouTube embed is unavailable */
                        <View style={styles.errorCard}>
                            <Text style={styles.errorEmoji}>{activeStream.icon}</Text>
                            <Text style={styles.errorTitle}>{activeStream.title}</Text>
                            <Text style={styles.errorSub}>Live stream unavailable in embed.{'\n'}Tap below to watch on YouTube.</Text>
                            <TouchableOpacity
                                style={styles.openYtBtn}
                                onPress={() => Linking.openURL(activeStream.youtubeUrl)}
                            >
                                <Feather name="youtube" size={16} color="#FFF" />
                                <Text style={styles.openYtText}>Watch Live on YouTube</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <WebView
                            key={playerKey}
                            source={{ uri: buildEmbedUri(activeStream.channelId) }}
                            style={styles.webview}
                            allowsInlineMediaPlayback
                            mediaPlaybackRequiresUserAction={false}
                            allowsFullscreenVideo
                            javaScriptEnabled
                            scrollEnabled={false}
                            onError={() => setEmbedError(true)}
                            onHttpError={(e) => {
                                if (e.nativeEvent.statusCode >= 400) setEmbedError(true);
                            }}
                            injectedJavaScript={`
                                // Poll for YouTube's "unavailable" error state and notify RN
                                (function() {
                                    var attempts = 0;
                                    var check = setInterval(function() {
                                        attempts++;
                                        var el = document.querySelector('.ytp-error-content-wrap-reason');
                                        if (el) {
                                            clearInterval(check);
                                            window.ReactNativeWebView.postMessage('ERROR:' + el.textContent);
                                        }
                                        if (attempts > 20) clearInterval(check);
                                    }, 500);
                                })();
                                true;
                            `}
                            onMessage={(e) => {
                                if (e.nativeEvent.data.startsWith('ERROR:')) setEmbedError(true);
                            }}
                        />
                    )}
                    {/* Live badge overlay */}
                    {!embedError && (
                        <View style={styles.liveBadge}>
                            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    )}
                    {/* Open in YouTube button (always visible) */}
                    {!embedError && (
                        <TouchableOpacity
                            style={styles.ytFallbackBtn}
                            onPress={() => Linking.openURL(activeStream.youtubeUrl)}
                        >
                            <Feather name="youtube" size={14} color="#FFF" />
                            <Text style={styles.ytFallbackText}>Open in YouTube</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stream info */}
                <View style={[styles.streamInfo, { borderLeftColor: activeStream.color }]}>
                    <Text style={styles.streamEmoji}>{activeStream.icon}</Text>
                    <View>
                        <Text style={styles.streamTitle}>{activeStream.title}</Text>
                        <Text style={styles.streamSub}>{activeStream.subtitle}</Text>
                    </View>
                </View>

                {/* Stream selector */}
                <Text style={styles.sectionLabel}>Select Broadcast</Text>
                {STREAMS.map((stream) => {
                    const isActive = activeStream.id === stream.id;
                    return (
                        <TouchableOpacity
                            key={stream.id}
                            style={[styles.streamCard, isActive && { borderColor: stream.color, borderWidth: 2 }]}
                            activeOpacity={0.8}
                            onPress={() => switchStream(stream)}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: stream.color + '22' }]}>
                                <Text style={styles.cardEmoji}>{stream.icon}</Text>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={[styles.cardTitle, isActive && { color: stream.color }]}>
                                    {stream.title}
                                </Text>
                                <Text style={styles.cardSub}>{stream.subtitle}</Text>
                            </View>
                            {isActive ? (
                                <View style={styles.activePill}>
                                    <Animated.View style={[styles.pillDot, { opacity: pulse }]} />
                                    <Text style={styles.pillText}>PLAYING</Text>
                                </View>
                            ) : (
                                <Feather name="play-circle" size={22} color="#C9A84C" />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '600' },

    playerWrapper: {
        width,
        height: PLAYER_HEIGHT,
        backgroundColor: '#000',
        position: 'relative',
    },
    webview: { flex: 1, backgroundColor: '#000' },
    liveBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(242,91,91,0.92)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
    liveBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    ytFallbackBtn: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    ytFallbackText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

    errorCard: {
        flex: 1,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 10,
    },
    errorEmoji: { fontSize: 40 },
    errorTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    errorSub: { color: '#9A9590', fontSize: 13, textAlign: 'center', lineHeight: 20 },
    openYtBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF0000',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        marginTop: 6,
    },
    openYtText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

    streamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        paddingLeft: 14,
        borderLeftWidth: 4,
    },
    streamEmoji: { fontSize: 32 },
    streamTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '700' },
    streamSub: { color: '#C9A84C', fontSize: 13, marginTop: 2 },

    sectionLabel: {
        color: '#5E5C58',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginHorizontal: 20,
        marginBottom: 12,
    },

    streamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardEmoji: { fontSize: 24 },
    cardBody: { flex: 1 },
    cardTitle: { color: '#1A1A1A', fontSize: 15, fontWeight: '700', marginBottom: 2 },
    cardSub: { color: '#9A9590', fontSize: 12 },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(242,91,91,0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 5,
    },
    pillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F25B5B' },
    pillText: { color: '#F25B5B', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
