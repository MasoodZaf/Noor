import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Top Text Segment */}
                <View style={styles.header}>
                    <Text style={styles.titleText}>Discover</Text>
                    <Text style={styles.subtitleText}>Tools to elevate your Deen</Text>
                </View>

                {/* Explore Features Segment */}
                <View style={styles.exploreSection}>
                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/ask')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="message-circle" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Ask AiDeen</Text>
                            <Text style={styles.exploreSubtitle}>AI-powered Islamic Q&A companion</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/halal')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="map-pin" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Halal Places</Text>
                            <Text style={styles.exploreSubtitle}>Find restaurants & mosques near you</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exploreCard} onPress={() => router.push('/live')}>
                        <View style={styles.exploreIconContainer}>
                            <Feather name="video" size={24} color="#C9A84C" />
                        </View>
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle}>Makkah Live</Text>
                            <Text style={styles.exploreSubtitle}>Watch live streams from the Holy Sites</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
        width: '100%',
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        width: '100%',
    },
    titleText: {
        color: '#E8E6E1',
        fontSize: 32,
        fontWeight: '300',
        letterSpacing: 1,
    },
    subtitleText: {
        color: '#9A9590',
        fontSize: 15,
        letterSpacing: 0.5,
        marginTop: 6,
    },
    exploreSection: {
        paddingHorizontal: 24,
        width: '100%',
    },
    exploreCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    exploreIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    exploreContent: {
        flex: 1,
    },
    exploreTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    exploreSubtitle: {
        color: '#9A9590',
        fontSize: 13,
    }
});
