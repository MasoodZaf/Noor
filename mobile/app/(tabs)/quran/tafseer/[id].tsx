import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TAFSEER_META: Record<string, { title: string; author: string; desc: string; totalVolumes: number }> = {
    ibn_kathir: {
        title: 'Tafsir Ibn Kathir',
        author: "Isma'il ibn Kathir",
        desc: 'Highly regarded, widely used classical tafsir.',
        totalVolumes: 10,
    },
    jalalayn: {
        title: 'Tafsir al-Jalalayn',
        author: 'Al-Mahalli & As-Suyuti',
        desc: 'Concise and brief, excellent for beginners.',
        totalVolumes: 1,
    },
    sadi: {
        title: "Tafsir As-Sa'di",
        author: 'Abdur-Rahman as-Sa\'di',
        desc: 'Clear, modern, and easy to understand.',
        totalVolumes: 10,
    },
    maarif: {
        title: "Ma'ariful Qur'an",
        author: 'Muhammad Shafi Usmani',
        desc: 'Detailed and widely used in South Asia.',
        totalVolumes: 8,
    },
    tabari: {
        title: 'Tafsir al-Tabari',
        author: 'Muhammad ibn Jarir al-Tabari',
        desc: 'Classical, comprehensive, and historically significant.',
        totalVolumes: 24,
    },
};

export default function TafseerVolumesScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const tafseerId = typeof id === 'string' ? id : 'ibn_kathir';
    const book = TAFSEER_META[tafseerId] || TAFSEER_META['ibn_kathir'];
    const volumes = Array.from({ length: book.totalVolumes }, (_, i) => i + 1);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Book Info */}
            <View style={styles.bookHeader}>
                <View style={styles.bookIconContainer}>
                    <Feather name="book-open" size={36} color="#8C4B40" />
                </View>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>{book.author}</Text>
                <Text style={styles.bookDesc}>{book.desc}</Text>
                <View style={styles.pillBadge}>
                    <Text style={styles.pillText}>
                        {book.totalVolumes} {book.totalVolumes === 1 ? 'Volume' : 'Volumes'}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

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
                            activeOpacity={0.75}
                            onPress={() =>
                                router.push(`/quran/tafseer/read?book=${tafseerId}&volume=${volNumber}`)
                            }
                        >
                            <View style={styles.volHeaderRow}>
                                <Text style={styles.volLabelText}>Vol</Text>
                                <View style={styles.volNumOrb}>
                                    <Text style={styles.orbText}>{volNumber}</Text>
                                </View>
                            </View>
                            <Feather name="bookmark" size={18} color="#B0A898" style={{ marginTop: 16 }} />
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
        backgroundColor: '#FDF6E3',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    bookHeader: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 24,
    },
    bookIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(140,75,64,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(140,75,64,0.2)',
    },
    bookTitle: {
        color: '#1A1A1A',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    bookAuthor: {
        color: '#8C4B40',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 14,
    },
    bookDesc: {
        color: '#5E5C58',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 18,
    },
    pillBadge: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#EAE2CF',
    },
    pillText: {
        color: '#5E5C58',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginHorizontal: 0,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
    },
    volumesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 14,
    },
    volumeCard: {
        width: (width - 56) / 2,
        borderRadius: 16,
        backgroundColor: '#F4EBD9',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    volHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    volLabelText: {
        color: '#5E5C58',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    volNumOrb: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(140,75,64,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(140,75,64,0.25)',
    },
    orbText: {
        color: '#8C4B40',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
