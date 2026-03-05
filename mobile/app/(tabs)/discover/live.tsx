import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const STREAMS = [
    { id: '1', title: 'Makkah Al-Mukarramah', location: 'Saudi Arabia', live: true, viewers: '45.2K' },
    { id: '2', title: 'Al-Madinah Al-Munawwarah', location: 'Saudi Arabia', live: true, viewers: '32.1K' },
    { id: '3', title: 'Al-Aqsa Mosque', location: 'Palestine', live: true, viewers: '15.8K' },
];

export default function LiveScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Default to Makkah
    const [activeStream, setActiveStream] = useState(STREAMS[0]);
    const [loading, setLoading] = useState(true);

    // Mock video loading
    const handleStreamChange = (stream: typeof STREAMS[0]) => {
        setLoading(true);
        setActiveStream(stream);
        setTimeout(() => setLoading(false), 1500);
    };

    // Initial mock load
    React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Broadcasts</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Video Player Placeholder Area */}
                <View style={styles.videoPlayerContainer}>
                    {loading ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color="#C9A84C" />
                            <Text style={styles.loadingText}>Connecting to {activeStream.title}...</Text>
                        </View>
                    ) : (
                        <View style={styles.placeholderPlayer}>
                            {/* In a real app, expo-av Video component goes here */}
                            <Feather name="play-circle" size={64} color="rgba(255, 255, 255, 0.4)" />

                            {/* Live Badge Overlay */}
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>

                            {/* Viewers Overlay */}
                            <View style={styles.viewersBadge}>
                                <Feather name="users" size={12} color="#E8E6E1" />
                                <Text style={styles.viewersText}>{activeStream.viewers}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Stream Info Area */}
                <View style={styles.streamInfoContainer}>
                    <Text style={styles.streamTitle}>{activeStream.title}</Text>
                    <View style={styles.locationWrapper}>
                        <Feather name="map-pin" size={14} color="#C9A84C" />
                        <Text style={styles.streamLocation}>{activeStream.location}</Text>
                    </View>
                </View>

                {/* Available Streams List */}
                <View style={styles.otherStreamsSection}>
                    <Text style={styles.sectionTitle}>Other Broadcasts</Text>

                    {STREAMS.map((stream) => (
                        <TouchableOpacity
                            key={stream.id}
                            style={[
                                styles.streamCard,
                                activeStream.id === stream.id && styles.streamCardActive
                            ]}
                            onPress={() => handleStreamChange(stream)}
                        >
                            {/* Thumbnail Mock */}
                            <View style={styles.streamThumbnail}>
                                <Feather name="video" size={24} color="#9A9590" />
                                {stream.live && (
                                    <View style={styles.smallLiveBadge}>
                                        <Text style={styles.smallLiveText}>LIVE</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.streamCardInfo}>
                                <Text style={[
                                    styles.cardTitle,
                                    activeStream.id === stream.id && styles.cardTitleActive
                                ]}>
                                    {stream.title}
                                </Text>
                                <Text style={styles.cardLocation}>{stream.location}</Text>
                            </View>

                            {activeStream.id === stream.id && (
                                <View style={styles.playingIndicator}>
                                    <View style={styles.eqBar1} />
                                    <View style={styles.eqBar2} />
                                    <View style={styles.eqBar3} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
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
    videoPlayerContainer: {
        width: width,
        height: width * 0.5625, // 16:9 Aspect Ratio
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    loadingWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#9A9590',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    placeholderPlayer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.2)', // Forest Green tint to mimic Kaaba cover vibe
        position: 'relative',
    },
    liveBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(242, 91, 91, 0.9)', // Red
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    liveBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    viewersBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    viewersText: {
        color: '#E8E6E1',
        fontSize: 12,
        fontWeight: '500',
    },
    streamInfoContainer: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    streamTitle: {
        color: '#E8E6E1',
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    locationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    streamLocation: {
        color: '#C9A84C', // Gold
        fontSize: 14,
    },
    otherStreamsSection: {
        padding: 24,
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 16,
    },
    streamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    streamCardActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    streamThumbnail: {
        width: 80,
        height: 50,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        position: 'relative',
    },
    smallLiveBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#F25B5B',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    smallLiveText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    streamCardInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    cardTitleActive: {
        color: '#C9A84C',
    },
    cardLocation: {
        color: '#9A9590',
        fontSize: 13,
    },
    playingIndicator: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 16,
        marginLeft: 16,
    },
    eqBar1: { width: 3, height: '60%', backgroundColor: '#C9A84C', borderRadius: 2 },
    eqBar2: { width: 3, height: '100%', backgroundColor: '#C9A84C', borderRadius: 2 },
    eqBar3: { width: 3, height: '40%', backgroundColor: '#C9A84C', borderRadius: 2 },
});
