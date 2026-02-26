import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';

const COLLECTIONS = [
    { id: 'bukhari', title: 'Sahih al-Bukhari', count: 7563, color: '#C9A84C' },
    { id: 'muslim', title: 'Sahih Muslim', count: 3033, color: '#1F4E3D' },
    { id: 'tirmidhi', title: 'Jami at-Tirmidhi', count: 3956, color: '#4A3E2D' },
    { id: 'abudawud', title: 'Sunan Abu Dawud', count: 5274, color: '#2C3E50' },
];

export default function HadithScreen() {
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!db || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                // FTS5 MATCH query
                // We append * wildcard for partial matching on words
                const safeQuery = searchQuery.replace(/"/g, '""'); // sanitize basic injection

                const results = await db.getAllAsync(`
                    SELECT 
                        book_slug, hadith_number, text_arabic, text_english, narrator,
                        snippet(hadiths_fts, 3, '<b>', '</b>', '...', 10) as highlight
                    FROM hadiths_fts 
                    WHERE hadiths_fts MATCH '"${safeQuery}" *'
                    LIMIT 20
                `);

                setSearchResults(results as any[]);
            } catch (error) {
                console.error("FTS search error:", error);

                // Fallback basic LIKE search if MATCH fails due to syntax
                try {
                    const fallback = await db.getAllAsync(`
                        SELECT * FROM hadiths_fts 
                        WHERE text_english LIKE '%${searchQuery.replace(/'/g, "''")}%'
                        LIMIT 20
                    `);
                    setSearchResults(fallback as any[]);
                } catch (e) { }
            } finally {
                setIsSearching(false);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, db]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Hadith Library</Text>
                <TouchableOpacity style={styles.headerAction}>
                    <Feather name="bookmark" size={24} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                alwaysBounceVertical={true}
                contentContainerStyle={styles.scrollContent}
            >
                {/* AI-Powered Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Feather name="search" size={20} color={searchQuery ? '#C9A84C' : '#5E5C58'} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search thousands of Hadiths offline..."
                            placeholderTextColor="#5E5C58"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Feather name="x-circle" size={18} color="#9A9590" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Display Results OR Collections */}
                {searchQuery.length > 0 ? (
                    <View style={styles.resultsSection}>
                        {isSearching ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#C9A84C" />
                                <Text style={styles.loadingText}>Searching offline vault...</Text>
                            </View>
                        ) : searchResults.length === 0 ? (
                            <Text style={styles.noResultsText}>No hadiths found</Text>
                        ) : (
                            searchResults.map((hadith, index) => (
                                <View key={index} style={styles.hadithCard}>
                                    <View style={styles.hadithHeader}>
                                        <Text style={styles.hadithBookTag}>
                                            {hadith.book_slug.toUpperCase()} {hadith.hadith_number}
                                        </Text>
                                        <Text style={styles.narratorTag}>Narrated {hadith.narrator}</Text>
                                    </View>
                                    <Text style={styles.arabicText}>{hadith.text_arabic}</Text>
                                    <View style={styles.divider} />
                                    <Text style={styles.englishText}>{hadith.text_english}</Text>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Feather name="share-2" size={18} color="#9A9590" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn}>
                                            <Feather name="bookmark" size={18} color="#9A9590" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Authentic Collections</Text>
                        <View style={styles.collectionsGrid}>
                            {COLLECTIONS.map(col => (
                                <TouchableOpacity
                                    key={col.id}
                                    style={[styles.collectionCard, { borderTopColor: col.color }]}
                                >
                                    <Feather name="book" size={28} color={col.color} style={{ marginBottom: 12 }} />
                                    <Text style={styles.colTitle}>{col.title}</Text>
                                    <Text style={styles.colCount}>{col.count.toLocaleString()} Hadiths</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Interactive Premium Banner */}
                        <TouchableOpacity style={styles.premiumBanner}>
                            <View style={styles.bannerIcon}>
                                <Feather name="download-cloud" size={24} color="#0C0F0E" />
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>Offline Sync Active</Text>
                                <Text style={styles.bannerSubtitle}>Full library available without internet.</Text>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingHorizontal: 24,
        paddingTop: 10,
        marginBottom: 20,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: -0.5,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 200,
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)', // Subtle Gold
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 15,
        height: '100%',
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    collectionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
        justifyContent: 'center',
    },
    collectionCard: {
        width: '46%',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderTopWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
    },
    colTitle: {
        color: '#E8E6E1',
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    colCount: {
        color: '#9A9590',
        fontSize: 12,
    },
    premiumBanner: {
        marginHorizontal: 24,
        marginTop: 40,
        backgroundColor: '#C9A84C', // Gold banner
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#0C0F0E',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    bannerSubtitle: {
        color: 'rgba(12, 15, 14, 0.7)',
        fontSize: 13,
    },
    resultsSection: {
        paddingHorizontal: 24,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        color: '#9A9590',
        fontSize: 14,
    },
    noResultsText: {
        color: '#9A9590',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    hadithCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    hadithHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    hadithBookTag: {
        color: '#C9A84C',
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    narratorTag: {
        color: '#9A9590',
        fontSize: 13,
        fontStyle: 'italic',
    },
    arabicText: {
        color: '#E8E6E1',
        fontSize: 24,
        fontWeight: '600',
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
    cardActions: {
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
    }
});
