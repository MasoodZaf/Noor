import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Extended metadata for rendering the book header
const TAFSEER_META: Record<string, { title: string, author: string, desc: string, totalVolumes: number }> = {
    'ibn_kathir': {
        title: 'Tafsir Ibn Kathir',
        author: 'Isma\'il ibn Kathir',
        desc: 'Highly regarded, widely used classical tafsir.',
        totalVolumes: 10
    },
    'jalalayn': {
        title: 'Tafsir al-Jalalayn',
        author: 'Al-Mahalli & As-Suyuti',
        desc: 'Concise and brief, excellent for beginners.',
        totalVolumes: 1 // usually single concise volume
    },
    'sadi': {
        title: 'Tafsir As-Sa\'di',
        author: 'Abdur-Rahman as-Sa\'di',
        desc: 'Clear, modern, and easy to understand.',
        totalVolumes: 10
    },
    'maarif': {
        title: 'Ma\'ariful Qur\'an',
        author: 'Muhammad Shafi Usmani',
        desc: 'Detailed and widely used in South Asia.',
        totalVolumes: 8
    },
    'tabari': {
        title: 'Tafsir al-Tabari',
        author: 'Muhammad ibn Jarir al-Tabari',
        desc: 'Classical, comprehensive, and historically significant.',
        totalVolumes: 24
    }
};

export default function TafseerVolumesScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Safely infer the book or fallback to Ibn Kathir
    const tafseerId = typeof id === 'string' ? id : 'ibn_kathir';
    const book = TAFSEER_META[tafseerId] || TAFSEER_META['ibn_kathir'];

    // Generate mockup Volumes array based on the book's total Volumes
    const volumes = Array.from({ length: book.totalVolumes }, (_, i) => i + 1);

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={['rgba(201, 168, 76, 0.15)', 'rgba(31, 78, 61, 0.05)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.fixedNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" size={28} color="#E8E6E1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bookHeader}>
                    <View style={styles.bookIconContainer}>
                        <Feather name="book-open" size={40} color="#C9A84C" />
                    </View>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                    <Text style={styles.bookDesc}>{book.desc}</Text>
                    <View style={styles.pillBadge}>
                        <Text style={styles.pillText}>{book.totalVolumes} {book.totalVolumes === 1 ? 'Volume' : 'Volumes'}</Text>
                    </View>
                </View>
            </View>

            {/* Volumes Grid */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.volumesGrid}>
                    {volumes.map((volNumber) => (
                        <TouchableOpacity
                            key={`vol-${volNumber}`}
                            style={styles.volumeCard}
                            activeOpacity={0.8}
                            onPress={() => router.push(`/quran/tafseer/read?book=${tafseerId}&volume=${volNumber}`)}
                        >
                            <LinearGradient
                                colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
                                style={styles.volumeGradient}
                            >
                                <View style={styles.volHeaderRow}>
                                    <Text style={styles.volNumberText}>Vol</Text>
                                    <View style={styles.volNumOrb}>
                                        <Text style={styles.orbText}>{volNumber}</Text>
                                    </View>
                                </View>
                                <Feather name="bookmark" size={20} color="#5E5C58" style={{ marginTop: 20 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    headerContainer: {
        paddingBottom: 30,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    fixedNav: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    bookHeader: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    bookIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    bookTitle: {
        color: '#E8E6E1',
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    bookAuthor: {
        color: '#C9A84C',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 16,
    },
    bookDesc: {
        color: '#9A9590',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    pillBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    pillText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    volumesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },
    volumeCard: {
        width: (width - 56) / 2, // 2 columns with 20px outer padding (x2) = 40, plus 16px gap = 56
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    volumeGradient: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    volHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    volNumberText: {
        color: '#9A9590',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    volNumOrb: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    orbText: {
        color: '#C9A84C',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
