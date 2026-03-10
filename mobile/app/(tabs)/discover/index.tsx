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
                <Text style={styles.titleText}>Explore Deen</Text>
                <Text style={styles.subtitleText}>Tools to elevate your daily practice</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.exploreSection}>
                    {/* Hero Tile: Ask AiDeen */}
                    <TouchableOpacity
                        style={styles.heroTile}
                        onPress={() => router.push('/discover/ask' as any)}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#11d452', '#0a9a3b']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <View style={styles.heroContent}>
                                <View style={styles.heroIconBox}>
                                    <View style={styles.whiteCircle}>
                                        <Feather name="message-circle" size={32} color="#11d452" />
                                    </View>
                                </View>
                                <View style={styles.heroTextContent}>
                                    <Text style={styles.heroTitle}>Ask AiDeen</Text>
                                    <Text style={styles.heroSubtitle}>Your intelligent Islamic companion. Seek guidance and explore fatwas instantly.</Text>
                                </View>
                            </View>
                            <Feather name="arrow-up-right" size={24} color="#FFFFFF" style={styles.heroArrow} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Daily Tools</Text>

                    {/* Grid Tiles Row 1 */}
                    <View style={styles.gridRow}>
                        {/* Halal Places */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/discover/halal' as any)} activeOpacity={0.9}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#fee2e2' }]}>
                                    <Feather name="map-pin" size={22} color="#ef4444" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.gridTitle}>Halal Places</Text>
                                <Text style={styles.gridSubtitle}>Find food & mosques near you</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Makkah Live */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/discover/live' as any)} activeOpacity={0.9}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#dbeafe' }]}>
                                    <Feather name="video" size={22} color="#3b82f6" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.gridTitle}>Makkah Live</Text>
                                <Text style={styles.gridSubtitle}>Holy streams active 24/7</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Grid Tiles Row 2 */}
                    <View style={styles.gridRow}>
                        {/* Ramadan Tracker */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/discover/ramadan' as any)} activeOpacity={0.9}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#fef9c3' }]}>
                                    <Feather name="moon" size={22} color="#eab308" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.gridTitle}>Ramadan</Text>
                                <Text style={styles.gridSubtitle}>Sehri, Iftar & fast tracker</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Recitation */}
                        <TouchableOpacity style={styles.gridTile} onPress={() => router.push('/discover/recitation' as any)} activeOpacity={0.9}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.gridIconBox, { backgroundColor: '#dcfce7' }]}>
                                    <Feather name="mic" size={22} color="#22c55e" />
                                </View>
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.gridTitle}>Recitation</Text>
                                <Text style={styles.gridSubtitle}>AI tajweed correction</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Islamic Knowledge */}
                    <TouchableOpacity style={styles.horizontalTile} onPress={() => router.push('/discover/articles' as any)} activeOpacity={0.9}>
                        <View style={[styles.horizontalIconBox, { backgroundColor: '#f3f4f6' }]}>
                            <Feather name="book-open" size={24} color="#1f2937" />
                        </View>
                        <View style={styles.horizontalTextContent}>
                            <Text style={styles.horizontalTitle}>Islamic Library</Text>
                            <Text style={styles.horizontalSubtitle}>Read articles & daily short essays on Deen.</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#9ca3af" />
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8f6',
    },
    scrollContent: {
        paddingBottom: 40,
        width: '100%',
    },
    header: {
        marginTop: 10,
        marginBottom: 20,
        paddingHorizontal: 24,
        width: '100%',
    },
    titleText: {
        color: '#1A1A1A',
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    subtitleText: {
        color: '#6B7280',
        fontSize: 16,
        marginTop: 4,
    },
    exploreSection: {
        paddingHorizontal: 20,
        width: '100%',
    },
    heroTile: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#11d452',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    heroGradient: {
        padding: 24,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroIconBox: {
        marginRight: 20,
    },
    whiteCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTextContent: {
        flex: 1,
        paddingRight: 20,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        lineHeight: 20,
    },
    heroArrow: {
        position: 'absolute',
        top: 24,
        right: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 16,
        paddingLeft: 4,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    gridTile: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        marginBottom: 20,
    },
    gridIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flex: 1,
    },
    gridTitle: {
        color: '#111827',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    gridSubtitle: {
        color: '#6B7280',
        fontSize: 12,
        lineHeight: 18,
    },
    horizontalTile: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    horizontalIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    horizontalTextContent: {
        flex: 1,
    },
    horizontalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    horizontalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
});
