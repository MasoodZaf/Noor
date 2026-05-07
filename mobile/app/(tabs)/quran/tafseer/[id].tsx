import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../../context/ThemeContext';

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
        // Two-volume split: As-Suyuti (Surahs 1–17) and Al-Mahalli (Surahs 18–114).
        totalVolumes: 2,
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

// Warm amber accent used throughout this screen for the book/tafseer aesthetic
const BOOK_ACCENT = '#8C4B40';

export default function TafseerVolumesScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const tafseerId = typeof id === 'string' ? id : 'ibn_kathir';
    const book = TAFSEER_META[tafseerId] || TAFSEER_META['ibn_kathir'];
    const volumes = Array.from({ length: book.totalVolumes }, (_, i) => i + 1);
    const hasVolumes = volumes.length > 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Book Info */}
            <View style={styles.bookHeader}>
                <View style={[styles.bookIconContainer, { backgroundColor: BOOK_ACCENT + '1A', borderColor: BOOK_ACCENT + '33' }]}>
                    <Feather name="book-open" size={36} color={BOOK_ACCENT} />
                </View>
                <Text style={[styles.bookTitle, { color: theme.textPrimary }]}>{book.title}</Text>
                <Text style={[styles.bookAuthor, { color: BOOK_ACCENT }]}>{book.author}</Text>
                <Text style={[styles.bookDesc, { color: theme.textSecondary }]}>{book.desc}</Text>
                <View style={[styles.pillBadge, { backgroundColor: theme.bgInput }]}>
                    <Text style={[styles.pillText, { color: theme.textSecondary }]}>
                        {book.totalVolumes} {book.totalVolumes === 1 ? 'Volume' : 'Volumes'}
                    </Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Volumes Grid */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {!hasVolumes && (
                    <View style={styles.emptyState}>
                        <Feather name="folder" size={40} color={theme.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No volumes available</Text>
                    </View>
                )}
                <View style={styles.volumesGrid}>
                    {volumes.map((volNumber) => (
                        <TouchableOpacity
                            key={`vol-${volNumber}`}
                            style={[styles.volumeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                            activeOpacity={0.75}
                            onPress={() =>
                                router.push(`/quran/tafseer/read?book=${tafseerId}&volume=${volNumber}`)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Volume ${volNumber}`}
                        >
                            <View style={styles.volHeaderRow}>
                                <Text style={[styles.volLabelText, { color: theme.textSecondary }]}>Vol</Text>
                                <View style={[styles.volNumOrb, { backgroundColor: BOOK_ACCENT + '1F', borderColor: BOOK_ACCENT + '40' }]}>
                                    <Text style={[styles.orbText, { color: BOOK_ACCENT }]}>{volNumber}</Text>
                                </View>
                            </View>
                            <Feather name="bookmark" size={18} color={theme.textTertiary} style={{ marginTop: 16 }} />
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
    },
    bookTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    bookAuthor: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 14,
    },
    bookDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 18,
    },
    pillBadge: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
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
        borderWidth: 1,
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
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    volNumOrb: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    orbText: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
