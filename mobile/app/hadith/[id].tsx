import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage } from '../../context/LanguageContext';

const COLLECTIONS_META: Record<string, { title: string, count: number, color: string }> = {
    'bukhari': { title: 'Sahih al-Bukhari', count: 7563, color: '#C9A84C' },
    'muslim': { title: 'Sahih Muslim', count: 3033, color: '#1F4E3D' },
    'tirmidhi': { title: 'Jami at-Tirmidhi', count: 3956, color: '#4A3E2D' },
    'abudawud': { title: 'Sunan Abu Dawud', count: 5274, color: '#2C3E50' },
};

const ITEMS_PER_PAGE = 30;

export default function HadithCollectionScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();

    const collectionId = typeof id === 'string' ? id : 'bukhari';
    const meta = COLLECTIONS_META[collectionId] || COLLECTIONS_META['bukhari'];

    const [hadiths, setHadiths] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);

    const loadData = useCallback(async (currentOffset: number) => {
        if (!db) return;
        try {
            const results = await db.getAllAsync(
                `SELECT book_slug, hadith_number, text_arabic, text_english, text_urdu, text_ind, text_fra, text_ben, text_tur, narrator 
                 FROM hadiths_fts 
                 WHERE book_slug = ?
                 ORDER BY CAST(hadith_number AS INTEGER) ASC
                 LIMIT ? OFFSET ?`,
                [collectionId, ITEMS_PER_PAGE, currentOffset]
            );

            const fetchedData = results as any[];

            if (fetchedData.length < ITEMS_PER_PAGE) {
                setHasMore(false);
            }

            setHadiths(prev => currentOffset === 0 ? fetchedData : [...prev, ...fetchedData]);
        } catch (error) {
            console.error("Failed to fetch hadiths:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [db, collectionId]);

    useEffect(() => {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
        loadData(0);
    }, [collectionId, loadData]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            setLoadingMore(true);
            const nextOffset = offset + ITEMS_PER_PAGE;
            setOffset(nextOffset);
            loadData(nextOffset);
        }
    };

    const renderHadith = ({ item }: { item: any }) => (
        <View style={styles.hadithCard}>
            <View style={styles.cardTopRow}>
                <View style={[styles.bookBadge, { backgroundColor: meta.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>
                        {meta.title.toUpperCase()} {item.hadith_number}
                    </Text>
                </View>
                {item.narrator ? (
                    <Text style={styles.narratorText}>Narrated {item.narrator}</Text>
                ) : null}
            </View>

            <Text style={styles.arabicText}>{item.text_arabic}</Text>

            <View style={styles.divider} />

            <Text style={[styles.englishText, language === 'urdu' && { fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', fontSize: 18, textAlign: 'right', lineHeight: 32 }]}>
                {language === 'urdu' ? item.text_urdu :
                    language === 'indonesian' ? item.text_ind :
                        language === 'french' ? item.text_fra :
                            language === 'bengali' ? item.text_ben :
                                language === 'turkish' ? item.text_tur :
                                    item.text_english}
            </Text>

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn}>
                    <Feather name="share-2" size={18} color="#9A9590" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Feather name="bookmark" size={18} color="#9A9590" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 100 }} />;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={meta.color} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={meta.color} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: meta.color }]}>{meta.title}</Text>
                    <Text style={styles.headerSubtitle}>{meta.count.toLocaleString()} Hadiths Offline</Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Feather name="filter" size={22} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {loading && offset === 0 ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={meta.color} />
                    <Text style={styles.loadingText}>Opening {meta.title}...</Text>
                </View>
            ) : (
                <FlatList
                    data={hadiths}
                    keyExtractor={(item, index) => `${item.book_slug}-${item.hadith_number}-${index}`}
                    renderItem={renderHadith}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                />
            )}
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
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    filterButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#9A9590',
        fontSize: 12,
        marginTop: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9A9590',
        marginTop: 16,
        fontSize: 15,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    hadithCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bookBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    narratorText: {
        color: '#9A9590',
        fontSize: 13,
        fontStyle: 'italic',
        maxWidth: '50%',
        textAlign: 'right',
    },
    arabicText: {
        color: '#E8E6E1',
        fontSize: 22,
        lineHeight: 40,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 20,
    },
    englishText: {
        color: '#9A9590',
        fontSize: 15,
        lineHeight: 24,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
    },
    footerLoader: {
        paddingVertical: 30,
        alignItems: 'center',
    }
});
