import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.titleText}>Discover</Text>
                <Text style={styles.subtitleText}>Tools to elevate your Deen</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.exploreSection}>
                    {/* Hero Tile: Ask AiDeen */}
                    <TouchableOpacity style={styles.heroTile} onPress={() => router.push('/ask')} activeOpacity={0.9}>
                        <LinearGradient
                            colors={['rgba(201, 168, 76, 0.12)', 'rgba(31, 78, 61, 0.05)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <View style={styles.heroContent}>
                                <View style={styles.heroIconBox}>
                                    <Feather name="message-circle" size={30} color="#C9A84C" />
                                </View>
                                <View style={styles.heroTextContent}>
                                    <Text style={styles.heroTitle}>Ask AiDeen</Text>
                                    <Text style={styles.heroSubtitle}>Your intelligent Islamic companion. Ask questions, seek guidance, and explore fatwas instantly.</Text>
                                </View>
                            </View>
                            <Feather name="arrow-up-right" size={24} color="#C9A84C" style={styles.heroArrow} />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Grid Tiles */}
                    <View style={styles.gridRow}>
                        {/* Halal Places */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/halal')} activeOpacity={0.9}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
                                style={styles.gridGradient}
                            >
                                <View style={[styles.gridIconBox, { backgroundColor: 'rgba(229, 62, 62, 0.1)' }]}>
                                    <Feather name="map-pin" size={24} color="#E53E3E" />
                                </View>
                                <Text style={styles.gridTitle}>Halal Places</Text>
                                <Text style={styles.gridSubtitle}>Find food & mosques near you</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Makkah Live */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/live')} activeOpacity={0.9}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
                                style={styles.gridGradient}
                            >
                                <View style={[styles.gridIconBox, { backgroundColor: 'rgba(49, 130, 206, 0.1)' }]}>
                                    <Feather name="video" size={24} color="#3182CE" />
                                </View>
                                <Text style={styles.gridTitle}>Makkah Live</Text>
                                <Text style={styles.gridSubtitle}>Holy streams active 24/7</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Extra tools / knowledge */}
                    <TouchableOpacity style={[styles.heroTile, { borderColor: 'rgba(255, 255, 255, 0.05)' }]} onPress={() => router.push('/articles')} activeOpacity={0.9}>
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <View style={styles.heroContent}>
                                <View style={[styles.heroIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                                    <Feather name="book-open" size={28} color="#E8E6E1" />
                                </View>
                                <View style={styles.heroTextContent}>
                                    <Text style={styles.heroTitle}>Islamic Library</Text>
                                    <Text style={styles.heroSubtitle}>Read articles, historical contexts, and daily short essays on Islamic behavior.</Text>
                                </View>
                            </View>
                            <Feather name="arrow-right" size={20} color="#5E5C58" style={styles.heroArrow} />
                        </LinearGradient>
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
    },
    scrollContent: {
        paddingBottom: 40,
        width: '100%',
    },
    header: {
        marginTop: 20,
        marginBottom: 20,
        paddingHorizontal: 24,
        width: '100%',
    },
    titleText: {
        color: '#E8E6E1',
        fontSize: 34,
        fontWeight: '300',
        letterSpacing: 0.5,
    },
    subtitleText: {
        color: '#9A9590',
        fontSize: 16,
        letterSpacing: 0.5,
        marginTop: 6,
    },
    exploreSection: {
        paddingHorizontal: 20,
        width: '100%',
    },
    heroTile: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    heroGradient: {
        padding: 24,
    },
    heroContent: {
        flexDirection: 'column',
    },
    heroIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    heroTextContent: {
        paddingRight: 20,
    },
    heroTitle: {
        color: '#E8E6E1',
        fontSize: 26,
        fontWeight: '500',
        marginBottom: 8,
    },
    heroSubtitle: {
        color: '#9A9590',
        fontSize: 15,
        lineHeight: 24,
    },
    heroArrow: {
        position: 'absolute',
        top: 24,
        right: 24,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    gridTile: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    gridGradient: {
        padding: 24,
        alignItems: 'flex-start',
        height: 190,
    },
    gridIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    gridTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 8,
    },
    gridSubtitle: {
        color: '#9A9590',
        fontSize: 13,
        lineHeight: 20,
    },
});
