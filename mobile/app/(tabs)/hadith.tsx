import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ── Types ──────────────────────────────────────────────────────────
interface HadithCollection {
    slug: string;
    nameEnglish: string;
    nameArabic: string;
    totalHadiths: number;
    icon: keyof typeof Feather.glyphMap;
}

interface HadithItem {
    id: number;
    number: string;
    narrator: string;
    textEnglish: string;
    grade: string;
    bookName: string;
}

// ── Data (will load from SQLite in production) ─────────────────────
const COLLECTIONS: HadithCollection[] = [
    { slug: 'bukhari', nameEnglish: 'Sahih al-Bukhari', nameArabic: 'صحيح البخاري', totalHadiths: 7563, icon: 'book' },
    { slug: 'muslim', nameEnglish: 'Sahih Muslim', nameArabic: 'صحيح مسلم', totalHadiths: 7500, icon: 'book' },
    { slug: 'abudawud', nameEnglish: 'Sunan Abu Dawud', nameArabic: 'سنن أبي داود', totalHadiths: 5274, icon: 'book' },
    { slug: 'tirmidhi', nameEnglish: 'Jami at-Tirmidhi', nameArabic: 'جامع الترمذي', totalHadiths: 3956, icon: 'book' },
    { slug: 'nasai', nameEnglish: "Sunan an-Nasa'i", nameArabic: 'سنن النسائي', totalHadiths: 5758, icon: 'book' },
    { slug: 'ibnmajah', nameEnglish: 'Sunan Ibn Majah', nameArabic: 'سنن ابن ماجه', totalHadiths: 4341, icon: 'book' },
    { slug: 'malik', nameEnglish: 'Muwatta Malik', nameArabic: 'موطأ مالك', totalHadiths: 1832, icon: 'book' },
    { slug: 'nawawi40', nameEnglish: "Nawawi's 40 Hadith", nameArabic: 'الأربعون النووية', totalHadiths: 42, icon: 'bookmark' },
];

// Sample hadiths from Nawawi's 40 (for demo until SQLite is connected)
const SAMPLE_HADITHS: Record<string, HadithItem[]> = {
    nawawi40: [
        {
            id: 1, number: '1', narrator: 'Umar ibn al-Khattab (RA)',
            textEnglish: 'Actions are according to intentions, and everyone will get what was intended. Whoever migrates with an intention for Allah and His messenger, the migration will be for the sake of Allah and His Messenger. And whoever migrates for worldly gain or to marry a woman, then his migration will be for the sake of whatever he migrated for.',
            grade: 'Sahih', bookName: 'Book of Revelation',
        },
        {
            id: 2, number: '2', narrator: 'Umar ibn al-Khattab (RA)',
            textEnglish: 'One day while we were sitting with the Messenger of Allah (peace be upon him), there appeared before us a man whose clothes were exceedingly white and whose hair was exceedingly black; no signs of journeying were to be seen on him and none of us knew him.',
            grade: 'Sahih', bookName: 'Hadith of Jibreel',
        },
        {
            id: 3, number: '3', narrator: 'Abdullah ibn Umar (RA)',
            textEnglish: 'Islam has been built upon five things — on testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, on performing salah, on giving the zakah, on Hajj to the House, and on fasting in Ramadan.',
            grade: 'Sahih', bookName: 'Pillars of Islam',
        },
        {
            id: 4, number: '5', narrator: 'Aisha (RA)',
            textEnglish: 'Whoever introduces something into this matter of ours [i.e., Islam] that is not from it will have it rejected.',
            grade: 'Sahih', bookName: 'Book of Judgements',
        },
        {
            id: 5, number: '6', narrator: "An-Nu'man ibn Bashir (RA)",
            textEnglish: 'That which is lawful is clear and that which is unlawful is clear, and between the two of them are doubtful matters about which many people do not know. Thus he who avoids doubtful matters clears himself in regard to his religion and his honor.',
            grade: 'Sahih', bookName: 'Halal and Haram',
        },
        {
            id: 6, number: '13', narrator: 'Anas ibn Malik (RA)',
            textEnglish: 'None of you truly believes until he loves for his brother what he loves for himself.',
            grade: 'Sahih', bookName: 'Book of Faith',
        },
    ],
};

type ScreenView = 'collections' | 'hadiths';

// ── Component ──────────────────────────────────────────────────────
export default function HadithScreen() {
    const insets = useSafeAreaInsets();
    const [view, setView] = useState<ScreenView>('collections');
    const [selectedCollection, setSelectedCollection] = useState<HadithCollection | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const openCollection = (collection: HadithCollection) => {
        setSelectedCollection(collection);
        setView('hadiths');
        setSearchQuery('');
    };

    const goBack = () => {
        setView('collections');
        setSelectedCollection(null);
        setSearchQuery('');
    };

    const hadiths = selectedCollection ? SAMPLE_HADITHS[selectedCollection.slug] || [] : [];
    const filteredHadiths = searchQuery
        ? hadiths.filter(h =>
            h.textEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.narrator.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : hadiths;

    // ── Collections List ──
    if (view === 'collections') {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Hadith</Text>
                    <Text style={styles.listSubtitle}>Prophetic Traditions</Text>
                </View>

                <FlatList
                    data={COLLECTIONS}
                    keyExtractor={(item) => item.slug}
                    contentContainerStyle={styles.collectionList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.collectionRow}
                            onPress={() => openCollection(item)}
                            activeOpacity={0.6}
                        >
                            <View style={styles.collectionIcon}>
                                <Feather name={item.icon} size={18} color="#C9A84C" />
                            </View>
                            <View style={styles.collectionInfo}>
                                <Text style={styles.collectionName}>{item.nameEnglish}</Text>
                                <Text style={styles.collectionMeta}>
                                    {item.totalHadiths.toLocaleString()} hadiths
                                </Text>
                            </View>
                            <Text style={styles.collectionArabic}>{item.nameArabic}</Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </View>
        );
    }

    // ── Hadith List View ──
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {selectedCollection?.nameEnglish || 'Hadith'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={16} color="#5E5C58" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search hadiths..."
                    placeholderTextColor="#5E5C58"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={16} color="#5E5C58" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Hadith Cards */}
            {filteredHadiths.length > 0 ? (
                <FlatList
                    data={filteredHadiths}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.hadithList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.hadithCard}>
                            <View style={styles.hadithHeader}>
                                <View style={styles.hadithNumberBadge}>
                                    <Text style={styles.hadithNumberText}>#{item.number}</Text>
                                </View>
                                <View style={styles.gradeBadge}>
                                    <Text style={styles.gradeText}>{item.grade}</Text>
                                </View>
                            </View>
                            <Text style={styles.narratorText}>{item.narrator}</Text>
                            <Text style={styles.hadithText}>{item.textEnglish}</Text>
                            <Text style={styles.bookNameText}>{item.bookName}</Text>
                        </View>
                    )}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="book" size={48} color="#5E5C58" />
                    <Text style={styles.emptyStateText}>
                        {searchQuery
                            ? 'No hadiths match your search.'
                            : 'Hadith content will be available once the database is connected.'}
                    </Text>
                </View>
            )}
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },

    // ── Collections List ──
    listHeader: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    listTitle: {
        color: '#E8E6E1',
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: 0.5,
    },
    listSubtitle: {
        color: '#5E5C58',
        fontSize: 13,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    collectionList: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    collectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
    },
    collectionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(201, 168, 76, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionName: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    collectionMeta: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 3,
    },
    collectionArabic: {
        color: '#9A9590',
        fontSize: 16,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },

    // ── Hadith Reader ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        color: '#C9A84C',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginHorizontal: 24,
        marginBottom: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 14,
        padding: 0,
    },
    hadithList: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    hadithCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    hadithHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    hadithNumberBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        borderRadius: 8,
    },
    hadithNumberText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: '600',
    },
    gradeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(31, 78, 61, 0.3)',
        borderRadius: 8,
    },
    gradeText: {
        color: '#1F4E3D',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        // Light green for Sahih visibility on dark bg
        // This maps to the forest green from the design system
    },
    narratorText: {
        color: '#C9A84C',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 10,
    },
    hadithText: {
        color: '#E8E6E1',
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
    },
    bookNameText: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 12,
        fontStyle: 'italic',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyStateText: {
        color: '#9A9590',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 22,
    },
});
