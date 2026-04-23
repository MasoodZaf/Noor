import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, ImageBackground, Platform, Image, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme, fonts } from '../../context/ThemeContext';

// CARD_WIDTH computed inside component via useWindowDimensions (see DuasScreen)

const CATEGORY_FALLBACK_COLORS: Record<string, string> = {
    'Morning & Evening': '#F4A460',
    'Prayer (Salah)': '#6B8E6B',
    'Travel': '#5B7FA6',
    'Anxiety & Sorrow': '#8B7BA8',
    'Eating & Drinking': '#C8763E',
};

const CATEGORY_IMAGES: Record<string, string> = {
    'Morning & Evening': 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=500&auto=format&fit=crop',
    'Prayer (Salah)': 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?q=80&w=500&auto=format&fit=crop',
    'Travel': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=500&auto=format&fit=crop',
    'Anxiety & Sorrow': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=500&auto=format&fit=crop',
    'Eating & Drinking': 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?q=80&w=500&auto=format&fit=crop',
};

export default function DuasScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const CARD_WIDTH = (width - 48 - 12) / 2; // 2 columns with 12px gap, 24px padding on sides
    const [categories, setCategories] = useState<any[]>([]);
    const [popularDuas, setPopularDuas] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [search, setSearch] = useState('');
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!db) return;
        async function loadData() {
            try {
                const catResults = await db?.getAllAsync(`
                    SELECT c.id, c.name_english as title, COUNT(d.id) as count
                    FROM dua_categories c
                    LEFT JOIN duas d ON d.category_id = c.id
                    GROUP BY c.id ORDER BY c.sort_order ASC
                `);

                const mappedCats = (catResults as any[]).map((c) => ({
                    ...c,
                    image: CATEGORY_IMAGES[c.title] || 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=500&auto=format&fit=crop'
                }));
                setCategories(mappedCats);

                const duaResults = await db?.getAllAsync(`
                    SELECT d.id, d.category_id, d.title, d.arabic_text, d.transliteration, d.translation_en, c.name_english as category
                    FROM duas d
                    JOIN dua_categories c ON d.category_id = c.id
                    ORDER BY d.sort_order ASC
                    LIMIT 5
                `);
                setPopularDuas(duaResults as any[]);

            } catch (error) {
                console.error("Error loading duas data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [db]);

    // Search all duas in DB
    useEffect(() => {
        if (!db || !search.trim()) {
            setSearchResults([]);
            return;
        }
        const query = search.trim();
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await db?.getAllAsync(`
                    SELECT d.id, d.category_id, d.title, d.arabic_text, d.transliteration, d.translation_en, c.name_english as category
                    FROM duas d
                    JOIN dua_categories c ON d.category_id = c.id
                    WHERE d.title LIKE ? OR d.translation_en LIKE ? OR d.transliteration LIKE ?
                    ORDER BY d.sort_order ASC
                    LIMIT 30
                `, [`%${query}%`, `%${query}%`, `%${query}%`]);
                setSearchResults(results as any[]);
            } catch (e) {
                console.error('Dua search error:', e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [db, search]);

    const isSearching = search.trim().length > 0;
    const displayedDuas = isSearching ? searchResults : popularDuas;

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerLeft}>
                    <Text style={[styles.greeting, { color: theme.textSecondary }]}>Assalamu Alaikum</Text>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Falah Duas</Text>
                </View>
                <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: theme.bgInput }]}>
                    <Feather name="bell" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.bgInput }]}>
                    <Feather name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search for a Dua..."
                        placeholderTextColor={theme.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={{ marginLeft: 8 }}>
                            <Feather name="x" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Categories — hidden while searching */}
                {!isSearching && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Categories</Text>
                        </View>

                        {loading ? (
                            <ActivityIndicator color={theme.gold} style={{ marginTop: 40 }} />
                        ) : (
                            <View style={styles.categoriesGrid}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={styles.categoryCardWrapper}
                                        activeOpacity={0.8}
                                        onPress={() => router.push(`/duas/${cat.id}` as any)}
                                    >
                                        {imgErrors[cat.id] ? (
                                            <View style={[styles.categoryImage, { backgroundColor: CATEGORY_FALLBACK_COLORS[cat.title] || '#7A9E7A', borderRadius: 20, justifyContent: 'flex-end' }]}>
                                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.categoryGradient}>
                                                    <Text style={styles.categoryName} numberOfLines={2}>{cat.title}</Text>
                                                    <Text style={styles.categoryCount}>{cat.count} duas</Text>
                                                </LinearGradient>
                                            </View>
                                        ) : (
                                            <ImageBackground
                                                source={{ uri: cat.image }}
                                                style={styles.categoryImage}
                                                imageStyle={{ borderRadius: 20 }}
                                                onError={() => setImgErrors(prev => ({ ...prev, [cat.id]: true }))}
                                            >
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                                                    style={styles.categoryGradient}
                                                >
                                                    <Text style={styles.categoryName} numberOfLines={2}>{cat.title}</Text>
                                                    <Text style={styles.categoryCount}>{cat.count} duas</Text>
                                                </LinearGradient>
                                            </ImageBackground>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Duas List */}
                <View style={[styles.sectionHeader, { marginTop: isSearching ? 0 : 32 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                        {isSearching ? `Results for "${search}"` : 'Popular Duas'}
                    </Text>
                    {isSearching && searchResults.length > 0 && (
                        <Text style={[styles.resultCount, { color: theme.textTertiary }]}>{searchResults.length} found</Text>
                    )}
                </View>

                {(isSearching && searching) ? (
                    <ActivityIndicator color={theme.gold} style={{ marginTop: 20 }} />
                ) : displayedDuas.length === 0 && isSearching ? (
                    <Text style={{ color: theme.textTertiary, textAlign: 'center', marginTop: 16 }}>No duas found for "{search}"</Text>
                ) : displayedDuas.map((dua) => (
                    <TouchableOpacity
                        key={dua.id}
                        style={[styles.duaCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/duas/${dua.category_id || 1}` as any)}
                    >
                        {/* Arabic Text */}
                        {dua.arabic_text ? (
                            <Text style={[styles.duaArabic, { color: theme.gold }]}>{dua.arabic_text}</Text>
                        ) : null}

                        {/* Transliteration */}
                        {dua.transliteration ? (
                            <Text style={[styles.duaTranslit, { color: theme.textTertiary }]} numberOfLines={2}>{dua.transliteration}</Text>
                        ) : null}

                        {/* Divider */}
                        <View style={[styles.duaDivider, { backgroundColor: theme.border }]} />

                        {/* Title */}
                        <View style={styles.duaHeader}>
                            <Text style={[styles.duaTitle, { color: theme.textPrimary }]}>{dua.title || 'Dua'}</Text>
                            <Feather name="chevron-right" size={18} color={theme.gold} />
                        </View>

                        {/* Full Translation */}
                        <Text style={[styles.duaTranslation, { color: theme.textSecondary }]}>{dua.translation_en}</Text>

                        {/* Category badge */}
                        <View style={styles.duaFooter}>
                            <View style={[styles.duaTag, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                                <Text style={[styles.duaTagText, { color: theme.gold }]}>{dua.category?.toUpperCase()}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    headerLeft: { flex: 1 },
    greeting: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    headerTitle: { fontSize: 28, fontFamily: fonts.serifBold, letterSpacing: -0.3 },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 12,
        right: 14,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 52,
        marginBottom: 32,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    viewAllText: { fontSize: 14, fontWeight: '700' },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    categoryCardWrapper: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.1,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    categoryImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    categoryGradient: { height: '50%', justifyContent: 'flex-end', padding: 16, borderRadius: 20 },
    categoryName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', lineHeight: 20 },
    categoryCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', marginTop: 2 },
    resultCount: { fontSize: 13, fontWeight: '500' },
    duaCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        borderWidth: 1,
    },
    duaArabic: {
        fontSize: 26,
        textAlign: 'right',
        lineHeight: 44,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 8,
    },
    duaTranslit: { fontSize: 13, fontStyle: 'italic', textAlign: 'right', marginBottom: 12, lineHeight: 20 },
    duaDivider: { height: 1, marginBottom: 12 },
    duaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    duaTitle: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
    duaTranslation: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
    duaFooter: { flexDirection: 'row', alignItems: 'center' },
    duaTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    duaTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
